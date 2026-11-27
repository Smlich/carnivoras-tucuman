import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SITE_URL,
  PUBLIC_SITEMAP_ROUTES,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteUrl,
} from '../../scripts/seo-config.mjs';

test('resolveSiteUrl usa el dominio personalizado válido o el dominio Netlify por defecto', () => {
  assert.equal(resolveSiteUrl({}), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://carnivorastucuman.com.ar/' }), 'https://carnivorastucuman.com.ar');
  assert.equal(resolveSiteUrl({ VITE_SITE_URL: 'https://vivero.example.com/catalogo.html' }), 'https://vivero.example.com');
  assert.equal(resolveSiteUrl({ SITE_URL: 'javascript:alert(1)' }), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl({ SITE_URL: 'no-es-url' }), DEFAULT_SITE_URL);
});

test('buildSitemapXml incluye todas las rutas públicas con el origen resuelto y escapado XML', () => {
  const xml = buildSitemapXml('https://carnivorastucuman.com.ar/', '2026-11-26');
  for (const route of PUBLIC_SITEMAP_ROUTES) {
    assert.ok(xml.includes(`<loc>https://carnivorastucuman.com.ar${route}</loc>`), `Falta ruta ${route}`);
  }
  assert.ok(!xml.includes('admin.html'));
  assert.ok(!xml.includes('jugar-dionaea'));
  assert.ok(xml.includes('<lastmod>2026-11-26</lastmod>'));
});

test('buildRobotsTxt bloquea rutas privadas/API y apunta al sitemap del origen configurado', () => {
  const robots = buildRobotsTxt('https://carnivorastucuman.com.ar');
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Disallow: /admin.html'));
  assert.ok(robots.includes('Disallow: /jugar-dionaea.html'));
  assert.ok(robots.includes('Sitemap: https://carnivorastucuman.com.ar/sitemap.xml'));
});
