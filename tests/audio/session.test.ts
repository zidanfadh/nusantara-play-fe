import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBufferStore } from '@/lib/audio/buffers';
import { createEngine, type Engine } from '@/lib/audio/engine';
import { readSoundMuted, resetSoundMutedMemory, writeSoundMuted } from '@/lib/audio/mute';
import { createSoundSession, resetLiveSessions, type SessionDeps, type SoundStatus } from '@/lib/audio/session';
import { loadVoiceOvers } from '@/lib/audio/voice-over';
import { setPlaybackSession } from '@/lib/audio/context';
import { asCtx, FakeAudioContext } from './fake-audio';

function harness(opts: { autoplay?: boolean; gesture?: boolean; muted?: boolean; noAudio?: boolean } = {}) {
  const fake = new FakeAudioContext();
  let engine: Engine | null = null;
  let muted = opts.muted ?? false;
  const timers: (() => void)[] = [];
  const calls = { suspend: 0, resume: 0, playback: [] as boolean[], getEngine: 0 };
  const deps: SessionDeps = {
    getEngine: () => {
      calls.getEngine += 1;
      if (opts.noAudio) return null;
      engine ??= createEngine(asCtx(fake), createBufferStore(asCtx(fake), { worker: false }));
      return engine;
    },
    tryStart: async () => opts.autoplay ?? true,
    unlock: async () => opts.gesture ?? true,
    suspend: () => void (calls.suspend += 1),
    resume: () => void (calls.resume += 1),
    setPlayback: (on) => void calls.playback.push(on),
    readMuted: () => muted,
    writeMuted: (m) => void (muted = m),
    setTimer: (fn) => void timers.push(fn),
  };
  const statuses: SoundStatus[] = [];
  const live = vi.fn();
  const silent = vi.fn();
  const make = (group = 'concept') =>
    createSoundSession({ group, sounds: () => [{ id: 'tick' }], onStatus: (s) => statuses.push(s), onLive: live, onSilent: silent, deps });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const runTimers = () => timers.splice(0).forEach((fn) => fn());
  return { fake, deps, statuses, live, silent, make, flush, runTimers, calls, isMuted: () => muted };
}

