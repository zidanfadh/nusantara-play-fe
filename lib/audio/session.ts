/**
 * Sound session of one player (Phase 21): the concept film or the intro bumper. Framework-free, with
 * injectable dependencies (tests/audio/session.test.ts). Decides when sound is audible and tells the
 * player (`onLive` → start/restart its cues at the current time, `onSilent` → drop them).
 *
 * Status: 'starting' (trying), 'on', 'blocked' (the browser refused to start audio without a gesture:
 * the player shows "Nyalakan suara"), 'muted' (the visitor's choice, np_sound_muted_v1; no AudioContext
 * is even created), 'unsupported' (no Web Audio: the player plays silently, with no sound controls).
 *
 * - Autoplay: reaching /jelajah by an in-app click keeps the user activation, so the context starts by
 *   itself. On a direct load it cannot: after a short wait the status is 'blocked'.
 * - `enable()` / `toggle()` are called inside the tap (user gesture), which is what lets audio start.
 * - Hidden tab: the context is suspended (the film's clock stops too) and resumed when visible.
 * - `close(fadeMs)`: after the player's fade the context is suspended, unless another session (the film
 *   right after the bumper) is live by then. iOS: navigator.audioSession 'playback' while sound is on.
 */
import type { SoundRef } from './core';
import { getSharedEngine, resumeContext, setPlaybackSession, suspendContext, tryStart, unlockInGesture } from './context';
import type { Engine } from './engine';
import { readSoundMuted, writeSoundMuted } from './mute';

export type SoundStatus = 'starting' | 'on' | 'blocked' | 'muted' | 'unsupported';

export interface SessionDeps {
  getEngine: () => Engine | null;
  tryStart: (engine: Engine) => Promise<boolean>;
  unlock: (engine: Engine) => Promise<boolean>;
  suspend: (engine: Engine) => void;
  resume: (engine: Engine) => void;
  setPlayback: (on: boolean) => void;
  readMuted: () => boolean;
  writeMuted: (muted: boolean) => void;
  setTimer: (fn: () => void, ms: number) => unknown;
}

const defaultDeps: SessionDeps = {
  getEngine: getSharedEngine,
  tryStart: (e) => tryStart(e),
  unlock: unlockInGesture,
  suspend: suspendContext,
  resume: resumeContext,
  setPlayback: setPlaybackSession,
  readMuted: () => readSoundMuted(),
  writeMuted: (m) => writeSoundMuted(m),
  setTimer: (fn, ms) => setTimeout(fn, ms),
};

export interface SessionOptions {
  group: string;
  /** Sounds to render, in the order they are needed. */
  sounds: () => readonly SoundRef[];
  onStatus?: (status: SoundStatus) => void;
  onLive: (engine: Engine) => void;
  onSilent?: () => void;
  deps?: Partial<SessionDeps>;
}

export interface SoundSession {
  start(): void;
  /** The sound toggle (🔊/🔇). Call inside the tap. */
  toggle(): void;
  /** "Nyalakan suara". Call inside the tap. */
  enable(): void;
  setHidden(hidden: boolean): void;
  /** The film's test hook pause / resume. */
  pause(): void;
  resume(): void;
  /** A short UI tick (e.g. on "Mulai Menjelajah"), only while sound is on. */
  tick(): void;
  close(fadeMs: number): void;
  readonly status: SoundStatus;
  readonly engine: Engine | null;
}

/** Sessions currently audible (module-wide), so a closing one never suspends the next one's sound. */
let liveSessions = 0;

export function createSoundSession(options: SessionOptions): SoundSession {
  const deps: SessionDeps = { ...defaultDeps, ...options.deps };
  let status: SoundStatus = 'starting';
  let engine: Engine | null = null;
  let closed = false;
  let live = false;
  let attempt = 0;

  const setStatus = (next: SoundStatus) => {
    if (status === next) return;
    status = next;
    options.onStatus?.(next);
  };
  const setLive = (value: boolean) => {
    if (live === value) return;
    live = value;
    liveSessions += value ? 1 : -1;
    deps.setPlayback(liveSessions > 0);
  };
  const ensureEngine = (): Engine | null => {
    if (!engine) engine = deps.getEngine();
    if (engine) engine.store.request(options.sounds());
    return engine;
  };
  const goLive = () => {
    if (closed || !engine) return;
    setLive(true);
    setStatus('on');
    options.onLive(engine);
  };
  const suspendLater = (ms: number) => {
    deps.setTimer(() => {
      if (engine && liveSessions === 0) deps.suspend(engine);
    }, ms);
  };
  const turnOn = () => {
    deps.writeMuted(false);
    const e = ensureEngine();
    if (!e) {
      setStatus('unsupported');
      return;
    }
    setStatus('starting');
    const mine = ++attempt;
    void deps.unlock(e).then((ok) => {
      if (mine !== attempt || closed) return;
      if (ok) goLive();
      else setStatus('blocked');
    });
  };

  return {
    start() {
      if (closed) return;
      if (deps.readMuted()) {
        setStatus('muted');
        return;
      }
      const e = ensureEngine();
      if (!e) {
        setStatus('unsupported');
        return;
      }
      const mine = ++attempt;
      void deps.tryStart(e).then((ok) => {
        if (mine !== attempt || closed) return;
        if (ok) goLive();
        else setStatus('blocked');
      });
    },
    toggle() {
      if (closed) return;
      if (status === 'on') {
        attempt += 1;
        deps.writeMuted(true);
        options.onSilent?.();
        setLive(false);
        setStatus('muted');
        suspendLater(250);
      } else {
        turnOn();
      }
    },
    enable() {
      if (!closed && status !== 'on') turnOn();
    },
    setHidden(hidden) {
      if (!engine || status !== 'on') return;
      if (hidden) deps.suspend(engine);
      else deps.resume(engine);
    },
    pause() {
      if (engine && status === 'on') deps.suspend(engine);
    },
    resume() {
      if (engine && status === 'on') deps.resume(engine);
    },
    tick() {
      if (!engine || status !== 'on') return;
      engine.play({ ref: { id: 'tick' }, when: engine.ctx.currentTime, bus: 'sfx', group: 'ui', gain: 0.45 });
    },
    close(fadeMs) {
      if (closed) return;
      closed = true;
      attempt += 1;
      setLive(false);
      if (engine) suspendLater(fadeMs + 120);
    },
    get status() {
      return status;
    },
    get engine() {
      return engine;
    },
  };
}

/** Tests only. */
export function resetLiveSessions(): void {
  liveSessions = 0;
}
