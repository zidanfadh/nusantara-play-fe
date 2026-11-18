import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hitTest, parseProvinceGeo, project, ringArea, shapesBounds, svgPath } from '@/lib/jelajah/geo';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';
import { buildMapGeometry } from '@/lib/jelajah/three/map-geometry';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));
const geoJson = JSON.parse(readFileSync(geoPath, 'utf8'));

const square = (x0: number, y0: number, size: number, name: string) => ({
  type: 'Feature',
  properties: { name },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [x0, y0],
        [x0 + size, y0],
        [x0 + size, y0 + size],
        [x0, y0 + size],
        [x0, y0],
      ],
    ],
  },
});

describe('geo parsing', () => {
  it('projects around the map centre and drops closing points', () => {
    expect(project(118, -2.5)).toEqual([0, 0]);
    const { shapes } = parseProvinceGeo({ features: [square(118, -2.5, 1, 'Bali')] }, [{ kode: '51', nama: 'Bali' }]);
    expect(shapes[0].kode).toBe('51');
    expect(shapes[0].polygons[0][0]).toHaveLength(4);
    expect(shapes[0].anchor[0]).toBeCloseTo(0.5);
    expect(shapes[0].anchor[1]).toBeCloseTo(0.5);
  });

  it('ignores malformed input without throwing', () => {
    expect(parseProvinceGeo(null, KNOWN_PROVINCES).shapes).toEqual([]);
    expect(parseProvinceGeo({ features: [{}, { properties: { name: 'X' } }] }, KNOWN_PROVINCES).shapes).toEqual([]);
  });

  it('keeps unmatched shapes with kode null', () => {
    const { shapes, unmatchedShapes } = parseProvinceGeo({ features: [square(0, 0, 1, 'Atlantis')] }, KNOWN_PROVINCES);
    expect(shapes[0].kode).toBeNull();
    expect(unmatchedShapes).toEqual(['Atlantis']);
  });
});

describe('the committed Indonesia map', () => {
  const { shapes } = parseProvinceGeo(geoJson, KNOWN_PROVINCES);

  it('covers Indonesia', () => {
    const b = shapesBounds(shapes);
    expect(b.minX + 118).toBeLessThan(96);
    expect(b.maxX + 118).toBeGreaterThan(140);
    expect(b.minY - 2.5).toBeLessThan(-10);
    expect(b.maxY - 2.5).toBeGreaterThan(5);
  });

  it.each([
    [104.76, -2.99, '16'], // Palembang → Sumatera Selatan
    [106.85, -6.2, '31'], // Jakarta
    [115.2, -8.65, '51'], // Denpasar
    [119.42, -5.14, '73'], // Makassar
    [110.0, -5.0, null], // Java Sea
  ])('hitTest(%f, %f) → %s', (lon, lat, kode) => {
    const index = hitTest(shapes, project(lon, lat));
    expect(index >= 0 ? shapes[index].kode : null).toBe(kode);
  });

  it('stays within the triangle budget when extruded (merged into one geometry)', () => {
    const geometry = buildMapGeometry(shapes, shapes.map(() => 0.3));
    expect(geometry.triangles).toBeLessThan(100_000);
    expect(geometry.ranges).toHaveLength(shapes.length);
    const last = geometry.ranges[geometry.ranges.length - 1];
    expect(last.start + last.count).toBe(geometry.surface.getAttribute('position').count);
  });
});

describe('buildMapGeometry', () => {
  it('builds an upward top cap and outward walls for a unit square', () => {
    const { shapes } = parseProvinceGeo({ features: [square(118, -2.5, 1, 'Bali')] }, KNOWN_PROVINCES);
    const g = buildMapGeometry(shapes, [0.5]);
    // 2 top triangles + 4 walls × 2 triangles, no bottom cap.
    expect(g.triangles).toBe(10);
    const normals = g.surface.getAttribute('normal');
    const positions = g.surface.getAttribute('position');
    let upward = 0;
    for (let v = 0; v < positions.count; v += 3) {
      const ny = normals.getY(v);
      const allTop = [0, 1, 2].every((k) => positions.getY(v + k) === 0.5);
      if (allTop) {
        expect(ny).toBeCloseTo(1);
        upward += 1;
      } else {
        // Wall normals point away from the square's centre (0.5, -0.5 in world x/z).
        const cx = (positions.getX(v) + positions.getX(v + 1) + positions.getX(v + 2)) / 3;
        const cz = (positions.getZ(v) + positions.getZ(v + 1) + positions.getZ(v + 2)) / 3;
        expect(normals.getX(v) * (cx - 0.5) + normals.getZ(v) * (cz + 0.5)).toBeGreaterThan(0);
      }
    }
    expect(upward).toBe(2);
  });

  it('ringArea is positive for counter-clockwise rings', () => {
    expect(ringArea([[0, 0], [1, 0], [1, 1], [0, 1]])).toBeGreaterThan(0);
    expect(ringArea([[0, 0], [0, 1], [1, 1], [1, 0]])).toBeLessThan(0);
  });

  it('svgPath flips y so north is up', () => {
    const { shapes } = parseProvinceGeo({ features: [square(118, -2.5, 1, 'Bali')] }, KNOWN_PROVINCES);
    expect(svgPath(shapes[0])).toBe('M0.000 0.000L1.000 0.000L1.000 -1.000L0.000 -1.000Z');
  });
});
