/**
 * Kepulauan Riau (Phase 22): a coastal kampung by the sea. A sand beach along the north, the sea up to the
 * horizon with a few low islands, a jetty with walkways to three stilt houses standing in the water, two more
 * houses on land (gable roofs with crossed ridge ends, a loose low-poly hint), sampans (Kenney canoe), coconut
 * palms. In the plaza: the gasing pavilion, a packed-earth ring under a lean-to shade, which opens the Gasing game.
 *
 * Stands get the province's published PROT in name order; stand 1 sits nearest to the spawn point.
 *
 * Only `import type` here (see types.ts). No cultural facts: visible text comes from PROT data or neutral UI text.
 */
import type { DecorDef, HouseDef, NatureModel, SceneDefinition, StandDef } from './types';

const PLAZA = { x: 0, z: 3, radius: 6 } as const;
const STAND_RING = 8.6;
const SHORE = -8;

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

function malayHouse(x: number, z: number, rotation: number, inWater: boolean, width = 6, depth = 4.6): HouseDef {
  return {
    x,
    z,
    rotation,
    width,
    depth,
    floorHeight: inWater ? 1.5 : 1.4,
    wallHeight: 2.2,
    roofHeight: 2.1,
    style: 'malay',
    stiltDepth: inWater ? 1.3 : undefined,
    stairs: inWater ? false : undefined,
  };
}

// Order = assignment order of the PROT (sorted by name): SE (nearest to the spawn), SW, NW.
const stands: StandDef[] = [125, 235, 300].map(ringStand);

const houses: HouseDef[] = [
  // In the water, doors towards the shore and the walkways.
  malayHouse(-11, -12.6, 0, true),
  malayHouse(11, -12.6, 0, true),
  malayHouse(6.2, -20.5, 0, true, 5.6, 4.4),
  // On land, facing the plaza.
  malayHouse(15.5, 6.5, facing(15.5, 6.5, PLAZA.x, PLAZA.z), false),
  malayHouse(-15.5, 9.5, facing(-15.5, 9.5, PLAZA.x, PLAZA.z), false, 5.6, 4.4),
];

