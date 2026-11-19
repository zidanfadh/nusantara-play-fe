/**
 * Player movement against simple colliders (Phase 11). No physics library: circles and turned boxes
 * on the ground plane, a rectangular walkable area, and push-out resolution (which also gives sliding
 * along walls). Pure functions, unit-tested.
 */
import type { PavilionDef, RectBounds, SceneDefinition, StructureDef, Vec2 } from '@/lib/jelajah/scenes/types';
import { gameSoonCollider } from './game-soon';

export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
}

/** Box with half extents along its local x (width) and z (depth), turned by `rotation` (0 = axis aligned). */
export interface BoxCollider {
  kind: 'box';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotation: number;
}

export type Collider = CircleCollider | BoxCollider;

/** Player radius in metres. */
export const PLAYER_RADIUS = 0.35;

/** Footprint of a PROT stand (pavilion), metres. */
export const STAND_SIZE = { width: 2.8, depth: 2.2 } as const;

/** Stand roof height (top of the ridge) in metres; the sign floats above it. */
export const STAND_ROOF_TOP = 3.05;

/** Extra depth in front of a house (its stairs). */
export const HOUSE_STAIRS_DEPTH = 1.6;

/** World offset → box-local coordinates (local +z = the box's front). */
export function toLocal(box: BoxCollider, x: number, z: number): Vec2 {
  const dx = x - box.x;
  const dz = z - box.z;
  const c = Math.cos(box.rotation);
  const s = Math.sin(box.rotation);
  // Inverse of the rotation used for the meshes (three.js rotation.y): local = R(-θ) · world.
  return [dx * c - dz * s, dx * s + dz * c];
}

function toWorld(box: BoxCollider, lx: number, lz: number): Vec2 {
  const c = Math.cos(box.rotation);
  const s = Math.sin(box.rotation);
  return [box.x + lx * c + lz * s, box.z - lx * s + lz * c];
}

/** Box collider of the plaza centrepiece (the platform plus a small margin). */
export function pavilionCollider(c: PavilionDef): BoxCollider {
  if (c.style === 'arena') {
    // Phase 22: the ring plus the shade shelter behind it (local -z), see addArena in village-geometry.ts.
    const shift = -ARENA_SHELTER_DEPTH / 2;
    return {
      kind: 'box',
      x: c.x + Math.sin(c.rotation) * shift,
      z: c.z + Math.cos(c.rotation) * shift,
      halfW: c.size / 2 + 0.2,
      halfD: c.size / 2 + 0.2 + ARENA_SHELTER_DEPTH / 2,
      rotation: c.rotation,
    };
  }
  if (c.style === 'joglo') {
    // Phase 22: the wide stepped plinth (JOGLO_PLINTH beyond the platform on every side).
    const half = c.size / 2 + JOGLO_PLINTH;
    return { kind: 'box', x: c.x, z: c.z, halfW: half, halfD: half, rotation: c.rotation };
  }
  if (c.style === 'meunasah') {
    // Phase 22: the raised hall plus its front steps (local +z).
    const shift = OPEN_HALL_STEPS / 2;
    return {
      kind: 'box',
      x: c.x + Math.sin(c.rotation) * shift,
      z: c.z + Math.cos(c.rotation) * shift,
      halfW: c.size / 2 + 0.2,
      halfD: c.size / 2 + 0.2 + shift,
      rotation: c.rotation,
    };
  }
  return { kind: 'box', x: c.x, z: c.z, halfW: c.size / 2 + 0.2, halfD: c.size / 2 + 0.2, rotation: c.rotation };
}

/** Phase 22 (Jawa Tengah pendopo): how far the plinth reaches beyond the platform, metres. */
export const JOGLO_PLINTH = 0.6;

/** Phase 22 (Aceh open hall): floor height and the depth of the front steps, metres. */
export const OPEN_HALL_FLOOR = 1.1;
export const OPEN_HALL_STEPS = 1.0;

/** Phase 22: how far the gasing arena's shade shelter reaches beyond the ring's collider (north, local -z). */
export const ARENA_SHELTER_DEPTH = 1.3;

/** Distance from a point to the collider's outline (0 when inside). */
export function distanceToCollider(col: Collider, x: number, z: number): number {
  if (col.kind === 'circle') return Math.max(0, Math.hypot(x - col.x, z - col.z) - col.r);
  const [lx, lz] = toLocal(col, x, z);
  const qx = Math.max(Math.abs(lx) - col.halfW, 0);
  const qz = Math.max(Math.abs(lz) - col.halfD, 0);
  return Math.hypot(qx, qz);
}

