/**
 * Jawa Tengah (Phase 22): a village at the foot of the terraces. In the plaza an open pendopo with a stepped roof
 * (joglo-style, a loose low-poly hint); behind the village rice terraces step up towards a volcano silhouette in
 * the haze; bamboo groves along both sides; low houses with white walls and terracotta hip roofs.
 *
 * Phase 23: beside stand 1 an egrang practice track (bamboo rails, a start line, a finish banner, bamboo stilts
 * leaning at the start) opens Egrang with the Bambu variant (/main/egrang?varian=bambu). It replaces the Phase 22
 * "Game segera hadir" sign.
 *
 * Only `import type` here (see types.ts). No cultural facts: visible text comes from PROT data or neutral UI text.
 */
import type { DecorDef, HouseDef, NatureModel, SceneDefinition, StandDef } from './types';

const PLAZA = { x: 0, z: 1, radius: 7.5 } as const;
const STAND_RING = 10.6;

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

/** Low house on a short plinth with a hip roof (the Phase 11 roof shape, white walls, terracotta). */
function lowHouse(x: number, z: number, width = 6.4, depth = 5): HouseDef {
  return {
    x,
    z,
    rotation: facing(x, z, PLAZA.x, PLAZA.z),
    width,
    depth,
    floorHeight: 0.5,
    wallHeight: 2.4,
    roofHeight: 2.6,
  };
}

// Order = assignment order of the PROT (sorted by name): SE (nearest to the spawn), SW, NE.
const stands: StandDef[] = [145, 215, 35].map(ringStand);

const houses: HouseDef[] = [lowHouse(-15.6, -5), lowHouse(15.6, -6.5), lowHouse(15.4, 9.5, 5.8, 4.6)];

/** Phase 23: the egrang practice track, east of the entrance path, between stand 1 and the spawn point. */
const EGRANG_TRACK = { x: 6.4, z: 13, size: 6 } as const;

