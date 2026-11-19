/**
 * The three congklak moves of scene 6 (Phase 19), played by the REAL engine (lib/games/congklak): only
 * legal moves, real sowing, relays and captures. Deterministic: at each step the legal move with the
 * fewest events among those with at least `minEvents` (so something visible happens), ties to the lower
 * hole. Tested in tests/jelajah/concept-live.test.ts.
 */
import { applyMove } from '@/lib/games/congklak/engine';
import { replayEvent } from '@/lib/games/congklak/replay';
import { createInitialState, legalMoves, type CongklakState, type Player } from '@/lib/games/congklak/state';

export interface DemoMove {
  player: Player;
  hole: number;
  /** Pit counts after each event of the move (frame 0 = before the move). */
  frames: number[][];
  /** Ring index of the hand for each frame (where the last seed went), or -1 when not on a pit. */
  hand: number[];
}

export interface CongklakDemo {
  initial: number[];
  moves: DemoMove[];
  final: CongklakState;
}

export function buildCongklakDemo(count = 3, minEvents = 5): CongklakDemo {
  let state = createInitialState(0);
  const initial = [...state.pits];
  const moves: DemoMove[] = [];
  for (let m = 0; m < count && !state.over; m += 1) {
    const options = legalMoves(state).map((hole) => ({ hole, result: applyMove(state, hole) }));
    const visible = options.filter((o) => o.result.events.length >= minEvents);
    const pool = visible.length > 0 ? visible : options;
    pool.sort((a, b) => a.result.events.length - b.result.events.length || a.hole - b.hole);
    const { hole, result } = pool[0];

    const frames: number[][] = [[...state.pits]];
    const hand: number[] = [-1];
    let pits: number[] = [...state.pits];
    for (const event of result.events) {
      pits = replayEvent(pits, event);
      frames.push(pits);
      hand.push('pit' in event && typeof event.pit === 'number' ? event.pit : hand[hand.length - 1]);
    }
    moves.push({ player: state.toMove, hole, frames, hand });
    state = result.state;
  }
  return { initial, moves, final: state };
}
