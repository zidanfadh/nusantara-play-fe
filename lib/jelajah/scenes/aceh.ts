/**
 * Aceh (Phase 22): a village in the dry season. Long timber houses on tall stilts with steep gable roofs, decorated
 * gables and a carved band under the eaves (a loose low-poly hint), around a packed-earth plaza with a raised open
 * hall in the middle; many coconut palms, low hills in the warm haze. No water.
 *
 * Aceh has a published PROT but no playable game yet: a "Game segera hadir" sign stands next to stand 1.
 *
 * Only `import type` here (see types.ts). No cultural facts: visible text comes from PROT data or neutral UI text.
 */
import type { DecorDef, HouseDef, NatureModel, SceneDefinition, StandDef } from './types';

const PLAZA = { x: 0, z: 1, radius: 6.5 } as const;
const STAND_RING = 9;

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

function longHouse(x: number, z: number, width = 8.4, depth = 4.6): HouseDef {
  return {
    x,
    z,
    rotation: facing(x, z, PLAZA.x, PLAZA.z),
    width,
    depth,
    floorHeight: 2.3,
    wallHeight: 2.2,
    roofHeight: 2.9,
    style: 'aceh',
  };
}

// Order = assignment order of the PROT (sorted by name): SE (nearest to the spawn), SW, NE.
const stands: StandDef[] = [140, 220, 40].map(ringStand);

const houses: HouseDef[] = [longHouse(-15.5, -3.5), longHouse(15.5, -5), longHouse(-15, 11.5, 7.6, 4.4)];

