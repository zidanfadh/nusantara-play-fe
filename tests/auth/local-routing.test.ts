/**
 * Phase 29 step 5: middleware, server components and roles in local mode.
 * - The middleware decides on the np_logged_in hint only; Phase 18 behaviour (Jelajah gate with redirectTo and
 *   reason=jelajah, /main public, logged-in visitor on /login → redirectTo) is the same pure routeDecision().
 * - Server components get no access token in local mode (display hint only).
 * - The local-login pages are public in local mode and do not exist (not public) in supabase mode.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { routeDecision } from '@/middleware';
import { isPublicPath } from '@/lib/auth/public-routes';
import { middlewareSession } from '@/lib/auth/local/impl-middleware';

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined) }),
}));
const { getServerAuth, exchangeOAuthCode } = await import('@/lib/auth/local/impl-server');

const ROOT = join(__dirname, '..', '..');

afterEach(() => {
  vi.unstubAllEnvs();
  cookieStore.clear();
});

describe('local middleware session (np_logged_in = hint)', () => {
  const request = (cookie?: string) =>
    new NextRequest('http://localhost:3001/jelajah', { headers: cookie ? { cookie } : {} });

  it('logged in only with exactly np_logged_in=1; no network, a plain next() response', async () => {
    expect((await middlewareSession(request('np_logged_in=1'))).loggedIn).toBe(true);
    expect((await middlewareSession(request('np_logged_in=0'))).loggedIn).toBe(false);
    expect((await middlewareSession(request('np_refresh=abc'))).loggedIn).toBe(false);
    expect((await middlewareSession(request())).loggedIn).toBe(false);
    const { response } = await middlewareSession(request('np_logged_in=1'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('Phase 18 gate with the hint: /jelajah needs it, keeps the target, the reason and /main public', () => {
    expect(routeDecision(false, '/jelajah/aceh', '?debug=1')).toEqual({
      location: '/login?redirectTo=%2Fjelajah%2Faceh%3Fdebug%3D1&reason=jelajah',
    });
    expect(routeDecision(true, '/jelajah', '')).toBeNull();
    expect(routeDecision(false, '/main/congklak', '')).toBeNull();
    expect(routeDecision(false, '/main', '')).toBeNull();
    expect(routeDecision(true, '/login', '?redirectTo=%2Fjelajah')).toEqual({ location: '/jelajah' });
    expect(routeDecision(true, '/login', '?redirectTo=%2F%2Fevil.com')).toEqual({ location: '/profile' });
    expect(routeDecision(false, '/profile', '')).toEqual({ location: '/login?redirectTo=%2Fprofile' });
  });
});

describe('local-login pages are public only in local mode', () => {
  const pages = ['/forgot-password', '/reset-password', '/verify-email', '/cek-email'];

  it.each(pages)('%s: public in local mode, a normal (protected, 404) path in supabase mode', (page) => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'local');
    expect(isPublicPath(page)).toBe(true);
    expect(routeDecision(false, page, '?token=x')).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', '');
    expect(isPublicPath(page)).toBe(false);
  });

  it('a logged-in visitor may open them (verify-email while logged in)', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'local');
    expect(routeDecision(true, '/verify-email', '?token=x')).toBeNull();
  });
});

describe('server components in local mode', () => {
  it('get the hint and NEVER an access token', async () => {
    cookieStore.set('np_logged_in', '1');
    cookieStore.set('np_refresh', 'secret-refresh');
    expect(await getServerAuth({ withToken: true })).toEqual({ loggedIn: true, fullName: null });
    cookieStore.clear();
    expect(await getServerAuth()).toEqual({ loggedIn: false, fullName: null });
  });

  it('no Google OAuth code is accepted yet', async () => {
    expect(await exchangeOAuthCode()).toBe(false);
  });

  it('the landing page sends the server token only through getServerAuth (none in local mode)', () => {
    const src = readFileSync(join(ROOT, 'app', 'page.tsx'), 'utf8');
    expect(src).toContain('getFeaturedGames(auth.accessToken)');
    expect(src).toContain('getLandingStats(auth.accessToken)');
    expect(src).not.toMatch(/lib\/supabase/);
  });

  it('/menu shows the name from the client in local mode', () => {
    const src = readFileSync(join(ROOT, 'app', 'menu', 'page.tsx'), 'utf8');
    expect(src).toContain("import { WelcomeName } from '@/lib/auth/impl/ui';");
    expect(src).toContain('<WelcomeName fallback={firstName} />');
  });

  it('no server component, route handler or middleware imports Supabase directly any more', () => {
    for (const file of ['app/page.tsx', 'app/menu/page.tsx', 'app/landing-page/1/page.tsx', 'app/landing-page/2/page.tsx', 'app/auth/callback/route.ts', 'middleware.ts']) {
      expect(readFileSync(join(ROOT, file), 'utf8'), file).not.toMatch(/['"]@\/lib\/supabase|@supabase\//);
    }
  });
});

describe('roles come from the backend user in both modes', () => {
  it('useCurrentUser reads the user through the facade (GET /users/me), never from a token', () => {
    const src = readFileSync(join(ROOT, 'hooks', 'useCurrentUser.ts'), 'utf8');
    expect(src).toContain('authClient.currentUser()');
    expect(src).not.toMatch(/from ['"][^'"]*supabase|jwt-decode|atob\(/i);
  });

  it('the role-dependent pages keep their checks on user.role', () => {
    expect(readFileSync(join(ROOT, 'app', 'prot', '[id]', 'page.tsx'), 'utf8')).toContain('canSeeProtDocuments(user?.role)');
    expect(readFileSync(join(ROOT, 'app', 'prot', 'verifikasi', '[id]', 'review', 'page.tsx'), 'utf8')).toContain(
      'selfReviewState(user, protData, PROT_SELF_REVIEW_RULE)',
    );
  });
});
