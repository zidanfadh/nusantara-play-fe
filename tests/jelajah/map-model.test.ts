import { describe, expect, it } from 'vitest';
import type { ProvinceSummary } from '@/lib/jelajah/data';
import { isClickable, maxProtCount, visualState } from '@/lib/jelajah/map-model';
import { PALETTES, mixHex, provinceFill } from '@/lib/jelajah/palette';

const summary = (kode: string, protCount: number): ProvinceSummary => ({
  kode,
  nama: kode,
  slug: kode,
  protCount,
  prots: [],
});
const byKode = new Map([
  ['32', summary('32', 3)],
  ['11', summary('11', 0)],
  ['16', summary('16', 0)],
]);

describe('map model', () => {
  it('only provinces with PROT and the pilot are clickable', () => {
    expect(isClickable('32', byKode)).toBe(true);
    expect(isClickable('11', byKode)).toBe(false);
    expect(isClickable('16', byKode)).toBe(true); // pilot, even without PROT
    expect(isClickable(null, byKode)).toBe(false);
    expect(isClickable('99', byKode)).toBe(false);
  });

  it('selected wins over hover', () => {
    expect(visualState('32', '32', '32')).toBe('selected');
    expect(visualState('32', '32', null)).toBe('hover');
    expect(visualState('32', null, '11')).toBe('idle');
  });

  it('maxProtCount', () => {
    expect(maxProtCount(byKode)).toBe(3);
  });
});

describe('palette', () => {
  it('mixHex interpolates and clamps', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 2)).toBe('#ffffff');
  });

  it.each(['light', 'dark'] as const)('%s: muted without PROT, pilot distinct, stronger with more PROT', (mode) => {
    const p = PALETTES[mode];
    expect(provinceFill(p, 0, 10, false)).toBe(p.muted);
    expect(provinceFill(p, 0, 10, true)).toBe(p.pilot);
    const low = provinceFill(p, 1, 10, false);
    const high = provinceFill(p, 10, 10, false);
    expect(high).toBe(p.protHigh.toLowerCase());
    expect(low).not.toBe(high);
    expect(provinceFill(p, 1, 10, false, 'hover')).not.toBe(low);
    expect(provinceFill(p, 1, 10, false, 'selected')).not.toBe(low);
  });
});
