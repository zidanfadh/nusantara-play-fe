/**
 * Every Indonesian text of the gasing game (Phase 20): UI strings, mode explanations, the tutorial, the
 * "Cara bermain" rules (generated from rules.ts) and the "Tentang permainan ini" panel. Simple Indonesian.
 * Pure: no React, no DOM.
 *
 * The rules and the "Tentang" panel are based on the published archive record "Gasing" (Kepulauan Riau,
 * status ARSIP_NASIONAL, fetched read-only in Phase 20). Its text is paraphrased below and credited; nothing
 * is added that the record does not say. The game records nothing and makes no network call, so the text is
 * stored here instead of being loaded.
 */
import { bestOf, type GasingRules } from './rules';
import type { AiLevel, GameMode, RoundReason, RoundWinner, Side } from './types';

export const GAME_TITLE = 'Gasing';

export const GAME_TAGLINE = 'Lempar gasingmu dan buat ia berputar paling lama.';

/** Same note as congklak (games record nothing, Phase 17). */
export const NO_DATA_NOTE = 'Permainan ini tidak menyimpan data apa pun.';

export const SETTINGS_NOTE = 'Pilihan di atas hanya diingat di perangkat ini.';

export const NAMES: Readonly<Record<Side, string>> = { 0: 'Kamu', 1: 'Komputer' };

export interface ModeText {
  value: GameMode;
  label: string;
  /** One line under the mode button. */
  explain: string;
}

export const MODE_TEXTS: readonly ModeText[] = [
  {
    value: 'uri',
    label: 'Uri (tahan lama)',
    explain: 'Kamu dan komputer melempar sekali tiap ronde; gasing yang berputar paling lama menang.',
  },
  {
    value: 'pangkah',
    label: 'Pangkah (adu)',
    explain: 'Hantam gasing lawan yang sedang berputar sampai keluar arena atau berhenti lebih dulu. Lalu peran bertukar.',
  },
];

export const LEVEL_TEXTS: readonly { value: AiLevel; label: string }[] = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
];

export const UI = {
  modeLegend: 'Mode',
  levelLegend: 'Tingkat kesulitan',
  start: 'Mulai main',
  rules: 'Cara bermain',
  about: 'Tentang permainan ini',
  restart: 'Mulai ulang',
  settings: 'Pengaturan',
  settingsAria: 'Pengaturan permainan',
  playAgain: 'Main lagi',
  changeSettings: 'Ubah pengaturan',
  nextRound: 'Ronde berikutnya',
  yourTurn: 'Giliranmu',
  computerTurn: 'Giliran Komputer',
  spinning: 'Gasing berputar…',
  perfect: 'Lemparan mantap!',
  directHit: 'Pangkah tepat!',
  cancelled: 'Lemparan dibatalkan.',
  canvasLabel: 'Arena gasing',
  spinMeter: 'Putaran',
  seconds: 'dtk',
  roundOf: (round: number) => `Ronde ${round}`,
  /** Hint under the arena while it is the player's turn. */
  aimHint: 'Tekan di arena, tarik ke belakang, tahan sampai tali bersinar emas, lalu lepas.',
  keyboardHint: 'Keyboard: ← → arah, ↑ ↓ kekuatan, tahan Spasi lalu lepas untuk melempar.',
  roleTarget: 'Putar gasingmu di arena. Komputer akan mencoba menghantamnya.',
  roleStriker: 'Hantam gasing komputer!',
  roleUri: 'Buat gasingmu berputar selama mungkin.',
  computerThrows: 'Komputer melempar.',
  playerThrows: 'Kamu melempar.',
  legendPlayer: 'Kamu (bertitik)',
  legendComputer: 'Komputer (bergaris)',
  rulesTitle: 'Cara bermain gasing',
  outShort: 'keluar',
  debugFps: 'fps',
} as const;

