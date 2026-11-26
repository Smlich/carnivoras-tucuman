import { randomBytes } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { Router } from 'express';
import { z } from 'zod';
import {
  defaultAdminGames,
  defaultAdminProducts,
  defaultGalleryItems,
  defaultSiteSettings,
} from '../../../src/data/site-defaults.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { GalleryItem } from '../models/GalleryItem.js';
import { Game } from '../models/Game.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { OrderInquiry } from '../models/OrderInquiry.js';
import { Product } from '../models/Product.js';
import { SiteMetric } from '../models/SiteMetric.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { orderCreateSchema, validateAndDecodeImageBase64 } from '../schemas/admin-schemas.js';
import { careAssistantRequestSchema, catalogRecommendRequestSchema } from '../schemas/assistant-schemas.js';
import {
  diagnoseCarnivorousPlant,
  getArgentinaDateKey,
  getGeminiDailyLimit,
  getGeminiModel,
  isGeminiConfigured,
  recommendCatalogProducts,
} from '../services/gemini-assistant.js';
import { sanitizePublicGamesPreview } from '../utils/game-visibility.js';
import { resolveOrderItems } from '../utils/order-pricing.js';

function mapDbProductToClient(document) {
  return {
    id: document.slug,
    name: document.name,
    species: document.scientificName,
    description: document.description,
    price: document.priceARS,
    category: document.category,
    categoryLabel: document.categoryLabel,
    image: document.image,
    imageAlt: document.imageAlt,
    note: document.catalogNote,
    stockStatus: document.stockStatus ?? 'ask',
    isActive: document.isActive !== false,
    sortOrder: document.sortOrder ?? 0,
  };
}

function mapDbGalleryToClient(document) {
  return {
    id: document.itemId,
    src: document.src,
    width: document.width ?? 960,
    height: document.height ?? 1280,
    label: document.label,
    title: document.title,
    description: document.description,
    alt: document.alt,
    isActive: document.isActive !== false,
    sortOrder: document.sortOrder ?? 0,
  };
}

