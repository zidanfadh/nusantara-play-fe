/** Games hosted on the site (Phase 17). The /main page lists them; only congklak so far. */

export interface GameEntry {
  slug: string;
  title: string;
  description: string;
  href: string;
}

export const GAMES: readonly GameEntry[] = [
  {
    slug: 'congklak',
    title: 'Congklak',
    description: 'Permainan biji dan lubang untuk dua pemain. Lawan komputer atau main berdua di satu perangkat.',
    href: '/main/congklak',
  },
];
