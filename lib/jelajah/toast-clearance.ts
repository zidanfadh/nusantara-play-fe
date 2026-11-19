/**
 * Where the site-wide top-centre toasts sit on the Jelajah pages (Phase 13).
 *
 * The Toaster in app/layout.tsx is top-centre, 72 px from the top (below the 64 px sticky navbar) unless the
 * CSS variable `--toast-top` says otherwise. On the Jelajah pages the title bar, the "Tampilan" menu, the
 * reward HUD and the stand panel's close button sit near the top; elements marked `data-toast-avoid` are
 * measured and the toasts move just below the lowest one their horizontal span would cover.
 *
 * Pure geometry (unit-tested in tests/jelajah/toast-clearance.test.ts) plus two tiny DOM helpers.
 */

/** Default distance of the toasts from the top: the 64 px navbar (h-16) plus an 8 px gap. */
export const TOAST_TOP_DEFAULT = 72;
/** Gap between an avoided element and the toast. */
export const TOAST_GAP = 8;
/** sonner's toast width on wide screens (--width). */
export const TOAST_WIDTH = 356;
/** sonner switches to full-width toasts at max-width 600 px. */
export const TOAST_MOBILE_MAX_WIDTH = 600;
/** sonner's default mobile side offset (16 px each side). */
export const TOAST_MOBILE_INSET = 16;
/** A two-line toast with a description (measured 74 to 92 px at 390 px width). */
export const TOAST_HEIGHT_ESTIMATE = 96;
/** The CSS variable the Toaster reads. */
export const TOAST_TOP_VAR = '--toast-top';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Horizontal span of a top-centre toast in a viewport of the given width. */
export function toastSpan(viewportWidth: number): [number, number] {
  if (viewportWidth <= TOAST_MOBILE_MAX_WIDTH) return [TOAST_MOBILE_INSET, viewportWidth - TOAST_MOBILE_INSET];
  const half = TOAST_WIDTH / 2;
  return [viewportWidth / 2 - half, viewportWidth / 2 + half];
}

const isEmpty = (b: Box) => !(b.right > b.left && b.bottom > b.top);

/**
 * Top offset (px) at which a toast covers none of the given boxes: the default, or just below the lowest box
 * that the toast would overlap there (repeated, so a stack of overlays is cleared). Boxes of hidden elements
 * (zero size) are ignored.
 */
export function toastTop(
  viewportWidth: number,
  boxes: readonly Box[],
  base = TOAST_TOP_DEFAULT,
  toastHeight = TOAST_HEIGHT_ESTIMATE,
): number {
  const [left, right] = toastSpan(viewportWidth);
  const inSpan = boxes.filter((b) => !isEmpty(b) && b.left < right && left < b.right);
  let top = base;
  for (let i = 0; i <= inSpan.length; i += 1) {
    const hit = inSpan.filter((b) => b.top < top + toastHeight && top < b.bottom);
    if (hit.length === 0) return Math.round(top);
    top = Math.max(...hit.map((b) => b.bottom)) + TOAST_GAP;
  }
  return Math.round(top);
}

/** Measures every `[data-toast-avoid]` element and moves the toasts clear of them (browser only). */
export function placeToasts(): void {
  if (typeof document === 'undefined') return;
  const boxes = [...document.querySelectorAll('[data-toast-avoid]')].map((el) => el.getBoundingClientRect());
  document.documentElement.style.setProperty(TOAST_TOP_VAR, `${toastTop(window.innerWidth, boxes)}px`);
}

/** Back to the site default (leaving a Jelajah page). */
export function resetToastPlacement(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.removeProperty(TOAST_TOP_VAR);
}
