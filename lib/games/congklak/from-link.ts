/**
 * The links into and out of the congklak page (Phase 17). Since Phase 22 the rules live in `lib/games/links.ts`
 * (shared by every game, allowlisted per game): `jelajah-<slug>` of a province whose pavilion opens congklak →
 * "Kembali ke desa", `jelajah` → "Kembali ke peta" (the intro bumper on /jelajah).
 */
import { backLinkFor as gameBackLink, gameHref, type BackLink } from '../links';

export type { BackLink };

export function congklakHref(from?: string): string {
  return gameHref('congklak', from);
}

export function backLinkFor(from: string | null | undefined): BackLink | null {
  return gameBackLink(from, 'congklak');
}