export function createPublicSiteRouter({
  isProduction = env.NODE_ENV === 'production',
  auth = null,
  appEnv = env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const router = Router();
  const dailyQuotaState = { date: '', count: 0 };

  function tryConsumePublicDailyQuota() {
    const today = getArgentinaDateKey();
    if (dailyQuotaState.date !== today) {
      dailyQuotaState.date = today;
      dailyQuotaState.count = 0;
    }
    const limit = getGeminiDailyLimit(appEnv);
    if (dailyQuotaState.count >= limit) return false;
    dailyQuotaState.count += 1;
    return true;
  }

  async function loadActiveCatalogForAssistant() {
    if (!isDatabaseConnected()) {
      return isProduction ? [] : defaultAdminProducts;
    }
    const [productDocs, productsSeeded] = await Promise.all([
      Product.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      SiteMetric.exists({ key: 'seeded:products' }),
    ]);
    if (productDocs.length > 0) return productDocs.map(mapDbProductToClient);
    return (!productsSeeded && (await Product.countDocuments()) === 0) ? defaultAdminProducts : [];
  }

  router.get('/site-data', async (request, response) => {
    response.set('Cache-Control', 'no-store');

    if (!isDatabaseConnected()) {
      if (isProduction) {
        return response.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Los datos del vivero no están disponibles temporalmente.',
          },
        });
      }

      return response.status(200).json({
        data: {
          settings: defaultSiteSettings,
          products: defaultAdminProducts,
          gallery: defaultGalleryItems,
          gamesPreview: sanitizePublicGamesPreview(defaultAdminGames),
        },
      });
    }

    const [settingsDoc, productDocs, galleryDocs, gameDocs, productsSeeded, gallerySeeded] = await Promise.all([
      SiteSettings.findOne({ key: 'main' }).lean(),
      Product.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      GalleryItem.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      Game.find().sort({ sortOrder: 1 }).lean(),
      SiteMetric.exists({ key: 'seeded:products' }),
      SiteMetric.exists({ key: 'seeded:gallery' }),
    ]);

    const settings = settingsDoc?.settings
      ? { ...defaultSiteSettings, ...settingsDoc.settings }
      : defaultSiteSettings;

    const products = productDocs.length > 0
      ? productDocs.map(mapDbProductToClient)
      : (!productsSeeded && (await Product.countDocuments()) === 0) ? defaultAdminProducts : [];

    const gallery = galleryDocs.length > 0
      ? galleryDocs.map(mapDbGalleryToClient)
      : (!gallerySeeded && (await GalleryItem.countDocuments()) === 0) ? defaultGalleryItems : [];

    const gamesList = gameDocs.length > 0 ? gameDocs : defaultAdminGames;

    return response.status(200).json({
      data: {
        settings,
        products,
        gallery,
        gamesPreview: sanitizePublicGamesPreview(gamesList),
      },
    });
  });

  router.get('/gallery', async (request, response) => {
    if (!isDatabaseConnected()) {
      if (isProduction) {
        return response.status(503).json({
          error: { code: 'DATABASE_UNAVAILABLE', message: 'Galería temporalmente no disponible.' },
        });
      }
      return response.status(200).json({ data: defaultGalleryItems, meta: { total: defaultGalleryItems.length } });
    }

    const [galleryDocs, gallerySeeded] = await Promise.all([
      GalleryItem.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      SiteMetric.exists({ key: 'seeded:gallery' }),
    ]);
    const gallery = galleryDocs.length > 0
      ? galleryDocs.map(mapDbGalleryToClient)
      : (!gallerySeeded && (await GalleryItem.countDocuments()) === 0) ? defaultGalleryItems : [];

    return response.status(200).json({ data: gallery, meta: { total: gallery.length } });
  });

  router.get('/media/:key', async (request, response) => {
    const key = z.string().regex(/^[a-zA-Z0-9._-]{3,160}$/).parse(request.params.key);

    if (!isDatabaseConnected()) {
      return response.status(404).json({ error: { code: 'MEDIA_NOT_FOUND', message: 'Archivo no encontrado.' } });
    }

    const asset = await MediaAsset.findOne({ key }).lean();
    if (!asset) {
      return response.status(404).json({ error: { code: 'MEDIA_NOT_FOUND', message: 'Archivo no encontrado.' } });
    }

    response.setHeader('Content-Type', asset.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(asset.data.buffer || asset.data);
  });

  router.post('/orders', async (request, response) => {
    const input = orderCreateSchema.parse(request.body ?? {});

    let catalogProducts = defaultAdminProducts;
    if (isDatabaseConnected()) {
      const productDocs = await Product.find({ isActive: true }).lean();
      catalogProducts = productDocs.length > 0
        ? productDocs.map(mapDbProductToClient)
        : (await Product.countDocuments()) === 0 ? defaultAdminProducts : [];
    } else if (isProduction) {
      return response.status(503).json({
        error: { code: 'DATABASE_UNAVAILABLE', message: 'No pudimos registrar la consulta.' },
      });
    }

    const priced = resolveOrderItems(input.items, catalogProducts);
    if (priced.error) {
      return response.status(priced.error.status).json({
        error: { code: priced.error.code, message: priced.error.message },
      });
    }

    const orderId = 'PED-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(2).toString('hex').toUpperCase();

    let sessionUser = null;
    if (auth) {
      try {
        const sessionData = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        sessionUser = sessionData?.user || null;
      } catch {
        sessionUser = null;
      }
    }

    const googleRegistered = Boolean(sessionUser);
    const customerEmail = sessionUser?.email ? String(sessionUser.email).trim().toLowerCase() : '';

    const orderPayload = {
      orderId,
      customerName: input.customerName || String(sessionUser?.name || '').trim(),
      customerEmail,
      googleRegistered,
      notes: input.notes,
      items: priced.items,
      totalARS: priced.totalARS,
      status: 'nuevo',
      adminNotes: '',
      source: input.source,
    };

    if (isDatabaseConnected()) {
      const saved = await OrderInquiry.create(orderPayload);
      return response.status(201).json({
        data: {
          id: saved.orderId,
          createdAt: saved.createdAt,
          customerName: saved.customerName,
          customerEmail: saved.customerEmail || '',
          googleRegistered: Boolean(saved.googleRegistered),
          notes: saved.notes,
          items: saved.items,
          totalARS: saved.totalARS,
          status: saved.status,
          adminNotes: saved.adminNotes,
          source: saved.source,
        },
      });
    }

    return response.status(201).json({
      data: {
        id: orderId,
        createdAt: new Date().toISOString(),
        ...orderPayload,
      },
      meta: { persisted: false },
    });
  });

  router.get('/assistant/status', (request, response) => {
    response.set('Cache-Control', 'no-store');
    return response.status(200).json({
      data: {
        enabled: isGeminiConfigured(appEnv),
      },
    });
  });

  router.post('/assistant/care', async (request, response) => {
    if (!isGeminiConfigured(appEnv)) {
      return response.status(503).json({
        error: {
          code: 'ASSISTANT_NOT_CONFIGURED',
          message: 'El asistente botánico no está activo en este momento.',
        },
      });
    }

    const input = careAssistantRequestSchema.parse(request.body ?? {});
    let normalizedImage = null;
    if (input.image) {
      try {
        const buffer = validateAndDecodeImageBase64(input.image.dataBase64, input.image.contentType);
        normalizedImage = { contentType: input.image.contentType, dataBase64: buffer.toString('base64') };
      } catch (mediaError) {
        return response.status(400).json({ error: { code: 'INVALID_MEDIA', message: mediaError.message } });
      }
    }

    if (!tryConsumePublicDailyQuota()) {
      return response.status(429).json({
        error: {
          code: 'ASSISTANT_DAILY_LIMIT',
          message: 'Alcanzamos el límite diario de consultas del asistente. Escribinos por WhatsApp y te ayudamos directo.',
        },
      });
    }

    const catalogProducts = await loadActiveCatalogForAssistant();
    const result = await diagnoseCarnivorousPlant({
      apiKey: appEnv.GEMINI_API_KEY.trim(),
      model: getGeminiModel(appEnv),
      question: input.question,
      species: input.species,
      locationContext: input.locationContext,
      image: normalizedImage,
      catalogProducts,
      fetchImpl,
    });
    return response.status(200).json({ data: result });
  });

  router.post('/assistant/recommend', async (request, response) => {
    if (!isGeminiConfigured(appEnv)) {
      return response.status(503).json({
        error: {
          code: 'ASSISTANT_NOT_CONFIGURED',
          message: 'El recomendador no está activo en este momento.',
        },
      });
    }

    const input = catalogRecommendRequestSchema.parse(request.body ?? {});
    if (!tryConsumePublicDailyQuota()) {
      return response.status(429).json({
        error: {
          code: 'ASSISTANT_DAILY_LIMIT',
          message: 'Alcanzamos el límite diario de recomendaciones automáticas. Podés consultarnos por WhatsApp.',
        },
      });
    }

    const catalogProducts = await loadActiveCatalogForAssistant();
    const result = await recommendCatalogProducts({
      apiKey: appEnv.GEMINI_API_KEY.trim(),
      model: getGeminiModel(appEnv),
      query: input.query,
      sunlight: input.sunlight,
      experience: input.experience,
      budgetMaxARS: input.budgetMaxARS,
      catalogProducts,
      fetchImpl,
    });
    return response.status(200).json({ data: result });
  });

  return router;
}
