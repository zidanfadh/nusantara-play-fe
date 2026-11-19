import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SITE_NAME } from '@/lib/brand';
import { GAMES } from '@/lib/games/registry';

vi.mock('@/components/ui/AppNavbar', () => ({ AppNavbar: () => null }));

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('gasing integration (Phase 20)', () => {
  it('/main lists Gasing next to Congklak, without prefetching the game routes', async () => {
    const { default: GamesPage } = await import('@/app/main/page');
    const html = renderToStaticMarkup(<GamesPage />);
    expect(html).toContain('href="/main/congklak"');
    expect(html).toContain('href="/main/gasing"');
    expect(html.indexOf('/main/congklak')).toBeLessThan(html.indexOf('/main/gasing'));
    expect(html).toContain('Main Gasing');
    const src = readFileSync(`${root}app/main/page.tsx`, 'utf8');
    expect(src).toMatch(/href=\{g\.href\}\s+prefetch=\{false\}/);
    expect(GAMES.find((g) => g.slug === 'gasing')?.description).toMatch(/Uri/);
  });

  it('the page metadata uses the brand constant', async () => {
    const { metadata } = await import('@/app/main/gasing/page');
    expect(metadata.title).toBe(`Gasing · ${SITE_NAME}`);
    expect(metadata.openGraph?.siteName).toBe(SITE_NAME);
    const src = readFileSync(`${root}app/main/gasing/page.tsx`, 'utf8');
    expect(src).not.toMatch(/Nusantara Legacy/);
  });

  it('every link to another route from the game is not prefetched', () => {
    for (const f of ['components/games/gasing/GasingGame.tsx', 'components/games/gasing/GasingArena.tsx', 'components/games/gasing/InfoSheets.tsx']) {
      const src = readFileSync(`${root}${f}`, 'utf8');
      const links = src.match(/<Link\b[^>]*>/g) ?? [];
      expect(links.length, f).toBeGreaterThan(0);
      for (const l of links) expect(l, f).toContain('prefetch={false}');
    }
  });

  it('three.js is never imported on the game route', () => {
    for (const f of ['app/main/gasing/page.tsx', 'components/games/gasing/GasingArena.tsx', 'components/games/gasing/render.ts']) {
      expect(readFileSync(`${root}${f}`, 'utf8')).not.toMatch(/from\s+['"](three|@react-three\/)/);
    }
  });
});
