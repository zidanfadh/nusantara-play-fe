import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BRAND,
  CONTRAST_PAIRS,
  DERIVED,
  LOGOTYPE,
  TOKEN_NAMES,
  TOKENS,
  contrastRatio,
  type ThemeName,
} from '@/lib/theme/tokens';

const root = fileURLToPath(new URL('../../', import.meta.url));
const css = readFileSync(join(root, 'app/globals.css'), 'utf8');

/** `--nl-*` declarations of the first rule whose selector is exactly `selector`. */
function cssVars(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--nl-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** oklch(L% C H) → #RRGGBB (CSS Color 4 reference conversion, gamut-clipped). */
function oklchToHex(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const enc = (x: number) => {
    const v = Math.min(1, Math.max(0, x));
    return Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
  };
  return `#${lin.map((x) => enc(x).toString(16).padStart(2, '0')).join('')}`;
}

function rampHex(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)% ([\\d.]+) ([\\d.]+)\\)`));
  expect(m, name).not.toBeNull();
  return oklchToHex(Number(m![1]) / 100, Number(m![2]), Number(m![3]));
}

describe('visual identity tokens (Phase 27)', () => {
  it('the brand colours are the four of the Konsep Visual, exact', () => {
    expect(BRAND).toEqual({ cream: '#FEF3E2', amber: '#F4AE52', terracotta: '#D4621A', brown: '#2A1A0E' });
    const vars = cssVars(':root');
    expect(vars['brand-cream']).toBe(BRAND.cream);
    expect(vars['brand-amber']).toBe(BRAND.amber);
    expect(vars['brand-terracotta']).toBe(BRAND.terracotta);
    expect(vars['brand-brown']).toBe(BRAND.brown);
  });

  it('globals.css defines every semantic token in both themes with the values of lib/theme/tokens.ts', () => {
    const sel: Record<ThemeName, string> = { light: ':root', dark: ':root.dark' };
    for (const theme of ['light', 'dark'] as const) {
      const vars = cssVars(sel[theme]);
      for (const name of TOKEN_NAMES) expect(vars[name], `${theme} ${name}`).toBe(TOKENS[theme][name]);
    }
  });

  it('Tailwind sees every semantic token through @theme inline', () => {
    for (const name of TOKEN_NAMES) expect(css).toContain(`--color-${name}: var(--nl-${name});`);
    // The older names follow the new palette too.
    for (const old of ['foreground', 'card', 'muted-foreground', 'ring', 'warm-card', 'surface-container-low', 'primary-fixed']) {
      expect(css).toMatch(new RegExp(`--color-${old}: var\\(--nl-`));
    }
  });

  it('light = cream background, dark-brown text, terracotta primary; dark = brown background, cream text, amber primary', () => {
    expect(TOKENS.light.background).toBe(BRAND.cream);
    expect(TOKENS.light.text).toBe(BRAND.brown);
    expect(TOKENS.light.primary).toBe(DERIVED.terracotta600);
    expect(TOKENS.light.accent).toBe(BRAND.amber);
    expect(TOKENS.dark.background).toBe(BRAND.brown);
    expect(TOKENS.dark.text).toBe(BRAND.cream);
    expect(TOKENS.dark.primary).toBe(BRAND.amber);
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const { fg, bg, min } of CONTRAST_PAIRS) {
      it(`${theme}: ${fg} on ${bg} reaches ${min}:1`, () => {
        const ratio = contrastRatio(TOKENS[theme][fg], TOKENS[theme][bg]);
        expect(ratio, `${TOKENS[theme][fg]} on ${TOKENS[theme][bg]} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it('the documented failures of the exact brand colours are real (why the derived shades exist)', () => {
    expect(contrastRatio(BRAND.terracotta, BRAND.cream)).toBeLessThan(4.5);
    expect(contrastRatio('#FFFFFF', BRAND.terracotta)).toBeLessThan(4.5);
    expect(contrastRatio(BRAND.amber, BRAND.cream)).toBeLessThan(3);
    // ... and the replacements pass.
    expect(contrastRatio(DERIVED.terracotta700, BRAND.cream)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(BRAND.cream, DERIVED.terracotta600)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(DERIVED.amber700, BRAND.cream)).toBeGreaterThanOrEqual(3);
  });

  it('the logotype versions are readable as large text on their own background', () => {
    expect(contrastRatio(LOGOTYPE.gradient.from, LOGOTYPE.gradient.on)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(LOGOTYPE.gradient.to, LOGOTYPE.gradient.on)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(LOGOTYPE.dark.color, LOGOTYPE.dark.on)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(LOGOTYPE.light.color, LOGOTYPE.light.on)).toBeGreaterThanOrEqual(4.5);
  });

  it('the warm and terracotta ramps keep the contrast of the Tailwind classes they replace', () => {
    // Pairs the older pages use (text-white on bg-blue-600 buttons, gray text on white or dark cards).
    expect(contrastRatio('#FFFFFF', rampHex('blue-600'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', rampHex('blue-700'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', rampHex('indigo-600'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('blue-800'), rampHex('blue-100'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('gray-500'), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('gray-600'), rampHex('gray-50'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('gray-700'), rampHex('gray-100'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('gray-300'), rampHex('gray-800'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('gray-400'), rampHex('gray-900'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rampHex('stone-600'), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});
