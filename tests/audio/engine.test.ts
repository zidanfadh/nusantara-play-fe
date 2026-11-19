import { afterEach, describe, expect, it } from 'vitest';
import { createBufferStore } from '@/lib/audio/buffers';
import { getSharedEngine } from '@/lib/audio/context';
import { createEngine, MAX_VOICES, MIX } from '@/lib/audio/engine';
import { readSoundMuted, resetSoundMutedMemory, SOUND_MUTED_KEY, writeSoundMuted } from '@/lib/audio/mute';
import { asCtx, FakeAudioContext, FakeBuffer } from './fake-audio';

function setup(maxVoices?: number) {
  const fake = new FakeAudioContext();
  const store = createBufferStore(asCtx(fake), { worker: false });
  store.renderNow([{ id: 'seed', v: 0 }, { id: 'saron', hz: 300 }, { id: 'gong', hz: 65 }]);
  const engine = createEngine(asCtx(fake), store, { maxVoices });
  return { fake, store, engine };
}

describe('audio engine (Phase 21)', () => {
  it('builds the bus graph with a limiter and the music lowpass open', () => {
    const { engine } = setup();
    expect(engine.params.cutoff.value).toBe(16000);
    expect(engine.params.duck.value).toBe(1);
    expect(engine.params.bend).not.toBeNull();
    expect(engine.master.gain.value).toBe(MIX.master);
    // The music bed sits under the effects.
    expect(MIX.music).toBeLessThan(MIX.sfx);
    // Peaks at or below −1 dBFS after the compressor.
    expect(20 * Math.log10(MIX.trim)).toBeLessThanOrEqual(-0.99);
  });

  it('plays a buffer at the given time and offset; music voices follow the bend', () => {
    const { fake, engine } = setup();
    const v = engine.play({ ref: { id: 'saron', hz: 300 }, when: 1.5, offset: 0.2, bus: 'music', group: 'g', gain: 0.5 });
    expect(v).not.toBeNull();
    const src = fake.sources.at(-1)!;
    expect(src.startedAt).toBe(1.5);
    expect(src.offset).toBe(0.2);
    // resumed mid-way: a short fade-in
    expect(v!.gain.gain as unknown as { events: { type: string }[] }).toMatchObject({ events: [{ type: 'set' }, { type: 'linear' }] });
  });

  it('returns null for a sound that is not rendered yet, or an offset past its end', () => {
    const { engine } = setup();
    expect(engine.play({ ref: { id: 'wind', len: 3 }, when: 0, bus: 'sfx', group: 'g' })).toBeNull();
    expect(engine.play({ ref: { id: 'seed', v: 0 }, when: 0, offset: 5, bus: 'sfx', group: 'g' })).toBeNull();
  });

  it(`never lets more than ${MAX_VOICES} voices sound at once: the oldest is stolen`, () => {
    const { fake, engine } = setup();
    for (let i = 0; i < 40; i += 1) engine.play({ ref: { id: 'gong', hz: 65 }, when: i * 0.01, bus: 'sfx', group: 'g' });
    // A stolen voice fades out over 15 ms (then stops) while the new one starts: count the voices at full level.
    let worst = 0;
    for (let t = 0; t < 1; t += 0.005) {
      worst = Math.max(worst, fake.soundingAt(t).filter((s) => s.stopAt === null || s.stopAt - t > 0.04).length);
    }
    expect(worst).toBe(MAX_VOICES);
    expect(engine.peakVoices).toBeLessThanOrEqual(MAX_VOICES);
    // the first voice was the oldest, stolen when the 25th started
    expect(fake.sources[0].stopAt).not.toBeNull();
    expect(fake.sources[0].stopAt!).toBeLessThanOrEqual(0.24 + 0.05);
  });

  it('fades and stops one group only', () => {
    const { fake, engine } = setup();
    engine.play({ ref: { id: 'gong', hz: 65 }, when: 0, bus: 'sfx', group: 'a' });
    engine.play({ ref: { id: 'gong', hz: 65 }, when: 0, bus: 'sfx', group: 'b' });
    fake.currentTime = 1;
    engine.fadeGroup('a', 300);
    expect(fake.sources[0].stopAt).toBeCloseTo(1.32, 2);
    expect(fake.sources[1].stopAt).toBeNull();
  });

  it('cancels voices that have not started yet and reports their tags', () => {
    const { fake, engine } = setup();
    engine.play({ ref: { id: 'seed', v: 0 }, when: 0, bus: 'sfx', group: 'g', tag: 'past' });
    engine.play({ ref: { id: 'seed', v: 0 }, when: 0.5, bus: 'sfx', group: 'g', tag: 'future' });
    fake.currentTime = 0.02;
    expect(engine.cancelPending('g')).toEqual(['future']);
  });
});

describe('buffer store', () => {
  it('renders on the main thread one sound per task without workers, in order, then reports', async () => {
    const fake = new FakeAudioContext();
    const store = createBufferStore(asCtx(fake), { worker: false });
    const ready: string[] = [];
    store.onReady((k) => ready.push(k));
    store.request([{ id: 'gong', hz: 65 }, { id: 'seed', v: 1 }, { id: 'gong', hz: 65 }]);
    expect(store.has({ id: 'gong', hz: 65 })).toBe(false);
    await new Promise((r) => setTimeout(r, 400));
    expect(ready).toEqual(['impulse', 'gong|h65.00', 'seed|v1']);
    expect(store.stats.mode).toBe('main');
    expect(store.stats.rendered).toBe(2);
    expect(store.stats.wallMs).not.toBeNull();
    const gong = store.get({ id: 'gong', hz: 65 }) as unknown as FakeBuffer;
    expect(gong.sampleRate).toBe(12000);
  });

  it('renders every sound at the base rate when the context rejects half-rate buffers (old Safari)', () => {
    const fake = new FakeAudioContext();
    const original = fake.createBuffer.bind(fake);
    fake.createBuffer = (c: number, l: number, sr: number) => {
      if (sr < 22050) throw new Error('NotSupportedError');
      return original(c, l, sr);
    };
    const store = createBufferStore(asCtx(fake), { worker: false });
    store.renderNow([{ id: 'gong', hz: 65 }]);
    expect((store.get({ id: 'gong', hz: 65 }) as unknown as FakeBuffer).sampleRate).toBe(24000);
  });
});

describe('shared context and the sound choice', () => {
  afterEach(() => resetSoundMutedMemory());

  it('without Web Audio there is no engine (the film stays silent, nothing throws)', () => {
    expect(getSharedEngine()).toBeNull();
  });

  it('sound is on by default; the choice is stored as 1/0', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(readSoundMuted(storage)).toBe(false);
    writeSoundMuted(true, storage);
    expect(data.get(SOUND_MUTED_KEY)).toBe('1');
    expect(readSoundMuted(storage)).toBe(true);
    writeSoundMuted(false, storage);
    expect(readSoundMuted(storage)).toBe(false);
  });

  it('storage that throws: the choice lives in memory for the page', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readSoundMuted(throwing)).toBe(false);
    expect(() => writeSoundMuted(true, throwing)).not.toThrow();
    expect(readSoundMuted(throwing)).toBe(true);
    expect(readSoundMuted(null)).toBe(true);
  });
});
