import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const sourceDirectory = path.join(projectRoot, 'public', 'images', 'catalog');
const outputDirectory = path.join(sourceDirectory, 'optimized');
const supportedExtensions = new Set(['.png', '.jpg', '.jpeg']);
const targetWidths = [480, 960];

await mkdir(outputDirectory, { recursive: true });

const files = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort();

let originalTotal = 0;
let allVariantsTotal = 0;
let largestVariantsTotal = 0;

for (const file of files) {
  const sourcePath = path.join(sourceDirectory, file);
  const sourceBytes = (await stat(sourcePath)).size;
  const baseName = path.parse(file).name;
  const extension = path.extname(file).toLowerCase();
  const isLogo = baseName.startsWith('logo-');
  const isJpeg = ['.jpg', '.jpeg'].includes(extension) && !isLogo;
  if (isJpeg) {
    for (const width of targetWidths) {
      await unlink(path.join(outputDirectory, `${baseName}-${width}w.webp`)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
  const metadata = await sharp(sourcePath).metadata();
  if (!isLogo && metadata.width < 960) {
    throw new Error(`${file} mide ${metadata.width}px de ancho; el catálogo necesita originales de al menos 960px para generar el srcset configurado.`);
  }
  const widths = isLogo
    ? [128]
    : targetWidths.filter((width) => width < metadata.width).concat(Math.min(metadata.width, 960));
  const uniqueWidths = [...new Set(widths)];
  let largestOutputBytes = 0;

  for (const width of uniqueWidths) {
    const outputName = isLogo
      ? `${baseName}.webp`
      : `${baseName}-${width}w.${isJpeg ? 'jpg' : 'webp'}`;
    const outputPath = path.join(outputDirectory, outputName);
    if (isJpeg && width === metadata.width && width <= 960) {
      await copyFile(sourcePath, outputPath);
    } else {
      const pipeline = sharp(sourcePath);
      pipeline.resize({ width, withoutEnlargement: true });

      if (isJpeg) {
        await pipeline.jpeg({ quality: width <= 480 ? 88 : 85, mozjpeg: true }).toFile(outputPath);
      } else {
        await pipeline.webp({
          quality: isLogo ? 88 : 84,
          effort: 6,
          lossless: false,
        }).toFile(outputPath);
      }
    }

    if (isJpeg && (await stat(outputPath)).size > sourceBytes) {
      await copyFile(sourcePath, outputPath);
    }

    const outputBytes = (await stat(outputPath)).size;
    allVariantsTotal += outputBytes;
    largestOutputBytes = Math.max(largestOutputBytes, outputBytes);
  }

  if (file === 'logo-light.png') {
    await sharp(sourcePath).resize({ width: 64, height: 64 }).png({ compressionLevel: 9 }).toFile(path.join(outputDirectory, 'favicon-64.png'));
    await sharp(sourcePath).resize({ width: 180, height: 180 }).png({ compressionLevel: 9 }).toFile(path.join(outputDirectory, 'apple-touch-icon.png'));
  }

  originalTotal += sourceBytes;
  largestVariantsTotal += largestOutputBytes;
  console.log(`${file.padEnd(31)} ${formatBytes(sourceBytes).padStart(9)} → ${formatBytes(largestOutputBytes).padStart(9)} (largest variant)`);
}

const savedBytes = originalTotal - largestVariantsTotal;
const savedPercent = originalTotal === 0 ? 0 : (savedBytes / originalTotal) * 100;
console.log(`\nOriginals: ${formatBytes(originalTotal)} | Largest variants: ${formatBytes(largestVariantsTotal)} | Savings per delivered image: ${formatBytes(savedBytes)} (${savedPercent.toFixed(1)}%)`);
console.log(`All generated files on disk: ${formatBytes(allVariantsTotal)}`);

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
