/**
 * Types of the Jelajah concept video ("Kenali" + SITE_NAME, Phase 19). The film itself lives in
 * `script.ts` (texts and timings) and `components/jelajah/concept/` (scenes and player).
 */

export type ConceptSceneId = 'halaman' | 'terlupa' | 'nusantara' | 'arsip' | 'jelajah' | 'main' | 'bersama' | 'mulai';

export interface ConceptScene {
  id: ConceptSceneId;
  /** Start on the film's clock, ms. Scenes are contiguous: start = previous start + previous duration. */
  start: number;
  /** Length on the film's clock, ms. */
  duration: number;
  /** Large caption: real text, at most 2 lines at 360 px (≤ 70 characters). */
  caption: string;
  /**
   * Smaller second line. For "arsip" it is built from live data at runtime (`archiveSubcaption`), so the
   * script has none there.
   */
  subcaption?: string;
  /** Cross-fade from the previous scene, ms (centred on the scene boundary). */
  fadeIn: number;
  /**
   * Local progress (0..1) of the frame shown as the still image in the reduced-motion version (also the
   * midpoint used by the screenshots when it differs from 0.5).
   */
  still: number;
}

/** How the film ended. */
export type ConceptEndReason = 'finished' | 'skipped' | 'continued';