/** Heading of the round overlay. */
export function roundHeading(winner: RoundWinner): string {
  if (winner === 'draw') return 'Seri';
  return winner === 0 ? 'Kamu menang ronde ini!' : 'Komputer menang ronde ini';
}

export const TUTORIAL_STEPS: readonly { title: string; text: string }[] = [
  {
    title: 'Tarik',
    text: 'Tekan di mana saja di arena, lalu tarik ke belakang seperti ketapel. Makin jauh ditarik, makin kuat lemparannya.',
  },
  {
    title: 'Arahkan',
    text: 'Garis menunjukkan arah lemparan dan lingkaran putus-putus tempat gasing mendarat. Lemparan kuat berputar lebih kencang tetapi meluncur lebih jauh.',
  },
  {
    title: 'Lepas',
    text: 'Tahan diam sebentar sampai tali bersinar emas, lalu lepas: "Lemparan mantap!". Untuk batal, kembalikan jari ke titik awal lalu lepas.',
  },
];

export const TUTORIAL_UI = { skip: 'Lewati', next: 'Lanjut', done: 'Ayo main', step: (i: number, n: number) => `Langkah ${i} dari ${n}` } as const;

/** Banner / aria-live line when a top ends. */
export function endText(side: Side, reason: 'jatuh' | 'keluar'): string {
  const who = side === 0 ? 'Gasingmu' : 'Gasing komputer';
  return reason === 'keluar' ? `${who} keluar arena.` : `${who} berhenti berputar.`;
}

export function formatSeconds(s: number): string {
  return s.toFixed(1).replace('.', ',');
}

/** "Kamu menang ronde 1: gasing komputer keluar arena." */
export function roundResultText(round: number, winner: RoundWinner, reason: RoundReason, times: [number, number]): string {
  if (winner === 'draw') return `Ronde ${round} seri (${formatSeconds(times[0])} dtk lawan ${formatSeconds(times[1])} dtk). Ronde diulang.`;
  const loser: Side = winner === 0 ? 1 : 0;
  // Two different times can round to the same tenth: then show hundredths.
  const fmt = (t: number) => (formatSeconds(times[winner]) === formatSeconds(times[loser]) ? t.toFixed(2).replace('.', ',') : formatSeconds(t));
  const head = winner === 0 ? `Kamu menang ronde ${round}` : `Komputer menang ronde ${round}`;
  if (reason === 'keluar') return `${head}: ${loser === 0 ? 'gasingmu' : 'gasing komputer'} keluar arena.`;
  return `${head}: ${fmt(times[winner])} dtk lawan ${fmt(times[loser])} dtk.`;
}

export function matchHeading(winner: RoundWinner): string {
  if (winner === 'draw') return 'Seri!';
  return winner === 0 ? 'Kamu menang!' : 'Komputer menang';
}

export function matchSummary(wins: [number, number]): string {
  return `Kamu ${wins[0]} ronde · Komputer ${wins[1]} ronde`;
}

/** Note under the rules: other versions exist, and the ruleset awaits curator review. */
export const RULES_VARIANT_NOTE =
  'Gasing dimainkan dengan cara berbeda-beda di tiap daerah. Permainan ini memakai satu versi digital yang disederhanakan, "Aturan dasar". Versi lain juga sah dimainkan.';

export const RULES_CURATOR_NOTE = 'Aturan dasar ini masih menunggu tinjauan kurator.';

export interface RulesSection {
  title: string;
  text: string;
}

