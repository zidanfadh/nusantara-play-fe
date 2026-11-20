import { describe, expect, it } from 'vitest';
import {
  TOAST_GAP,
  TOAST_HEIGHT_ESTIMATE,
  TOAST_TOP_DEFAULT,
  toastSpan,
  toastTop,
  type Box,
} from '@/lib/jelajah/toast-clearance';

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });

// Measured on the scene at 390x844 (Phase 13 probe): title bar, Tampilan button, HUD; panel close at the bottom.
const PHONE_TITLE = box(12, 77, 237, 115);
const PHONE_TIER = box(282, 79, 378, 111);
const PHONE_HUD = box(12, 133, 244, 221);
const PHONE_CLOSE = box(341, 551, 373, 583);

describe('toastSpan (sonner geometry)', () => {
  it('phones (<= 600 px): full width minus 16 px each side', () => {
    expect(toastSpan(390)).toEqual([16, 374]);
    expect(toastSpan(600)).toEqual([16, 584]);
  });
  it('wider screens: 356 px centred', () => {
    expect(toastSpan(1440)).toEqual([542, 898]);
  });
});

describe('toastTop', () => {
  it('no overlays: below the 64 px navbar', () => {
    expect(TOAST_TOP_DEFAULT).toBe(72);
    expect(toastTop(390, [])).toBe(72);
    expect(toastTop(1440, [])).toBe(72);
  });

  it('phone scene: below the HUD, clear of the title bar, the Tampilan button and the HUD', () => {
    const top = toastTop(390, [PHONE_TITLE, PHONE_TIER, PHONE_HUD, PHONE_CLOSE]);
    expect(top).toBe(PHONE_HUD.bottom + TOAST_GAP);
    expect(top + TOAST_HEIGHT_ESTIMATE).toBeLessThan(PHONE_CLOSE.top);
  });

  it('desktop: overlays on the left and right are outside the centred toast, so it stays at the default', () => {
    const title = box(12, 77, 330, 125);
    const hud = box(12, 148, 244, 236);
    const closeButton = box(1380, 92, 1412, 124);
    expect(toastTop(1440, [title, hud, closeButton])).toBe(72);
  });

  it('a box below the toast does not move it', () => {
    expect(toastTop(1440, [box(500, 400, 900, 460)])).toBe(72);
  });

  it('stacked overlays are cleared one after the other', () => {
    const a = box(0, 80, 400, 120);
    const b = box(0, 150, 400, 200); // in reach once the toast moved below a
    expect(toastTop(390, [b, a])).toBe(200 + TOAST_GAP);
  });

  it('hidden (zero-size) elements are ignored', () => {
    expect(toastTop(390, [box(0, 0, 0, 0), box(20, 100, 20, 300)])).toBe(72);
  });
});

describe('landscape phone with the PROT panel open (Phase 23, Phase 22 observation)', () => {
  // 844x390: the panel is the right-hand side panel (md:), its header (title + close) inside the toast's span.
  const TITLE = box(12, 77, 237, 115);
  const PANEL_HEADER = box(448, 76, 832, 152);
  const PANEL_CLOSE = box(788, 88, 820, 120);

  it('the close button alone is outside the centred toast, so marking only it was not enough', () => {
    expect(toastTop(844, [TITLE, PANEL_CLOSE])).toBe(TOAST_TOP_DEFAULT);
  });

  it('with the whole header marked, the toast moves below the title and the close button, still on screen', () => {
    const top = toastTop(844, [TITLE, PANEL_HEADER, PANEL_CLOSE]);
    expect(top).toBe(PANEL_HEADER.bottom + TOAST_GAP);
    expect(top).toBeGreaterThan(PANEL_CLOSE.bottom);
    expect(top + TOAST_HEIGHT_ESTIMATE).toBeLessThanOrEqual(390);
  });
});
