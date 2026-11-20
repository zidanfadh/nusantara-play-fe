/**
 * Phase 22: five enterable provinces. The registry, the scenes, the routes, the login gate, the map (clickable,
 * markers, card), the Paspor stamps and the 2d game cards agree.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameCard, GameSoonCard } from '@/components/jelajah/GamePrompt';
import { PasporModal } from '@/components/jelajah/PasporModal';
import { ProvinceCard } from '@/components/jelajah/ProvinceCard';
import { ProvinceStamp } from '@/components/jelajah/ProvinceStamp';
import { gameHref } from '@/lib/games/links';
import type { ProvinceSummary } from '@/lib/jelajah/data';
import { gamePavilion } from '@/lib/jelajah/engine/pavilion';
import { isClickable } from '@/lib/jelajah/map-model';
import { PALETTES, provinceFill } from '@/lib/jelajah/palette';
import {
  ENTERABLE_PROVINCES,
  enterableByKode,
  findEnterableProvince,
  KNOWN_PROVINCES,
  markerLabel,
  PILOT_PROVINCE,
  provinceSlug,
} from '@/lib/jelajah/provinces';
import { findScene, SCENES } from '@/lib/jelajah/scenes';
import { STAMP_DESIGNS, stampDesign } from '@/lib/jelajah/stamps';
import { routeDecision } from '@/middleware';

const NEW = ['aceh', 'kepulauan-riau', 'jawa-tengah', 'sulawesi-selatan'];

describe('enterable provinces (Phase 22)', () => {
  it('are the pilot plus Aceh, Kepulauan Riau, Jawa Tengah and Sulawesi Selatan; never Jawa Barat', () => {
    expect(ENTERABLE_PROVINCES.map((p) => p.slug).sort()).toEqual([...NEW, PILOT_PROVINCE.slug].sort());
    expect(enterableByKode('32')).toBeNull();
    expect(findEnterableProvince('jawa-barat')).toBeNull();
  });

  it('equal the scene registry: same slug, code and name; known province codes; slug from the name', () => {
    expect(ENTERABLE_PROVINCES.map((p) => p.slug).sort()).toEqual(SCENES.map((s) => s.slug).sort());
    for (const p of ENTERABLE_PROVINCES) {
      const scene = findScene(p.slug)!;
      expect(scene.provinsiKode).toBe(p.kode);
      expect(scene.nama).toBe(p.nama);
      expect(KNOWN_PROVINCES).toContainEqual({ kode: p.kode, nama: p.nama });
      expect(provinceSlug(p.nama)).toBe(p.slug);
    }
  });

  it('every province page is behind the Jelajah login gate', () => {
    for (const p of ENTERABLE_PROVINCES) {
      expect(routeDecision(false, `/jelajah/${p.slug}`, '')?.location).toBe(
        `/login?redirectTo=${encodeURIComponent(`/jelajah/${p.slug}`)}&reason=jelajah`,
      );
      expect(routeDecision(true, `/jelajah/${p.slug}`, '')).toBeNull();
    }
  });

  it('every enterable province is clickable on the map, even without PROT, and keeps the soft colour then', () => {
    const empty = new Map<string, ProvinceSummary>();
    for (const p of ENTERABLE_PROVINCES) expect(isClickable(p.kode, empty)).toBe(true);
    expect(isClickable('32', empty)).toBe(false);
    const palette = PALETTES.light;
    expect(provinceFill(palette, 0, 5, true)).toBe(palette.pilot);
    expect(provinceFill(palette, 0, 5, false)).toBe(palette.muted);
  });

  it('marker labels: "Pilot" for the pilot, "Desa" for the others', () => {
    expect(markerLabel(PILOT_PROVINCE.kode)).toBe('★ Pilot');
    for (const slug of NEW) expect(markerLabel(findEnterableProvince(slug)!.kode)).toBe('★ Desa');
  });

  it('the province card offers "Masuk" to the village of every enterable province', () => {
    for (const p of ENTERABLE_PROVINCES) {
      const summary: ProvinceSummary = { kode: p.kode, nama: p.nama, slug: p.slug, protCount: 1, prots: [] };
      const html = renderToStaticMarkup(createElement(ProvinceCard, { summary, status: 'ready', onClose: () => {} }));
      expect(html).toContain(`href="/jelajah/${p.slug}"`);
      expect(html).toContain('Masuk');
      expect(html).toContain(p.kode === PILOT_PROVINCE.kode ? 'Provinsi pilot' : 'Desa virtual');
    }
    const other: ProvinceSummary = { kode: '32', nama: 'Jawa Barat', slug: 'jawa-barat', protCount: 1, prots: [] };
    const html = renderToStaticMarkup(createElement(ProvinceCard, { summary: other, status: 'ready', onClose: () => {} }));
    expect(html).not.toContain('Masuk');
  });
});

describe('Paspor stamps (Phase 22)', () => {
  it('every enterable province has its own stamp: distinct colour and motif', () => {
    for (const p of ENTERABLE_PROVINCES) expect(stampDesign(p.kode)).not.toBeNull();
    const designs = Object.values(STAMP_DESIGNS);
    expect(new Set(designs.map((d) => d.color)).size).toBe(designs.length);
    expect(new Set(designs.map((d) => d.motif)).size).toBe(designs.length);
    expect(Object.keys(STAMP_DESIGNS).sort()).toEqual(ENTERABLE_PROVINCES.map((p) => p.kode).sort());
  });

  it('the stamp is a decorative SVG in the province colour; none for other provinces', () => {
    const html = renderToStaticMarkup(createElement(ProvinceStamp, { kode: '21' }));
    expect(html).toContain('data-stamp="21"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(STAMP_DESIGNS['21'].color);
    expect(renderToStaticMarkup(createElement(ProvinceStamp, { kode: '32' }))).toBe('');
  });

  it('the Paspor shows the own stamp of a stamped province, the generic icon otherwise', () => {
    const html = renderToStaticMarkup(
      createElement(PasporModal, { open: true, onClose: () => {}, stamps: ['21', '32'], onReset: () => {} }),
    );
    expect(html).toContain('data-stamp="21"');
    expect(html).not.toContain('data-stamp="32"');
    expect(html).not.toContain('data-stamp="11"'); // not stamped yet
  });
});

describe('2d tier game cards (Phase 22)', () => {
  it('Kepulauan Riau: "Main Gasing" with the allowlisted from; Aceh: "Game segera hadir"', () => {
    const kepri = findScene('kepulauan-riau')!;
    const game = gamePavilion(kepri)!.game!;
    const card = renderToStaticMarkup(createElement(GameCard, { game, href: gameHref(game, 'jelajah-kepulauan-riau') }));
    expect(card).toContain('Main Gasing');
    expect(card).toContain('href="/main/gasing?from=jelajah-kepulauan-riau"');
    expect(gamePavilion(findScene('aceh')!)).toBeNull();
    expect(findScene('aceh')!.gameSoon).toBeDefined();
    const soon = renderToStaticMarkup(createElement(GameSoonCard));
    expect(soon).toContain('Game segera hadir');
    expect(soon).not.toMatch(/<a |<button/);
  });

  it('Jawa Tengah and Sulawesi Selatan (Phase 23): "Main Egrang" with their variant and the allowlisted from', () => {
    for (const [slug, variant] of [['jawa-tengah', 'bambu'], ['sulawesi-selatan', 'batok']] as const) {
      const pav = gamePavilion(findScene(slug)!)!;
      expect(pav).toMatchObject({ game: 'egrang', variant, style: 'egrang' });
      expect(findScene(slug)!.gameSoon).toBeUndefined();
      const card = renderToStaticMarkup(createElement(GameCard, { game: 'egrang', href: gameHref('egrang', `jelajah-${slug}`, variant) }));
      expect(card).toContain('Main Egrang');
      expect(card).toContain(`href="/main/egrang?varian=${variant}&amp;from=jelajah-${slug}"`);
    }
  });

  it('Sumatera Selatan keeps "Main Congklak"', () => {
    const game = gamePavilion(findScene('sumatera-selatan')!)!.game!;
    expect(game).toBe('congklak');
    expect(renderToStaticMarkup(createElement(GameCard, { game, href: gameHref(game) }))).toContain('Main Congklak');
  });
});
