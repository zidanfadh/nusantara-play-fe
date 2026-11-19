/**
 * Timing of the congklak move animation (Phase 17). Pure: the delay before the NEXT event is shown.
 * Long relay chains speed up after the first 40 seeds, so even a 250-seed move stays short.
 */
import type { MoveEvent } from './engine';
import type { AnimationSpeed } from './settings';

export const STEP_MS = { normal: 230, cepat: 90, tanpa: 0 } as const;
const FAST_AFTER_SEEDS = 40;
const MIN_STEP_MS = 40;

export function eventDelayMs(event: MoveEvent, sownSoFar: number, speed: AnimationSpeed): number {
  const base0 = STEP_MS[speed];
  if (base0 === 0) return 0;
  const base = sownSoFar > FAST_AFTER_SEEDS ? Math.max(MIN_STEP_MS, Math.round(base0 * 0.4)) : base0;
  switch (event.type) {
    case 'pickup':
    case 'relay':
      return Math.round(base * 1.6);
    case 'sow':
      return base;
    case 'capture':
    case 'sweep':
      return base0 * 4;
    default:
      return 0;
  }
}

/** Total animation time of a move (shown nowhere; used by the tests and the headless checks). */
export function moveDurationMs(events: readonly MoveEvent[], speed: AnimationSpeed): number {
  let sown = 0;
  let total = 0;
  for (const e of events) {
    if (e.type === 'sow') sown += 1;
    total += eventDelayMs(e, sown, speed);
  }
  return total;
}
