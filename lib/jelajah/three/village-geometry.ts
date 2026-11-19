/**
 * Procedural geometry of a province scene (Phase 11): ground, plaza, paths, river banks, raised houses
 * ("terinspirasi rumah limas"), the PROT stands and (Phase 12) the plaza centrepiece. Everything static and opaque is merged into ONE
 * non-indexed geometry with vertex colours (one draw call); the water is a second geometry.
 *
 * Only imported by components/jelajah/three/* (three.js isolation, see tests/jelajah/three-isolation.test.ts).
 */
import { BufferGeometry, CircleGeometry, Color, Matrix4 } from 'three';
import { HOUSE_STAIRS_DEPTH, STAND_ROOF_TOP, STAND_SIZE } from '@/lib/jelajah/engine/collision';
import type { GameSoonDef, HouseDef, PavilionDef, SceneDefinition, StandDef } from '@/lib/jelajah/scenes/types';
import { GAME_SOON_BOARD } from '@/lib/jelajah/engine/game-soon';
import { Builder, flat, placement, v } from './mesh-builder';

/** Water surface height (ground = 0). */
export const WATER_Y = -0.22;

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
  return b.build();
}

/**
 * Phase 22: the post and the wooden back of the "Game segera hadir" board. The text is a separate canvas-textured
 * plane in front of the board (GAME_SOON_BOARD, drawn by VillageScene3D).
 */
function addGameSoonPost(b: Builder, g: GameSoonDef, scene: SceneDefinition) {
  const c = scene.colors;
  const m = placement(g.x, g.z, g.rotation);
  const post = new Color(c.standPost);
  const { width, height, centerY } = GAME_SOON_BOARD;
  b.box(m, 0.16, centerY + height / 2, 0.16, 0, (centerY + height / 2) / 2, -0.08, post);
  b.box(m, width + 0.16, height + 0.16, 0.08, 0, centerY, -0.02, new Color(c.standPost).multiplyScalar(0.8));
  b.box(m, width + 0.4, 0.1, 0.2, 0, centerY + height / 2 + 0.1, 0, new Color(c.standRoof));
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
