/**
 * The congklak engine and computer opponent in ONE self-contained function (Phase 17).
 *
 * Why one function: the AI runs in a Web Worker, and the bundler of this Next.js version (Turbopack, Next
 * 16.1) copies `new Worker(new URL('./x.ts', import.meta.url))` files as raw assets instead of bundling
 * them. ai-client.ts therefore starts the worker from a Blob whose source is `congklakCore.toString()`
 * plus a small message handler (ai-worker-source.ts). For that to work this function must not reference
 * ANYTHING outside its own body (only `import type`, which is erased, and browser globals). A test runs
 * the generated worker source in isolation.
 *
 * state.ts, engine.ts, ai.ts and random.ts are thin typed wrappers around this core; the rules config
 * stays in rules.ts and is always passed in (`rules` argument), so there is still one place for it.
 * Keep to plain syntax here (functions, objects, arrays; no classes, no async, no generators) so the
 * compiled output never needs a helper from outside the function.
 */
import type { AiChoice, AiLevel, AiOptions } from './ai';
import type { MoveEvent, MoveSummary, TurnEndReason } from './engine';
import type { Rng } from './random';
import type { CongklakRules } from './rules';
import type { CongklakState, Player, Winner } from './state';

export function congklakCore() {
  // ---- random -------------------------------------------------------------------------------------
  function createRng(seed: number): Rng {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomInt(rng: Rng, n: number): number {
    return Math.floor(rng() * n);
  }
  function pick<T>(rng: Rng, items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() from an empty list');
    return items[randomInt(rng, items.length)];
  }

  // ---- board model --------------------------------------------------------------------------------
  const other = (p: Player): Player => (p === 0 ? 1 : 0);
  const pitCount = (rules: CongklakRules) => 2 * rules.holesPerSide + 2;
  const storeIndex = (player: Player, rules: CongklakRules) => (player === 0 ? rules.holesPerSide : 2 * rules.holesPerSide + 1);
  const holeIndex = (player: Player, hole: number, rules: CongklakRules) => (player === 0 ? hole : rules.holesPerSide + 1 + hole);
  const isStore = (pit: number, rules: CongklakRules) => pit === rules.holesPerSide || pit === 2 * rules.holesPerSide + 1;
  const ownerOf = (pit: number, rules: CongklakRules): Player => (pit <= rules.holesPerSide ? 0 : 1);
  const oppositeOf = (pit: number, rules: CongklakRules) => 2 * rules.holesPerSide - pit;

  function createInitialState(starting: Player, rules: CongklakRules): CongklakState {
    const pits = new Array<number>(pitCount(rules)).fill(rules.seedsPerHole);
    pits[storeIndex(0, rules)] = 0;
    pits[storeIndex(1, rules)] = 0;
    return { pits, toMove: starting, over: false, winner: null };
  }
  function seedsOnSide(pits: readonly number[], player: Player, rules: CongklakRules): number {
    let sum = 0;
    for (let h = 0; h < rules.holesPerSide; h++) sum += pits[holeIndex(player, h, rules)];
    return sum;
  }
  function legalMoves(state: CongklakState, rules: CongklakRules): number[] {
    if (state.over) return [];
    const out: number[] = [];
    for (let h = 0; h < rules.holesPerSide; h++) if (state.pits[holeIndex(state.toMove, h, rules)] > 0) out.push(h);
    return out;
  }
  function isLegalMove(state: CongklakState, hole: number, rules: CongklakRules): boolean {
    return (
      !state.over &&
      Number.isInteger(hole) &&
      hole >= 0 &&
      hole < rules.holesPerSide &&
      state.pits[holeIndex(state.toMove, hole, rules)] > 0
    );
  }

  // ---- move engine (see engine.ts for the rules in words) -----------------------------------------
  function isDevelopment(): boolean {
    // The bundler replaces process.env.NODE_ENV with a literal; inside the worker `process` does not exist
    // and the ReferenceError means "not development".
    try {
      return process.env.NODE_ENV !== 'production';
    } catch {
      return false;
    }
  }

  function runMove(
    state: CongklakState,
    hole: number,
    rules: CongklakRules,
    events: MoveEvent[] | null,
  ): { state: CongklakState; summary: MoveSummary } {
    if (!isLegalMove(state, hole, rules)) {
      const err = new Error(`Illegal congklak move: hole ${hole}`);
      err.name = 'IllegalMoveError';
      throw err;
    }
    const len = pitCount(rules);
    const pits = state.pits.slice();
    const player = state.toMove;
    const ownStore = storeIndex(player, rules);
    const oppStore = storeIndex(other(player), rules);

    let pos = holeIndex(player, hole, rules);
    let hand = pits[pos];
    pits[pos] = 0;
    if (events) events.push({ type: 'pickup', player, pit: pos, count: hand });

    let sown = 0;
    let relays = 0;
    let captured = 0;
    let passedStore = false;
    let extraTurn = false;
    let safetyLimit = false;
    let reason: TurnEndReason = 'empty-opponent';

    for (;;) {
      while (hand > 0) {
        pos = (pos + 1) % len;
        if (pos === oppStore) pos = (pos + 1) % len;
        pits[pos] += 1;
        hand -= 1;
        sown += 1;
        if (pos === ownStore) passedStore = true;
        if (events) events.push({ type: 'sow', pit: pos, count: pits[pos], hand });
      }
      if (pos === ownStore) {
        extraTurn = true;
        break;
      }
      if (pits[pos] > 1) {
        // Relay sowing. A hand never holds more than the board's seeds, so checking before the pickup keeps
        // the move at or below the limit.
        if (sown + pits[pos] > rules.maxSowPerMove) {
          safetyLimit = true;
          reason = 'safety-limit';
          if (isDevelopment()) console.warn(`[congklak] safety limit reached after ${sown} seeds; the turn ends`);
          break;
        }
        hand = pits[pos];
        pits[pos] = 0;
        relays += 1;
        if (events) events.push({ type: 'relay', pit: pos, count: hand });
        continue;
      }
      // The last seed landed in an empty small hole.
      if (ownerOf(pos, rules) === player) {
        const opposite = oppositeOf(pos, rules);
        if (pits[opposite] > 0 && (!rules.captureRequiresLap || passedStore)) {
          captured = pits[opposite] + 1;
          pits[ownStore] += captured;
          pits[opposite] = 0;
          pits[pos] = 0;
          if (events) events.push({ type: 'capture', player, pit: pos, opposite, captured, store: ownStore });
          reason = 'capture';
        } else {
          reason = 'empty-own';
        }
      } else {
        reason = 'empty-opponent';
      }
      break;
    }

    let next: Player = player;
    if (extraTurn) {
      if (events) events.push({ type: 'extra-turn', player });
    } else {
      next = other(player);
      if (events) events.push({ type: 'turn-end', reason, next });
    }
    const summary: MoveSummary = { player, sown, relays, captured, extraTurn, safetyLimit, lastPit: pos };

    // Game end: the player whose turn it is has no seeds in their small holes.
    if (seedsOnSide(pits, next, rules) === 0) {
      const sweeper = other(next);
      const store = storeIndex(sweeper, rules);
      const swept: number[] = [];
      let amount = 0;
      for (let h = 0; h < rules.holesPerSide; h++) {
        const i = holeIndex(sweeper, h, rules);
        if (pits[i] > 0) {
          swept.push(i);
          amount += pits[i];
          pits[i] = 0;
        }
      }
      pits[store] += amount;
      if (events) events.push({ type: 'sweep', player: sweeper, pits: swept, amount, store });
      const final: [number, number] = [pits[storeIndex(0, rules)], pits[storeIndex(1, rules)]];
      const winner: Winner = final[0] === final[1] ? 'draw' : final[0] > final[1] ? 0 : 1;
      if (events) events.push({ type: 'game-over', scores: final, winner });
      return { state: { pits, toMove: next, over: true, winner }, summary };
    }
    return { state: { pits, toMove: next, over: false, winner: null }, summary };
  }

  // ---- computer opponent (see ai.ts for the levels in words) --------------------------------------
  const WIN = 10_000;
  const TIMEOUT = { timeout: true };

  function evaluate(state: CongklakState, me: Player, rules: CongklakRules): number {
    const diff = state.pits[storeIndex(me, rules)] - state.pits[storeIndex(other(me), rules)];
    if (state.over) {
      if (state.winner === 'draw') return 0;
      return state.winner === me ? WIN + diff : -WIN + diff;
    }
    return diff;
  }

  function chooseSedang(state: CongklakState, rules: CongklakRules, rng: Rng): number {
    const me = state.toMove;
    const before = state.pits[storeIndex(me, rules)];
    let best: number[] = [];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const hole of legalMoves(state, rules)) {
      const r = runMove(state, hole, rules, null);
      let score = r.state.pits[storeIndex(me, rules)] - before;
      if (r.summary.extraTurn && !r.state.over) score += 3;
      if (r.summary.captured > 0) score += 1;
      if (r.state.over) score += r.state.winner === me ? 1000 : r.state.winner === 'draw' ? 0 : -1000;
      if (score > bestScore) {
        bestScore = score;
        best = [hole];
      } else if (score === bestScore) best.push(hole);
    }
    return pick(rng, best);
  }

  function chooseSulit(
    state: CongklakState,
    rules: CongklakRules,
    rng: Rng,
    timeLimitMs: number,
    maxDepth: number,
    now: () => number,
  ): AiChoice {
    const me = state.toMove;
    const moves = legalMoves(state, rules);
    if (moves.length === 1) return { hole: moves[0], depth: 0 };
    const deadline = Number.isFinite(timeLimitMs) ? now() + timeLimitMs : Number.POSITIVE_INFINITY;
    let nodes = 0;

    const search = (s: CongklakState, depth: number, alpha: number, beta: number): number => {
      if (s.over || depth === 0) return evaluate(s, me, rules);
      if ((++nodes & 255) === 0 && now() > deadline) throw TIMEOUT;
      const maximizing = s.toMove === me;
      let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      for (const hole of legalMoves(s, rules)) {
        const v = search(runMove(s, hole, rules, null).state, depth - 1, alpha, beta);
        if (maximizing) {
          if (v > value) value = v;
          if (value > alpha) alpha = value;
        } else {
          if (v < value) value = v;
          if (value < beta) beta = value;
        }
        if (alpha >= beta) break;
      }
      return value;
    };

    // Random order among equals at the root (shuffled once), then the previous best first.
    let order = moves.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    let bestHole = order[0];
    let bestDepth = 0;
    const children: Record<number, CongklakState> = {};
    for (const h of order) children[h] = runMove(state, h, rules, null).state;

    for (let depth = 1; depth <= maxDepth; depth++) {
      try {
        let alpha = Number.NEGATIVE_INFINITY;
        let iterBest = order[0];
        for (const hole of order) {
          const v = search(children[hole], depth - 1, alpha, Number.POSITIVE_INFINITY);
          if (v > alpha) {
            alpha = v;
            iterBest = hole;
          }
        }
        bestHole = iterBest;
        bestDepth = depth;
        order = [iterBest].concat(order.filter((h) => h !== iterBest));
        if (Math.abs(alpha) >= WIN / 2) break; // the result is decided
      } catch (e) {
        if (e === TIMEOUT) break;
        throw e;
      }
    }
    return { hole: bestHole, depth: bestDepth };
  }

  function chooseAiMove(
    state: CongklakState,
    level: AiLevel,
    rules: CongklakRules,
    options: Pick<AiOptions, 'rng' | 'timeLimitMs' | 'maxDepth' | 'now'> & { timeLimitMs: number; maxDepth: number },
  ): AiChoice {
    const moves = legalMoves(state, rules);
    if (moves.length === 0) throw new Error('chooseAiMove: no legal move');
    if (level === 'mudah') return { hole: pick(options.rng, moves), depth: 0 };
    if (level === 'sedang') return { hole: chooseSedang(state, rules, options.rng), depth: 0 };
    return chooseSulit(state, rules, options.rng, options.timeLimitMs, options.maxDepth, options.now ?? (() => Date.now()));
  }

  return {
    createRng,
    randomInt,
    pick,
    other,
    pitCount,
    storeIndex,
    holeIndex,
    isStore,
    ownerOf,
    oppositeOf,
    createInitialState,
    seedsOnSide,
    legalMoves,
    isLegalMove,
    runMove,
    chooseAiMove,
  };
}

export type CongklakCore = ReturnType<typeof congklakCore>;

/** The core used on the main thread and in the tests. */
export const core: CongklakCore = congklakCore();
