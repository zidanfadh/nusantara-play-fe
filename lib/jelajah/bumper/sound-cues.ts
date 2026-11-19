/**
 * The intro bumper's sound (Phase 21): a short sting on the bumper's own timings, the same engine,
 * sound choice and autoplay rules as the concept film.
 *
 * - Sting (from the moment the bumper appears): a soft swell into the GONG on the brand moment (the logo
 *   has popped in: SceneLayout's `delayChildren` 0.05 s + `popVariants` 0.6 s = BRAND_MOMENT_MS), a warm
 *   chord and a shimmer, then the gong's tail.
 * - Each later scene (auto-advance or a tap) gets one soft bonang note when it appears; the last scene
 *   ("XP dan Paspor", "Mulai Jelajah") a soft chime.
 * Times in ms. tests/jelajah/bumper-sound.test.ts ties BRAND_MOMENT_MS to the layout's variants.
 */
import type { SoundRef } from '@/lib/audio/core';
import { bemStep, GONG_HZ, pelog } from '@/lib/audio/pitch';
import type { Cue } from '@/lib/audio/scheduler';
import { BUMPER_DURATIONS, BUMPER_SCENES } from './scene-data';

export const BUMPER_SOUND_GROUP = 'bumper';
export const BRAND_MOMENT_MS = 650;
/** Exit fades, like the film: "Lewati" / Esc / "Main Congklak" 300 ms, the end ("Mulai Jelajah") 600 ms. */
export const BUMPER_SKIP_FADE_MS = 300;
export const BUMPER_END_FADE_MS = 600;

const SWELL_NOTES = [pelog(1, -1), pelog(5, -1), pelog(3)];

export function bumperStingCues(): Cue[] {
  const base = { scene: BUMPER_SCENES[0].id };
  return [
    { ...base, id: 'sting:swell', at: 0, beat: 'soft swell', ref: { id: 'swell', notes: SWELL_NOTES, len: BRAND_MOMENT_MS / 1000 }, bus: 'music', gain: 0.55, wet: 0.3, resumable: true },
    { ...base, id: 'sting:gong', at: BRAND_MOMENT_MS, beat: 'brand moment (GONG)', ref: { id: 'gong', hz: GONG_HZ }, bus: 'sfx', gain: 0.9, wet: 0.3, resumable: true },
    { ...base, id: 'sting:chord', at: BRAND_MOMENT_MS, beat: 'warm chord', ref: { id: 'pad', notes: SWELL_NOTES, len: 4 }, bus: 'music', gain: 0.5, wet: 0.4, resumable: true },
    {
      ...base,
      id: 'sting:shimmer',
      at: BRAND_MOMENT_MS + 30,
      beat: 'shimmer',
      ref: { id: 'shimmer', notes: [bemStep(5), bemStep(7), bemStep(9)], len: 2.5 },
      bus: 'sfx',
      gain: 0.18,
      wet: 0.5,
    },
  ];
}

/** The note played when scene `index` (1..) appears; none for the first scene (the sting covers it). */
export function bumperSceneSound(index: number): { ref: SoundRef; gain: number } | null {
  if (index <= 0 || index >= BUMPER_SCENES.length) return null;
  if (index === BUMPER_SCENES.length - 1) return { ref: { id: 'chime', hz: bemStep(10) }, gain: 0.16 };
  return { ref: { id: 'bonang', hz: bemStep(4 + index) }, gain: 0.22 };
}

/** Scene start times when the bumper advances by itself (no taps). */
export function bumperSceneStarts(): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const d of BUMPER_DURATIONS) {
    starts.push(t);
    t += d;
  }
  return starts;
}

/** The whole bumper as one sheet (offline render: auto-advance, untouched). */
export function bumperOfflineCues(): Cue[] {
  const scenes = bumperSceneStarts().flatMap((at, i) => {
    const s = bumperSceneSound(i);
    return s ? [{ id: `scene:${i}`, at, beat: `scene ${i + 1} appears`, scene: BUMPER_SCENES[i].id, ref: s.ref, bus: 'music' as const, gain: s.gain, wet: 0.35 }] : [];
  });
  return [...bumperStingCues(), ...scenes].sort((a, b) => a.at - b.at);
}

export function bumperSounds(): SoundRef[] {
  const refs = [{ id: 'gong', hz: GONG_HZ } as SoundRef, ...bumperStingCues().map((c) => c.ref!)];
  for (let i = 1; i < BUMPER_SCENES.length; i += 1) refs.push(bumperSceneSound(i)!.ref);
  refs.push({ id: 'tick' });
  return refs;
}

/** Length of the bumper when it advances by itself, ms. */
export const BUMPER_TOTAL_MS = BUMPER_DURATIONS.reduce((a, b) => a + b, 0);
