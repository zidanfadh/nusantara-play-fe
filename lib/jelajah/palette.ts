/**
 * Map colours (Phase 28: the low-poly "paper" map from the design team's reference, see the Phase 28 report 8.2).
 * Light theme = cream paper (#FEF3E2 range) with green islands on dark-brown earth sides; dark theme = brown paper
 * (#2A1A0E range) with the same greens a little deeper and lighter earth sides, so the slabs still read.
 * States in the brand palette: hover amber (#F4AE52), selected terracotta (#D4621A).
 * Plain hex strings, so the SVG (Map2D, bumper) and the three.js view use the same values.
 */
export type ThemeMode = 'light' | 'dark';

export interface MapPalette {
  /** The paper "sea" (centre) and its edge (vignette, page background around the map). */
  paper: string;
  paperEdge: string;
  /** Paper grain specks. */
  grain: string;
  /** Soft drop shadow under the islands. */
  shadow: string;
  /** Province without public PROT (not clickable). */
  muted: string;
  /** Province with few PROT … many PROT. */
  protLow: string;
  protHigh: string;
  /** Enterable province while it has no PROT yet. */
  pilot: string;
  /** Greens mixed into the top facets (patchwork). */
  facets: readonly string[];
  /** Earth side walls: top edge and foot. */
  earthTop: string;
  earthBottom: string;
  /** Province borders: subtle darker seams. */
  outline: string;
  /** Hover tint, hover rim (amber) and the selected tint (terracotta). */
  highlight: string;
  rim: string;
  selected: string;
  /** Mountains, volcano craters, smoke, rivers and lakes, ships. */
  rockLight: string;
  rockDark: string;
  crater: string;
  smoke: string;
  water: string;
  hull: string;
  sail: string;
}

export const PALETTES: Record<ThemeMode, MapPalette> = {
  light: {
    paper: '#FDF0DC',
    paperEdge: '#F0DDC3',
    grain: '#B89C76',
    shadow: '#7A5C3E',
    muted: '#9DB668',
    protLow: '#6A9E38',
    protHigh: '#2C6820',
    pilot: '#CFD07A',
    facets: ['#4C8832', '#6D9347', '#8CA751', '#C9C772'],
    earthTop: '#6B4B31',
    earthBottom: '#2A1A0E',
    outline: '#5F7A3C',
    highlight: '#F7C27A',
    rim: '#F4AE52',
    selected: '#D4621A',
    rockLight: '#CDBBA2',
    rockDark: '#6E5A48',
    crater: '#4A3A2E',
    smoke: '#EEE6DA',
    water: '#5A9A96',
    hull: '#5A4337',
    sail: '#F6EBDA',
  },
  dark: {
    paper: '#3A281B',
    paperEdge: '#2A1A0E',
    grain: '#6B5038',
    shadow: '#100904',
    muted: '#7E9858',
    protLow: '#5E9132',
    protHigh: '#2A6220',
    pilot: '#B9BA66',
    facets: ['#3F7A2A', '#5C8440', '#7A9848', '#ADAE62'],
    earthTop: '#9A7048',
    earthBottom: '#4A3524',
    outline: '#3F5A28',
    highlight: '#F7C27A',
    rim: '#F4AE52',
    selected: '#E06A24',
    rockLight: '#B8A68E',
    rockDark: '#5E4C3C',
    crater: '#3A2C22',
    smoke: '#D8CEC0',
    water: '#4F8E8A',
    hull: '#2A1A0E',
    sail: '#EADCC6',
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

/** `#rrggbb` + alpha → `rgba(...)` (canvas and SVG). */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export type ProvinceVisualState = 'idle' | 'hover' | 'selected';

/** How strongly the hover / selected tint covers the base colour (the lift and the rim carry the state too). */
export const HOVER_TINT = 0.4;
export const SELECTED_TINT = 0.55;

/**
 * Fill colour of a province. More PROT → deeper green (square-root scale, so one PROT is already clearly coloured).
 * Provinces without PROT are muted (pale sage), except enterable ones (Phase 22; before: the pilot), which get the
 * soft `pilot` yellow-green.
 */
export function provinceFill(
  palette: MapPalette,
  protCount: number,
  maxCount: number,
  enterable: boolean,
  state: ProvinceVisualState = 'idle',
): string {
  let base: string;
  if (protCount > 0) {
    const t = maxCount <= 1 ? 0.35 : 0.35 + 0.65 * Math.sqrt((protCount - 1) / (maxCount - 1));
    base = mixHex(palette.protLow, palette.protHigh, t);
  } else if (enterable) {
    base = palette.pilot;
  } else {
    return palette.muted;
  }
  if (state === 'hover') return mixHex(base, palette.highlight, HOVER_TINT);
  if (state === 'selected') return mixHex(base, palette.selected, SELECTED_TINT);
  return base;
}

/** Weight of the facet greens in a top facet (the rest is the province's state colour). */
export const FACET_MIX = 0.42;

/** The top-facet colours of a province: its fill mixed with each facet green (muted provinces vary less). */
export function facetColours(palette: MapPalette, fill: string, muted: boolean): string[] {
  return palette.facets.map((f) => mixHex(fill, f, muted ? FACET_MIX * 0.85 : FACET_MIX));
}
