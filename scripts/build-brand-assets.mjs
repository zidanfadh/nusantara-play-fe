// Phase 27: builds the site icons and the Open Graph image in the new identity from code, so they can be rebuilt any
// time. `pnpm brand:assets` writes:
//   app/icon.png (48 px), app/apple-icon.png (180 px), public/favicon.ico (16 + 32 px PNG entries),
//   app/opengraph-image.png (1200 x 630) and app/opengraph-image.alt.txt.
// The "NL" monogram (Cinzel Decorative, amber on dark brown) is PROVISIONAL until the design team delivers an icon.
// Glyphs come as outlines from scripts/brand/outlines.json (no font needed at render time); the batik corners from
// lib/brand/batik.ts. Rendering: the sharp that Next.js itself depends on (no new dependency).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BATIK_TILE, FLOWER_D, FRAME_D, FRAME_STROKE, SMALL_FLOWER_D, cornerLattice } from '../lib/brand/batik.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(createRequire(import.meta.url).resolve('next/package.json'));
const sharp = require('sharp');

const BROWN = '#2A1A0E';
const AMBER = '#F4AE52';
const TERRACOTTA = '#D4621A';
const CREAM = '#FEF3E2';
const outlines = JSON.parse(readFileSync(new URL('./brand/outlines.json', import.meta.url), 'utf8'));
const brand = readFileSync(new URL('../lib/brand.ts', import.meta.url), 'utf8');
const SITE_NAME = brand.match(/SITE_NAME = '([^']+)'/)[1];
const SITE_TAGLINE = brand.match(/SITE_TAGLINE = '([^']+)'/)[1];
if (outlines.logotype.text !== SITE_NAME || outlines.tagline.text !== SITE_TAGLINE) {
  throw new Error('scripts/brand/outlines.json is out of date with lib/brand.ts (see the Phase 27 report to regenerate)');
}

/** Places an outline so its ink box is centred on (cx, cy) with the given ink height. */
function place(o, cx, cy, inkHeight) {
  const [x0, y0, x1, y1] = o.ink;
  const s = inkHeight / (y1 - y0);
  const tx = cx - ((x0 + x1) / 2) * s;
  const ty = cy - ((y0 + y1) / 2) * s;
  return { transform: `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})`, width: (x1 - x0) * s, s, y0, y1, ty };
}

function cornerSvg(size, transform) {
  const { cells, flowers } = cornerLattice(BATIK_TILE * 5.5);
  const k = size / (BATIK_TILE * 5.5);
  const frames = cells.map(([x, y]) => `<path d="${FRAME_D}" transform="translate(${x} ${y})"/>`).join('');
  const fills = [
    ...cells.map(([x, y]) => `<path d="${FLOWER_D}" transform="translate(${x} ${y})"/>`),
    ...flowers.map(([x, y]) => `<path d="${SMALL_FLOWER_D}" transform="translate(${x} ${y})"/>`),
  ].join('');
  return `<g transform="${transform} scale(${k})"><g fill="none" stroke="${AMBER}" stroke-width="${FRAME_STROKE}" stroke-linejoin="round">${frames}</g><g fill="${AMBER}">${fills}</g></g>`;
}

function monogramSvg(px) {
  const m = place(outlines.monogram, px / 2, px / 2, px * 0.42);
  // Fit the width too (the L's swash is wide).
  const maxW = px * 0.82;
  const fit = m.width > maxW ? place(outlines.monogram, px / 2, px / 2, (px * 0.42 * maxW) / m.width) : m;
  const r = px * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">` +
    `<rect width="${px}" height="${px}" rx="${r}" fill="${BROWN}"/>` +
    (px >= 64 ? `<rect x="${px * 0.06}" y="${px * 0.06}" width="${px * 0.88}" height="${px * 0.88}" rx="${r * 0.7}" fill="none" stroke="${AMBER}" stroke-opacity="0.55" stroke-width="${px * 0.012}"/>` : '') +
    `<path d="${outlines.monogram.d}" transform="${fit.transform}" fill="${AMBER}"/></svg>`;
}

function ogSvg() {
  const W = 1200;
  const H = 630;
  const logo = place(outlines.logotype, W / 2, 330, 92);
  const fitLogo = logo.width > W * 0.84 ? place(outlines.logotype, W / 2, 330, (92 * W * 0.84) / logo.width) : logo;
  const top = 330 - 46;
  const bottom = 330 + 46;
  const tag = place(outlines.tagline, W / 2, 430, 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}">` +
    `<stop offset="0" stop-color="${TERRACOTTA}"/><stop offset="1" stop-color="${AMBER}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="${BROWN}"/>` +
    cornerSvg(300, 'translate(0 0)') +
    cornerSvg(300, `translate(${W} ${H}) rotate(180)`) +
    `<path d="${outlines.logotype.d}" transform="${fitLogo.transform}" fill="url(#g)"/>` +
    `<path d="${outlines.tagline.d}" transform="${tag.transform}" fill="${CREAM}"/>` +
    `</svg>`;
}

/** ICO with PNG entries (Vista+ format), like the Phase 12 favicon. */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const png = (svg, opts = {}) => sharp(Buffer.from(svg)).png({ compressionLevel: 9, ...opts }).toBuffer();

const outputs = {
  'app/icon.png': await png(monogramSvg(48)),
  'app/apple-icon.png': await png(monogramSvg(180), { palette: true, colours: 128 }),
  'public/favicon.ico': ico([
    { size: 16, data: await png(monogramSvg(16)) },
    { size: 32, data: await png(monogramSvg(32)) },
  ]),
  'app/opengraph-image.png': await png(ogSvg(), { palette: true, colours: 64 }),
};
for (const [file, data] of Object.entries(outputs)) {
  writeFileSync(root + file, data);
  console.log(file, data.length, 'B');
}
writeFileSync(root + 'app/opengraph-image.alt.txt', `${SITE_NAME}: ${SITE_TAGLINE}`);
