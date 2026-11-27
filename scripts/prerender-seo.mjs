import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { products as defaultProducts } from '../src/data/products.js';
import { matchProductsForSpecies, SPECIES_SEO_PAGES } from '../src/data/species-seo.js';
import {
  buildCatalogCollectionJsonLd,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSitemapXml,
  buildSpeciesJsonLdScripts,
  getArgentinaTodayIso,
  resolveSiteUrl,
} from './seo-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const PRIVATE_HTML_FILES = new Set(['admin.html', 'jugar-dionaea.html']);

function injectPrerenderedRoot(html, renderedContent, fileName) {
  const rootPattern = /<div\s+id=["']root["']\s*>\s*<\/div>/i;
  if (!rootPattern.test(html)) {
    throw new Error(`No se encontró <div id="root"></div> en dist/${fileName}.`);
  }
  if (!/<h1\b/i.test(renderedContent)) {
    throw new Error(`El HTML prerenderizado de "${fileName}" no contiene un encabezado <h1>.`);
  }
  return html.replace(rootPattern, () => `<div id="root">${renderedContent}</div>`);
}

function serializeJsonLdTag(payload) {
  return `<script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}

function refreshCatalogJsonLd(siteUrl) {
  const catalogPath = resolve(distDir, 'catalogo.html');
  const html = readFileSync(catalogPath, 'utf8');
  const collectionPayload = buildCatalogCollectionJsonLd(defaultProducts, siteUrl);
  let replaced = false;

  const updated = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, body) => {
    try {
      const parsed = JSON.parse(body);
      if (parsed['@type'] === 'CollectionPage') {
        replaced = true;
        return serializeJsonLdTag(collectionPayload);
      }
    } catch {
      // Mantiene el bloque original; el validador final detectará cualquier sintaxis rota.
    }
    return full;
  });

  if (!replaced) {
    throw new Error('No se encontró el bloque JSON-LD CollectionPage en dist/catalogo.html.');
  }
  writeFileSync(catalogPath, updated, 'utf8');
}

function refreshCareArticleDate(todayIso) {
  const carePath = resolve(distDir, 'cuidados.html');
  const html = readFileSync(carePath, 'utf8');
  let replaced = false;

  const updated = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, body) => {
    try {
      const parsed = JSON.parse(body);
      if (parsed['@type'] === 'Article') {
        parsed.dateModified = todayIso;
        replaced = true;
        return serializeJsonLdTag(parsed);
      }
    } catch {
      // Delegar validación estricta a validateDistJsonLd.
    }
    return full;
  });

  if (replaced) {
    writeFileSync(carePath, updated, 'utf8');
  }
}

function injectSpeciesJsonLd(siteUrl) {
  const placeholderPattern = /<script type="application\/ld\+json" data-seo-dynamic="species">[\s\S]*?<\/script>/;
  for (const species of SPECIES_SEO_PAGES) {
    const htmlPath = resolve(distDir, `${species.slug}.html`);
    const html = readFileSync(htmlPath, 'utf8');
    if (!placeholderPattern.test(html)) {
      throw new Error(`Falta placeholder JSON-LD dinámico en dist/${species.slug}.html.`);
    }
    const matching = matchProductsForSpecies(defaultProducts, species);
    const scripts = buildSpeciesJsonLdScripts(species, matching, siteUrl).map(serializeJsonLdTag).join('\n    ');
    const updated = html.replace(placeholderPattern, () => scripts);
    writeFileSync(htmlPath, updated, 'utf8');
  }
}

function validateDistJsonLd() {
  const htmlFiles = readdirSync(distDir).filter((file) => file.endsWith('.html') && !PRIVATE_HTML_FILES.has(file));
  let totalBlocks = 0;

  for (const file of htmlFiles) {
    const html = readFileSync(resolve(distDir, file), 'utf8');
    const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const match of matches) {
      JSON.parse(match[1]);
      totalBlocks += 1;
    }
  }

  return { fileCount: htmlFiles.length, blockCount: totalBlocks };
}

async function runPostBuildSeo() {
  const siteUrl = resolveSiteUrl(process.env);
  const todayIso = getArgentinaTodayIso();
  const viteServer = await createServer({
    configFile: false,
    root: projectRoot,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    logLevel: 'error',
  });

  try {
    const ssrModule = await viteServer.ssrLoadModule('/src/ssr/prerender-pages.jsx');
    for (const fileName of ssrModule.PRERENDER_TARGETS) {
      const htmlPath = resolve(distDir, fileName);
      const sourceHtml = readFileSync(htmlPath, 'utf8');
      const rendered = ssrModule.renderPageHtml(fileName);
      const updatedHtml = injectPrerenderedRoot(sourceHtml, rendered, fileName);
      writeFileSync(htmlPath, updatedHtml, 'utf8');
      console.log(`[seo] Prerenderizado dist/${fileName} (${rendered.length} bytes)`);
    }
  } finally {
    await viteServer.close();
  }

  refreshCatalogJsonLd(siteUrl);
  injectSpeciesJsonLd(siteUrl);
  refreshCareArticleDate(todayIso);

  writeFileSync(resolve(distDir, 'sitemap.xml'), buildSitemapXml(siteUrl, todayIso), 'utf8');
  writeFileSync(resolve(distDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8');
  writeFileSync(resolve(distDir, 'llms.txt'), buildLlmsTxt(siteUrl, defaultProducts, SPECIES_SEO_PAGES), 'utf8');

  const { fileCount, blockCount } = validateDistJsonLd();
  console.log(`[seo] sitemap.xml, robots.txt y llms.txt generados para ${siteUrl} (${blockCount} JSON-LD validados en ${fileCount} páginas públicas).`);
}

await runPostBuildSeo();
