import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BatikBand, BatikCorner, BatikMotif } from '@/components/brand/Batik';
import { Logotype } from '@/components/brand/Logotype';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';
import { batikTileDataUri, batikTileSvg, cornerLattice, BATIK_TILE } from '@/lib/brand/batik';
import { TOKENS, contrastRatio } from '@/lib/theme/tokens';

const root = fileURLToPath(new URL('../../', import.meta.url));
const css = readFileSync(join(root, 'app/globals.css'), 'utf8');

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function pngSize(file: string): [number, number] {
  const b = readFileSync(join(root, file));
  expect(b.subarray(1, 4).toString(), file).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('Logotype (Phase 27)', () => {
  it('renders SITE_NAME as live text in every variant', () => {
    for (const variant of ['gradient', 'dark', 'light', 'auto'] as const) {
      const html = renderToStaticMarkup(<Logotype variant={variant} />);
      expect(html).toContain(`>${SITE_NAME}<`);
      expect(html).toContain(`data-logotype="${variant}"`);
      expect(html).toContain(`nl-logotype-${variant}`);
    }
    expect(renderToStaticMarkup(<Logotype as="h1" />)).toMatch(/^<h1 /);
  });

  it('the component never writes the name itself (lib/brand.ts is the single text source)', () => {
    const src = readFileSync(join(root, 'components/brand/Logotype.tsx'), 'utf8');
    expect(src).not.toContain(SITE_NAME);
    expect(src).toContain("from '@/lib/brand'");
  });

  it('CSS: Cinzel Decorative, the vertical #D4621A → #F4AE52 gradient with a solid fallback, forced colours', () => {
    expect(css).toMatch(/\.nl-logotype \{[^}]*font-family: var\(--font-cinzel-decorative\)/);
    expect(css).toContain('linear-gradient(to bottom, var(--nl-brand-terracotta), var(--nl-brand-amber))');
    expect(css).toMatch(/@supports \(\(-webkit-background-clip: text\) or \(background-clip: text\)\)/);
    // Fallback outside @supports: solid amber for the gradient, brown for the dark version.
    expect(css).toMatch(/\.nl-logotype-gradient,\s*\.dark \.nl-logotype-auto \{ color: var\(--nl-brand-amber\); \}/);
    expect(css).toMatch(/\.nl-logotype-dark \{ color: var\(--nl-brand-brown\); \}/);
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\.nl-logotype \{ color: CanvasText/);
  });
});

describe('batik ornaments (Phase 27)', () => {
  const corner = renderToStaticMarkup(<BatikCorner />);
  const motif = renderToStaticMarkup(<BatikMotif />);
  const band = renderToStaticMarkup(<BatikBand />);

  it('are decorative: aria-hidden, not focusable, no text', () => {
    for (const html of [corner, motif, band]) {
      expect(html).toContain('aria-hidden="true"');
      expect(html.replace(/<[^>]+>/g, '').trim()).toBe('');
    }
    expect(corner).toContain('focusable="false"');
    expect(motif).toContain('focusable="false"');
  });

  it('take their colour from currentColor / CSS variables (both themes), never a fixed colour', () => {
    for (const html of [corner, motif]) {
      expect(html).toContain('currentColor');
      expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      expect(html).toContain('text-ornament');
    }
    expect(css).toMatch(/\.nl-batik-band \{[^}]*color: var\(--nl-ornament\);[^}]*background-color: currentColor;/);
    expect(css).toMatch(/\.nl-batik-texture::before \{[^}]*background-color: var\(--nl-ornament\);/);
  });

  it('the CSS tile is exactly the shared geometry', () => {
    expect(css).toContain(`--nl-batik-tile: ${batikTileDataUri()};`);
  });

  it('the corner keeps whole motifs only (stepped 45° edge like the cover)', () => {
    const size = BATIK_TILE * 5.5;
    const { cells, flowers } = cornerLattice(size);
    expect(cells.length).toBeGreaterThan(8);
    for (const [x, y] of cells) expect(x + y + BATIK_TILE + 20).toBeLessThanOrEqual(size);
    for (const [x, y] of flowers) expect(x + y).toBeLessThanOrEqual(size);
  });

  it('total ornament assets stay within 15 KB gzip', () => {
    const cssOrnament = css.slice(css.indexOf('/*\n * Batik ornaments'));
    const total = [corner, motif, band, batikTileSvg('currentColor'), cssOrnament]
      .map((s) => gzipSync(Buffer.from(s)).length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(15 * 1024);
  });

  it('the background texture never costs body text its AA contrast (darkest blend, both themes)', () => {
    const opacity = {
      light: Number(css.match(/:root \{\s*--nl-batik-texture-opacity: ([\d.]+);/)?.[1]),
      dark: Number(css.match(/:root\.dark \{ --nl-batik-texture-opacity: ([\d.]+); \}/)?.[1]),
    };
    for (const theme of ['light', 'dark'] as const) {
      expect(opacity[theme]).toBeGreaterThan(0);
      expect(opacity[theme]).toBeLessThanOrEqual(0.08);
      const t = TOKENS[theme];
      for (const bg of [t.background, t.surface, t.muted]) {
        const blended = mix(bg, t.ornament, opacity[theme]);
        for (const fg of [t.text, t['text-muted'], t['primary-text']]) {
          expect(contrastRatio(fg, blended), `${theme} ${fg} on ${blended}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('icons and Open Graph image (Phase 27, provisional NL monogram)', () => {
  it('exist in the expected sizes', () => {
    expect(pngSize('app/icon.png')).toEqual([48, 48]);
    expect(pngSize('app/apple-icon.png')).toEqual([180, 180]);
    expect(pngSize('app/opengraph-image.png')).toEqual([1200, 630]);
    const ico = readFileSync(join(root, 'public/favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(existsSync(join(root, 'app/favicon.ico'))).toBe(false);
  });

  it('the OG alt text and the generator outlines follow lib/brand.ts', () => {
    expect(readFileSync(join(root, 'app/opengraph-image.alt.txt'), 'utf8')).toBe(`${SITE_NAME}: ${SITE_TAGLINE}`);
    const outlines = JSON.parse(readFileSync(join(root, 'scripts/brand/outlines.json'), 'utf8'));
    expect(outlines.logotype.text).toBe(SITE_NAME);
    expect(outlines.tagline.text).toBe(SITE_TAGLINE);
    expect(outlines.monogram.text).toBe('NL');
  });

  it('metadata has an absolute base for the Open Graph image', () => {
    const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('metadataBase: new URL("https://nusantaralegacy.org")');
  });
});
