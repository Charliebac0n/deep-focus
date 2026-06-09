/**
 * Generates placeholder icon and splash PNGs for Deep.
 * Replace with professionally designed assets before App Store submission.
 * Usage: node scripts/generate-assets.cjs
 */

const { Jimp, rgbaToInt } = require('../node_modules/jimp/dist/commonjs/index.js');
const path = require('path');
const ASSETS = path.join(__dirname, '..', 'assets');

const DEEP_NAVY  = rgbaToInt(2,   11,  24,  255);
const OCEAN_BLUE = rgbaToInt(0,   180, 216, 255);

async function makeIcon(size, outPath) {
  const img = new Jimp({ width: size, height: size, color: DEEP_NAVY });
  const cx = size / 2, cy = size / 2;

  // Subtle glow ring
  const outerR = size * 0.38, innerR = size * 0.31;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (r <= outerR && r >= innerR) {
        const t = 1 - Math.abs(r - (outerR + innerR) / 2) / ((outerR - innerR) / 2);
        img.setPixelColor(rgbaToInt(0, 180, 216, Math.floor(60 * t)), x, y);
      }
    }
  }

  // Inner circle (dark)
  const cR = size * 0.28;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= cR) {
        img.setPixelColor(rgbaToInt(10, 30, 48, 255), x, y);
      }
    }
  }

  // "D." pixel font — scaled to icon size
  const u = Math.max(1, Math.floor(size / 14));
  const tx = Math.floor(cx - u * 2.5);
  const ty = Math.floor(cy - u * 3.0);

  function block(col, row, w, h) {
    for (let dx = 0; dx < w * u; dx++) {
      for (let dy = 0; dy < h * u; dy++) {
        const px = tx + col * u + dx, py = ty + row * u + dy;
        if (px >= 0 && px < size && py >= 0 && py < size)
          img.setPixelColor(OCEAN_BLUE, px, py);
      }
    }
  }

  // D — vertical stroke + arched right side
  block(0, 0, 1, 6);   // left vertical
  block(0, 0, 3, 1);   // top bar
  block(0, 5, 3, 1);   // bottom bar
  block(3, 1, 1, 1);   // upper right curve
  block(4, 2, 1, 2);   // right bulge
  block(3, 4, 1, 1);   // lower right curve
  // period
  block(5.5, 5, 1.2, 1.2);

  await img.write(outPath);
  console.log(`  ✓ ${path.basename(outPath)} (${size}×${size})`);
}

async function makeSplash(outPath) {
  const W = 1284, H = 2778;
  const img = new Jimp({ width: W, height: H, color: DEEP_NAVY });
  const cx = W / 2, cy = H / 2, maxR = W * 0.5;
  for (let x = 0; x < W; x += 2) {
    for (let y = 0; y < H; y += 2) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (r < maxR) {
        const a = Math.floor(22 * (1 - r / maxR));
        const c = rgbaToInt(0, 119, 182, a);
        img.setPixelColor(c, x, y);
        img.setPixelColor(c, x + 1, y);
        img.setPixelColor(c, x, y + 1);
        img.setPixelColor(c, x + 1, y + 1);
      }
    }
  }
  await img.write(outPath);
  console.log(`  ✓ ${path.basename(outPath)} (${W}×${H})`);
}

(async () => {
  console.log('Generating Deep. assets...');
  await makeIcon(1024, path.join(ASSETS, 'icon.png'));
  await makeIcon(1024, path.join(ASSETS, 'adaptive-icon.png'));
  await makeSplash(path.join(ASSETS, 'splash.png'));
  console.log('\nDone. Replace with professionally designed assets before App Store submission.');
})();
