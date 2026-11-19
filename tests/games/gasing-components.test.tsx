import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutSheet, RulesSheet } from '@/components/games/gasing/InfoSheets';
import { SQUASH, SWATCH_CSS, TOP_STYLES, computeView, toScreen, toWorld } from '@/components/games/gasing/render';
import { StartScreen } from '@/components/games/gasing/StartScreen';
import { Tutorial } from '@/components/games/gasing/Tutorial';
import { gasingHref, backLinkFor } from '@/lib/games/gasing/from-link';
import { ARCHIVE_RECORD, MODE_TEXTS, RULES_CURATOR_NOTE, TUTORIAL_STEPS } from '@/lib/games/gasing/texts';

const noop = () => {};

describe('gasing start screen (Phase 20)', () => {
  it('offers both modes with their one-line explanation, three levels, start, rules and about', () => {
    const html = renderToStaticMarkup(
      <StartScreen settings={{ mode: 'pangkah', level: 'sulit' }} onSettings={noop} onStart={noop} onRules={noop} onAbout={noop} />,
    );
    for (const m of MODE_TEXTS) {
      expect(html).toContain(m.label);
      expect(html).toContain(m.explain);
    }
    for (const l of ['Mudah', 'Sedang', 'Sulit']) expect(html).toContain(l);
    expect(html).toContain('Mulai main');
    expect(html).toContain('Cara bermain');
    expect(html).toContain('Tentang permainan ini');
    expect(html).toContain('Permainan ini tidak menyimpan data apa pun.');
    const checked = [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0]).filter((i) => / checked=""/.test(i));
    expect(checked.map((i) => /value="([a-z]+)"/.exec(i)?.[1]).sort()).toEqual(['pangkah', 'sulit']);
  });
});

describe('gasing info sheets (Phase 20)', () => {
  it('the rules sheet names the ruleset, every section and the curator note', () => {
    const html = renderToStaticMarkup(<RulesSheet open onClose={noop} />);
    expect(html).toContain('Aturan dasar');
    for (const t of ['Arena', 'Melempar', 'Uri (tahan lama)', 'Pangkah (adu)', 'Pemenang']) expect(html).toContain(t);
    expect(html).toContain(RULES_CURATOR_NOTE);
    expect(html).toContain('bertitik');
    expect(html).toContain('bergaris');
  });

  it('the about sheet credits the archive record and links to its page', () => {
    const html = renderToStaticMarkup(<AboutSheet open onClose={noop} />);
    expect(html).toContain('Kepulauan Riau');
    expect(html).toContain(`href="${ARCHIVE_RECORD.href}"`);
    expect(html).toContain('Lihat arsip lengkap');
  });
});

describe('gasing tutorial (Phase 20)', () => {
  it('starts at step 1 of 3 with a skip button', () => {
    const html = renderToStaticMarkup(<Tutorial onClose={noop} />);
    expect(html).toContain('Langkah 1 dari 3');
    expect(html).toContain(TUTORIAL_STEPS[0].title);
    expect(html).toContain('Lewati');
    expect(html).toContain('role="dialog"');
  });
});

describe('gasing renderer helpers (Phase 20)', () => {
  it('keeps the arena, the tops in hand and their height inside the canvas', () => {
    for (const [w, h] of [
      [390, 560],
      [844, 250],
      [1400, 620],
      [360, 480],
    ]) {
      const v = computeView(w, h);
      expect(v.R * 2).toBeLessThanOrEqual(w);
      // The tops in hand sit 1.14 R from the centre (screen y × squash), plus about 0.25 R of top height.
      expect(v.cy + 1.14 * v.R * SQUASH + 0.1 * v.R).toBeLessThanOrEqual(h);
      expect(v.cy - 1.14 * v.R * SQUASH - 0.25 * v.R).toBeGreaterThanOrEqual(0);
    }
  });

  it('converts between world and screen', () => {
    const v = computeView(400, 600);
    const [sx, sy] = toScreen(v, 0.3, -0.4);
    const [x, y] = toWorld(v, sx, sy);
    expect(x).toBeCloseTo(0.3, 10);
    expect(y).toBeCloseTo(-0.4, 10);
  });

  it('the two sides differ in pattern as well as colour', () => {
    expect(TOP_STYLES[0].pattern).not.toBe(TOP_STYLES[1].pattern);
    expect(TOP_STYLES[0].band1).not.toBe(TOP_STYLES[1].band1);
    expect(SWATCH_CSS[0]).toContain('radial-gradient');
    expect(SWATCH_CSS[1]).toContain('repeating-linear-gradient');
  });
});

describe('gasing links (Phase 20)', () => {
  it('builds the game link and the back link allowlisted for gasing (Phase 22: per game)', () => {
    expect(gasingHref()).toBe('/main/gasing');
    expect(gasingHref('jelajah')).toBe('/main/gasing?from=jelajah');
    expect(backLinkFor('jelajah')).toEqual({ href: '/jelajah', label: 'Kembali ke peta' });
    expect(backLinkFor('jelajah-kepulauan-riau')).toBeNull(); // no Kepulauan Riau scene yet (Phase 22 step 2)
    // Sumatera Selatan's pavilion opens congklak, not gasing.
    expect(backLinkFor('jelajah-sumatera-selatan')).toBeNull();
    expect(backLinkFor('https://evil.example')).toBeNull();
  });
});
