/**
 * All drawing of the egrang race (Phase 23): Canvas 2D in code, no image files.
 *
 * - Backdrop per variant, matching the Jelajah villages (Phase 22): Bambu = Jawa Tengah (a volcano in the
 *   haze, rice terraces, bamboo clumps), Batok = Sulawesi Selatan (sea, distant islands, palms, a
 *   pinisi-like boat on the beach). Light theme = day, dark theme = dusk.
 *   The sky and the far landmark are a static canvas drawn on resize only; the middle band is a tile
 *   drawn once per size and scrolled with parallax (two drawImage calls per frame).
 * - The track: two lanes in a light perspective (the computer's lane behind, smaller), the gentle hill,
 *   stones and puddles, distance posts, the start line and the finish gate with its banner.
 * - Racers: friendly code-drawn figures. The player wears a red sarong with dots and a red headband, the
 *   computer a blue sarong with stripes and a blue peci (colour AND pattern differ). Bambu: tall bamboo
 *   poles with foot rests, held at the top; Batok: coconut shells under the feet, strings to the hands.
 * - Effects (world-anchored particles): dust on steps, splashes in puddles, sparkles on perfect steps,
 *   confetti at the finish; fewer with reduced motion, and no camera shake.
 * - Indicators: the balance arc above the player (Bambu) and the rhythm ring at its feet (Batok).
 */
import { TUNING, heightAt, tiltOf, timeToIdeal, beatTime, otherFoot } from '@/lib/games/egrang/engine';
import type { Foot, RacerState, Side, Track, Variant } from '@/lib/games/egrang/types';

export interface View {
  w: number;
  h: number;
  /** Pixels per metre on the player's lane. */
  ppm: number;
  /** Screen x of the camera's focus (the player's position on screen). */
  anchorX: number;
  /** Landscape phone or very short canvas. */
  compact: boolean;
  horizonY: number;
  /**
   * Lane rows from back to front. The computer's path lies further back and higher up (smaller), with its
   * feet above the player's head, so the two racers never hide each other: compFar, computer, compNear,
   * playerFar, player, playerNear.
   */
  rows: { y: number; s: number }[];
  /** Bottom of the middle band (the backdrop's parallax tile). */
  bandBottom: number;
}

export const ROW = { compFar: 0, computer: 1, compNear: 2, playerFar: 3, player: 4, playerNear: 5 } as const;
const LANE_ROW: Record<Side, number> = { 0: ROW.player, 1: ROW.computer };
const LANE_EDGES: Record<Side, [number, number]> = { 0: [ROW.playerFar, ROW.playerNear], 1: [ROW.compFar, ROW.compNear] };
/** Scale of the computer's lane (it is further away). */
const COMP_SCALE = 0.56;

/** Total height of a racer, ground to the top of the head (m). */
export function figureHeight(variant: Variant): number {
  return (variant === 'bambu' ? 0.95 : 0.12) + 0.72 + 0.48 + 0.24 + 0.17;
}

export function computeView(w: number, h: number, variant: Variant): View {
  const compact = h < 360 || (w > h && h < 330);
  const portrait = w < h;
  const H = figureHeight(variant);
  const playerGround = h * (portrait ? 0.82 : compact ? 0.9 : 0.86);
  /** Space kept free for the HUD at the top. */
  const top = compact ? 36 : 54;
  const fit = (playerGround - top) / ((1 + COMP_SCALE) * H + 0.45);
  const ppm = Math.max(30, Math.min(w / (portrait ? 4.6 : 9), fit, 160));
  const compGround = playerGround - (H + 0.3) * ppm;
  const d = ppm * 0.45;
  const rows = [
    { y: compGround - d * COMP_SCALE * 0.6, s: COMP_SCALE * 0.97 },
    { y: compGround, s: COMP_SCALE },
    { y: compGround + d * COMP_SCALE * 0.45, s: COMP_SCALE * 1.03 },
    { y: playerGround - d * 0.95, s: 0.93 },
    { y: playerGround, s: 1 },
    { y: playerGround + d * 0.45, s: 1.03 },
  ];
  const horizonY = rows[0].y - Math.min(h * 0.1, ppm * 0.9);
  return { w, h, ppm, anchorX: w * (portrait ? 0.27 : 0.34), compact, horizonY, rows, bandBottom: rows[ROW.playerFar].y + 3 };
}

/** Screen position of world x on a row (`lift` metres above the ground there). */
export function toScreen(v: View, camX: number, x: number, row: number, lift = 0, track?: Track): [number, number] {
  const r = v.rows[row];
  const k = v.ppm * r.s;
  const ground = track ? heightAt(track, x) : 0;
  return [v.anchorX + (x - camX) * k, r.y - (ground + lift) * k];
}

// ---- colours -------------------------------------------------------------------------------------------

export interface RacerStyle {
  sarong: string;
  sarongDark: string;
  pattern: 'dots' | 'stripes';
  patternColour: string;
  shirt: string;
  head: 'iket' | 'peci';
  headColour: string;
  skin: string;
  hair: string;
}

export const RACER_STYLES: Readonly<Record<Side, RacerStyle>> = {
  0: { sarong: '#c8382c', sarongDark: '#8f241c', pattern: 'dots', patternColour: '#ffe7b0', shirt: '#f4e3c3', head: 'iket', headColour: '#d9412f', skin: '#c98a5c', hair: '#2a1c14' },
  1: { sarong: '#2563a8', sarongDark: '#173f70', pattern: 'stripes', patternColour: '#9fd6ef', shirt: '#cfe7e9', head: 'peci', headColour: '#1d2b4a', skin: '#b97a4e', hair: '#1e1610' },
};

/** HUD swatches (same colours as the sarongs). */
export const SWATCH_CSS: Readonly<Record<Side, string>> = { 0: '#c8382c', 1: '#2563a8' };

interface Palette {
  skyTop: string;
  skyBottom: string;
  haze: string;
  far: string;
  farSnow?: string;
  mid1: string;
  mid2: string;
  mid3: string;
  plant: string;
  plantDark: string;
  meadow: string;
  track: string;
  trackDark: string;
  line: string;
  water: string;
  sea?: string;
  seaLight?: string;
  sand?: string;
  sun: string;
}

