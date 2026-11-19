/**
 * Procedural landmarks of the province scenes (Phase 22), appended to the merged village mesh (no extra draw call).
 * One function per `StructureDef` kind. Neutral, low-poly shapes; the UI never names them.
 *
 * Only imported by lib/jelajah/three/* (three.js isolation).
 */
import { Color, CylinderGeometry, Matrix4, PlaneGeometry } from 'three';
import type { SceneDefinition, StructureDef } from '@/lib/jelajah/scenes/types';
import { WATER_Y } from './water-level';
import { placement, type Builder } from './mesh-builder';

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
