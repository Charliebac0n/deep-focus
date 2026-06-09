/**
 * Generates placeholder app icon and splash screen PNGs.
 * Replace the output files with properly designed assets before App Store submission.
 *
 * Usage: node scripts/generate-assets.mjs
 */

import Jimp from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');

// Brand colours
const DEEP_NAVY  = 0x020B18FF;  // background
const OCEAN_BLUE = 0x00B4D8FF;  // primary
const WHITE      = 0xFFFFFFFF;

async function makeIcon(size, outPath) {
  const img = new Jimp({ width: size, height: size, color: DEEP_NAVY });

  // Outer glow ring
  const ringSize  = Math.floor(size * 0.78);
  const ringInner = Math.floor(size * 0.64);
  const cx = size / 2;
  const cy = size / 2;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r <= ringSize / 2 && r >= ringInner / 2) {
        img.setPixelColor(
          Jimp.rgbaToInt(0, 180, 216, Math.floor(80 * (1 - Math.abs(r - (ringSize + ringInner) / 4) / (ringSize / 2)))),
          x, y
        );
      }
    }
  }

  // Inner filled circle
  const circleR = Math.floor(size * 0.30);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= circleR) {
        const blend = 0x0A1E30FF;
        img.setPixelColor(blend, x, y);
      }
    }
  }

  // "D." text — drawn as thick pixel blocks scaled to icon size
  const unit = Math.floor(size / 14);
  const tx   = Math.floor(cx - unit * 2.2);
  const ty   = Math.floor(cy - unit * 2.8);

  function dot(px, py, w, h, color) {
    for (let dx = 0; dx < w * unit; dx++) {
      for (let dy = 0; dy < h * unit; dy++) {
        const ix = tx + px * unit + dx;
        const iy = ty + py * unit + dy;
        if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
          img.setPixelColor(color, ix, iy);
        }
      }
    }
  }

  const C = OCEAN_BLUE;
  // D vertical stroke
  dot(0, 0, 1, 6, C);
  // D top bar
  dot(0, 0, 3, 1, C);
  // D bottom bar
  dot(0, 5, 3, 1, C);
  // D right arc (simplified as 2 segments)
  dot(3, 1, 1, 1, C);
  dot(4, 2, 1, 2, C);
  dot(3, 4, 1, 1, C);
  // Period dot
  dot(5.5, 5, 1, 1, C);

  await img.write(outPath);
  console.log(`  ✓ ${outPath} (${size}×${size})`);
}

async function makeSplash(outPath) {
  const W = 1284, H = 2778;  // iPhone 14 Pro Max native resolution
  const img = new Jimp({ width: W, height: H, color: DEEP_NAVY });

  // Subtle radial glow at centre
  const cx = W / 2, cy = H / 2;
  const maxR = Math.min(W, H) * 0.45;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (r < maxR) {
        const alpha = Math.floor(18 * (1 - r / maxR));
        img.setPixelColor(Jimp.rgbaToInt(0, 119, 182, alpha), x, y);
      }
    }
  }

  await img.write(outPath);
  console.log(`  ✓ ${outPath} (${W}×${H})`);
}

console.log('Generating Deep. assets...');
await makeIcon(1024, join(ASSETS, 'icon.png'));
await makeIcon(1024, join(ASSETS, 'adaptive-icon.png'));
await makeSplash(join(ASSETS, 'splash.png'));
console.log('\nDone. Replace with professionally designed assets before App Store submission.');
