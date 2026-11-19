/** Games hosted on the site (Phase 17; gasing since Phase 20). The /main page lists them in this order. */

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
  {
    slug: 'gasing',
    title: 'Gasing',
    description: 'Lempar gasing dan adu putaran terlama (Uri) atau hantam gasing lawan (Pangkah). Lawan komputer.',
    href: '/main/gasing',
  },
];
