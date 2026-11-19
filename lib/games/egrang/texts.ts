/**
 * Every Indonesian text of the egrang game (Phase 23): UI strings, variant and level labels, the tutorial
 * (3 steps per variant), the "Cara bermain" rules (generated from rules.ts), result lines and the
 * "Tentang permainan ini" panels. Simple Indonesian. Pure: no React, no DOM.
 *
 * Each variant is based on its OWN published archive record (status ARSIP_NASIONAL, fetched read-only in
 * Phase 23): Bambu on "Egrang Bambu" (Jawa Tengah, Kabupaten Magelang), Batok on "Egrang Batok" (Sulawesi
 * Selatan, Kabupaten Soppeng). Their text is paraphrased below and credited; nothing is added that the
 * records do not say. The game records nothing and makes no network call, so the text is stored here.
 */
import type { EgrangRules } from './rules';
import type { AiLevel, RaceResult, RaceWinner, Side, Variant } from './types';

export const GAME_TITLE = 'Egrang';

export const GAME_TAGLINE = 'Berlomba di atas egrang: bambu yang tinggi atau batok kelapa yang lincah.';

/** Same note as congklak and gasing (games record nothing, Phase 17). */
export const NO_DATA_NOTE = 'Permainan ini tidak menyimpan data apa pun.';

export const SETTINGS_NOTE = 'Pilihan di atas hanya diingat di perangkat ini.';

export const NAMES: Readonly<Record<Side, string>> = { 0: 'Kamu', 1: 'Komputer' };

export interface VariantText {
  value: Variant;
  /** Full name, as in the archive. */
  name: string;
  /** Start screen button. */
  label: string;
  /** One line under the button. */
  explain: string;
  /** Where the record comes from (start screen). */
  origin: string;
}

export const VARIANT_TEXTS: Readonly<Record<Variant, VariantText>> = {
  bambu: {
    value: 'bambu',
    name: 'Egrang Bambu',
    label: 'Bambu (tinggi)',
    explain: 'Jaga keseimbangan di atas bambu tinggi. Langkah yang salah membuat badan makin miring, lalu jatuh.',
    origin: 'Jawa Tengah',
  },
  batok: {
    value: 'batok',
    name: 'Egrang Batok',
    label: 'Batok (irama)',
    explain: 'Melangkah cepat di atas batok kelapa mengikuti irama kendang. Keluar irama, batok lepas.',
    origin: 'Sulawesi Selatan',
  },
};

export const VARIANTS: readonly Variant[] = ['bambu', 'batok'];

export const LEVEL_TEXTS: readonly { value: AiLevel; label: string }[] = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
];

export const UI = {
  variantLegend: 'Jenis egrang',
  levelLegend: 'Tingkat kesulitan',
  start: 'Mulai main',
  rules: 'Cara bermain',
  about: 'Tentang permainan ini',
  restart: 'Mulai ulang',
  settings: 'Pengaturan',
  settingsAria: 'Pengaturan permainan',
  playAgain: 'Main lagi',
  changeSettings: 'Ubah pengaturan',
  left: 'Kiri',
  right: 'Kanan',
  leftAria: 'Langkah kaki kiri',
  rightAria: 'Langkah kaki kanan',
  ready: 'Siap…',
  go: 'Mulai!',
  perfect: 'Langkah mantap!',
  fall: 'Jatuh! Naik lagi…',
  slip: 'Lepas!',
  wobble: 'Goyah!',
  sameFoot: 'Kaki bergantian!',
  finish: 'Finis!',
  timer: 'Waktu',
  balance: 'Keseimbangan',
  rhythm: 'Irama',
  canvasLabel: 'Lintasan egrang',
  you: 'Kamu',
  computer: 'Komputer',
  seconds: 'dtk',
  metres: 'm',
  tapHint: 'Ketuk sisi kiri dan kanan bergantian.',
  keyboardHint: 'Keyboard: ← dan → (atau A dan L) untuk melangkah bergantian.',
  legendPlayer: 'Kamu (sarung merah bertitik)',
  legendComputer: 'Komputer (sarung biru bergaris)',
  rulesTitle: 'Cara bermain egrang',
  obstacle: { batu: 'Batu', genangan: 'Genangan' },
  debugFps: 'fps',
} as const;

