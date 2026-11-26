import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const imagesDirectory = path.join(projectRoot, 'src', 'games', 'dionaea-strike', 'assets', 'images');

const files = (await readdir(imagesDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (files.length === 0) {
  console.log('No quedan imágenes .jpg pendientes de optimizar en Dionaea Strike.');
  process.exit(0);
}

let beforeBytes = 0;
let afterBytes = 0;

for (const file of files) {
  const inputPath = path.join(imagesDirectory, file);
  const originalSize = (await stat(inputPath)).size;
  beforeBytes += originalSize;

  const baseName = path.parse(file).name;
  const outputPath = path.join(imagesDirectory, `${baseName}.webp`);
  const pipeline = sharp(inputPath).rotate();

  if (baseName.includes('crest_logo')) {
    await pipeline
      .resize({ width: 256, height: 256, fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 86, effort: 6 })
      .toFile(outputPath);
  } else if (baseName.includes('hero_title')) {
    await pipeline
      .webp({ quality: 82, effort: 6 })
      .toFile(outputPath);
  } else {
    await pipeline
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);
  }

  const nextSize = (await stat(outputPath)).size;
  afterBytes += nextSize;
  await unlink(inputPath);
  console.log(`${file} → ${baseName}.webp: ${(originalSize / 1024).toFixed(1)} KiB → ${(nextSize / 1024).toFixed(1)} KiB`);
}

const savedPct = beforeBytes > 0 ? ((beforeBytes - afterBytes) / beforeBytes) * 100 : 0;
console.log(`\nTotal Dionaea Strike: ${(beforeBytes / 1024).toFixed(1)} KiB → ${(afterBytes / 1024).toFixed(1)} KiB (-${savedPct.toFixed(1)}%)`);