describe('sound session (Phase 21)', () => {
  afterEach(() => {
    resetLiveSessions();
    resetSoundMutedMemory();
  });

  it('autoplay allowed (in-app navigation): sound starts by itself and the player goes live once', async () => {
    const h = harness({ autoplay: true });
    const s = h.make();
    s.start();
    await h.flush();
    expect(s.status).toBe('on');
    expect(h.live).toHaveBeenCalledTimes(1);
    expect(h.calls.playback).toEqual([true]); // iOS: audioSession 'playback' while sound is on
  });

  it('autoplay blocked (direct load): "Nyalakan suara"; one tap starts it in sync', async () => {
    const h = harness({ autoplay: false, gesture: true });
    const s = h.make();
    s.start();
    await h.flush();
    expect(s.status).toBe('blocked');
    expect(h.live).not.toHaveBeenCalled();
    s.enable();
    await h.flush();
    expect(s.status).toBe('on');
    expect(h.live).toHaveBeenCalledTimes(1);
  });

  it('muted by choice: no AudioContext at all; the toggle turns sound on and stores the choice', async () => {
    const h = harness({ muted: true });
    const s = h.make();
    s.start();
    expect(s.status).toBe('muted');
    expect(h.calls.getEngine).toBe(0);
    s.toggle();
    await h.flush();
    expect(s.status).toBe('on');
    expect(h.isMuted()).toBe(false);
    s.toggle();
    expect(s.status).toBe('muted');
    expect(h.isMuted()).toBe(true);
    expect(h.silent).toHaveBeenCalledTimes(1);
    h.runTimers();
    expect(h.calls.suspend).toBe(1);
    expect(h.calls.playback.at(-1)).toBe(false);
  });

  it('without Web Audio: unsupported, no controls, nothing throws', async () => {
    const h = harness({ noAudio: true });
    const s = h.make();
    expect(() => s.start()).not.toThrow();
    expect(s.status).toBe('unsupported');
    expect(() => {
      s.toggle();
      s.enable();
      s.setHidden(true);
      s.tick();
      s.close(300);
    }).not.toThrow();
    expect(h.live).not.toHaveBeenCalled();
  });

  it('hidden tab suspends the context, visible resumes it (only while sound is on)', async () => {
    const h = harness();
    const s = h.make();
    s.setHidden(true);
    expect(h.calls.suspend).toBe(0);
    s.start();
    await h.flush();
    s.setHidden(true);
    s.setHidden(false);
    expect(h.calls.suspend).toBe(1);
    expect(h.calls.resume).toBe(1);
  });

  it('close: suspends after the fade, unless the next player (bumper → film) is live by then', async () => {
    const h = harness();
    const bumper = h.make('bumper');
    bumper.start();
    await h.flush();
    bumper.close(300);
    const film = h.make('concept');
    film.start();
    await h.flush();
    h.runTimers();
    expect(h.calls.suspend).toBe(0);
    film.close(600);
    h.runTimers();
    expect(h.calls.suspend).toBe(1);
    expect(h.calls.playback.at(-1)).toBe(false);
  });

  it('a late autoplay answer after close does nothing', async () => {
    const h = harness();
    const s = h.make();
    s.start();
    s.close(300);
    await h.flush();
    expect(h.live).not.toHaveBeenCalled();
  });

  it('UI tick plays on the ui group only while sound is on', async () => {
    const h = harness();
    const s = h.make();
    s.tick();
    expect(h.fake.sources).toHaveLength(0);
    s.start();
    await h.flush();
    s.engine!.store.renderNow([{ id: 'tick' }]);
    s.tick();
    expect(h.fake.sources.filter((x) => x.startedAt !== null)).toHaveLength(1);
  });

  it('the choice survives storage that throws (in memory for the page)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    writeSoundMuted(true, throwing);
    expect(readSoundMuted(throwing)).toBe(true);
  });

  it('iOS audioSession: playback while on, auto otherwise; absent elsewhere', () => {
    const nav = globalThis as unknown as { navigator?: { audioSession?: { type: string } } };
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { audioSession: { type: 'auto' } }, configurable: true });
    setPlaybackSession(true);
    expect(nav.navigator!.audioSession!.type).toBe('playback');
    setPlaybackSession(false);
    expect(nav.navigator!.audioSession!.type).toBe('auto');
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(() => setPlaybackSession(true)).not.toThrow();
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  });
});

describe('voice-over loader', () => {
  it('an empty list makes no request at all', async () => {
    const fetchFn = vi.fn();
    const out = await loadVoiceOvers([], asCtx(new FakeAudioContext()), -8, fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(out).toEqual({ cues: [], automation: [] });
  });

  it('a listed file becomes a voice cue with the music ducked by 8 dB while it speaks; a failing one is left out', async () => {
    const fake = new FakeAudioContext();
    const decoded = fake.createBuffer(1, 48000 * 3, 48000);
    (fake as unknown as { decodeAudioData: () => Promise<unknown> }).decodeAudioData = async () => decoded;
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('missing') ? new Response(null, { status: 404 }) : new Response(new ArrayBuffer(8), { status: 200 }),
    );
    const out = await loadVoiceOvers(
      [
        { scene: 'arsip', src: '/jelajah/concept/vo/arsip.m4a', at: 18000 },
        { scene: 'main', src: '/jelajah/concept/vo/missing.m4a', at: 32000 },
      ],
      asCtx(fake),
      -8,
      fetchFn,
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(out.cues).toHaveLength(1);
    expect(out.cues[0]).toMatchObject({ at: 18000, bus: 'voice', scene: 'arsip' });
    expect(out.automation.map((a) => [a.from, a.to])).toEqual([
      [17850, 18100],
      [21000, 21500],
    ]);
    expect(20 * Math.log10(out.automation[0].v1)).toBeCloseTo(-8, 3);
  });
});
