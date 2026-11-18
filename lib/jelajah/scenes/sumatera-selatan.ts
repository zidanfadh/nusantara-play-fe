/**
 * Sumatera Selatan pilot scene (Phase 11): a small riverside village square, walkable in about two
 * minutes. A calm river along the north side, three raised houses ("terinspirasi rumah limas", built
 * procedurally), six PROT stands around a central plaza, trees and props from the Kenney Nature Kit.
 *
 * Only `import type` here (see types.ts). No cultural facts: every visible text comes from PROT data
 * or is neutral UI text.
 */
import type { DecorDef, HouseDef, NatureModel, SceneDefinition, StandDef } from './types';

const PLAZA = { x: 0, z: 1, radius: 6.5 } as const;
const STAND_RING = 9;

/** Rotation that makes an object at (x, z) face the point (tx, tz). */
function facing(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

/** Stand on the ring around the plaza; `deg` is the compass angle (0 = north, 90 = east). */
function ringStand(deg: number): StandDef {
  const a = (deg * Math.PI) / 180;
  const x = round(PLAZA.x + STAND_RING * Math.sin(a));
  const z = round(PLAZA.z - STAND_RING * Math.cos(a));
  return { x, z, rotation: facing(x, z, PLAZA.x, PLAZA.z) };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function house(x: number, z: number, width = 6, depth = 5): HouseDef {
  return {
    x,
    z,
    rotation: facing(x, z, PLAZA.x, PLAZA.z),
    width,
    depth,
    floorHeight: 1.7,
    wallHeight: 2.3,
    roofHeight: 3.4,
  };
}

/** Small deterministic generator (same layout on every device and every build). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Order = assignment order of the PROT (sorted by name): NW, NE, E, SE, SW, W.
const stands: StandDef[] = [330, 30, 90, 150, 210, 270].map(ringStand);

const houses: HouseDef[] = [house(-15, -5), house(15, -5), house(-14.5, 10.5, 5.5, 4.5)];

const decor: DecorDef[] = [
  // Palms along the river bank (block the player).
  { model: 'tree_palmTall', x: -17, z: -11.6, rotation: 0.4, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmBend', x: -11.5, z: -12, rotation: 2.1, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmShort', x: -6.5, z: -11.4, rotation: 1.2, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmTall', x: 6.8, z: -11.8, rotation: 3.0, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmBend', x: 12, z: -11.5, rotation: 5.1, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmShort', x: 17.5, z: -11.9, rotation: 0.9, scale: 1.4, collide: 0.45 },
  // Bamboo clumps and bushes beside the houses.
  { model: 'crops_bambooStageA', x: -18.2, z: -0.5, rotation: 0.3, scale: 2.4, collide: 0.7 },
  { model: 'crops_bambooStageA', x: 18.2, z: -0.8, rotation: 1.7, scale: 2.4, collide: 0.7 },
  { model: 'crops_bambooStageA', x: -18.4, z: 4.2, rotation: 2.6, scale: 2.1, collide: 0.6 },
  { model: 'plant_bushLarge', x: -18, z: -9, rotation: 0.5, scale: 1.6, collide: 0.6 },
  { model: 'plant_bushLarge', x: 18, z: -9.2, rotation: 2.5, scale: 1.6, collide: 0.6 },
  { model: 'plant_bush', x: 9.5, z: -9.8, rotation: 1.1, scale: 1.4, collide: 0.5 },
  { model: 'plant_bush', x: -9.4, z: -9.6, rotation: 4.1, scale: 1.4, collide: 0.5 },
  // Props near the houses.
  { model: 'log_stack', x: -11.4, z: -9.3, rotation: 1.6, scale: 1.3, collide: 0.8 },
  { model: 'log_stack', x: 17.8, z: 2.2, rotation: 0.1, scale: 1.3, collide: 0.8 },
  { model: 'pot_large', x: -11.2, z: -1.6, rotation: 0.4, scale: 1.2, collide: 0.6 },
  { model: 'pot_small', x: -11.6, z: -0.6, rotation: 1.2, scale: 1.3, collide: 0.4 },
  { model: 'pot_large', x: 11.3, z: -1.5, rotation: 2.4, scale: 1.2, collide: 0.6 },
  { model: 'stump_round', x: 4.8, z: 13.5, rotation: 0.6, scale: 1.5, collide: 0.45 },
  { model: 'stump_round', x: -5.6, z: 14.2, rotation: 2.2, scale: 1.3, collide: 0.4 },
  { model: 'log', x: 6.2, z: 14.4, rotation: 1.3, scale: 1.6, collide: { halfW: 0.35, halfD: 1.0 } },
  // Garden fence south of the east house.
  { model: 'fence_simple', x: 13, z: 4.8, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'fence_simple', x: 16, z: 4.8, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'fence_planks', x: 17.6, z: 6.5, rotation: Math.PI / 2, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  // Large rocks at the river landing.
  { model: 'rock_largeA', x: -2.6, z: -11.6, rotation: 0.8, scale: 1.2, collide: 0.8 },
  { model: 'rock_largeA', x: 2.8, z: -11.9, rotation: 2.3, scale: 1.0, collide: 0.7 },
  // On the river.
  { model: 'canoe', x: 4.2, z: -15.6, y: -0.12, rotation: 1.45, scale: 1.8 },
  { model: 'lily_large', x: -8, z: -16.5, y: -0.17, rotation: 0.4, scale: 1.6 },
  { model: 'lily_small', x: -7.2, z: -17.2, y: -0.17, rotation: 1.9, scale: 1.6 },
  { model: 'lily_large', x: 10.5, z: -18.2, y: -0.17, rotation: 2.8, scale: 1.4, detail: true },
  { model: 'lily_small', x: -14, z: -18.8, y: -0.17, rotation: 0.2, scale: 1.5, detail: true },
];

// Frame: trees on the far river bank and along the edges (outside the walkable area).
const rand = seeded(1601);
const FRAME_TREES: NatureModel[] = ['tree_palmTall', 'tree_default', 'tree_palmBend', 'tree_oak', 'tree_fat'];
for (let i = 0; i < 16; i += 1) {
  const x = -30 + i * 4 + rand() * 2;
  decor.push({
    model: FRAME_TREES[i % FRAME_TREES.length],
    x: round(x),
    z: round(-24 - rand() * 4),
    rotation: round(rand() * 6.28),
    scale: round(1.4 + rand() * 0.5),
    detail: i % 2 === 1,
  });
}
for (const side of [-1, 1]) {
  for (let i = 0; i < 6; i += 1) {
    decor.push({
      model: FRAME_TREES[(i + (side > 0 ? 2 : 0)) % FRAME_TREES.length],
      x: round(side * (22 + rand() * 4)),
      z: round(-9 + i * 5.5 + rand() * 2),
      rotation: round(rand() * 6.28),
      scale: round(1.3 + rand() * 0.5),
      detail: i % 2 === 1,
    });
  }
}
for (let i = 0; i < 9; i += 1) {
  decor.push({
    model: FRAME_TREES[(i + 1) % FRAME_TREES.length],
    x: round(-20 + i * 5 + rand() * 2),
    z: round(19.5 + rand() * 3),
    rotation: round(rand() * 6.28),
    scale: round(1.2 + rand() * 0.4),
    detail: i % 3 === 2,
  });
}

// Small details scattered on the grass (lite tier leaves them out). Kept off the plaza and paths.
const DETAILS: NatureModel[] = [
  'grass',
  'grass_large',
  'flower_redA',
  'flower_yellowA',
  'flower_purpleA',
  'rock_smallA',
  'rock_smallFlatA',
  'stone_smallA',
  'plant_flatTall',
];
let placed = 0;
for (let tries = 0; placed < 70 && tries < 600; tries += 1) {
  const x = -19 + rand() * 38;
  const z = -11 + rand() * 30;
  const dPlaza = Math.hypot(x - PLAZA.x, z - PLAZA.z);
  if (dPlaza < STAND_RING + 2.2) continue; // plaza and stands
  if (Math.abs(x) < 2 && z > 7) continue; // entrance path
  if (houses.some((h) => Math.hypot(x - h.x, z - h.z) < 5)) continue;
  decor.push({
    model: DETAILS[placed % DETAILS.length],
    x: round(x),
    z: round(z),
    rotation: round(rand() * 6.28),
    scale: round(1.6 + rand() * 0.8),
    detail: true,
  });
  placed += 1;
}

export const SUMATERA_SELATAN_SCENE: SceneDefinition = {
  slug: 'sumatera-selatan',
  provinsiKode: '16',
  nama: 'Sumatera Selatan',
  assets: {
    nature: '/jelajah/assets/v1/nature.glb',
    player: '/jelajah/assets/v1/player.glb',
  },
  modelScale: 3,
  ground: { width: 160, depth: 160 },
  river: { north: -21, south: -14, bank: 1.8 },
  plaza: PLAZA,
  paths: [
    { from: [0, 22], to: [0, PLAZA.z + PLAZA.radius - 0.5], width: 2.6 },
    { from: [0, PLAZA.z - PLAZA.radius + 0.5], to: [0, -12.6], width: 2.2 },
    { from: [-PLAZA.radius + 0.5, -1], to: [-11.5, -3.8], width: 2 },
    { from: [PLAZA.radius - 0.5, -1], to: [11.5, -3.8], width: 2 },
    { from: [-4.5, PLAZA.z + 4.5], to: [-11.4, 8.6], width: 1.8 },
  ],
  spawn: { x: 0, z: 15, rotation: Math.PI },
  walkable: { minX: -19.5, maxX: 19.5, minZ: -12.2, maxZ: 17 },
  houses,
  stands,
  decor,
  colors: {
    background: '#EAD3B0',
    grass: '#A3B46A',
    farGrass: '#93A55F',
    plaza: '#DCC197',
    path: '#CFB083',
    bank: '#E2C99C',
    water: '#6FA6AA',
    waterDeep: '#4F8C96',
    ambient: '#FFE9D0',
    sun: '#FFD4A3',
    houseWall: '#946039',
    housePost: '#5E3B25',
    houseFloor: '#734A2E',
    houseRoof: '#6E3627',
    houseTrim: '#C99A2E',
    standPost: '#8A5A3B',
    standRoof: '#9E3C24',
    standCounter: '#D2AC78',
    materials: {
      leafsGreen: '#6F9A4B',
      leafsDark: '#587E3C',
      leafsFall: '#C98A3E',
      grass: '#86A652',
      woodBark: '#8A5A3B',
      woodBarkDark: '#6C4429',
      wood: '#A9764A',
      woodDark: '#714A2E',
      woodInner: '#D8B07C',
      dirt: '#A98A5E',
      stone: '#ADA79C',
      stoneDark: '#8A847B',
      colorRed: '#C8553D',
      colorYellow: '#E5B028',
      colorPurple: '#9D7BB0',
    },
  },
};
