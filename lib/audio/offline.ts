/**
 * Offline render of a cue sheet (Phase 21): the SAME engine, buffers and scheduler as live playback, on
 * an OfflineAudioContext, then a 16-bit stereo WAV. Used only through the players' `?debug=1` hooks
 * (`window.__nlConceptAudio.renderWav()`, `window.__nlBumperAudio.renderWav()`) to produce the review files;
 * loaded with a dynamic import, never part of a normal visit.
 */
import { createBufferStore } from './buffers';
import type { SoundRef } from './core';
import { createEngine } from './engine';
import { createScheduler, type Automation, type Cue } from './scheduler';

export interface OfflineResult {
  wav: Uint8Array;
  sampleRate: number;
  seconds: number;
  /** Time to render the sounds (ms, main thread, synchronous) and the mix (ms). */
  soundsMs: number;
  mixMs: number;
  peakVoices: number;
  cues: number;
}

export async function renderOffline(options: {
  cues: readonly Cue[];
  automation?: readonly Automation[];
  sounds: readonly SoundRef[];
  seconds: number;
  sampleRate?: number;
}): Promise<OfflineResult> {
  const sampleRate = options.sampleRate ?? 48000;
  const w = window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
  const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!Ctor) throw new Error('OfflineAudioContext is not available');
  const ctx = new Ctor(2, Math.ceil(options.seconds * sampleRate), sampleRate);
  const store = createBufferStore(ctx, { worker: false });
  const t0 = performance.now();
  store.renderNow(options.sounds);
  const soundsMs = performance.now() - t0;
  const engine = createEngine(ctx, store);
  const scheduler = createScheduler({ engine, cues: options.cues, automation: options.automation, group: 'offline' });
  // The film's time 0 is the WAV's time 0 (aligned for muxing with the recordings).
  scheduler.scheduleAll(0);
  const t1 = performance.now();
  const rendered = await ctx.startRendering();
  return {
    wav: encodeWav16(rendered),
    sampleRate,
    seconds: options.seconds,
    soundsMs,
    mixMs: performance.now() - t1,
    peakVoices: engine.peakVoices,
    cues: options.cues.length,
  };
}

/** 16-bit PCM WAV of an AudioBuffer (interleaved). */
export function encodeWav16(buffer: AudioBuffer): Uint8Array {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = new Uint8Array(44 + frames * channels * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + frames * channels * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let at = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const x = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(at, x < 0 ? x * 0x8000 : x * 0x7fff, true);
      at += 2;
    }
  }
  return bytes;
}

/** Base64 of bytes, in chunks (for handing a WAV to a test script). */
export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
