/**
 * Generates Android launcher icons from LDA-logo.png.
 * Run: node scripts/generate-android-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOGO_PATH = path.join(ROOT, 'LDA-logo.png');
const RES_ROOT = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const BACKGROUND = '#003366';

const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function composeIcon(size, logoScale = 0.62) {
  const logoSize = Math.max(24, Math.round(size * logoScale));
  const logo = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, {fit: 'inside', withoutEnlargement: false})
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.floor((size - (meta.width ?? logoSize)) / 2);
  const top = Math.floor((size - (meta.height ?? logoSize)) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{input: logo, left, top}])
    .png()
    .toBuffer();
}

async function composeForeground(size) {
  const logoSize = Math.round(size * 0.55);
  const logo = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, {fit: 'inside'})
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.floor((size - (meta.width ?? logoSize)) / 2);
  const top = Math.floor((size - (meta.height ?? logoSize)) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite([{input: logo, left, top}])
    .png()
    .toBuffer();
}

async function writePng(folder, filename, buffer) {
  const dir = path.join(RES_ROOT, folder);
  fs.mkdirSync(dir, {recursive: true});
  await sharp(buffer).toFile(path.join(dir, filename));
}

async function main() {
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error(`Logo not found: ${LOGO_PATH}`);
  }

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const icon = await composeIcon(size);
    await writePng(folder, 'ic_launcher.png', icon);
    await writePng(folder, 'ic_launcher_round.png', icon);
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const fg = await composeForeground(size);
    await writePng(folder, 'ic_launcher_foreground.png', fg);
  }

  fs.mkdirSync(path.join(RES_ROOT, 'mipmap-anydpi-v26'), {recursive: true});
  const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(RES_ROOT, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptiveIcon);
  fs.writeFileSync(path.join(RES_ROOT, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptiveIcon);

  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BACKGROUND}</color>
</resources>
`;
  fs.mkdirSync(path.join(RES_ROOT, 'values'), {recursive: true});
  fs.writeFileSync(path.join(RES_ROOT, 'values', 'colors.xml'), colorsXml);

  console.log('Android launcher icons generated from LDA-logo.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
