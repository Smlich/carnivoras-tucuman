import { z } from 'zod';

const safePathOrHttpsUrl = z.string().trim().min(1).refine(
  (value) => {
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  'Usá una ruta local que empiece con "/" o una URL HTTPS válida.',
);

const optionalSafeUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  safePathOrHttpsUrl.nullable().optional(),
);

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Ingresá un correo válido.').max(160),
  password: z.string().min(1, 'Ingresá la contraseña.').max(200),
});

export const adminAccountUpdateSchema = z.object({
  email: z.string().trim().email('Ingresá un correo válido.').max(160),
  name: z.string().trim().min(2, 'Ingresá un nombre de al menos 2 caracteres.').max(80),
  currentPassword: z.string().min(1, 'Ingresá tu contraseña actual para confirmar cambios.').max(200),
  newPassword: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.').max(200).optional(),
  ),
});

export const siteSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  currency: z.string().trim().min(3).max(8).default('ARS'),
  whatsappNumber: z.string().trim().regex(/^[0-9]{8,16}$/, 'Usá solo dígitos sin espacios ni "+" (ej. 5493816168898).'),
  whatsappDisplay: z.string().trim().min(6).max(32),
  instagramUrl: safePathOrHttpsUrl,
  instagramHandle: z.string().trim().min(2).max(50),
  facebookUrl: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? '' : value),
    z.union([z.literal(''), safePathOrHttpsUrl]),
  ),
  announcementItems: z.array(z.string().trim().min(2).max(90)).min(1).max(6),
  showPreviewBanner: z.boolean(),
  previewBannerText: z.string().trim().min(4).max(180),
  heroEyebrow: z.string().trim().min(3).max(90),
  heroLatInfoTitle: z.string().trim().min(3).max(90),
  heroLatInfoText: z.string().trim().min(10).max(360),
  heroTitlePrefix: z.string().trim().min(1).max(80),
  heroTitleEmphasis: z.string().trim().min(1).max(40),
  heroTitleSuffix: z.string().trim().max(80),
  heroLead: z.string().trim().min(10).max(360),
  priceFreezeEnabled: z.boolean(),
  priceFreezeTag: z.string().trim().min(2).max(50),
  priceFreezeLabel: z.string().trim().min(4).max(90),
  priceFreezeStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado AAAA-MM-DD.'),
  heroPrimaryCtaLabel: z.string().trim().min(2).max(50),
  heroSecondaryCtaLabel: z.string().trim().min(2).max(60),
  heroProofTag: z.string().trim().min(2).max(8),
  heroProofTitle: z.string().trim().min(3).max(90),
  heroProofSubtitle: z.string().trim().min(3).max(160),
  featuredProductIds: z.array(z.string().trim().regex(/^[a-z0-9-]+$/)).min(1).max(8),
});

export const productPayloadSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/, 'El identificador debe usar minúsculas, números y guiones.').max(80),
  name: z.string().trim().min(2).max(100),
  species: z.string().trim().min(2).max(120),
  description: z.string().trim().min(4).max(500),
  price: z.coerce.number().int('El precio debe ser un número entero de pesos.').min(0).max(50_000_000),
  category: z.enum(['combos', 'otras', 'venus', 'especiales']),
  categoryLabel: z.string().trim().min(2).max(40),
  image: safePathOrHttpsUrl,
  imageAlt: z.string().trim().min(4).max(240),
  note: z.string().trim().min(2).max(160),
  stockStatus: z.enum(['ask', 'available', 'unavailable']).default('ask'),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const galleryItemPayloadSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/, 'El identificador debe usar minúsculas, números y guiones.').max(80),
  src: safePathOrHttpsUrl,
  width: z.coerce.number().int().min(100).max(6000).default(960),
  height: z.coerce.number().int().min(100).max(6000).default(1280),
  label: z.string().trim().min(2).max(60),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(4).max(320),
  alt: z.string().trim().min(4).max(240),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const gamePayloadSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'El slug debe usar minúsculas, números y guiones.').max(80),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(4).max(400),
  status: z.enum(['coming-soon', 'playable', 'admin-only']).default('coming-soon'),
  requiresAuth: z.boolean().default(true),
  platform: z.string().trim().min(2).max(80).default('Google AI Studio'),
  embedUrl: optionalSafeUrl,
  adminEmbedUrl: optionalSafeUrl,
  aspectRatio: z.string().trim().regex(/^\d+\s*\/\s*\d+$/, 'Usá formato tipo "16 / 9".').default('16 / 9'),
  badge: z.string().trim().min(2).max(50).default('Gratis con Google'),
  adminProps: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const orderItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  price: z.coerce.number().int().min(0).max(50_000_000),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const orderCreateSchema = z.object({
  customerName: z.string().trim().max(80).optional().default(''),
  customerEmail: z.string().trim().max(160).optional().default(''),
  googleRegistered: z.boolean().optional().default(false),
  notes: z.string().trim().max(300).optional().default(''),
  items: z.array(orderItemSchema).min(1).max(40),
  source: z.string().trim().max(40).optional().default('whatsapp-cart'),
});

export const orderUpdateSchema = z.object({
  status: z.enum(['nuevo', 'en-proceso', 'confirmado', 'entregado', 'cancelado']),
  adminNotes: z.string().trim().max(400).optional().default(''),
});

export const mediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  dataBase64: z.string().min(16).max(2_900_000),
});

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function matchesImageSignature(buffer, contentType) {
  if (contentType === 'image/png') {
    return buffer.length >= 8
      && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
      && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  }

  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (contentType === 'image/webp') {
    return buffer.length >= 12
      && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  return false;
}

export function validateAndDecodeImageBase64(dataBase64, contentType) {
  const cleaned = String(dataBase64 || '').replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  const buffer = Buffer.from(cleaned, 'base64');

  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('La imagen debe pesar menos de 2 MB.');
  }

  if (!matchesImageSignature(buffer, contentType)) {
    throw new Error('El archivo no coincide con una imagen PNG, JPEG o WebP válida.');
  }

  return buffer;
}
