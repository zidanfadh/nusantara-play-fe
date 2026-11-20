import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutSheet, RulesSheet } from '@/components/games/egrang/InfoSheets';
import { RACER_STYLES, ROW, SWATCH_CSS, computeView, figureHeight, toScreen } from '@/components/games/egrang/render';
import { StartScreen } from '@/components/games/egrang/StartScreen';
import { Tutorial } from '@/components/games/egrang/Tutorial';
import { createAi } from '@/lib/games/egrang/ai';
import { playRace } from '@/lib/games/egrang/engine';
import { backLinkFor } from '@/lib/games/egrang/from-link';
import { BAMBU_PULSE, batokPulse, egrangSoundList, endPhrase, eventSounds, raceCueSheet, stepRef } from '@/lib/games/egrang/sound';
import { ARCHIVE_RECORDS, RULES_CURATOR_NOTE, TUTORIAL_STEPS, VARIANT_TEXTS } from '@/lib/games/egrang/texts';
import type { Variant } from '@/lib/games/egrang/types';

const root = fileURLToPath(new URL('../../', import.meta.url));
const noop = () => {};
const VARIANTS: Variant[] = ['bambu', 'batok'];

describe('egrang start screen (Phase 23)', () => {
  it('offers both variants with origin and explanation, three levels, start, rules and about', () => {
    const html = renderToStaticMarkup(<StartScreen settings={{ variant: 'batok', level: 'sulit' }} onSettings={noop} onStart={noop} onRules={noop} onAbout={noop} />);
    for (const v of VARIANTS) {
      expect(html).toContain(VARIANT_TEXTS[v].label);
      expect(html).toContain(VARIANT_TEXTS[v].explain);
      expect(html).toContain(VARIANT_TEXTS[v].origin);
    }
    for (const l of ['Mudah', 'Sedang', 'Sulit', 'Mulai main', 'Cara bermain', 'Tentang permainan ini']) expect(html).toContain(l);
    expect(html).toContain('Permainan ini tidak menyimpan data apa pun.');
    const checked = [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0]).filter((i) => / checked=""/.test(i));
    expect(checked.map((i) => /value="([a-z]+)"/.exec(i)?.[1]).sort()).toEqual(['batok', 'sulit']);
  });
});

describe('egrang info sheets and tutorial (Phase 23)', () => {
  it.each(VARIANTS)('%s: rules name the ruleset, the variant sections and the curator note', (v) => {
    const html = renderToStaticMarkup(<RulesSheet open onClose={noop} variant={v} />);
    expect(html).toContain('Aturan dasar');
    expect(html).toContain(VARIANT_TEXTS[v].name);
    expect(html).toContain(v === 'bambu' ? 'Keseimbangan' : 'Irama');
    expect(html).toContain(RULES_CURATOR_NOTE);
    expect(html).toContain('bertitik');
    expect(html).toContain('bergaris');
  });

  it.each(VARIANTS)('%s: about panel credits its own record and links to /prot/<id>', (v) => {
    const html = renderToStaticMarkup(<AboutSheet open onClose={noop} variant={v} />);
    expect(html).toContain(`href="/prot/${ARCHIVE_RECORDS[v].id}"`);
    expect(html).toContain(ARCHIVE_RECORDS[v].province);
  });

  it.each(VARIANTS)('%s: tutorial shows step 1 of 3 and can be skipped', (v) => {
    const html = renderToStaticMarkup(<Tutorial variant={v} onClose={noop} />);
    expect(html).toContain(TUTORIAL_STEPS[v][0].title);
    expect(html).toContain('Langkah 1 dari 3');
    expect(html).toContain('Lewati');
  });
});

