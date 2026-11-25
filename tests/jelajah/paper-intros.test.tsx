/**
 * Phase 28: the concept film's map scenes (3 "nusantara", 7 "bersama") and the bumper's map scene use the paper
 * map's look; timings and sound cues are guarded by the existing concept-script / concept-sound-cues tests.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MapScene } from '@/components/jelajah/bumper/MapScene';
import { parseProvinceGeo } from '@/lib/jelajah/geo';
import { PALETTES } from '@/lib/jelajah/palette';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(`${root}${p}`, 'utf8');

describe('concept film map scenes (Phase 28)', () => {
  it('scene 3 lights the provinces up as green islands on an earth edge (amber glow kept, painted once)', () => {
    const src = read('components/jelajah/concept/scenes/NusantaraScene.tsx');
    expect(src).toContain('<PaperIslands fill="url(#cv-island-fill)"');
    expect(src).not.toContain('cv-glow-fill');
    expect(src).toContain('stroke="#F4AE52"'); // the lighting-up glow
    expect(read('components/jelajah/concept/scene-kit.tsx')).toContain('id="cv-island-fill"');
  });

  it('scene 7 shows the same islands, dimmed for its dark background', () => {
    expect(read('components/jelajah/concept/scenes/BersamaScene.tsx')).toContain('<PaperIslands');
  });

  it('PaperIslands draws the earth edge below the tops (the paper-map slab)', () => {
    const src = read('components/jelajah/concept/art/MapArt.tsx');
    expect(src.indexOf('transform={`translate(0 ${depth})`}')).toBeLessThan(src.indexOf('<ProvincePaths fill={fill}'));
  });
});

describe('bumper map scene (Phase 28)', () => {
  const shapes = parseProvinceGeo(JSON.parse(read('public/jelajah/geo/indonesia-provinces.json')), KNOWN_PROVINCES).shapes;
  const html = renderToStaticMarkup(
    createElement(MapScene, {
      scene: { headline: '3 provinsi dengan PROT publik', text: 'Pilih provinsi.', highlighted: ['16', '32'] },
      shapes,
    } as Parameters<typeof MapScene>[0]),
  );

  it('green islands on an earth edge; provinces with PROT deeper green with the amber rim', () => {
    const p = PALETTES.light; // server render = light theme
    expect(html).toContain(`fill="${p.muted}"`);
    expect(html).toContain(`fill="${p.protHigh}"`);
    expect(html).toContain(`stroke="${p.rim}"`);
    expect(html).not.toContain('var(--color-primary)');
    expect((html.match(new RegExp(`fill="${p.protHigh}"`, 'g')) ?? []).length).toBe(2);
  });

  it('never imports three.js', () => {
    expect(read('components/jelajah/bumper/MapScene.tsx')).not.toMatch(/from 'three'|@react-three|jelajah\/three\//);
  });
});
