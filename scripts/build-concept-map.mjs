#!/usr/bin/env node
/**
 * Builds lib/jelajah/concept/indonesia-paths.ts, the small Indonesia outline of the concept video
 * (Phase 19): one SVG path per province (integer coordinates, relative commands) plus its centroid.
 *
 * Source: the hub map's committed shapes, public/jelajah/geo/indonesia-provinces.json (geoBoundaries
 * 2019, CC BY 3.0 IGO; see that folder's ATTRIBUTION.txt), simplified further with mapshaper (already a
 * devDependency). Province codes come from the hub's own name matching (lib/jelajah/provinces.ts, loaded
 * through Node's TypeScript type stripping), so the film and the map agree.
 *
 * Usage (repo root): pnpm concept:map   (then commit lib/jelajah/concept/indonesia-paths.ts)
 * Fails if the output is not under MAX_BYTES or a shape has no province code.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';
import { KNOWN_PROVINCES, matchShapesToProvinces } from '../lib/jelajah/provinces.ts';

const MAX_BYTES = 60 * 1024;
/** Width of the SVG coordinate space; the height follows from the projection. */
const VIEW_WIDTH = 1000;
const SIMPLIFY_PERCENT = '40%';
const MIN_ISLAND_KM2 = 300;
/** Same projection as the hub (lib/jelajah/geo.ts): 1 unit = 1 degree, y grows north. */
const MAP_CENTER = { lon: 118, lat: -2.5 };
const PAD = 8;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inFile = join(repoRoot, 'public', 'jelajah', 'geo', 'indonesia-provinces.json');
const outFile = join(repoRoot, 'lib', 'jelajah', 'concept', 'indonesia-paths.ts');

function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}

function ringCentroid(ring) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  if (Math.abs(a) < 1e-12) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

async function main() {
  const raw = readFileSync(inFile, 'utf8');
  const command = [
    '-i source.json',
    `-filter-islands min-area=${MIN_ISLAND_KM2}km2 remove-empty`,
    `-simplify visvalingam weighted ${SIMPLIFY_PERCENT} keep-shapes`,
    '-clean',
    '-o format=geojson precision=0.0001 out.json',
  ].join(' ');
  const output = await mapshaper.applyCommands(command, { 'source.json': raw });
  const features = JSON.parse(output['out.json']).features;

  // Bounds in hub map units (lon - 118, lat + 2.5), then a fixed scale to VIEW_WIDTH.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of features) {
    for (const poly of polygonsOf(f.geometry)) {
      for (const [lon, lat] of poly[0]) {
        const x = lon - MAP_CENTER.lon;
        const y = lat - MAP_CENTER.lat;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const scale = (VIEW_WIDTH - 2 * PAD) / (maxX - minX);
  const viewHeight = Math.round((maxY - minY) * scale + 2 * PAD);
  const toView = ([lon, lat]) => [
    Math.round((lon - MAP_CENTER.lon - minX) * scale + PAD),
    Math.round((maxY - (lat - MAP_CENTER.lat)) * scale + PAD),
  ];

  const names = features.map((f) => f.properties.name);
  const match = matchShapesToProvinces(names, KNOWN_PROVINCES);
  if (match.unmatchedShapes.length > 0) {
    throw new Error(`Shapes without a province code: ${match.unmatchedShapes.join(', ')}`);
  }

  const provinces = [];
  let points = 0;
  for (const f of features) {
    const kode = match.codeByShape.get(f.properties.name);
    let d = '';
    let largest = null;
    let largestArea = 0;
    for (const poly of polygonsOf(f.geometry)) {
      // Outer rings only: holes are tiny lakes, invisible at this size.
      const ring = poly[0].map(toView);
      if (ring.length > 1) {
        const [fx, fy] = ring[0];
        const [lx, ly] = ring[ring.length - 1];
        if (fx === lx && fy === ly) ring.pop();
      }
      // Drop repeated points after rounding.
      const clean = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
      if (clean.length < 3) continue;
      const area = Math.abs(ringArea(clean));
      if (area < 1.5) continue; // smaller than a pixel or two at full width
      if (area > largestArea) {
        largestArea = area;
        largest = clean;
      }
      points += clean.length;
      d += `M${clean[0][0]} ${clean[0][1]}`;
      let segment = 'l';
      for (let i = 1; i < clean.length; i += 1) {
        const dx = clean[i][0] - clean[i - 1][0];
        const dy = clean[i][1] - clean[i - 1][1];
        segment += `${i > 1 && dx >= 0 ? ' ' : ''}${dx}${dy >= 0 ? ' ' : ''}${dy}`;
      }
      d += `${segment}z`;
    }
    if (!largest) throw new Error(`No outline left for ${f.properties.name}`);
    const [cx, cy] = ringCentroid(largest);
    provinces.push({ kode, nama: f.properties.name, d, cx: Math.round(cx), cy: Math.round(cy) });
  }
  provinces.sort((a, b) => a.cx - b.cx || a.kode.localeCompare(b.kode));

  const body = provinces
    .map((p) => `  { kode: '${p.kode}', cx: ${p.cx}, cy: ${p.cy}, d: '${p.d}' },`)
    .join('\n');
  const text = `/**
 * GENERATED by scripts/build-concept-map.mjs (pnpm concept:map). Do not edit by hand.
 * Indonesia outline of the concept video (Phase 19): one SVG path per province in a ${VIEW_WIDTH}x${viewHeight}
 * coordinate space (integer, relative commands), sorted west to east by centroid. Source: the hub map's
 * public/jelajah/geo/indonesia-provinces.json (geoBoundaries 2019, CC BY 3.0 IGO), simplified.
 */

export interface ConceptProvincePath {
  /** Province code (lib/jelajah/provinces.ts). */
  kode: string;
  /** Centroid of the largest island, in view units. */
  cx: number;
  cy: number;
  d: string;
}

export const CONCEPT_MAP_VIEW = { width: ${VIEW_WIDTH}, height: ${viewHeight} } as const;

export const CONCEPT_PROVINCE_PATHS: readonly ConceptProvincePath[] = [
${body}
];
`;
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, text);
  const size = statSync(outFile).size;
  console.log(`Wrote ${outFile}: ${provinces.length} provinces, ${points} points, ${size} bytes (budget < ${MAX_BYTES})`);
  if (size >= MAX_BYTES) throw new Error(`Output is ${size} bytes, the budget is under ${MAX_BYTES}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
