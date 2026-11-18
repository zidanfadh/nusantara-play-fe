/**
 * Procedural geometry of a province scene (Phase 11): ground, plaza, paths, river banks, raised houses
 * ("terinspirasi rumah limas") and the PROT stands. Everything static and opaque is merged into ONE
 * non-indexed geometry with vertex colours (one draw call); the water is a second geometry.
 *
 * Only imported by components/jelajah/three/* (three.js isolation, see tests/jelajah/three-isolation.test.ts).
 */
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, Matrix4, PlaneGeometry, Vector3 } from 'three';
import { HOUSE_STAIRS_DEPTH, STAND_SIZE } from '@/lib/jelajah/engine/collision';
import type { HouseDef, SceneDefinition, StandDef } from '@/lib/jelajah/scenes/types';

/** Water surface height (ground = 0). */
export const WATER_Y = -0.22;

class Builder {
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

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function placement(x: number, z: number, rotation: number, y = 0): Matrix4 {
  return new Matrix4().makeRotationY(rotation).setPosition(x, y, z);
}

/** Flat horizontal plane (local XZ) of size w × d centred at (x, y, z). */
function flat(b: Builder, x: number, y: number, z: number, w: number, d: number, rotation: number, color: Color) {
  const m = placement(x, z, rotation, y).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
  b.addGeometry(new PlaneGeometry(w, d), m, color);
}

function addGround(b: Builder, scene: SceneDefinition) {
  const c = scene.colors;
  const { width, depth } = scene.ground;
  const { north, south, bank } = scene.river;
  const halfW = width / 2;
  const halfD = depth / 2;
  // South (village) side and the far bank north of the river.
  flat(b, 0, 0, (south + halfD) / 2, width, halfD - south, 0, new Color(c.grass));
  flat(b, 0, 0, (north - halfD) / 2, width, north + halfD, 0, new Color(c.farGrass));
  // Sandy banks on both sides of the river.
  flat(b, 0, 0.012, south + bank / 2, width, bank, 0, new Color(c.bank));
  flat(b, 0, 0.012, north - bank / 2, width, bank, 0, new Color(c.bank));
  // Bank walls down to below the water, so no gap shows between ground and water.
  const wall = new Color(c.bank).multiplyScalar(0.8);
  const id = new Matrix4();
  b.quad(id, v(-halfW, 0, south), v(halfW, 0, south), v(halfW, -0.6, south), v(-halfW, -0.6, south), v(0, -0.3, south + 1), wall);
  b.quad(id, v(-halfW, 0, north), v(halfW, 0, north), v(halfW, -0.6, north), v(-halfW, -0.6, north), v(0, -0.3, north - 1), wall);
  // Plaza and paths (slightly raised to avoid z-fighting).
  const plaza = new Matrix4()
    .makeTranslation(scene.plaza.x, 0.03, scene.plaza.z)
    .multiply(new Matrix4().makeRotationX(-Math.PI / 2));
  b.addGeometry(new CircleGeometry(scene.plaza.radius + 0.6, 40), plaza.clone().setPosition(scene.plaza.x, 0.02, scene.plaza.z), new Color(c.path));
  b.addGeometry(new CircleGeometry(scene.plaza.radius, 40), plaza, new Color(c.plaza));
  for (const p of scene.paths) {
    const dx = p.to[0] - p.from[0];
    const dz = p.to[1] - p.from[1];
    const length = Math.hypot(dx, dz);
    flat(b, (p.from[0] + p.to[0]) / 2, 0.016, (p.from[1] + p.to[1]) / 2, p.width, length, Math.atan2(dx, dz), new Color(c.path));
  }
}

function addHouse(b: Builder, h: HouseDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(h.x, h.z, h.rotation);
  const post = new Color(c.housePost);
  const floor = new Color(c.houseFloor);
  const wall = new Color(c.houseWall);
  const roof = new Color(c.houseRoof);
  const trim = new Color(c.houseTrim);
  const dark = new Color(c.housePost).multiplyScalar(0.55);
  const { width: w, depth: d, floorHeight: fh, wallHeight: wh, roofHeight: rh } = h;

  // Stilts.
  const cols = 4;
  const rows = 3;
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const x = -w / 2 + 0.2 + (i * (w - 0.4)) / (cols - 1);
      const z = -d / 2 + 0.2 + (j * (d - 0.4)) / (rows - 1);
      b.box(m, 0.26, fh, 0.26, x, fh / 2, z, post);
    }
  }
  // Raised floor with a small veranda edge, walls, door, windows.
  b.box(m, w + 0.5, 0.24, d + 0.9, 0, fh, 0.2, floor);
  b.box(m, w, wh, d, 0, fh + wh / 2, 0, wall);
  b.box(m, w + 0.08, 0.14, d + 0.08, 0, fh + 0.12, 0, post); // skirting
  b.box(m, 0.95, 1.75, 0.06, 0, fh + 0.12 + 0.875, d / 2 + 0.02, dark); // door
  for (const x of [-w / 2 + 1.1, w / 2 - 1.1]) b.box(m, 0.85, 0.7, 0.06, x, fh + 1.35, d / 2 + 0.02, dark);
  for (const z of [-d / 4, d / 4]) {
    b.box(m, 0.06, 0.7, 0.8, w / 2 + 0.02, fh + 1.35, z, dark);
    b.box(m, 0.06, 0.7, 0.8, -w / 2 - 0.02, fh + 1.35, z, dark);
  }
  // Stairs up to the door (front = local +z).
  const steps = 6;
  for (let s = 0; s < steps; s += 1) {
    const top = (fh * (steps - s)) / steps;
    const z = d / 2 + 0.65 + (s * HOUSE_STAIRS_DEPTH) / steps;
    b.box(m, 1.3, 0.12, HOUSE_STAIRS_DEPTH / steps + 0.02, 0, top - 0.06, z, floor);
  }
  b.box(m, 0.12, fh, HOUSE_STAIRS_DEPTH, 0.68, fh / 2, d / 2 + 0.65 + HOUSE_STAIRS_DEPTH / 2 - 0.1, post);
  b.box(m, 0.12, fh, HOUSE_STAIRS_DEPTH, -0.68, fh / 2, d / 2 + 0.65 + HOUSE_STAIRS_DEPTH / 2 - 0.1, post);

  // Steep hip roof with a short ridge, plus a flatter skirt below it (two tiers).
  const y0 = fh + wh;
  const skirtW = w + 1.5;
  const skirtD = d + 1.5;
  const midW = w + 0.3;
  const midD = d + 0.3;
  const skirtTop = y0 + 0.45;
  const inside = v(0, y0, 0);
  const sw = skirtW / 2;
  const sd = skirtD / 2;
  const mw = midW / 2;
  const md = midD / 2;
  b.quad(m, v(-sw, y0 - 0.15, sd), v(sw, y0 - 0.15, sd), v(mw, skirtTop, md), v(-mw, skirtTop, md), inside, roof);
  b.quad(m, v(-sw, y0 - 0.15, -sd), v(sw, y0 - 0.15, -sd), v(mw, skirtTop, -md), v(-mw, skirtTop, -md), inside, roof);
  b.quad(m, v(sw, y0 - 0.15, -sd), v(sw, y0 - 0.15, sd), v(mw, skirtTop, md), v(mw, skirtTop, -md), inside, roof);
  b.quad(m, v(-sw, y0 - 0.15, -sd), v(-sw, y0 - 0.15, sd), v(-mw, skirtTop, md), v(-mw, skirtTop, -md), inside, roof);
  const ridge = Math.max(0.2, (midW - midD) / 2);
  const top = y0 + rh;
  const upperInside = v(0, skirtTop, 0);
  const upper = new Color(c.houseRoof).multiplyScalar(0.92);
  b.quad(m, v(-mw, skirtTop, md), v(mw, skirtTop, md), v(ridge, top, 0), v(-ridge, top, 0), upperInside, upper);
  b.quad(m, v(-mw, skirtTop, -md), v(mw, skirtTop, -md), v(ridge, top, 0), v(-ridge, top, 0), upperInside, upper);
  b.tri(m, v(mw, skirtTop, md), v(mw, skirtTop, -md), v(ridge, top, 0), upperInside, roof);
  b.tri(m, v(-mw, skirtTop, md), v(-mw, skirtTop, -md), v(-ridge, top, 0), upperInside, roof);
  // Ridge trim and the two ridge ends.
  b.box(m, ridge * 2 + 0.3, 0.14, 0.14, 0, top + 0.02, 0, trim);
  for (const x of [-ridge - 0.15, ridge + 0.15]) b.box(m, 0.12, 0.55, 0.12, x, top + 0.25, 0, trim);
  // Thin trim along the skirt's top edge (front and back).
  b.box(m, midW, 0.08, 0.08, 0, skirtTop, md, trim);
  b.box(m, midW, 0.08, 0.08, 0, skirtTop, -md, trim);
}

