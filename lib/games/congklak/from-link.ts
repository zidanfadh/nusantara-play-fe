/**
 * The "back" link of the congklak page (Phase 17), from the `from` query parameter. Only known values
 * produce a link (no open redirect): `jelajah-<slug>` of an enterable Jelajah province → "Kembali ke desa"
 * (the pavilion in that province's scene), `jelajah` → "Kembali ke peta" (the intro bumper on /jelajah).
 */

export interface BackLink {
  href: string;
  label: string;
}

/** Province scenes that link to the game (their pavilion). Kept in sync with the scene data by a test. */
export const GAME_LINK_PROVINCES: readonly string[] = ['sumatera-selatan'];

export function congklakHref(from?: string): string {
  return from ? `/main/congklak?from=${encodeURIComponent(from)}` : '/main/congklak';
}

export function backLinkFor(from: string | null | undefined): BackLink | null {
  if (!from) return null;
  if (from === 'jelajah') return { href: '/jelajah', label: 'Kembali ke peta' };
  const m = /^jelajah-([a-z0-9-]+)$/.exec(from);
  if (m && GAME_LINK_PROVINCES.includes(m[1])) return { href: `/jelajah/${m[1]}`, label: 'Kembali ke desa' };
  return null;
}
