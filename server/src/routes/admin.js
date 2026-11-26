import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import {
  defaultAdminGames,
  defaultAdminProducts,
  defaultGalleryItems,
  defaultSiteSettings,
} from '../../../src/data/site-defaults.js';
import {
  buildAdminCookie,
  buildClearAdminCookie,
  createAdminToken,
  getPrimaryAdminEmail,
  hashPasswordPbkdf2,
  isAdminConfigured,
  parseAdminEmails,
  verifyBootstrapCredentials,
} from '../auth/admin-session.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import {
  createRequireAdmin,
  getStoredAdminAccount,
  resolveAdminAccess,
} from '../middleware/require-admin.js';
import { AdminAccount } from '../models/AdminAccount.js';
import { GalleryItem } from '../models/GalleryItem.js';
import { Game } from '../models/Game.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { OrderInquiry } from '../models/OrderInquiry.js';
import { Product } from '../models/Product.js';
import { SiteMetric } from '../models/SiteMetric.js';
import { SiteSettings } from '../models/SiteSettings.js';
import {
  adminAccountUpdateSchema,
  adminLoginSchema,
  galleryItemPayloadSchema,
  gamePayloadSchema,
  mediaUploadSchema,
  orderUpdateSchema,
  productPayloadSchema,
  siteSettingsSchema,
  validateAndDecodeImageBase64,
} from '../schemas/admin-schemas.js';
import { adminCopyRequestSchema } from '../schemas/assistant-schemas.js';
import {
  DEFAULT_ADMIN_DAILY_LIMIT,
  generateAdminCopy,
  getArgentinaDateKey,
  getGeminiDailyLimit,
  getGeminiModel,
  isGeminiConfigured,
} from '../services/gemini-assistant.js';
import { extractManagedMediaKey } from '../utils/media-cleanup.js';

function mapDbProduct(doc) {
  return {
    id: doc.slug,
    name: doc.name,
    species: doc.scientificName,
    description: doc.description,
    price: doc.priceARS,
    category: doc.category,
    categoryLabel: doc.categoryLabel,
    image: doc.image,
    imageAlt: doc.imageAlt,
    note: doc.catalogNote,
    stockStatus: doc.stockStatus ?? 'ask',
    isActive: doc.isActive !== false,
    sortOrder: doc.sortOrder ?? 0,
  };
}

