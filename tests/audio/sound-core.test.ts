import { describe, expect, it } from 'vitest';
import { soundCore, type SoundId, type SoundRef } from '@/lib/audio/core';
import { BEM, bemStep, GONG_HZ, pelog, PELOG_CENTS } from '@/lib/audio/pitch';
import { renderWorkerSource } from '@/lib/audio/render-worker-source';

const core = soundCore();
const SR = 24000;

/** One ref per sound id, with typical parameters from the cue sheet. */
const ALL: SoundRef[] = [
  { id: 'saron', hz: pelog(3) },
  { id: 'bonang', hz: pelog(5, 1) },
  { id: 'gong', hz: GONG_HZ },
  { id: 'dang' },
  { id: 'tak' },
  { id: 'kecapi', hz: pelog(6) },
  { id: 'pad', notes: [pelog(1, -1), pelog(3, -1), pelog(5, -1)], len: 6.5 },
  { id: 'drone', hz: pelog(1, -2), len: 5.6 },
  { id: 'whoosh', len: 2.7, up: false },
  { id: 'whoosh', len: 1.5, up: true },
  { id: 'wind', len: 7 },
  { id: 'gust', len: 2.6 },
  { id: 'dust', len: 3.4 },
  { id: 'paper' },
  { id: 'tap' },
  { id: 'stamp' },
  { id: 'seed', v: 2 },
  { id: 'gasing', len: 8.7 },
  { id: 'cricket', v: 1 },
  { id: 'bird', v: 3 },
  { id: 'chime', hz: pelog(5, 1) },
  { id: 'sparkle', notes: [bemStep(0, 2), bemStep(1, 2), bemStep(2, 2), bemStep(3, 2)] },
  { id: 'shimmer', notes: [bemStep(5, 1), bemStep(7, 1), bemStep(8, 1)], len: 3 },
  { id: 'swell', notes: [pelog(1, -1), pelog(5, -1)], len: 4.2 },
  { id: 'tick' },
];

const rms = (chs: Float32Array[]) => {
  let s = 0;
  let n = 0;
  for (const ch of chs) {
    for (const x of ch) s += x * x;
    n += ch.length;
  }
  return Math.sqrt(s / n);
};

describe('sound core (Phase 21)', () => {
  it('covers every sound id', () => {
    const ids = new Set(ALL.map((r) => r.id));
    const expected: SoundId[] = [
      'saron', 'bonang', 'gong', 'dang', 'tak', 'kecapi', 'pad', 'drone', 'whoosh', 'wind', 'gust', 'dust',
      'paper', 'tap', 'stamp', 'seed', 'gasing', 'cricket', 'bird', 'chime', 'sparkle', 'shimmer', 'swell', 'tick',
    ];
    expect([...ids].sort()).toEqual([...expected].sort());
  });

  it('every sound renders non-silent, finite, with a peak of at most 1.0 (normalized to 0.9)', () => {
    const times: string[] = [];
    let total = 0;
    for (const ref of ALL) {
      const sr = core.rateFor(ref.id, SR);
      const t0 = performance.now();
      const chs = core.renderSound(ref, sr);
      const ms = performance.now() - t0;
      total += ms;
      times.push(`${core.soundKey(ref)} ${ms.toFixed(1)} ms`);
      expect(chs.length === 1 || chs.length === 2).toBe(true);
      let finite = true;
      for (const ch of chs) for (let i = 0; i < ch.length; i += 1) if (!Number.isFinite(ch[i])) finite = false;
      expect(finite).toBe(true);
      const peak = core.peakOf(chs);
      expect(peak).toBeLessThanOrEqual(1);
      expect(peak).toBeGreaterThan(0.85);
      expect(rms(chs)).toBeGreaterThan(0.01);
      // Ends at silence (faded): no click when the buffer stops.
      for (const ch of chs) expect(Math.abs(ch[ch.length - 1])).toBeLessThan(1e-3);
    }
    // Measured, not a performance gate: Node's first (cold) run; the browser numbers are in the report.
    console.info(`[phase-21] rendered ${ALL.length} sounds in ${total.toFixed(0)} ms (Node, cold JIT): ${times.join('; ')}`);
    expect(total).toBeLessThan(5000);
  });

  it('is deterministic: the same ref renders the same samples; variants differ', () => {
    for (const ref of [ALL[0], ALL[2], { id: 'seed', v: 1 } as SoundRef, { id: 'wind', len: 3 } as SoundRef]) {
      const sr = core.rateFor(ref.id, SR);
      const a = core.renderSound(ref, sr);
      const b = soundCore().renderSound(ref, sr);
      expect(a.length).toBe(b.length);
      a.forEach((ch, i) => expect(Buffer.from(ch.buffer).equals(Buffer.from(b[i].buffer))).toBe(true));
    }
    const v1 = core.renderSound({ id: 'seed', v: 1 }, SR)[0];
    const v2 = core.renderSound({ id: 'seed', v: 2 }, SR)[0];
    expect(Buffer.from(v1.buffer).equals(Buffer.from(v2.buffer))).toBe(false);
  });

  it('keys are stable and include every parameter', () => {
    expect(core.soundKey({ id: 'saron', hz: 343.2399 })).toBe('saron|h343.24');
    expect(core.soundKey({ id: 'whoosh', len: 2.7, up: false })).toBe('whoosh|l2.70|down');
    expect(core.soundKey({ id: 'pad', notes: [146.83, 171.62], len: 6 })).toBe('pad|n146.8,171.6|l6.00');
    expect(core.soundKey({ id: 'seed', v: 3 })).toBe('seed|v3');
  });

  it('dark sounds render at half the base rate, bright ones at the base rate', () => {
    expect(core.rateFor('pad', SR)).toBe(12000);
    expect(core.rateFor('gong', SR)).toBe(12000);
    expect(core.rateFor('saron', SR)).toBe(24000);
    expect(core.rateFor('seed', SR)).toBe(24000);
  });

  it('the metallophone has two detuned voices (ombak): left and right differ', () => {
    const [l, r] = core.renderSound({ id: 'saron', hz: pelog(1) }, SR);
    let diff = 0;
    for (let i = 0; i < l.length; i += 1) diff += Math.abs(l[i] - r[i]);
    expect(diff / l.length).toBeGreaterThan(0.01);
  });

  it('the gong rings for about 6 s: still audible at 5 s, quiet at the end', () => {
    const sr = core.rateFor('gong', SR);
    const [l] = core.renderSound({ id: 'gong', hz: GONG_HZ }, sr);
    const window = (from: number) => rms([l.subarray(Math.round(from * sr), Math.round((from + 0.5) * sr))]);
    expect(l.length / sr).toBeGreaterThanOrEqual(6.5);
    expect(window(5)).toBeGreaterThan(0.005);
    expect(window(0.2)).toBeGreaterThan(window(5) * 3);
  });

  it('the impulse response is stereo, seeded and decays', () => {
    const [a] = core.renderImpulse(48000, 1.9, 0.42);
    const [b] = soundCore().renderImpulse(48000, 1.9, 0.42);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    expect(rms([a.subarray(0, 4800)])).toBeGreaterThan(rms([a.subarray(a.length - 4800)]) * 20);
  });
});