function palette(variant: Variant, dark: boolean): Palette {
  if (variant === 'bambu') {
    return dark
      ? { skyTop: '#151c3a', skyBottom: '#7a4f60', haze: 'rgba(160,120,150,0.25)', far: '#2c2e4a', mid1: '#2f4a33', mid2: '#3a5a3c', mid3: '#456944', plant: '#4c6b34', plantDark: '#2d4220', meadow: '#3b5532', track: '#7d6448', trackDark: '#5c4733', line: 'rgba(255,240,210,0.55)', water: '#4d6f8f', sun: '#f6d39a' }
      : { skyTop: '#86c2e6', skyBottom: '#f6e6c3', haze: 'rgba(255,255,255,0.35)', far: '#7c8aa0', mid1: '#7fb553', mid2: '#93c460', mid3: '#a9d070', plant: '#6f9a37', plantDark: '#4d7426', meadow: '#8fbf58', track: '#cfa66d', trackDark: '#a98352', line: 'rgba(255,255,255,0.8)', water: '#6fb7dd', sun: '#fff3c4' };
  }
  return dark
    ? { skyTop: '#121a3a', skyBottom: '#73475a', haze: 'rgba(150,120,160,0.22)', far: '#28304a', mid1: '#1f3c58', mid2: '#2a4c66', mid3: '#b29a70', plant: '#3e6234', plantDark: '#25401f', meadow: '#a48b62', track: '#a38a62', trackDark: '#7d6948', line: 'rgba(255,240,210,0.55)', water: '#3d6889', sea: '#1d3f5f', seaLight: '#2f5b7c', sand: '#b39a6c', sun: '#f6d39a' }
    : { skyTop: '#73c3ef', skyBottom: '#fbe9c8', haze: 'rgba(255,255,255,0.3)', far: '#6c9ab6', mid1: '#2f97c4', mid2: '#55b6d6', mid3: '#f2dca4', plant: '#4f8f3a', plantDark: '#336b27', meadow: '#ead39a', track: '#e6cd93', trackDark: '#c9ad72', line: 'rgba(255,255,255,0.85)', water: '#5bb5dc', sea: '#2f9bc6', seaLight: '#7fd0e6', sand: '#f2dca4', sun: '#fff5cf' };
}

// ---- deterministic decor -----------------------------------------------------------------------------

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// ---- static backdrop (sky + far landmark) -------------------------------------------------------------

export function drawBackdrop(canvas: HTMLCanvasElement, v: View, dpr: number, variant: Variant, dark: boolean): void {
  canvas.width = Math.round(v.w * dpr);
  canvas.height = Math.round(v.h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = palette(variant, dark);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, v.horizonY + 20);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, v.w, v.h);
  // Sun (day) or a low warm sun (dusk).
  const sx = v.w * (variant === 'bambu' ? 0.8 : 0.22);
  const sy = v.horizonY * (dark ? 0.72 : 0.32);
  const sr = Math.max(14, v.ppm * 0.42);
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 3);
  glow.addColorStop(0, p.sun);
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  ctx.fillStyle = p.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  // A few soft clouds (more sky on portrait screens).
  ctx.fillStyle = dark ? 'rgba(210,190,220,0.16)' : 'rgba(255,255,255,0.75)';
  const clouds = Math.max(3, Math.round(v.horizonY / 90));
  for (let i = 0; i < clouds; i += 1) {
    const cx = (hash(i * 3 + 1) * 1.1 - 0.05) * v.w;
    const cy = 60 + hash(i * 3 + 2) * Math.max(20, v.horizonY - 150);
    const cw = Math.max(40, v.ppm * (0.9 + hash(i * 3 + 3)));
    for (let j = 0; j < 3; j += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + (j - 1) * cw * 0.45, cy - (j === 1 ? cw * 0.12 : 0), cw * 0.42, cw * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const base = v.horizonY;
  if (variant === 'bambu') {
    // Volcano in the haze with a smoke wisp, plus a lower ridge.
    const cx = v.w * 0.42;
    const hgt = Math.min(v.h * 0.32, v.ppm * 3.4);
    const half = hgt * 1.9;
    ctx.fillStyle = p.far;
    ctx.beginPath();
    ctx.moveTo(cx - half * 1.6, base);
    ctx.quadraticCurveTo(cx - half * 0.55, base - hgt * 0.45, cx - hgt * 0.16, base - hgt);
    ctx.lineTo(cx + hgt * 0.16, base - hgt * 0.98);
    ctx.quadraticCurveTo(cx + half * 0.6, base - hgt * 0.42, cx + half * 1.7, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark ? 'rgba(200,190,210,0.18)' : 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + i * hgt * 0.14, base - hgt * (1.08 + i * 0.1), hgt * (0.07 + i * 0.03), hgt * (0.04 + i * 0.015), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = p.haze;
    ctx.fillRect(0, base - hgt * 0.5, v.w, hgt * 0.5);
    ctx.fillStyle = dark ? '#33415a' : '#8fa3a8';
    ridge(ctx, v.w, base, hgt * 0.18, 7);
  } else {
    // Sea to the horizon with distant islands.
    ctx.fillStyle = p.sea!;
    ctx.fillRect(0, base - 2, v.w, v.h - base + 2);
    ctx.fillStyle = p.far;
    const isle = (x: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(x - w, base);
      ctx.quadraticCurveTo(x, base - h * 2, x + w, base);
      ctx.fill();
    };
    isle(v.w * 0.62, v.ppm * 2.2, v.ppm * 0.38);
    isle(v.w * 0.82, v.ppm * 1.1, v.ppm * 0.22);
    isle(v.w * 0.1, v.ppm * 1.5, v.ppm * 0.25);
    ctx.fillStyle = p.haze;
    ctx.fillRect(0, base - v.ppm * 0.6, v.w, v.ppm * 0.6);
  }
  // Ground in front of the band (static; the track is drawn over it every frame).
  ctx.fillStyle = p.meadow;
  ctx.fillRect(0, v.bandBottom - 3, v.w, v.h - v.bandBottom + 3);
}

function ridge(ctx: CanvasRenderingContext2D, w: number, base: number, amp: number, seed: number) {
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.013 + seed) * Math.cos(x * 0.007 + seed * 2)));
  ctx.lineTo(w, base + 2);
  ctx.lineTo(0, base + 2);
  ctx.closePath();
  ctx.fill();
}

// ---- middle band (parallax tile) ------------------------------------------------------------------------

export const MID_PARALLAX = 0.32;

export interface MidTile {
  canvas: HTMLCanvasElement;
  /** Tile width and the band it covers (CSS px). */
  width: number;
  top: number;
  height: number;
}

/**
 * The middle band, from the horizon down to the player's lane: Bambu = rice terraces with bamboo clumps and a
 * hut behind the computer's path; Batok = shallow water, the beach, palms and a pinisi-like boat behind it.
 * Drawn once per size and theme; seamless, so it scrolls by repeating.
 */
