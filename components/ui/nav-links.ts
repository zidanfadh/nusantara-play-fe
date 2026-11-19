/**
 * The app navbar's page links (Phase 18). One list for the desktop bar and the phone menu, so both always
 * show the same links. `prefetch: false` on heavy routes (the Jelajah map, the calendar and the menu would
 * otherwise be prefetched at idle on every page that shows the navbar).
 */
export interface NavLink {
  href: string;
  label: string;
  prefetch: boolean;
}

export const APP_NAV_LINKS: readonly NavLink[] = [
  { href: '/menu', label: 'Menu', prefetch: false },
  { href: '/calendar', label: 'Kalender', prefetch: false },
  { href: '/jelajah', label: 'Jelajah', prefetch: false },
  { href: '/main', label: 'Game', prefetch: true },
];

/**
 * The landing page's links to other pages (its other links are anchors on the page itself). Jelajah is
 * called "Tur Virtual" there, like the landing button "Mulai Tur Virtual".
 */
export const LANDING_PAGE_LINKS: readonly NavLink[] = [
  { href: '/jelajah', label: 'Tur Virtual', prefetch: false },
  { href: '/main', label: 'Game', prefetch: true },
];

/** Routes whose navbar link must never be prefetched (heavy pages). */
export const NO_PREFETCH_ROUTES = ['/jelajah', '/calendar', '/menu'] as const;

/**
 * True when `pathname` is the link's page or one of its sub-pages (`/jelajah/sumatera-selatan` keeps
 * "Jelajah" active), never for a mere prefix of the name (`/mainx` is not under `/main`).
 */
export function isActiveLink(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