/** Stand roof height (top of the ridge) in metres; the sign floats above it. */
export const STAND_ROOF_TOP = 3.05;

function addStand(b: Builder, s: StandDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(s.x, s.z, s.rotation);
  const post = new Color(c.standPost);
  const counter = new Color(c.standCounter);
  const roof = new Color(c.standRoof);
  const W = STAND_SIZE.width;
  const D = STAND_SIZE.depth;
  b.box(m, W, 0.22, D, 0, 0.11, 0, post);
  for (const x of [-W / 2 + 0.14, W / 2 - 0.14]) {
    for (const z of [-D / 2 + 0.14, D / 2 - 0.14]) b.box(m, 0.16, 2.35, 0.16, x, 0.22 + 1.175, z, post);
  }
  // Counter at the front, a back panel, and a low shelf.
  b.box(m, W - 0.3, 0.12, 0.6, 0, 1.1, D / 2 - 0.35, counter);
  b.box(m, W - 0.4, 0.86, 0.5, 0, 0.65, D / 2 - 0.35, new Color(c.standCounter).multiplyScalar(0.82));
  b.box(m, W - 0.3, 1.35, 0.06, 0, 1.0, -D / 2 + 0.14, new Color(c.standPost).multiplyScalar(1.15));
  // Gable roof along the stand's width.
  const eaveY = 2.5;
  const ow = W / 2 + 0.3;
  const od = D / 2 + 0.45;
  const inside = v(0, eaveY - 0.5, 0);
  b.quad(m, v(-ow, eaveY, od), v(ow, eaveY, od), v(ow, STAND_ROOF_TOP, 0), v(-ow, STAND_ROOF_TOP, 0), inside, roof);
  b.quad(m, v(-ow, eaveY, -od), v(ow, eaveY, -od), v(ow, STAND_ROOF_TOP, 0), v(-ow, STAND_ROOF_TOP, 0), inside, roof);
  const gable = new Color(c.standPost);
  b.tri(m, v(ow - 0.25, eaveY, od - 0.3), v(ow - 0.25, eaveY, -od + 0.3), v(ow - 0.25, STAND_ROOF_TOP - 0.1, 0), inside, gable);
  b.tri(m, v(-ow + 0.25, eaveY, od - 0.3), v(-ow + 0.25, eaveY, -od + 0.3), v(-ow + 0.25, STAND_ROOF_TOP - 0.1, 0), inside, gable);
}

