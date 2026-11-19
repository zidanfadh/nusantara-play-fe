/**
 * Who wins a gasing round (Phase 20), the same rule for Uri and Pangkah ("Aturan dasar"):
 * - a top that leaves the ring loses at once (both out: the one that spun longer wins);
 * - otherwise the top that spun shorter, measured from its own landing, loses. The round is decided as soon
 *   as one top has stopped and the other is out or stopped, or is still spinning and has already spun
 *   longer;
 * - equal times (within DRAW_EPSILON) = draw (the round is replayed).
 * Pure.
 */
import { DEFAULT_RULES, type GasingRules } from './rules';
import type { RoundResult, Side, World } from './types';

/** Spin times closer than this are a draw (seconds). */
export const DRAW_EPSILON = 0.05;

const ended = (phase: string) => phase === 'stopped' || phase === 'out';

/**
 * The round result, or null while it is still open. `allThrown` = every top of the round has been thrown
 * (a top still in the hand cannot have lost on time yet).
 */
export function decideRound(world: World, allThrown: boolean, rules: GasingRules = DEFAULT_RULES): RoundResult | null {
  const [a, b] = world.tops;
  const times: [number, number] = [a.spinTime, b.spinTime];
  const ends: RoundResult['ends'] = [ended(a.phase) ? a.endReason : null, ended(b.phase) ? b.endReason : null];
  const result = (winner: Side | 'draw', reason: RoundResult['reason']): RoundResult => ({ winner, reason, times, ends });

  if (rules.outIsLoss) {
    const outA = a.phase === 'out';
    const outB = b.phase === 'out';
    if (outA && outB) return byTime(times, 'keluar');
    if (outA) return result(1, 'keluar');
    if (outB) return result(0, 'keluar');
  }
  if (!allThrown) return null;
  const doneA = ended(a.phase);
  const doneB = ended(b.phase);
  if (doneA && doneB) return byTime(times, 'lebih-lama');
  if (doneA && b.phase === 'spinning' && b.spinTime > a.spinTime + DRAW_EPSILON) return result(1, 'lebih-lama');
  if (doneB && a.phase === 'spinning' && a.spinTime > b.spinTime + DRAW_EPSILON) return result(0, 'lebih-lama');
  return null;

  function byTime(t: [number, number], reason: RoundResult['reason']): RoundResult {
    if (Math.abs(t[0] - t[1]) <= DRAW_EPSILON) return result('draw', reason);
    return result(t[0] > t[1] ? 0 : 1, reason);
  }
}
