/**
 * Links into and out of the egrang page (Phase 23), through the shared allowlist in `lib/games/links.ts`:
 * `jelajah-<province whose pavilion opens egrang>` → "Kembali ke desa", `jelajah` → "Kembali ke peta";
 * never an open redirect.
 */
import { backLinkFor as gameBackLink, type BackLink } from '../links';

export type { BackLink };

export function backLinkFor(from: string | null | undefined): BackLink | null {
  return gameBackLink(from, 'egrang');
}
