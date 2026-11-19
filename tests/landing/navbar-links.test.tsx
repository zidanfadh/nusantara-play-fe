import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  APP_NAV_LINKS,
  LANDING_PAGE_LINKS,
  NO_PREFETCH_ROUTES,
  isActiveLink,
} from '@/components/ui/nav-links';

let mockPathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
vi.mock('@/components/ui/UserNav', () => ({ UserNav: () => <span data-user-nav="" /> }));
vi.mock('@/components/ui/AnimatedThemeToggler', () => ({ AnimatedThemeToggler: () => <span /> }));

const { AppNavbar } = await import('@/components/ui/AppNavbar');

describe('navbar links (Phase 18)', () => {
  it('the app navbar lists Menu, Kalender, Jelajah and Game', () => {
    expect(APP_NAV_LINKS.map((l) => [l.label, l.href])).toEqual([
      ['Menu', '/menu'],
      ['Kalender', '/calendar'],
      ['Jelajah', '/jelajah'],
      ['Game', '/main'],
    ]);
  });

  it('the landing navbar links Tur Virtual to /jelajah and Game to /main', () => {
    expect(LANDING_PAGE_LINKS.map((l) => [l.label, l.href])).toEqual([
      ['Tur Virtual', '/jelajah'],
      ['Game', '/main'],
    ]);
  });

  it('never prefetches the heavy routes', () => {
    for (const link of [...APP_NAV_LINKS, ...LANDING_PAGE_LINKS]) {
      if ((NO_PREFETCH_ROUTES as readonly string[]).includes(link.href)) expect(link.prefetch).toBe(false);
    }
  });

  it.each([
    ['/jelajah', '/jelajah', true],
    ['/jelajah/sumatera-selatan', '/jelajah', true],
    ['/main/congklak', '/main', true],
    ['/mainx', '/main', false],
    ['/jelajah-admin', '/jelajah', false],
    ['/', '/menu', false],
    [null, '/menu', false],
  ] as const)('isActiveLink(%s, %s) = %s', (pathname, href, expected) => {
    expect(isActiveLink(pathname, href)).toBe(expected);
  });

  it('renders the desktop links and marks the current page with aria-current', () => {
    mockPathname = '/jelajah/sumatera-selatan';
    const html = renderToStaticMarkup(<AppNavbar />);
    expect(html).toContain('Nusantara Legacy');
    expect(html).toContain('href="/jelajah"');
    expect(html).toContain('href="/main"');
    const current = html.match(/<a[^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('Jelajah');
  });

  it('has a phone menu button (links reachable below md)', () => {
    mockPathname = '/main';
    const html = renderToStaticMarkup(<AppNavbar />);
    expect(html).toMatch(/aria-label="Buka menu navigasi"/);
    expect(html).toMatch(/aria-controls="app-phone-nav"/);
  });

  it('the landing page shows its page links in the bar (md+) and in a phone row', () => {
    const page = readFileSync(join(__dirname, '..', '..', 'app', 'page.tsx'), 'utf8');
    expect(page.match(/LANDING_PAGE_LINKS\.map/g)).toHaveLength(2);
    expect(page).toContain('md:hidden');
  });
});
