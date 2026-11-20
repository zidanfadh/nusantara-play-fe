/**
 * Phase 25 (Phase 23 review addendum): the egrang pavilions name their variant — Jawa Tengah "Main Egrang Bambu",
 * Sulawesi Selatan "Main Egrang Batok" — in the 3D prompt, the 2d card and the screen-reader list. The intro bumper
 * keeps "Main Egrang".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameCard, GamePrompt, PAVILION_TITLE } from '@/components/jelajah/GamePrompt';
import { GAME_TEXTS, gameHref, gamePlayLabel } from '@/lib/games/links';
import { gamePavilion } from '@/lib/jelajah/engine/pavilion';
import { findScene } from '@/lib/jelajah/scenes';

const CASES = [
  ['jawa-tengah', 'bambu', 'Main Egrang Bambu'],
  ['sulawesi-selatan', 'batok', 'Main Egrang Batok'],
] as const;

describe('egrang pavilion labels (Phase 25)', () => {
  it('gamePlayLabel names the variant for egrang only', () => {
    expect(gamePlayLabel('egrang', 'bambu')).toBe('Main Egrang Bambu');
    expect(gamePlayLabel('egrang', 'batok')).toBe('Main Egrang Batok');
    expect(gamePlayLabel('egrang')).toBe('Main Egrang');
    expect(gamePlayLabel('congklak')).toBe('Main Congklak');
    expect(gamePlayLabel('gasing', 'bambu')).toBe('Main Gasing');
  });

  it.each(CASES)('%s: the scene variant gives %s', (slug, variant, label) => {
    const pav = gamePavilion(findScene(slug)!)!;
    expect(pav.variant).toBe(variant);
    expect(gamePlayLabel(pav.game!, pav.variant)).toBe(label);
  });

  it.each(CASES)('%s: prompt (phone and desktop) and 2d card show %s', (slug, variant, label) => {
    const href = gameHref('egrang', `jelajah-${slug}`, variant);
    for (const compact of [true, false]) {
      const html = renderToStaticMarkup(createElement(GamePrompt, { game: 'egrang', href, compact, variant }));
      expect(html).toContain(label);
      if (compact) expect(html).toContain(`<span class="sr-only">${PAVILION_TITLE}: </span>`);
    }
    const card = renderToStaticMarkup(createElement(GameCard, { game: 'egrang', href, variant }));
    expect(card).toContain(label);
  });

  it('the screen-reader stand list uses the same label', () => {
    const src = readFileSync(join(process.cwd(), 'components/jelajah/ProvinceExperience.tsx'), 'utf8');
    expect(src).toContain('const gameLabel = game ? gamePlayLabel(game, gameVariant) : ');
    expect(src).toContain('{PAVILION_TITLE}: {gameLabel}');
    expect(src.match(/variant=\{gameVariant\}/g)).toHaveLength(2);
  });

  it('the bumper keeps "Main Egrang" (no variant)', () => {
    expect(GAME_TEXTS.egrang.play).toBe('Main Egrang');
    const src = readFileSync(join(process.cwd(), 'components/jelajah/bumper/GameScene.tsx'), 'utf8');
    expect(src).not.toContain('gamePlayLabel');
  });
});
