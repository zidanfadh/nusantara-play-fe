/**
 * Nature on the paper map (Phase 28): mountain ranges, volcanoes, rivers, lakes and the ships' sea routes, plus the
 * pure placement that turns them into per-province features. No three.js (the 2D map and the tests use it too).
 *
 * SOURCES (decoration, not survey data; positions rounded):
 * - Volcano coordinates: Smithsonian Institution, Global Volcanism Program, "Volcanoes of the World" database
 *   (volcano.si.edu), summit positions rounded to 0.01°. `smoke` marks volcanoes that erupted or were persistently
 *   degassing in recent years (GVP weekly reports); it is a visual choice, not a hazard statement.
 * - Puncak Jaya (Carstensz Pyramid, 4884 m) is NOT a volcano (a limestone peak of the Sudirman Range); it is listed in
 *   PEAKS as the tallest mountain, without smoke.
 * - Mountain ranges, rivers and lakes: traced by hand at coarse resolution along the courses shown on OpenStreetMap
 *   (openstreetmap.org, © OpenStreetMap contributors, ODbL) and the Wikipedia articles of each range/river; only a few
 *   points each, never copied geometry. The map draws them as low-poly decoration.
 * - Ship routes: invented loops on open water between the islands (checked by a test to stay off land).
 */
import { hitTest, project, type Point, type ProvinceShape } from './geo';
import { rand01 } from './paper-map';

type LonLat = readonly [number, number];

export interface MountainRange {
  name: string;
  /** Along the ridge, west/north to east/south. */
  path: readonly LonLat[];
}

export interface Volcano {
  name: string;
  lon: number;
  lat: number;
  /** Province code(s) it lies in (on the 2019 boundaries; Merapi is on the Jawa Tengah / DIY border). */
  kode: readonly string[];
  smoke: boolean;
  /** A small island that the low-poly outline may drop; then the volcano is left out. */
  smallIsland?: boolean;
}

export interface Peak {
  name: string;
  lon: number;
  lat: number;
  kode: readonly string[];
  /** Height factor (1 = an ordinary mountain). */
  scale: number;
}

export interface River {
  name: string;
  path: readonly LonLat[];
}

export interface Lake {
  name: string;
  lon: number;
  lat: number;
  /** Half axes in degrees and the rotation of the long axis (radians, from east). */
  rx: number;
  ry: number;
  angle: number;
}

export const MOUNTAIN_RANGES: readonly MountainRange[] = [
  {
    name: 'Bukit Barisan (Sumatra)',
    path: [[96.3, 4.9], [97.2, 4.2], [97.9, 3.4], [98.6, 2.5], [99.3, 1.5], [99.9, 0.5], [100.6, -0.6], [101.3, -1.7], [102.1, -2.8], [102.9, -3.8], [103.8, -4.6], [104.5, -5.1]],
  },
  {
    name: 'Java volcanic arc',
    path: [[106.3, -6.85], [107.3, -7.05], [108.3, -7.2], [109.3, -7.25], [110.3, -7.45], [111.3, -7.65], [112.4, -7.9], [113.4, -7.95], [114.1, -8.05]],
  },
  {
    name: 'Lesser Sunda Islands',
    path: [[115.2, -8.3], [116.4, -8.45], [117.4, -8.55], [118.5, -8.6], [120.1, -8.65], [121.2, -8.75], [122.4, -8.55], [124.3, -9.6]],
  },
  { name: 'Schwaner Mountains (Borneo)', path: [[111.1, -0.7], [112.0, -0.6], [112.9, -0.3], [113.6, 0.3]] },
  { name: 'Müller Mountains (Borneo)', path: [[113.9, 0.7], [114.6, 1.1], [115.2, 1.8], [115.6, 2.8], [115.8, 3.7]] },
  { name: 'Meratus Mountains (Borneo)', path: [[115.6, -1.8], [115.75, -2.6], [115.9, -3.4]] },
  { name: 'Central Sulawesi highlands', path: [[120.0, -1.3], [120.2, -2.1], [120.0, -2.9], [119.9, -3.6]] },
  { name: 'Sulawesi northern arm', path: [[121.2, 0.7], [122.3, 0.75], [123.4, 0.75]] },
  { name: 'Sulawesi south-eastern arm', path: [[121.7, -3.3], [122.2, -3.9]] },
  { name: 'Halmahera', path: [[127.9, 1.6], [128.1, 0.8], [128.4, 0.1]] },
  { name: 'Seram', path: [[129.2, -3.1], [129.9, -3.05], [130.5, -3.2]] },
  { name: 'Arfak and Tamrau (Bird’s Head)', path: [[132.4, -0.8], [133.2, -0.75], [133.9, -1.1]] },
  {
    name: 'Papua central cordillera (Sudirman and Jayawijaya)',
    path: [[134.9, -3.4], [135.8, -3.7], [136.6, -3.9], [137.6, -4.05], [138.5, -4.1], [139.3, -4.25], [140.1, -4.5], [140.9, -4.8]],
  },
];

