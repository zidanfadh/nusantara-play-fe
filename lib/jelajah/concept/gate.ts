/**
 * What plays before the /jelajah map (Phase 19): intro bumper (once per day, lib/jelajah/bumper/session.ts)
 * → concept video (first visit per browser, ./seen.ts) → map. Pure; tested in tests/jelajah/concept-gate.test.ts.
 * This module is imported by the hub, so it must stay tiny (no script texts, no scenes).
 */

export type IntroStep = 'bumper' | 'concept';

/**
 * Label of the map's replay button. It lives here (not in script.ts) because the map page loads it before
 * the film: importing script.ts there would put every caption into /jelajah's initial JS. script.ts
 * re-exports it, so the copy is still edited from the script's list of texts.
 */
export const CONCEPT_REPLAY_LABEL = 'Tonton pengenalan';

export interface IntroInputs {
  /** The bumper's daily rule says it plays today. */
  bumperDue: boolean;
  /** The concept video was already played (or skipped) in this browser. */
  conceptSeen: boolean;
  /** `?concept=1`: play it anyway (testing), like `?debug=1`. */
  forced: boolean;
}

/** The intro steps in order; empty = straight to the map. */
export function planIntro({ bumperDue, conceptSeen, forced }: IntroInputs): IntroStep[] {
  const steps: IntroStep[] = [];
  if (bumperDue) steps.push('bumper');
  if (forced || !conceptSeen) steps.push('concept');
  return steps;
}

/** The step after `current` (null = the map). */
export function nextIntroStep(plan: readonly IntroStep[], current: IntroStep): IntroStep | null {
  const i = plan.indexOf(current);
  return i >= 0 && i + 1 < plan.length ? plan[i + 1] : null;
}

/** `?concept=1` (exactly) forces the concept video. */
export function isConceptForced(search: string): boolean {
  try {
    return new URLSearchParams(search).get('concept') === '1';
  } catch {
    return false;
  }
}
