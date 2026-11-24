/**
 * Builds ONE merged, non-indexed BufferGeometry for all provinces (top caps + side walls, no bottom) with per-vertex
 * colours, plus one LineSegments geometry for the borders. Imported only by the 3D view (three.js).
 *
 * Phase 28 ("paper" map): with `PAPER_SLAB` options the outline is densified, the top is subdivided into real facets
 * with a small seeded height noise, and the lighting is BAKED into the vertex colours (per-face shade from a fixed
 * light direction; the camera never rotates), so the islands render with the cheapest material (MeshBasicMaterial).
 * Every vertex keeps its kind, palette variant and shade, so `paintShape` can recolour one province (hover, select,
 * theme) and `liftShape` can raise it, both touching only that province's vertex range.
 *
 * World axes: x = map x (east), z = -map y (south), y = up.
 */
import { BufferAttribute, BufferGeometry, Color, ShapeUtils, Vector2 } from 'three';
import { ringArea, type Point, type ProvinceShape } from '../geo';
import { heightNoise, patchVariant, rand01 } from '../paper-map';

export const BASE_Y = 0;

export interface VertexRange {
  start: number;
  count: number;
}

/** What a vertex belongs to; decides its colour in `paintShape` and whether `liftShape` moves it. */
export const KIND = { top: 0, wallBottom: 1, wallTop: 2, water: 3, rockLight: 4, rockDark: 5, crater: 6 } as const;

export interface MapGeometry {
  surface: BufferGeometry;
  outline: BufferGeometry;
  /** Vertex range of each shape in `surface` (same order as the shapes). */
  ranges: VertexRange[];
  triangles: number;
  /** Per vertex: KIND value. */
  kinds: Uint8Array;
  /** Per vertex: index into the top-facet colour variants (tops only). */
  variants: Uint8Array;
  /** Per vertex: baked light factor (1 = palette colour as is). */
  shades: Float32Array;
  /** Positions as built (lifting is relative to these). */
  basePositions: Float32Array;
}

export interface SlabOptions {
  /** Longest edge of the outline and of the top facets (map units); Infinity = plain extrusion. */
  edge: number;
  /** Height noise amplitude of the top vertices (map units). */
  noise: number;
  /** Per-facet shade jitter (± this much). */
  jitter: number;
  /** Number of top-facet colour variants (the palette's facet greens). */
  variants: number;
}

/** Plain extrusion (the Phase 10 geometry); kept as the default. */
export const PLAIN_SLAB: SlabOptions = { edge: Infinity, noise: 0, jitter: 0, variants: 1 };
/** The paper map's slabs (Phase 28). */
export const PAPER_SLAB: SlabOptions = { edge: 0.85, noise: 0.05, jitter: 0.045, variants: 4 };

/** Direction TO the light: from the north-west, high (the reference's shadows fall to the lower right). */
export const LIGHT_DIR: readonly [number, number, number] = (() => {
  const v = [-0.5, 1, -0.55];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len] as const;
})();
/** Baked lighting: shade = AMBIENT + DIFFUSE · max(0, n·L); a flat top gets exactly 1. */
export const BAKE_DIFFUSE = 0.55;
export const BAKE_AMBIENT = 1 - BAKE_DIFFUSE * LIGHT_DIR[1];

function oriented(ring: readonly Point[], ccw: boolean): Point[] {
  const isCcw = ringArea(ring) > 0;
  return isCcw === ccw ? [...ring] : [...ring].reverse();
}

/** Inserts points so that no edge of the closed ring is longer than `edge`. */
export function densifyRing(ring: readonly Point[], edge: number): Point[] {
  if (!Number.isFinite(edge)) return [...ring];
  const out: Point[] = [];
  for (let k = 0; k < ring.length; k += 1) {
    const a = ring[k];
    const b = ring[(k + 1) % ring.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (edge * 0.999)));
    for (let s = 0; s < n; s += 1) out.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
  }
  return out;
}

type Tri = [Point, Point, Point];

/**
 * Splits every triangle edge longer than `edge` at its midpoint, until none is left. The decision depends only on
 * the edge itself, so the two triangles that share an edge always split it the same way (no cracks).
 */