const decor: DecorDef[] = [
  // Coconut palms: around the plaza and the houses (block the player).
  { model: 'tree_palmTall', x: -8.6, z: -9.6, rotation: 0.4, scale: 1.8, collide: 0.45 },
  { model: 'tree_palmBend', x: -3.2, z: -11.2, rotation: 2.1, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmTall', x: 4.4, z: -11.4, rotation: 3.0, scale: 1.9, collide: 0.45 },
  { model: 'tree_palmShort', x: 9.8, z: -10.6, rotation: 1.2, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmBend', x: 18.4, z: 3.6, rotation: 5.1, scale: 1.6, collide: 0.45 },
  { model: 'tree_palmTall', x: 13.2, z: 12.6, rotation: 0.9, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmShort', x: -18.6, z: 4.4, rotation: 2.6, scale: 1.5, collide: 0.45 },
  { model: 'tree_palmTall', x: -7.8, z: 15.2, rotation: 1.6, scale: 1.7, collide: 0.45 },
  { model: 'tree_palmBend', x: 18.6, z: -12, rotation: 4.0, scale: 1.6, collide: 0.45 },
  // Dry bushes, jars, log stacks and a plank fence.
  { model: 'plant_bush', x: -11.4, z: -9.8, rotation: 1.1, scale: 1.3, collide: 0.5 },
  { model: 'plant_bushLarge', x: 11.8, z: 6.4, rotation: 2.5, scale: 1.4, collide: 0.6 },
  { model: 'pot_large', x: -10.6, z: -0.2, rotation: 0.4, scale: 1.3, collide: 0.6 },
  { model: 'pot_small', x: -10.8, z: 1.2, rotation: 1.2, scale: 1.3, collide: 0.4 },
  { model: 'pot_large', x: 10.4, z: -2.4, rotation: 2.4, scale: 1.3, collide: 0.6 },
  { model: 'log_stack', x: 17.6, z: 7.6, rotation: 0.1, scale: 1.3, collide: 0.8 },
  { model: 'log_stack', x: -18.2, z: -9.2, rotation: 1.6, scale: 1.3, collide: 0.8 },
  { model: 'stump_round', x: 4.6, z: 14, rotation: 0.6, scale: 1.4, collide: 0.45 },
  { model: 'fence_planks', x: -11.2, z: 6.2, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'fence_planks', x: -14.2, z: 6.2, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'rock_largeA', x: 0.4, z: -12, rotation: 0.8, scale: 1.0, collide: 0.7 },
];

// Frame: palms and trees beyond the walkable area (north and the sides); none on the south (camera) side.
const rand = seeded(1101);
const FRAME: NatureModel[] = ['tree_palmTall', 'tree_fat', 'tree_palmBend', 'tree_default', 'tree_palmShort'];
for (let i = 0; i < 16; i += 1) {
  decor.push({
    model: FRAME[i % FRAME.length],
    x: round(-30 + i * 4 + rand() * 2),
    z: round(-17 - rand() * 9),
    rotation: round(rand() * 6.28),
    scale: round(1.4 + rand() * 0.5),
    detail: i % 2 === 1,
  });
}
for (const side of [-1, 1]) {
  for (let i = 0; i < 6; i += 1) {
    decor.push({
      model: FRAME[(i + (side > 0 ? 2 : 0)) % FRAME.length],
      x: round(side * (22 + rand() * 4)),
      z: round(-9 + i * 5.5 + rand() * 2),
      rotation: round(rand() * 6.28),
      scale: round(1.3 + rand() * 0.5),
      detail: i % 2 === 1,
    });
  }
}
// Dry grass and stones (lite tier leaves them out), off the plaza, the paths and the houses.
const DETAILS: NatureModel[] = ['grass_large', 'grass', 'rock_smallA', 'stone_smallA', 'flower_yellowA', 'plant_flatTall'];
let placed = 0;
for (let tries = 0; placed < 70 && tries < 600; tries += 1) {
  const x = -19 + rand() * 38;
  const z = -12 + rand() * 31;
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

export const ACEH_SCENE: SceneDefinition = {
  slug: 'aceh',
  provinsiKode: '11',
  nama: 'Aceh',
  assets: {
    nature: '/jelajah/assets/v1/nature.glb',
    player: '/jelajah/assets/v1/player.glb',
  },
  modelScale: 3,
  ground: { width: 160, depth: 160 },
  waterStyle: 'none',
  river: { north: -21, south: -14, bank: 1.8 },
  plaza: PLAZA,
  centrepiece: { x: PLAZA.x, z: PLAZA.z, rotation: 0, size: 4.6, postHeight: 2.0, roofHeight: 2.3, style: 'meunasah' },
  paths: [
    { from: [0, 45], to: [0, PLAZA.z + PLAZA.radius - 0.5], width: 2.6 },
    { from: [-PLAZA.radius + 0.5, -0.5], to: [-12, -2.4], width: 2 },
    { from: [PLAZA.radius - 0.5, -1], to: [12, -3.6], width: 2 },
    { from: [-4.5, PLAZA.z + 4.5], to: [-11.6, 9.4], width: 1.8 },
  ],
  // Beside stand 1, on the side of the entrance path.
  gameSoon: { x: round(PROT_STAND.x - 2.9), z: round(PROT_STAND.z + 1.9), rotation: 0 },
  structures: [
    // Low hills in the warm haze, far to the north.
    { kind: 'mountain', x: -30, z: -52, radius: 22, height: 14, color: '#B19D74' },
    { kind: 'mountain', x: 24, z: -58, radius: 26, height: 18, color: '#A8966F' },
  ],
  spawn: { x: 0, z: 15, rotation: Math.PI },
  walkable: { minX: -19.5, maxX: 19.5, minZ: -12.2, maxZ: 17 },
  houses,
  stands,
  decor,
  fog: { near: 34, far: 110 },
  colors: {
    background: '#EED8B2',
    grass: '#C3B470',
    farGrass: '#B6A866',
    plaza: '#E4CA9E',
    path: '#D6B887',
    bank: '#E2C99C',
    water: '#6FA6AA',
    waterDeep: '#4F8C96',
    ambient: '#FFE7C6',
    sun: '#FFCC8E',
    houseWall: '#6E4B2F',
    housePost: '#3F2A1C',
    houseFloor: '#5B3E27',
    houseRoof: '#8C6C4A',
    houseTrim: '#B84A30',
    standPost: '#6A4A30',
    standRoof: '#7D8E3A',
    standCounter: '#DDC290',
    materials: {
      leafsGreen: '#7F9A46',
      leafsDark: '#66803A',
      leafsFall: '#C7953E',
      grass: '#A9A85A',
      woodBark: '#7E5838',
      woodBarkDark: '#5E4029',
      wood: '#A3744A',
      woodDark: '#6B472C',
      woodInner: '#D6B07C',
      dirt: '#A98A5E',
      stone: '#B3AA9A',
      stoneDark: '#8E877A',
      colorRed: '#C25A3C',
      colorYellow: '#E4B230',
      colorPurple: '#9D7BB0',
    },
  },
};
