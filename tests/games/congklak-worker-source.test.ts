import { describe, expect, it } from 'vitest';
import { aiWorkerSource } from '@/lib/games/congklak/ai-worker-source';
import type { AiResponse } from '@/lib/games/congklak/ai-protocol';
import { applyMove } from '@/lib/games/congklak/engine';
import { DEFAULT_RULES } from '@/lib/games/congklak/rules';
import { createInitialState, legalMoves } from '@/lib/games/congklak/state';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Runs the worker text in its own function scope with a fake `self`, like a Blob worker. */
function bootWorker() {
  const posted: AiResponse[] = [];
  const self: { onmessage?: (e: { data: unknown }) => void; postMessage: (m: AiResponse) => void } = {
    postMessage: (m) => void posted.push(m),
  };
  new Function('self', 'performance', aiWorkerSource())(self, { now: () => performance.now() });
  return { self, posted };
}

describe('congklak AI worker source (Blob worker)', () => {
  it('is self-contained: runs in isolation and answers with a legal move for every level', () => {
    const { self, posted } = bootWorker();
    expect(typeof self.onmessage).toBe('function');
    let state = createInitialState(1);
    state = applyMove(state, 3).state;
    const levels = ['mudah', 'sedang', 'sulit'] as const;
    levels.forEach((level, i) =>
      self.onmessage!({ data: { id: i + 1, state, level, seed: 42, rules: DEFAULT_RULES, timeLimitMs: 50 } }),
    );
    expect(posted).toHaveLength(3);
    for (const [i, r] of posted.entries()) {
      expect(r.id).toBe(i + 1);
      expect(r.error).toBeUndefined();
      expect(legalMoves(state)).toContain(r.hole);
    }
  });

  it('answers with an error, never throws, for a finished game', () => {
    const { self, posted } = bootWorker();
    const over = { ...createInitialState(0), over: true, winner: 'draw' as const };
    self.onmessage!({ data: { id: 7, state: over, level: 'mudah', seed: 1, rules: DEFAULT_RULES } });
    expect(posted[0]).toMatchObject({ id: 7, error: expect.stringContaining('no legal move') });
  });

  it('core.ts only imports types and uses no classes, async code or generators', () => {
    const src = readFileSync(fileURLToPath(new URL('../../lib/games/congklak/core.ts', import.meta.url)), 'utf8');
    for (const line of src.split('\n').filter((l) => /^import\b/.test(l))) expect(line).toMatch(/^import type\b/);
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bclass\s|\basync\b|\bawait\b|function\*/);
  });
});