describe('egrang look (Phase 23)', () => {
  it('player and computer differ in colour AND pattern', () => {
    expect(RACER_STYLES[0].sarong).not.toBe(RACER_STYLES[1].sarong);
    expect(RACER_STYLES[0].pattern).not.toBe(RACER_STYLES[1].pattern);
    expect(RACER_STYLES[0].head).not.toBe(RACER_STYLES[1].head);
    expect(SWATCH_CSS[0]).toBe(RACER_STYLES[0].sarong);
  });

  it.each([[390, 640], [844, 260], [1120, 720]])('the racers never overlap: the computer stands above the player (%i x %i)', (w, h) => {
    for (const v of VARIANTS) {
      const view = computeView(w, h, v);
      const playerHead = view.rows[ROW.player].y - figureHeight(v) * view.ppm;
      expect(view.rows[ROW.computer].y).toBeLessThan(playerHead);
      // The computer's head stays below the HUD.
      expect(view.rows[ROW.computer].y - figureHeight(v) * view.ppm * view.rows[ROW.computer].s).toBeGreaterThan(30);
      // World x maps to the same anchor on both lanes at the camera's position.
      expect(toScreen(view, 10, 10, ROW.player)[0]).toBeCloseTo(toScreen(view, 10, 10, ROW.computer)[0]);
    }
  });

  it('the race view caps dpr at 2 and pauses when the tab is hidden', () => {
    const src = readFileSync(`${root}components/games/egrang/EgrangRace.tsx`, 'utf8');
    expect(src).toContain('const DPR_CAP = 2;');
    expect(src).toMatch(/visibilitychange/);
    expect(src).not.toMatch(/desynchronized:/);
  });
});

describe('egrang links (Phase 23)', () => {
  it('allowlists the back link', () => {
    expect(backLinkFor('jelajah')).toEqual({ href: '/jelajah', label: 'Kembali ke peta' });
    for (const bad of ['//evil.com', 'jelajah-aceh', null]) expect(backLinkFor(bad)).toBeNull();
  });
});

describe('egrang sound cues (Phase 23)', () => {
  it('steps sound like the variant: bamboo knock vs coconut tok; the computer is quieter and panned', () => {
    expect(stepRef('bambu', 'L')).toEqual({ id: 'bamboo', v: 0 });
    expect(stepRef('batok', 'R')).toEqual({ id: 'batok', v: 1 });
    const mine = eventSounds('bambu', { type: 'step', side: 0, foot: 'L', quality: 1, perfect: true, x: 1, obstacle: null });
    const theirs = eventSounds('bambu', { type: 'step', side: 1, foot: 'L', quality: 1, perfect: true, x: 1, obstacle: null });
    expect(mine).toHaveLength(2); // knock + sparkle
    expect(theirs).toHaveLength(1);
    expect(theirs[0].gain).toBeLessThan(mine[0].gain);
    expect(eventSounds('bambu', { type: 'fall', side: 0, x: 3 })[0].ref).toEqual({ id: 'thud', v: 0 });
    expect(eventSounds('batok', { type: 'slip', side: 0, x: 3, obstacle: null })[0].ref).toEqual({ id: 'thud', v: 1 });
    expect(eventSounds('batok', { type: 'finish', side: 0, time: 40 })[0].ref.id).toBe('gong');
    expect(endPhrase(0).map((s) => s.ref.id)).toEqual(['saron', 'saron', 'saron']);
    expect(endPhrase(1).map((s) => s.ref.id)).toEqual(['bonang', 'bonang']);
    expect(batokPulse(1).ref.id).toBe('dang');
    expect(batokPulse(2).ref.id).toBe('tak');
    expect(BAMBU_PULSE.gain).toBeLessThan(batokPulse(1).gain);
  });

  it('every cue of a recorded race uses a sound from the list the page renders', () => {
    for (const v of VARIANTS) {
      const run = playRace(v, 4, [createAi(v, 'sedang', 1), createAi(v, 'sedang', 2)], undefined, true);
      // Recorded times: playRace keeps events in order; approximate times by index are not needed here, use world end.
      const events = run.events.map((event, i) => ({ t: 3 + i * 0.01, event }));
      const cues = raceCueSheet(v, 3, events, v === 'bambu' ? [3.5, 4, 4.5] : []);
      const keys = new Set(egrangSoundList(v).map((r) => JSON.stringify(r)));
      for (const c of cues) expect(keys.has(JSON.stringify(c.ref)), JSON.stringify(c.ref)).toBe(true);
      expect(cues.filter((c) => c.beat === 'countdown')).toHaveLength(3);
      if (v === 'batok') expect(cues.some((c) => c.beat.startsWith('beat'))).toBe(true);
      else expect(cues.filter((c) => c.beat === 'sway')).toHaveLength(3);
      for (let i = 1; i < cues.length; i += 1) expect(cues[i].at).toBeGreaterThanOrEqual(cues[i - 1].at);
    }
  });

  it('the audio engine loads only through a dynamic import on the egrang page', () => {
    const src = readFileSync(`${root}components/games/egrang/use-egrang-sound.ts`, 'utf8');
    expect(src).toContain("import('@/lib/audio/runtime')");
    expect(src).not.toMatch(/^import [^t].*from '@\/lib\/audio\/(runtime|session|context|engine)'/m);
  });
});
