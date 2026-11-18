#!/usr/bin/env node
/**
 * Builds public/jelajah/geo/indonesia-provinces.json, the province shapes of the /jelajah hub map.
 *
 * Source: geoBoundaries gbHumanitarian IDN ADM1 (OCHA ROAP via HDX, 2019 boundaries, 34 provinces),
 * licence CC BY 3.0 IGO. Pinned to geoBoundaries commit 9469f09 and checked by SHA-256.
 *
 * Usage (run from the repo root; the raw file is ~110 MB, so keep it outside the repo):
 *   node scripts/build-jelajah-geo.mjs --download D:/dev-cache/tmp/jelajah-geo
 *   node scripts/build-jelajah-geo.mjs D:/path/to/geoBoundaries-IDN-ADM1.geojson
 *
 * Steps: keep only the name field, drop tiny islands, simplify (Visvalingam, weighted), round
 * coordinates, write GeoJSON in WGS84 lon/lat. Fails if the result is not under MAX_BYTES.
 * Province codes are NOT written here: the client maps names to codes (lib/jelajah/provinces.ts).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';

const SOURCE_URL =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/IDN/ADM1/geoBoundaries-IDN-ADM1.geojson';
const SOURCE_SHA256 = '88eb119bf5eaa57060e53616313a02ef69ceb8d4a91cb9a282cf9d0e7c84b828';
const MAX_BYTES = 400 * 1024;

// Tuned so the output stays well under MAX_BYTES while coastlines remain recognisable.
const SIMPLIFY_PERCENT = '0.5%';
const MIN_ISLAND_KM2 = 100;
const PRECISION_DEG = 0.001;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(repoRoot, 'public', 'jelajah', 'geo', 'indonesia-provinces.json');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function resolveInput(args) {
  if (args[0] === '--download') {
    const dir = args[1];
    if (!dir) throw new Error('--download needs a target directory (outside the repo)');
    mkdirSync(dir, { recursive: true });
    const target = join(dir, 'geoBoundaries-IDN-ADM1.geojson');
    if (!existsSync(target)) {
      console.log(`Downloading ${SOURCE_URL}`);
      const response = await fetch(SOURCE_URL);
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
      writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
    return target;
  }
  if (!args[0]) {
    throw new Error('Pass the source GeoJSON path, or --download <dir>');
  }
  return args[0];
}

async function main() {
  const inputPath = await resolveInput(process.argv.slice(2));
  const raw = readFileSync(inputPath);
  const digest = sha256(raw);
  if (digest !== SOURCE_SHA256) {
    throw new Error(`Unexpected source checksum ${digest} (expected ${SOURCE_SHA256})`);
  }

  const command = [
    '-i source.geojson',
    '-rename-fields name=shapeName',
    '-filter-fields name',
    `-filter-islands min-area=${MIN_ISLAND_KM2}km2 remove-empty`,
    `-simplify visvalingam weighted ${SIMPLIFY_PERCENT} keep-shapes`,
    '-clean',
    `-o format=geojson precision=${PRECISION_DEG} out.json`,
  ].join(' ');

  const output = await mapshaper.applyCommands(command, { 'source.geojson': raw.toString('utf8') });
  const json = JSON.parse(output['out.json']);
  json.features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  const text = JSON.stringify(json);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, text);
  const size = statSync(outFile).size;
  let points = 0;
  for (const f of json.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) points += ring.length;
  }
  console.log(`Wrote ${outFile}: ${json.features.length} features, ${points} points, ${size} bytes`);
  if (size >= MAX_BYTES) {
    throw new Error(`Output is ${size} bytes, the budget is under ${MAX_BYTES}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
