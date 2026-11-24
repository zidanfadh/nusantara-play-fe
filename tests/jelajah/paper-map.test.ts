/**
 * Phase 28: the low-poly paper map, pure part (lib/jelajah/paper-map.ts) on the real province file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hitTest, parseProvinceGeo, pointInPolygon, ringArea, type Point } from '@/lib/jelajah/geo';
import { hash32, heightNoise, lowPolyShapes, patchVariant, rand01, simplifyPolyline, vertexCount } from '@/lib/jelajah/paper-map';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));
const parsed = parseProvinceGeo(JSON.parse(readFileSync(geoPath, 'utf8')), KNOWN_PROVINCES);
const low = lowPolyShapes(parsed.shapes);

/** A point inside the polygon: the centroid of its first triangle-ish fan that lies inside, else a scan. */
function interiorPoint(ring: readonly Point[]): Point {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 1; i < 40; i += 1)
    for (let j = 1; j < 40; j += 1) {
      const p: Point = [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * j) / 40];
      if (pointInPolygon(p, [ring as Point[]])) return p;
    }
  return ring[0];
}

describe('seeded hashing', () => {
  it('is stable and spreads', () => {
    expect(hash32('a', 1)).toBe(hash32('a', 1));
    expect(hash32('a', 1)).not.toBe(hash32('a', 2));
    const values = Array.from({ length: 1000 }, (_, i) => rand01('t', i));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('patch variants and height noise are pure functions of the position', () => {
    expect(patchVariant(3.21, -1.5, 4)).toBe(patchVariant(3.21, -1.5, 4));
    const seen = new Set<number>();
    for (let x = -20; x < 20; x += 0.7) for (let y = -8; y < 8; y += 0.7) seen.add(patchVariant(x, y, 4));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    expect(heightNoise(1.2345, 2.5, 0.05)).toBe(heightNoise(1.2345, 2.5, 0.05));
    expect(heightNoise(1.2345, 2.5, 0.05)).toBeLessThan(0.05);
  });
});

describe('Douglas-Peucker', () => {
  it('keeps the ends and drops points closer than the tolerance', () => {
    const line: Point[] = [[0, 0], [1, 0.01], [2, 0], [3, 1], [4, 0]];
    expect(simplifyPolyline(line, 0.05)).toEqual([[0, 0], [2, 0], [3, 1], [4, 0]]);
  });
});

describe('low-poly shapes (real province file)', () => {
  it('only Indonesian provinces: every shape has a known province code and lies inside Indonesia', () => {
    const codes = new Set(KNOWN_PROVINCES.map((p) => p.kode));
    expect(low).toHaveLength(parsed.shapes.length);
    for (const s of low) {
      expect(s.kode && codes.has(s.kode)).toBe(true);
      // 94..142 °E, 11.5 °S..6.5 °N in map units (centred on 118 °E, 2.5 °S).
      expect(s.bbox.minX).toBeGreaterThan(94 - 118);
      expect(s.bbox.maxX).toBeLessThan(142 - 118);
      expect(s.bbox.minY).toBeGreaterThan(-11.5 + 2.5);
      expect(s.bbox.maxY).toBeLessThan(6.5 + 2.5);
    }
    expect(new Set(low.map((s) => s.kode)).size).toBe(low.length);
  });

  it('is much lighter than the source and deterministic', () => {
    const before = vertexCount(parsed.shapes);
    const after = vertexCount(low);
    expect(after).toBeLessThan(before * 0.45);
    expect(lowPolyShapes(parsed.shapes)).toEqual(low);
  });

  it('every province keeps at least one polygon with area, and is pickable at a point inside it', () => {
    low.forEach((shape, i) => {
      expect(shape.polygons.length).toBeGreaterThan(0);
      const largest = [...shape.polygons].sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0];
      expect(Math.abs(ringArea(largest[0]))).toBeGreaterThan(0);
      const p = interiorPoint(largest[0]);
      expect(hitTest(low, p), shape.name).toBe(i);
    });
  });

  it('shared borders are simplified identically on both sides (no overlaps between neighbours)', () => {
    // Every vertex of a low-poly ring that lies on a source border shared with another province is also a vertex of
    // that neighbour's low-poly rings.
    const sourceOwners = new Map<string, Set<number>>();
    parsed.shapes.forEach((s, i) =>
      s.polygons.forEach((poly) =>
        poly.forEach((ring) =>
          ring.forEach((p) => {
            const k = `${p[0]},${p[1]}`;
            if (!sourceOwners.has(k)) sourceOwners.set(k, new Set());
            sourceOwners.get(k)!.add(i);
          }),
        ),
      ),
    );
    const lowVertices = low.map((s) => new Set(s.polygons.flatMap((poly) => poly.flatMap((r) => r.map((p) => `${p[0]},${p[1]}`)))));
    let checked = 0;
    low.forEach((s, i) => {
      for (const k of lowVertices[i]) {
        const owners = sourceOwners.get(k);
        if (!owners || owners.size < 2) continue;
        for (const j of owners) {
          if (j === i) continue;
          // The neighbour may have dropped the islet that holds the vertex; only check kept polygons.
          checked += 1;
          expect(lowVertices[j].has(k) || !parsed.shapes[j].polygons.some((poly) => poly[0].some((p) => `${p[0]},${p[1]}` === k && Math.abs(ringArea(poly[0])) >= 0.006)), `${s.name} / ${low[j].name}`).toBe(true);
        }
      }
    });
    expect(checked).toBeGreaterThan(100);
  });
});
