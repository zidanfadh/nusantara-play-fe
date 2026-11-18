import { describe, expect, it } from 'vitest';
import {
  ellipsize,
  fitSignText,
  SIGN_CANVAS,
  SIGN_CENTER_Y,
  SIGN_FONT_SIZES,
  SIGN_HEIGHT,
  SIGN_MAX_LINES,
  SIGN_TEXT_BOX,
  SIGN_WIDTH,
  wrapLines,
  type Measure,
} from '@/lib/jelajah/engine/sign-text';
import { STAND_ROOF_TOP } from '@/lib/jelajah/engine/collision';

/** Fake font: every character is 0.55 × the font size wide (close to a bold sans-serif). */
const measure: Measure = (text, px) => [...text].length * px * 0.55;

const allFit = (lines: string[], px: number, width = SIGN_TEXT_BOX.width) =>
  lines.every((l) => measure(l, px) <= width);

describe('sign layout', () => {
  it('every sign has the same size, with the canvas aspect ratio, above the stand roof', () => {
    expect(SIGN_HEIGHT / SIGN_WIDTH).toBeCloseTo(SIGN_CANVAS.height / SIGN_CANVAS.width, 9);
    expect(SIGN_CENTER_Y - SIGN_HEIGHT / 2).toBeGreaterThan(STAND_ROOF_TOP);
  });

  it('is larger than the Phase 11 sign (2.9 m)', () => {
    expect(SIGN_WIDTH).toBeGreaterThan(2.9);
  });

  it('two lines at the smallest size still fit the text box', () => {
    const smallest = SIGN_FONT_SIZES.at(-1) as number;
    expect(SIGN_MAX_LINES * Math.round(smallest * 1.12)).toBeLessThanOrEqual(SIGN_TEXT_BOX.height);
  });
});

describe('fitSignText', () => {
  it('a short title uses the largest font on one line', () => {
    const fit = fitSignText('Gasing', measure);
    expect(fit.fontPx).toBe(SIGN_FONT_SIZES[0]);
    expect(fit.lines).toEqual(['Gasing']);
    expect(fit.cut).toBe(false);
  });

  it('a medium title wraps to two lines before shrinking', () => {
    const fit = fitSignText('Permainan Rakyat Daerah', measure);
    expect(fit.lines.length).toBe(2);
    expect(fit.cut).toBe(false);
    expect(allFit(fit.lines, fit.fontPx)).toBe(true);
  });

  it('a long title shrinks, then gets an ellipsis; text never overflows', () => {
    const long = 'DEMO PROT Sumsel 1 dengan nama yang sangat panjang sekali untuk diuji pada papan stand';
    const fit = fitSignText(long, measure);
    expect(fit.fontPx).toBe(SIGN_FONT_SIZES.at(-1));
    expect(fit.lines.length).toBeLessThanOrEqual(SIGN_MAX_LINES);
    expect(fit.cut).toBe(true);
    expect(fit.lines.at(-1)?.endsWith('…')).toBe(true);
    expect(allFit(fit.lines, fit.fontPx)).toBe(true);
  });

  it('one very long word is shortened with an ellipsis', () => {
    const fit = fitSignText('Supercalifragilisticexpialidocious-permainan-tradisional', measure);
    expect(fit.cut).toBe(true);
    expect(fit.lines[0].endsWith('…')).toBe(true);
    expect(allFit(fit.lines, fit.fontPx)).toBe(true);
  });

  it('collapses whitespace and handles an empty title', () => {
    expect(fitSignText('  Lompat \n  Tali ', measure).lines).toEqual(['Lompat Tali']);
    expect(fitSignText('   ', measure).lines).toEqual(['Tanpa nama']);
  });

  it('fits "Segera hadir" without shortening', () => {
    expect(fitSignText('Segera hadir', measure).cut).toBe(false);
  });
});

describe('wrapLines and ellipsize', () => {
  it('keeps every line within the width', () => {
    const { lines } = wrapLines('a bb ccc dddd eeeee ffffff', 100, 3, 20, measure);
    expect(allFit(lines, 20, 100)).toBe(true);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('ellipsize always returns something that fits', () => {
    const out = ellipsize('abcdefghijklmnopqrstuvwxyz', 60, 20, measure);
    expect(measure(out, 20)).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
  });
});
