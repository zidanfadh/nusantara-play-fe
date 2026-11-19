import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATURAN_DASAR, DEFAULT_RULES, bestOf } from '@/lib/games/gasing/rules';
import {
  ABOUT_CREDIT,
  ABOUT_TEXT,
  ARCHIVE_RECORD,
  LEVEL_TEXTS,
  MODE_TEXTS,
  RULES_CURATOR_NOTE,
  RULES_VARIANT_NOTE,
  TUTORIAL_STEPS,
  UI,
  endText,
  formatSeconds,
  matchHeading,
  matchSummary,
  roundResultText,
  rulesSections,
} from '@/lib/games/gasing/texts';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  TUTORIAL_KEY,
  loadSettings,
  markTutorialSeen,
  parseSettings,
  resetTutorialMemoryForTests,
  saveSettings,
  tutorialSeen,
} from '@/lib/games/gasing/settings';

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

describe('gasing rules config (Phase 20)', () => {
  it('is "Aturan dasar", best of 3', () => {
    expect(DEFAULT_RULES).toBe(ATURAN_DASAR);
    expect(ATURAN_DASAR.name).toBe('Aturan dasar');
    expect(ATURAN_DASAR.roundsToWin).toBe(2);
    expect(bestOf(ATURAN_DASAR)).toBe(3);
    expect(ATURAN_DASAR.maxRounds).toBeGreaterThanOrEqual(bestOf(ATURAN_DASAR));
  });

  it('rules.ts has no imports (curator file, read by the engine and the tests)', () => {
    const src = readFileSync(`${root}lib/games/gasing/rules.ts`, 'utf8');
    expect(src).not.toMatch(/^import /m);
  });
});

describe('gasing texts (Phase 20)', () => {
  it('explains both modes in one line each and names the three levels', () => {
    expect(MODE_TEXTS.map((m) => m.value)).toEqual(['uri', 'pangkah']);
    for (const m of MODE_TEXTS) {
      expect(m.explain.length).toBeGreaterThan(20);
      expect(m.explain.length).toBeLessThanOrEqual(120);
      expect(m.explain).not.toMatch(/\n/);
    }
    expect(LEVEL_TEXTS.map((l) => l.label)).toEqual(['Mudah', 'Sedang', 'Sulit']);
  });

  it('has a 3-step tutorial: tarik, arahkan, lepas', () => {
    expect(TUTORIAL_STEPS.map((s) => s.title)).toEqual(['Tarik', 'Arahkan', 'Lepas']);
    for (const s of TUTORIAL_STEPS) expect(s.text.length).toBeLessThanOrEqual(180);
  });

  it('generates the rules from the config', () => {
    const sections = rulesSections(ATURAN_DASAR);
    expect(sections.map((s) => s.title)).toEqual(['Arena', 'Melempar', 'Uri (tahan lama)', 'Pangkah (adu)', 'Pemenang']);
    const winner = sections.find((s) => s.title === 'Pemenang')!.text;
    expect(winner).toContain('3 ronde');
    expect(winner).toContain('memenangkan 2 ronde');
    const changed = rulesSections({ ...ATURAN_DASAR, roundsToWin: 3 }).find((s) => s.title === 'Pemenang')!.text;
    expect(changed).toContain('5 ronde');
    expect(rulesSections({ ...ATURAN_DASAR, outIsLoss: false })[0].text).not.toContain('kalah');
  });

  it('says the ruleset is one simplified version and awaits curator review', () => {
    expect(RULES_VARIANT_NOTE).toContain('Aturan dasar');
    expect(RULES_CURATOR_NOTE).toMatch(/kurator/);
  });

  it('credits the published archive record and links to its public page', () => {
    expect(ARCHIVE_RECORD.href).toBe(`/prot/${ARCHIVE_RECORD.id}`);
    expect(ARCHIVE_RECORD.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ABOUT_CREDIT).toContain('Gasing');
    expect(ABOUT_CREDIT).toContain('Kepulauan Riau');
    expect(ABOUT_TEXT.length).toBeGreaterThanOrEqual(3);
    // Both ways of playing named in the record appear in the panel.
    const all = ABOUT_TEXT.map((a) => a.text).join(' ');
    expect(all).toContain('Gasing Uri');
    expect(all).toContain('Gasing Pangkah');
  });

  it('formats results', () => {
    expect(formatSeconds(6.44)).toBe('6,4');
    expect(roundResultText(1, 0, 'lebih-lama', [6.44, 5.1])).toBe('Kamu menang ronde 1: 6,4 dtk lawan 5,1 dtk.');
    expect(roundResultText(2, 1, 'keluar', [1, 3])).toBe('Komputer menang ronde 2: gasingmu keluar arena.');
    expect(roundResultText(3, 'draw', 'lebih-lama', [4, 4])).toContain('Ronde diulang');
    expect(matchHeading(0)).toBe('Kamu menang!');
    expect(matchHeading(1)).toBe('Komputer menang');
    expect(matchHeading('draw')).toBe('Seri!');
    expect(matchSummary([2, 1])).toBe('Kamu 2 ronde · Komputer 1 ronde');
    expect(endText(1, 'keluar')).toBe('Gasing komputer keluar arena.');
    expect(endText(0, 'jatuh')).toBe('Gasingmu berhenti berputar.');
    expect(UI.roundOf(2)).toBe('Ronde 2');
  });

  it('never promises rewards (games record nothing)', () => {
    const src = readFileSync(`${root}lib/games/gasing/texts.ts`, 'utf8');
    expect(src).not.toMatch(/\b(XP|poin|points|hadiah|uang)\b/i);
  });
});

describe('gasing settings (Phase 20)', () => {
  it('parses safely field by field', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{bad')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"x"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"mode":"pangkah","level":"x"}')).toEqual({ mode: 'pangkah', level: 'sedang' });
    expect(parseSettings('{"mode":"uri","level":"sulit"}')).toEqual({ mode: 'uri', level: 'sulit' });
  });

  it('round-trips through storage and survives a throwing storage', () => {
    const s = memoryStorage();
    saveSettings({ mode: 'pangkah', level: 'mudah' }, s);
    expect(JSON.parse(s.data.get(SETTINGS_KEY)!)).toEqual({ mode: 'pangkah', level: 'mudah' });
    expect(loadSettings(s)).toEqual({ mode: 'pangkah', level: 'mudah' });
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('remembers the tutorial per browser, in memory when storage fails', () => {
    resetTutorialMemoryForTests();
    const s = memoryStorage();
    expect(tutorialSeen(s)).toBe(false);
    markTutorialSeen(s);
    expect(s.data.get(TUTORIAL_KEY)).toBe('1');
    resetTutorialMemoryForTests();
    expect(tutorialSeen(s)).toBe(true);
    resetTutorialMemoryForTests();
    expect(tutorialSeen(throwing)).toBe(false);
    expect(() => markTutorialSeen(throwing)).not.toThrow();
    expect(tutorialSeen(throwing)).toBe(true);
    resetTutorialMemoryForTests();
  });
});
