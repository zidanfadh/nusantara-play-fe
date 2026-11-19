import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATURAN_DASAR, DEFAULT_RULES } from '@/lib/games/egrang/rules';
import {
  ABOUT_TEXT,
  ARCHIVE_RECORDS,
  LEVEL_TEXTS,
  RACE_HINT,
  RULES_CURATOR_NOTE,
  RULES_VARIANT_NOTE,
  SIMPLIFICATIONS,
  TUTORIAL_STEPS,
  VARIANT_TEXTS,
  VARIANTS,
  aboutCredit,
  finishText,
  formatSeconds,
  raceHeading,
  raceSummary,
  rulesSections,
  statsLine,
} from '@/lib/games/egrang/texts';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  TUTORIAL_KEY,
  loadSettings,
  markTutorialSeen,
  parseSettings,
  parseVariantParam,
  resetTutorialMemoryForTests,
  saveSettings,
  tutorialSeen,
} from '@/lib/games/egrang/settings';

const root = fileURLToPath(new URL('../../', import.meta.url));

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('egrang rules config (Phase 23)', () => {
  it('is "Aturan dasar": one race, a countdown, both variants configured', () => {
    expect(DEFAULT_RULES).toBe(ATURAN_DASAR);
    expect(ATURAN_DASAR.name).toBe('Aturan dasar');
    expect(ATURAN_DASAR.races).toBe(1);
    expect(ATURAN_DASAR.countdownSeconds).toBeGreaterThan(0);
    for (const v of VARIANTS) {
      expect(ATURAN_DASAR[v].trackLength).toBeGreaterThan(20);
      expect(ATURAN_DASAR[v].penaltySeconds).toBeGreaterThan(0);
    }
    // The prompt's numbers: a fall costs about 1.5 to 2 s, a slip about 0.8 s.
    expect(ATURAN_DASAR.bambu.penaltySeconds).toBeGreaterThanOrEqual(1.5);
    expect(ATURAN_DASAR.bambu.penaltySeconds).toBeLessThanOrEqual(2);
    expect(ATURAN_DASAR.batok.penaltySeconds).toBeCloseTo(0.8);
  });

  it('rules.ts has no imports (curator file, read by the engine and the tests)', () => {
    const src = readFileSync(`${root}lib/games/egrang/rules.ts`, 'utf8');
    expect(src).not.toMatch(/^import /m);
  });
});

