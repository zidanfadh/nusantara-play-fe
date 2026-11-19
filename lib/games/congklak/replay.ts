/**
 * Replays a move's animation events onto the pit counts (Phase 17). The board animation shows the pits
 * after each event; replaying every event of a move gives exactly the state `applyMove` returned (tested).
 */
import type { MoveEvent } from './engine';

/** The pit counts after `event` (a new array; `pits` is not changed). */
export function replayEvent(pits: readonly number[], event: MoveEvent): number[] {
  const out = pits.slice();
  switch (event.type) {
    case 'pickup':
    case 'relay':
      out[event.pit] = 0;
      break;
    case 'sow':
      out[event.pit] = event.count;
      break;
    case 'capture':
      out[event.store] += event.captured;
      out[event.opposite] = 0;
      out[event.pit] = 0;
      break;
    case 'sweep':
      for (const p of event.pits) out[p] = 0;
      out[event.store] += event.amount;
      break;
    default:
      break;
  }
  return out;
}

/** Seeds in the hand after `event` (the hand shown during the animation). */
export function handAfter(hand: number, event: MoveEvent): number {
  switch (event.type) {
    case 'pickup':
    case 'relay':
      return event.count;
    case 'sow':
      return event.hand;
    default:
      return 0;
  }
}