export const VOLCANOES: readonly Volcano[] = [
  { name: 'Sinabung', lon: 98.39, lat: 3.17, kode: ['12'], smoke: true },
  { name: 'Marapi', lon: 100.47, lat: -0.38, kode: ['13'], smoke: true },
  { name: 'Kerinci', lon: 101.26, lat: -1.7, kode: ['15', '13'], smoke: true },
  { name: 'Dempo', lon: 103.13, lat: -4.03, kode: ['16'], smoke: false },
  { name: 'Krakatau', lon: 105.42, lat: -6.1, kode: ['18'], smoke: true, smallIsland: true },
  { name: 'Merapi', lon: 110.44, lat: -7.54, kode: ['33', '34'], smoke: true },
  { name: 'Kelud', lon: 112.31, lat: -7.93, kode: ['35'], smoke: false },
  { name: 'Bromo (Tengger)', lon: 112.95, lat: -7.94, kode: ['35'], smoke: false },
  { name: 'Semeru', lon: 112.92, lat: -8.11, kode: ['35'], smoke: true },
  { name: 'Agung', lon: 115.51, lat: -8.34, kode: ['51'], smoke: false },
  { name: 'Rinjani', lon: 116.47, lat: -8.42, kode: ['52'], smoke: false },
  { name: 'Tambora', lon: 118.0, lat: -8.25, kode: ['52'], smoke: false },
  { name: 'Lewotobi', lon: 122.78, lat: -8.54, kode: ['53'], smoke: true },
  { name: 'Lokon-Empung', lon: 124.79, lat: 1.36, kode: ['71'], smoke: false },
  { name: 'Karangetang', lon: 125.41, lat: 2.78, kode: ['71'], smoke: true, smallIsland: true },
  { name: 'Gamalama', lon: 127.33, lat: 0.8, kode: ['82'], smoke: false, smallIsland: true },
  { name: 'Ibu', lon: 127.63, lat: 1.49, kode: ['82'], smoke: true },
  { name: 'Banda Api', lon: 129.87, lat: -4.53, kode: ['81'], smoke: false, smallIsland: true },
];

export const PEAKS: readonly Peak[] = [{ name: 'Puncak Jaya (not a volcano)', lon: 137.16, lat: -4.08, kode: ['91'], scale: 1.45 }];

export const RIVERS: readonly River[] = [
  { name: 'Musi', path: [[102.4, -3.35], [103.0, -3.2], [103.6, -3.05], [104.2, -3.0], [104.75, -2.99], [104.9, -2.6], [104.95, -2.35]] },
  { name: 'Batang Hari', path: [[101.5, -1.05], [102.1, -1.45], [102.8, -1.7], [103.6, -1.6], [104.2, -1.2], [104.4, -1.05]] },
  { name: 'Kapuas', path: [[113.9, 0.85], [113.0, 0.75], [112.2, 0.55], [111.5, 0.1], [110.6, 0.0], [109.8, -0.05], [109.35, -0.1]] },
  { name: 'Mahakam', path: [[114.5, 0.6], [115.2, 0.1], [115.9, -0.3], [116.5, -0.4], [117.1, -0.55], [117.35, -0.6]] },
  { name: 'Barito', path: [[114.9, -0.4], [114.9, -1.2], [114.8, -2.1], [114.65, -2.9], [114.55, -3.35]] },
  { name: 'Mamberamo', path: [[139.0, -3.45], [138.5, -2.95], [138.1, -2.3], [137.85, -1.6]] },
  { name: 'Digul', path: [[140.7, -5.0], [140.2, -5.9], [139.4, -6.6], [138.7, -7.1]] },
];

