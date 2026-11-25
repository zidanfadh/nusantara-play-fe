/**
 * Province geometry shared by the 2D (SVG) and 3D views. Must not import three.js: the 2D tier
 * relies on that to stay three-free.
 *
 * Map coordinates: equirectangular projection centred on Indonesia, 1 unit = 1 degree, x grows
 * east, y grows north. (Indonesia straddles the equator, so the distortion is negligible.)
 */
import { matchShapesToProvinces, type ProvinceRef } from './provinces';

export const GEO_URL = '/jelajah/geo/indonesia-provinces.json';
export const GEO_ATTRIBUTION =
  'Batas provinsi: geoBoundaries (gbHumanitarian IDN ADM1, OCHA ROAP/HDX, 2019), CC BY 3.0 IGO, disederhanakan.';

export const MAP_CENTER = { lon: 118, lat: -2.5 } as const;

export type Point = readonly [number, number];
/** Outer ring first, holes after it. Rings are open (the closing point is dropped). */
export type Polygon = Point[][];

export interface ProvinceShape {
  name: string;
  /** Province code, or null when the name matched no province. */
  kode: string | null;
  polygons: Polygon[];
  bbox: Bounds;
  /** Label anchor: area-weighted centroid of the largest polygon. */
  anchor: Point;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function project(lon: number, lat: number): Point {
  return [lon - MAP_CENTER.lon, lat - MAP_CENTER.lat];
}

function emptyBounds(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function extend(b: Bounds, [x, y]: Point) {
  if (x < b.minX) b.minX = x;
  if (y < b.minY) b.minY = y;
  if (x > b.maxX) b.maxX = x;
  if (y > b.maxY) b.maxY = y;
}

/** Signed area (shoelace); positive for counter-clockwise rings. */
export function ringArea(ring: readonly Point[]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return area / 2;
}

function ringCentroid(ring: readonly Point[]): Point {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  if (Math.abs(a) < 1e-12) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

function toRing(coords: unknown): Point[] {
  if (!Array.isArray(coords)) return [];
  const ring: Point[] = [];
  for (const c of coords) {
    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
      ring.push(project(c[0], c[1]));
    }
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && first[0] === last[0] && first[1] === last[1]) ring.pop();
  return ring.length >= 3 ? ring : [];
}

interface GeoJsonFeature {
  properties?: { name?: unknown };
  geometry?: { type?: unknown; coordinates?: unknown };
}

/** Parses the committed GeoJSON and assigns province codes by name. */
export function parseProvinceGeo(
  json: unknown,
  provinces: readonly ProvinceRef[],
): { shapes: ProvinceShape[]; unmatchedShapes: string[]; provincesWithoutShape: ProvinceRef[] } {
  const features: GeoJsonFeature[] =
    json && typeof json === 'object' && Array.isArray((json as { features?: unknown }).features)
      ? (json as { features: GeoJsonFeature[] }).features
      : [];

  const raw: { name: string; polygons: Polygon[] }[] = [];
  for (const f of features) {
    const name = typeof f.properties?.name === 'string' ? f.properties.name : '';
    const g = f.geometry;
    if (!name || !g) continue;
    const polysCoords =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? (g.coordinates as unknown[]) : [];
    const polygons: Polygon[] = [];
    for (const pc of Array.isArray(polysCoords) ? polysCoords : []) {
      if (!Array.isArray(pc)) continue;
      const rings = pc.map(toRing).filter((r) => r.length > 0);
      if (rings.length > 0) polygons.push(rings);
    }
    if (polygons.length > 0) raw.push({ name, polygons });
  }

  const match = matchShapesToProvinces(
    raw.map((r) => r.name),
    provinces,
  );

  const shapes = raw.map(({ name, polygons }) => {
    const bbox = emptyBounds();
    let largest = polygons[0][0];
    let largestArea = 0;
    for (const poly of polygons) {
      for (const p of poly[0]) extend(bbox, p);
      const area = Math.abs(ringArea(poly[0]));
      if (area > largestArea) {
        largestArea = area;
        largest = poly[0];
      }
    }
    return { name, kode: match.codeByShape.get(name) ?? null, polygons, bbox, anchor: ringCentroid(largest) };
  });

  return { shapes, unmatchedShapes: match.unmatchedShapes, provincesWithoutShape: match.provincesWithoutShape };
}

export function shapesBounds(shapes: readonly ProvinceShape[]): Bounds {
  const b = emptyBounds();
  for (const s of shapes) {
    extend(b, [s.bbox.minX, s.bbox.minY]);
    extend(b, [s.bbox.maxX, s.bbox.maxY]);
  }
  return b;
}

function pointInRing([x, y]: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(p: Point, polygon: Polygon): boolean {
  if (!pointInRing(p, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h += 1) if (pointInRing(p, polygon[h])) return false;
  return true;
}

/** Index of the shape under a map point, or -1. Bounding boxes are checked first. */
export function hitTest(shapes: readonly ProvinceShape[], p: Point): number {
  for (let i = 0; i < shapes.length; i += 1) {
    const { bbox } = shapes[i];
    if (p[0] < bbox.minX || p[0] > bbox.maxX || p[1] < bbox.minY || p[1] > bbox.maxY) continue;
    if (shapes[i].polygons.some((poly) => pointInPolygon(p, poly))) return i;
  }
  return -1;
}

/** SVG path data (y flipped, so north is up), rounded to 3 decimals. */
export function svgPath(shape: ProvinceShape): string {
  const parts: string[] = [];
  for (const poly of shape.polygons) {
    for (const ring of poly) {
      parts.push(
        `M${ring.map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join('L')}Z`,
      );
    }
  }
  return parts.join('');
}
