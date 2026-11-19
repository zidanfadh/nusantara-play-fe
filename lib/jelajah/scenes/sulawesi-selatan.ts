/**
 * Sulawesi Selatan (Phase 22): a coastal village with a wide beach. A large wooden sailing boat is drawn up on the
 * sand (pinisi-like, a loose low-poly hint); raised houses on tall stilts with a steep gable facing the front,
 * stacked tiers on the gable and long crossed timbers at the ridge (hints of "timpa laja"); coconut palms, canoes.
 *
 * Sulawesi Selatan has a published PROT but no playable game yet: a "Game segera hadir" sign stands next to stand 1.
 *
 * Only `import type` here (see types.ts). No cultural facts: visible text comes from PROT data or neutral UI text.
 */
import type { DecorDef, HouseDef, NatureModel, SceneDefinition, StandDef } from './types';

const PLAZA = { x: 0, z: 3, radius: 6.5 } as const;
const STAND_RING = 9;
const SHORE = -9;

function facing(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Stand on the ring around the plaza; `deg` is the compass angle (0 = north, 90 = east). */
function ringStand(deg: number): StandDef {
  const a = (deg * Math.PI) / 180;
  const x = round(PLAZA.x + STAND_RING * Math.sin(a));
  const z = round(PLAZA.z - STAND_RING * Math.cos(a));
  return { x, z, rotation: facing(x, z, PLAZA.x, PLAZA.z) };
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function raisedHouse(x: number, z: number, width = 5.2, depth = 6.6): HouseDef {
  return {
    x,
    z,
    rotation: facing(x, z, PLAZA.x, PLAZA.z),
    width,
    depth,
    floorHeight: 2.2,
    wallHeight: 2.2,
    roofHeight: 2.9,
    style: 'bugis',
  };
}

// Order = assignment order of the PROT (sorted by name): SE (nearest to the spawn), SW, NE.
const stands: StandDef[] = [145, 215, 50].map(ringStand);

const houses: HouseDef[] = [raisedHouse(-15.4, 10.2), raisedHouse(15.6, 9.8, 5, 6.2), raisedHouse(16, -1.4)];

const decor: DecorDef[] = [
  // Coconut palms along the beach and around the houses (block the player).
  { model: 'tree_palmTall', x: -2.6, z: -6.8, rotation: 0.5, scale: 1.8, collide: 0.45 },
  { model: 'tree_palmBend', x: 5.2, z: -7.6, rotation: 2.4, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmTall', x: 11.6, z: -6.4, rotation: 1.1, scale: 1.9, collide: 0.45 },
  { model: 'tree_palmShort', x: 18.6, z: -7.4, rotation: 4.2, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmBend', x: -18.8, z: -2.6, rotation: 3.0, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmTall', x: -10.8, z: 4.2, rotation: 0.8, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmShort', x: 10.4, z: 14.4, rotation: 1.9, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmTall', x: -8.8, z: 15.2, rotation: 5.0, scale: 1.7, collide: 0.45 },
  // Canoes in the shallows and one on the sand.
  { model: 'canoe', x: 2.4, z: -12.6, y: -0.12, rotation: 1.4, scale: 1.8 },
  { model: 'canoe', x: 13.6, z: -14.4, y: -0.12, rotation: 1.9, scale: 1.7, detail: true },
  { model: 'canoe', x: 15.6, z: -5.6, rotation: 0.3, scale: 1.7, collide: { halfW: 0.5, halfD: 2.2 } },
  // Logs and rocks on the beach, jars and a log stack near the houses.
  { model: 'log', x: -14.6, z: -3.6, rotation: 1.5, scale: 1.6, collide: { halfW: 0.35, halfD: 1.0 } },
  { model: 'log', x: -7.4, z: -3.8, rotation: 1.7, scale: 1.6, collide: { halfW: 0.35, halfD: 1.0 } },
  { model: 'rock_largeA', x: 8.2, z: -8.4, rotation: 0.8, scale: 1.1, collide: 0.75 },
  { model: 'rock_largeA', x: -19, z: -9.8, y: -0.15, rotation: 2.2, scale: 1.3 },
  { model: 'pot_large', x: 11.8, z: 5.2, rotation: 0.4, scale: 1.2, collide: 0.6 },
  { model: 'pot_small', x: -11.6, z: 9.4, rotation: 1.2, scale: 1.3, collide: 0.4 },
  { model: 'log_stack', x: 18.4, z: 4.2, rotation: 0.2, scale: 1.2, collide: 0.8 },
  { model: 'plant_bushLarge', x: -18.6, z: 15, rotation: 2.4, scale: 1.5, collide: 0.6 },
  { model: 'plant_bush', x: 18.6, z: 15.6, rotation: 1.1, scale: 1.3, collide: 0.5 },
  { model: 'stump_round', x: 4.8, z: 15.8, rotation: 0.6, scale: 1.4, collide: 0.45 },
];

// Frame: palms and trees along the east and west edges (outside the walkable area).
const rand = seeded(7301);
const FRAME: NatureModel[] = ['tree_palmTall', 'tree_palmBend', 'tree_fat', 'tree_palmShort', 'tree_default'];
for (const side of [-1, 1]) {
  for (let i = 0; i < 6; i += 1) {
    decor.push({
      model: FRAME[(i + (side > 0 ? 2 : 0)) % FRAME.length],
      x: round(side * (22 + rand() * 4)),
      z: round(-5 + i * 4.6 + rand() * 2),
      rotation: round(rand() * 6.28),
      scale: round(1.3 + rand() * 0.5),
      detail: i % 2 === 1,
    });
  }
}
// Small details on the grass (lite tier leaves them out), off the plaza, the paths and the houses.
const DETAILS: NatureModel[] = ['grass', 'grass_large', 'flower_redA', 'rock_smallA', 'stone_smallA', 'plant_flatTall'];
let placed = 0;
for (let tries = 0; placed < 50 && tries < 600; tries += 1) {
  const x = -19 + rand() * 38;
  const z = -2 + rand() * 20;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < STAND_RING + 2.2) continue;
  if (Math.abs(x) < 2 && z > 7) continue;
  if (houses.some((h) => Math.hypot(x - h.x, z - h.z) < 5.5)) continue;
  decor.push({
    model: DETAILS[placed % DETAILS.length],
    x: round(x),
    z: round(z),
    rotation: round(rand() * 6.28),
    scale: round(0.8 + rand() * 0.5),
    detail: true,
  });
  placed += 1;
}

const PROT_STAND = stands[0];

export const SULAWESI_SELATAN_SCENE: SceneDefinition = {
  slug: 'sulawesi-selatan',
  provinsiKode: '73',
  nama: 'Sulawesi Selatan',
  assets: {
    nature: '/jelajah/assets/v1/nature.glb',
    player: '/jelajah/assets/v1/player.glb',
  },
  modelScale: 3,
  ground: { width: 160, depth: 160 },
  waterStyle: 'sea',
  river: { north: -80, south: SHORE, bank: 6.5 },
  plaza: PLAZA,
  paths: [
    { from: [0, 45], to: [0, PLAZA.z + PLAZA.radius - 0.5], width: 2.6 },
    { from: [PLAZA.x, PLAZA.z - PLAZA.radius + 0.5], to: [PLAZA.x, SHORE + 4], width: 2.2 },
    { from: [-PLAZA.radius + 1.5, PLAZA.z + 2.5], to: [-12.4, 8], width: 1.8 },
    { from: [PLAZA.x + PLAZA.radius - 0.5, PLAZA.z + 2], to: [12.6, 7.8], width: 1.8 },
  ],
  // Beside stand 1, on the side of the entrance path.
  gameSoon: { x: round(PROT_STAND.x - 3.2), z: round(PROT_STAND.z + 1.8), rotation: 0 },
  structures: [
    { kind: 'boat', x: -11.6, z: -6, rotation: 0.12, length: 13, hull: '#5E3B23', sail: '#F1E6CF' },
    // A headland in the haze.
    { kind: 'mountain', x: 36, z: -50, radius: 18, height: 11, color: '#8DA88A', y: -0.4 },
  ],
  spawn: { x: 0, z: 15, rotation: Math.PI },
  walkable: { minX: -19.5, maxX: 19.5, minZ: SHORE + 0.6, maxZ: 17 },
  houses,
  stands,
  decor,
  fog: { near: 34, far: 110 },
  colors: {
    background: '#F3DCB8',
    grass: '#A9BD6B',
    farGrass: '#9DB163',
    plaza: '#E7D3A8',
    path: '#D9BF8F',
    bank: '#EDD9A8',
    water: '#4CA6B6',
    waterDeep: '#2A6E94',
    ambient: '#FFEBD2',
    sun: '#FFD7A6',
    houseWall: '#8C5B36',
    housePost: '#4A3020',
    houseFloor: '#6A4428',
    houseRoof: '#5C4434',
    houseTrim: '#E6C068',
    standPost: '#6B4A30',
    standRoof: '#B23A48',
    standCounter: '#E3CA9C',
    materials: {
      leafsGreen: '#6A9E48',
      leafsDark: '#548439',
      leafsFall: '#C9963E',
      grass: '#8CAE55',
      woodBark: '#8A6446',
      woodBarkDark: '#664830',
      wood: '#AD7E50',
      woodDark: '#714B2E',
      woodInner: '#DDB884',
      dirt: '#AD9264',
      stone: '#B1AB9F',
      stoneDark: '#8C867C',
      colorRed: '#C8553D',
      colorYellow: '#E5B028',
      colorPurple: '#9D7BB0',
    },
  },
};