export const LAKES: readonly Lake[] = [
  { name: 'Danau Toba', lon: 98.85, lat: 2.62, rx: 0.36, ry: 0.13, angle: -0.6 },
  { name: 'Danau Singkarak', lon: 100.53, lat: -0.62, rx: 0.1, ry: 0.04, angle: -0.8 },
  { name: 'Danau Poso', lon: 120.62, lat: -1.9, rx: 0.15, ry: 0.06, angle: 1.4 },
  { name: 'Danau Paniai', lon: 136.35, lat: -3.9, rx: 0.12, ry: 0.06, angle: 0.3 },
  { name: 'Danau Sentani', lon: 140.52, lat: -2.62, rx: 0.15, ry: 0.04, angle: 0.1 },
];

/** Closed sea routes of the ships (lon/lat waypoints, open water only). */
export const SHIP_ROUTES: readonly { name: string; path: readonly LonLat[] }[] = [
  { name: 'Laut Jawa', path: [[107.6, -5.0], [110.2, -4.6], [113.2, -4.9], [110.6, -5.4]] },
  { name: 'Laut Flores', path: [[117.4, -6.95], [119.4, -6.55], [119.7, -7.2], [117.9, -7.4]] },
  { name: 'Laut Banda', path: [[124.8, -5.6], [127.6, -5.1], [128.6, -6.5], [125.6, -6.9]] },
  { name: 'Laut Arafura', path: [[134.8, -8.6], [136.6, -8.7], [137.6, -9.4], [135.4, -9.7]] },
  { name: 'Samudra Hindia', path: [[106.8, -8.9], [110.2, -9.1], [113.4, -9.4], [110.0, -9.8]] },
  { name: 'Laut Sulawesi', path: [[120.8, 2.4], [123.0, 2.1], [123.6, 3.3], [121.4, 3.5]] },
];

// ---------------------------------------------------------------------------------------------------------------
// Placement (pure, deterministic)

export interface PlacedMountain {
  /** Map coordinates of the centre. */
  x: number;
  y: number;
  radius: number;
  height: number;
  sides: number;
  /** Rotation of the base polygon (radians). */
  rotation: number;
  volcano: { name: string; smoke: boolean } | null;
}

export interface PlacedStrip {
  /** Map coordinates, at least two points. */
  points: Point[];
  width: number;
}

export interface PlacedLake {
  x: number;
  y: number;
  ring: Point[];
}

/** Everything placed on one province (same index as the shapes). */
export interface ProvinceNature {
  mountains: PlacedMountain[];
  rivers: PlacedStrip[];
  lakes: PlacedLake[];
}

export interface NatureOptions {
  /** Spacing of the mountains along a range (map units). */
  spacing: number;
  /** Keep only every n-th range mountain (lite = 2). Volcanoes and peaks always stay. */
  thin: number;
  rivers: boolean;
}

export const NATURE_FULL: NatureOptions = { spacing: 0.82, thin: 1, rivers: true };
export const NATURE_LITE: NatureOptions = { spacing: 1.05, thin: 2, rivers: false };

const RIVER_WIDTH = 0.075;

/**
 * The province index under the circle's centre when the whole circle (centre + 8 rim points) is on land, or -1.
 * The rim may cross into a neighbouring province (ranges often follow borders); the centre's province carries it.
 */
function holder(shapes: readonly ProvinceShape[], x: number, y: number, r: number): number {
  const i = hitTest(shapes, [x, y]);
  if (i < 0) return -1;
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    if (hitTest(shapes, [x + Math.cos(a) * r, y + Math.sin(a) * r]) < 0) return -1;
  }
  return i;
}

/**
 * Where a cone of one of the radii (largest first) fits on land near (x, y): the exact spot, else nudged inland by up
 * to 0.32 map units (coastal volcanoes on narrow islands), always staying in the province under the original spot.
 * Null when the spot is not on land (a small island the low-poly outline dropped) or nothing fits.
 */
