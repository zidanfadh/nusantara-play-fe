/**
 * Phase 28: camera framing of the paper map and the province state cues (states readable without colour alone).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ProvinceSummary } from '@/lib/jelajah/data';
import { parseProvinceGeo, shapesBounds } from '@/lib/jelajah/geo';
import { LIFT, provinceCues } from '@/lib/jelajah/map-model';
import {
  cameraPosition,
  FRAME_MARGIN,
  frameMap,
  MAP_TILT,
  MIN_DISTANCE,
  project,
  screenBox,
  zoomLimits,
} from '@/lib/jelajah/paper-camera';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));
const shapes = lowPolyShapes(parseProvinceGeo(JSON.parse(readFileSync(geoPath, 'utf8')), KNOWN_PROVINCES).shapes);
const bounds = shapesBounds(shapes);

/** The map section is the viewport minus the 64 px navbar, at least 440 px high (JelajahHub). */
const VIEWPORTS = [
  ['portrait phone 390x844', 390, Math.max(440, 844 - 64)],
  ['landscape phone 844x390', 844, Math.max(440, 390 - 64)],
  ['desktop 1440x900', 1440, Math.max(440, 900 - 64)],
] as const;

describe('camera framing (Phase 28)', () => {
  it('projection: the target is in the centre, east is right, north is up, the tilt is fixed', () => {
    const pose = { target: [0, 0, 0] as const, distance: 50 };
    expect(project([0, 0, 0], pose, 1)![0]).toBeCloseTo(0);
    expect(project([0, 0, 0], pose, 1)![1]).toBeCloseTo(0);
    expect(project([5, 0, 0], pose, 1)![0]).toBeGreaterThan(0);
    expect(project([0, 0, -5], pose, 1)![1]).toBeGreaterThan(0); // north (-z) is up on screen
    const [, y, z] = cameraPosition(pose);
    expect(Math.atan2(z, y)).toBeCloseTo(MAP_TILT);
  });

  it.each(VIEWPORTS)('%s: the whole archipelago (with its mountains) is on screen, centred and filling it', (_n, w, h) => {
    const aspect = w / h;
    const pose = frameMap(bounds, aspect);
    const box = screenBox(bounds, pose, aspect)!;
    const limit = 1 - FRAME_MARGIN + 1e-6;
    expect(box.minX).toBeGreaterThanOrEqual(-limit);
    expect(box.maxX).toBeLessThanOrEqual(limit);
    expect(box.minY).toBeGreaterThanOrEqual(-limit);
    expect(box.maxY).toBeLessThanOrEqual(limit);
    // Tight in at least one direction (not needlessly small) and centred both ways.
    expect(Math.max(box.maxX - box.minX, box.maxY - box.minY)).toBeGreaterThan(2 * (1 - FRAME_MARGIN) - 0.02);
    expect(Math.abs(box.minX + box.maxX)).toBeLessThan(0.02);
    expect(Math.abs(box.minY + box.maxY)).toBeLessThan(0.02);
  });

  it.each(VIEWPORTS)('%s: zoom limits allow closer views and a little more than the whole map', (_n, w, h) => {
    const aspect = w / h;
    const limits = zoomLimits(bounds, aspect);
    const fit = frameMap(bounds, aspect).distance;
    expect(limits.min).toBeLessThanOrEqual(MIN_DISTANCE);
    expect(limits.max).toBeGreaterThan(fit);
    expect(limits.max).toBeLessThan(fit * 1.5);
  });
});

const summary = (kode: string, protCount: number): ProvinceSummary => ({ kode, nama: kode, slug: kode, protCount, prots: [] });
const byKode = new Map([
  ['32', summary('32', 1)], // PROT, not enterable
  ['12', summary('12', 0)], // muted
  ['33', summary('33', 0)], // enterable, no PROT
]);

describe('province states without relying on colour (Phase 28)', () => {
  const cues = {
    muted: provinceCues('12', byKode, null, null),
    prot: provinceCues('32', byKode, null, null),
    enterable: provinceCues('33', byKode, null, null),
    hover: provinceCues('32', byKode, '32', null),
    selected: provinceCues('32', byKode, null, '32'),
    enterableSelected: provinceCues('33', byKode, null, '33'),
  };

  it('muted provinces never lift, even when hovered or selected', () => {
    expect(provinceCues('12', byKode, '12', '12')).toEqual(cues.muted);
    expect(cues.muted).toMatchObject({ raised: false, lift: 0, rim: false, flag: false });
  });

  it('hover lifts with a rim; selected lifts higher with a rim; enterable provinces carry the flag', () => {
    expect(cues.hover).toMatchObject({ state: 'hover', lift: LIFT.hover, rim: true });
    expect(cues.selected).toMatchObject({ state: 'selected', lift: LIFT.selected, rim: true });
    expect(LIFT.selected).toBeGreaterThan(LIFT.hover);
    expect(cues.enterable.flag).toBe(true);
    expect(cues.enterableSelected).toMatchObject({ flag: true, lift: LIFT.selected });
  });

  it('every two situations differ in at least one cue that is not colour (height, lift, rim, flag)', () => {
    const list = Object.entries(cues);
    for (let a = 0; a < list.length; a += 1)
      for (let b = a + 1; b < list.length; b += 1) {
        const [na, ca] = list[a];
        const [nb, cb] = list[b];
        const differ = ca.raised !== cb.raised || ca.lift !== cb.lift || ca.rim !== cb.rim || ca.flag !== cb.flag;
        expect(differ, `${na} vs ${nb}`).toBe(true);
      }
  });
});

describe('legend (Phase 28)', () => {
  it('documents the PROT colouring and every state with its non-colour cue', async () => {
    const { JelajahHub } = await import('@/components/jelajah/JelajahHub');
    const html = renderToStaticMarkup(createElement(JelajahHub));
    for (const text of [
      'Ada PROT: lebih tinggi, makin banyak makin hijau tua',
      'Belum ada PROT: lebih rendah',
      'desa virtual, bisa dimasuki',
      'Disorot: terangkat, garis amber',
      'Dipilih: terangkat',
    ])
      expect(html).toContain(text);
  }, 20_000); // imports the whole hub (slow under load)
});