/** Hint line under the track while racing, per variant. */
export const RACE_HINT: Readonly<Record<Variant, string>> = {
  bambu: 'Kaki kiri saat jarum di tanda emas kiri, kaki kanan saat di tanda emas kanan.',
  batok: 'Melangkah saat lingkaran irama menutup, ikuti bunyi kendang.',
};

export interface TutorialStep {
  title: string;
  text: string;
}

export const TUTORIAL_STEPS: Readonly<Record<Variant, readonly TutorialStep[]>> = {
  bambu: [
    {
      title: 'Kiri, kanan',
      text: 'Ketuk sisi kiri dan kanan layar bergantian (keyboard: ← dan →). Setiap ketukan adalah satu langkah.',
    },
    {
      title: 'Ikuti ayunan',
      text: 'Jarum keseimbangan berayun ke kiri dan kanan. Langkahkan kaki kiri saat jarum di tanda emas kiri, kaki kanan saat di tanda emas kanan.',
    },
    {
      title: 'Jangan jatuh',
      text: 'Langkah yang salah membuat ayunan makin besar. Jarum masuk merah berarti jatuh dan naik lagi. Langkah tepat: "Langkah mantap!".',
    },
  ],
  batok: [
    {
      title: 'Kiri, kanan',
      text: 'Ketuk sisi kiri dan kanan layar bergantian (keyboard: ← dan →). Setiap ketukan adalah satu langkah.',
    },
    {
      title: 'Ikuti irama',
      text: 'Kendang berbunyi teratur. Melangkahlah tepat saat lingkaran irama di bawah kaki menutup dan menyala.',
    },
    {
      title: 'Jangan lepas',
      text: 'Di luar irama, atau kaki yang sama dua kali, batok lepas dan kamu tersandung sebentar. Hati-hati di batu dan genangan.',
    },
  ],
};

export const TUTORIAL_UI = { skip: 'Lewati', next: 'Lanjut', done: 'Ayo main', step: (i: number, n: number) => `Langkah ${i} dari ${n}` } as const;

export function formatSeconds(s: number): string {
  return s.toFixed(1).replace('.', ',');
}

/** Race clock in the HUD: "12,3". */
export function formatClock(s: number): string {
  return formatSeconds(Math.max(0, s));
}

export function raceHeading(winner: RaceWinner): string {
  if (winner === 'draw') return 'Seri!';
  return winner === 0 ? 'Kamu menang!' : 'Komputer menang';
}

/** One line under the heading: both times, or how far the other racer still had to go. */
export function raceSummary(result: RaceResult, trackLength: number): string {
  const [a, b] = result.times;
  if (a !== null && b !== null) {
    // Two different times can round to the same tenth: then show hundredths.
    const same = formatSeconds(a) === formatSeconds(b) && a !== b;
    const f = (t: number) => (same ? t.toFixed(2).replace('.', ',') : formatSeconds(t));
    return `Waktumu ${f(a)} dtk · Komputer ${f(b)} dtk`;
  }
  const rest = (d: number) => formatSeconds(Math.max(0, trackLength - d));
  if (a !== null) return `Waktumu ${formatSeconds(a)} dtk · Komputer masih ${rest(result.distances[1])} m lagi`;
  if (b !== null) return `Komputer ${formatSeconds(b)} dtk · Kamu masih ${rest(result.distances[0])} m lagi`;
  return `Waktu habis: kamu ${formatSeconds(result.distances[0])} m, komputer ${formatSeconds(result.distances[1])} m`;
}

/** The player's step counters on the end screen. */
export function statsLine(variant: Variant, stats: { perfect: number; falls: number; slips: number }): string {
  const trouble = variant === 'bambu' ? `Jatuh: ${stats.falls}` : `Lepas: ${stats.slips}`;
  return `Langkah mantap: ${stats.perfect} · ${trouble}`;
}

/** aria-live line when a racer crosses the finish line. */
export function finishText(side: Side, time: number): string {
  return `${side === 0 ? 'Kamu' : 'Komputer'} sampai di garis finis: ${formatSeconds(time)} dtk.`;
}

