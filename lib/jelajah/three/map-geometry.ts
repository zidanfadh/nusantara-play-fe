/**
 * Builds ONE merged, non-indexed BufferGeometry for all provinces (top caps + side walls, no bottom)
 * with per-vertex colours, plus one LineSegments geometry for the borders. Two draw calls in total,
 * whatever the number of provinces. Imported only by the 3D view (three.js).
 *
 * World axes: x = map x (east), z = -map y (south), y = up.
 */
import { BufferAttribute, BufferGeometry, Color, ShapeUtils, Vector2 } from 'three';
import { ringArea, type ProvinceShape, type Point } from '../geo';

export const BASE_Y = -0.05;

export interface VertexRange {
  start: number;
  count: number;
}

export interface MapGeometry {
  surface: BufferGeometry;
  outline: BufferGeometry;
  /** Vertex range of each shape in `surface` (same order as the shapes). */
  ranges: VertexRange[];
  triangles: number;
}

function oriented(ring: readonly Point[], ccw: boolean): Point[] {
  const isCcw = ringArea(ring) > 0;
  return isCcw === ccw ? [...ring] : [...ring].reverse();
}

export function buildMapGeometry(shapes: readonly ProvinceShape[], heights: readonly number[]): MapGeometry {
  const positions: number[] = [];
  const lines: number[] = [];
  const ranges: VertexRange[] = [];

  // Pushes a triangle whose normal points along `want` (flips the winding if needed).
  const tri = (a: number[], b: number[], c: number[], want: [number, number, number]) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * want[0] + ny * want[1] + nz * want[2] >= 0) positions.push(...a, ...b, ...c);
    else positions.push(...a, ...c, ...b);
  };

  shapes.forEach((shape, i) => {
    const start = positions.length / 3;
    const top = heights[i];
    for (const polygon of shape.polygons) {
      // Outer ring CCW, holes CW (map coordinates): the outward side of every edge is then its right side.
      const outer = oriented(polygon[0], true);
      const holes = polygon.slice(1).map((h) => oriented(h, false));

      const contour = outer.map(([x, y]) => new Vector2(x, y));
      const holeVecs = holes.map((h) => h.map(([x, y]) => new Vector2(x, y)));
      const all = [...outer, ...holes.flat()];
      for (const [ia, ib, ic] of ShapeUtils.triangulateShape(contour, holeVecs)) {
        const p = (k: number) => [all[k][0], top, -all[k][1]];
        tri(p(ia), p(ib), p(ic), [0, 1, 0]);
      }

      for (const ring of [outer, ...holes]) {
        for (let k = 0; k < ring.length; k += 1) {
          const [x1, y1] = ring[k];
          const [x2, y2] = ring[(k + 1) % ring.length];
          // Right side of (dx, dy) in map coords is (dy, -dx); in world coords (x, -y) → (dy, 0, dx).
          const out: [number, number, number] = [y2 - y1, 0, x2 - x1];
          const p0 = [x1, BASE_Y, -y1], q0 = [x2, BASE_Y, -y2];
          const p1 = [x1, top, -y1], q1 = [x2, top, -y2];
          tri(p0, q0, q1, out);
          tri(p0, q1, p1, out);
          lines.push(x1, top + 0.003, -y1, x2, top + 0.003, -y2);
        }
      }
    }
    ranges.push({ start, count: positions.length / 3 - start });
  });

  const surface = new BufferGeometry();
  surface.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  surface.setAttribute('color', new BufferAttribute(new Float32Array(positions.length), 3));
  surface.computeVertexNormals(); // non-indexed: flat (per-face) normals, the low-poly look
  surface.computeBoundingSphere();

  const outline = new BufferGeometry();
  outline.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));

  return { surface, outline, ranges, triangles: positions.length / 9 };
}

const scratch = new Color();

/** Sets the colour of one shape's vertices and marks only that range for upload. */
export function paintRange(geometry: BufferGeometry, range: VertexRange, hex: string) {
  const attr = geometry.getAttribute('color') as BufferAttribute;
  scratch.set(hex);
  const arr = attr.array as Float32Array;
  for (let v = range.start; v < range.start + range.count; v += 1) {
    arr[v * 3] = scratch.r;
    arr[v * 3 + 1] = scratch.g;
    arr[v * 3 + 2] = scratch.b;
  }
  attr.addUpdateRange(range.start * 3, range.count * 3);
  attr.needsUpdate = true;
}