/** Moves a circle of `radius` at (x, z) out of one collider. Returns the same point when not touching. */
export function pushOut(col: Collider, x: number, z: number, radius: number): Vec2 {
  if (col.kind === 'circle') {
    const dx = x - col.x;
    const dz = z - col.z;
    const d = Math.hypot(dx, dz);
    const min = col.r + radius;
    if (d >= min) return [x, z];
    if (d < 1e-6) return [col.x, col.z + min]; // exactly at the centre: push south
    return [col.x + (dx / d) * min, col.z + (dz / d) * min];
  }
  const [lx, lz] = toLocal(col, x, z);
  const cx = Math.min(col.halfW, Math.max(-col.halfW, lx));
  const cz = Math.min(col.halfD, Math.max(-col.halfD, lz));
  const ox = lx - cx;
  const oz = lz - cz;
  const d = Math.hypot(ox, oz);
  if (d >= radius) return [x, z];
  if (d > 1e-6) {
    return toWorld(col, cx + (ox / d) * radius, cz + (oz / d) * radius);
  }
  // Centre inside the box: leave through the nearest face.
  const toX = col.halfW - Math.abs(lx);
  const toZ = col.halfD - Math.abs(lz);
  if (toX < toZ) return toWorld(col, Math.sign(lx || 1) * (col.halfW + radius), lz);
  return toWorld(col, lx, Math.sign(lz || 1) * (col.halfD + radius));
}

export function clampToBounds(x: number, z: number, bounds: RectBounds, radius = 0): Vec2 {
  return [
    Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, x)),
    Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, z)),
  ];
}

/**
 * New position after trying to move by (dx, dz): pushed out of every collider (a few passes, so
 * corners between two colliders also resolve) and kept inside the walkable bounds.
 */
export function resolveMove(
  from: Vec2,
  delta: Vec2,
  colliders: readonly Collider[],
  bounds: RectBounds,
  radius = PLAYER_RADIUS,
): Vec2 {
  let [x, z] = clampToBounds(from[0] + delta[0], from[1] + delta[1], bounds, radius);
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (const col of colliders) {
      const [nx, nz] = pushOut(col, x, z, radius);
      if (nx !== x || nz !== z) {
        x = nx;
        z = nz;
        moved = true;
      }
    }
    [x, z] = clampToBounds(x, z, bounds, radius);
    if (!moved) break;
  }
  return [x, z];
}

export function standCollider(stand: { x: number; z: number; rotation: number }): BoxCollider {
  return {
    kind: 'box',
    x: stand.x,
    z: stand.z,
    halfW: STAND_SIZE.width / 2,
    halfD: STAND_SIZE.depth / 2,
    rotation: stand.rotation,
  };
}

/** Every collider of a scene: houses (incl. stairs), stands and the decor items that block. */
export function sceneColliders(scene: SceneDefinition, includeDetail = true): Collider[] {
  const out: Collider[] = [];
  for (const h of scene.houses) {
    // Box centre shifted forward by half the stairs depth, so the stairs block too.
    const shift = HOUSE_STAIRS_DEPTH / 2;
    out.push({
      kind: 'box',
      x: h.x + Math.sin(h.rotation) * shift,
      z: h.z + Math.cos(h.rotation) * shift,
      halfW: h.width / 2,
      halfD: h.depth / 2 + shift,
      rotation: h.rotation,
    });
  }
  for (const s of scene.stands) out.push(standCollider(s));
  if (scene.centrepiece) out.push(pavilionCollider(scene.centrepiece));
  for (const d of scene.decor) {
    if (d.collide === undefined || (d.detail && !includeDetail)) continue;
    if (typeof d.collide === 'number') out.push({ kind: 'circle', x: d.x, z: d.z, r: d.collide });
    else out.push({ kind: 'box', x: d.x, z: d.z, rotation: d.rotation ?? 0, ...d.collide });
  }
  // Phase 22 (appended after the Phase 11 colliders, so existing scenes keep the same list).
  if (scene.gameSoon) out.push(gameSoonCollider(scene.gameSoon));
  for (const s of scene.structures ?? []) out.push(...structureColliders(s));
  return out;
}

/** Phase 22: the footprint colliders of a procedural landmark (none for landmarks outside the walkable area). */
export function structureColliders(s: StructureDef): Collider[] {
  if (s.kind === 'boat') {
    const { halfLength, halfBeam } = boatSize(s.length);
    return [{ kind: 'box', x: s.x, z: s.z, halfW: halfLength, halfD: halfBeam + 0.2, rotation: s.rotation }];
  }
  return [];
}

/** Phase 22: half length and half beam of the boat landmark (the hull's widest point). */
export function boatSize(length: number) {
  return { halfLength: length / 2, halfBeam: length * 0.12 };
}