const decor: DecorDef[] = [
  // Coconut palms along the beach (block the player).
  { model: 'tree_palmTall', x: -18, z: -5.2, rotation: 0.5, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmBend', x: -13.6, z: -6.4, rotation: 2.4, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmShort', x: -5.8, z: -5.6, rotation: 1.1, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmBend', x: 5.4, z: -6.2, rotation: 4.2, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmTall', x: 13.8, z: -5.4, rotation: 3.0, scale: 1.8, collide: 0.45 },
  { model: 'tree_palmShort', x: 18.4, z: -6.6, rotation: 0.8, scale: 1.4, collide: 0.45 },
  { model: 'tree_palmTall', x: 18.6, z: 1.5, rotation: 1.9, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmBend', x: -18.6, z: 2.5, rotation: 5.0, scale: 1.5, collide: 0.45 },
  // Sampans on the water and one drawn up on the sand.
  { model: 'canoe', x: -4.4, z: -12.2, y: -0.12, rotation: 1.3, scale: 1.8 },
  { model: 'canoe', x: 3.6, z: -14.8, y: -0.12, rotation: 1.75, scale: 1.7 },
  { model: 'canoe', x: -16.5, z: -18, y: -0.12, rotation: 0.4, scale: 1.8, detail: true },
  { model: 'canoe', x: 9.2, z: -6.4, rotation: 0.25, scale: 1.7, collide: { halfW: 0.5, halfD: 2.2 } },
  // Rocks on the beach and in the shallows.
  { model: 'rock_largeA', x: -9, z: -6.6, rotation: 0.6, scale: 1.0, collide: 0.7 },
  { model: 'rock_largeA', x: 16.5, z: -9.2, y: -0.15, rotation: 2.1, scale: 1.2 },
  { model: 'rock_smallA', x: -2.4, z: -6.8, rotation: 1.4, scale: 1.3, detail: true },
  // Bushes, pots and a log stack near the land houses.
  { model: 'plant_bushLarge', x: 18.4, z: 11.5, rotation: 0.5, scale: 1.5, collide: 0.6 },
  { model: 'plant_bush', x: 11, z: 10.6, rotation: 1.1, scale: 1.3, collide: 0.5 },
  { model: 'plant_bushLarge', x: -18.6, z: 14, rotation: 2.4, scale: 1.5, collide: 0.6 },
  { model: 'pot_large', x: 11.4, z: 3.4, rotation: 0.4, scale: 1.2, collide: 0.6 },
  { model: 'pot_small', x: -11.6, z: 12.8, rotation: 1.2, scale: 1.3, collide: 0.4 },
  { model: 'log_stack', x: -12.4, z: 5.2, rotation: 1.5, scale: 1.2, collide: 0.8 },
  { model: 'stump_round', x: 4.6, z: 13.6, rotation: 0.6, scale: 1.4, collide: 0.45 },
  { model: 'fence_simple', x: 13.2, z: 12.2, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'fence_simple', x: 16.2, z: 12.2, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
];

// Frame: palms and trees along the east and west edges (outside the walkable area).
const rand = seeded(2101);
const FRAME: NatureModel[] = ['tree_palmTall', 'tree_palmBend', 'tree_default', 'tree_palmShort', 'tree_fat'];
for (const side of [-1, 1]) {
  for (let i = 0; i < 6; i += 1) {
    decor.push({
      model: FRAME[(i + (side > 0 ? 1 : 0)) % FRAME.length],
      x: round(side * (22 + rand() * 4)),
      z: round(-5 + i * 4.6 + rand() * 2),
      rotation: round(rand() * 6.28),
      scale: round(1.3 + rand() * 0.5),
      detail: i % 2 === 1,
    });
  }
}
// Small details on the grass (lite tier leaves them out), off the plaza, the paths and the houses.
const DETAILS: NatureModel[] = ['grass', 'grass_large', 'flower_yellowA', 'flower_redA', 'rock_smallA', 'plant_flatTall'];
let placed = 0;
for (let tries = 0; placed < 50 && tries < 600; tries += 1) {
  const x = -19 + rand() * 38;
  const z = -2 + rand() * 20;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < STAND_RING + 2.2) continue;
  if (Math.abs(x) < 2 && z > 7) continue;
  if (houses.some((h) => Math.hypot(x - h.x, z - h.z) < 5)) continue;
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

export const KEPULAUAN_RIAU_SCENE: SceneDefinition = {
  slug: 'kepulauan-riau',
  provinsiKode: '21',
  nama: 'Kepulauan Riau',
  assets: {
    nature: '/jelajah/assets/v1/nature.glb',
    player: '/jelajah/assets/v1/player.glb',
  },
  modelScale: 3,
  ground: { width: 160, depth: 160 },
  waterStyle: 'sea',
  river: { north: -80, south: SHORE, bank: 5 },
  plaza: PLAZA,
  centrepiece: { x: PLAZA.x, z: PLAZA.z, rotation: 0, size: 5.4, postHeight: 2.1, roofHeight: 0.7, style: 'arena', game: 'gasing' },
  paths: [
    { from: [0, 45], to: [0, PLAZA.z + PLAZA.radius - 0.5], width: 2.6 },
    { from: [0, PLAZA.z - PLAZA.radius + 0.5], to: [0, SHORE + 3], width: 2.2 },
    { from: [PLAZA.radius - 0.5, PLAZA.z + 1.5], to: [12.6, 5.6], width: 1.8 },
    { from: [-PLAZA.radius + 0.5, PLAZA.z + 2.5], to: [-12.6, 8.2], width: 1.8 },
  ],
  structures: [
    { kind: 'jetty', from: [0, SHORE + 0.4], to: [0, -24], width: 1.8 },
    { kind: 'jetty', from: [-0.9, -9.4], to: [-8.2, -9.4], width: 1.4 },
    { kind: 'jetty', from: [0.9, -9.4], to: [8.2, -9.4], width: 1.4 },
    { kind: 'jetty', from: [0.9, -17.6], to: [4.6, -17.6], width: 1.4 },
    // Low islands on the horizon (seen through the haze).
    { kind: 'mountain', x: -38, z: -62, radius: 13, height: 6, color: '#7FA87A', y: -0.4 },
    { kind: 'mountain', x: 30, z: -70, radius: 18, height: 9, color: '#86AC84', y: -0.4 },
  ],
  spawn: { x: 0, z: 15, rotation: Math.PI },
  walkable: { minX: -19.5, maxX: 19.5, minZ: SHORE + 0.6, maxZ: 17 },
  houses,
  stands,
  decor,
  colors: {
    background: '#CFE8F0',
    grass: '#9FC173',
    farGrass: '#93B568',
    plaza: '#EADBB4',
    path: '#DCC596',
    bank: '#F1E2B8',
    water: '#5CC3C8',
    waterDeep: '#2F8FB2',
    ambient: '#FFFFFF',
    sun: '#FFF0D2',
    houseWall: '#8CC3AE',
    housePost: '#5A4532',
    houseFloor: '#7B5B3F',
    houseRoof: '#B4553D',
    houseTrim: '#F5F0E3',
    standPost: '#6E5038',
    standRoof: '#2E7F8E',
    standCounter: '#E3D0A6',
    materials: {
      leafsGreen: '#5FA24B',
      leafsDark: '#4A8A3C',
      leafsFall: '#C9A33E',
      grass: '#7FB458',
      woodBark: '#8A6A4A',
      woodBarkDark: '#6A4E34',
      wood: '#B58A5C',
      woodDark: '#7A5634',
      woodInner: '#E0BE8C',
      dirt: '#B49A6C',
      stone: '#B5B2A8',
      stoneDark: '#8E8B84',
      colorRed: '#D0563E',
      colorYellow: '#EDBB2E',
      colorPurple: '#9D7BB0',
    },
  },
};
