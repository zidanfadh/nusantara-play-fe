/**
 * The low-poly "paper" map (Phase 28), pure part: no three.js, so the 2D tier, the bumper and the tests can use it.
 *
 * - `lowPolyShapes`: the province shapes simplified to a low-poly outline. Borders shared by two provinces are
 *   simplified ONCE (same vertices on both sides), so neighbouring slabs never overlap or leave gaps. Tiny islets are
 *   dropped, but every province keeps its largest polygon (every province stays visible and pickable).
 * - Seeded hashing (`hash32`, `rand01`): every "random" choice of the map (patch colours, height noise, mountain
 *   jitter) is a pure function of the data, so the map looks the same on every visit and in every browser.
 * - `patchVariant`: which green of the palette a top facet takes (a jittered-grid Voronoi patchwork, like the
 *   reference's large patches of different greens).
 */
import { ringArea, type Bounds, type Point, type Polygon, type ProvinceShape } from './geo';

export interface LowPolyOptions {
  /** Douglas-Peucker tolerance in map units (degrees). */
  tolerance: number;
  /** Polygons smaller than this (deg²) are dropped, except the largest polygon of each province. */
  minArea: number;
}

export const LOW_POLY: LowPolyOptions = { tolerance: 0.035, minArea: 0.006 };

/** FNV-1a over the parts' text: a stable 32-bit hash. */
export function hash32(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Final avalanche (murmur3 fmix32) so nearby inputs give unrelated outputs.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Stable number in [0, 1) for the given parts. */
export function rand01(...parts: readonly (string | number)[]): number {
  return hash32(...parts) / 4294967296;
}

const key = (p: Point) => `${p[0]},${p[1]}`;

function perpendicular(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

/** Douglas-Peucker on an open polyline; keeps both ends. Iterative (no recursion depth limit). */
export function simplifyPolyline(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= 2) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxD = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicular(points[i], points[first], points[last]);
      if (d > maxD) {
        maxD = d;
        index = i;
      }
    }
    if (index >= 0 && maxD > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/**
 * Simplifies one closed ring. `owners(p)` says which provinces use a vertex; a vertex where that set changes is an
 * anchor that is always kept, and each run between anchors is simplified in a canonical direction, so a border
 * shared by two rings gives the same vertices in both.
 */
function simplifyRing(ring: readonly Point[], tolerance: number, owners: (p: Point) => string): Point[] {
  const n = ring.length;
  const anchors: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = owners(ring[(i - 1 + n) % n]);
    const here = owners(ring[i]);
    const next = owners(ring[(i + 1) % n]);
    if (here !== prev || here !== next) anchors.push(i);
  }
  if (anchors.length < 2) {
    // A lone island: split at the vertex with the smallest key and at the vertex farthest from it.
    let a = 0;
    for (let i = 1; i < n; i += 1) if (key(ring[i]) < key(ring[a])) a = i;
    let b = a;
    let far = -1;
    for (let i = 0; i < n; i += 1) {
      const d = Math.hypot(ring[i][0] - ring[a][0], ring[i][1] - ring[a][1]);
      if (d > far) {
        far = d;
        b = i;
      }
    }
    anchors.length = 0;
    anchors.push(...[a, b].sort((x, y) => x - y));
  }
  const out: Point[] = [];
  for (let k = 0; k < anchors.length; k += 1) {
    const from = anchors[k];
    const to = anchors[(k + 1) % anchors.length];
    const run: Point[] = [];
    for (let i = from; ; i = (i + 1) % n) {
      run.push(ring[i]);
      if (i === to && run.length > 1) break;
    }
    // Canonical direction: the same run seen from the neighbour is simplified identically.
    const forward = key(run[0]) <= key(run[run.length - 1]);
    const simple = simplifyPolyline(forward ? run : [...run].reverse(), tolerance);
    if (!forward) simple.reverse();
    simple.pop(); // the next run starts with this anchor
    out.push(...simple);
  }
  return out;
}

function boundsOf(polygons: readonly Polygon[]): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const poly of polygons)
    for (const [x, y] of poly[0]) {
      b.minX = Math.min(b.minX, x);
      b.minY = Math.min(b.minY, y);
      b.maxX = Math.max(b.maxX, x);
      b.maxY = Math.max(b.maxY, y);
    }
  return b;
}

