// One-off raster generator: public/icon.svg -> PNG app/PWA icons.
//
// Run with sharp available, e.g.:
//   npm install --no-save sharp && node scripts/generate-icons.mjs
//
// Regenerate whenever public/icon.svg changes. The PNGs are committed so the
// build/deploy never needs sharp.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(publicDir, 'icon.svg'));

/** [filename, pixel size] — all square. */
const targets = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
];

for (const [name, size] of targets) {
  // High density so the vector rasterises crisply at the target size.
  await sharp(svg, { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, name));
  console.log(`wrote public/${name} (${size}x${size})`);
}