export function subdivide(tris: readonly Tri[], edge: number): Tri[] {
  if (!Number.isFinite(edge)) return [...tris];
  const long = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]) > edge;
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let current = [...tris];
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    const next: Tri[] = [];
    for (const t of current) {
      const flags = [long(t[0], t[1]), long(t[1], t[2]), long(t[2], t[0])];
      const count = flags.filter(Boolean).length;
      if (count === 0) {
        next.push(t);
        continue;
      }
      changed = true;
      // Rotate so the split edges come first: ab (and bc).
      let r = 0;
      if (count === 1) r = flags.indexOf(true);
      else if (count === 2) r = (flags.indexOf(false) + 1) % 3;
      const a = t[r];
      const b = t[(r + 1) % 3];
      const c = t[(r + 2) % 3];
      const mab = mid(a, b);
      if (count === 1) {
        next.push([a, mab, c], [mab, b, c]);
      } else if (count === 2) {
        const mbc = mid(b, c);
        next.push([mab, b, mbc], [a, mab, mbc], [a, mbc, c]);
      } else {
        const mbc = mid(b, c);
        const mca = mid(c, a);
        next.push([a, mab, mca], [mab, b, mbc], [mca, mbc, c], [mab, mbc, mca]);
      }
    }
    current = next;
    if (!changed) break;
  }
  return current;
}

export function buildMapGeometry(
  shapes: readonly ProvinceShape[],
  heights: readonly number[],
  options: SlabOptions = PLAIN_SLAB,
): MapGeometry {
  const positions: number[] = [];
  const kinds: number[] = [];
  const variants: number[] = [];
  const shades: number[] = [];
  const lines: number[] = [];
  const ranges: VertexRange[] = [];

  const bake = (nx: number, ny: number, nz: number) => {
    const len = Math.hypot(nx, ny, nz) || 1;
    const dot = (nx * LIGHT_DIR[0] + ny * LIGHT_DIR[1] + nz * LIGHT_DIR[2]) / len;
    return BAKE_AMBIENT + BAKE_DIFFUSE * Math.max(0, dot);
  };

  // Pushes a triangle whose normal points along `want` (flips the winding if needed), with per-vertex data.
  const tri = (
    a: number[],
    b: number[],
    c: number[],
    want: [number, number, number],
    kind: (v: number[]) => number,
    variant: number,
    shadeJitter: number,
  ) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const order = nx * want[0] + ny * want[1] + nz * want[2] >= 0 ? [a, b, c] : [a, c, b];
    if (order[1] !== b) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const shade = bake(nx, ny, nz) + shadeJitter;
    for (const v of order) {
      positions.push(v[0], v[1], v[2]);
      kinds.push(kind(v));
      variants.push(variant);
      shades.push(shade);
    }
  };

  shapes.forEach((shape, i) => {
    const start = positions.length / 3;
    const top = heights[i];
    const yAt = (x: number, y: number) => top + heightNoise(x, y, options.noise);
    for (const polygon of shape.polygons) {
      // Outer ring CCW, holes CW (map coordinates): the outward side of every edge is then its right side.
      const outer = densifyRing(oriented(polygon[0], true), options.edge);
      const holes = polygon.slice(1).map((h) => densifyRing(oriented(h, false), options.edge));

      const contour = outer.map(([x, y]) => new Vector2(x, y));
      const holeVecs = holes.map((h) => h.map(([x, y]) => new Vector2(x, y)));
      const all = [...outer, ...holes.flat()];
      const flat: Tri[] = ShapeUtils.triangulateShape(contour, holeVecs).map(
        ([ia, ib, ic]) => [all[ia], all[ib], all[ic]] as Tri,
      );
      for (const t of subdivide(flat, options.edge)) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const variant = options.variants > 1 ? patchVariant(cx, cy, options.variants) : 0;
        const jitter = options.jitter > 0 ? (rand01('j', Math.round(cx * 1e4), Math.round(cy * 1e4)) * 2 - 1) * options.jitter : 0;
        const p = (q: Point) => [q[0], yAt(q[0], q[1]), -q[1]];
        tri(p(t[0]), p(t[1]), p(t[2]), [0, 1, 0], () => KIND.top, variant, jitter);
      }

      for (const ring of [outer, ...holes]) {
        for (let k = 0; k < ring.length; k += 1) {
          const [x1, y1] = ring[k];
          const [x2, y2] = ring[(k + 1) % ring.length];
          // Right side of (dx, dy) in map coords is (dy, -dx); in world coords (x, -y) → (dy, 0, dx).
          const out: [number, number, number] = [y2 - y1, 0, x2 - x1];
          const h1 = yAt(x1, y1);
          const h2 = yAt(x2, y2);
          const p0 = [x1, BASE_Y, -y1], q0 = [x2, BASE_Y, -y2];
          const p1 = [x1, h1, -y1], q1 = [x2, h2, -y2];
          const wallKind = (v: number[]) => (v[1] === BASE_Y ? KIND.wallBottom : KIND.wallTop);
          tri(p0, q0, q1, out, wallKind, 0, 0);
          tri(p0, q1, p1, out, wallKind, 0, 0);
          lines.push(x1, h1 + 0.006, -y1, x2, h2 + 0.006, -y2);
        }
      }
    }
    ranges.push({ start, count: positions.length / 3 - start });
  });

  const position = new Float32Array(positions);
  const surface = new BufferGeometry();
  surface.setAttribute('position', new BufferAttribute(position, 3));
  surface.setAttribute('color', new BufferAttribute(new Float32Array(positions.length), 3));
  surface.computeVertexNormals(); // non-indexed: flat (per-face) normals, the low-poly look
  surface.computeBoundingSphere();

  const outline = new BufferGeometry();
  outline.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));

  return {
    surface,
    outline,
    ranges,
    triangles: positions.length / 9,
    kinds: Uint8Array.from(kinds),
    variants: Uint8Array.from(variants),
    shades: Float32Array.from(shades),
    basePositions: position.slice(),
  };
}

