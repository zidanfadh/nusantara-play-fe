/**
 * Procedural geometry of a province scene (Phase 11): ground, plaza, paths, river banks, raised houses
 * ("terinspirasi rumah limas"), the PROT stands and (Phase 12) the plaza centrepiece. Everything static and opaque is merged into ONE
 * non-indexed geometry with vertex colours (one draw call); the water is a second geometry.
 *
 * Only imported by components/jelajah/three/* (three.js isolation, see tests/jelajah/three-isolation.test.ts).
 */
import { BufferGeometry, CircleGeometry, Color, Matrix4, SphereGeometry } from 'three';
import { EGRANG_TRACK_HALF_WIDTH, HOUSE_STAIRS_DEPTH, JOGLO_PLINTH, OPEN_HALL_FLOOR, OPEN_HALL_STEPS, STAND_ROOF_TOP, STAND_SIZE } from '@/lib/jelajah/engine/collision';
import type { GameSoonDef, HouseDef, PavilionDef, SceneDefinition, StandDef } from '@/lib/jelajah/scenes/types';
import { GAME_SOON_BOARD } from '@/lib/jelajah/engine/game-soon';
import { Builder, flat, placement, v } from './mesh-builder';

import { WATER_Y } from './water-level';
import { addGableRoof, GABLE_STYLES } from './house-roofs';
import { addStructures } from './structures';

/** Water surface height (ground = 0). */
export { WATER_Y };

function addGround(b: Builder, scene: SceneDefinition) {
  const c = scene.colors;
  const { width, depth } = scene.ground;
  const { north, south, bank } = scene.river;
  const halfW = width / 2;
  const halfD = depth / 2;
  const waterStyle = scene.waterStyle ?? 'river';
  if (waterStyle === 'river') addRiverGround(b, c, width, halfW, halfD, north, south, bank);
  else if (waterStyle === 'sea') {
    // Phase 22: village ground south of the shore, a sand beach, and the sea up to the horizon (no far bank).
    flat(b, 0, 0, (south + halfD) / 2, width, halfD - south, 0, new Color(c.grass));
    flat(b, 0, 0.012, south + bank / 2, width, bank, 0, new Color(c.bank));
    const wall = new Color(c.bank).multiplyScalar(0.8);
    b.quad(new Matrix4(), v(-halfW, 0, south), v(halfW, 0, south), v(halfW, -0.6, south), v(-halfW, -0.6, south), v(0, -0.3, south + 1), wall);
  } else {
    // Phase 22: no water at all, one ground plane.
    flat(b, 0, 0, 0, width, depth, 0, new Color(c.grass));
  }
  addPlazaAndPaths(b, scene);
}

/** The Phase 11 ground: the village side, the far bank and both river banks (unchanged). */
function addRiverGround(
  b: Builder,
  c: SceneDefinition['colors'],
  width: number,
  halfW: number,
  halfD: number,
  north: number,
  south: number,
  bank: number,
) {
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
}

function addPlazaAndPaths(b: Builder, scene: SceneDefinition) {
  const c = scene.colors;
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
  const dark = new Color(c.housePost).multiplyScalar(0.55);
  const { width: w, depth: d, floorHeight: fh, wallHeight: wh } = h;

  // Stilts.
  const cols = 4;
  const rows = 3;
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const x = -w / 2 + 0.2 + (i * (w - 0.4)) / (cols - 1);
      const z = -d / 2 + 0.2 + (j * (d - 0.4)) / (rows - 1);
      if (h.stiltDepth) b.box(m, 0.26, fh + h.stiltDepth, 0.26, x, (fh - h.stiltDepth) / 2, z, post);
      else b.box(m, 0.26, fh, 0.26, x, fh / 2, z, post);
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
  if (h.stairs !== false) {
    const steps = 6;
    for (let s = 0; s < steps; s += 1) {
      const top = (fh * (steps - s)) / steps;
      const z = d / 2 + 0.65 + (s * HOUSE_STAIRS_DEPTH) / steps;
      b.box(m, 1.3, 0.12, HOUSE_STAIRS_DEPTH / steps + 0.02, 0, top - 0.06, z, floor);
    }
    b.box(m, 0.12, fh, HOUSE_STAIRS_DEPTH, 0.68, fh / 2, d / 2 + 0.65 + HOUSE_STAIRS_DEPTH / 2 - 0.1, post);
    b.box(m, 0.12, fh, HOUSE_STAIRS_DEPTH, -0.68, fh / 2, d / 2 + 0.65 + HOUSE_STAIRS_DEPTH / 2 - 0.1, post);
  }

  const style = h.style ?? 'limas';
  switch (style) {
    case 'limas':
      addLimasRoof(b, m, h, scene);
      break;
    default:
      addGableRoof(b, m, h, scene.colors, GABLE_STYLES[style]);
  }
}