const decor: DecorDef[] = [];
// Bamboo groves along both sides (block the player).
const GROVES: [number, number][] = [
  [-18.4, 3.5],
  [-17.6, 6.8],
  [-18.8, 10.2],
  [-16.2, 14.6],
  [-18.6, -11],
  [18.6, 2.2],
  [18.2, -0.8],
  [11, -11.4],
  [-8.4, -11.6],
];
GROVES.forEach(([x, z], i) => {
  decor.push({ model: 'crops_bambooStageA', x, z, rotation: round(i * 1.37), scale: round(2.3 + (i % 3) * 0.25), collide: 0.75 });
});
decor.push(
  // Trees and bushes near the houses.
  { model: 'tree_oak', x: -9.6, z: 13.8, rotation: 0.8, scale: 1.4, collide: 0.6 },
  { model: 'tree_default', x: 9.4, z: -9.8, rotation: 2.2, scale: 1.4, collide: 0.6 },
  { model: 'plant_bushLarge', x: -11.6, z: -10.6, rotation: 0.5, scale: 1.5, collide: 0.6 },
  { model: 'plant_bush', x: 11.6, z: 3.8, rotation: 1.1, scale: 1.3, collide: 0.5 },
  { model: 'plant_bush', x: -11.2, z: 3.2, rotation: 4.1, scale: 1.3, collide: 0.5 },
  { model: 'pot_large', x: -10.6, z: -2.6, rotation: 0.4, scale: 1.2, collide: 0.6 },
  { model: 'pot_small', x: 10.8, z: -3.2, rotation: 1.2, scale: 1.3, collide: 0.4 },
  { model: 'stump_round', x: 11.4, z: 15.6, rotation: 0.6, scale: 1.4, collide: 0.45 },
  { model: 'fence_simple', x: -3.6, z: -11.6, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
  { model: 'fence_simple', x: 3.6, z: -11.6, rotation: 0, scale: 1, collide: { halfW: 1.5, halfD: 0.25 } },
);

// Frame: trees and bamboo beyond the walkable area on the sides; trees on the terraces' edges.
const rand = seeded(3301);
const FRAME: NatureModel[] = ['tree_oak', 'crops_bambooStageA', 'tree_default', 'tree_fat', 'crops_bambooStageA'];
for (const side of [-1, 1]) {
  for (let i = 0; i < 7; i += 1) {
    const model = FRAME[(i + (side > 0 ? 1 : 0)) % FRAME.length];
    decor.push({
      model,
      x: round(side * (22 + rand() * 4)),
      z: round(-10 + i * 4.6 + rand() * 2),
      rotation: round(rand() * 6.28),
      scale: round((model === 'crops_bambooStageA' ? 2.2 : 1.3) + rand() * 0.5),
      detail: i % 2 === 1,
    });
  }
}
// Small details on the grass (lite tier leaves them out), off the plaza, the paths and the houses.
const DETAILS: NatureModel[] = ['grass', 'grass_large', 'flower_redA', 'flower_yellowA', 'flower_purpleA', 'plant_flatTall'];
let placed = 0;
for (let tries = 0; placed < 60 && tries < 600; tries += 1) {
  const x = -19 + rand() * 38;
  const z = -11 + rand() * 30;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < STAND_RING + 2.2) continue;
  if (Math.abs(x) < 2 && z > 7) continue;
  if (houses.some((h) => Math.hypot(x - h.x, z - h.z) < 5)) continue;
  if (Math.abs(x - EGRANG_TRACK.x) < 4.2 && Math.abs(z - EGRANG_TRACK.z) < 1.8) continue;
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

export const JAWA_TENGAH_SCENE: SceneDefinition = {
  slug: 'jawa-tengah',
  provinsiKode: '33',
  nama: 'Jawa Tengah',
  assets: {
    nature: '/jelajah/assets/v1/nature.glb',
    player: '/jelajah/assets/v1/player.glb',
  },
  modelScale: 3,
  ground: { width: 160, depth: 160 },
  waterStyle: 'none',
  river: { north: -21, south: -14, bank: 1.8 },
  plaza: PLAZA,
  centrepiece: { x: PLAZA.x, z: PLAZA.z, rotation: 0, size: 6, postHeight: 2.4, roofHeight: 2.5, style: 'joglo' },
  paths: [
    { from: [0, 45], to: [0, PLAZA.z + PLAZA.radius - 0.5], width: 2.6 },
    { from: [-PLAZA.radius + 0.5, -1], to: [-12, -3.4], width: 2 },
    { from: [PLAZA.radius - 0.5, -1.5], to: [12, -4.6], width: 2 },
    { from: [5, PLAZA.z + 5.4], to: [12.6, 8.4], width: 1.8 },
  ],
  // Phase 23: the egrang practice track beside stand 1 (replaces the Phase 22 "Game segera hadir" sign).
  gamePavilion: { x: EGRANG_TRACK.x, z: EGRANG_TRACK.z, rotation: 0, size: EGRANG_TRACK.size, postHeight: 2, roofHeight: 0, style: 'egrang', game: 'egrang', variant: 'bambu' },
  structures: [
    {
      kind: 'terraces',
      x: 0,
      z: -13.4,
      rotation: 0,
      width: 96,
      steps: 6,
      stepDepth: 4.2,
      stepHeight: 0.5,
      field: '#8CB45A',
      wall: '#8E7A52',
      water: '#A9CDB8',
    },
    // A volcano and a lower ridge in the haze.
    // Right behind the terraces: the fixed 40-degree camera never shows the horizon, so the volcano has to stand within
    // the frame (its slopes rise into the top of the view, hazed by the fog) rather than far away.
    { kind: 'mountain', x: 6, z: -58, radius: 28, height: 42, color: '#788AA0', crater: true },
    { kind: 'mountain', x: -34, z: -58, radius: 18, height: 15, color: '#879AA8' },
    { kind: 'mountain', x: 40, z: -56, radius: 17, height: 12, color: '#8B9DAA' },
  ],
  spawn: { x: 0, z: 15, rotation: Math.PI },
  walkable: { minX: -19.5, maxX: 19.5, minZ: -12.2, maxZ: 17 },
  houses,
  stands,
  decor,
  fog: { near: 38, far: 130 },
  colors: {
    background: '#E2E8D8',
    grass: '#8FB45C',
    farGrass: '#85AA55',
    plaza: '#D9C8A3',
    path: '#CDB58B',
    bank: '#D9C8A3',
    water: '#A9CDB8',
    waterDeep: '#7FAE9C',
    ambient: '#FFF4E0',
    sun: '#FFE3B2',
    houseWall: '#ECE3CF',
    housePost: '#5C4030',
    houseFloor: '#8A6A4C',
    houseRoof: '#A65838',
    houseTrim: '#D7B25A',
    standPost: '#6B4B33',
    standRoof: '#8E3B2E',
    standCounter: '#DAC39A',
    materials: {
      leafsGreen: '#5E9A42',
      leafsDark: '#4A8236',
      leafsFall: '#C0953E',
      grass: '#7AAE4E',
      woodBark: '#7E5A3C',
      woodBarkDark: '#5E422C',
      wood: '#A9784C',
      woodDark: '#6F4A2E',
      woodInner: '#D8B07C',
      dirt: '#A08860',
      stone: '#ADA79C',
      stoneDark: '#8A847B',
      colorRed: '#C8553D',
      colorYellow: '#E5B028',
      colorPurple: '#9D7BB0',
    },
  },
};
