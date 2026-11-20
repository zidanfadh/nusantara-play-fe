/**
 * The egrang game's sound (Phase 23): which synthesized sound plays for what, on the Phase 21 engine
 * (lib/audio, no files). Pure: the page (`components/games/egrang/use-egrang-sound.ts`) plays these live,
 * and `raceCueSheet` turns a recorded race into a cue sheet for the offline WAV render (`?debug=1`).
 *
 * - Steps: Bambu = a hollow bamboo knock, Batok = a coconut-shell "tok" (left / right foot differ a
 *   little); the computer's steps are quieter and panned to its lane. A perfect step adds a soft sparkle.
 * - Wobble (bad step on an obstacle): a soft knock; fall: a heavy thud; slip ("lepas"): a light thud.
 * - Pulse: Batok = the kendang on EVERY beat the steps must hit (dang on odd beats, tak on even beats);
 *   Bambu = a calmer, soft dang at each of the player's sway extremes (the ideal moments shown by the
 *   needle), so the pulse follows the balance arc.
 * - Countdown: a soft tak per second, then the start signal (dang + a bonang note); the finish gong when
 *   the player crosses the line (a bonang when the computer finishes first); a short phrase on the end
 *   screen: rising saron notes for a win, two falling bonang notes otherwise.
 */
import type { SoundRef } from '@/lib/audio/core';
import { bemStep, GONG_HZ } from '@/lib/audio/pitch';
import type { Cue } from '@/lib/audio/scheduler';
import { TUNING, beatTime } from './engine';
import type { Foot, RaceEvent, RaceWinner, Side, Variant } from './types';

export const EGRANG_SOUND_GROUP = 'egrang';

export interface GameSound {
  ref: SoundRef;
  gain: number;
  pan?: number;
  /** Delay after the moment (s), for phrases. */
  delay?: number;
  wet?: number;
  bus?: 'sfx' | 'music';
}

/** The computer's lane: quieter and to the right. */
const OTHER = { gain: 0.45, pan: 0.35 };

function sideMix(side: Side, s: GameSound): GameSound {
  return side === 0 ? s : { ...s, gain: s.gain * OTHER.gain, pan: (s.pan ?? 0) + OTHER.pan };
}

export function stepRef(variant: Variant, foot: Foot): SoundRef {
  return { id: variant === 'bambu' ? 'bamboo' : 'batok', v: foot === 'L' ? 0 : 1 };
}

const SPARKLE: SoundRef = { id: 'sparkle', notes: [bemStep(5, 1), bemStep(7, 1), bemStep(9, 1)] };
const START_NOTE: SoundRef = { id: 'bonang', hz: bemStep(5) };
const COMPUTER_FINISH: SoundRef = { id: 'bonang', hz: bemStep(2) };
const WIN_NOTES = [bemStep(5), bemStep(7), bemStep(9)];
const LOSE_NOTES = [bemStep(4), bemStep(2)];

/** Sounds of one engine event (empty for events without a sound). */
export function eventSounds(variant: Variant, e: RaceEvent): GameSound[] {
  switch (e.type) {
    case 'go':
      return [
        { ref: { id: 'dang' }, gain: 0.7 },
        { ref: START_NOTE, gain: 0.45, wet: 0.25 },
      ];
    case 'step': {
      const out: GameSound[] = [sideMix(e.side, { ref: stepRef(variant, e.foot), gain: variant === 'bambu' ? 0.55 : 0.5, pan: e.foot === 'L' ? -0.12 : 0.12 })];
      if (e.perfect && e.side === 0) out.push({ ref: SPARKLE, gain: 0.12, wet: 0.3 });
      return out;
    }
    case 'wobble':
      return [sideMix(e.side, { ref: { id: 'tap' }, gain: 0.35 })];
    case 'fall':
      return [sideMix(e.side, { ref: { id: 'thud', v: 0 }, gain: 0.75 })];
    case 'slip':
      return [sideMix(e.side, { ref: { id: 'thud', v: 1 }, gain: 0.6 })];
    case 'finish':
      return e.side === 0 ? [{ ref: { id: 'gong', hz: GONG_HZ }, gain: 0.7, wet: 0.3 }] : [{ ref: COMPUTER_FINISH, gain: 0.3, pan: 0.3, wet: 0.2 }];
    default:
      return [];
  }
}

