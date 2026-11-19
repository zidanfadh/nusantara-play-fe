import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { motionValue } from 'framer-motion';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArsipScene } from '@/components/jelajah/concept/scenes/ArsipScene';
import { BersamaScene } from '@/components/jelajah/concept/scenes/BersamaScene';
import { HalamanScene } from '@/components/jelajah/concept/scenes/HalamanScene';
import { JelajahScene } from '@/components/jelajah/concept/scenes/JelajahScene';
import { MainScene } from '@/components/jelajah/concept/scenes/MainScene';
import { MulaiScene } from '@/components/jelajah/concept/scenes/MulaiScene';
import { NusantaraScene } from '@/components/jelajah/concept/scenes/NusantaraScene';
import { TerlupaScene } from '@/components/jelajah/concept/scenes/TerlupaScene';
import { demoFrameAt, pitPosition } from '@/components/jelajah/concept/art/MiniBoard';
import { SITE_NAME } from '@/lib/brand';
import { buildCongklakDemo } from '@/lib/jelajah/concept/congklak-demo';
import type { ConceptLayout } from '@/lib/jelajah/concept/layout';
import { archiveCards } from '@/lib/jelajah/concept/live';
import { ARCHIVE_CARD_COUNT, CONCEPT_SCENES, CONCEPT_TEXT } from '@/lib/jelajah/concept/script';
import { emptySummaries, type JelajahData } from '@/lib/jelajah/data';
import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';

const LAYOUTS: ConceptLayout[] = ['portrait', 'landscape', 'desktop'];
const root = fileURLToPath(new URL('../../', import.meta.url));

function dataWith(names: string[]): JelajahData {
  const provinces = emptySummaries();
  const sumsel = provinces.find((p) => p.kode === '16')!;
  sumsel.prots = names.map((nama, i) => ({ id: `p${i}`, nama, foto: null }));
  sumsel.protCount = names.length;
  return { provinces, totalProt: names.length, unassignedProt: 0 };
}

function render(id: string, layout: ConceptLayout, t: number, cards = archiveCards(dataWith([]), 'loading', ARCHIVE_CARD_COUNT)) {
  const props = { lt: motionValue(t), layout, still: false, canvas: false };
  switch (id) {
    case 'halaman':
      return renderToStaticMarkup(<HalamanScene {...props} />);
    case 'terlupa':
      return renderToStaticMarkup(<TerlupaScene {...props} />);
    case 'nusantara':
      return renderToStaticMarkup(<NusantaraScene {...props} />);
    case 'arsip':
      return renderToStaticMarkup(<ArsipScene {...props} cards={cards} />);
    case 'jelajah':
      return renderToStaticMarkup(<JelajahScene {...props} />);
    case 'main':
      return renderToStaticMarkup(<MainScene {...props} />);
    case 'bersama':
      return renderToStaticMarkup(<BersamaScene {...props} />);
    default:
      return renderToStaticMarkup(<MulaiScene {...props} onStart={() => {}} />);
  }
}

describe('concept video scenes (Phase 19)', () => {
  it('every scene renders in every layout at its start, middle and end', () => {
    for (const scene of CONCEPT_SCENES) {
      for (const layout of LAYOUTS) {
        for (const t of [-scene.fadeIn / 2, scene.duration / 2, scene.duration]) {
          const html = render(scene.id, layout, t);
          expect(html.length, `${scene.id} ${layout} ${t}`).toBeGreaterThan(200);
        }
      }
    }
  });

  it('scene 3 and 8 show the brand from lib/brand.ts', () => {
    const letters = render('nusantara', 'desktop', 6000).replace(/<[^>]+>/g, '');
    expect(letters).toContain(SITE_NAME);
    expect(render('mulai', 'portrait', 3000)).toContain(SITE_NAME);
  });

  it('scene 4: real published PROT names when available, neutral cards otherwise; the curator stamp', () => {
    const real = archiveCards(dataWith(['Gasing Bambu', 'Congklak Kayu']), 'ready', ARCHIVE_CARD_COUNT);
    const html = render('arsip', 'desktop', 6000, real);
    expect(html).toContain('Gasing Bambu');
    expect(html).toContain('Sumatera Selatan');
    expect(html).toContain(CONCEPT_TEXT.stamp);
    const neutral = render('arsip', 'portrait', 6000);
    expect(neutral).not.toContain('Gasing Bambu');
    expect(neutral).toContain(CONCEPT_TEXT.stamp);
  });

  it('scene 6: XP chips, Paspor Budaya, the pilot province stamp', () => {
    const html = render('main', 'landscape', 6500);
    expect(html).toContain(CONCEPT_TEXT.xpChip);
    expect(html).toContain(CONCEPT_TEXT.passport);
    expect(html).toContain(PILOT_PROVINCE.nama);
  });

  it('scene 7 shows the audiences; scene 8 the start button', () => {
    const html = render('bersama', 'desktop', 4000);
    for (const label of CONCEPT_TEXT.audiences) expect(html).toContain(label);
    const last = render('mulai', 'desktop', 3500);
    expect(last).toContain(CONCEPT_TEXT.start);
    expect(last).toContain('data-concept-start');
  });

  it('the mini board follows the real engine frames in order', () => {
    const demo = buildCongklakDemo();
    expect(demoFrameAt(demo, 0).move).toBe(-1);
    let last = { move: -1, frame: 0 };
    for (let t = 0; t <= 7000; t += 25) {
      const at = demoFrameAt(demo, t);
      expect(at.move * 1000 + at.frame).toBeGreaterThanOrEqual(last.move * 1000 + last.frame);
      last = at;
    }
    expect(last.move).toBe(demo.moves.length - 1);
    expect(last.frame).toBe(demo.moves[demo.moves.length - 1].frames.length - 1);
    // Every pit has its own spot on the board.
    const spots = new Set(Array.from({ length: 16 }, (_, i) => pitPosition(i).join(',')));
    expect(spots.size).toBe(16);
  });
});

function files(dir: string): string[] {
  const abs = join(root, dir);
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name);
    if (statSync(path).isDirectory()) return files(join(dir, name));
    return [relative(root, path).replace(/\\/g, '/')];
  });
}

describe('concept video code rules (Phase 19)', () => {
  const sources = [...files('components/jelajah/concept'), ...files('lib/jelajah/concept')];

  it('never imports three.js, never plays audio, no external URLs', () => {
    for (const f of sources) {
      const src = readFileSync(join(root, f), 'utf8');
      expect(src, f).not.toMatch(/from\s+['"](three|@react-three\/[^'"]+)['"]/);
      expect(src, f).not.toMatch(/new Audio\(|<audio|<video/);
      expect(src, f).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
  });

  it('calls no network API itself (live counts come from the hub data)', () => {
    for (const f of sources) {
      const src = readFileSync(join(root, f), 'utf8');
      expect(src, f).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|@\/lib\/api\//);
    }
  });

  it('writes the site name only through lib/brand.ts', () => {
    for (const f of sources) {
      if (f.endsWith('indonesia-paths.ts')) continue;
      expect(readFileSync(join(root, f), 'utf8'), f).not.toContain(SITE_NAME);
    }
  });
});
