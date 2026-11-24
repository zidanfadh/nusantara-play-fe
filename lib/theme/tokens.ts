/**
 * Visual identity tokens (Phase 27, from the design team's "Konsep Visual", docs/design/).
 *
 * THE source of the values is `app/globals.css` (`--nl-*` variables on `:root` and `:root.dark`, exposed to Tailwind
 * through `@theme inline`). This file mirrors them so tests can compute every documented contrast pair;
 * `tests/theme/tokens.test.ts` fails when the two differ. Change a colour in both places.
 *
 * Rules (also in CLAUDE.md "Visual identity (Phase 27)"):
 * - The four brand colours are exact and used for fills, large text and decoration.
 * - Small text never uses #D4621A or #F4AE52 on cream: use `primary-text` (#9A4310) instead.
 * - Buttons fill with `primary` (light #B4500F, dark #F4AE52) and write with `primary-foreground`.
 */

/** The four brand colours (exact, from the PDF page 3 and the palette PNG). */
export const BRAND = {
  cream: '#FEF3E2',
  amber: '#F4AE52',
  terracotta: '#D4621A',
  brown: '#2A1A0E',
} as const;

/** Shades derived from the brand colours where the exact colour fails WCAG AA for small text or UI marks. */
export const DERIVED = {
  /** Interactive fill (buttons) in the light theme: cream text 4.67:1. */
  terracotta600: '#B4500F',
  /** Terracotta text and links on cream (6.01:1), button hover. */
  terracotta700: '#9A4310',
  /** Amber focus ring / UI marks on cream (4.52:1). */
  amber700: '#A3600C',
  /** Hover of the amber primary in the dark theme. */
  amber300: '#F7C27A',
} as const;

export type ThemeName = 'light' | 'dark';