/** Colours (hex) of one province for `paintShape`. */
export interface ShapePaint {
  /** Top-facet colours, one per variant (state already mixed in). */
  tops: readonly string[];
  wallTop: string;
  wallBottom: string;
  water: string;
  rockLight: string;
  rockDark: string;
  crater: string;
}

const scratch = new Color();
const cache = new Map<string, Color>();
function colour(hex: string): Color {
  let c = cache.get(hex);
  if (!c) cache.set(hex, (c = new Color(hex)));
  return c;
}

/** Recolours one province's vertices (baked shade applied) and marks only that range for upload. */
export function paintShape(geometry: MapGeometry, index: number, paint: ShapePaint) {
  const range = geometry.ranges[index];
  const attr = geometry.surface.getAttribute('color') as BufferAttribute;
  const arr = attr.array as Float32Array;
  const byKind = [null, paint.wallBottom, paint.wallTop, paint.water, paint.rockLight, paint.rockDark, paint.crater];
  for (let v = range.start; v < range.start + range.count; v += 1) {
    const kind = geometry.kinds[v];
    const hex = kind === KIND.top ? paint.tops[geometry.variants[v] % paint.tops.length] : byKind[kind]!;
    scratch.copy(colour(hex)).multiplyScalar(geometry.shades[v]);
    arr[v * 3] = scratch.r;
    arr[v * 3 + 1] = scratch.g;
    arr[v * 3 + 2] = scratch.b;
  }
  attr.addUpdateRange(range.start * 3, range.count * 3);
  attr.needsUpdate = true;
}

/** Raises one province by `dy` (0 = back to its built height); the wall bottoms stay on the paper. */
export function liftShape(geometry: MapGeometry, index: number, dy: number) {
  const range = geometry.ranges[index];
  const attr = geometry.surface.getAttribute('position') as BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let v = range.start; v < range.start + range.count; v += 1) {
    if (geometry.kinds[v] === KIND.wallBottom) continue;
    arr[v * 3 + 1] = geometry.basePositions[v * 3 + 1] + dy;
  }
  attr.addUpdateRange(range.start * 3, range.count * 3);
  attr.needsUpdate = true;
}