/** Ground + plaza + paths + banks + houses + stands: one geometry with vertex colours. */
export function buildVillageGeometry(scene: SceneDefinition): BufferGeometry {
  const b = new Builder();
  addGround(b, scene);
  for (const h of scene.houses) addHouse(b, h, scene);
  for (const s of scene.stands) addStand(b, s, scene);
  return b.build();
}

/** The river surface plus a few lighter streaks (vertex colours, one geometry). */
export function buildWaterGeometry(scene: SceneDefinition, streaks: boolean): BufferGeometry {
  const b = new Builder();
  const { north, south } = scene.river;
  const width = scene.ground.width;
  const deep = new Color(scene.colors.waterDeep);
  const shallow = new Color(scene.colors.water);
  // Three bands: shallow near the banks, deeper in the middle.
  const band = (south - north) / 3;
  flat(b, 0, WATER_Y, north + band / 2, width, band, 0, shallow);
  flat(b, 0, WATER_Y, north + band * 1.5, width, band, 0, deep);
  flat(b, 0, WATER_Y, south - band / 2, width, band, 0, shallow);
  if (streaks) {
    const light = new Color(scene.colors.water).lerp(new Color('#ffffff'), 0.35);
    for (let i = 0; i < 12; i += 1) {
      const x = -26 + ((i * 37) % 52);
      const z = north + 1 + ((i * 2.7) % (south - north - 2));
      flat(b, x, WATER_Y + 0.01, z, 1.6 + (i % 3), 0.08, 0, light);
    }
  }
  return b.build();
}