/** The countdown: a soft tak at each whole second before the start signal (the signal itself is `go`). */
export function countdownSounds(): GameSound {
  return { ref: { id: 'tak' }, gain: 0.35 };
}

/** The short phrase on the end screen. */
export function endPhrase(winner: RaceWinner): GameSound[] {
  if (winner === 0) return WIN_NOTES.map((hz, i) => ({ ref: { id: 'saron', hz }, gain: 0.32, delay: i * 0.16, wet: 0.3, bus: 'music' as const }));
  return LOSE_NOTES.map((hz, i) => ({ ref: { id: 'bonang', hz }, gain: 0.26, delay: i * 0.28, wet: 0.3, bus: 'music' as const }));
}

/** Batok kendang on beat `k` (race time = beatTime(k)). */
export function batokPulse(k: number): GameSound {
  return k % 2 === 1 ? { ref: { id: 'dang' }, gain: 0.32 } : { ref: { id: 'tak' }, gain: 0.22 };
}

/** Bambu's calmer pulse at a sway extreme. */
export const BAMBU_PULSE: GameSound = { ref: { id: 'dang' }, gain: 0.16 };

/** Every sound the game can play, in the order they are first needed (rendered once per page). */
export function egrangSoundList(variant: Variant): SoundRef[] {
  return [
    { id: 'tak' },
    { id: 'dang' },
    START_NOTE,
    stepRef(variant, 'L'),
    stepRef(variant, 'R'),
    SPARKLE,
    { id: 'tap' },
    { id: 'thud', v: variant === 'bambu' ? 0 : 1 },
    { id: 'gong', hz: GONG_HZ },
    COMPUTER_FINISH,
    ...WIN_NOTES.map((hz) => ({ id: 'saron' as const, hz })),
    ...LOSE_NOTES.map((hz) => ({ id: 'bonang' as const, hz })),
    { id: 'tick' },
  ];
}

/** A recorded race moment: an engine event at world time `t` (s, countdown included). */
export interface TimedEvent {
  t: number;
  event: RaceEvent;
}

/** Bambu: world times (s) of the player's sway extremes in a recorded race (the pulse). */
export type SwayExtremes = readonly number[];

/**
 * The whole race as a cue sheet (times in ms of world time, 0 = the countdown starts): countdown, the
 * pulse (Batok beats until the race ends; Bambu at the recorded sway extremes), every event's sounds, and
 * the end phrase 1.3 s after the end (when the end screen appears). For the offline WAV render.
 */
export function raceCueSheet(variant: Variant, countdown: number, events: readonly TimedEvent[], swayExtremes: SwayExtremes = []): Cue[] {
  const cues: Cue[] = [];
  let n = 0;
  const add = (atSec: number, s: GameSound, beat: string) => {
    cues.push({
      id: `c${(n += 1)}`,
      at: Math.round((atSec + (s.delay ?? 0)) * 1000),
      ref: s.ref,
      bus: s.bus ?? 'sfx',
      gain: s.gain,
      pan: s.pan,
      wet: s.wet,
      scene: 'race',
      beat,
    });
  };
  for (let s = 0; s < countdown - 1e-9; s += 1) add(s, countdownSounds(), 'countdown');
  const end = events.find((e) => e.event.type === 'end');
  const endT = end ? end.t : events.length ? events[events.length - 1].t : countdown;
  if (variant === 'batok') {
    for (let k = 1; countdown + beatTime(k) <= endT + 1e-9; k += 1) add(countdown + beatTime(k), batokPulse(k), `beat ${k}`);
  } else {
    for (const t of swayExtremes) if (t <= endT) add(t, BAMBU_PULSE, 'sway');
  }
  for (const { t, event } of events) for (const s of eventSounds(variant, event)) add(t, s, event.type);
  if (end && end.event.type === 'end') for (const s of endPhrase(end.event.result.winner)) add(end.t + 1.3, s, 'end phrase');
  cues.sort((a, b) => a.at - b.at);
  return cues;
}

/** Seconds between Bambu sway extremes (half a swing). */
export const SWAY_HALF = TUNING.bambu.swayPeriod / 2;

