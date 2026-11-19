/** Registry of province scenes by slug (Phase 11). Add a new province by adding its scene file here. */
import { ACEH_SCENE } from './aceh';
import { KEPULAUAN_RIAU_SCENE } from './kepulauan-riau';
import { SUMATERA_SELATAN_SCENE } from './sumatera-selatan';
import type { SceneDefinition } from './types';

export const SCENES: readonly SceneDefinition[] = [SUMATERA_SELATAN_SCENE, KEPULAUAN_RIAU_SCENE, ACEH_SCENE];

export function findScene(slug: string): SceneDefinition | null {
  return SCENES.find((s) => s.slug === slug) ?? null;
}