/** The Phase 11 roof: a steep hip roof with a short ridge above a flatter skirt (unchanged). */
function addLimasRoof(b: Builder, m: Matrix4, h: HouseDef, scene: SceneDefinition) {
  const c = scene.colors;
  const roof = new Color(c.houseRoof);
  const trim = new Color(c.houseTrim);
  const { width: w, depth: d, floorHeight: fh, wallHeight: wh, roofHeight: rh } = h;
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

export { STAND_ROOF_TOP };

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

/**
 * Neutral plaza centrepiece (Phase 12): an open pavilion, a two-tier pyramid roof on four posts on a low
 * platform. Part of the merged village mesh, so it costs no extra draw call.
 */
function addPavilion(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const style = p.style ?? 'pavilion';
  switch (style) {
    case 'pavilion':
      addOpenPavilion(b, p, scene);
      break;
    case 'arena':
      addArena(b, p, scene);
      break;
    case 'meunasah':
      addOpenHall(b, p, scene);
      break;
    case 'joglo':
      addPendopo(b, p, scene);
      break;
    case 'egrang':
      addEgrangTrack(b, p, scene);
      break;
  }
}

/**
 * Phase 23, the egrang pavilion: a short packed-earth practice track (`size` long along local x) between low rails,
 * a white start line at the west end, a red-and-white finish banner on two poles at the east end, and the stilts of
 * the variant waiting at the start: two pairs of tall bamboo poles with foot rests leaning by the rail (bambu, rails
 * of bamboo), or two pairs of coconut-shell halves with their strings (batok, rope rails on wooden stakes).
 */
function addEgrangTrack(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(p.x, p.z, p.rotation);
  const L = p.size;
  const hw = EGRANG_TRACK_HALF_WIDTH;
  const batok = p.variant === 'batok';
  const bamboo = new Color('#BFC765');
  const bambooDark = new Color('#97A04A');
  const post = new Color(c.housePost);
  const at = (x: number, y: number, z: number) => m.clone().multiply(new Matrix4().makeTranslation(x, y, z));
  // Track surface and a slightly darker border.
  b.box(m, L + 0.5, 0.05, hw * 2 + 0.5, 0, 0.025, 0, new Color(c.path).multiplyScalar(0.82));
  b.box(m, L, 0.06, hw * 2 - 0.1, 0, 0.03, 0, new Color(c.path).multiplyScalar(batok ? 1.04 : 0.92));
  // Start line (west) and the chequered finish line with its banner (east).
  b.box(m, 0.14, 0.012, hw * 2 - 0.1, -L / 2 + 0.45, 0.066, 0, new Color('#F4F1E6'));
  const cell = (hw * 2 - 0.1) / 6;
  for (let i = 0; i < 6; i += 1) {
    b.box(m, 0.14, 0.012, cell, L / 2 - 0.45, 0.066, -hw + 0.05 + cell * (i + 0.5), i % 2 ? new Color('#2A2A2A') : new Color('#F4F1E6'));
  }
  for (const z of [-hw, hw]) b.box(m, 0.1, 2.0, 0.1, L / 2 - 0.45, 1.0, z, batok ? post : bamboo);
  b.box(m, 0.06, 0.2, hw * 2, L / 2 - 0.45, 1.86, 0, new Color('#D4302A'));
  b.box(m, 0.06, 0.2, hw * 2, L / 2 - 0.45, 1.66, 0, new Color('#F4F1E6'));
  // Rails: bamboo on posts (bambu) or rope on stakes (batok).
  const posts = Math.max(3, Math.round(L / 1.5));
  for (const z of [-hw, hw]) {
    for (let i = 0; i <= posts; i += 1) b.box(m, 0.08, 0.5, 0.08, -L / 2 + (L * i) / posts, 0.25, z, batok ? post : bambooDark);
    b.box(m, L, batok ? 0.03 : 0.07, batok ? 0.03 : 0.07, 0, 0.44, z, batok ? new Color('#D8C49A') : bamboo);
  }
  if (!batok) {
    // Two pairs of stilts leaning against the north rail at the start, foot rests facing the track.
    for (let k = 0; k < 4; k += 1) {
      const pole = at(-L / 2 + 0.35 + k * 0.32, 1.12, -hw - 0.3).multiply(new Matrix4().makeRotationX(0.3));
      b.box(pole, 0.07, 2.4, 0.07, 0, 0, 0, k % 2 ? bamboo : bambooDark);
      b.box(pole, 0.08, 0.05, 0.22, 0, -0.55, 0.12, new Color('#7A5A2A'));
    }
  } else {
    // Two pairs of coconut-shell halves (dome up) by the start line, with their strings standing up.
    const shell = new Color('#6A4424');
    for (let k = 0; k < 4; k += 1) {
      const x = -L / 2 + 0.35 + (k % 2) * 0.42;
      const z = (k < 2 ? -1 : 1) * (hw - 0.35);
      b.addGeometry(new SphereGeometry(0.16, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), at(x, 0.06, z), shell);
      b.box(m, 0.015, 0.55, 0.015, x, 0.5, z, new Color('#E9DDBE'));
    }
  }
}

/** The Phase 12 open pavilion (unchanged). */
function addOpenPavilion(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(p.x, p.z, p.rotation);
  const post = new Color(c.housePost);
  const floor = new Color(c.houseFloor);
  const roof = new Color(c.houseRoof);
  const upperRoof = new Color(c.houseRoof).multiplyScalar(0.9);
  const trim = new Color(c.houseTrim);
  const S = p.size;
  const platform = 0.36;
  // Low step around a raised wooden platform.
  b.box(m, S + 0.8, 0.16, S + 0.8, 0, 0.08, 0, new Color(c.plaza).multiplyScalar(0.82));
  b.box(m, S, platform, S, 0, platform / 2, 0, floor);
  // Four posts and the beams that carry the roof.
  const inset = S / 2 - 0.25;
  for (const x of [-inset, inset]) {
    for (const z of [-inset, inset]) b.box(m, 0.24, p.postHeight, 0.24, x, platform + p.postHeight / 2, z, post);
  }
  const y0 = platform + p.postHeight;
  for (const z of [-inset, inset]) b.box(m, S - 0.2, 0.18, 0.18, 0, y0, z, post);
  for (const x of [-inset, inset]) b.box(m, 0.18, 0.18, S - 0.2, x, y0, 0, post);
  // Roof: a flatter skirt, then a steeper pyramid, then a small cap.
  const square = (half: number, y: number) => [v(-half, y, -half), v(half, y, -half), v(half, y, half), v(-half, y, half)];
  const eave = square(S / 2 + 0.95, y0 - 0.05);
  const midY = y0 + p.roofHeight * 0.38;
  const mid = square(S / 2 - 0.05, midY);
  const apex = v(0, y0 + p.roofHeight, 0);
  const lowInside = v(0, y0 - 1.2, 0);
  const highInside = v(0, midY - 0.6, 0);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    b.quad(m, eave[i], eave[j], mid[j], mid[i], lowInside, roof);
    b.tri(m, mid[i], mid[j], apex, highInside, upperRoof);
  }
  b.box(m, 0.22, 0.32, 0.22, 0, y0 + p.roofHeight + 0.06, 0, trim);
}

