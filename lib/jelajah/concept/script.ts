/**
 * THE script of the concept video ("Kenali" + SITE_NAME, Phase 19): every text and every timing of
 * the film is in this file, so the copy can be edited without touching the components.
 *
 * How to edit:
 * - Captions: change `caption` / `subcaption` below. Keep each one at most 70 characters (two lines on a
 *   360 px phone) and honest: no Points, cash, prizes or multiplayer (a test fails on "poin", "hadiah",
 *   "uang", "multiplayer"). XP and Paspor stamps exist (simulated for now) and may be mentioned.
 * - Timings: `start` and `duration` are milliseconds on the film's clock. Scenes must stay contiguous
 *   (each `start` = previous `start` + previous `duration`); the total should stay about 48 s. `BEATS`
 *   holds the moments inside a scene (ms from the scene's start).
 * - The scene order and ids are fixed (each id has its own scene component).
 * Run `pnpm test` after editing: `tests/jelajah/concept-script.test.ts` checks all of the above.
 */
import { SITE_NAME } from '@/lib/brand';
import type { ConceptScene } from './types';

export const CONCEPT_SCENES: readonly ConceptScene[] = [
  {
    id: 'halaman',
    start: 0,
    duration: 6000,
    caption: 'Dulu, kita bermain di halaman.',
    fadeIn: 0,
    still: 0.55,
  },
  {
    id: 'terlupa',
    start: 6000,
    duration: 5000,
    caption: 'Kini, banyak permainan itu mulai terlupakan.',
    fadeIn: 1400,
    still: 0.45,
  },
  {
    id: 'nusantara',
    start: 11000,
    duration: 7000,
    caption: `${SITE_NAME} menyimpannya kembali.`,
    fadeIn: 1000,
    still: 0.92,
  },
  {
    id: 'arsip',
    start: 18000,
    duration: 7000,
    // The subcaption is live: archiveSubcaption() below, from the published PROT.
    caption: 'Setiap permainan dicatat: asal, cara main, dan ceritanya.',
    fadeIn: 800,
    still: 0.85,
  },
  {
    id: 'jelajah',
    start: 25000,
    duration: 7000,
    caption: 'Masuki desa di tiap provinsi. Temukan permainannya.',
    fadeIn: 800,
    still: 0.8,
  },
  {
    id: 'main',
    start: 32000,
    duration: 7000,
    caption: 'Mainkan langsung di browser. Kumpulkan XP dan cap Paspor Budaya.',
    fadeIn: 800,
    still: 0.95,
  },
  {
    id: 'bersama',
    start: 39000,
    duration: 5000,
    caption: 'Untuk pelajar, guru, dan komunitas.',
    subcaption: 'Warisan yang dimainkan, bukan hanya disimpan.',
    fadeIn: 1000,
    still: 0.8,
  },
  {
    id: 'mulai',
    start: 44000,
    duration: 4000,
    caption: 'Ayo mulai menjelajah.',
    fadeIn: 800,
    still: 0.9,
  },
];

/** Length of the film (the end of the last scene), ms. */
export const CONCEPT_TOTAL_MS = CONCEPT_SCENES[CONCEPT_SCENES.length - 1].start + CONCEPT_SCENES[CONCEPT_SCENES.length - 1].duration;

/** After the last scene ends, the film continues to the map by itself after this long, unless touched. */
export const FINAL_HOLD_MS = 3000;

/** Reduced motion: each still stays this long (or until "Lanjut"). */
export const REDUCED_STEP_MS = 5000;

/** Moments inside the scenes, ms from the scene's start. */
export const BEATS = {
  halaman: { seedsFrom: 600, seedsTo: 5200 },
  terlupa: { drainEnd: 1600, dustFrom: 1200, dustTo: 4600 },
  nusantara: { gatherFrom: 0, gatherTo: 3200, lightFrom: 2200, lightTo: 5600, wordmarkAt: 4200 },
  arsip: { cardsFrom: 200, cardStagger: 260, cardFlight: 900, stampAt: 4700 },
  jelajah: { diveFrom: 300, diveTo: 3000, villageAt: 2600 },
  main: { moveStarts: [400, 2000, 3600] as readonly number[], moveDuration: 1400, stampAt: 5400 },
  bersama: { dotsFrom: 300, dotStagger: 60, arcsFrom: 1300, arcStagger: 220 },
  mulai: { buttonAt: 700 },
} as const;

/** Archive cards in scene 4 (real PROT names when available, otherwise neutral cards without names). */
export const ARCHIVE_CARD_COUNT = 6;

/** The map's replay button (the hub imports only this constant, not the film). */
export const CONCEPT_REPLAY_LABEL = 'Tonton pengenalan';

/** Fixed texts of the player and the scenes (Bahasa Indonesia; the brand from lib/brand.ts). */
export const CONCEPT_TEXT = {
  dialogLabel: `Pengenalan ${SITE_NAME}`,
  wordmark: SITE_NAME,
  skip: 'Lewati',
  next: 'Lanjut',
  start: 'Mulai Menjelajah',
  replay: CONCEPT_REPLAY_LABEL,
  stamp: 'Diperiksa kurator',
  passport: 'Paspor Budaya',
  xpChip: '+10 XP',
  audiences: ['Pelajar', 'Guru', 'Komunitas'] as readonly string[],
  /** Accessible name of the decorative stage (the captions carry the meaning). */
  stageLabel: 'Animasi pengenalan',
  /** Shown under the button on the last scene. */
  finalHint: 'Tekan Enter untuk mulai',
  reducedHint: 'Tekan Lanjut, atau tunggu sebentar',
  /** Prefix of the screen-reader progress text, e.g. "Adegan 3 dari 8". */
  sceneOf: (n: number, total: number) => `Adegan ${n} dari ${total}`,
} as const;

const fmt = (n: number) => n.toLocaleString('id-ID');

/**
 * Live subcaption of scene 4, from the published PROT (the map's own count). Null when unknown or 0:
 * the scene then shows no subcaption (never "0", never an invented number).
 */
export function archiveSubcaption(prot: number | null, provinces: number | null): string | null {
  if (prot === null || provinces === null || !Number.isFinite(prot) || !Number.isFinite(provinces)) return null;
  if (prot <= 0 || provinces <= 0) return null;
  return `${fmt(prot)} permainan dari ${fmt(provinces)} provinsi sudah terbit di arsip.`;
}

/**
 * Optional music, later (Phase 19 has no audio). TODO(music): set `src` to a licensed track under
 * public/ and let the player start it only after a user gesture (never autoplay with sound), muted by
 * default with a visible toggle, and stopped on close. The player reads this hook already.
 */
export const CONCEPT_MUSIC: { src: string | null } = { src: null };