describe('egrang texts (Phase 23)', () => {
  it('explains both variants in one line each and names the three levels', () => {
    expect(VARIANTS).toEqual(['bambu', 'batok']);
    for (const v of VARIANTS) {
      const t = VARIANT_TEXTS[v];
      expect(t.value).toBe(v);
      expect(t.explain.length).toBeGreaterThan(20);
      expect(t.explain.length).toBeLessThanOrEqual(120);
      expect(t.explain).not.toMatch(/\n/);
      expect(RACE_HINT[v].length).toBeLessThanOrEqual(90);
    }
    expect(VARIANT_TEXTS.bambu.origin).toBe('Jawa Tengah');
    expect(VARIANT_TEXTS.batok.origin).toBe('Sulawesi Selatan');
    expect(LEVEL_TEXTS.map((l) => l.label)).toEqual(['Mudah', 'Sedang', 'Sulit']);
  });

  it('has a short 3-step tutorial per variant', () => {
    expect(TUTORIAL_STEPS.bambu.map((s) => s.title)).toEqual(['Kiri, kanan', 'Ikuti ayunan', 'Jangan jatuh']);
    expect(TUTORIAL_STEPS.batok.map((s) => s.title)).toEqual(['Kiri, kanan', 'Ikuti irama', 'Jangan lepas']);
    for (const v of VARIANTS) for (const s of TUTORIAL_STEPS[v]) expect(s.text.length).toBeLessThanOrEqual(180);
  });

  it('generates the rules from the config, per variant', () => {
    const bambu = rulesSections(ATURAN_DASAR, 'bambu');
    expect(bambu.map((s) => s.title)).toEqual(['Lintasan', 'Melangkah', 'Keseimbangan', 'Rintangan', 'Pemenang']);
    expect(bambu[0].text).toContain(`${ATURAN_DASAR.bambu.trackLength} meter`);
    expect(bambu[2].text).toContain('1,7 detik');
    const batok = rulesSections(ATURAN_DASAR, 'batok');
    expect(batok.map((s) => s.title)).toEqual(['Lintasan', 'Melangkah', 'Irama', 'Rintangan', 'Pemenang']);
    expect(batok[0].text).toContain(`${ATURAN_DASAR.batok.trackLength} meter`);
    expect(batok[2].text).toContain('0,8 detik');
    // Changing the config changes the sheet.
    const changed = { ...ATURAN_DASAR, slope: false, bambu: { ...ATURAN_DASAR.bambu, trackLength: 80, obstacles: 0 } };
    const sections = rulesSections(changed, 'bambu');
    expect(sections[0].text).toContain('80 meter');
    expect(sections.map((s) => s.title)).not.toContain('Rintangan');
    expect(rulesSections({ ...ATURAN_DASAR, races: 3 }, 'batok').at(-1)!.text).toContain('3 kali balapan');
  });

  it('says the ruleset is one simplified version and awaits curator review', () => {
    expect(RULES_VARIANT_NOTE).toContain('Aturan dasar');
    expect(RULES_CURATOR_NOTE).toMatch(/kurator/);
    for (const v of VARIANTS) expect(SIMPLIFICATIONS[v]).toMatch(/^Penyederhanaan/);
  });

  it('credits each variant\'s own published archive record and links to its public page', () => {
    expect(ARCHIVE_RECORDS.bambu.id).toBe('e32ed727-4455-434e-b1b1-b984413e9f24');
    expect(ARCHIVE_RECORDS.batok.id).toBe('a6ce0739-bcb5-43ae-9e13-0ea74d7b8f3f');
    for (const v of VARIANTS) {
      const r = ARCHIVE_RECORDS[v];
      expect(r.href).toBe(`/prot/${r.id}`);
      expect(r.name).toBe(VARIANT_TEXTS[v].name);
      expect(r.province).toBe(VARIANT_TEXTS[v].origin);
      expect(aboutCredit(v)).toContain(r.name);
      expect(aboutCredit(v)).toContain(r.province);
      expect(ABOUT_TEXT[v].length).toBeGreaterThanOrEqual(3);
    }
    // Facts only from the respective record.
    const bambu = ABOUT_TEXT.bambu.map((a) => a.text).join(' ');
    expect(bambu).toContain('Javanese Kinder Spellen');
    expect(bambu).toContain('buana');
    const batok = ABOUT_TEXT.batok.map((a) => a.text).join(' ');
    expect(batok).toContain('Bugis');
    expect(batok).toContain('garis finis');
    expect(batok).not.toContain('Javanese');
  });

  it('formats results', () => {
    expect(formatSeconds(42.34)).toBe('42,3');
    expect(raceHeading(0)).toBe('Kamu menang!');
    expect(raceHeading(1)).toBe('Komputer menang');
    expect(raceHeading('draw')).toBe('Seri!');
    expect(raceSummary({ winner: 0, times: [42.34, 45.1], distances: [60, 60], reason: 'finish' }, 60)).toBe('Waktumu 42,3 dtk · Komputer 45,1 dtk');
    expect(raceSummary({ winner: 0, times: [42.34, 42.31], distances: [60, 60], reason: 'finish' }, 60)).toBe('Waktumu 42,34 dtk · Komputer 42,31 dtk');
    expect(raceSummary({ winner: 1, times: [null, 40], distances: [56.8, 60], reason: 'finish' }, 60)).toBe('Komputer 40,0 dtk · Kamu masih 3,2 m lagi');
    expect(raceSummary({ winner: 0, times: [null, null], distances: [30, 20], reason: 'time' }, 60)).toContain('Waktu habis');
    expect(statsLine('bambu', { perfect: 12, falls: 2, slips: 0 })).toBe('Langkah mantap: 12 · Jatuh: 2');
    expect(statsLine('batok', { perfect: 3, falls: 0, slips: 4 })).toBe('Langkah mantap: 3 · Lepas: 4');
    expect(finishText(1, 40)).toBe('Komputer sampai di garis finis: 40,0 dtk.');
  });

  it('never promises rewards (games record nothing)', () => {
    const src = readFileSync(`${root}lib/games/egrang/texts.ts`, 'utf8');
    expect(src).not.toMatch(/\b(XP|poin|points|hadiah|uang)\b/i);
  });
});

describe('egrang settings (Phase 23)', () => {
  it('parses safely field by field', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{bad')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"x"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"variant":"batok","level":"x"}')).toEqual({ variant: 'batok', level: 'sedang' });
    expect(parseSettings('{"variant":"bambu","level":"sulit"}')).toEqual({ variant: 'bambu', level: 'sulit' });
  });

  it('reads ?varian= strictly', () => {
    expect(parseVariantParam('bambu')).toBe('bambu');
    expect(parseVariantParam('batok')).toBe('batok');
    for (const v of ['Bambu', 'x', '', null, undefined]) expect(parseVariantParam(v)).toBeNull();
  });

  it('round-trips through storage and survives a throwing storage', () => {
    const s = memoryStorage();
    saveSettings({ variant: 'batok', level: 'mudah' }, s);
    expect(JSON.parse(s.data.get(SETTINGS_KEY)!)).toEqual({ variant: 'batok', level: 'mudah' });
    expect(loadSettings(s)).toEqual({ variant: 'batok', level: 'mudah' });
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers the tutorial per variant, in memory when storage fails', () => {
    resetTutorialMemoryForTests();
    const s = memoryStorage();
    expect(tutorialSeen('bambu', s)).toBe(false);
    markTutorialSeen('bambu', s);
    expect(s.data.get(TUTORIAL_KEY)).toBe('bambu');
    resetTutorialMemoryForTests();
    expect(tutorialSeen('bambu', s)).toBe(true);
    expect(tutorialSeen('batok', s)).toBe(false);
    markTutorialSeen('batok', s);
    expect(s.data.get(TUTORIAL_KEY)).toBe('bambu,batok');
    resetTutorialMemoryForTests();
    expect(tutorialSeen('batok', throwing)).toBe(false);
    expect(() => markTutorialSeen('batok', throwing)).not.toThrow();
    expect(tutorialSeen('batok', throwing)).toBe(true);
    expect(tutorialSeen('bambu', throwing)).toBe(false);
    resetTutorialMemoryForTests();
  });
});