/** Ground + plaza + paths + banks + houses + stands (+ centrepiece): one geometry with vertex colours. */
export function buildVillageGeometry(scene: SceneDefinition): BufferGeometry {
  const b = new Builder();
  addGround(b, scene);
  for (const h of scene.houses) addHouse(b, h, scene);
  for (const s of scene.stands) addStand(b, s, scene);
  if (scene.centrepiece) addPavilion(b, scene.centrepiece, scene);
  if (scene.gameSoon) addGameSoonPost(b, scene.gameSoon, scene);
  addStructures(b, scene);
  // Phase 23 (appended last, so scenes without it keep the same mesh).
  if (scene.gamePavilion) addPavilion(b, scene.gamePavilion, scene);
  return b.build();
}

/**
 * Phase 22, the gasing pavilion: a packed-earth ring with a low log rim, open to the sky, and a small lean-to shade
 * with a bench just north of it.
 */
function addArena(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(p.x, p.z, p.rotation);
  const r = p.size / 2;
  const flatDisc = (radius: number, y: number, color: Color) =>
    b.addGeometry(new CircleGeometry(radius, 36), m.clone().multiply(new Matrix4().makeTranslation(0, y, 0)).multiply(new Matrix4().makeRotationX(-Math.PI / 2)), color);
  flatDisc(r + 0.45, 0.036, new Color(c.path).multiplyScalar(0.8));
  flatDisc(r, 0.042, new Color(c.path).multiplyScalar(0.9));
  // Log rim.
  const logs = 22;
  const log = new Color(c.housePost);
  const segment = ((2 * Math.PI * r) / logs) * 1.04;
  for (let i = 0; i < logs; i += 1) {
    const a = (i / logs) * Math.PI * 2;
    const seg = m.clone().multiply(new Matrix4().makeRotationY(a));
    b.box(seg, segment, 0.18, 0.24, 0, 0.09, r, i % 2 ? log : new Color(c.housePost).multiplyScalar(1.18));
  }
  // Shade: a lean-to shelter over a bench just north of the ring (the ring itself stays open to the camera).
  const post = new Color(c.housePost);
  const back = -(r + 1.3);
  const front = -(r - 0.2);
  const half = r * 0.75;
  const high = p.postHeight + p.roofHeight;
  const low = p.postHeight;
  for (const x of [-half, half]) {
    b.box(m, 0.2, high, 0.2, x, high / 2, back, post);
    b.box(m, 0.2, low, 0.2, x, low / 2, front, post);
  }
  const depth = front - back;
  const slope = Math.atan2(high - low, depth);
  const roofM = m
    .clone()
    .multiply(new Matrix4().makeTranslation(0, (high + low) / 2 + 0.1, (back + front) / 2))
    .multiply(new Matrix4().makeRotationX(slope));
  b.box(roofM, 2 * half + 0.8, 0.12, depth / Math.cos(slope) + 0.7, 0, 0, 0, new Color(c.houseRoof));
  // Bench under the shade.
  b.box(m, 2 * half - 0.4, 0.12, 0.5, 0, 0.45, (back + front) / 2, new Color(c.houseFloor));
  for (const x of [-half + 0.5, half - 0.5]) b.box(m, 0.12, 0.42, 0.4, x, 0.21, (back + front) / 2, post);
}