function toDbProduct(item) {
  return {
    slug: item.id,
    name: item.name,
    scientificName: item.species,
    description: item.description,
    priceARS: item.price,
    category: item.category,
    categoryLabel: item.categoryLabel,
    image: item.image,
    imageAlt: item.imageAlt,
    catalogNote: item.note,
    stockStatus: item.stockStatus,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

function mapDbGallery(doc) {
  return {
    id: doc.itemId,
    src: doc.src,
    width: doc.width ?? 960,
    height: doc.height ?? 1280,
    label: doc.label,
    title: doc.title,
    description: doc.description,
    alt: doc.alt,
    isActive: doc.isActive !== false,
    sortOrder: doc.sortOrder ?? 0,
  };
}

function toDbGallery(item) {
  return {
    itemId: item.id,
    src: item.src,
    width: item.width,
    height: item.height,
    label: item.label,
    title: item.title,
    description: item.description,
    alt: item.alt,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

function mapDbGame(doc) {
  return {
    id: doc.slug,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    requiresAuth: doc.requiresAuth !== false,
    requiredProviders: doc.requiredProviders ?? ['google'],
    platform: doc.platform || 'Google AI Studio',
    embedUrl: doc.embedUrl ?? null,
    adminEmbedUrl: doc.adminEmbedUrl ?? null,
    aspectRatio: doc.aspectRatio || '16 / 9',
    badge: doc.badge || 'Gratis con Google',
    adminProps: doc.adminProps ?? {},
    sortOrder: doc.sortOrder ?? 0,
  };
}

function mapDbOrder(doc) {
  return {
    id: doc.orderId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    customerName: doc.customerName || '',
    customerEmail: doc.customerEmail || '',
    googleRegistered: Boolean(doc.googleRegistered),
    notes: doc.notes || '',
    items: doc.items || [],
    totalARS: doc.totalARS,
    status: doc.status,
    adminNotes: doc.adminNotes || '',
    source: doc.source || 'whatsapp-cart',
  };
}

async function loadRegisteredGoogleUsers() {
  if (!isDatabaseConnected() || !mongoose.connection?.db) return [];
  try {
    const docs = await mongoose.connection.db
      .collection('user')
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(250)
      .toArray();
    return docs.map((doc) => ({
      id: String(doc.id || doc._id || doc.email || ''),
      email: String(doc.email || '').toLowerCase(),
      name: String(doc.name || 'Cliente'),
      image: typeof doc.image === 'string' ? doc.image : '',
      provider: 'google',
      emailVerified: doc.emailVerified !== false,
      registeredAt: doc.createdAt || null,
      lastLoginAt: doc.updatedAt || doc.createdAt || null,
    }));
  } catch {
    return [];
  }
}

async function ensureSeeded(Model, markerKey, docs) {
  const alreadySeeded = await SiteMetric.exists({ key: markerKey });
  if (alreadySeeded) return;
  if ((await Model.countDocuments()) === 0) {
    await Model.insertMany(docs);
  }
  await SiteMetric.updateOne({ key: markerKey }, { $setOnInsert: { key: markerKey, count: 1 } }, { upsert: true });
}

async function ensureProductsSeeded() {
  await ensureSeeded(Product, 'seeded:products', defaultAdminProducts.map(toDbProduct));
}

async function ensureGallerySeeded() {
  await ensureSeeded(GalleryItem, 'seeded:gallery', defaultGalleryItems.map(toDbGallery));
}

async function ensureGamesSeeded() {
  await ensureSeeded(Game, 'seeded:games', defaultAdminGames);
}

async function cleanupUnreferencedDbMedia(candidateUrls = []) {
  const keys = [...new Set(candidateUrls.map(extractManagedMediaKey).filter(Boolean))];
  for (const key of keys) {
    const url = '/api/media/' + key;
    const [usedByProduct, usedByGallery] = await Promise.all([
      Product.exists({ image: url }),
      GalleryItem.exists({ src: url }),
    ]);
    if (!usedByProduct && !usedByGallery) {
      await MediaAsset.deleteOne({ key }).catch(() => {});
    }
  }
}

function requireDatabase(response) {
  if (!isDatabaseConnected()) {
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Conectá MongoDB Atlas para guardar cambios de administración en el servidor local.',
      },
    });
    return false;
  }
  return true;
}

export function createAdminRouter({ auth = null, appEnv = env, fetchImpl = globalThis.fetch } = {}) {
  const router = Router();
  const dailyAdminQuotaState = { date: '', count: 0 };
  const requireAdmin = createRequireAdmin({ auth, appEnv });
  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60_000,
    max: 12,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Demasiados intentos de acceso. Esperá unos minutos y volvé a intentarlo.',
  });
  const isSecureCookie = appEnv.NODE_ENV === 'production';

  router.get('/auth/session', async (request, response) => {
    response.set('Cache-Control', 'no-store');
    const overrideAccount = await getStoredAdminAccount();
    const googleAllowed = Boolean(auth && (parseAdminEmails(appEnv).length > 0 || overrideAccount?.email));
    const configured = isAdminConfigured(appEnv, overrideAccount) || googleAllowed;
    const user = configured ? await resolveAdminAccess(request, { auth, appEnv }) : null;

    if (!user && request.query.meta !== '1') {
      return response.status(200).json({
        data: {
          authenticated: false,
          user: null,
        },
      });
    }

    return response.status(200).json({
      data: {
        configured,
        authenticated: Boolean(user),
        user,
        googleAllowed,
        storageMode: isDatabaseConnected() ? 'mongodb' : 'demo-catalog',
      },
    });
  });

  router.post('/auth/login', loginLimiter, async (request, response) => {
    response.set('Cache-Control', 'no-store');
    if (request.get('x-admin-request') !== '1') {
      return response.status(400).json({
        error: { code: 'MISSING_ADMIN_HEADER', message: 'Falta la cabecera de seguridad de administración.' },
      });
    }

    const body = adminLoginSchema.parse(request.body ?? {});
    const overrideAccount = await getStoredAdminAccount();
    if (!appEnv.ADMIN_SESSION_SECRET || String(appEnv.ADMIN_SESSION_SECRET).length < 32) {
      return response.status(503).json({
        error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Falta ADMIN_SESSION_SECRET en el servidor.' },
      });
    }

    const verification = verifyBootstrapCredentials({
      email: body.email,
      password: body.password,
      envConfig: appEnv,
      overrideAccount,
    });

    if (!verification.configured) {
      return response.status(503).json({
        error: { code: 'ADMIN_NOT_CONFIGURED', message: 'La cuenta de administración todavía no fue configurada.' },
      });
    }

    if (!verification.valid) {
      return response.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
      });
    }

    const token = createAdminToken(
      {
        email: verification.email,
        name: verification.name,
        ver: Number.isInteger(overrideAccount?.tokenVersion) ? overrideAccount.tokenVersion : 0,
      },
      appEnv.ADMIN_SESSION_SECRET,
    );
    response.setHeader('Set-Cookie', buildAdminCookie(token, { secure: isSecureCookie || request.secure }));
    return response.status(200).json({
      data: { user: { email: verification.email, name: verification.name, role: 'admin', method: 'password' } },
    });
  });

  router.post('/auth/logout', (request, response) => {
    response.set('Cache-Control', 'no-store');
    if (request.get('x-admin-request') !== '1') {
      return response.status(400).json({
        error: { code: 'MISSING_ADMIN_HEADER', message: 'Falta la cabecera de seguridad de administración.' },
      });
    }
    response.setHeader('Set-Cookie', buildClearAdminCookie({ secure: isSecureCookie || request.secure }));
    return response.status(200).json({ data: { ok: true } });
  });

  router.use(requireAdmin);

  router.put('/auth/account', async (request, response) => {
    if (!requireDatabase(response)) return;

    const body = adminAccountUpdateSchema.parse(request.body ?? {});
    const overrideAccount = await getStoredAdminAccount();
    const verificationEmail = request.adminUser.method === 'google'
      ? (overrideAccount?.email || getPrimaryAdminEmail(appEnv))
      : request.adminUser.email;
    const passwordConfigured = Boolean(
      overrideAccount?.passwordHash || appEnv.ADMIN_PASSWORD_HASH || appEnv.ADMIN_PASSWORD,
    );

    if (passwordConfigured) {
      if (!body.currentPassword) {
        return response.status(401).json({
          error: { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual no coincide.' },
        });
      }
      const verification = verifyBootstrapCredentials({
        email: verificationEmail,
        password: body.currentPassword,
        envConfig: appEnv,
        overrideAccount,
      });
      if (verification.configured && !verification.valid) {
        return response.status(401).json({
          error: { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual no coincide.' },
        });
      }
    }

    if (!passwordConfigured && !body.newPassword) {
      return response.status(400).json({
        error: { code: 'NEW_PASSWORD_REQUIRED', message: 'Definí una nueva contraseña (mínimo 8 caracteres) para habilitar el acceso local.' },
      });
    }

    const nextPasswordHash = hashPasswordPbkdf2(body.newPassword || body.currentPassword);
    const nextTokenVersion = (Number.isInteger(overrideAccount?.tokenVersion) ? overrideAccount.tokenVersion : 0) + 1;
    const saved = await AdminAccount.findOneAndUpdate(
      { key: 'primary' },
      {
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        passwordHash: nextPasswordHash,
        tokenVersion: nextTokenVersion,
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();

    if (appEnv.ADMIN_SESSION_SECRET && appEnv.ADMIN_SESSION_SECRET.length >= 32) {
      const nextToken = createAdminToken(
        { email: saved.email, name: saved.name, method: request.adminUser.method, ver: nextTokenVersion },
        appEnv.ADMIN_SESSION_SECRET,
      );
      response.setHeader('Set-Cookie', buildAdminCookie(nextToken, { secure: isSecureCookie || request.secure }));
    }

    return response.status(200).json({
      data: {
        user: { email: saved.email, name: saved.name, role: 'admin', method: request.adminUser.method },
        updatedAt: saved.updatedAt,
      },
    });
  });

  router.get('/overview', async (request, response) => {
    if (!isDatabaseConnected()) {
      return response.status(200).json({
        data: {
          visitsCount: 0,
          productsTotal: defaultAdminProducts.length,
          activeProducts: defaultAdminProducts.length,
          galleryTotal: defaultGalleryItems.length,
          gamesTotal: defaultAdminGames.length,
          ordersTotal: 0,
          pendingOrders: 0,
          usersTotal: 0,
          googleOAuthConfigured: Boolean(auth),
          showPreviewBanner: defaultSiteSettings.showPreviewBanner,
          storageMode: 'demo-read-only',
        },
      });
    }

    const [metricDoc, productCount, activeProductCount, galleryCount, gameCount, ordersCount, pendingCount, settingsDoc, usersTotal] = await Promise.all([
      SiteMetric.findOne({ key: 'visits' }).lean(),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      GalleryItem.countDocuments({ isActive: true }),
      Game.countDocuments(),
      OrderInquiry.countDocuments(),
      OrderInquiry.countDocuments({ status: { $in: ['nuevo', 'en-proceso'] } }),
      SiteSettings.findOne({ key: 'main' }).lean(),
      mongoose.connection?.db ? mongoose.connection.db.collection('user').countDocuments().catch(() => 0) : 0,
    ]);

    const effProductsTotal = productCount > 0 ? productCount : defaultAdminProducts.length;
    const effActiveProducts = productCount > 0 ? activeProductCount : defaultAdminProducts.length;
    const effGalleryTotal = (await GalleryItem.countDocuments()) > 0 ? galleryCount : defaultGalleryItems.length;
    const effGamesTotal = gameCount > 0 ? gameCount : defaultAdminGames.length;
    const mergedSettings = settingsDoc?.settings ? { ...defaultSiteSettings, ...settingsDoc.settings } : defaultSiteSettings;

    return response.status(200).json({
      data: {
        visitsCount: metricDoc?.count ?? 0,
        productsTotal: effProductsTotal,
        activeProducts: effActiveProducts,
        galleryTotal: effGalleryTotal,
        gamesTotal: effGamesTotal,
        ordersTotal: ordersCount,
        pendingOrders: pendingCount,
        usersTotal,
        googleOAuthConfigured: Boolean(auth),
        showPreviewBanner: mergedSettings.showPreviewBanner,
        storageMode: 'mongodb',
      },
    });
  });

  router.get('/settings', async (request, response) => {
    if (!isDatabaseConnected()) return response.status(200).json({ data: defaultSiteSettings });
    const doc = await SiteSettings.findOne({ key: 'main' }).lean();
    return response.status(200).json({
      data: doc?.settings ? { ...defaultSiteSettings, ...doc.settings } : defaultSiteSettings,
    });
  });

  router.put('/settings', async (request, response) => {
    if (!requireDatabase(response)) return;
    const settings = siteSettingsSchema.parse(request.body ?? {});
    await SiteSettings.findOneAndUpdate(
      { key: 'main' },
      { settings },
      { upsert: true, returnDocument: 'after' },
    );
    return response.status(200).json({ data: settings });
  });

  router.get('/products', async (request, response) => {
    if (!isDatabaseConnected()) return response.status(200).json({ data: defaultAdminProducts });
    const docs = await Product.find().sort({ sortOrder: 1, name: 1 }).lean();
    return response.status(200).json({
      data: docs.length > 0 ? docs.map(mapDbProduct) : defaultAdminProducts,
    });
  });

  router.post('/products', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureProductsSeeded();
    const item = productPayloadSchema.parse(request.body ?? {});
    const existing = await Product.findOne({ slug: item.id }).lean();
    if (existing) {
      return response.status(409).json({
        error: { code: 'DUPLICATE_SLUG', message: `Ya existe un producto con el identificador "${item.id}".` },
      });
    }
    const created = await Product.create(toDbProduct(item));
    return response.status(201).json({ data: mapDbProduct(created) });
  });

  router.put('/products/:slug', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureProductsSeeded();
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const item = productPayloadSchema.parse({ ...(request.body ?? {}), id: slug });
    const previous = await Product.findOne({ slug }).lean();
    if (!previous) return response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'No encontramos ese producto.' } });
    const updated = await Product.findOneAndUpdate({ slug }, toDbProduct(item), { returnDocument: 'after' }).lean();
    if (previous.image && previous.image !== updated.image) {
      await cleanupUnreferencedDbMedia([previous.image]);
    }
    return response.status(200).json({ data: mapDbProduct(updated) });
  });

  router.delete('/products/:slug', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureProductsSeeded();
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const deleted = await Product.findOneAndDelete({ slug }).lean();
    if (!deleted) return response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'No encontramos ese producto.' } });
    if (deleted.image) await cleanupUnreferencedDbMedia([deleted.image]);
    return response.status(200).json({ data: { deletedId: slug } });
  });

  router.get('/gallery', async (request, response) => {
    if (!isDatabaseConnected()) return response.status(200).json({ data: defaultGalleryItems });
    const docs = await GalleryItem.find().sort({ sortOrder: 1 }).lean();
    return response.status(200).json({
      data: docs.length > 0 ? docs.map(mapDbGallery) : defaultGalleryItems,
    });
  });

  router.post('/gallery', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGallerySeeded();
    const item = galleryItemPayloadSchema.parse(request.body ?? {});
    const existing = await GalleryItem.findOne({ itemId: item.id }).lean();
    if (existing) {
      return response.status(409).json({
        error: { code: 'DUPLICATE_ID', message: `Ya existe una foto con el identificador "${item.id}".` },
      });
    }
    const created = await GalleryItem.create(toDbGallery(item));
    return response.status(201).json({ data: mapDbGallery(created) });
  });

  router.put('/gallery/:id', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGallerySeeded();
    const id = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.id);
    const item = galleryItemPayloadSchema.parse({ ...(request.body ?? {}), id });
    const previous = await GalleryItem.findOne({ itemId: id }).lean();
    if (!previous) return response.status(404).json({ error: { code: 'GALLERY_ITEM_NOT_FOUND', message: 'No encontramos esa fotografía.' } });
    const updated = await GalleryItem.findOneAndUpdate({ itemId: id }, toDbGallery(item), { returnDocument: 'after' }).lean();
    if (previous.src && previous.src !== updated.src) {
      await cleanupUnreferencedDbMedia([previous.src]);
    }
    return response.status(200).json({ data: mapDbGallery(updated) });
  });

  router.delete('/gallery/:id', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGallerySeeded();
    const id = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.id);
    const deleted = await GalleryItem.findOneAndDelete({ itemId: id }).lean();
    if (!deleted) return response.status(404).json({ error: { code: 'GALLERY_ITEM_NOT_FOUND', message: 'No encontramos esa fotografía.' } });
    if (deleted.src) await cleanupUnreferencedDbMedia([deleted.src]);
    return response.status(200).json({ data: { deletedId: id } });
  });

  router.get('/games', async (request, response) => {
    if (!isDatabaseConnected()) return response.status(200).json({ data: defaultAdminGames });
    const docs = await Game.find().sort({ sortOrder: 1 }).lean();
    return response.status(200).json({
      data: docs.length > 0 ? docs.map(mapDbGame) : defaultAdminGames,
    });
  });

  router.post('/games', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGamesSeeded();
    const parsedGame = gamePayloadSchema.parse(request.body ?? {});
    const existing = await Game.findOne({ slug: parsedGame.slug }).lean();
    if (existing) {
      return response.status(409).json({
        error: { code: 'DUPLICATE_SLUG', message: `Ya existe un juego con slug "${parsedGame.slug}".` },
      });
    }
    const created = await Game.create({ ...parsedGame, requiredProviders: ['google'] });
    return response.status(201).json({ data: mapDbGame(created) });
  });

  router.put('/games/:slug', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGamesSeeded();
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const parsedGame = gamePayloadSchema.parse({ ...(request.body ?? {}), slug });
    const updated = await Game.findOneAndUpdate(
      { slug },
      { ...parsedGame, requiredProviders: ['google'] },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    return response.status(200).json({ data: mapDbGame(updated) });
  });

  router.delete('/games/:slug', async (request, response) => {
    if (!requireDatabase(response)) return;
    await ensureGamesSeeded();
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);
    const deleted = await Game.findOneAndDelete({ slug }).lean();
    if (!deleted) return response.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'No encontramos ese juego.' } });
    return response.status(200).json({ data: { deletedSlug: slug } });
  });

  router.get('/users', async (request, response) => {
    const users = await loadRegisteredGoogleUsers();
    return response.status(200).json({ data: users });
  });

  router.get('/orders', async (request, response) => {
    if (!isDatabaseConnected()) return response.status(200).json({ data: [] });
    const docs = await OrderInquiry.find().sort({ createdAt: -1 }).limit(250).lean();
    return response.status(200).json({ data: docs.map(mapDbOrder) });
  });

  router.patch('/orders/:id', async (request, response) => {
    if (!requireDatabase(response)) return;
    const orderId = z.string().trim().min(2).max(80).parse(request.params.id);
    const patch = orderUpdateSchema.parse(request.body ?? {});
    const updated = await OrderInquiry.findOneAndUpdate(
      { orderId },
      { status: patch.status, adminNotes: patch.adminNotes },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'No encontramos ese pedido.' } });
    return response.status(200).json({ data: mapDbOrder(updated) });
  });

  router.delete('/orders/:id', async (request, response) => {
    if (!requireDatabase(response)) return;
    const orderId = z.string().trim().min(2).max(80).parse(request.params.id);
    const deleted = await OrderInquiry.findOneAndDelete({ orderId }).lean();
    if (!deleted) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'No encontramos ese pedido.' } });
    return response.status(200).json({ data: { deletedId: orderId } });
  });

  router.post('/media', async (request, response) => {
    if (!requireDatabase(response)) return;
    const payload = mediaUploadSchema.parse(request.body ?? {});
    let buffer;
    try {
      buffer = validateAndDecodeImageBase64(payload.dataBase64, payload.contentType);
    } catch (error) {
      return response.status(400).json({ error: { code: 'INVALID_MEDIA', message: error.message } });
    }

    const extension = payload.contentType === 'image/png' ? 'png' : payload.contentType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = payload.filename
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'imagen';
    const key = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}.${extension}`;

    await MediaAsset.create({
      key,
      contentType: payload.contentType,
      filename: payload.filename,
      data: buffer,
      size: buffer.length,
    });

    return response.status(201).json({
      data: {
        key,
        url: '/api/media/' + key,
        contentType: payload.contentType,
        size: buffer.length,
      },
    });
  });

  router.get('/assistant/status', (request, response) => {
    const today = getArgentinaDateKey();
    const adminUsedToday = dailyAdminQuotaState.date === today ? dailyAdminQuotaState.count : 0;
    return response.status(200).json({
      data: {
        enabled: isGeminiConfigured(appEnv),
        model: getGeminiModel(appEnv),
        dailyLimit: getGeminiDailyLimit(appEnv),
        usedToday: 0,
        adminDailyLimit: DEFAULT_ADMIN_DAILY_LIMIT,
        adminUsedToday,
      },
    });
  });

  router.post('/assistant/copy', async (request, response) => {
    if (!isGeminiConfigured(appEnv)) {
      return response.status(503).json({
        error: {
          code: 'ASSISTANT_NOT_CONFIGURED',
          message: 'Configurá GEMINI_API_KEY en tu entorno para activar el Copiloto IA.',
        },
      });
    }

    const body = adminCopyRequestSchema.parse(request.body ?? {});
    let resolvedImage = null;
    if (body.image) {
      try {
        const buffer = validateAndDecodeImageBase64(body.image.dataBase64, body.image.contentType);
        resolvedImage = { contentType: body.image.contentType, dataBase64: buffer.toString('base64') };
      } catch (mediaError) {
        return response.status(400).json({ error: { code: 'INVALID_MEDIA', message: mediaError.message } });
      }
    } else if (body.imageUrl && isDatabaseConnected()) {
      const mediaKey = extractManagedMediaKey(body.imageUrl);
      if (mediaKey) {
        const asset = await MediaAsset.findOne({ key: mediaKey }).lean();
        if (asset?.data && ['image/png', 'image/jpeg', 'image/webp'].includes(asset.contentType)) {
          const buffer = Buffer.from(asset.data.buffer || asset.data);
          if (buffer.length > 0 && buffer.length <= 2 * 1024 * 1024) {
            resolvedImage = { contentType: asset.contentType, dataBase64: buffer.toString('base64') };
          }
        }
      }
    }

    const today = getArgentinaDateKey();
    if (dailyAdminQuotaState.date !== today) {
      dailyAdminQuotaState.date = today;
      dailyAdminQuotaState.count = 0;
    }
    if (dailyAdminQuotaState.count >= DEFAULT_ADMIN_DAILY_LIMIT) {
      return response.status(429).json({
        error: {
          code: 'ASSISTANT_DAILY_LIMIT',
          message: 'Se alcanzó el límite diario del Copiloto IA de administración.',
        },
      });
    }
    dailyAdminQuotaState.count += 1;

    const result = await generateAdminCopy({
      apiKey: appEnv.GEMINI_API_KEY.trim(),
      model: getGeminiModel(appEnv),
      target: body.target,
      name: body.name,
      species: body.species,
      category: body.category,
      price: body.price,
      note: body.note,
      existingDescription: body.existingDescription,
      image: resolvedImage,
      fetchImpl,
    });
    return response.status(200).json({ data: result });
  });

  return router;
}
