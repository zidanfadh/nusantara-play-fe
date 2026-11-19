/**
 * Data model of a Jelajah province scene (Phase 11). A scene is pure data: the engine
 * (lib/jelajah/engine/*, lib/jelajah/three/*, components/jelajah/three/*) turns it into the walkable
 * 3D village and the 2D fallback, so later provinces only add a new file in this folder.
 *
 * Coordinates: metres on the ground plane, [x, z]. +x = east, -z = north (the river side), +z = south
 * (towards the camera). Rotations are radians around the vertical axis; 0 = facing +z.
 *
 * This file and the scene files may only use `import type` (scripts/check-jelajah-budget.mjs loads
 * them with Node's type stripping).
 *
 * Phase 22: every field added for more provinces is OPTIONAL and its default is the Phase 11 to 17 behaviour,
 * so the Sumatera Selatan data and its 3D output stay exactly the same (tests/jelajah/sumatera-selatan-identity.test.ts).
 */
import type { JelajahGame } from '@/lib/games/links';

/** Nature Kit model names available in the scene assets (see scripts/optimize-jelajah-assets.mjs). */
export type NatureModel =
  | 'tree_palmTall'
  | 'tree_palmBend'
  | 'tree_palmShort'
  | 'tree_default'
  | 'tree_oak'
  | 'tree_fat'
  | 'crops_bambooStageA'
  | 'plant_bushLarge'
  | 'plant_bush'
  | 'plant_flatTall'
  | 'grass'
  | 'grass_large'
  | 'flower_redA'
  | 'flower_yellowA'
  | 'flower_purpleA'
  | 'rock_largeA'
  | 'rock_smallA'
  | 'stone_smallA'
  | 'fence_simple'
  | 'fence_planks'
  | 'log_stack'
  | 'log'
  | 'stump_round'
  | 'pot_large'
  | 'pot_small'
  | 'canoe'
  | 'lily_large'
  | 'lily_small';

export type Vec2 = readonly [number, number];

export interface RectBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Roof and detail style of a procedural house (Phase 22). `limas` = the Phase 11 two-tier hip roof (default). The UI
 * never names a style; the styles are loose, low-poly hints ("terinspirasi"), not reconstructions.
 */
export type HouseStyle = 'limas' | 'malay' | 'aceh';

/** Raised house (rumah panggung), built procedurally. Described in the UI only as "terinspirasi rumah limas". */
export interface HouseDef {
  x: number;
  z: number;
  rotation: number;
  /** Footprint of the walls (metres). */
  width: number;
  depth: number;
  /** Height of the raised floor above the ground. */
  floorHeight: number;
  wallHeight: number;
  roofHeight: number;
  /** Phase 22: roof and detail style (default `limas`). */
  style?: HouseStyle;
  /** Phase 22: the stilts reach this far below the ground (a house standing in the water). Default 0. */
  stiltDepth?: number;
  /** Phase 22: stairs up to the door (default true). */
  stairs?: boolean;
}

/** A PROT stand (procedural wooden pavilion). Size is fixed by the engine (STAND_SIZE). */
export interface StandDef {
  x: number;
  z: number;
  rotation: number;
}

/** Look of the centrepiece (Phase 22). `pavilion` = the Phase 12 open pavilion (default). */
export type PavilionStyle = 'pavilion' | 'arena' | 'meunasah';

/**
 * Neutral centrepiece of the plaza (Phase 12): a small open pavilion (a roof on four posts on a low
 * platform), built procedurally. The UI never names it; it carries no cultural claim.
 */
export interface PavilionDef {
  x: number;
  z: number;
  rotation: number;
  /** Side of the square platform (metres). */
  size: number;
  postHeight: number;
  roofHeight: number;
  /**
   * Phase 17: the pavilion is an interaction point that opens this game (within INTERACT_DISTANCE it shows
   * a "Main Congklak" button). Neutral wording only: no claim about where the game comes from.
   * Phase 22: any hosted game (label and link from lib/games/links.ts).
   */
  game?: JelajahGame;
  /** Phase 22: look of the centrepiece (default `pavilion`). */
  style?: PavilionStyle;
}

