/**
 * Stand sign layout and text fitting (Phase 12). Pure, no DOM and no three.js: the canvas code passes a
 * `measure` function, the tests pass a fake one (tests/jelajah/sign-text.test.ts).
 *
 * Every sign has the same size. Text is drawn as large as fits; text that still does not fit in
 * SIGN_MAX_LINES lines is shortened with an ellipsis (the full name is in the stand panel).
 */
import { STAND_ROOF_TOP } from './collision';

/** Sign size in the scene (metres) and of its canvas (pixels); same aspect ratio. */
export const SIGN_WIDTH = 3.8;
export const SIGN_CANVAS = { width: 512, height: 200 } as const;
export const SIGN_HEIGHT = (SIGN_WIDTH * SIGN_CANVAS.height) / SIGN_CANVAS.width;
/** Centre of the sign above the ground (it floats just above the stand roof). */
export const SIGN_CENTER_Y = STAND_ROOF_TOP + 0.3 + SIGN_HEIGHT / 2;

/** Text box inside the sign canvas (pixels): border and padding taken off. */
export const SIGN_TEXT_BOX = { width: SIGN_CANVAS.width - 64, height: SIGN_CANVAS.height - 40 } as const;
export const SIGN_MAX_LINES = 2;
/** Font sizes tried from large to small (pixels on the 512 px canvas). */
export const SIGN_FONT_SIZES = [64, 56, 48] as const;
export const SIGN_LINE_HEIGHT = 1.12;

export type Measure = (text: string, fontPx: number) => number;

const ELLIPSIS = '…';

/** Shortens `text` until `text…` fits `maxWidth`. */
export function ellipsize(text: string, maxWidth: number, fontPx: number, measure: Measure): string {
  let t = text.trimEnd();
  while (t && measure(`${t}${ELLIPSIS}`, fontPx) > maxWidth) t = t.slice(0, -1).trimEnd();
  return `${t}${ELLIPSIS}`;
}

/**
 * Greedy word wrap into at most `maxLines` lines of at most `maxWidth`. `cut` is true when anything was
 * shortened (a word longer than a line, or more lines than allowed); every returned line fits.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontPx: number,
  measure: Measure,
): { lines: string[]; cut: boolean } {
  const fits = (s: string) => measure(s, fontPx) <= maxWidth;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || fits(next)) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  let cut = false;
  const kept = lines.slice(0, maxLines).map((l) => {
    if (fits(l)) return l;
    cut = true;
    return ellipsize(l, maxWidth, fontPx, measure);
  });
  if (lines.length > maxLines) {
    cut = true;
    // More text follows: the last kept line ends with "…" (ellipsize always returns a line that fits).
    kept[maxLines - 1] = ellipsize(lines[maxLines - 1], maxWidth, fontPx, measure);
  }
  return { lines: kept, cut };
}

export interface FittedSignText {
  lines: string[];
  fontPx: number;
  lineHeightPx: number;
  cut: boolean;
}

/** Largest font size at which the whole title fits; otherwise the smallest size, shortened with "…". */
export function fitSignText(
  text: string,
  measure: Measure,
  box: { width: number; height: number } = SIGN_TEXT_BOX,
  maxLines = SIGN_MAX_LINES,
  sizes: readonly number[] = SIGN_FONT_SIZES,
): FittedSignText {
  const clean = text.replace(/\s+/g, ' ').trim() || 'Tanpa nama';
  let last: FittedSignText | null = null;
  for (const fontPx of sizes) {
    const lineHeightPx = Math.round(fontPx * SIGN_LINE_HEIGHT);
    const linesThatFit = Math.max(1, Math.min(maxLines, Math.floor(box.height / lineHeightPx)));
    const { lines, cut } = wrapLines(clean, box.width, linesThatFit, fontPx, measure);
    last = { lines, fontPx, lineHeightPx, cut };
    if (!cut) return last;
  }
  return last as FittedSignText;
}