export const TOKEN_NAMES = [
  'background',
  'surface',
  'surface-raised',
  'muted',
  'text',
  'text-muted',
  'primary',
  'primary-foreground',
  'primary-hover',
  'primary-text',
  'primary-soft',
  'primary-soft-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'border',
  'input',
  'focus-ring',
  'ornament',
  'success',
  'success-soft',
  'success-soft-foreground',
  'warning',
  'warning-soft',
  'warning-soft-foreground',
  'danger',
  'danger-soft',
  'danger-soft-foreground',
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

export const TOKENS: Record<ThemeName, Record<TokenName, string>> = {
  light: {
    background: BRAND.cream,
    surface: '#FFFAF2',
    'surface-raised': '#FFFFFF',
    muted: '#F6E4C6',
    text: BRAND.brown,
    'text-muted': '#6B4E36',
    primary: DERIVED.terracotta600,
    'primary-foreground': BRAND.cream,
    'primary-hover': DERIVED.terracotta700,
    'primary-text': DERIVED.terracotta700,
    'primary-soft': '#FBE0CC',
    'primary-soft-foreground': '#7A3410',
    secondary: BRAND.brown,
    'secondary-foreground': BRAND.cream,
    accent: BRAND.amber,
    'accent-foreground': BRAND.brown,
    border: '#E8CFAB',
    input: '#8F6B4C',
    'focus-ring': DERIVED.amber700,
    ornament: BRAND.terracotta,
    success: '#2F6B2F',
    'success-soft': '#E3F0D8',
    'success-soft-foreground': '#2F6B2F',
    warning: '#8A5A00',
    'warning-soft': '#FCEBC4',
    'warning-soft-foreground': '#8A5A00',
    danger: '#B42318',
    'danger-soft': '#FBE3DA',
    'danger-soft-foreground': '#B42318',
  },
  dark: {
    background: BRAND.brown,
    surface: '#36241A',
    'surface-raised': '#42301F',
    muted: '#4A3524',
    text: BRAND.cream,
    'text-muted': '#D9C3A5',
    primary: BRAND.amber,
    'primary-foreground': BRAND.brown,
    'primary-hover': DERIVED.amber300,
    'primary-text': BRAND.amber,
    'primary-soft': '#5A2E12',
    'primary-soft-foreground': '#FBD9B8',
    secondary: BRAND.cream,
    'secondary-foreground': BRAND.brown,
    accent: BRAND.amber,
    'accent-foreground': BRAND.brown,
    border: '#5A4430',
    input: '#A08060',
    'focus-ring': BRAND.amber,
    ornament: BRAND.amber,
    success: '#9CD49C',
    'success-soft': '#22351C',
    'success-soft-foreground': '#B4E0B0',
    warning: '#F6C873',
    'warning-soft': '#3F2E10',
    'warning-soft-foreground': '#F6C873',
    danger: '#FF9C7A',
    'danger-soft': '#4A2218',
    'danger-soft-foreground': '#FFB4A0',
  },
};

/** Minimum contrast: 4.5 body text, 3 large text and UI components (WCAG 2.x AA). */
export type ContrastLevel = 4.5 | 3;

/** Every text/background pair the site uses, per theme. Checked by `tests/theme/tokens.test.ts`. */
export const CONTRAST_PAIRS: ReadonlyArray<{ fg: TokenName; bg: TokenName; min: ContrastLevel }> = [
  { fg: 'text', bg: 'background', min: 4.5 },
  { fg: 'text', bg: 'surface', min: 4.5 },
  { fg: 'text', bg: 'surface-raised', min: 4.5 },
  { fg: 'text', bg: 'muted', min: 4.5 },
  { fg: 'text-muted', bg: 'background', min: 4.5 },
  { fg: 'text-muted', bg: 'surface', min: 4.5 },
  { fg: 'text-muted', bg: 'surface-raised', min: 4.5 },
  { fg: 'text-muted', bg: 'muted', min: 4.5 },
  { fg: 'primary-foreground', bg: 'primary', min: 4.5 },
  { fg: 'primary-foreground', bg: 'primary-hover', min: 4.5 },
  { fg: 'primary-text', bg: 'background', min: 4.5 },
  { fg: 'primary-text', bg: 'surface', min: 4.5 },
  { fg: 'primary-text', bg: 'surface-raised', min: 4.5 },
  { fg: 'primary-text', bg: 'muted', min: 4.5 },
  { fg: 'primary-soft-foreground', bg: 'primary-soft', min: 4.5 },
  { fg: 'secondary-foreground', bg: 'secondary', min: 4.5 },
  { fg: 'accent-foreground', bg: 'accent', min: 4.5 },
  { fg: 'success', bg: 'background', min: 4.5 },
  { fg: 'success', bg: 'surface', min: 4.5 },
  { fg: 'success-soft-foreground', bg: 'success-soft', min: 4.5 },
  { fg: 'warning', bg: 'background', min: 4.5 },
  { fg: 'warning', bg: 'surface', min: 4.5 },
  { fg: 'warning-soft-foreground', bg: 'warning-soft', min: 4.5 },
  { fg: 'danger', bg: 'background', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  { fg: 'danger-soft-foreground', bg: 'danger-soft', min: 4.5 },
  // UI components and focus indicators (3:1).
  { fg: 'focus-ring', bg: 'background', min: 3 },
  { fg: 'focus-ring', bg: 'surface', min: 3 },
  { fg: 'focus-ring', bg: 'muted', min: 3 },
  { fg: 'input', bg: 'background', min: 3 },
  { fg: 'input', bg: 'surface', min: 3 },
  { fg: 'input', bg: 'surface-raised', min: 3 },
  { fg: 'primary', bg: 'background', min: 3 },
  { fg: 'primary', bg: 'surface', min: 3 },
  // Decoration as large marks (ornament outlines, the logotype on its own background).
  { fg: 'ornament', bg: 'background', min: 3 },
];

/** The logotype versions (PDF page 2): gradient on dark, dark on light, white on black. */
export const LOGOTYPE = {
  gradient: { from: BRAND.terracotta, to: BRAND.amber, direction: 'to bottom', on: BRAND.brown },
  dark: { color: BRAND.brown, on: BRAND.cream },
  light: { color: '#FFFFFF', on: '#000000' },
} as const;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2.x contrast ratio of two #RRGGBB colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
