import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SITE_URL,
  PUBLIC_SITEMAP_ROUTES,
  SPECIES_SITEMAP_ROUTES,
  buildCatalogCollectionJsonLd,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  buildSpeciesJsonLdScripts,
  resolveSiteUrl,
} from '../../scripts/seo-config.mjs';
import { products } from '../../src/data/products.js';
import { matchProductsForSpecies, SPECIES_SEO_PAGES } from '../../src/data/species-seo.js';

test('resolveSiteUrl usa el dominio personalizado válido o el dominio Netlify por defecto', () => {
  assert.equal(resolveSiteUrl({}), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://carnivorastucuman.com.ar/' }), 'https://carnivorastucuman.com.ar');
  assert.equal(resolveSiteUrl({ VITE_SITE_URL: 'https://vivero.example.com/catalogo.html' }), 'https://vivero.example.com');
  assert.equal(resolveSiteUrl({ SITE_URL: 'javascript:alert(1)' }), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl({ SITE_URL: 'no-es-url' }), DEFAULT_SITE_URL);
});

test('buildSitemapXml incluye las 13 rutas públicas con el origen resuelto y escapado XML', () => {
  assert.equal(PUBLIC_SITEMAP_ROUTES.length, 13);
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

test('SPECIES_SEO_PAGES cumple longitudes de SEO y genera JSON-LD válido por especie', () => {
  assert.equal(SPECIES_SEO_PAGES.length, 5);
  assert.deepEqual(
    SPECIES_SEO_PAGES.map((entry) => `/${entry.slug}.html`),
    SPECIES_SITEMAP_ROUTES,
  );

  for (const species of SPECIES_SEO_PAGES) {
    assert.ok(species.metaTitle.length <= 60, `Título largo en ${species.slug}`);
    assert.ok(
      species.metaDescription.length >= 120 && species.metaDescription.length <= 160,
      `Descripción fuera de rango en ${species.slug}: ${species.metaDescription.length}`,
    );
    assert.ok(species.faqs.length >= 3, `Faltan FAQs en ${species.slug}`);

    const matching = matchProductsForSpecies(products, species);
    const scripts = buildSpeciesJsonLdScripts(species, matching, 'https://carnivorastucuman.com.ar');
    assert.equal(scripts.length, 3);
    assert.equal(scripts[0]['@type'], 'BreadcrumbList');
    assert.equal(scripts[2]['@type'], 'FAQPage');
    assert.equal(scripts[2].mainEntity.length, species.faqs.length);
  }
});

test('buildCatalogCollectionJsonLd y buildLlmsTxt reflejan el catálogo base y el dominio configurado', () => {
  const catalogJson = buildCatalogCollectionJsonLd(products, 'https://carnivorastucuman.com.ar');
  assert.equal(catalogJson['@type'], 'CollectionPage');
  assert.equal(catalogJson.mainEntity.numberOfItems, products.length);
  assert.equal(catalogJson.mainEntity.itemListElement[0].item.offers.priceCurrency, 'ARS');

  const llms = buildLlmsTxt('https://carnivorastucuman.com.ar', products, SPECIES_SEO_PAGES);
  assert.ok(llms.includes('# Carnívoras Tucumán'));
  assert.ok(llms.includes('https://carnivorastucuman.com.ar/venus-atrapamoscas.html'));
  assert.ok(llms.includes('Venus atrapamoscas pequeña'));
});