/** Note under the rules: other versions exist, and the ruleset awaits curator review. */
export const RULES_VARIANT_NOTE =
  'Egrang dimainkan dengan cara berbeda-beda di tiap daerah. Permainan ini memakai satu versi digital yang disederhanakan, "Aturan dasar". Versi lain juga sah dimainkan.';

export const RULES_CURATOR_NOTE = 'Aturan dasar ini masih menunggu tinjauan kurator.';

export interface RulesSection {
  title: string;
  text: string;
}

/** "1,7" style seconds for the rules text. */
function sec(s: number): string {
  return String(Math.round(s * 10) / 10).replace('.', ',');
}

export function rulesSections(rules: EgrangRules, variant: Variant): RulesSection[] {
  const v = rules[variant];
  const sections: RulesSection[] = [
    {
      title: 'Lintasan',
      text: `Kamu dan komputer berlomba di lintasan ${v.trackLength} meter, masing-masing di jalurnya sendiri, setelah hitungan mundur ${rules.countdownSeconds} detik.`,
    },
    {
      title: 'Melangkah',
      text: 'Langkahkan kaki kiri dan kanan bergantian: ketuk sisi kiri atau kanan area permainan, atau tekan ← dan → (A dan L). Tanpa langkah kamu tidak maju.',
    },
  ];
  if (variant === 'bambu') {
    sections.push({
      title: 'Keseimbangan',
      text: `Di atas egrang bambu badanmu berayun ke kiri dan ke kanan. Langkah dengan kaki yang benar pada saat yang tepat memberi langkah panjang dan menenangkan ayunan; langkah yang salah membuat ayunan makin besar. Terlalu miring berarti jatuh, dan naik lagi memakan waktu sekitar ${sec(v.penaltySeconds)} detik.`,
    });
  } else {
    sections.push({
      title: 'Irama',
      text: `Langkah harus jatuh pada irama kendang. Di luar irama, atau dengan kaki yang sama dua kali, batok lepas dari kaki dan kamu tersandung sekitar ${sec(v.penaltySeconds)} detik. Langkah di atas batok pendek tetapi cepat, dan kamu tidak jatuh.`,
    });
  }
  if (v.obstacles > 0 || rules.slope) {
    const parts: string[] = [];
    if (v.obstacles > 0) {
      parts.push(
        variant === 'bambu'
          ? 'Batu kecil dan genangan di lintasan butuh langkah yang tepat waktu; kalau meleset, ayunan bertambah.'
          : 'Batu kecil dan genangan di lintasan butuh langkah yang tepat irama; kalau meleset, batok lepas.',
      );
    }
    if (rules.slope) parts.push('Lintasan sedikit menanjak lalu menurun: langkah menanjak lebih pendek.');
    sections.push({ title: 'Rintangan', text: parts.join(' ') });
  }
  sections.push({
    title: 'Pemenang',
    text: `${rules.races === 1 ? 'Satu kali balapan' : `${rules.races} kali balapan`}: yang lebih dulu melewati garis finis menang. Langkah yang sangat tepat memberi sedikit bonus jarak ("Langkah mantap!").`,
  });
  return sections;
}

/** Differences between this digital version and the archive record, stated openly in the rules sheet. */
export const SIMPLIFICATIONS: Readonly<Record<Variant, string>> = {
  bambu:
    'Penyederhanaan: keseimbangan dan langkah diwakili oleh dua tombol dan satu jarum. Arsip menjelaskan cara berjalan dengan egrang bambu; lomba melawan komputer adalah tambahan versi digital ini.',
  batok:
    'Penyederhanaan: tarikan tali dan langkah kaki diwakili oleh ketukan mengikuti irama. Arsip menyebut lomba ke garis finis tanpa jatuh; di sini batok yang lepas hanya memperlambat.',
};

/**
 * The published archive records the texts are based on. `href` is their public page. Paraphrased; the
 * records' own wording is on that page.
 */
