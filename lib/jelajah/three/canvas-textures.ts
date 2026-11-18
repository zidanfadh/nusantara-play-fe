/**
 * Cheap canvas textures of the province scene (Phase 11): the stand signs (one sprite each, not drei
 * Html) and the soft blob shadow. Text comes only from PROT data or neutral UI strings and is drawn as
 * plain text.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';

export const SIGN_CANVAS = { width: 512, height: 208 } as const;

export type SignContent =
  | { kind: 'prot'; title: string }
  | { kind: 'empty' }
  | { kind: 'board'; names: string[]; total: number };

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Splits `text` into at most `maxLines` lines that fit `maxWidth`; the last line ends with … if cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const ellipsize = (s: string) => {
    let t = s;
    while (t && !fits(`${t}…`)) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || fits(next)) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const kept = lines.slice(0, maxLines).map((l) => (fits(l) ? l : ellipsize(l)));
  if (lines.length > maxLines) kept[maxLines - 1] = ellipsize(`${kept[maxLines - 1]} `);
  return kept;
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

export function createSignTexture(content: SignContent): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_CANVAS.width;
  canvas.height = SIGN_CANVAS.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { width: W, height: H } = SIGN_CANVAS;
    const filled = content.kind !== 'empty';
    roundRect(ctx, 8, 8, W - 16, H - 16, 26);
    ctx.fillStyle = filled ? '#FDF6E8' : '#EFE6D8';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = filled ? '#9E3C24' : '#B9A78E';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (content.kind === 'prot') {
      ctx.fillStyle = '#2B211B';
      ctx.font = `700 46px ${FONT}`;
      const lines = wrap(ctx, content.title, W - 70, 2);
      const lineH = 54;
      const top = H / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, k) => ctx.fillText(l, W / 2, top + k * lineH));
    } else if (content.kind === 'empty') {
      ctx.fillStyle = '#7A6A58';
      ctx.font = `700 48px ${FONT}`;
      ctx.fillText('Segera hadir', W / 2, H / 2);
    } else {
      ctx.fillStyle = '#9E3C24';
      ctx.font = `700 34px ${FONT}`;
      ctx.fillText(`PROT lainnya (${content.total})`, W / 2, 46);
      ctx.fillStyle = '#2B211B';
      ctx.font = `500 28px ${FONT}`;
      const shown = content.names.slice(0, 3);
      shown.forEach((name, k) => ctx.fillText(wrap(ctx, name, W - 80, 1)[0] ?? '', W / 2, 92 + k * 34));
      if (content.total > shown.length) {
        ctx.fillStyle = '#7A6A58';
        ctx.fillText(`+${content.total - shown.length} lagi`, W / 2, 92 + shown.length * 34);
      }
    }
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
