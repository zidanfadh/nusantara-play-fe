/**
 * Links into and out of the gasing page (Phase 20). Since Phase 22 the back link is allowlisted for gasing's own
 * provinces (`lib/games/links.ts`): `jelajah-<province whose pavilion opens gasing>` → "Kembali ke desa",
 * `jelajah` → "Kembali ke peta"; never an open redirect.
 */
import { backLinkFor as gameBackLink, GAME_PATHS, gameHref, type BackLink } from '../links';

export type { BackLink };

export const GASING_PATH = GAME_PATHS.gasing;

export function gasingHref(from?: string): string {
  return gameHref('gasing', from);
}

export function backLinkFor(from: string | null | undefined): BackLink | null {
  return gameBackLink(from, 'gasing');
}