/**
 * Phase 22: the "Game segera hadir" sign of a province without a playable game: a small board on a post next to the
 * PROT stand (the post is part of the merged mesh, the text one canvas-textured plane facing `rotation`).
 */
export interface GameSoonDef {
  x: number;
  z: number;
  rotation: number;
}

/**
 * Phase 22: procedural landmarks of a province, merged into the village mesh (no extra draw call). Each kind is
 * drawn by lib/jelajah/three/structures.ts; `collide` blocks the player with the structure's footprint.
 */
export type StructureDef =
  /** Plank walkway on posts in the water (deck height default 0.35 m). */
  | { kind: 'jetty'; from: Vec2; to: Vec2; width: number; deckY?: number }
  /** Low-poly mound: an island or, with `crater`, a distant mountain seen through the haze. Not walkable. */
  | { kind: 'mountain'; x: number; z: number; radius: number; height: number; color: string; crater?: boolean; y?: number };

export interface DecorDef {
  model: NatureModel;
  x: number;
  z: number;
  rotation?: number;
  /** Multiplier on the scene's modelScale. */
  scale?: number;
  /** Decorative detail: left out on the lite tier. */
  detail?: boolean;
  /** Height offset in metres (e.g. objects floating on the river). */
  y?: number;
  /**
   * Blocks the player: a radius in metres (circle), or half extents of a box turned with `rotation`.
   * Omitted = walk-through.
   */
  collide?: number | { halfW: number; halfD: number };
}

export interface PathDef {
  from: Vec2;
  to: Vec2;
  width: number;
}

/** sRGB hex colours of the scene. The 3D scene keeps one look in light and dark site themes. */
export interface SceneColors {
  background: string;
  grass: string;
  farGrass: string;
  plaza: string;
  path: string;
  bank: string;
  water: string;
  waterDeep: string;
  ambient: string;
  sun: string;
  houseWall: string;
  housePost: string;
  houseFloor: string;
  houseRoof: string;
  houseTrim: string;
  standPost: string;
  standRoof: string;
  standCounter: string;
  /** Kenney material name → colour, applied when the models are baked. */
  materials: Record<string, string>;
}

/** Phase 22: what lies north of the village. `river` = the Phase 11 river with a far bank (default). */
export type WaterStyle = 'river' | 'sea' | 'none';

export interface SceneDefinition {
  slug: string;
  provinsiKode: string;
  nama: string;
  /** Public URLs of the asset files this scene needs (all counted by pnpm check:jelajah). */
  assets: { nature: string; player: string };
  /** 1 Nature Kit unit = this many metres. */
  modelScale: number;
  /** Ground plane size, centred on the origin. */
  ground: { width: number; depth: number };
  /**
   * River strip along the north side: z from `north` to `south` (north < south). With `waterStyle: 'sea'` only
   * `south` (the shoreline) and `bank` (the beach width south of it) are used; with `'none'` it is ignored.
   */
  river: { north: number; south: number; bank: number };
  /** Phase 22: river (default), sea up to the horizon, or no water at all (no water mesh). */
  waterStyle?: WaterStyle;
  plaza: { x: number; z: number; radius: number };
  /** Optional centrepiece in the plaza (blocks the player). */
  centrepiece?: PavilionDef;
  paths: readonly PathDef[];
  spawn: { x: number; z: number; rotation: number };
  /** The player stays inside this rectangle. */
  walkable: RectBounds;
  houses: readonly HouseDef[];
  /** Exactly the stands that get PROT, in assignment order. */
  stands: readonly StandDef[];
  decor: readonly DecorDef[];
  /** Phase 22: procedural landmarks (jetty, boat, terraces, a distant mountain ...). */
  structures?: readonly StructureDef[];
  /** Phase 22: provinces without a playable game show this sign next to their PROT stand. */
  gameSoon?: GameSoonDef;
  /** Phase 22: fog distances in metres (default 34 to 80), e.g. to let a distant silhouette show through the haze. */
  fog?: { near: number; far: number };
  colors: SceneColors;
}
