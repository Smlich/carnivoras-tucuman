import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const sourceDirectory = path.join(projectRoot, 'public', 'images', 'gallery');
const outputDirectory = path.join(sourceDirectory, 'optimized');
const targetWidth = 480;

await mkdir(outputDirectory, { recursive: true });

const files = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (files.length === 0) throw new Error('No se encontraron fotos JPEG en public/images/gallery.');

let generatedBytes = 0;

for (const file of files) {
  const inputPath = path.join(sourceDirectory, file);
  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`No se pudieron leer las dimensiones de ${file}.`);

  const basename = path.parse(file).name;
  const outputPath = path.join(outputDirectory, `${basename}-${targetWidth}w.jpg`);
  await sharp(inputPath)
    .rotate()
    .resize({ width: targetWidth, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outputPath);

  const outputBytes = (await stat(outputPath)).size;
  generatedBytes += outputBytes;
  console.log(`${file} → ${formatBytes(outputBytes)} (miniatura ${targetWidth}px)`);
}

console.log(`\nFotos optimizadas: ${files.length} | Peso total de miniaturas: ${formatBytes(generatedBytes)}`);

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