/**
 * Phase 22 (Aceh): a raised open hall without walls (inspired by a village meunasah, never named in the UI): posts,
 * a floor on stilts with a low rail on three sides, front steps and a steep gable roof with decorated gables.
 */
/**
 * Phase 22 (Jawa Tengah): an open pendopo with a stepped roof (joglo-style, never named in the UI): a stepped plinth,
 * twelve outer posts and four taller inner posts, a shallow lower roof, a short vertical step, then a steep hipped
 * top with a short ridge.
 */
function addPendopo(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(p.x, p.z, p.rotation);
  const post = new Color(c.housePost);
  const S = p.size;
  const base = 0.45;
  b.box(m, S + 2 * JOGLO_PLINTH, 0.2, S + 2 * JOGLO_PLINTH, 0, 0.1, 0, new Color(c.plaza).multiplyScalar(0.8));
  b.box(m, S + 0.4, base, S + 0.4, 0, base / 2, 0, new Color(c.plaza).multiplyScalar(0.92));
  b.box(m, S, 0.06, S, 0, base + 0.03, 0, new Color(c.houseFloor));
  // Twelve outer posts on the edge, four taller inner posts.
  const edge = S / 2 - 0.3;
  const inner = S * 0.17;
  for (const x of [-edge, -edge / 3, edge / 3, edge]) {
    for (const z of [-edge, -edge / 3, edge / 3, edge]) {
      const outer = Math.abs(x) === edge || Math.abs(z) === edge;
      if (outer) b.box(m, 0.22, p.postHeight, 0.22, x, base + p.postHeight / 2, z, post);
    }
  }
  const innerH = p.postHeight + 1.0;
  for (const x of [-inner, inner]) for (const z of [-inner, inner]) b.box(m, 0.28, innerH, 0.28, x, base + innerH / 2, z, post);
  // Roof: shallow lower tier, a vertical step, a steep hipped top.
  const square = (half: number, y: number) => [v(-half, y, -half), v(half, y, -half), v(half, y, half), v(-half, y, half)];
  const roof = new Color(c.houseRoof);
  const roofUpper = new Color(c.houseRoof).multiplyScalar(0.86);
  const band = new Color(c.housePost).multiplyScalar(1.1);
  const y0 = base + p.postHeight;
  const eave = square(S / 2 + 1.0, y0 - 0.1);
  const y1 = y0 + 0.75;
  const lower = square(S * 0.27, y1);
  const y2 = y1 + 0.3;
  const step = square(S * 0.27, y2);
  const inside = v(0, y0 - 1, 0);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    b.quad(m, eave[i], eave[j], lower[j], lower[i], inside, roof);
    b.quad(m, lower[i], lower[j], step[j], step[i], v(0, y1, 0), band);
  }
  const half = S * 0.27;
  const ridgeHalf = S * 0.09;
  const top = y2 + p.roofHeight;
  const upperInside = v(0, y2 - 0.5, 0);
  b.quad(m, v(-half, y2, half), v(half, y2, half), v(ridgeHalf, top, 0), v(-ridgeHalf, top, 0), upperInside, roofUpper);
  b.quad(m, v(-half, y2, -half), v(half, y2, -half), v(ridgeHalf, top, 0), v(-ridgeHalf, top, 0), upperInside, roofUpper);
  b.tri(m, v(half, y2, half), v(half, y2, -half), v(ridgeHalf, top, 0), upperInside, roof);
  b.tri(m, v(-half, y2, half), v(-half, y2, -half), v(-ridgeHalf, top, 0), upperInside, roof);
  const trim = new Color(c.houseTrim);
  b.box(m, ridgeHalf * 2 + 0.3, 0.12, 0.12, 0, top + 0.02, 0, trim);
  for (const x of [-ridgeHalf - 0.15, ridgeHalf + 0.15]) b.box(m, 0.1, 0.4, 0.1, x, top + 0.2, 0, trim);
}

