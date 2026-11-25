/**
 * The paper "sea" of the hub map (Phase 28): ONE plane with a canvas texture drawn in code (no image file): the paper
 * colour, a seeded grain, a vignette towards `paperEdge` (also the scene background, so the plane's border never
 * shows) and, for the lite tier, the islands' soft drop shadow painted INTO the texture (no extra plane, no overdraw,
 * no shadow map). The full tier gets a real shadow map instead (never both).
 */
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import type { Bounds, ProvinceShape } from '../geo';
import { type MapPalette, rgba } from '../palette';
import { rand01 } from '../paper-map';
import { LIGHT_DIR } from './map-geometry';

/** The ONE kind of island shadow per tier: a real shadow map (full) or painted into the paper (lite); never both. */
export function shadowMode(tier: 'full' | 'lite'): 'map' | 'baked' {
  return tier === 'full' ? 'map' : 'baked';
}

/** Paper plane in map units, centred on the archipelago. */
export const PAPER = { width: 160, depth: 100 } as const;

export interface PaperOptions {
  /** Texture width in pixels (height follows the plane's aspect). */
  px: number;
  /** Shapes whose drop shadow is painted into the texture (lite tier), or null. */
  shadowShapes: readonly ProvinceShape[] | null;
  /** Slab height, for the shadow's offset. */
  shadowHeight: number;
}

/** The plane's area in map coordinates (x east, y north), centred on the bounds. */
export function paperArea(bounds: Bounds): Bounds {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { minX: cx - PAPER.width / 2, maxX: cx + PAPER.width / 2, minY: cy - PAPER.depth / 2, maxY: cy + PAPER.depth / 2 };
}

let grainTile: HTMLCanvasElement | null = null;
/** A 128 px tile of seeded grain (alpha specks and short fibres), drawn once per page. */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const v = rand01('grain', i);
    img.data[i * 4] = 0;
    img.data[i * 4 + 1] = 0;
    img.data[i * 4 + 2] = 0;
    img.data[i * 4 + 3] = v > 0.5 ? Math.round((v - 0.5) * 70) : 0;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let f = 0; f < 18; f += 1) {
    const x = rand01('fx', f) * size;
    const y = rand01('fy', f) * size;
    const a = rand01('fa', f) * Math.PI;
    const l = 4 + rand01('fl', f) * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  grainTile = c;
  return c;
}

/** Draws the paper; returns the canvas. */
export function drawPaper(palette: MapPalette, area: Bounds, options: PaperOptions): HTMLCanvasElement {
  const w = options.px;
  const h = Math.round((w * (area.maxY - area.minY)) / (area.maxX - area.minX));
  const scale = w / (area.maxX - area.minX);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Paper with a vignette: the centre in `paper`, the border in `paperEdge` (= the scene background).
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.5);
  g.addColorStop(0, palette.paper);
  g.addColorStop(1, palette.paperEdge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Grain: the tile, tinted by drawing it through the grain colour.
  const tile = grain();
  const tinted = document.createElement('canvas');
  tinted.width = tile.width;
  tinted.height = tile.height;
  const tctx = tinted.getContext('2d')!;
  tctx.drawImage(tile, 0, 0);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = palette.grain;
  tctx.fillRect(0, 0, tinted.width, tinted.height);
  const pattern = ctx.createPattern(tinted, 'repeat');
  if (pattern) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  if (options.shadowShapes) {
    // Baked drop shadow: the shapes are drawn far off the canvas and only their blurred shadow lands on it
    // (`shadowBlur` works everywhere, unlike `ctx.filter`). Offset away from the light, like the full tier's.
    const reach = options.shadowHeight / LIGHT_DIR[1];
    const offX = -LIGHT_DIR[0] * reach * scale;
    const offY = -LIGHT_DIR[2] * reach * scale; // world -z is north = canvas up; light from the north → shadow down
    const far = w * 2;
    ctx.save();
    ctx.shadowColor = rgba(palette.shadow, 0.42);
    ctx.shadowBlur = Math.max(2, 0.3 * scale);
    ctx.shadowOffsetX = far + offX;
    ctx.shadowOffsetY = offY;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const shape of options.shadowShapes)
      for (const poly of shape.polygons)
        for (const ring of poly) {
          ring.forEach(([x, y], i) => {
            const px = (x - area.minX) * scale - far;
            const py = (area.maxY - y) * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
        }
    ctx.fill();
    ctx.restore();
  }
  return canvas;
}

export function paperTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  return texture;
}
