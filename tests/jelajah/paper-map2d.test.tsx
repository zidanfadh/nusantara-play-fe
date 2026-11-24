/**
 * Phase 28: the 2d tier map (Map2D) in the paper look: same states and legend semantics as the 3D map, no three.js.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Map2D from '@/components/jelajah/Map2D';
import type { ProvinceSummary } from '@/lib/jelajah/data';
import { parseProvinceGeo } from '@/lib/jelajah/geo';
import { PALETTES } from '@/lib/jelajah/palette';
import { ENTERABLE_PROVINCES, KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shapes = parseProvinceGeo(JSON.parse(readFileSync(`${root}public/jelajah/geo/indonesia-provinces.json`, 'utf8')), KNOWN_PROVINCES).shapes;
const summaryByKode = new Map<string, ProvinceSummary>(
  KNOWN_PROVINCES.map((p) => [p.kode, { kode: p.kode, nama: p.nama, slug: p.kode, protCount: p.kode === '32' ? 2 : 0, prots: [] }]),
);

function render(hoveredKode: string | null, selectedKode: string | null, mode: 'light' | 'dark' = 'light') {
  return renderToStaticMarkup(
    createElement(Map2D, {
      shapes,
      summaryByKode,
      hoveredKode,
      selectedKode,
      palette: PALETTES[mode],
      onHover: () => {},
      onSelect: () => {},
    }),
  );
}

const buttons = (html: string) => [...html.matchAll(/role="button"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);

describe('Map2D paper look (Phase 28)', () => {
  it('never imports three.js (directly or through its imports)', () => {
    const src = readFileSync(`${root}components/jelajah/Map2D.tsx`, 'utf8');
    expect(src).not.toMatch(/from 'three'|@react-three|lib\/jelajah\/three\//);
    for (const lib of ['map-nature', 'paper-map', 'palette', 'map-model', 'geo'])
      expect(readFileSync(`${root}lib/jelajah/${lib}.ts`, 'utf8')).not.toMatch(/from 'three'|@react-three/);
  });

  it('every clickable province is a keyboard button (PROT or enterable), the others are hidden decoration', () => {
    const labels = buttons(render(null, null));
    expect(labels).toContain('Jawa Barat: 2 PROT');
    for (const p of ENTERABLE_PROVINCES) expect(labels.some((l) => l.startsWith(`${p.nama}:`))).toBe(true);
    expect(labels).toHaveLength(ENTERABLE_PROVINCES.length + 1);
  });

  it('the buttons keep their order whatever is hovered or selected (a reorder would break clicks)', () => {
    expect(buttons(render('32', '16'))).toEqual(buttons(render(null, null)));
  });

  it('hover and selection show the rim and lift; the lifted copy on top is aria-hidden', () => {
    const idle = render(null, null);
    const html = render('32', '16');
    expect(idle).not.toContain(`stroke="${PALETTES.light.rim}"`);
    expect(html.match(new RegExp(`stroke="${PALETTES.light.rim}"`, 'g'))!.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('translate(0 -0.216)'); // selected lift 0.18 × 1.2
    expect(html).toContain('translate(0 -0.12)'); // hover lift 0.1 × 1.2
    expect((html.match(/aria-hidden="true" class="pointer-events-none"/g) ?? []).length).toBeGreaterThan(
      (idle.match(/aria-hidden="true" class="pointer-events-none"/g) ?? []).length,
    );
  });

  it('enterable provinces carry the terracotta ★ flag with cream text', () => {
    const html = render(null, null);
    for (const p of ENTERABLE_PROVINCES) expect(html).toContain(`data-marker2d="${p.kode}"`);
    expect(html).toContain('fill="#B4500F"');
    expect(html).toContain('★ Pilot');
    expect(html).toContain('★ Desa');
  });

  it.each(['light', 'dark'] as const)('%s: paper background, earth edges and mountains', (mode) => {
    const p = PALETTES[mode];
    const html = render(null, null, mode);
    expect(html).toContain(p.paper);
    expect(html).toContain(p.rockLight);
    expect(html).toContain(p.rockDark);
  });
});
