export const DEFAULT_SITE_URL = 'https://carnivorastucuman.netlify.app';

export const SPECIES_SITEMAP_ROUTES = [
  '/venus-atrapamoscas.html',
  '/drosera.html',
  '/sarracenia.html',
  '/nepenthes.html',
  '/pinguicula.html',
];

export const PUBLIC_SITEMAP_ROUTES = [
  '/',
  '/catalogo.html',
  ...SPECIES_SITEMAP_ROUTES,
  '/vivero.html',
  '/cuidados.html',
  '/juegos.html',
  '/contacto.html',
  '/privacidad.html',
  '/terminos.html',
];

/** Normaliza el origen canónico público desde variables de entorno, usando el dominio Netlify por defecto. */
export function resolveSiteUrl(env = process.env) {
  const candidate = String(env?.SITE_URL || env?.VITE_SITE_URL || '').trim();
  if (!candidate) return DEFAULT_SITE_URL;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_SITE_URL;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/** Devuelve la fecha actual YYYY-MM-DD según la zona horaria de Argentina. */
export function getArgentinaTodayIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toAbsoluteUrl(pathOrUrl, baseUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return baseUrl;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

function buildProductSchemaItem(product, baseUrl, targetPageUrl) {
  const isAvailable = product?.stockStatus !== 'unavailable';
  return {
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: toAbsoluteUrl(product.image, baseUrl),
    brand: {
      '@type': 'Brand',
      name: 'Carnívoras Tucumán',
    },
    category: product.categoryLabel || product.species || 'Plantas carnívoras',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: Number(product.price) || 0,
      itemCondition: 'https://schema.org/NewCondition',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: targetPageUrl,
      seller: { '@type': 'Organization', name: 'Carnívoras Tucumán' },
    },
  };
}

/** Genera el JSON-LD CollectionPage + ItemList de catálogo sincronizado con el catálogo base. */
export function buildCatalogCollectionJsonLd(products, siteUrl) {
  const baseUrl = resolveSiteUrl({ SITE_URL: siteUrl });
  const catalogUrl = `${baseUrl}/catalogo.html`;
  const list = Array.isArray(products) ? products : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catálogo de plantas carnívoras | Carnívoras Tucumán',
    url: catalogUrl,
    inLanguage: 'es-AR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: list.length,
      itemListElement: list.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: buildProductSchemaItem(product, baseUrl, catalogUrl),
      })),
    },
  };
}

/** Genera BreadcrumbList, CollectionPage/WebPage y FAQPage JSON-LD para una ficha de especie. */
export function buildSpeciesJsonLdScripts(species, matchingProducts, siteUrl) {
  const baseUrl = resolveSiteUrl({ SITE_URL: siteUrl });
  const pageUrl = `${baseUrl}/${species.slug}.html`;
  const list = Array.isArray(matchingProducts) ? matchingProducts : [];

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${baseUrl}/catalogo.html` },
      { '@type': 'ListItem', position: 3, name: species.shortName, item: pageUrl },
    ],
  };

  const pageSchema = list.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: species.metaTitle,
        description: species.metaDescription,
        url: pageUrl,
        inLanguage: 'es-AR',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: list.length,
          itemListElement: list.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: buildProductSchemaItem(product, baseUrl, pageUrl),
          })),
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: species.metaTitle,
        description: species.metaDescription,
        url: pageUrl,
        inLanguage: 'es-AR',
      };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (species.faqs || []).map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return [breadcrumb, pageSchema, faqSchema];
}

/** Genera el contenido XML de sitemap.xml usando el origen canónico configurado. */
export function buildSitemapXml(siteUrl, lastmod = getArgentinaTodayIso()) {
  const baseUrl = resolveSiteUrl({ SITE_URL: siteUrl });
  const urls = PUBLIC_SITEMAP_ROUTES.map((route) => {
    const loc = escapeXml(`${baseUrl}${route}`);
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** Genera robots.txt bloqueando rutas privadas/API y apuntando al sitemap del origen configurado. */
export function buildRobotsTxt(siteUrl) {
  const baseUrl = resolveSiteUrl({ SITE_URL: siteUrl });
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /admin.html',
    'Disallow: /jugar-dionaea',
    'Disallow: /jugar-dionaea.html',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

/** Genera /llms.txt para resumir estructura, especies, precios base y cuidados locales para motores IA. */
export function buildLlmsTxt(siteUrl, products = [], speciesPages = []) {
  const baseUrl = resolveSiteUrl({ SITE_URL: siteUrl });
  const speciesLines = speciesPages.map(
    (sp) => `- [${sp.shortName} en Tucumán](${baseUrl}/${sp.slug}.html): ${sp.metaDescription}`,
  );
  const productLines = products.map(
    (p) => `- ${p.name} (${p.species}) — $${Number(p.price || 0).toLocaleString('es-AR')} ARS: ${p.description}`,
  );

  return [
    '# Carnívoras Tucumán',
    '',
    '> Vivero especializado en plantas carnívoras cultivadas en San Miguel de Tucumán, Argentina. Precios de referencia en pesos argentinos, fotografías reales sin filtros y atención por WhatsApp.',
    '',
    '## Páginas principales',
    `- [Inicio](${baseUrl}/): Presentación del vivero, ejemplares destacados y contacto directo.`,
    `- [Catálogo completo](${baseUrl}/catalogo.html): Stock, filtros por especie, recomendador y armado de pedido por WhatsApp.`,
    `- [Guía ilustrada de cuidados](${baseUrl}/cuidados.html): Agua destilada/lluvia, luz solar en Tucumán, sustrato inerte y asistente botánico.`,
    `- [Álbum fotográfico del vivero](${baseUrl}/vivero.html): Galería real de cultivo en Tucumán.`,
    `- [Juegos gratis del vivero](${baseUrl}/juegos.html): Dionaea Strike — Carnívora vs Moscas Alien, jugable gratis en navegador con cuenta de Google.`,
    `- [Contacto y pedidos](${baseUrl}/contacto.html): WhatsApp (+54 9 381 616-8898) e Instagram (@carnivoras_tucuman).`,
    '',
    '## Fichas por especie en Tucumán',
    ...speciesLines,
    '',
    '## Catálogo de referencia',
    ...productLines,
    '',
    '## Reglas esenciales de cultivo en Tucumán',
    '- Agua: siempre agua destilada, desmineralizada, de lluvia o de aire acondicionado. Nunca agua de red ni mineral.',
    '- Sustrato: turba rubia / musgo sphagnum y perlita sin fertilizantes; nunca tierra fértil ni compost.',
    '- Sol: Venus y Sarracenia aman 4-6 h de sol evitando la siesta extrema tucumana (12-16 h en verano); Nepenthes y Pinguicula prefieren luz brillante indirecta.',
    '',
  ].join('\n');
}