describe('render worker source (Blob worker)', () => {
  it('is self-contained: runs in isolation and answers with the same samples, in request order', () => {
    const posted: { key?: string; sr?: number; ch?: Float32Array[]; impulse?: boolean; error?: string }[] = [];
    const self: { onmessage?: (e: { data: unknown }) => void; postMessage: (m: (typeof posted)[number]) => void } = {
      postMessage: (m) => void posted.push(m),
    };
    new Function('self', 'performance', renderWorkerSource())(self, { now: () => performance.now() });
    const refs: SoundRef[] = [{ id: 'gong', hz: GONG_HZ }, { id: 'seed', v: 1 }];
    self.onmessage!({ data: { refs, base: SR, half: true, impulse: { sr: 48000, seconds: 0.5, decay: 0.2 } } });
    expect(posted.map((m) => (m.impulse ? 'impulse' : m.key))).toEqual(['impulse', 'gong|h65.00', 'seed|v1']);
    expect(posted.every((m) => m.error === undefined)).toBe(true);
    expect(posted[1].sr).toBe(12000);
    const direct = core.renderSound(refs[0], 12000);
    expect(Buffer.from(posted[1].ch![0].buffer).equals(Buffer.from(direct[0].buffer))).toBe(true);
  });
});

describe('pelog pitch set', () => {
  it('matches the documented table (lib/audio/pitch.ts)', () => {
    const table = [293.7, 314.7, 343.2, 401.2, 433.7, 462.1, 508.3];
    PELOG_CENTS.forEach((_, i) => expect(pelog((i + 1) as 1)).toBeCloseTo(table[i], 1));
    expect(pelog(1, -2)).toBeCloseTo(73.4, 1);
    expect(pelog(1, 1)).toBeCloseTo(587.3, 1);
  });

  it('bemStep walks pelog bem upwards across octaves', () => {
    expect(BEM).toEqual([1, 2, 3, 5, 6]);
    expect(bemStep(0)).toBeCloseTo(pelog(1), 6);
    expect(bemStep(3)).toBeCloseTo(pelog(5), 6);
    expect(bemStep(5)).toBeCloseTo(pelog(1, 1), 6);
    for (let n = 1; n < 15; n += 1) expect(bemStep(n)).toBeGreaterThan(bemStep(n - 1));
  });
});