function fitCircle(shapes: readonly ProvinceShape[], x: number, y: number, radii: readonly number[]) {
  const home = hitTest(shapes, [x, y]);
  if (home < 0) return null;
  for (const r of radii) {
    for (const d of [0, 0.08, 0.16, 0.24, 0.32]) {
      for (let k = 0; k < (d === 0 ? 1 : 8); k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const cx = x + Math.cos(a) * d;
        const cy = y + Math.sin(a) * d;
        if (holder(shapes, cx, cy, r) === home) return { x: cx, y: cy, r, i: home };
      }
    }
  }
  return null;
}

/** Distance from a volcano to its nearest neighbour in the list (Bromo and Semeru are only 0.17° apart). */
function nearestVolcano(v: Volcano): number {
  let d = Infinity;
  for (const o of VOLCANOES) if (o !== v) d = Math.min(d, Math.hypot(o.lon - v.lon, o.lat - v.lat));
  return d;
}

function along(path: readonly LonLat[], spacing: number): Point[] {
  const pts = path.map(([lon, lat]) => project(lon, lat));
  const out: Point[] = [];
  let carry = spacing / 2;
  for (let s = 0; s + 1 < pts.length; s += 1) {
    const [ax, ay] = pts[s];
    const [bx, by] = pts[s + 1];
    const len = Math.hypot(bx - ax, by - ay);
    let d = carry;
    while (d <= len) {
      out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]);
      d += spacing;
    }
    carry = d - len;
  }
  return out;
}

export function placeNature(shapes: readonly ProvinceShape[], options: NatureOptions = NATURE_FULL): ProvinceNature[] {
  const result: ProvinceNature[] = shapes.map(() => ({ mountains: [], rivers: [], lakes: [] }));
  const taken: Point[] = [];
  const free = (x: number, y: number, r: number) => taken.every(([tx, ty]) => Math.hypot(tx - x, ty - y) > r);

  // Volcanoes and peaks first (they win over range mountains nearby).
  for (const v of VOLCANOES) {
    const [x, y] = project(v.lon, v.lat);
    const fit = Math.min(0.42, nearestVolcano(v) * 0.62);
    const spot = fitCircle(shapes, x, y, [fit, fit * 0.72, fit * 0.5, Math.min(fit, 0.13), Math.min(fit, 0.09)]);
    if (!spot) continue;
    result[spot.i].mountains.push({
      x: spot.x,
      y: spot.y,
      radius: spot.r,
      height: (0.62 + 0.4 * rand01('vh', v.name)) * Math.sqrt(spot.r / 0.42),
      sides: 6 + (rand01('vs', v.name) < 0.5 ? 0 : 1),
      rotation: rand01('vr', v.name) * Math.PI,
      volcano: { name: v.name, smoke: v.smoke },
    });
    taken.push([spot.x, spot.y]);
  }
  for (const p of PEAKS) {
    const [x, y] = project(p.lon, p.lat);
    const spot = fitCircle(shapes, x, y, [0.5, 0.38]);
    if (!spot) continue;
    result[spot.i].mountains.push({ x: spot.x, y: spot.y, radius: spot.r, height: 0.7 * p.scale, sides: 5, rotation: 0.3, volcano: null });
    taken.push([spot.x, spot.y]);
  }

  for (const range of MOUNTAIN_RANGES) {
    along(range.path, options.spacing).forEach(([px, py], n) => {
      if (n % options.thin !== 0) return;
      // Seeded jitter across the ridge, size and shape.
      const jx = (rand01('mx', range.name, n) - 0.5) * 0.4;
      const jy = (rand01('my', range.name, n) - 0.5) * 0.4;
      const x = px + jx;
      const y = py + jy;
      const size = 0.85 + 0.3 * rand01('mr', range.name, n);
      const spot = fitCircle(shapes, x, y, [0.48 * size, 0.36 * size, 0.26 * size]);
      if (!spot || !free(spot.x, spot.y, 0.62)) return;
      result[spot.i].mountains.push({
        x: spot.x,
        y: spot.y,
        radius: spot.r,
        height: spot.r * (1.1 + 0.6 * rand01('mh', range.name, n)),
        sides: 5 + (hashSides(range.name, n) % 3),
        rotation: rand01('mo', range.name, n) * Math.PI * 2,
        volcano: null,
      });
      taken.push([spot.x, spot.y]);
    });
  }

  if (options.rivers) {
    for (const river of RIVERS) {
      const pts = river.path.map(([lon, lat]) => project(lon, lat));
      // Split the river into runs that stay inside one province (a run never crosses a border).
      let run: Point[] = [];
      let owner = -1;
      const flush = () => {
        if (owner >= 0 && run.length >= 2) result[owner].rivers.push({ points: run, width: RIVER_WIDTH });
        run = [];
      };
      for (let k = 0; k + 1 < pts.length; k += 1) {
        const mid: Point = [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2];
        const i = hitTest(shapes, mid);
        if (i !== owner) {
          flush();
          owner = i;
        }
        if (owner < 0) continue;
        if (run.length === 0) run.push(pts[k]);
        run.push(pts[k + 1]);
      }
      flush();
    }
    for (const lake of LAKES) {
      const [x, y] = project(lake.lon, lake.lat);
      const i = hitTest(shapes, [x, y]);
      if (i < 0) continue;
      const ring: Point[] = [];
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const ex = Math.cos(a) * lake.rx;
        const ey = Math.sin(a) * lake.ry;
        ring.push([x + ex * Math.cos(lake.angle) - ey * Math.sin(lake.angle), y + ex * Math.sin(lake.angle) + ey * Math.cos(lake.angle)]);
      }
      result[i].lakes.push({ x, y, ring });
    }
  }
  return result;
}