/** A triangle of the ring's three most distant vertices, for a polygon that simplification collapsed. */
function fallbackTriangle(ring: readonly Point[]): Point[] {
  const a = ring[0];
  let b = ring[0];
  for (const p of ring) if (Math.hypot(p[0] - a[0], p[1] - a[1]) > Math.hypot(b[0] - a[0], b[1] - a[1])) b = p;
  let c = ring[0];
  let best = -1;
  for (const p of ring) {
    const d = perpendicular(p, a, b);
    if (d > best) {
      best = d;
      c = p;
    }
  }
  return [a, b, c];
}

/** Low-poly copies of the shapes (same order, same codes, names and anchors). */
export function lowPolyShapes(shapes: readonly ProvinceShape[], options: LowPolyOptions = LOW_POLY): ProvinceShape[] {
  const ownersOf = new Map<string, Set<number>>();
  shapes.forEach((shape, i) => {
    for (const poly of shape.polygons)
      for (const ring of poly)
        for (const p of ring) {
          const k = key(p);
          let set = ownersOf.get(k);
          if (!set) ownersOf.set(k, (set = new Set()));
          set.add(i);
        }
  });
  const ownerKey = new Map<string, string>();
  for (const [k, set] of ownersOf) ownerKey.set(k, [...set].sort((a, b) => a - b).join(','));
  const owners = (p: Point) => ownerKey.get(key(p)) ?? '';

  return shapes.map((shape) => {
    let largest = 0;
    shape.polygons.forEach((poly, i) => {
      if (Math.abs(ringArea(poly[0])) > Math.abs(ringArea(shape.polygons[largest][0]))) largest = i;
    });
    const polygons: Polygon[] = [];
    shape.polygons.forEach((poly, i) => {
      const area = Math.abs(ringArea(poly[0]));
      if (i !== largest && area < options.minArea) return;
      const rings: Point[][] = [];
      poly.forEach((ring, r) => {
        let simple = simplifyRing(ring, options.tolerance, owners);
        if (simple.length < 3 || Math.abs(ringArea(simple)) < 1e-9) {
          if (r > 0) return; // a collapsed hole is simply dropped
          simple = fallbackTriangle(ring);
        }
        rings.push(simple);
      });
      if (rings.length > 0) polygons.push(rings);
    });
    return { ...shape, polygons, bbox: boundsOf(polygons) };
  });
}

/** Total vertex count of the shapes (for reports and tests). */
export function vertexCount(shapes: readonly ProvinceShape[]): number {
  let n = 0;
  for (const s of shapes) for (const poly of s.polygons) for (const ring of poly) n += ring.length;
  return n;
}

/** Size of a colour patch on the top faces (map units). */
export const PATCH_SIZE = 1.15;

/**
 * Which facet colour (0 .. variants-1) a top facet at map point (x, y) takes: the nearest site of a jittered grid
 * (cell PATCH_SIZE, one site per cell, seeded), so the tops show large patches of a few greens.
 */
export function patchVariant(x: number, y: number, variants: number): number {
  const cx = Math.floor(x / PATCH_SIZE);
  const cy = Math.floor(y / PATCH_SIZE);
  let best = Infinity;
  let pick = 0;
  for (let dx = -1; dx <= 1; dx += 1)
    for (let dy = -1; dy <= 1; dy += 1) {
      const gx = cx + dx;
      const gy = cy + dy;
      const sx = (gx + rand01('px', gx, gy)) * PATCH_SIZE;
      const sy = (gy + rand01('py', gx, gy)) * PATCH_SIZE;
      const d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < best) {
        best = d;
        pick = hash32('pv', gx, gy) % variants;
      }
    }
  return pick;
}

/** Small stable height offset of a top vertex (map units), the same for a vertex shared by two provinces. */
export function heightNoise(x: number, y: number, amplitude: number): number {
  return rand01('h', Math.round(x * 1e4), Math.round(y * 1e4)) * amplitude;
}
