/**
 * Phase 28: the paper map's slab geometry (lib/jelajah/three/map-geometry.ts with PAPER_SLAB) on the real provinces.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseProvinceGeo, shapesBounds } from '@/lib/jelajah/geo';
import { facetColours, PALETTES, provinceFill } from '@/lib/jelajah/palette';
import { NATURE_FULL, placeNature } from '@/lib/jelajah/map-nature';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';
import {
  BAKE_AMBIENT,
  BAKE_DIFFUSE,
  buildMapGeometry,
  densifyRing,
  KIND,
  liftShape,
  paintShape,
  PAPER_SLAB,
  subdivide,
  type MapGeometry,
} from '@/lib/jelajah/three/map-geometry';
import { PAPER, paperArea, shadowMode } from '@/lib/jelajah/three/paper';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));
const shapes = lowPolyShapes(parseProvinceGeo(JSON.parse(readFileSync(geoPath, 'utf8')), KNOWN_PROVINCES).shapes);
const heights = shapes.map((_, i) => (i % 3 === 0 ? 0.42 : 0.26));

function paintAll(g: MapGeometry, mode: 'light' | 'dark') {
  const p = PALETTES[mode];
  shapes.forEach((_, i) =>
    paintShape(g, i, {
      tops: facetColours(p, provinceFill(p, i % 4, 3, false), i % 4 === 0),
      wallTop: p.earthTop,
      wallBottom: p.earthBottom,
      water: p.water,
      rockLight: p.rockLight,
      rockDark: p.rockDark,
      crater: p.crater,
    }),
  );
  return (g.surface.getAttribute('color').array as Float32Array).slice();
}

describe('paper slab geometry', () => {
  const g = buildMapGeometry(shapes, heights, PAPER_SLAB);

  it('is deterministic: positions, facet variants, baked shades and painted colours are equal between builds', () => {
    const again = buildMapGeometry(shapes, heights, PAPER_SLAB);
    expect(Array.from(again.basePositions)).toEqual(Array.from(g.basePositions));
    expect(Array.from(again.variants)).toEqual(Array.from(g.variants));
    expect(Array.from(again.shades)).toEqual(Array.from(g.shades));
    expect(Array.from(paintAll(again, 'light'))).toEqual(Array.from(paintAll(g, 'light')));
  });

  it('uses every facet variant, and only the palette variants', () => {
    const tops = [...g.variants].filter((_, v) => g.kinds[v] === KIND.top);
    expect(new Set(tops)).toEqual(new Set([0, 1, 2, 3]));
    expect(Math.max(...g.variants)).toBeLessThan(PALETTES.light.facets.length);
  });

  it('bakes the light: flat tops near 1, walls between ambient and 1 (+ jitter)', () => {
    for (let v = 0; v < g.kinds.length; v += 1) {
      const s = g.shades[v];
      expect(s).toBeGreaterThanOrEqual(BAKE_AMBIENT - PAPER_SLAB.jitter - 1e-6);
      expect(s).toBeLessThanOrEqual(BAKE_AMBIENT + BAKE_DIFFUSE + PAPER_SLAB.jitter + 1e-6);
    }
  });

  it('stays within the scene budget (one draw call for all islands)', () => {
    expect(g.triangles).toBeLessThan(40_000);
    expect(g.ranges).toHaveLength(shapes.length);
    const last = g.ranges[g.ranges.length - 1];
    expect(last.start + last.count).toBe(g.surface.getAttribute('position').count);
  });

  it('wall feet sit on the paper; tops are at their height plus a small noise', () => {
    g.ranges.forEach((range, i) => {
      for (let v = range.start; v < range.start + range.count; v += 1) {
        const y = g.basePositions[v * 3 + 1];
        if (g.kinds[v] === KIND.wallBottom) expect(y).toBe(0);
        else {
          expect(y).toBeGreaterThanOrEqual(heights[i] - 1e-6);
          expect(y).toBeLessThanOrEqual(heights[i] + PAPER_SLAB.noise + 1e-6);
        }
      }
    });
  });

  it('liftShape raises one province only, keeps its feet on the paper, and 0 puts it back', () => {
    const lifted = buildMapGeometry(shapes, heights, PAPER_SLAB);
    const pos = () => lifted.surface.getAttribute('position').array as Float32Array;
    liftShape(lifted, 2, 0.15);
    const r = lifted.ranges[2];
    for (let v = 0; v < lifted.kinds.length; v += 1) {
      const inRange = v >= r.start && v < r.start + r.count;
      const expected = lifted.basePositions[v * 3 + 1] + (inRange && lifted.kinds[v] !== KIND.wallBottom ? 0.15 : 0);
      expect(pos()[v * 3 + 1]).toBeCloseTo(expected, 6);
    }
    liftShape(lifted, 2, 0);
    expect(Array.from(pos())).toEqual(Array.from(lifted.basePositions));
  });
});

describe('nature merged into the slabs (Phase 28 step 2)', () => {
  const nature = placeNature(shapes, NATURE_FULL);
  const g = buildMapGeometry(shapes, heights, PAPER_SLAB, nature);

  it('mountains, volcanoes, rivers and lakes add no draw call and stay within the budget', () => {
    expect(g.triangles).toBeLessThan(40_000);
    for (const kind of [KIND.water, KIND.rockLight, KIND.rockDark, KIND.crater]) expect(g.kinds).toContain(kind);
  });

  it('one smoke vent per smoking volcano, in its province and above its slab', () => {
    const smoking = nature.flatMap((n, i) => n.mountains.filter((m) => m.volcano?.smoke).map(() => i));
    expect(g.vents.map((v) => v.shape).sort()).toEqual(smoking.sort());
    for (const v of g.vents) expect(v.y).toBeGreaterThan(heights[v.shape]);
  });

  it('water sits above the highest facet of its province (never hidden under the surface)', () => {
    g.ranges.forEach((range, i) => {
      for (let v = range.start; v < range.start + range.count; v += 1)
        if (g.kinds[v] === KIND.water) expect(g.basePositions[v * 3 + 1]).toBeGreaterThan(heights[i] + PAPER_SLAB.noise);
    });
  });
});

describe('densify and subdivide', () => {
  it('no outline edge and no facet edge is longer than the limit', () => {
    const ring = densifyRing([[0, 0], [5, 0], [5, 3], [0, 3]], 0.85);
    for (let k = 0; k < ring.length; k += 1) {
      const a = ring[k];
      const b = ring[(k + 1) % ring.length];
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(0.85);
    }
    const tris = subdivide([[[0, 0], [5, 0], [5, 3]], [[0, 0], [5, 3], [0, 3]]], 0.85);
    for (const t of tris)
      for (let k = 0; k < 3; k += 1)
        expect(Math.hypot(t[(k + 1) % 3][0] - t[k][0], t[(k + 1) % 3][1] - t[k][1])).toBeLessThanOrEqual(0.85);
    // Area is preserved (no cracks, no overlaps).
    const area = tris.reduce((s, t) => s + Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2, 0);
    expect(area).toBeCloseTo(15, 9);
  });
});

describe('paper and shadows per tier', () => {
  it('exactly one kind of island shadow per tier: shadow map on full, painted into the paper on lite', () => {
    expect(shadowMode('full')).toBe('map');
    expect(shadowMode('lite')).toBe('baked');
  });

  it('the paper plane covers the whole archipelago with room to pan', () => {
    const b = shapesBounds(shapes);
    const area = paperArea(b);
    expect(area.maxX - area.minX).toBe(PAPER.width);
    expect(area.minX).toBeLessThan(b.minX - 30);
    expect(area.maxX).toBeGreaterThan(b.maxX + 30);
    expect(area.minY).toBeLessThan(b.minY - 25);
    expect(area.maxY).toBeGreaterThan(b.maxY + 25);
  });

  it.each(['light', 'dark'] as const)('%s palette: the paper is in the brand range (cream light, brown dark)', (mode) => {
    const p = PALETTES[mode];
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    };
    if (mode === 'light') expect(lum(p.paper)).toBeGreaterThan(0.9);
    else expect(lum(p.paper)).toBeLessThan(0.2);
    // The walls must stand out from the paper in both themes.
    expect(Math.abs(lum(p.earthTop) - lum(p.paper))).toBeGreaterThan(0.25);
  });
});
