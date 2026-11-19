/**
 * The audio graph and voice pool of the sound engine (Phase 21). Works on a live AudioContext and on an
 * OfflineAudioContext alike (the WAV render uses the very same code).
 *
 *   music voices → music bus → lowpass (scene 2's sweep) → duck (voice-over) ┐
 *   sfx voices   → sfx bus ───────────────────────────────────────────────────┼→ master → compressor → trim → out
 *   voice-over   → voice bus ─────────────────────────────────────────────────┤
 *   any voice ── send (its `wet`) → room reverb (ConvolverNode, seeded IR) ───┘
 *
 * - Levels (MIX): the music bed sits clearly under the effects; the compressor is a gentle limiter and the
 *   trim keeps peaks at or below −1 dBFS (measured on the offline render, see the Phase 21 report).
 * - Voices: one AudioBufferSourceNode + gain (+ panner, + reverb send) each; at most MAX_VOICES sound at
 *   the same moment: a new voice steals the oldest one overlapping its start (15 ms fade). Counting is by
 *   scheduled time windows, so it holds for voices scheduled ahead and in an offline render.
 * - `bend`: a ConstantSourceNode added to every music voice's playbackRate (scene 2's "tape slowing").
 * - Groups ('concept', 'bumper', 'ui'): fades and stops apply to one group only.
 */
import { soundKey, type BufferStore } from './buffers';
import type { SoundRef } from './core';

export type Bus = 'music' | 'sfx' | 'voice';

/** Mix levels (linear gain). Tuned on the offline render: about −16 LUFS integrated, peaks ≤ −1 dBFS. */
export const MIX = {
  music: 0.42,
  sfx: 0.8,
  voice: 1,
  reverb: 0.55,
  master: 0.78,
  /** After the compressor: −1 dB. */
  trim: 0.891,
} as const;

/** Most voices sounding at the same moment. */
export const MAX_VOICES = 24;
/** Music lowpass when open (Hz). */
export const CUTOFF_OPEN = 16000;

export interface PlayOptions {
  /** The sound (from the buffer store), or `buffer` for a decoded file (voice-over). */
  ref?: SoundRef;
  buffer?: AudioBuffer;
  /** Start, in context seconds. */
  when: number;
  /** Seconds into the sound (a sound resumed after a seek). */
  offset?: number;
  gain?: number;
  pan?: number;
  /** Pan at the end of the sound (a linear sweep). */
  panTo?: number;
  rate?: number;
  rateTo?: number;
  bus: Bus;
  group: string;
  /** Stop after this many seconds (with `release`); otherwise the buffer plays to its end. */
  dur?: number;
  release?: number;
  fadeIn?: number;
  /** Reverb send, 0..1. */
  wet?: number;
  tag?: string;
}

export interface Voice {
  group: string;
  tag?: string;
  bus: Bus;
  start: number;
  end: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  stopped: boolean;
}

export interface Engine {
  readonly ctx: BaseAudioContext;
  readonly store: BufferStore;
  readonly params: { cutoff: AudioParam; duck: AudioParam; bend: AudioParam | null };
  readonly master: GainNode;
  play(options: PlayOptions): Voice | null;
  /** Fades a group out over `ms` from context time `at` (default now) and stops its voices. */
  fadeGroup(group: string, ms: number, at?: number): void;
  /** Stops the group's voices that have not started yet (time > now); returns their tags. */
  cancelPending(group: string): string[];
  /** Voices sounding (or scheduled to) at context time `t` (default now). */
  activeAt(t?: number): Voice[];
  /** Most voices that overlapped at any start so far. */
  readonly peakVoices: number;
  dispose(): void;
}

type Holdable = AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };

function hold(param: AudioParam, at: number) {
  const p = param as Holdable;
  if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(at);
  else p.cancelScheduledValues(at);
}

