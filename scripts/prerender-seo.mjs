import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import {
  buildRobotsTxt,
  buildSitemapXml,
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

  writeFileSync(resolve(distDir, 'sitemap.xml'), buildSitemapXml(siteUrl), 'utf8');
  writeFileSync(resolve(distDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8');
  const { fileCount, blockCount } = validateDistJsonLd();
  console.log(`[seo] sitemap.xml y robots.txt generados para ${siteUrl} (${blockCount} JSON-LD validados en ${fileCount} páginas públicas).`);
}

await runPostBuildSeo();
