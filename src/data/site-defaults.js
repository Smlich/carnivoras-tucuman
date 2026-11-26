import { galleryItems } from './gallery.js';
import { games } from './games.js';
import { products } from './products.js';

export const defaultSiteSettings = {
  storeName: 'Carnívoras Tucumán',
  city: 'Tucumán, Argentina',
  currency: 'ARS',
  whatsappNumber: '5493816168898',
  whatsappDisplay: '+54 9 381 616 8898',
  instagramUrl: 'https://www.instagram.com/carnivoras_tucuman/',
  instagramHandle: '@carnivoras_tucuman',
  facebookUrl: '',
  announcementItems: [
    'Vivero botánico · Tucumán, Argentina',
    'Fotos reales de nuestras plantas',
    'Consultas directas por WhatsApp',
  ],
  showPreviewBanner: false,
  previewBannerText: 'Vista de prueba · Confirmá precio, stock y entrega por WhatsApp antes de hacer un pedido.',
  heroEyebrow: 'Estación botánica · Tucumán 26.8° S',
  heroLatInfoTitle: '¿Qué significa Tucumán 26.8° S?',
  heroLatInfoText: 'Es la latitud sur de San Miguel de Tucumán. Indica nuestra radiación solar subtropical e inviernos moderados: cultivamos al aire libre para que tu planta llegue sana y ya aclimatada.',
  heroTitlePrefix: 'Plantas carnívoras ',
  heroTitleEmphasis: 'sanas',
  heroTitleSuffix: ' y al mismo precio desde 2024.',
  heroLead: 'Ejemplares vigorosos cultivados en vivero tucumano, con guía práctica de cuidado, asesoramiento por WhatsApp y precios congelados desde agosto de 2024.',
  priceFreezeEnabled: true,
  priceFreezeTag: 'Precios congelados',
  priceFreezeLabel: 'Tiempo sin aumentar desde agosto de 2024',
  priceFreezeStartDate: '2024-08-01',
  heroPrimaryCtaLabel: 'Ver catálogo y precios',
  heroSecondaryCtaLabel: 'Guía ilustrada de cuidados',
  heroProofTag: 'TUC',
  heroProofTitle: 'Atención directa desde Tucumán, Argentina',
  heroProofSubtitle: 'Consultá stock vigente, envíos y cuidados personalizados por WhatsApp.',
  featuredProductIds: [
    'combo-tres-carnivoras',
    'venus-pequena',
    'drosera-capensis-unidad',
    'venus-red-piranha',
  ],
};

export const defaultAdminProducts = products.map((product, index) => ({
  ...product,
  stockStatus: product.stockStatus ?? 'ask',
  isActive: true,
  sortOrder: index,
}));

export const defaultGalleryItems = galleryItems.map((item, index) => ({
  ...item,
  id: 'foto-' + String(index + 1).padStart(2, '0'),
  isActive: true,
  sortOrder: index,
}));

export const defaultAdminGames = games.map((game, index) => ({
  ...game,
  adminEmbedUrl: game.adminEmbedUrl ?? null,
  adminProps: game.adminProps ?? {
    adminMode: true,
    debugTools: true,
    unlockAll: true,
  },
  sortOrder: index,
}));
