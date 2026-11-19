/**
 * What the 2d tier's header illustration shows for a scene (Phase 22): derived from the scene data, so every province
 * gets a recognisable flat picture (water, roof shape, plants, landmarks) without a hand-drawn file per province.
 * Pure, unit-tested. Sumatera Selatan → river, limas roof, palms = the Phase 11 picture.
 */
import type { HouseStyle, PavilionStyle, SceneDefinition, WaterStyle } from '@/lib/jelajah/scenes/types';

export interface IllustrationLook {
  water: WaterStyle;
  roof: HouseStyle;
  plants: 'palm' | 'bamboo';
  /** Centrepiece look, when the scene has one. */
  centre: PavilionStyle | null;
  /** Landmark kinds of the scene (StructureDef['kind']), in the scene's order, without duplicates. */
  landmarks: string[];
}

export function illustrationLook(scene: Pick<SceneDefinition, 'waterStyle' | 'houses' | 'decor' | 'centrepiece' | 'structures'>): IllustrationLook {
  const roofs = scene.houses.map((h) => h.style ?? 'limas');
  const roof = roofs.length ? mostCommon(roofs) : 'limas';
  const bamboo = scene.decor.filter((d) => d.model === 'crops_bambooStageA').length;
  const palms = scene.decor.filter((d) => d.model.startsWith('tree_palm')).length;
  const landmarks: string[] = [];
  for (const s of scene.structures ?? []) {
    const kind = (s as { kind: string }).kind;
    if (!landmarks.includes(kind)) landmarks.push(kind);
  }
  return {
    water: scene.waterStyle ?? 'river',
    roof,
    plants: bamboo > palms ? 'bamboo' : 'palm',
    centre: scene.centrepiece ? scene.centrepiece.style ?? 'pavilion' : null,
    landmarks,
  };
}

function mostCommon<T>(values: readonly T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  for (const [v, n] of counts) if (n > (counts.get(best) ?? 0)) best = v;
  return best;
}
