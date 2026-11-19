/**
 * Procedural landmarks of the province scenes (Phase 22), appended to the merged village mesh (no extra draw call).
 * One function per `StructureDef` kind. Neutral, low-poly shapes; the UI never names them.
 *
 * Only imported by lib/jelajah/three/* (three.js isolation).
 */
import { Color, CylinderGeometry, Matrix4, PlaneGeometry } from 'three';
import { boatSize } from '@/lib/jelajah/engine/collision';
import type { SceneDefinition, StructureDef } from '@/lib/jelajah/scenes/types';
import { WATER_Y } from './water-level';
import { placement, v, type Builder } from './mesh-builder';

export function addStructures(b: Builder, scene: SceneDefinition) {
  for (const s of scene.structures ?? []) {
    switch (s.kind) {
      case 'jetty':
        addJetty(b, s, scene);
        break;
      case 'mountain':
        addMountain(b, s);
        break;
      case 'terraces':
        addTerraces(b, s);
        break;
      case 'boat':
        addBoat(b, s);
        break;
    }
  }
}

/** Plank walkway on posts standing in the water, from `from` to `to`. */
function addJetty(b: Builder, s: Extract<StructureDef, { kind: 'jetty' }>, scene: SceneDefinition) {
  const c = scene.colors;
  const deckY = s.deckY ?? 0.35;
  const dx = s.to[0] - s.from[0];
  const dz = s.to[1] - s.from[1];
  const length = Math.hypot(dx, dz);
  const m = placement((s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2, Math.atan2(dx, dz));
  const deck = new Color(c.standCounter).multiplyScalar(0.82);
  const post = new Color(c.housePost);
  b.box(m, s.width, 0.12, length, 0, deckY, 0, deck);
  // Plank seams: a slightly darker strip every 1.2 m reads as boards from the camera.
  const seam = new Color(c.standCounter).multiplyScalar(0.66);
  for (let z = -length / 2 + 0.6; z < length / 2; z += 1.2) b.box(m, s.width + 0.02, 0.125, 0.05, 0, deckY + 0.005, z, seam);
  const bottom = WATER_Y - 1.2;
  const postH = deckY - bottom;
  const count = Math.max(2, Math.round(length / 2.2) + 1);
  for (let i = 0; i < count; i += 1) {
    const z = -length / 2 + 0.2 + (i * (length - 0.4)) / (count - 1);
    for (const x of [-s.width / 2 + 0.1, s.width / 2 - 0.1]) b.box(m, 0.16, postH, 0.16, x, bottom + postH / 2, z, post);
  }
}

/**
 * A low-poly mound: an island in the sea or a distant mountain seen through the haze. The ring of the base is
 * irregular (deterministic), the top flattened; `crater` adds a darker rim at the summit.
 */
function addMountain(b: Builder, s: Extract<StructureDef, { kind: 'mountain' }>) {
  const segments = 11;
  const color = new Color(s.color);
  const geometry = new CylinderGeometry(s.radius * (s.crater ? 0.09 : 0.22), s.radius, s.height, segments, 2, false);
  // Irregular base and slopes: scale every vertex ring by a fixed pattern.
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = 1 + 0.09 * Math.sin(Math.atan2(z, x) * 3 + s.x * 0.1) + 0.05 * Math.cos(Math.atan2(z, x) * 5);
    if (pos.getY(i) < s.height / 2 - 1e-6) {
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
  }
  // Flat shading (one normal per face) for the low-poly look.
  const faceted = geometry.toNonIndexed();
  geometry.dispose();
  faceted.computeVertexNormals();
  const m = new Matrix4().makeTranslation(s.x, (s.y ?? 0) + s.height / 2, s.z);
  b.addGeometry(faceted, m, color);
  if (s.crater) {
    const rim = new CylinderGeometry(s.radius * 0.11, s.radius * 0.13, s.height * 0.04, segments);
    b.addGeometry(rim, new Matrix4().makeTranslation(s.x, (s.y ?? 0) + s.height * 1.0, s.z), color.clone().multiplyScalar(0.78));
  }
}

/**
 * Rice terraces: each level is split into segments whose front edge is offset by a fixed wave, so the levels curve
 * gently. A level's earth wall reaches back to the end of the terraces (the next, higher level covers it); its top is
 * a field, or a flooded field with a narrow dike on every other level.
 */
function addTerraces(b: Builder, s: Extract<StructureDef, { kind: 'terraces' }>) {
  const m = placement(s.x, s.z, s.rotation);
  const segments = 6;
  const segW = s.width / segments;
  const end = s.steps * s.stepDepth;
  const wall = new Color(s.wall);
  const field = new Color(s.field);
  const water = new Color(s.water);
  const front = (step: number, seg: number) => (step === 0 ? 0 : step * s.stepDepth + 0.7 * Math.sin(seg * 1.7 + step * 2.3));
  for (let i = 0; i < s.steps; i += 1) {
    const top = (i + 1) * s.stepHeight;
    for (let k = 0; k < segments; k += 1) {
      const x = -s.width / 2 + (k + 0.5) * segW;
      const f = front(i, k);
      const nextF = i + 1 < s.steps ? front(i + 1, k) : end;
      b.box(m, segW + 0.02, top, end - f, x, top / 2, -(f + end) / 2, wall);
      const depth = nextF - f;
      const flooded = i % 2 === 0;
      const at = (y: number) =>
        m.clone().multiply(new Matrix4().makeTranslation(x, y, -(f + nextF) / 2)).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
      b.addGeometry(new PlaneGeometry(segW + 0.02, depth), at(top + 0.012), flooded ? field.clone().lerp(water, 0.15) : field);
      if (flooded) b.addGeometry(new PlaneGeometry(segW - 0.5, Math.max(0.2, depth - 0.7)), at(top + 0.02), water);
    }
  }
}

/**
 * A pinisi-like sailing boat on the sand: a lofted hull through six stations (raised bow and stern), a deck, a stern
 * cabin, two masts with fore-and-aft sails, a bowsprit and a jib. Sails are drawn on both sides.
 */
function addBoat(b: Builder, s: Extract<StructureDef, { kind: 'boat' }>) {
  const m = placement(s.x, s.z, s.rotation);
  const L = s.length;
  const { halfBeam: B } = boatSize(L);
  const hull = new Color(s.hull);
  const hullDark = new Color(s.hull).multiplyScalar(0.8);
  const deck = new Color(s.hull).lerp(new Color('#E8C99A'), 0.55);
  const sail = new Color(s.sail);
  // Stations along the hull: x (fraction of L), half beam (fraction of B), sheer height (m).
  const stations: [number, number, number][] = [
    [-0.5, 0.6, 2.3],
    [-0.36, 0.92, 1.9],
    [-0.1, 1, 1.7],
    [0.16, 0.94, 1.75],
    [0.38, 0.58, 2.05],
    [0.5, 0.06, 2.6],
  ];
  const keelY = 0.15;
  const bilgeY = 0.55;
  const inside = (x: number) => v(x, 1, 0);
  for (let i = 0; i < stations.length - 1; i += 1) {
    const [xa, ba, ha] = stations[i];
    const [xb, bb, hb] = stations[i + 1];
    const Xa = xa * L;
    const Xb = xb * L;
    for (const side of [-1, 1]) {
      // Topside (sheer to bilge) and the lower hull (bilge to keel).
      b.quad(m, v(Xa, ha, side * ba * B), v(Xb, hb, side * bb * B), v(Xb, bilgeY, side * bb * B * 0.82), v(Xa, bilgeY, side * ba * B * 0.82), inside((Xa + Xb) / 2), hull);
      b.quad(m, v(Xa, bilgeY, side * ba * B * 0.82), v(Xb, bilgeY, side * bb * B * 0.82), v(Xb, keelY, side * bb * B * 0.25), v(Xa, keelY, side * ba * B * 0.25), inside((Xa + Xb) / 2), hullDark);
    }
    // Deck a little below the sheer.
    b.quad(m, v(Xa, ha - 0.25, -ba * B * 0.95), v(Xb, hb - 0.25, -bb * B * 0.95), v(Xb, hb - 0.25, bb * B * 0.95), v(Xa, hb - 0.25 + (ha - hb), ba * B * 0.95), v((Xa + Xb) / 2, 0, 0), deck);
  }
  // Stern transom.
  const [xs, bs, hs] = stations[0];
  b.quad(m, v(xs * L, hs, -bs * B), v(xs * L, hs, bs * B), v(xs * L, keelY, bs * B * 0.25), v(xs * L, keelY, -bs * B * 0.25), v(0, 1, 0), hullDark);
  // Stern cabin.
  b.box(m, L * 0.16, 1.2, B * 1.3, -L * 0.37, 2.1 + 0.6, 0, deck.clone().multiplyScalar(0.85));
  b.box(m, L * 0.19, 0.12, B * 1.5, -L * 0.37, 2.1 + 1.26, 0, hullDark);
  // Masts and sails.
  const mast = new Color(s.hull).multiplyScalar(0.7);
  const masts: [number, number][] = [
    [-0.08, 8.2],
    [0.17, 7.2],
  ];
  for (const [mx, h] of masts) {
    const X = mx * L;
    b.box(m, 0.2, h, 0.2, X, 1.7 + h / 2, 0, mast);
    const foot = 2.5;
    const top = 1.7 + h - 0.4;
    const pts = [v(X - 0.15, foot, 0), v(X - 0.15, top, 0), v(X - L * 0.2, top - 1.4, 0), v(X - L * 0.24, foot + 0.3, 0)];
    b.quad(m, pts[0], pts[1], pts[2], pts[3], v(X - 1, 3, 1), sail);
    b.quad(m, pts[0], pts[1], pts[2], pts[3], v(X - 1, 3, -1), sail);
  }
  // Bowsprit and jib.
  const bow = stations[stations.length - 1];
  const sprit = new Matrix4().makeTranslation(bow[0] * L + 1.2, bow[2] + 0.35, 0).multiply(new Matrix4().makeRotationZ(-1.25));
  b.box(m.clone().multiply(sprit), 0.14, 3.0, 0.14, 0, 0, 0, mast);
  const foreTop = v(masts[1][0] * L + 0.1, 1.7 + masts[1][1] - 0.6, 0);
  const jib = [v(masts[1][0] * L + 0.15, 2.6, 0), foreTop, v(bow[0] * L + 2.4, bow[2] + 0.75, 0)];
  b.tri(m, jib[0], jib[1], jib[2], v(L * 0.3, 3, 1), sail);
  b.tri(m, jib[0], jib[1], jib[2], v(L * 0.3, 3, -1), sail);
}
