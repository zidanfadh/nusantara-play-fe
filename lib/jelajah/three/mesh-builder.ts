/**
 * The vertex-coloured mesh builder of the province scenes (Phase 11; moved out of village-geometry.ts unchanged in
 * Phase 22 so house, pavilion and landmark geometry can share it). Everything is appended to ONE non-indexed
 * geometry (position, normal, color), which becomes one draw call.
 *
 * Only imported by lib/jelajah/three/* and components/jelajah/three/* (three.js isolation).
 */
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Matrix4, PlaneGeometry, Vector3 } from 'three';

export class Builder {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  private tmp = new Vector3();

  /** Appends a (non-indexed or indexed) geometry transformed by `matrix`, in one colour. */
  addGeometry(geometry: BufferGeometry, matrix: Matrix4, color: Color) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.applyMatrix4(matrix);
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i += 1) {
      this.positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      this.colors.push(color.r, color.g, color.b);
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
  }

  box(matrix: Matrix4, w: number, h: number, d: number, cx: number, cy: number, cz: number, color: Color) {
    const local = new Matrix4().makeTranslation(cx, cy, cz);
    this.addGeometry(new BoxGeometry(w, h, d), matrix.clone().multiply(local), color);
  }

  /** One triangle in local space, wound so that its normal points away from `inside`. */
  tri(matrix: Matrix4, a: Vector3, b: Vector3, c: Vector3, inside: Vector3, color: Color) {
    const pa = a.clone().applyMatrix4(matrix);
    let pb = b.clone().applyMatrix4(matrix);
    let pc = c.clone().applyMatrix4(matrix);
    const inner = inside.clone().applyMatrix4(matrix);
    let n = this.tmp.copy(pb).sub(pa).cross(pc.clone().sub(pa)).normalize();
    const centroid = pa.clone().add(pb).add(pc).divideScalar(3);
    if (n.dot(centroid.sub(inner)) < 0) {
      [pb, pc] = [pc, pb];
      n = this.tmp.copy(pb).sub(pa).cross(pc.clone().sub(pa)).normalize();
    }
    for (const p of [pa, pb, pc]) {
      this.positions.push(p.x, p.y, p.z);
      this.normals.push(n.x, n.y, n.z);
      this.colors.push(color.r, color.g, color.b);
    }
  }

  quad(matrix: Matrix4, a: Vector3, b: Vector3, c: Vector3, d: Vector3, inside: Vector3, color: Color) {
    this.tri(matrix, a, b, c, inside, color);
    this.tri(matrix, a, c, d, inside, color);
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    g.computeBoundingSphere();
    return g;
  }
}

export const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

export function placement(x: number, z: number, rotation: number, y = 0): Matrix4 {
  return new Matrix4().makeRotationY(rotation).setPosition(x, y, z);
}

/** Flat horizontal plane (local XZ) of size w × d centred at (x, y, z). */
export function flat(b: Builder, x: number, y: number, z: number, w: number, d: number, rotation: number, color: Color) {
  const m = placement(x, z, rotation, y).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
  b.addGeometry(new PlaneGeometry(w, d), m, color);
}
