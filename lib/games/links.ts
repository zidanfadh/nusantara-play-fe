/**
 * Links between Jelajah province scenes and the hosted games (Phase 22; Phase 17 had one game).
 *
 * - A scene's game pavilion names its game (`PavilionDef.game`); the label and the link come from here.
 * - `from=jelajah-<slug>` on a game page is allowlisted PER GAME: only the provinces whose pavilion opens that game
 *   get "Kembali ke desa"; `from=jelajah` gives "Kembali ke peta" (the intro bumper on /jelajah). Anything else gives
 *   no back link, so it is never an open redirect.
 *
 * Pure TypeScript, no React, no network (games record nothing).
 */

export type JelajahGame = 'congklak' | 'gasing' | 'egrang';

/** Phase 23: egrang has two variants; a pavilion names its variant and the link preselects it (`?varian=`). */
export type GameVariant = 'bambu' | 'batok';

export const JELAJAH_GAMES: readonly JelajahGame[] = ['congklak', 'gasing', 'egrang'];

export const GAME_PATHS: Readonly<Record<JelajahGame, string>> = {
  congklak: '/main/congklak',
  gasing: '/main/gasing',
  egrang: '/main/egrang',
};

/** Neutral texts of a game pavilion: no claim about where a game comes from. */
export const GAME_TEXTS: Readonly<Record<JelajahGame, { play: string; description: string }>> = {
  congklak: {
    play: 'Main Congklak',
    description: 'Main congklak langsung di browser, lawan komputer atau berdua.',
  },
  gasing: {
    play: 'Main Gasing',
    description: 'Main gasing langsung di browser, lawan komputer: Uri atau Pangkah.',
  },
  egrang: {
    play: 'Main Egrang',
    description: 'Balap egrang langsung di browser melawan komputer: egrang bambu atau egrang batok.',
  },
};

/**
 * Phase 25 (Phase 23 review): a pavilion that opens one variant names it, so the button says which race it starts.
 * The intro bumper keeps the plain game label (`GAME_TEXTS[game].play`, "Main Egrang").
 */
export const VARIANT_PLAY_LABELS: Readonly<Record<GameVariant, string>> = {
  bambu: 'Main Egrang Bambu',
  batok: 'Main Egrang Batok',
};

/** The "Main …" label of a pavilion: the variant's label for egrang with a variant, otherwise the game's. */
export function gamePlayLabel(game: JelajahGame, variant?: GameVariant): string {
  return game === 'egrang' && variant ? VARIANT_PLAY_LABELS[variant] : GAME_TEXTS[game].play;
}

/** Shown in provinces that have PROT but no playable game yet (a sign in the scene, a card on the 2d tier). */
export const GAME_SOON_TITLE = 'Game segera hadir';
export const GAME_SOON_DESCRIPTION = 'Permainan untuk desa ini sedang disiapkan.';

/** Province scenes whose pavilion opens each game. Kept equal to the scene data by a test. */
export const GAME_LINK_PROVINCES: Readonly<Record<JelajahGame, readonly string[]>> = {
  congklak: ['sumatera-selatan'],
  gasing: ['kepulauan-riau'],
  egrang: ['jawa-tengah', 'sulawesi-selatan'],
};

export interface BackLink {
  href: string;
  label: string;
}

export function gameHref(game: JelajahGame, from?: string, variant?: GameVariant): string {
  const params: string[] = [];
  if (variant && game === 'egrang') params.push(`varian=${variant}`);
  if (from) params.push(`from=${encodeURIComponent(from)}`);
  return params.length ? `${GAME_PATHS[game]}?${params.join('&')}` : GAME_PATHS[game];
}

/** The "back" link of a game page from its `from` query parameter (allowlisted, see above). */
export function backLinkFor(from: string | null | undefined, game: JelajahGame): BackLink | null {
  if (!from) return null;
  if (from === 'jelajah') return { href: '/jelajah', label: 'Kembali ke peta' };
  const m = /^jelajah-([a-z0-9-]+)$/.exec(from);
  if (m && GAME_LINK_PROVINCES[game].includes(m[1])) return { href: `/jelajah/${m[1]}`, label: 'Kembali ke desa' };
  return null;
}
