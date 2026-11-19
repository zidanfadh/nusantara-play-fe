/**
 * Links into and out of the gasing page (Phase 20). The back link reuses congklak's allowlist
 * (`jelajah` → "Kembali ke peta", `jelajah-<province with a game pavilion>` → "Kembali ke desa"), so it is
 * never an open redirect.
 */
export { backLinkFor, type BackLink } from '../congklak/from-link';

export const GASING_PATH = '/main/gasing';

export function gasingHref(from?: string): string {
  return from ? `${GASING_PATH}?from=${encodeURIComponent(from)}` : GASING_PATH;
}
