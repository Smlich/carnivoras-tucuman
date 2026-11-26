import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'images', 'og');

const targets = [
  {
    src: path.join(root, 'public', 'images', 'gallery', 'jarro-con-gotas.jpeg'),
    dest: path.join(outputDir, 'og-home.jpg'),
  },
  {
    src: path.join(root, 'public', 'images', 'catalog', 'combo-three-plants.png'),
    dest: path.join(outputDir, 'og-catalogo.jpg'),
  },
  {
    src: path.join(root, 'public', 'images', 'gallery', 'floracion-drosera.jpeg'),
    dest: path.join(outputDir, 'og-vivero.jpg'),
  },
];

await mkdir(outputDir, { recursive: true });

for (const item of targets) {
  await sharp(item.src)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(item.dest);

  const info = await stat(item.dest);
  const meta = await sharp(item.dest).metadata();
  console.log(`${path.basename(item.dest)}: ${meta.width}x${meta.height} (${(info.size / 1024).toFixed(1)} KB)`);
}
