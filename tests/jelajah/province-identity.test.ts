/**
 * Phase 23: geometry fingerprints of the other enterable provinces (Sumatera Selatan has its own test,
 * sumatera-selatan-identity.test.ts). Kepulauan Riau and Aceh were recorded on the phase branch BEFORE the Phase 23
 * engine changes (separate game pavilion, egrang practice track) and must stay the same; Jawa Tengah and
 * Sulawesi Selatan were recorded AFTER the change (their sign became the egrang track), so any later change to
 * them is deliberate. Same hashes as the Sumatera Selatan test: merged village mesh, water (both tiers),
 * colliders, camera framing points and the scene data itself.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { spawnFramePoints } from '@/lib/jelajah/engine/camera';
import { sceneColliders } from '@/lib/jelajah/engine/collision';
import { findScene } from '@/lib/jelajah/scenes';
import { buildVillageGeometry, buildWaterGeometry } from '@/lib/jelajah/three/village-geometry';

function hashGeometry(g: BufferGeometry | null): string | null {
  if (!g) return null;
  const h = createHash('sha256');
  for (const name of ['position', 'normal', 'color']) {
    const attr = g.getAttribute(name);
    h.update(name);
    h.update(Buffer.from((attr.array as Float32Array).buffer));
  }
  return h.digest('hex').slice(0, 16);
}

const hashJson = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

const FINGERPRINTS: Record<string, Record<string, string | null>> = {
  // Before Phase 23 (unchanged since Phase 22).
  'kepulauan-riau': { village: '5c27eeaf67edf5e9', waterFull: '7978bee38b16435d', waterLite: 'fae696a4f5de7595', colliders: '2ad40af0394e1000', framePoints: '88011e1e05aea363', scene: '4f76e172e95abb29' },
  aceh: { village: 'bca462488707845b', waterFull: null, waterLite: null, colliders: 'f4b5e698a845a382', framePoints: '2e14d356d6d86b4f', scene: 'ad746eb42b447b6d' },
  // After Phase 23 (egrang practice track instead of the "Game segera hadir" sign).
  'jawa-tengah': { village: '7ca8f50f5e1a61f2', waterFull: null, waterLite: null, colliders: 'f4f9bac4dde6254b', framePoints: '918a7dc6ed3fb884', scene: 'b930145a6b048f03' },
  'sulawesi-selatan': { village: 'cdb8a6700dba2f21', waterFull: 'dd627e48b4fccd00', waterLite: 'd5a34cceda81a0b4', colliders: '8b8ace11fa2626ad', framePoints: '30673069de02aa99', scene: '10a744a01106ab22' },
};

describe.each(Object.keys(FINGERPRINTS))('%s fingerprints (Phase 23)', (slug) => {
  it('same merged village mesh, water, colliders, camera framing and scene data', () => {
    const scene = findScene(slug)!;
    expect({
      village: hashGeometry(buildVillageGeometry(scene)),
      waterFull: hashGeometry(buildWaterGeometry(scene, true)),
      waterLite: hashGeometry(buildWaterGeometry(scene, false)),
      colliders: hashJson(sceneColliders(scene, true)),
      framePoints: hashJson(spawnFramePoints(scene)),
      scene: hashJson(scene),
    }).toEqual(FINGERPRINTS[slug]);
  });
});
