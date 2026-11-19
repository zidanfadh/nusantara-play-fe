/**
 * Cheap canvas textures of the province scene (Phase 11): the stand signs (one sprite each, not drei
 * Html) and the soft blob shadow. Text comes only from PROT data or neutral UI strings and is drawn as
 * plain text.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';
import { GAME_SOON_CANVAS } from '@/lib/jelajah/engine/game-soon';
import { fitSignText, SIGN_CANVAS, SIGN_TEXT_BOX, wrapLines } from '@/lib/jelajah/engine/sign-text';

export { SIGN_CANVAS };

export type SignContent =
  | { kind: 'prot'; title: string }
  | { kind: 'empty' }
  | { kind: 'board'; names: string[]; total: number };

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Stand sign (Phase 11, larger and fitted in Phase 12): every sign has the same size; the title is drawn
 * as large as fits in two lines and shortened with "…" otherwise (lib/jelajah/engine/sign-text.ts).
 */
export function createSignTexture(content: SignContent): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_CANVAS.width;
  canvas.height = SIGN_CANVAS.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { width: W, height: H } = SIGN_CANVAS;
    const weight = (px: number) => `700 ${px}px ${FONT}`;
    const measure = (text: string, px: number) => {
      ctx.font = weight(px);
      return ctx.measureText(text).width;
    };
    const filled = content.kind !== 'empty';
    roundRect(ctx, 6, 6, W - 12, H - 12, 28);
    ctx.fillStyle = filled ? '#FDF6E8' : '#EFE6D8';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = filled ? '#9E3C24' : '#B9A78E';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const drawLines = (lines: string[], px: number, lineH: number, centerY: number) => {
      ctx.font = weight(px);
      const top = centerY - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, k) => ctx.fillText(l, W / 2, top + k * lineH));
    };
    if (content.kind === 'prot') {
      ctx.fillStyle = '#2B211B';
      const fit = fitSignText(content.title, measure);
      drawLines(fit.lines, fit.fontPx, fit.lineHeightPx, H / 2 + 2);
    } else if (content.kind === 'empty') {
      ctx.fillStyle = '#6E5E4C';
      const fit = fitSignText('Segera hadir', measure);
      drawLines(fit.lines, fit.fontPx, fit.lineHeightPx, H / 2 + 2);
    } else {
      // Notice board: a heading and the first names, each on one shortened line.
      ctx.fillStyle = '#9E3C24';
      const heading = fitSignText(`PROT lainnya (${content.total})`, measure, { width: SIGN_TEXT_BOX.width, height: 60 }, 1, [44, 38]);
      drawLines(heading.lines, heading.fontPx, heading.lineHeightPx, 52);
      ctx.fillStyle = '#2B211B';
      const oneLine = (n: string) => wrapLines(n, SIGN_TEXT_BOX.width, 1, 34, measure).lines[0] ?? '';
      const names =
        content.total > 2
          ? [oneLine(content.names[0] ?? ''), `+${content.total - 1} lagi`]
          : content.names.slice(0, 2).map(oneLine);
      drawLines(names, 34, 42, 128);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Phase 22: text of the "Game segera hadir" board (neutral UI text), the size of GAME_SOON_CANVAS. Same colours as
 * an empty stand sign, so it reads as "not yet" rather than as a button.
 */
export function createNoticeTexture(text: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GAME_SOON_CANVAS.width;
  canvas.height = GAME_SOON_CANVAS.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { width: W, height: H } = GAME_SOON_CANVAS;
    roundRect(ctx, 6, 6, W - 12, H - 12, 24);
    ctx.fillStyle = '#F6EEDF';
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#B9A78E';
    ctx.stroke();
    ctx.fillStyle = '#5A4A3A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const measure = (t: string, px: number) => {
      ctx.font = `700 ${px}px ${FONT}`;
      return ctx.measureText(t).width;
    };
    const fit = fitSignText(text, measure, { width: W - 56, height: H - 40 }, 2, [56, 50, 44]);
    ctx.font = `700 ${fit.fontPx}px ${FONT}`;
    const top = H / 2 + 2 - ((fit.lines.length - 1) * fit.lineHeightPx) / 2;
    fit.lines.forEach((l, k) => ctx.fillText(l, W / 2, top + k * fit.lineHeightPx));
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Radial soft shadow (white = opaque; used as alphaMap). */
export function createBlobTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}