/** The open hall's roof: the Aceh gable turned so the decorated gable faces the front (and the camera). */
const OPEN_HALL_ROOF = { ...GABLE_STYLES.aceh, axis: 'z' as const, overhang: 0.6, endOverhang: 0.55 };

function addOpenHall(b: Builder, p: PavilionDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(p.x, p.z, p.rotation);
  const post = new Color(c.housePost);
  const floor = new Color(c.houseFloor);
  const S = p.size;
  const fh = OPEN_HALL_FLOOR;
  const inset = S / 2 - 0.2;
  for (const x of [-inset, 0, inset]) {
    for (const z of [-inset, 0, inset]) b.box(m, 0.24, fh + p.postHeight, 0.24, x, (fh + p.postHeight) / 2, z, post);
  }
  b.box(m, S + 0.3, 0.2, S + 0.3, 0, fh, 0, floor);
  // Rail on the back and the sides (the front stays open for the steps).
  const railY = fh + 0.6;
  b.box(m, S, 0.08, 0.08, 0, railY, -inset, post);
  for (const x of [-inset, inset]) b.box(m, 0.08, 0.08, S, x, railY, 0, post);
  // Beams under the roof.
  const y0 = fh + p.postHeight;
  for (const z of [-inset, inset]) b.box(m, S + 0.1, 0.16, 0.16, 0, y0, z, post);
  for (const x of [-inset, inset]) b.box(m, 0.16, 0.16, S + 0.1, x, y0, 0, post);
  // Front steps.
  const steps = 4;
  for (let s = 0; s < steps; s += 1) {
    const top = (fh * (steps - s)) / steps;
    b.box(m, 1.4, 0.12, OPEN_HALL_STEPS / steps + 0.02, 0, top - 0.06, S / 2 + 0.15 + ((s + 0.5) * OPEN_HALL_STEPS) / steps, floor);
  }
  const roofHouse: HouseDef = {
    x: p.x,
    z: p.z,
    rotation: p.rotation,
    width: S,
    depth: S,
    floorHeight: fh,
    wallHeight: p.postHeight,
    roofHeight: p.roofHeight,
  };
  addGableRoof(b, m, roofHouse, c, OPEN_HALL_ROOF);
}

