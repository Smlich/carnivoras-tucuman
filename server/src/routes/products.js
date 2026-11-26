import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { isDatabaseConnected } from '../config/database.js';
import { products as demoProducts } from '../../../src/data/products.js';
import { normalizeSearchText } from '../../../src/utils/normalize-text.js';
import { Product } from '../models/Product.js';

const categories = ['combos', 'otras', 'venus', 'especiales'];
const listQuerySchema = z.object({
  category: z.enum(categories).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

const accentClasses = {
  a: '[aáàäâ]',
  e: '[eéèëê]',
  i: '[iíìïî]',
  o: '[oóòöô]',
  u: '[uúùüû]',
  n: '[nñ]',
  c: '[cç]',
};

function escapeRegex(value) {
  const regexSpecialCharacters = '\\^$.*+?()[]{}|';
  return value
    .split('')
    .map((character) => regexSpecialCharacters.includes(character) ? '\\' + character : character)
    .join('');
}

// Crea un patrón que acepta la letra con o sin tilde (la opción "i" resuelve las mayúsculas).
function buildAccentInsensitiveRegex(value) {
  return normalizeSearchText(value)
    .split('')
    .map((character) => accentClasses[character] ?? escapeRegex(character))
    .join('');
}

function toClientProduct(product) {
  const stockStatus = product.stockStatus ?? 'ask';

  if (product.id) return { ...product, stockStatus };

  return {
    id: product.slug,
    name: product.name,
    species: product.scientificName,
    description: product.description,
    price: product.priceARS,
    category: product.category,
    categoryLabel: product.categoryLabel,
    image: product.image,
    imageAlt: product.imageAlt,
    note: product.catalogNote,
    stockStatus,
  };
}

function getDemoProducts({ category, q, page, limit }) {
  const normalizedSearch = normalizeSearchText(q);
  const filtered = demoProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const searchable = normalizeSearchText(
      [product.name, product.species, product.description, product.categoryLabel, product.note].join(' '),
    );
    return matchesCategory && searchable.includes(normalizedSearch);
  });
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit).map(toClientProduct),
    total: filtered.length,
  };
}

function sendDatabaseUnavailable(response) {
  response.set('Cache-Control', 'no-store');
  return response.status(503).json({
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'El catálogo no está disponible temporalmente. Intentá de nuevo en unos instantes.',
    },
  });
}

export function createProductsRouter({ isProduction = env.NODE_ENV === 'production' } = {}) {
  const router = Router();

  router.get('/', async (request, response) => {
    const query = listQuerySchema.parse(request.query);
    const skip = (query.page - 1) * query.limit;

    if (!isDatabaseConnected()) {
      // Nunca se sirven precios de demostración (posiblemente viejos) en producción.
      if (isProduction) return sendDatabaseUnavailable(response);

      const result = getDemoProducts(query);
      return response.status(200).json({
        data: result.data,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          source: 'demo-catalog',
        },
      });
    }

    const filters = { isActive: true };
    if (query.category) filters.category = query.category;
    if (query.q) {
      const safeQuery = buildAccentInsensitiveRegex(query.q);
      filters.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { scientificName: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } },
        { categoryLabel: { $regex: safeQuery, $options: 'i' } },
        { catalogNote: { $regex: safeQuery, $options: 'i' } },
      ];
    }

    const [documents, total] = await Promise.all([
      Product.find(filters)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Product.countDocuments(filters),
    ]);

    return response.status(200).json({
      data: documents.map(toClientProduct),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        source: 'mongodb',
      },
    });
  });

  router.get('/:slug', async (request, response) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).parse(request.params.slug);

    if (!isDatabaseConnected()) {
      if (isProduction) return sendDatabaseUnavailable(response);

      const product = demoProducts.find((item) => item.id === slug);
      if (!product) {
        return response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'No encontramos ese producto.' } });
      }
      return response.status(200).json({ data: toClientProduct(product), meta: { source: 'demo-catalog' } });
    }

    const document = await Product.findOne({ slug, isActive: true }).lean();
    if (!document) {
      return response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'No encontramos ese producto.' } });
    }

    return response.status(200).json({ data: toClientProduct(document), meta: { source: 'mongodb' } });
  });

  return router;
}

export const productsRouter = createProductsRouter();