export function buildMidTile(v: View, dpr: number, variant: Variant, dark: boolean): MidTile {
  const width = Math.ceil(Math.max(v.w * 1.4, 600));
  const top = Math.floor(v.horizonY - 2);
  const bottom = Math.ceil(v.bandBottom);
  const height = Math.max(1, bottom - top);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, width, top, height };
  ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
  const p = palette(variant, dark);
  const band = bottom - top;
  const decorBase = v.rows[ROW.compFar].y + 1;
  const unit = v.ppm * 0.42;
  const each = (count: number, seed: number, fn: (x: number, r: number) => void) => {
    for (let i = 0; i < count; i += 1) {
      const x = ((i + hash(seed + i) * 0.7) / count) * width;
      fn(x, hash(seed * 7 + i));
      // Wrap copies so the tile is seamless.
      fn(x - width, hash(seed * 7 + i));
      fn(x + width, hash(seed * 7 + i));
    }
  };
  if (variant === 'bambu') {
    // Rice terraces: stacked curved bands with bright edges.
    const rows = 6;
    for (let r = 0; r < rows; r += 1) {
      const y0 = top + 2 + (band * r) / rows;
      ctx.fillStyle = [p.mid1, p.mid2, p.mid3, p.mid2, p.mid1, p.mid3][r];
      const wave = (x: number) => y0 + Math.sin((x / width) * Math.PI * 2 * ((r % 3) + 1) + r) * band * 0.035;
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      for (let x = 0; x <= width + 16; x += 16) ctx.lineTo(x, wave(x));
      ctx.lineTo(width + 16, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(170,200,160,0.25)' : 'rgba(240,255,210,0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= width + 16; x += 16) {
        if (x === 0) ctx.moveTo(x, wave(x));
        else ctx.lineTo(x, wave(x));
      }
      ctx.stroke();
    }
    // Bamboo clumps and huts behind the computer's path.
    each(5, 11, (x, r) => bambooClump(ctx, x, decorBase, unit * (0.8 + r * 0.5), p, r));
    each(2, 31, (x, r) => hut(ctx, x, decorBase, unit * (0.9 + r * 0.3), dark));
  } else {
    // Light water band, the beach; palms and a boat behind the computer's path.
    const shore = decorBase - Math.min(band * 0.3, v.ppm * 0.5);
    ctx.fillStyle = p.seaLight!;
    ctx.fillRect(0, top, width, shore - top + 2);
    ctx.strokeStyle = dark ? 'rgba(200,220,240,0.25)' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      const y = top + ((shore - top) * (i + 0.5)) / 4;
      for (let x = 0; x <= width + 12; x += 12) {
        const yy = y + Math.sin((x / width) * Math.PI * 2 * Math.round(width / 125) + i * 2) * 1.5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = p.sand!;
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    for (let x = 0; x <= width + 16; x += 16) ctx.lineTo(x, shore + Math.sin((x / width) * Math.PI * 4) * 3);
    ctx.lineTo(width + 16, bottom);
    ctx.closePath();
    ctx.fill();
    each(1, 5, (x) => pinisi(ctx, x + width * 0.2, shore + 2, unit * 1.3, dark));
    each(6, 17, (x, r) => palm(ctx, x, decorBase, unit * (1 + r * 0.6), p, r));
  }
  return { canvas, width, top, height };
}

function bambooClump(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, p: Palette, r: number) {
  const stems = 5;
  for (let i = 0; i < stems; i += 1) {
    const lean = (i - stems / 2) * 0.12 + (r - 0.5) * 0.2;
    const h = size * (2.2 + hash(i * 13 + Math.floor(r * 100)) * 1.4);
    const bx = x + (i - stems / 2) * size * 0.12;
    const tx = bx + Math.sin(lean) * h;
    const ty = y - Math.cos(lean) * h;
    ctx.strokeStyle = i % 2 ? p.plant : p.plantDark;
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + (tx - bx) * 0.4, y - h * 0.6, tx, ty);
    ctx.stroke();
    // nodes
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 5; k += 1) {
      const t = k / 5;
      const nx = bx + (tx - bx) * t * t * 0.9 + (tx - bx) * 0.1 * t;
      const ny = y - h * t;
      ctx.beginPath();
      ctx.moveTo(nx - size * 0.05, ny);
      ctx.lineTo(nx + size * 0.05, ny);
      ctx.stroke();
    }
    // leaves
    ctx.fillStyle = i % 2 ? p.plant : p.plantDark;
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      ctx.ellipse(tx + (k - 1.5) * size * 0.18, ty + k * size * 0.1, size * 0.28, size * 0.07, (k - 1.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function hut(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dark: boolean) {
  ctx.fillStyle = dark ? '#5a4030' : '#9a6a40';
  ctx.fillRect(x - s * 0.5, y - s * 0.6, s, s * 0.6);
  ctx.fillStyle = dark ? '#3c2a20' : '#7a4a2a';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.85, y - s * 0.55);
  ctx.lineTo(x - s * 0.3, y - s * 1.05);
  ctx.lineTo(x + s * 0.3, y - s * 1.05);
  ctx.lineTo(x + s * 0.85, y - s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark ? '#2b1d14' : '#5b3a20';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y - s * 1.0);
  ctx.lineTo(x, y - s * 1.32);
  ctx.lineTo(x + s * 0.35, y - s * 1.0);
  ctx.closePath();
  ctx.fill();
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: Palette, r: number) {
  const h = s * 2.6;
  const lean = (r - 0.5) * 0.5;
  const tx = x + Math.sin(lean) * h;
  const ty = y - Math.cos(lean) * h;
  ctx.strokeStyle = '#8a6a44';
  ctx.lineWidth = Math.max(2, s * 0.1);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (tx - x) * 0.2, y - h * 0.55, tx, ty);
  ctx.stroke();
  ctx.fillStyle = p.plant;
  for (let k = 0; k < 6; k += 1) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55;
    ctx.beginPath();
    ctx.ellipse(tx + Math.cos(a) * s * 0.42, ty + Math.sin(a) * s * 0.28 + s * 0.12, s * 0.5, s * 0.1, a + Math.PI / 2 + 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath();
  ctx.arc(tx, ty + s * 0.08, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

/** A pinisi-like boat (loose hint: a long hull with a raised stern, two masts, triangular sails). */
function pinisi(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dark: boolean) {
  ctx.fillStyle = dark ? '#4a2c1a' : '#7a4426';
  ctx.beginPath();
  ctx.moveTo(x - s * 1.6, y - s * 0.35);
  ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.15, x + s * 1.4, y - s * 0.2);
  ctx.lineTo(x + s * 1.75, y - s * 0.6);
  ctx.lineTo(x - s * 1.9, y - s * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark ? '#c9b48a' : '#f3e7c8';
  ctx.fillRect(x - s * 1.7, y - s * 0.66, s * 3.3, s * 0.06);
  ctx.strokeStyle = dark ? '#3a2416' : '#5b331c';
  ctx.lineWidth = Math.max(1, s * 0.05);
  for (const mx of [-0.6, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + mx * s, y - s * 0.6);
    ctx.lineTo(x + mx * s, y - s * 2.3);
    ctx.stroke();
    ctx.fillStyle = dark ? '#d7cdb5' : '#fffaf0';
    ctx.beginPath();
    ctx.moveTo(x + mx * s + s * 0.05, y - s * 2.2);
    ctx.lineTo(x + mx * s + s * 0.85, y - s * 0.75);
    ctx.lineTo(x + mx * s + s * 0.05, y - s * 0.75);
    ctx.closePath();
    ctx.fill();
  }
}

/** Draws the scrolled middle band. */
export function drawMid(ctx: CanvasRenderingContext2D, v: View, tile: MidTile, camX: number): void {
  const off = Math.round(-(((camX * v.ppm * MID_PARALLAX) % tile.width) + tile.width) % tile.width);
  for (let x = off; x < v.w; x += tile.width) ctx.drawImage(tile.canvas, x, tile.top, tile.width, tile.height);
}

// ---- the track -------------------------------------------------------------------------------------------

interface TrackOptions {
  /** Lanes whose surface is drawn here (the others come from a cache). */
  surface?: readonly Side[];
  /** World range of the surface (default: what is visible). */
  range?: [number, number];
  /** Finish signs and distance posts (per frame; never in the cache). */
  signs?: boolean;
  step?: number;
}

export function drawTrack(ctx: CanvasRenderingContext2D, v: View, track: Track, camX: number, dark: boolean, opts: TrackOptions = {}): void {
  const p = palette(track.variant, dark);
  const surface = opts.surface ?? [1, 0];
  const signs = opts.signs ?? true;
  for (const side of [1, 0] as const) {
    const [rowA, rowB] = LANE_EDGES[side];
    const s = v.rows[LANE_ROW[side]].s;
    // Visible world range on this lane (the far lane shows more metres).
    const x0 = opts.range ? opts.range[0] : camX - v.anchorX / (v.ppm * s) - 1;
    const x1 = opts.range ? opts.range[1] : camX + (v.w - v.anchorX) / (v.ppm * s) + 1;
    const k = v.ppm * s;
    if (!surface.includes(side)) {
      if (signs && track.length >= x0 - 2 && track.length <= x1 + 2) drawFinishGate(ctx, v, track, camX, rowA, rowB, k, dark);
      continue;
    }
    const stepX = opts.step ?? Math.max(0.35, (x1 - x0) / 56);
    const edge = (row: number, x: number) => toScreen(v, camX, x, row, 0, track);
    // Surface (following the hill), then its front face.
    ctx.fillStyle = side === 0 ? p.track : p.trackDark;
    ctx.beginPath();
    for (let x = x0; x <= x1 + stepX; x += stepX) {
      const [sx, sy] = edge(rowA, x);
      if (x === x0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    for (let x = x1 + stepX; x >= x0 - stepX; x -= stepX) {
      const [sx, sy] = edge(rowB, x);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.trackDark;
    ctx.beginPath();
    for (let x = x0; x <= x1 + stepX; x += stepX) {
      const [sx, sy] = edge(rowB, x);
      if (x === x0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    for (let x = x1 + stepX; x >= x0 - stepX; x -= stepX) {
      const [sx, sy] = toScreen(v, camX, x, rowB);
      ctx.lineTo(sx, sy + 4 * s);
    }
    ctx.closePath();
    ctx.fill();

    // Obstacles on this lane.
    for (const o of track.obstacles) {
      if (o.x < x0 - 1 || o.x > x1 + 1) continue;
      const [sx, sy] = toScreen(v, camX, o.x, LANE_ROW[side], 0, track);
      if (o.kind === 'batu') {
        ctx.fillStyle = dark ? '#6f6f78' : '#8d8f96';
        ctx.beginPath();
        ctx.ellipse(sx, sy - k * 0.02, k * 0.2, k * 0.14, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = dark ? '#8a8a94' : '#b4b6bd';
        ctx.beginPath();
        ctx.ellipse(sx - k * 0.05, sy - k * 0.08, k * 0.08, k * 0.05, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark ? '#5a5a62' : '#7b7d84';
        ctx.beginPath();
        ctx.ellipse(sx + k * 0.17, sy, k * 0.1, k * 0.08, 0, Math.PI, 0);
        ctx.fill();
      } else {
        ctx.fillStyle = p.water;
        ctx.beginPath();
        ctx.ellipse(sx, sy, k * 0.42, k * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(sx - k * 0.12, sy - k * 0.02, k * 0.12, k * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Start and finish lines across the lane; the finish gate.
    const across = (x: number, a: string, b: string | null) => {
      const segs = 4;
      for (let i = 0; i < segs; i += 1) {
        const [ax, ay] = between(v, camX, x, rowA, rowB, i / segs, track);
        const [bx, by] = between(v, camX, x, rowA, rowB, (i + 1) / segs, track);
        ctx.strokeStyle = b && i % 2 ? b : a;
        ctx.lineWidth = Math.max(2, k * 0.08);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    };
    if (0 >= x0 && 0 <= x1) across(0, '#ffffff', null);
    if (track.length >= x0 - 2 && track.length <= x1 + 2) {
      across(track.length, '#ffffff', '#222222');
      if (signs) drawFinishGate(ctx, v, track, camX, rowA, rowB, k, dark);
    }
  }
  if (!signs) return;

  // Distance posts every 10 m beside the player's lane.
  const k = v.ppm;
  ctx.font = `700 ${Math.max(10, Math.round(k * 0.17))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const x0 = camX - v.anchorX / k - 1;
  const x1 = camX + (v.w - v.anchorX) / k + 1;
  for (let m = 10; m < track.length; m += 10) {
    if (m < x0 || m > x1) continue;
    const [sx, sy] = toScreen(v, camX, m, ROW.playerFar, 0, track);
    const hpx = k * 0.42;
    ctx.fillStyle = dark ? '#6b5038' : '#8a6038';
    ctx.fillRect(sx - 2.5, sy - hpx, 5, hpx);
    ctx.fillStyle = dark ? '#e9dcc4' : '#fff8e8';
    ctx.fillRect(sx - k * 0.24, sy - hpx - k * 0.22, k * 0.48, k * 0.22);
    ctx.fillStyle = '#3b2a1a';
    ctx.fillText(`${m} m`, sx, sy - hpx - k * 0.06);
  }
}

/**
 * Pre-rendered lane surfaces (Phase 23 performance): each lane's surface, front face, obstacles and start /
 * finish lines over the whole reachable range, drawn once per size and theme into an offscreen strip; per frame
 * each lane is one drawImage. Strips are at most LANE_CACHE_MAX device px wide (lower resolution when needed).
 */
export interface LaneCache {
  canvas: HTMLCanvasElement;
  side: Side;
  xStart: number;
  top: number;
  width: number;
  height: number;
}

const LANE_CACHE_MAX = 8192;

export function buildLaneCaches(v: View, dpr: number, track: Track, dark: boolean): LaneCache[] {
  const out: LaneCache[] = [];
  for (const side of [1, 0] as const) {
    const [rowA, rowB] = LANE_EDGES[side];
    const s = v.rows[LANE_ROW[side]].s;
    const k = v.ppm * s;
    const xStart = -v.anchorX / k - 2;
    const xEnd = track.length + (v.w - v.anchorX) / k + 3;
    const width = Math.ceil((xEnd - xStart) * k);
    const top = Math.floor(v.rows[rowA].y - (track.hill.height + 0.25) * k);
    const height = Math.ceil(v.rows[rowB].y + 8 - top);
    const q = Math.min(dpr, LANE_CACHE_MAX / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * q));
    canvas.height = Math.max(1, Math.ceil(height * q));
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.setTransform(q, 0, 0, q, 0, 0);
    const cv: View = { ...v, anchorX: 0, rows: v.rows.map((r) => ({ y: r.y - top, s: r.s })) };
    drawTrack(ctx, cv, track, xStart, dark, { surface: [side], range: [xStart, xEnd], signs: false, step: 0.25 });
    out.push({ canvas, side, xStart, top, width, height });
  }
  return out;
}

/** Track from the lane caches (one drawImage per lane) plus the per-frame signs and posts. */
export function drawTrackCached(ctx: CanvasRenderingContext2D, v: View, track: Track, camX: number, dark: boolean, caches: readonly LaneCache[]): void {
  const cached: Side[] = [];
  for (const c of caches) {
    const k = v.ppm * v.rows[LANE_ROW[c.side]].s;
    ctx.drawImage(c.canvas, Math.round(v.anchorX + (c.xStart - camX) * k), c.top, c.width, c.height);
    cached.push(c.side);
  }
  drawTrack(ctx, v, track, camX, dark, { surface: ([1, 0] as Side[]).filter((sd) => !cached.includes(sd)) });
}

/** A point `t` of the way from row `a` to row `b` at world x. */
function between(v: View, camX: number, x: number, a: number, b: number, t: number, track: Track): [number, number] {
  const pa = toScreen(v, camX, x, a, 0, track);
  const pb = toScreen(v, camX, x, b, 0, track);
  return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
}

/** The finish sign: a red-and-white banner facing the camera on two bamboo poles at the lane's far edge. */
function drawFinishGate(ctx: CanvasRenderingContext2D, v: View, track: Track, camX: number, rowA: number, rowB: number, k: number, dark: boolean) {
  void rowB;
  const x = track.length;
  const [lx, ly] = toScreen(v, camX, x - 0.9, rowA, 0, track);
  const [rx, ry] = toScreen(v, camX, x + 0.9, rowA, 0, track);
  const poleH = k * (track.variant === 'bambu' ? 2.9 : 2.2);
  ctx.strokeStyle = dark ? '#8f9a4a' : '#b4c25c';
  ctx.lineWidth = Math.max(3, k * 0.09);
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx, ly - poleH);
  ctx.moveTo(rx, ry);
  ctx.lineTo(rx, ry - poleH);
  ctx.stroke();
  const bh = k * 0.55;
  const top = Math.min(ly, ry) - poleH + k * 0.08;
  ctx.fillStyle = '#d4302a';
  ctx.fillRect(lx, top, rx - lx, bh / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(lx, top + bh / 2, rx - lx, bh / 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(lx, top, rx - lx, bh);
  ctx.fillStyle = '#7a1410';
  ctx.font = `800 ${Math.max(9, Math.round(bh * 0.46))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINIS', (lx + rx) / 2, top + bh * 0.5);
  ctx.textBaseline = 'alphabetic';
}

// ---- racers ----------------------------------------------------------------------------------------------

/** Render-side walking animation of one racer (visual only; the engine never reads it). */
export interface RacerAnim {
  plant: Record<Foot, number>;
  swing: { foot: Foot; from: number; to: number; start: number; dur: number } | null;
  /** Lean added by the last step, decays (Batok has no sway). */
  bob: number;
  slipX: number;
}

export function createRacerAnim(x: number): RacerAnim {
  return { plant: { L: x - 0.12, R: x + 0.12 }, swing: null, bob: 0, slipX: 0 };
}

/** A step was taken: the foot swings from its old plant to just ahead of where the body glides to. */
export function animStep(a: RacerAnim, foot: Foot, bodyTarget: number, now: number, variant: Variant): void {
  if (a.swing) a.plant[a.swing.foot] = a.swing.to;
  const ahead = variant === 'bambu' ? 0.28 : 0.18;
  a.swing = { foot, from: a.plant[foot], to: bodyTarget + ahead, start: now, dur: variant === 'bambu' ? 0.28 : 0.2 };
  a.bob = 1;
}

export function animReset(a: RacerAnim, x: number): void {
  a.plant = { L: x - 0.12, R: x + 0.12 };
  a.swing = null;
  a.bob = 0;
}

export function animUpdate(a: RacerAnim, now: number, dt: number): void {
  if (a.swing && now - a.swing.start >= a.swing.dur) {
    a.plant[a.swing.foot] = a.swing.to;
    a.swing = null;
  }
  a.bob = Math.max(0, a.bob - dt * 4);
}

/** Ground x and lift (m) of a foot right now. */
function footAt(a: RacerAnim, foot: Foot, now: number): [number, number] {
  const s = a.swing;
  if (s && s.foot === foot) {
    const t = Math.min(1, Math.max(0, (now - s.start) / s.dur));
    const e = t * t * (3 - 2 * t);
    return [s.from + (s.to - s.from) * e, Math.sin(Math.PI * t) * 0.22];
  }
  return [a.plant[foot], 0];
}

export interface RacerPose {
  side: Side;
  x: number;
  /** Bambu lean −1 … 1 (beyond = falling). */
  tilt: number;
  phase: RacerState['phase'];
  /** 0 … 1 through the current penalty phase. */
  progress: number;
  finished: boolean;
}

/**
 * Draws one racer on its lane. `now` = simulation seconds (for the foot swings). Bambu: tall poles with foot
 * rests; Batok: shells under the feet and strings to the hands.
 */
export function drawRacer(ctx: CanvasRenderingContext2D, v: View, track: Track, camX: number, pose: RacerPose, anim: RacerAnim, now: number, variant: Variant): void {
  const row = LANE_ROW[pose.side];
  const k = v.ppm * v.rows[row].s;
  const st = RACER_STYLES[pose.side];
  const [bx, by] = toScreen(v, camX, pose.x, row, 0, track);
  const rest = variant === 'bambu' ? 0.95 : 0.12;

  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(bx, by, k * 0.42, k * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Whole-body rotation: Bambu sway lean, falls, Batok stumbles.
  let rot = 0;
  let drop = 0;
  if (variant === 'bambu') {
    if (pose.phase === 'fallen') {
      const e = Math.min(1, pose.progress * 1.4);
      rot = (pose.tilt >= 0 ? 1 : -1) * e * 1.25;
      drop = e * rest * 0.8;
    } else if (pose.phase === 'climbing') {
      const e = 1 - pose.progress;
      rot = (pose.tilt >= 0 ? 1 : -1) * e * 1.25 * Math.max(0, 1 - pose.progress * 1.6);
      drop = rest * (pose.progress < 0.5 ? 0.8 : 0.8 * (1 - (pose.progress - 0.5) * 2));
    } else {
      rot = Math.max(-1.2, Math.min(1.2, pose.tilt)) * 0.2;
    }
  } else if (pose.phase === 'stumbling') {
    rot = Math.sin(Math.PI * Math.min(1, pose.progress * 1.5)) * 0.35;
  } else {
    rot = anim.bob * 0.03;
  }

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);
  const footScreen = (foot: Foot): [number, number, number] => {
    const [fx, lift] = footAt(anim, foot, now);
    const groundDiff = heightAt(track, fx) - heightAt(track, pose.x);
    return [(fx - pose.x) * k, -(lift + groundDiff) * k, lift];
  };
  const hipY = -(rest + 0.72 - drop) * k;
  const shoulderY = hipY - 0.48 * k;
  const headY = shoulderY - 0.24 * k;
  const back: Foot = anim.swing ? otherFoot(anim.swing.foot) : 'L';
  const order: Foot[] = [back, otherFoot(back)];

  // Stilts and legs, the back one first (darker).
  for (const foot of order) {
    const [fx, fy] = footScreen(foot);
    const isBack = foot === order[0];
    if (variant === 'bambu') {
      const topX = fx * 0.35 + (foot === 'L' ? -0.04 : 0.05) * k;
      const topY = shoulderY - 0.12 * k;
      ctx.strokeStyle = isBack ? '#9aa64a' : '#c3cf63';
      ctx.lineWidth = Math.max(3, k * 0.07);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(topX, topY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,80,20,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let n = 1; n < 6; n += 1) {
        const t = n / 6;
        const nx = fx + (topX - fx) * t;
        const ny = fy + (topY - fy) * t;
        ctx.moveTo(nx - k * 0.035, ny);
        ctx.lineTo(nx + k * 0.035, ny);
      }
      ctx.stroke();
      // Foot rest at `rest` up the pole.
      const t = Math.min(0.95, (rest * k) / Math.max(1, Math.hypot(topX - fx, topY - fy)));
      const rx = fx + (topX - fx) * t;
      const ry = fy + (topY - fy) * t;
      ctx.fillStyle = '#7a5a2a';
      ctx.fillRect(rx - k * 0.02, ry - k * 0.02, k * 0.14, k * 0.04);
      leg(ctx, 0, hipY, rx + k * 0.05, ry - k * 0.02, k, st, isBack);
    } else {
      // Coconut shell under the foot.
      const shellY = fy;
      ctx.fillStyle = isBack ? '#5a3a1e' : '#6e4826';
      ctx.beginPath();
      ctx.ellipse(fx, shellY - k * 0.02, k * 0.14, k * 0.12, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,15,5,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fx, shellY - k * 0.02, k * 0.09, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      leg(ctx, 0, hipY, fx, shellY - k * 0.13, k, st, isBack);
    }
  }

  // Sarong (hips to knees) with the side's pattern.
  const sw = 0.3 * k;
  const sarongTop = hipY - 0.06 * k;
  const sarongBottom = hipY + 0.42 * k;
  ctx.fillStyle = st.sarong;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.55, sarongTop);
  ctx.lineTo(sw * 0.55, sarongTop);
  ctx.lineTo(sw * 0.7, sarongBottom);
  ctx.lineTo(-sw * 0.62, sarongBottom);
  ctx.closePath();
  ctx.fill();
  // The pattern (dots / stripes) in ONE fill of the same path (a cached CanvasPattern; draw calls are what
  // costs most on software-rendered canvases).
  const pattern = sarongPattern(ctx, st, k);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fill();
  }
  ctx.fillStyle = st.sarongDark;
  ctx.fillRect(-sw * 0.56, sarongTop, sw * 1.12, k * 0.05);

  // Torso (shirt).
  ctx.fillStyle = st.shirt;
  roundRect(ctx, -0.15 * k, shoulderY - 0.02 * k, 0.3 * k, hipY - shoulderY + 0.02 * k, 0.07 * k);
  ctx.fill();

  // Arms: to the pole tops (Bambu), holding strings (Batok), up when finished.
  const armTo = (foot: Foot): [number, number] => {
    if (pose.finished && pose.side === 0) return [(foot === 'L' ? -0.18 : 0.2) * k, shoulderY - 0.42 * k];
    if (variant === 'bambu') {
      const [fx] = footScreen(foot);
      return [fx * 0.35 + (foot === 'L' ? -0.04 : 0.05) * k, shoulderY - 0.12 * k];
    }
    return [(foot === 'L' ? 0.1 : 0.2) * k, hipY - 0.18 * k];
  };
  for (const foot of order) {
    const [hx, hy] = armTo(foot);
    ctx.strokeStyle = foot === order[0] ? shade(st.skin) : st.skin;
    ctx.lineWidth = Math.max(2.5, k * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.02 * k, shoulderY + 0.04 * k);
    ctx.quadraticCurveTo((hx + 0.02 * k) / 2 + 0.06 * k, (shoulderY + hy) / 2 + 0.08 * k, hx, hy);
    ctx.stroke();
    if (variant === 'batok' && !(pose.finished && pose.side === 0)) {
      // String from the hand to the shell.
      const [fx, fy] = footScreen(foot);
      ctx.strokeStyle = 'rgba(240,230,200,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(fx, fy - k * 0.12);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // Head: face, hair and headwear.
  const hr = 0.13 * k;
  ctx.fillStyle = st.skin;
  ctx.beginPath();
  ctx.arc(0.02 * k, headY, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = st.hair;
  ctx.beginPath();
  ctx.arc(0.0, headY - hr * 0.1, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  if (st.head === 'iket') {
    ctx.fillStyle = st.headColour;
    ctx.fillRect(-hr * 1.02, headY - hr * 0.62, hr * 2.06, hr * 0.32);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.95, headY - hr * 0.5);
    ctx.lineTo(-hr * 1.6, headY - hr * 0.2);
    ctx.lineTo(-hr * 1.5, headY - hr * 0.7);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = st.headColour;
    roundRect(ctx, -hr * 0.85, headY - hr * 1.25, hr * 1.8, hr * 0.7, hr * 0.15);
    ctx.fill();
  }
  ctx.fillStyle = '#1b120c';
  ctx.beginPath();
  ctx.arc(0.02 * k + hr * 0.5, headY - hr * 0.05, Math.max(1, hr * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a2a1a';
  ctx.lineWidth = Math.max(1, hr * 0.1);
  ctx.beginPath();
  ctx.arc(0.02 * k + hr * 0.42, headY + hr * 0.25, hr * 0.28, 0.1 * Math.PI, 0.6 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,110,90,0.45)';
  ctx.beginPath();
  ctx.arc(0.02 * k + hr * 0.25, headY + hr * 0.25, hr * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Cached sarong patterns per canvas context, style and size bucket. */
const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern | null>>();

function sarongPattern(ctx: CanvasRenderingContext2D, st: RacerStyle, k: number): CanvasPattern | null {
  const cell = Math.max(4, Math.round(k * 0.09));
  const key = `${st.pattern}|${st.patternColour}|${cell}`;
  let map = patternCache.get(ctx);
  if (!map) {
    map = new Map();
    patternCache.set(ctx, map);
  }
  if (map.has(key)) return map.get(key)!;
  let pattern: CanvasPattern | null = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = cell * 2;
    c.height = cell * 2;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = st.patternColour;
      if (st.pattern === 'dots') {
        const r = Math.max(1, cell * 0.2);
        for (const [x, y] of [[cell * 0.5, cell * 0.5], [cell * 1.5, cell * 1.5]]) {
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        const h = Math.max(1.5, cell * 0.34);
        g.fillRect(0, cell * 0.5 - h / 2, cell * 2, h);
        g.fillRect(0, cell * 1.5 - h / 2, cell * 2, h);
      }
      pattern = ctx.createPattern(c, 'repeat');
    }
  }
  map.set(key, pattern);
  return pattern;
}

function leg(ctx: CanvasRenderingContext2D, hx: number, hy: number, fx: number, fy: number, k: number, st: RacerStyle, back: boolean) {
  // Knee bends forward.
  const mx = (hx + fx) / 2 + 0.08 * k;
  const my = (hy + fy) / 2;
  ctx.strokeStyle = back ? shade(st.skin) : st.skin;
  ctx.lineWidth = Math.max(3, k * 0.075);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(mx, my, fx, fy);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * 0.78);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- indicators --------------------------------------------------------------------------------------------

/**
 * Bambu balance arc above the player's head: a needle shows the lean; gold marks at the current swing's
 * ends (the ideal moments: left foot at the left mark, right foot at the right), the next foot's mark glows
 * as its moment comes; red ends = fall.
 */
export function drawBalanceArc(ctx: CanvasRenderingContext2D, v: View, cx: number, cy: number, r: RacerState, labels: { left: string; right: string }): void {
  const radius = Math.max(34, Math.min(70, v.ppm * 0.62));
  const span = Math.PI * 0.8; // the arc covers ±(span/2) from straight up = lean ±1.15
  const maxLean = 1.15;
  const ang = (lean: number) => -Math.PI / 2 + (Math.max(-maxLean, Math.min(maxLean, lean)) / maxLean) * (span / 2);
  ctx.save();
  ctx.lineCap = 'round';
  // Backing.
  ctx.strokeStyle = 'rgba(20,14,8,0.45)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, ang(-maxLean), ang(maxLean));
  ctx.stroke();
  // Safe zone and red ends.
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#f4ecd8';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, ang(-1), ang(1));
  ctx.stroke();
  ctx.strokeStyle = '#e0412f';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, ang(-maxLean), ang(-1));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, ang(1), ang(maxLean));
  ctx.stroke();
  // Gold marks at ±amp (where the needle turns = the ideal moments).
  const amp = Math.min(1, r.swayAmp);
  const walking = r.phase === 'walking';
  const next: Foot | null = walking && r.lastFoot ? otherFoot(r.lastFoot) : null;
  for (const foot of ['L', 'R'] as Foot[]) {
    const a = ang(foot === 'L' ? -amp : amp);
    let glow = 0.35;
    if (walking) {
      if (!next) glow = 0.8;
      else if (foot === next) {
        const d = timeToIdeal(r, foot);
        const near = Math.min(d, TUNING.bambu.swayPeriod - d);
        glow = Math.max(0.35, 1 - near / 0.25);
      }
    }
    ctx.strokeStyle = `rgba(255,196,40,${glow.toFixed(2)})`;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a - 0.09, a + 0.09);
    ctx.stroke();
  }
  // Labels L / R under the arc ends.
  ctx.fillStyle = '#fffaf0';
  ctx.font = `800 ${Math.max(11, Math.round(radius * 0.24))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = Math.cos(ang(-maxLean)) * (radius + 2);
  const ly = Math.sin(ang(-maxLean)) * (radius + 2);
  ctx.fillText(labels.left, cx + lx - 4, cy + ly + radius * 0.26);
  ctx.fillText(labels.right, cx - lx + 4, cy + ly + radius * 0.26);
  // Needle.
  const lean = walking ? tiltOf(r) : 0;
  const na = ang(lean);
  ctx.strokeStyle = Math.abs(lean) > 0.85 ? '#e0412f' : '#2b1c10';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (radius + 6), cy + Math.sin(na) * (radius + 6));
  ctx.stroke();
  ctx.fillStyle = '#2b1c10';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Batok rhythm ring at the player's feet: a gold ring closes onto a fixed circle as the next beat comes and
 * flashes on the beat; the next foot's letter sits in the middle.
 */
export function drawRhythmRing(ctx: CanvasRenderingContext2D, v: View, cx: number, cy: number, r: RacerState, raceT: number, nextLabel: string): void {
  const base = Math.max(16, v.ppm * 0.26);
  const beat = TUNING.batok.beat;
  const k = Math.max(r.lastBeat + 1, Math.ceil((raceT - TUNING.batok.goodWindow) / beat));
  const dt = beatTime(k) - raceT;
  const prev = raceT - beatTime(k - 1);
  const flash = prev >= 0 && prev < 0.12 ? 1 - prev / 0.12 : 0;
  const walking = r.phase === 'walking' && raceT >= 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.42);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(20,14,8,0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, base, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = flash > 0 ? `rgba(255,214,60,${(0.5 + flash * 0.5).toFixed(2)})` : 'rgba(255,250,235,0.9)';
  ctx.lineWidth = 4 + flash * 4;
  ctx.beginPath();
  ctx.arc(0, 0, base, 0, Math.PI * 2);
  ctx.stroke();
  if (walking && dt >= -TUNING.batok.goodWindow) {
    const t = Math.max(0, Math.min(1, dt / beat));
    const inWindow = Math.abs(dt) <= TUNING.batok.goodWindow;
    ctx.strokeStyle = inWindow ? 'rgba(255,196,40,0.95)' : 'rgba(255,196,40,0.55)';
    ctx.lineWidth = inWindow ? 6 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, base * (1 + t * 1.6), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (walking) {
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = 'rgba(20,14,8,0.7)';
    ctx.lineWidth = 3;
    ctx.font = `800 ${Math.max(11, Math.round(base * 0.55))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(nextLabel, cx, cy + base * 0.95);
    ctx.fillText(nextLabel, cx, cy + base * 0.95);
  }
}

// ---- effects ----------------------------------------------------------------------------------------------

interface Particle {
  x: number;
  /** Height above the ground (m). */
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  row: number;
  size: number;
  colour: string;
  gravity: number;
}

export interface Effects {
  parts: Particle[];
  reduced: boolean;
  shake: number;
}

export function createEffects(reduced: boolean): Effects {
  return { parts: [], reduced, shake: 0 };
}

function emit(fx: Effects, n: number, make: (i: number) => Particle) {
  const count = fx.reduced ? Math.ceil(n / 3) : n;
  for (let i = 0; i < count; i += 1) fx.parts.push(make(i));
  if (fx.parts.length > 240) fx.parts.splice(0, fx.parts.length - 240);
}

export function dustPuff(fx: Effects, side: Side, x: number, strength: number, dark: boolean, seed: number): void {
  emit(fx, Math.round(4 + strength * 5), (i) => {
    const r = hash(seed * 31 + i);
    return { x, y: 0.02, vx: (r - 0.5) * 0.9, vy: 0.25 + r * 0.35, life: 0, max: 0.45 + r * 0.3, row: LANE_ROW[side], size: 0.05 + r * 0.06, colour: dark ? 'rgba(170,150,120,0.5)' : 'rgba(205,180,140,0.6)', gravity: 0.4 };
  });
}

export function splash(fx: Effects, side: Side, x: number, seed: number): void {
  emit(fx, 9, (i) => {
    const r = hash(seed * 17 + i);
    return { x, y: 0.03, vx: (r - 0.5) * 1.6, vy: 0.8 + r * 0.8, life: 0, max: 0.5, row: LANE_ROW[side], size: 0.035, colour: 'rgba(140,200,240,0.85)', gravity: 4 };
  });
}

export function sparkles(fx: Effects, side: Side, x: number, height: number, seed: number): void {
  emit(fx, 8, (i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x, y: height, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9, life: 0, max: 0.3 + hash(seed + i) * 0.1, row: LANE_ROW[side], size: 0.022, colour: 'rgba(255,214,60,0.95)', gravity: 0 };
  });
}

export function confetti(fx: Effects, x: number, seed: number): void {
  const colours = ['#d4302a', '#ffd24a', '#2f9bc6', '#ffffff', '#4f8f3a'];
  emit(fx, 40, (i) => {
    const r = hash(seed * 13 + i);
    return { x: x + (r - 0.5) * 1.5, y: 2.6 + r, vx: (hash(i + 5) - 0.5) * 1.5, vy: hash(i + 9) * 1.2, life: 0, max: 1.6 + r, row: ROW.player, size: 0.06, colour: colours[i % colours.length], gravity: 1.5 };
  });
}

export function shakeOn(fx: Effects, amount: number): void {
  if (!fx.reduced) fx.shake = Math.max(fx.shake, amount);
}

export function updateEffects(fx: Effects, dt: number): void {
  for (const p of fx.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    p.vy -= p.gravity * dt;
  }
  fx.parts = fx.parts.filter((p) => p.life < p.max);
  fx.shake = Math.max(0, fx.shake - dt * 3);
}

/** Particles, batched: one path (one fill) per colour; they fade by shrinking. */
export function drawEffects(ctx: CanvasRenderingContext2D, v: View, track: Track, camX: number, fx: Effects): void {
  if (!fx.parts.length) return;
  const byColour = new Map<string, Particle[]>();
  for (const p of fx.parts) {
    const list = byColour.get(p.colour);
    if (list) list.push(p);
    else byColour.set(p.colour, [p]);
  }
  for (const [colour, list] of byColour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const p of list) {
      const [sx, sy] = toScreen(v, camX, p.x, p.row, p.y, track);
      const k = v.ppm * v.rows[p.row].s;
      const a = 1 - p.life / p.max;
      const r = Math.max(0.5, p.size * k * (0.35 + 0.65 * a) * (1 + (1 - a) * 0.6));
      ctx.moveTo(sx + r, sy);
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

export function shakeOffset(fx: Effects, t: number): [number, number] {
  if (!fx.shake) return [0, 0];
  const s = fx.shake * 7;
  return [Math.sin(t * 61) * s, Math.cos(t * 47) * s * 0.6];
}

/** Name tag above a racer. */
export function drawTag(ctx: CanvasRenderingContext2D, text: string, x0: number, y: number, colour: string, viewW = Infinity): void {
  ctx.font = '700 12px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  // Kept inside the canvas when the racer is near an edge.
  const x = Math.max(w / 2 + 4, Math.min(viewW - w / 2 - 4, x0));
  ctx.fillStyle = colour;
  roundRect(ctx, x - w / 2, y - 18, w, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - 9);
  ctx.textBaseline = 'alphabetic';
}

/** Height of a racer's head above its ground point (m), for tags. */
export function headHeight(variant: Variant): number {
  return figureHeight(variant);
}