/**
 * Phase 22: the post and the wooden back of the "Game segera hadir" board. The text is a separate canvas-textured
 * plane in front of the board (GAME_SOON_BOARD, drawn by VillageScene3D).
 */
function addGameSoonPost(b: Builder, g: GameSoonDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(g.x, g.z, g.rotation);
  const post = new Color(c.standPost);
  const { width, height, centerY, tilt } = GAME_SOON_BOARD;
  b.box(m, 0.16, centerY, 0.16, 0, centerY / 2, -0.12, post);
  const board = m.clone().multiply(new Matrix4().makeTranslation(0, centerY, 0)).multiply(new Matrix4().makeRotationX(tilt));
  b.box(board, width + 0.16, height + 0.16, 0.08, 0, 0, -0.05, new Color(c.standPost).multiplyScalar(0.8));
  b.box(board, width + 0.36, 0.1, 0.2, 0, height / 2 + 0.12, -0.04, new Color(c.standRoof));
}

/**
 * The river surface plus a few lighter streaks (vertex colours, one geometry). Phase 22: the sea (shallow near the
 * shore, deep towards the horizon) or null when the scene has no water.
 */
export function buildWaterGeometry(scene: SceneDefinition, streaks: boolean): BufferGeometry | null {
  const waterStyle = scene.waterStyle ?? 'river';
  if (waterStyle === 'none') return null;
  if (waterStyle === 'sea') return buildSeaGeometry(scene, streaks);
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

function buildSeaGeometry(scene: SceneDefinition, streaks: boolean): BufferGeometry {
  const b = new Builder();
  const { south } = scene.river;
  const { width, depth } = scene.ground;
  const north = -depth / 2;
  const deep = new Color(scene.colors.waterDeep);
  const shallow = new Color(scene.colors.water);
  const mid = new Color(scene.colors.water).lerp(deep, 0.5);
  // Shallow along the shore, a middle band, then deep water to the horizon.
  flat(b, 0, WATER_Y, south - 2.5, width, 5, 0, shallow);
  flat(b, 0, WATER_Y, south - 9, width, 8, 0, mid);
  flat(b, 0, WATER_Y, (south - 13 + north) / 2, width, south - 13 - north, 0, deep);
  if (streaks) {
    const light = new Color(scene.colors.water).lerp(new Color('#ffffff'), 0.4);
    for (let i = 0; i < 14; i += 1) {
      const x = -28 + ((i * 37) % 56);
      const z = south - 1.2 - ((i * 2.3) % 14);
      flat(b, x, WATER_Y + 0.01, z, 1.4 + (i % 3) * 0.8, 0.08, 0, light);
    }
  }
  return b.build();
}
