/**
 * Map colours, derived from the site tokens in app/globals.css:
 * primary #9E3C24 / dark #D65C2E (terracotta), secondary #1A5F7A / #2C7A9A (teal),
 * accent #D4A017 / #E5B028 (gold), muted #E6E2DC / #2C2A26, background #FDF9F3 / #121212.
 * Plain hex strings, so both the SVG and the three.js view can use them.
 */
export type ThemeMode = 'light' | 'dark';

export interface MapPalette {
  sea: string;
  seaDeep: string;
  /** Province without public PROT (not clickable). */
  muted: string;
  /** Province with few PROT … many PROT. */
  protLow: string;
  protHigh: string;
  /** Pilot province while it has no PROT yet. */
  pilot: string;
  outline: string;
  highlight: string;
  selected: string;
}

export const PALETTES: Record<ThemeMode, MapPalette> = {
  light: {
    sea: '#D3E6EA',
    seaDeep: '#A9CDD6',
    muted: '#E6E2DC',
    protLow: '#E7BE5A',
    protHigh: '#9E3C24',
    pilot: '#F3DDAA',
    outline: '#B9AE9C',
    highlight: '#FFF6E0',
    selected: '#1A5F7A',
  },
  dark: {
    sea: '#13262D',
    seaDeep: '#0C1A1F',
    muted: '#3A3732',
    protLow: '#C99A2E',
    protHigh: '#D65C2E',
    pilot: '#6B5428',
    outline: '#5A5248',
    highlight: '#FFE7B0',
    selected: '#2C7A9A',
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const k = Math.min(1, Math.max(0, t));
  return rgbToHex([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]);
}

export type ProvinceVisualState = 'idle' | 'hover' | 'selected';

/**
 * Fill colour of a province. More PROT → stronger colour (square-root scale, so one PROT is
 * already clearly coloured). Provinces without PROT are muted, except the pilot.
 */
export function provinceFill(
  palette: MapPalette,
  protCount: number,
  maxCount: number,
  isPilot: boolean,
  state: ProvinceVisualState = 'idle',
): string {
  let base: string;
  if (protCount > 0) {
    const t = maxCount <= 1 ? 0.35 : 0.35 + 0.65 * Math.sqrt((protCount - 1) / (maxCount - 1));
    base = mixHex(palette.protLow, palette.protHigh, t);
  } else if (isPilot) {
    base = palette.pilot;
  } else {
    return palette.muted;
  }
  if (state === 'hover') return mixHex(base, palette.highlight, 0.45);
  if (state === 'selected') return mixHex(base, palette.selected, 0.55);
  return base;
}