export function rulesSections(rules: GasingRules): RulesSection[] {
  return [
    {
      title: 'Arena',
      text: rules.outIsLoss
        ? 'Gasing dilempar ke arena tanah yang dibatasi lingkaran tali. Gasing yang keluar dari lingkaran kalah pada ronde itu.'
        : 'Gasing dilempar ke arena tanah yang dibatasi lingkaran tali.',
    },
    {
      title: 'Melempar',
      text: 'Tarik ke belakang untuk mengarahkan, tahan sebentar agar tali terlilit rapi, lalu lepas. Lemparan kuat membuat gasing berputar lebih kencang, tetapi gasing mendarat dan meluncur lebih jauh.',
    },
    {
      title: 'Uri (tahan lama)',
      text: 'Setiap pihak melempar satu kali tiap ronde. Gasing yang berputar paling lama, dihitung sejak mendarat, memenangkan ronde.',
    },
    {
      title: 'Pangkah (adu)',
      text: 'Satu pihak memutar gasingnya lebih dulu, lalu pihak lain melempar gasingnya untuk menghantam gasing itu. Gasing yang keluar arena, atau berputar lebih singkat (dihitung sejak mendarat), kalah. Di ronde berikutnya peran bertukar.',
    },
    {
      title: 'Pemenang',
      text: `Pertandingan terdiri dari paling banyak ${bestOf(rules)} ronde. Yang lebih dulu memenangkan ${rules.roundsToWin} ronde menang. Ronde yang seri diulang.`,
    },
  ];
}

/** Differences between this digital version and the archive record, stated openly in the rules sheet. */
export const SIMPLIFICATIONS =
  'Penyederhanaan: kedua gasing di sini sama bentuknya (arsip menyebut jenis khusus seperti gasing pemangkah, penahan, dan penendin), dan urutan giliran sudah ditentukan.';

/**
 * The published archive record the texts are based on. `href` is its public page. Paraphrased; the record's
 * own wording is on that page.
 */
export const ARCHIVE_RECORD = {
  id: '5ed247fd-e45b-4308-bfbe-74c49fbb6557',
  name: 'Gasing',
  province: 'Kepulauan Riau',
  place: 'Kabupaten Natuna',
  href: '/prot/5ed247fd-e45b-4308-bfbe-74c49fbb6557',
} as const;

export const ABOUT_TEXT: readonly { title: string; text: string }[] = [
  {
    title: 'Asal-usul',
    text: 'Menurut arsip, gasing adalah permainan tradisional Melayu yang sudah ada jauh sebelum masa penjajahan Belanda, terutama di Kepulauan Tujuh (Natuna) dan Kepulauan Riau. Gasing tumbuh dalam budaya masyarakat pesisir dan sering dimainkan nelayan di sela waktu menangkap ikan. Di Kepulauan Riau gasing sudah dikenal pada zaman Kesultanan Riau-Lingga, dan Gasing Kepri ditetapkan sebagai Warisan Budaya Tak Benda Provinsi Kepulauan Riau sejak 2016.',
  },
  {
    title: 'Bahan',
    text: 'Gasing dibuat dari kayu keras, misalnya kayu stigi, tempinis, saga, atau asam, dibentuk kerucut atau bulat dengan paku besi di bagian bawah (paksi). Talinya dulu dari kulit pohon bebaru, sekarang sering dari tali nilon.',
  },
  {
    title: 'Cara bermain',
    text: 'Arsip mencatat dua cara utama, dengan variasi di tiap daerah: Gasing Uri, adu putaran terlama, dan Gasing Pangkah atau Tanding, adu hantam, ketika gasing lawan diputar lebih dulu lalu dihantam dengan gasing pemangkah. Di Natuna gasing sering dimainkan di atas kaca kecil; di Batam, Tanjungpinang, Karimun, dan Lingga biasanya langsung di tanah dengan sistem pangkah.',
  },
  {
    title: 'Nilai',
    text: 'Gasing melatih ketangkasan, kekuatan tangan, konsentrasi, dan keseimbangan. Bagi masyarakat Melayu Kepri gasing juga menjadi simbol keteguhan dan kesabaran.',
  },
];

export const ABOUT_CREDIT = `Sumber: arsip PROT "${ARCHIVE_RECORD.name}", ${ARCHIVE_RECORD.place}, ${ARCHIVE_RECORD.province} (diringkas).`;

export const ABOUT_LINK = 'Lihat arsip lengkap';
