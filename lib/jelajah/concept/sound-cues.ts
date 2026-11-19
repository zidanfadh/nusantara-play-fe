/**
 * THE cue sheet of the concept film's soundtrack (Phase 21): every sound and when it plays. All timing
 * comes from the scene starts in `CONCEPT_SCENES` and the moments in `BEATS` (script.ts), never from
 * fixed seconds, so the sound follows the picture when the script's timings change. The sounds are
 * synthesized in code (lib/audio/core.ts); pitches come from the pelog set in lib/audio/pitch.ts.
 *
 * How to edit: change a builder below (`halaman()` … `mulai()`), keep each cue inside its scene, then run
 * `pnpm test` (tests/jelajah/concept-sound-cues.test.ts checks scenes, beats, ordering and the voice cap),
 * and re-render the WAV (CLAUDE.md "Sound (Phase 21)").
 *
 * Levels: `gain` is linear on top of the bus level (music bus under the effects, lib/audio/engine.ts MIX).
 */
import type { SoundRef } from '@/lib/audio/core';
import { bemStep, GONG_HZ, pelog, type PelogDegree } from '@/lib/audio/pitch';
import { seededRng } from '@/lib/audio/rng';
import type { Automation, Cue } from '@/lib/audio/scheduler';
import { duckRamps } from '@/lib/audio/voice-over';
import { buildCongklakDemo } from './congklak-demo';
import { ARCHIVE_CARD_COUNT, BEATS, CONCEPT_SCENES, CONCEPT_VOICEOVER, REDUCED_STEP_MS, VOICEOVER_DUCK_DB } from './script';
import { easeOutBack } from './timeline';
import type { ConceptSceneId } from './types';

export const CONCEPT_SOUND_GROUP = 'concept';
/** Exit fades: "Lewati" / Esc, and reaching the map ("Mulai Menjelajah", Enter, or by itself). */
export const SKIP_FADE_MS = 300;
export const END_FADE_MS = 600;

const sceneOf = (id: ConceptSceneId) => CONCEPT_SCENES.find((s) => s.id === id)!;
const S = (id: ConceptSceneId) => sceneOf(id).start;
/** A bed's length: the scene, half of the next cross-fade, and a little tail (ms). */
function bedMs(id: ConceptSceneId): number {
  const i = CONCEPT_SCENES.findIndex((s) => s.id === id);
  const next = CONCEPT_SCENES[i + 1];
  return CONCEPT_SCENES[i].duration + (next ? next.fadeIn / 2 : 0) + 800;
}
const sec = (ms: number) => Math.round(ms) / 1000;

/** Chords (Hz) of the music bed, pelog bem. */
const CHORD = {
  dusk: [pelog(1, -1), pelog(3, -1), pelog(5, -1)],
  home: [pelog(1, -1), pelog(5, -1), pelog(3)],
  village: [pelog(2, -1), pelog(5, -1), pelog(1)],
  full: [pelog(1, -1), pelog(5, -1), pelog(1), pelog(3)],
  resolve: [pelog(1, -2), pelog(1, -1), pelog(5, -1), pelog(1), pelog(3)],
};

type Extra = Partial<Omit<Cue, 'id' | 'at' | 'ref' | 'bus' | 'gain' | 'scene' | 'beat'>>;

/** Collects the cues of one scene with unique ids. */
function sheet(scene: ConceptSceneId) {
  const cues: Cue[] = [];
  const add = (beat: string, at: number, ref: SoundRef, bus: Cue['bus'], gain: number, extra: Extra = {}) => {
    cues.push({ id: `${scene}:${beat}:${cues.length}`, at: Math.round(at), ref, bus, gain, scene, beat, ...extra });
  };
  return { cues, add };
}