export const ARCHIVE_RECORDS: Readonly<Record<Variant, { id: string; name: string; province: string; place: string; href: string }>> = {
  bambu: {
    id: 'e32ed727-4455-434e-b1b1-b984413e9f24',
    name: 'Egrang Bambu',
    province: 'Jawa Tengah',
    place: 'Kabupaten Magelang',
    href: '/prot/e32ed727-4455-434e-b1b1-b984413e9f24',
  },
  batok: {
    id: 'a6ce0739-bcb5-43ae-9e13-0ea74d7b8f3f',
    name: 'Egrang Batok',
    province: 'Sulawesi Selatan',
    place: 'Kabupaten Soppeng',
    href: '/prot/a6ce0739-bcb5-43ae-9e13-0ea74d7b8f3f',
  },
};

export const ABOUT_TEXT: Readonly<Record<Variant, readonly { title: string; text: string }[]>> = {
  bambu: [
    {
      title: 'Asal-usul',
      text: 'Menurut arsip, egrang bambu diyakini sudah dimainkan sejak zaman kolonial Belanda dan tercatat dalam buku permainan anak berbahasa Belanda, Javanese Kinder Spellen. Nama "egrang" berasal dari bahasa Lampung (artinya terompah pancung atau tinggi), tetapi permainan ini berkembang dan populer di masyarakat Jawa. Banyak sumber menyebutnya mulai dikenal luas di Kabupaten Karawang, Jawa Barat, sekitar tahun 1960-an. Di kampung-kampung Jawa egrang bambu menjadi hiburan anak-anak sekaligus latihan keseimbangan.',
    },
    {
      title: 'Cara bermain',
      text: 'Kedua egrang diletakkan sejajar di tanah. Pemain naik ke pijakan kaki, satu kaki di tiap bambu, dan memegang bagian atas bambu. Sambil menjaga keseimbangan, satu kaki beserta bambunya diangkat dan dimajukan bergantian, seperti berjalan biasa tetapi di ketinggian. Pandangan lurus ke depan, tubuh rileks dan tidak tegang.',
    },
    {
      title: 'Nilai',
      text: 'Egrang bambu melatih keseimbangan, koordinasi tubuh, kekuatan kaki, konsentrasi, dan keberanian, serta mengajarkan kesabaran dan kendali diri. Filosofinya sering dikaitkan dengan menjaga keseimbangan hidup: buana atas, buana tengah, dan buana bawah.',
    },
  ],
  batok: [
    {
      title: 'Asal-usul',
      text: 'Menurut arsip, egrang batok adalah varian egrang yang memakai tempurung (batok) kelapa sebagai pijakan, bukan bambu panjang, dan secara konsisten disebut berasal dari Sulawesi Selatan. Permainan ini lahir dari kreativitas masyarakat pedesaan, terutama suku Bugis, yang mengolah batok kelapa yang melimpah di daerah pesisir dan perkebunan kelapa menjadi mainan yang sederhana, murah, dan mudah dibuat anak-anak.',
    },
    {
      title: 'Bahan',
      text: 'Dua belahan batok kelapa yang sudah diambil isinya dilubangi di bagian atas dan diberi tali. Pemain berdiri di atas batok sambil memegang talinya.',
    },
    {
      title: 'Cara bermain',
      text: 'Kedua batok diletakkan di tanah, bagian tengahnya diinjak, dan tali dijepit di antara jari kaki. Kedua tangan memegang tali dan menariknya ke atas agar batok menempel pada kaki. Pemain berjalan dengan mengangkat kaki bergantian sambil terus menarik tali. Biasanya dimainkan di tanah rata atau rumput pendek, sebagai latihan keseimbangan atau lomba: yang paling cepat sampai di garis finis tanpa jatuh menang.',
    },
    {
      title: 'Nilai',
      text: 'Egrang batok menguatkan otot kaki dan melatih konsentrasi. Arsip juga menyebut kesabaran, kerja sama dan kreativitas (membuat sendiri dari batok kelapa), serta kemampuan beradaptasi dengan memanfaatkan bahan alam.',
    },
  ],
};

export function aboutCredit(variant: Variant): string {
  const r = ARCHIVE_RECORDS[variant];
  return `Sumber: arsip PROT "${r.name}", ${r.place}, ${r.province} (diringkas).`;
}

export const ABOUT_LINK = 'Lihat arsip lengkap';
