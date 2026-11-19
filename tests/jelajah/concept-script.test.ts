import { describe, expect, it } from 'vitest';
import { SITE_NAME } from '@/lib/brand';
import {
  ARCHIVE_CARD_COUNT,
  BEATS,
  CONCEPT_VOICEOVER,
  CONCEPT_SCENES,
  CONCEPT_TEXT,
  CONCEPT_TOTAL_MS,
  FINAL_HOLD_MS,
  REDUCED_STEP_MS,
  archiveSubcaption,
} from '@/lib/jelajah/concept/script';

/** Two lines at 360 px with the caption size (18 px bold Plus Jakarta Sans ≈ 33 characters per line; checked in a browser in the phase report). */
const MAX_CAPTION_CHARS = 70;
/** Honest copy (Phase 19): no Points, prizes, cash or multiplayer. Word starts only ("ruang" is fine). */
const FORBIDDEN = /\b(poin|points?|hadiah|uang|multiplayer)/i;

const allTexts = (): string[] => {
  const texts: string[] = [];
  for (const s of CONCEPT_SCENES) {
    texts.push(s.caption);
    if (s.subcaption) texts.push(s.subcaption);
  }
  for (const value of Object.values(CONCEPT_TEXT)) {
    if (typeof value === 'string') texts.push(value);
    else if (Array.isArray(value)) texts.push(...value);
    else if (typeof value === 'function') texts.push(value(3, 8));
  }
  texts.push(archiveSubcaption(12345, 38) ?? '');
  return texts;
};

describe('concept video script (Phase 19)', () => {
  it('has the eight scenes in the storyboard order', () => {
    expect(CONCEPT_SCENES.map((s) => s.id)).toEqual([
      'halaman',
      'terlupa',
      'nusantara',
      'arsip',
      'jelajah',
      'main',
      'bersama',
      'mulai',
    ]);
  });

  it('timings are contiguous, start at 0 and last about 48 s', () => {
    expect(CONCEPT_SCENES[0].start).toBe(0);
    for (let i = 1; i < CONCEPT_SCENES.length; i += 1) {
      const prev = CONCEPT_SCENES[i - 1];
      expect(CONCEPT_SCENES[i].start, CONCEPT_SCENES[i].id).toBe(prev.start + prev.duration);
    }
    for (const s of CONCEPT_SCENES) expect(s.duration, s.id).toBeGreaterThanOrEqual(3000);
    expect(CONCEPT_TOTAL_MS).toBeGreaterThanOrEqual(45000);
    expect(CONCEPT_TOTAL_MS).toBeLessThanOrEqual(52000);
    expect(CONCEPT_TOTAL_MS).toBe(48000);
  });

  it('cross-fades fit inside both neighbouring scenes; stills are inside the scene', () => {
    for (let i = 1; i < CONCEPT_SCENES.length; i += 1) {
      const s = CONCEPT_SCENES[i];
      expect(s.fadeIn / 2, s.id).toBeLessThan(Math.min(s.duration, CONCEPT_SCENES[i - 1].duration) / 2);
    }
    for (const s of CONCEPT_SCENES) {
      expect(s.still).toBeGreaterThan(0);
      expect(s.still).toBeLessThanOrEqual(1);
    }
  });

  it('beats happen inside their scene', () => {
    const dur = Object.fromEntries(CONCEPT_SCENES.map((s) => [s.id, s.duration]));
    for (const [id, beats] of Object.entries(BEATS)) {
      for (const [name, value] of Object.entries(beats)) {
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          expect(v, `${id}.${name}`).toBeGreaterThanOrEqual(0);
          expect(v, `${id}.${name}`).toBeLessThan(dur[id]);
        }
      }
    }
    const { moveStarts, moveDuration, stampAt } = BEATS.main;
    for (let i = 1; i < moveStarts.length; i += 1) expect(moveStarts[i]).toBeGreaterThanOrEqual(moveStarts[i - 1] + moveDuration);
    expect(stampAt).toBeGreaterThanOrEqual(moveStarts[moveStarts.length - 1] + moveDuration);
    expect(moveStarts).toHaveLength(3);
  });

  it('every caption fits two lines at 360 px (≤ 70 characters)', () => {
    for (const s of CONCEPT_SCENES) {
      expect(s.caption.length, s.caption).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
      if (s.subcaption) expect(s.subcaption.length, s.subcaption).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
    }
    // Large live numbers still fit.
    expect((archiveSubcaption(123456, 38) ?? '').length).toBeLessThanOrEqual(MAX_CAPTION_CHARS);
  });

  it('uses no forbidden words (Points, prizes, cash, multiplayer)', () => {
    for (const text of allTexts()) expect(text, text).not.toMatch(FORBIDDEN);
    // The check itself works and spares words like "ruang".
    expect('Kumpulkan Poin').toMatch(FORBIDDEN);
    expect('HADIAH menarik').toMatch(FORBIDDEN);
    expect('main Multiplayer').toMatch(FORBIDDEN);
    expect('ruang kelas').not.toMatch(FORBIDDEN);
  });

  it('takes the brand from lib/brand.ts', () => {
    expect(CONCEPT_TEXT.dialogLabel).toBe(`Pengenalan ${SITE_NAME}`);
    expect(CONCEPT_TEXT.wordmark).toBe(SITE_NAME);
    expect(CONCEPT_SCENES[2].caption).toContain(SITE_NAME);
  });

  it('live archive subcaption: real numbers only, never 0 or unknown', () => {
    expect(archiveSubcaption(5, 5)).toBe('5 permainan dari 5 provinsi sudah terbit di arsip.');
    expect(archiveSubcaption(1200, 12)).toBe('1.200 permainan dari 12 provinsi sudah terbit di arsip.');
    expect(archiveSubcaption(0, 0)).toBeNull();
    expect(archiveSubcaption(4, 0)).toBeNull();
    expect(archiveSubcaption(null, 3)).toBeNull();
    expect(archiveSubcaption(Number.NaN, 3)).toBeNull();
  });

  it('final hold, reduced-motion step, cards and the voice-over hook', () => {
    expect(FINAL_HOLD_MS).toBe(3000);
    expect(REDUCED_STEP_MS).toBe(5000);
    expect(ARCHIVE_CARD_COUNT).toBeGreaterThanOrEqual(4);
    // Phase 21: no voice-over files exist yet; listed files must live under /jelajah/concept/vo/.
    expect(CONCEPT_VOICEOVER).toEqual([]);
    for (const vo of CONCEPT_VOICEOVER) expect(vo.src).toMatch(/^\/jelajah\/concept\/vo\/[a-z]+\.(m4a|mp3|ogg)$/);
  });
});
