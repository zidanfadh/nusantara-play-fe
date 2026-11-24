/**
 * Batik ornament geometry (Phase 27). ORIGINAL drawing in the spirit of the design team's cover (a ceplok / kawung-like
 * floral lattice in amber on dark brown), not traced from any existing batik: one 48 x 48 tile =
 * - a scalloped quatrefoil frame (four round lobes, each ending in a small pointed tip, cusps on the diagonals),
 * - a four-petal flower inside it (lens petals on the axes, round centre),
 * - a smaller four-petal flower on each tile corner (petals on the diagonals), where four frames meet,
 * - a dot on each edge midpoint, between the tips of two neighbouring frames.
 * Pure data (no React), shared by `components/brand/Batik.tsx`, the CSS texture in `app/globals.css` (data URI, kept
 * equal by `tests/brand/batik.test.tsx`) and the icon / Open Graph generator.
 */

export const BATIK_TILE = 48;
const C = BATIK_TILE / 2;

type Pt = [number, number];
const r1 = (n: number) => Math.round(n * 100) / 100;
const fmt = ([x, y]: Pt) => `${r1(x)},${r1(y)}`;

/** Rotates a point by k quarter turns (clockwise on screen) around (cx, cy). */
function quarter([x, y]: Pt, k: number, cx = C, cy = C): Pt {
  let p: Pt = [x, y];
  for (let i = 0; i < k; i++) p = [cx - (p[1] - cy), cy + (p[0] - cx)];
  return p;
}

/** Frame: four ogee lobes (N, E, S, W) from cusp to cusp, as one closed outline (stroked). */
const LOBE: Pt[] = [
  [18, 18], // cusp NW (start)
  [12, 11], [19, 8.5], [24, 4], // → tip
  [29, 8.5], [36, 11], [30, 18], // → cusp NE
];
export const FRAME_D = (() => {
  let d = `M${fmt(LOBE[0])}`;
  for (let k = 0; k < 4; k++) {
    const p = LOBE.map((pt) => quarter(pt, k));
    d += `C${fmt(p[1])} ${fmt(p[2])} ${fmt(p[3])}C${fmt(p[4])} ${fmt(p[5])} ${fmt(p[6])}`;
  }
  return `${d}Z`;
})();

function circle(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)},${r1(cy)}a${r},${r} 0 1 0 ${r1(2 * r)},0a${r},${r} 0 1 0 ${r1(-2 * r)},0Z`;
}

/** Lens petal from `a` to `b` bulging by `w` on both sides (filled). */
function petal(a: Pt, b: Pt, w: number): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = (-(b[1] - a[1]) / len) * w;
  const ny = ((b[0] - a[0]) / len) * w;
  return `M${fmt(a)}Q${fmt([mx + nx, my + ny])} ${fmt(b)}Q${fmt([mx - nx, my - ny])} ${fmt(a)}Z`;
}

/** Flower inside the frame: four lens petals on the axes and a round centre. */
export const FLOWER_D = [0, 1, 2, 3].map((k) => petal(quarter([24, 21], k), quarter([24, 10], k), 3.2)).join('') + circle(C, C, 2.2);

/** Small flower centred on (cx, cy): petals on the diagonals. */
function smallFlower(cx: number, cy: number): string {
  return [0, 1, 2, 3]
    .map((k) => petal(quarter([cx + 2, cy + 2], k, cx, cy), quarter([cx + 10.5, cy + 10.5], k, cx, cy), 3.1))
    .join('');
}

/** Flowers on the four tile corners (each shows as a quarter inside the tile; whole once tiles repeat). */
export const CORNER_FLOWERS_D = ([[0, 0], [BATIK_TILE, 0], [0, BATIK_TILE], [BATIK_TILE, BATIK_TILE]] as Pt[])
  .map(([x, y]) => smallFlower(x, y) + circle(x, y, 1.8))
  .join('');

/** One small flower (with its centre dot) centred on the origin, for placing with a translate. */
export const SMALL_FLOWER_D = smallFlower(0, 0) + circle(0, 0, 1.8);

/** Dots between two neighbouring frame tips (edge midpoints). */
export const DOTS_D = ([[C, 0], [0, C], [BATIK_TILE, C], [C, BATIK_TILE]] as Pt[]).map(([x, y]) => circle(x, y, 1.5)).join('');

/** Stroke width of the frame outline, in tile units. */
export const FRAME_STROKE = 2.4;

/** One tile as a standalone SVG string (for CSS data URIs and the icon / OG generator). */
export function batikTileSvg(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BATIK_TILE} ${BATIK_TILE}">` +
    `<path d="${FRAME_D}" fill="none" stroke="${color}" stroke-width="${FRAME_STROKE}" stroke-linejoin="round"/>` +
    `<path d="${FLOWER_D}${CORNER_FLOWERS_D}${DOTS_D}" fill="${color}"/>` +
    `</svg>`
  );
}

/** The tile as a CSS `url("data:...")` (used as a mask, so the colour does not matter). */
export function batikTileDataUri(): string {
  return `url("data:image/svg+xml,${encodeURIComponent(batikTileSvg('#000'))}")`;
}

/**
 * Lattice for the corner ornament (as on the cover): frames tip to tip on a square grid, small flowers where four
 * frames meet, cut along a 45° line. Returns the frame cells (top-left corners of their tiles) and the small flowers
 * (centres) inside the right triangle with legs `size` at the top-left corner; only WHOLE motifs are kept, so the
 * diagonal edge steps along the motifs like the cover's, never through them.
 */
export function cornerLattice(size: number): { cells: Pt[]; flowers: Pt[] } {
  const cells: Pt[] = [];
  const flowers: Pt[] = [];
  const n = Math.ceil(size / BATIK_TILE) + 1;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = i * BATIK_TILE;
      const y = j * BATIK_TILE;
      // A frame reaches 20 units from its centre; keep it when its outermost tip is inside the triangle.
      if (x + C + y + C + 20 <= size) cells.push([x, y]);
      // A small flower reaches about 15 units along the diagonal.
      if (x + y + 21 <= size) flowers.push([x, y]);
    }
  }
  return { cells, flowers };
}