/** Times (scene ms) at which the rolling seeds of scene 1 reach a hole, from BEATS.halaman (Courtyard.tsx). */
export function seedArrivals(until: number = BEATS.halaman.seedsTo): number[] {
  const { seedsFrom, seedPeriod, seedPhase, seeds } = BEATS.halaman;
  const out: number[] = [];
  for (let i = 0; i < seeds; i += 1) {
    const phase = i * seedPhase;
    // u = (t − seedsFrom) / seedPeriod + phase crosses an integer n at t = seedsFrom + (n − phase) · seedPeriod.
    for (let n = Math.floor(phase) + 1; ; n += 1) {
      const t = seedsFrom + (n - phase) * seedPeriod;
      if (t > until) break;
      if (t > seedsFrom) out.push(t);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Fraction of a card's flight at which it first reaches its place (easeOutBack overshoots after that). */
export const CARD_ARRIVAL = (() => {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 40; k += 1) {
    const mid = (lo + hi) / 2;
    if (easeOutBack(mid) >= 1) hi = mid;
    else lo = mid;
  }
  return hi;
})();

/** Pulse starts (scene ms) of village ring `i` between `from` and `to` (Village.tsx `Ring`). */
export function ringPulses(i: number, from: number, to: number): number[] {
  const { ringPeriod, ringStagger } = BEATS.jelajah;
  const out: number[] = [];
  for (let n = Math.ceil((from + i * ringStagger) / ringPeriod); ; n += 1) {
    const t = n * ringPeriod - i * ringStagger;
    if (t >= to) break;
    if (t >= from) out.push(t);
  }
  return out;
}

/** Stereo position of a congklak pit on the mini board (MiniBoard.tsx pitPosition: x 60..700). */
function pitPan(pit: number): number {
  const x = pit === 7 ? 700 : pit === 15 ? 60 : pit < 7 ? 140 + pit * 80 : 620 - (pit - 8) * 80;
  return ((x - 380) / 320) * 0.5;
}

// ---- scenes ---------------------------------------------------------------------------------------------

function halaman(): Cue[] {
  const { cues, add } = sheet('halaman');
  const s = S('halaman');
  const rnd = seededRng(101);
  const bed = bedMs('halaman');
  add('dusk wind', s, { id: 'wind', len: sec(bed) }, 'sfx', 0.2, { resumable: true, wet: 0.1 });
  add('dusk pad', s + 150, { id: 'pad', notes: CHORD.dusk, len: sec(bed) }, 'music', 0.62, { resumable: true, wet: 0.35 });
  // Crickets and a distant bird: seeded positions across the scene.
  for (let k = 0; k < 9; k += 1) {
    add('crickets', s + 350 + k * 600 + rnd() * 300, { id: 'cricket', v: k % 4 }, 'sfx', 0.07 + rnd() * 0.04, { pan: rnd() * 1.6 - 0.8, wet: 0.25 });
  }
  add('distant bird', s + 1700, { id: 'bird', v: 0 }, 'sfx', 0.08, { pan: -0.6, wet: 0.5 });
  add('distant bird', s + 4200, { id: 'bird', v: 1 }, 'sfx', 0.07, { pan: 0.55, wet: 0.5 });
  // Slow saron motif (pelog bem 3 5 6 5 3 2 1), one note every 700 ms.
  const motif: PelogDegree[] = [3, 5, 6, 5, 3, 2, 1];
  motif.forEach((d, k) => add('saron motif', s + 800 + k * 700, { id: 'saron', hz: pelog(d) }, 'music', 0.5 - k * 0.02, { pan: -0.15, wet: 0.3 }));
  // A seed click each time a rolling seed reaches a hole.
  for (const t of seedArrivals()) {
    add('seed rolls into a hole', s + t, { id: 'seed', v: Math.floor(rnd() * 4) }, 'sfx', 0.2 + rnd() * 0.06, { rate: 0.94 + rnd() * 0.12, pan: -0.2, wet: 0.08 });
  }
  // The gasing spins from the start until the toys dissolve in scene 2 (the whirr slows down at its end).
  const spinEnd = S('terlupa') + BEATS.terlupa.dustFrom + 1500;
  add('gasing spins', s, { id: 'gasing', len: sec(spinEnd - s) }, 'sfx', 0.11, { pan: 0.3, resumable: true, wet: 0.08 });
  return cues;
}

function terlupa(): Cue[] {
  const { cues, add } = sheet('terlupa');
  const s = S('terlupa');
  const { dustFrom, dustTo } = BEATS.terlupa;
  const rnd = seededRng(202);
  add('low drone', s + 200, { id: 'drone', hz: pelog(1, -2), len: sec(bedMs('terlupa') - 200) }, 'music', 0.75, { resumable: true, wet: 0.2 });
  // The saron keeps playing, slower and quieter, through the falling lowpass and the pitch sag.
  ([5, 3, 2, 1] as PelogDegree[]).forEach((d, k) =>
    add('saron fades', s + 300 + k * 1150, { id: 'saron', hz: pelog(d) }, 'music', 0.42 - k * 0.07, { pan: -0.15, wet: 0.35 }),
  );
  // The seeds still roll (sepia) until the toys turn to dust.
  for (const t of seedArrivals(dustFrom + 900)) {
    add('seed rolls (fading)', s + t, { id: 'seed', v: Math.floor(rnd() * 4) }, 'sfx', 0.16 * (1 - t / (dustFrom + 1500)), { rate: 0.9, pan: -0.2, wet: 0.15 });
  }
  add('wind gust', s + dustFrom - 300, { id: 'gust', len: 2.6 }, 'sfx', 0.32, { pan: 0.2, wet: 0.25 });
  add('toys dissolve into dust', s + dustFrom, { id: 'dust', len: sec(dustTo - dustFrom) }, 'sfx', 0.5, { pan: -0.2, panTo: 0.7, resumable: true, wet: 0.3 });
  return cues;
}

function nusantara(): Cue[] {
  const { cues, add } = sheet('nusantara');
  const s = S('nusantara');
  const { gatherFrom, lightFrom, lightTo, wordmarkAt } = BEATS.nusantara;
  add('rising swell', s + gatherFrom, { id: 'swell', notes: CHORD.dusk, len: sec(wordmarkAt - gatherFrom) }, 'music', 0.7, { resumable: true, wet: 0.3 });
  // Ascending bonang notes following the west-to-east light sweep (12 notes, pelog bem, panned west → east).
  const notes = 12;
  for (let k = 0; k < notes; k += 1) {
    const at = lightFrom + (k * (lightTo - lightFrom)) / (notes - 1);
    add('light sweeps west to east', s + at, { id: 'bonang', hz: bemStep(k) }, 'music', 0.34 + k * 0.012, {
      pan: -0.8 + (1.6 * k) / (notes - 1),
      wet: 0.35,
    });
  }
  add('wordmark lands (GONG)', s + wordmarkAt, { id: 'gong', hz: GONG_HZ }, 'sfx', 1, { resumable: true, wet: 0.3 });
  add('wordmark shimmer', s + wordmarkAt + 30, { id: 'shimmer', notes: [bemStep(5), bemStep(7), bemStep(8), bemStep(9)], len: 3 }, 'sfx', 0.28, { wet: 0.5 });
  add('home chord', s + wordmarkAt, { id: 'pad', notes: CHORD.home, len: sec(bedMs('nusantara') - wordmarkAt) }, 'music', 0.5, { resumable: true, wet: 0.4 });
  return cues;
}

function arsip(): Cue[] {
  const { cues, add } = sheet('arsip');
  const sc = sceneOf('arsip');
  const s = sc.start;
  const { cardsFrom, cardStagger, cardFlight, stampAt, stampDrop } = BEATS.arsip;
  add('archive pad', s, { id: 'pad', notes: [pelog(1, -1), pelog(5, -1)], len: sec(bedMs('arsip')) }, 'music', 0.4, { resumable: true, wet: 0.3 });
  // Kendang at a moderate tempo (100 bpm, eighth notes of 300 ms): dang = low, tak = high.
  const pattern = 'D-t-D-t-D-ttD-t-';
  const step = 300;
  for (let k = 0, t = cardsFrom; t < sc.duration - 300; k += 1, t += step) {
    const hit = pattern[k % pattern.length];
    if (hit === 'D') add('kendang', s + t, { id: 'dang' }, 'music', 0.62, { pan: -0.1, wet: 0.12 });
    else if (hit === 't') add('kendang', s + t, { id: 'tak' }, 'music', 0.4, { pan: 0.12, wet: 0.12 });
  }
  // Saron balungan on the beat (600 ms).
  const balungan: PelogDegree[] = [3, 5, 6, 5, 3, 2, 3, 5, 6, 5, 3];
  balungan.forEach((d, k) => {
    const t = cardsFrom + k * 600;
    if (t < sc.duration - 300) add('saron balungan', s + t, { id: 'saron', hz: pelog(d) }, 'music', 0.36, { pan: -0.25, wet: 0.25 });
  });
  // A paper swish per flying card (from its side) and a soft tap where it lands.
  for (let i = 0; i < ARCHIVE_CARD_COUNT; i += 1) {
    const start = cardsFrom + i * cardStagger;
    const side = i % 2 === 0 ? -0.5 : 0.5; // ArsipScene FROM: cards alternate left / right
    add('card flies in', s + start, { id: 'paper' }, 'sfx', 0.32, { pan: side, panTo: side * 0.3, rate: 0.95 + (i % 3) * 0.05 });
    add('card lands', s + start + CARD_ARRIVAL * cardFlight, { id: 'tap' }, 'sfx', 0.3, { pan: side * 0.3, wet: 0.08 });
  }
  add('"Diperiksa kurator" stamp', s + stampAt + stampDrop, { id: 'stamp' }, 'sfx', 0.95, { wet: 0.15 });
  add('stamp accent', s + stampAt + stampDrop, { id: 'dang' }, 'music', 0.5, { wet: 0.2 });
  return cues;
}

function jelajah(): Cue[] {
  const { cues, add } = sheet('jelajah');
  const sc = sceneOf('jelajah');
  const s = sc.start;
  const { diveFrom, diveTo, villageAt, stands, pavilionRing } = BEATS.jelajah;
  const rnd = seededRng(505);
  add('dive into Sumatera Selatan', s + diveFrom, { id: 'whoosh', len: sec(diveTo - diveFrom), up: false }, 'sfx', 0.55, { resumable: true, wet: 0.2 });
  const tail = bedMs('jelajah') - villageAt;
  add('village pad', s + villageAt, { id: 'pad', notes: CHORD.village, len: sec(tail) }, 'music', 0.5, { resumable: true, wet: 0.35 });
  add('village wind', s + villageAt, { id: 'wind', len: sec(tail) }, 'sfx', 0.13, { resumable: true });
  [300, 1350, 2600, 3700].forEach((t, k) =>
    add('village birds', s + villageAt + t + rnd() * 200, { id: 'bird', v: 2 + k }, 'sfx', 0.08 + rnd() * 0.03, { pan: rnd() * 1.4 - 0.7, wet: 0.35 }),
  );
  // Soft chimes on the glow pulses: each stand's first pulse once the village is visible, then the pavilion's.
  const visible = villageAt + 300;
  for (let i = 0; i < stands; i += 1) {
    const [t] = ringPulses(i, visible, sc.duration);
    if (t !== undefined) add('stand glow pulses', s + t, { id: 'chime', hz: bemStep(5 + i) }, 'sfx', 0.11, { pan: -0.5 + i * 0.2, wet: 0.45 });
  }
  ringPulses(pavilionRing, visible, sc.duration).forEach((t, k) =>
    add('pavilion glow pulses', s + t, { id: 'chime', hz: bemStep(k % 2 === 0 ? 5 : 7) }, 'sfx', 0.15, { wet: 0.45 }),
  );
  return cues;
}

function main(): Cue[] {
  const { cues, add } = sheet('main');
  const s = S('main');
  const { moveStarts, moveDuration, stampAt, stampDrop } = BEATS.main;
  const rnd = seededRng(606);
  add('play pad', s, { id: 'pad', notes: CHORD.dusk, len: sec(bedMs('main')) }, 'music', 0.42, { resumable: true, wet: 0.3 });
  const demo = buildCongklakDemo();
  demo.moves.forEach((move, m) => {
    const frames = move.frames.length;
    add('move starts', s + moveStarts[m], { id: 'bonang', hz: bemStep([2, 3, 4][m] ?? 2) }, 'music', 0.3, { wet: 0.3 });
    // MiniBoard shows frame f at moveStart + f / (frames − 1) · moveDuration: a click for every sown seed.
    for (let f = 1; f < frames; f += 1) {
      const at = s + moveStarts[m] + (f / (frames - 1)) * moveDuration;
      const kind = move.kinds[f];
      const pan = pitPan(move.hand[f] >= 0 ? move.hand[f] : 7);
      if (kind === 'sow') {
        add('seed sown', at, { id: 'seed', v: Math.floor(rnd() * 4) }, 'sfx', 0.28, { rate: 0.92 + rnd() * 0.16, pan, wet: 0.08 });
      } else if (kind === 'pickup' || kind === 'relay') {
        add('seeds picked up', at, { id: 'seed', v: 0 }, 'sfx', 0.18, { rate: 0.8, pan });
        add('seeds picked up', at + 45, { id: 'seed', v: 3 }, 'sfx', 0.15, { rate: 0.85, pan });
      } else if (kind === 'capture') {
        add('capture', at, { id: 'tak' }, 'sfx', 0.35, { pan, wet: 0.15 });
      }
    }
    add('"+10 XP" chip', s + moveStarts[m] + moveDuration, { id: 'sparkle', notes: [bemStep(10), bemStep(11), bemStep(12), bemStep(14)] }, 'sfx', 0.32, {
      pan: -0.3 + m * 0.3,
      wet: 0.35,
    });
  });
  add('Paspor Budaya stamp slam', s + stampAt + stampDrop, { id: 'stamp' }, 'sfx', 1, { pan: 0.25, wet: 0.15 });
  add('slam accent', s + stampAt + stampDrop, { id: 'dang' }, 'music', 0.55, { wet: 0.2 });
  return cues;
}

function bersama(): Cue[] {
  const { cues, add } = sheet('bersama');
  const sc = sceneOf('bersama');
  const s = sc.start;
  const { arcsFrom, arcStagger, arcTravel, arcs } = BEATS.bersama;
  add('warm pad', s, { id: 'pad', notes: CHORD.full, len: sec(bedMs('bersama')) }, 'music', 0.75, { resumable: true, wet: 0.4, fadeIn: 400 });
  // The saron climbs while the dots appear.
  for (let k = 0; k < 8; k += 1) add('ensemble builds', s + 300 + k * 450, { id: 'saron', hz: bemStep(k) }, 'music', 0.3 + k * 0.02, { pan: -0.3, wet: 0.3 });
  // A kecapi pluck as each arc connects.
  const melody = [0, 2, 4, 3, 5, 4, 6, 7, 5, 8];
  for (let i = 0; i < arcs; i += 1) {
    add('arc connects', s + arcsFrom + i * arcStagger + arcTravel, { id: 'kecapi', hz: bemStep(melody[i % melody.length]) }, 'music', 0.6, {
      pan: i % 2 === 0 ? -0.35 : 0.35,
      wet: 0.3,
    });
  }
  // Fullest: bonang chords, a swell and a kendang roll into the final gong.
  add('ensemble swell', s + arcsFrom, { id: 'swell', notes: CHORD.full, len: sec(sc.duration - arcsFrom) }, 'music', 0.45, { resumable: true, wet: 0.35 });
  [arcsFrom, arcsFrom + 1200].forEach((t) => {
    for (const k of [0, 2, 3]) add('bonang chord', s + t, { id: 'bonang', hz: bemStep(5 + k) }, 'music', 0.22, { wet: 0.35 });
  });
  for (let k = 0; k < 8; k += 1) {
    const t = sc.duration - 900 + k * 105;
    add('kendang roll', s + t, { id: k % 2 === 0 ? 'dang' : 'tak' }, 'music', 0.32 + k * 0.03, { wet: 0.12 });
  }
  return cues;
}

function mulai(): Cue[] {
  const { cues, add } = sheet('mulai');
  const s = S('mulai');
  add('final gong', s, { id: 'gong', hz: GONG_HZ }, 'sfx', 1, { resumable: true, wet: 0.35 });
  add('resolving chord', s, { id: 'pad', notes: CHORD.resolve, len: 7 }, 'music', 0.75, { resumable: true, wet: 0.45, release: 2500 });
  ([1, 3, 5] as PelogDegree[]).forEach((d, k) => add('saron chord', s + k * 60, { id: 'saron', hz: pelog(d) }, 'music', 0.32, { pan: -0.3 + k * 0.3, wet: 0.4 }));
  add('saron chord', s + 180, { id: 'saron', hz: pelog(1, 1) }, 'music', 0.26, { wet: 0.4 });
  add('brand mark shimmer', s + 50, { id: 'shimmer', notes: [bemStep(5), bemStep(7), bemStep(9)], len: 3 }, 'sfx', 0.2, { wet: 0.5 });
  add('button appears', s + BEATS.mulai.buttonAt, { id: 'chime', hz: bemStep(10) }, 'sfx', 0.08, { wet: 0.5 });
  return cues;
}

/** The whole soundtrack, sorted by time. */
export function buildConceptCues(): Cue[] {
  return [...halaman(), ...terlupa(), ...nusantara(), ...arsip(), ...jelajah(), ...main(), ...bersama(), ...mulai()].sort((a, b) => a.at - b.at);
}

/** Music lowpass sweep down and "tape slowing" pitch sag in scene 2, both undone as scene 3 gathers. */
export function buildConceptAutomation(): Automation[] {
  const t2 = S('terlupa');
  const t3 = S('nusantara');
  const { drainEnd } = BEATS.terlupa;
  const { gatherFrom, gatherTo } = BEATS.nusantara;
  return [
    { param: 'cutoff', from: t2 - 200, to: t2 + drainEnd + 600, v0: 16000, v1: 650, curve: 'exp', scene: 'terlupa' },
    { param: 'bend', from: t2, to: t2 + drainEnd + 600, v0: 0, v1: -0.06, scene: 'terlupa' },
    { param: 'bend', from: t3, to: t3 + 500, v0: -0.06, v1: 0, scene: 'nusantara' },
    { param: 'cutoff', from: t3 + gatherFrom, to: t3 + gatherTo, v0: 650, v1: 16000, curve: 'exp', scene: 'nusantara' },
  ];
}

/**
 * Reduced motion (stills, "Lanjut" or every REDUCED_STEP_MS): the music bed and each scene's key hits,
 * on the reduced timeline (still i starts at i × REDUCED_STEP_MS). "Lanjut" seeks to the next still, so
 * its sounds fire at once.
 */
export function buildReducedCues(): Cue[] {
  const cues: Cue[] = [];
  const bedChord: Record<ConceptSceneId, number[]> = {
    halaman: CHORD.dusk,
    terlupa: [pelog(1, -2), pelog(1, -1)],
    nusantara: CHORD.home,
    arsip: [pelog(1, -1), pelog(5, -1)],
    jelajah: CHORD.village,
    main: CHORD.dusk,
    bersama: CHORD.full,
    mulai: CHORD.resolve,
  };
  CONCEPT_SCENES.forEach((sc, i) => {
    const s = i * REDUCED_STEP_MS;
    const last = i === CONCEPT_SCENES.length - 1;
    let n = 0;
    const add = (beat: string, at: number, ref: SoundRef, bus: Cue['bus'], gain: number, extra: Extra = {}) =>
      cues.push({ id: `${sc.id}:reduced:${beat}:${n++}`, at: s + at, ref, bus, gain, scene: sc.id, beat, key: true, ...extra });
    add('music bed', 0, { id: 'pad', notes: bedChord[sc.id], len: sec(REDUCED_STEP_MS + (last ? 2500 : 600)) }, 'music', 0.6, {
      resumable: true,
      wet: 0.4,
      fadeIn: 300,
    });
    switch (sc.id) {
      case 'halaman':
        ([3, 5, 6] as PelogDegree[]).forEach((d, k) => add('saron motif', 300 + k * 700, { id: 'saron', hz: pelog(d) }, 'music', 0.45, { wet: 0.3 }));
        add('crickets', 900, { id: 'cricket', v: 1 }, 'sfx', 0.08, { pan: -0.5, wet: 0.25 });
        add('crickets', 2400, { id: 'cricket', v: 2 }, 'sfx', 0.08, { pan: 0.5, wet: 0.25 });
        break;
      case 'terlupa':
        add('low drone', 0, { id: 'drone', hz: pelog(1, -2), len: sec(REDUCED_STEP_MS) }, 'music', 0.6, { resumable: true });
        add('wind gust', 400, { id: 'gust', len: 2.6 }, 'sfx', 0.3, { wet: 0.25 });
        break;
      case 'nusantara':
        add('wordmark gong', 300, { id: 'gong', hz: GONG_HZ }, 'sfx', 1, { resumable: true, wet: 0.3 });
        add('shimmer', 330, { id: 'shimmer', notes: [bemStep(5), bemStep(7), bemStep(8), bemStep(9)], len: 3 }, 'sfx', 0.25, { wet: 0.5 });
        break;
      case 'arsip':
        add('card', 200, { id: 'paper' }, 'sfx', 0.3);
        add('curator stamp', 900, { id: 'stamp' }, 'sfx', 0.9, { wet: 0.15 });
        break;
      case 'jelajah':
        add('chime', 400, { id: 'chime', hz: bemStep(5) }, 'sfx', 0.14, { wet: 0.45 });
        add('chime', 1800, { id: 'chime', hz: bemStep(7) }, 'sfx', 0.14, { wet: 0.45 });
        break;
      case 'main':
        [200, 350, 500].forEach((t, k) => add('seed', t, { id: 'seed', v: k }, 'sfx', 0.26, { rate: 0.95 + k * 0.05 }));
        add('+10 XP', 800, { id: 'sparkle', notes: [bemStep(10), bemStep(11), bemStep(12), bemStep(14)] }, 'sfx', 0.3, { wet: 0.35 });
        add('passport stamp', 1500, { id: 'stamp' }, 'sfx', 0.9, { wet: 0.15 });
        break;
      case 'bersama':
        [0, 2, 4].forEach((m, k) => add('kecapi', 300 + k * 450, { id: 'kecapi', hz: bemStep(m) }, 'music', 0.55, { wet: 0.3 }));
        break;
      default:
        add('final gong', 0, { id: 'gong', hz: GONG_HZ }, 'sfx', 1, { resumable: true, wet: 0.35 });
        break;
    }
  });
  return cues.sort((a, b) => a.at - b.at);
}

/** Every sound a sheet needs, in order of first use, the gong and the first scene first (render order). */
export function soundsInOrder(cues: readonly Cue[]): SoundRef[] {
  const seen = new Set<string>();
  const out: SoundRef[] = [];
  const push = (ref: SoundRef) => {
    const key = JSON.stringify(ref);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ref);
  };
  push({ id: 'gong', hz: GONG_HZ });
  push({ id: 'tick' });
  for (const c of [...cues].sort((a, b) => a.at - b.at)) if (c.ref) push(c.ref);
  return out;
}

/** Voice-over files from the script (none yet) with the music duck while each one speaks. */
export function voiceOverPlan(): { scene: ConceptSceneId; src: string; at: number }[] {
  return CONCEPT_VOICEOVER.map((vo) => ({ ...vo, at: S(vo.scene) }));
}

/** The music duck while a voice-over speaks (VOICEOVER_DUCK_DB, script.ts). */
export function voiceOverDuck(at: number, durationMs: number): Automation[] {
  return duckRamps(at, durationMs, VOICEOVER_DUCK_DB);
}
