import { describe, expect, it } from 'vitest';
import {
  backLinkFor,
  GAME_LINK_PROVINCES,
  GAME_PATHS,
  GAME_TEXTS,
  gameHref,
  JELAJAH_GAMES,
} from '@/lib/games/links';

describe('game links (Phase 22, multi-game pavilions)', () => {
  it('every game has a path, a play label and a description', () => {
    for (const g of JELAJAH_GAMES) {
      expect(GAME_PATHS[g]).toMatch(/^\/main\/[a-z]+$/);
      expect(GAME_TEXTS[g].play).toMatch(/^Main /);
      expect(GAME_TEXTS[g].description.length).toBeGreaterThan(10);
    }
    expect(GAME_TEXTS.congklak.play).toBe('Main Congklak'); // unchanged since Phase 17
    expect(GAME_TEXTS.gasing.play).toBe('Main Gasing');
  });

  it('gameHref adds an encoded from parameter', () => {
    expect(gameHref('congklak')).toBe('/main/congklak');
    expect(gameHref('congklak', 'jelajah-sumatera-selatan')).toBe('/main/congklak?from=jelajah-sumatera-selatan');
    expect(gameHref('gasing', 'jelajah-kepulauan-riau')).toBe('/main/gasing?from=jelajah-kepulauan-riau');
    expect(gameHref('gasing', 'a b&c')).toBe('/main/gasing?from=a%20b%26c');
  });

  it('a province is allowlisted only on the page of the game its pavilion opens', () => {
    expect(GAME_LINK_PROVINCES).toEqual({ congklak: ['sumatera-selatan'], gasing: ['kepulauan-riau'] });
    for (const game of JELAJAH_GAMES) {
      for (const slug of GAME_LINK_PROVINCES[game]) {
        expect(backLinkFor(`jelajah-${slug}`, game)).toEqual({ href: `/jelajah/${slug}`, label: 'Kembali ke desa' });
        for (const other of JELAJAH_GAMES.filter((g) => g !== game)) expect(backLinkFor(`jelajah-${slug}`, other)).toBeNull();
      }
    }
  });

  it('provinces without a game and attack strings give no back link', () => {
    for (const game of JELAJAH_GAMES) {
      expect(backLinkFor('jelajah', game)).toEqual({ href: '/jelajah', label: 'Kembali ke peta' });
      for (const v of ['jelajah-aceh', 'jelajah-jawa-tengah', 'jelajah-sulawesi-selatan', 'jelajah-jawa-barat', '//evil.com',
        'https://evil.com', 'jelajah-../x', 'jelajah-KEPULAUAN-RIAU', '', null, undefined]) {
        expect(backLinkFor(v, game)).toBeNull();
      }
    }
  });
});
