/**
 * Phase 28: nature on the paper map (lib/jelajah/map-nature.ts) placed on the real low-poly provinces.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hitTest, parseProvinceGeo, project } from '@/lib/jelajah/geo';
import {
  ambientMode,
  LAKES,
  loopPoint,
  MOUNTAIN_RANGES,
  NATURE_FULL,
  NATURE_LITE,
  PEAKS,
  placeNature,
  RIVERS,
  shipLoops,
  SHIP_ROUTES,
  smokePuff,
  VOLCANOES,
} from '@/lib/jelajah/map-nature';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));
const shapes = lowPolyShapes(parseProvinceGeo(JSON.parse(readFileSync(geoPath, 'utf8')), KNOWN_PROVINCES).shapes);
const full = placeNature(shapes, NATURE_FULL);
const lite = placeNature(shapes, NATURE_LITE);
const all = (n: typeof full) => n.flatMap((p, i) => p.mountains.map((m) => ({ ...m, kode: shapes[i].kode })));

describe('the data file', () => {
  it('has a source note for every kind of data', () => {
    const src = readFileSync(fileURLToPath(new URL('../../lib/jelajah/map-nature.ts', import.meta.url)), 'utf8');
    expect(src).toContain('Global Volcanism Program');
    expect(src).toContain('OpenStreetMap');
    expect(src).toMatch(/Puncak Jaya[^\n]*NOT a volcano/);
  });

  it('lists the volcanoes the prompt names, inside Indonesia', () => {
    const names = VOLCANOES.map((v) => v.name);
    for (const n of ['Kerinci', 'Marapi', 'Krakatau', 'Merapi', 'Semeru', 'Bromo (Tengger)', 'Agung', 'Rinjani', 'Tambora', 'Lokon-Empung', 'Ibu'])
      expect(names).toContain(n);
    for (const v of [...VOLCANOES, ...PEAKS]) {
      expect(v.lon).toBeGreaterThan(94);
      expect(v.lon).toBeLessThan(142);
      expect(v.lat).toBeGreaterThan(-11.5);
      expect(v.lat).toBeLessThan(6.5);
    }
    expect(VOLCANOES.filter((v) => v.smoke).length).toBeGreaterThanOrEqual(6);
  });
});

describe('placement', () => {
  it('every volcano on a main island stands in its own province; small-island ones only if their island is kept', () => {
    const placed = all(full).filter((m) => m.volcano);
    for (const v of VOLCANOES) {
      const m = placed.find((p) => p.volcano!.name === v.name);
      if (!v.smallIsland) expect(m, v.name).toBeDefined();
      if (m) expect(v.kode, v.name).toContain(m.kode);
    }
    const peak = all(full).find((m) => !m.volcano && m.height > 0.9);
    expect(peak?.kode).toBe('91');
  });

  it('range mountains follow their ranges: Sumatra, Java, Borneo, Sulawesi and Papua all get some', () => {
    const byIsland = (codes: string[]) => all(full).filter((m) => !m.volcano && codes.includes(m.kode!)).length;
    expect(byIsland(['11', '12', '13', '14', '15', '16', '17', '18'])).toBeGreaterThanOrEqual(8);
    expect(byIsland(['32', '33', '34', '35', '36'])).toBeGreaterThanOrEqual(3);
    expect(byIsland(['61', '62', '63', '64', '65'])).toBeGreaterThanOrEqual(5);
    expect(byIsland(['71', '72', '73', '74', '75', '76'])).toBeGreaterThanOrEqual(3);
    expect(byIsland(['91', '92'])).toBeGreaterThanOrEqual(5);
    expect(MOUNTAIN_RANGES.length).toBeGreaterThan(8);
  });

  it('mountains are 5- to 7-sided, sit fully on their province and never overlap', () => {
    const ms = all(full);
    for (const m of ms) {
      expect(m.sides).toBeGreaterThanOrEqual(5);
      expect(m.sides).toBeLessThanOrEqual(7);
      expect(shapes[hitTest(shapes, [m.x, m.y])].kode).toBe(m.kode);
    }
    for (let a = 0; a < ms.length; a += 1)
      for (let b = a + 1; b < ms.length; b += 1)
        expect(Math.hypot(ms[a].x - ms[b].x, ms[a].y - ms[b].y)).toBeGreaterThan(ms[a].radius * 0.6 + ms[b].radius * 0.6);
  });

  it('is deterministic; lite has fewer mountains (same volcanoes) and no rivers or lakes', () => {
    expect(placeNature(shapes, NATURE_FULL)).toEqual(full);
    const count = (n: typeof full, f: (m: (typeof full)[0]['mountains'][0]) => boolean) =>
      n.reduce((s, p) => s + p.mountains.filter(f).length, 0);
    expect(count(lite, (m) => !m.volcano)).toBeLessThan(count(full, (m) => !m.volcano) * 0.7);
    expect(count(lite, (m) => !!m.volcano)).toBe(count(full, (m) => !!m.volcano));
    expect(lite.every((p) => p.rivers.length === 0 && p.lakes.length === 0)).toBe(true);
  });

  it('rivers (Sumatra, Borneo, Papua) and lakes lie on land, inside the province that carries them', () => {
    const rivers = full.flatMap((p, i) => p.rivers.map((r) => ({ r, i })));
    expect(rivers.length).toBeGreaterThanOrEqual(RIVERS.length);
    for (const { r, i } of rivers) {
      for (let k = 0; k + 1 < r.points.length; k += 1) {
        const mid: [number, number] = [(r.points[k][0] + r.points[k + 1][0]) / 2, (r.points[k][1] + r.points[k + 1][1]) / 2];
        expect(hitTest(shapes, mid)).toBe(i);
      }
    }
    const riverCodes = new Set(rivers.map(({ i }) => shapes[i].kode!.slice(0, 1)));
    for (const island of ['1', '6', '9']) expect(riverCodes.has(island)).toBe(true);
    const lakes = full.flatMap((p, i) => p.lakes.map((l) => ({ l, i })));
    expect(lakes.length).toBe(LAKES.length);
    for (const { l, i } of lakes) expect(hitTest(shapes, [l.x, l.y])).toBe(i);
  });
});

describe('ships and smoke', () => {
  it('5 to 7 ship routes, every point of every loop on the paper sea (never on land)', () => {
    expect(SHIP_ROUTES.length).toBeGreaterThanOrEqual(5);
    expect(SHIP_ROUTES.length).toBeLessThanOrEqual(7);
    for (const loop of shipLoops()) {
      for (let t = 0; t < 1; t += 1 / 400) {
        const { p } = loopPoint(loop, t);
        // A ship is about 1 unit long: check its bow and stern too.
        expect(hitTest(shapes, p), `${p}`).toBe(-1);
        for (const [dx, dy] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) expect(hitTest(shapes, [p[0] + dx, p[1] + dy])).toBe(-1);
      }
    }
  });

  it('loops are closed and smooth', () => {
    const loop = shipLoops()[0];
    const a = loopPoint(loop, 0);
    const b = loopPoint(loop, 1);
    expect(b.p[0]).toBeCloseTo(a.p[0]);
    expect(b.p[1]).toBeCloseTo(a.p[1]);
    expect(Math.hypot(...a.tangent)).toBeCloseTo(1);
    expect(loopPoint(loop, 0).p).toEqual(project(...SHIP_ROUTES[0].path[0]));
  });

  it('reduced motion: ships docked and smoke still; lite: no ships; 2d: nothing (Phase 28 rules)', () => {
    expect(ambientMode('full', false)).toEqual({ ships: 'sailing', smoke: 'rising', animate: true });
    expect(ambientMode('full', true)).toEqual({ ships: 'docked', smoke: 'still', animate: false });
    expect(ambientMode('lite', false)).toEqual({ ships: 'none', smoke: 'still', animate: false });
    expect(ambientMode('lite', true)).toEqual({ ships: 'none', smoke: 'still', animate: false });
    expect(ambientMode('2d', false)).toEqual({ ships: 'none', smoke: 'none', animate: false });
  });

  it('smoke rises and drifts over time, and stands still with reduced motion', () => {
    const a = smokePuff(0, 3, 0, false);
    const b = smokePuff(0, 3, 2, false);
    expect(b.rise).toBeGreaterThan(a.rise);
    expect(b.drift).toBeGreaterThan(a.drift);
    expect(smokePuff(1, 3, 0, true)).toEqual(smokePuff(1, 3, 99, true));
    for (let s = 0; s < 20; s += 0.37) expect(smokePuff(2, 3, s, false).size).toBeGreaterThan(0);
  });
});
