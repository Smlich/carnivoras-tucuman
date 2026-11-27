export const DEFAULT_SITE_URL = 'https://carnivorastucuman.netlify.app';

export const PUBLIC_SITEMAP_ROUTES = [
  '/',
  '/catalogo.html',
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