function hashSides(name: string, n: number): number {
  return Math.floor(rand01('sides', name, n) * 3);
}

/** The ship routes as closed loops of map points. */
export function shipLoops(): Point[][] {
  return SHIP_ROUTES.map((route) => route.path.map(([lon, lat]) => project(lon, lat)));
}

/** A point on a closed Catmull-Rom loop through `pts` at t ∈ [0, 1), and its unit tangent. */
export function loopPoint(pts: readonly Point[], t: number): { p: Point; tangent: Point } {
  const n = pts.length;
  const u = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(u);
  const f = u - i;
  const p0 = pts[(i - 1 + n) % n];
  const p1 = pts[i % n];
  const p2 = pts[(i + 1) % n];
  const p3 = pts[(i + 2) % n];
  const cr = (a: number, b: number, c: number, d: number, s: number) =>
    0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
  const dcr = (a: number, b: number, c: number, d: number, s: number) =>
    0.5 * (-a + c + 2 * (2 * a - 5 * b + 4 * c - d) * s + 3 * (-a + 3 * b - 3 * c + d) * s * s);
  const p: Point = [cr(p0[0], p1[0], p2[0], p3[0], f), cr(p0[1], p1[1], p2[1], p3[1], f)];
  const tx = dcr(p0[0], p1[0], p2[0], p3[0], f);
  const ty = dcr(p0[1], p1[1], p2[1], p3[1], f);
  const len = Math.hypot(tx, ty) || 1;
  return { p, tangent: [tx / len, ty / len] };
}

/**
 * Smoke puff k (of `count`) of a volcano at time `seconds`: rise, drift east with the wind, grow, then shrink away.
 * `still` (reduced motion, lite) = fixed phases, no movement. Pure, so it is tested.
 */
export function smokePuff(k: number, count: number, seconds: number, still: boolean) {
  const PERIOD = 6.5;
  const phase = still ? (k + 0.5) / count : (((seconds / PERIOD + k / count) % 1) + 1) % 1;
  const rise = 0.12 + phase * 0.95;
  const drift = phase * 0.35;
  const size = phase < 0.8 ? 0.07 + phase * 0.17 : (0.07 + 0.8 * 0.17) * (1 - (phase - 0.8) / 0.2);
  return { rise, drift, size: Math.max(0.001, size) };
}

/**
 * What moves on the map (Phase 28): ships sail and smoke rises only on the full tier without reduced motion. With
 * reduced motion the ships stay docked (still, at the start of their route) and the smoke stands still. The lite tier
 * has no ships and still smoke; the 2d tier has neither (it never loads three.js).
 */
export function ambientMode(tier: 'full' | 'lite' | '2d', reducedMotion: boolean) {
  if (tier === '2d') return { ships: 'none', smoke: 'none', animate: false } as const;
  if (tier === 'lite') return { ships: 'none', smoke: 'still', animate: false } as const;
  return reducedMotion
    ? ({ ships: 'docked', smoke: 'still', animate: false } as const)
    : ({ ships: 'sailing', smoke: 'rising', animate: true } as const);
}
