/**
 * The logotype (Phase 27, design team's "Konsep Visual" page 2): `SITE_NAME` set in Cinzel Decorative as LIVE text
 * (selectable, translatable, read by screen readers as the name). The text comes only from `lib/brand.ts`.
 *
 * Variants (PDF page 2):
 * - `gradient`: vertical gradient #D4621A (top) → #F4AE52 (bottom), for dark backgrounds only. Through
 *   `background-clip: text`; without support (and in forced-colors mode) it falls back to solid amber / CanvasText.
 * - `dark`: solid #2A1A0E, for light backgrounds.
 * - `light`: white, for black or very dark photos.
 * - `auto` (default): `dark` in the light theme, `gradient` in the dark theme (navbars, footer, auth pages).
 * Styles: `.nl-logotype*` in `app/globals.css`.
 */
import { SITE_NAME } from '@/lib/brand';

export type LogotypeVariant = 'gradient' | 'dark' | 'light' | 'auto';

const VARIANT_CLASS: Record<LogotypeVariant, string> = {
  gradient: 'nl-logotype-gradient',
  dark: 'nl-logotype-dark',
  light: 'nl-logotype-light',
  auto: 'nl-logotype-auto',
};

type Tag = 'span' | 'h1' | 'p' | 'div';

export function Logotype({
  variant = 'auto',
  as: As = 'span',
  className = '',
  id,
}: {
  variant?: LogotypeVariant;
  as?: Tag;
  className?: string;
  id?: string;
}) {
  return (
    <As id={id} data-logotype={variant} className={`nl-logotype ${VARIANT_CLASS[variant]} ${className}`}>
      {SITE_NAME}
    </As>
  );
}