export function createEngine(ctx: BaseAudioContext, store: BufferStore, options: { maxVoices?: number } = {}): Engine {
  const maxVoices = options.maxVoices ?? MAX_VOICES;
  const master = ctx.createGain();
  master.gain.value = MIX.master;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;
  const trim = ctx.createGain();
  trim.gain.value = MIX.trim;
  master.connect(compressor);
  compressor.connect(trim);
  trim.connect(ctx.destination);

  const musicBus = ctx.createGain();
  musicBus.gain.value = MIX.music;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = CUTOFF_OPEN;
  lowpass.Q.value = 0.5;
  const duck = ctx.createGain();
  musicBus.connect(lowpass);
  lowpass.connect(duck);
  duck.connect(master);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = MIX.sfx;
  sfxBus.connect(master);
  const voiceBus = ctx.createGain();
  voiceBus.gain.value = MIX.voice;
  voiceBus.connect(master);
  const buses: Record<Bus, GainNode> = { music: musicBus, sfx: sfxBus, voice: voiceBus };

  // Room reverb: one convolver for everything, its impulse rendered by the store (seeded).
  const reverbIn = ctx.createGain();
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = MIX.reverb;
  const convolver = ctx.createConvolver();
  reverbIn.connect(convolver);
  convolver.connect(reverbOut);
  reverbOut.connect(master);
  const setImpulse = () => {
    const ir = store.impulse();
    if (ir && !convolver.buffer) {
      try {
        convolver.buffer = ir;
      } catch {
        // a sample-rate mismatch would leave the mix dry, never break it
      }
    }
  };
  setImpulse();
  const offReady = store.onReady((key) => {
    if (key === 'impulse') setImpulse();
  });

  let bendSource: ConstantSourceNode | null = null;
  if (typeof ctx.createConstantSource === 'function') {
    bendSource = ctx.createConstantSource();
    bendSource.offset.value = 0;
    bendSource.start(0);
  }

  let voices: Voice[] = [];
  let peakVoices = 0;
  const canPan = typeof ctx.createStereoPanner === 'function';

  const fadeVoice = (v: Voice, at: number, ms: number) => {
    if (v.stopped) return;
    const t = Math.max(at, ctx.currentTime);
    if (v.start >= t) {
      // not started yet: it never sounds
      try {
        v.source.stop();
      } catch {
        /* already stopped */
      }
      v.stopped = true;
      v.end = v.start;
      return;
    }
    hold(v.gain.gain, t);
    v.gain.gain.setTargetAtTime(0, t, Math.max(0.001, ms / 1000 / 4));
    const stopAt = t + ms / 1000 + 0.02;
    try {
      v.source.stop(stopAt);
    } catch {
      /* already stopped */
    }
    v.end = Math.min(v.end, stopAt);
    v.stopped = true;
  };

  const overlapping = (t: number) => voices.filter((v) => v.start <= t + 1e-6 && v.end > t);

  return {
    ctx,
    store,
    params: { cutoff: lowpass.frequency, duck: duck.gain, bend: bendSource ? bendSource.offset : null },
    master,
    play(o) {
      const buffer = o.buffer ?? (o.ref ? store.get(o.ref) : null);
      if (!buffer) return null;
      const when = Math.max(o.when, ctx.currentTime);
      const offset = Math.max(0, o.offset ?? 0);
      if (offset >= buffer.duration) return null;
      const rate = o.rate ?? 1;
      const natural = (buffer.duration - offset) / Math.min(rate, o.rateTo ?? rate);
      const end = when + (o.dur !== undefined ? Math.min(o.dur, natural) : natural);

      // Forget voices long finished; steal the oldest when the pool is full at this start.
      voices = voices.filter((v) => v.end > ctx.currentTime - 0.05);
      // Voices already fading out (stolen, group fade) do not count: they end within a few ms.
      const busy = overlapping(when).filter((v) => !v.stopped);
      if (busy.length >= maxVoices) {
        const oldest = busy.reduce((a, b) => (b.start < a.start ? b : a));
        fadeVoice(oldest, when, 15);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(rate, when);
      if (o.rateTo !== undefined) source.playbackRate.linearRampToValueAtTime(o.rateTo, end);
      if (o.bus === 'music' && bendSource) bendSource.connect(source.playbackRate);

      const gain = ctx.createGain();
      const level = o.gain ?? 1;
      // A sound resumed mid-way always fades in briefly (no click).
      const fadeIn = o.fadeIn ?? (offset > 0 ? 0.03 : 0);
      if (fadeIn > 0) {
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(level, when + fadeIn);
      } else {
        gain.gain.setValueAtTime(level, when);
      }
      if (o.dur !== undefined) {
        const release = Math.min(o.release ?? 0.05, Math.max(0.005, end - when - fadeIn));
        gain.gain.setValueAtTime(level, end - release);
        gain.gain.linearRampToValueAtTime(0, end);
      }

      let tail: AudioNode = gain;
      source.connect(gain);
      if (canPan && (o.pan !== undefined || o.panTo !== undefined)) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(o.pan ?? 0, when);
        if (o.panTo !== undefined) panner.pan.linearRampToValueAtTime(o.panTo, end);
        gain.connect(panner);
        tail = panner;
      }
      tail.connect(buses[o.bus]);
      if (o.wet && o.wet > 0) {
        const send = ctx.createGain();
        send.gain.value = o.wet;
        tail.connect(send);
        send.connect(reverbIn);
      }

      source.start(when, offset);
      if (o.dur !== undefined) source.stop(end + 0.01);
      const voice: Voice = { group: o.group, tag: o.tag, bus: o.bus, start: when, end, source, gain, stopped: false };
      source.onended = () => {
        voice.stopped = true;
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
          /* already disconnected */
        }
      };
      voices.push(voice);
      peakVoices = Math.max(peakVoices, overlapping(when).filter((v) => !v.stopped).length);
      return voice;
    },
    fadeGroup(group, ms, at) {
      const t = at ?? ctx.currentTime;
      for (const v of voices) if (v.group === group) fadeVoice(v, t, ms);
    },
    cancelPending(group) {
      const t = ctx.currentTime;
      const tags: string[] = [];
      for (const v of voices) {
        if (v.group === group && !v.stopped && v.start > t) {
          fadeVoice(v, t, 0);
          if (v.tag) tags.push(v.tag);
        }
      }
      return tags;
    },
    activeAt: (t) => overlapping(t ?? ctx.currentTime),
    get peakVoices() {
      return peakVoices;
    },
    dispose() {
      offReady();
      for (const v of voices) fadeVoice(v, ctx.currentTime, 10);
      voices = [];
      try {
        bendSource?.stop();
        master.disconnect();
      } catch {
        /* closed context */
      }
    },
  };
}

export { soundKey };
