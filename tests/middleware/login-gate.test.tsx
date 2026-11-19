import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { routeDecision } from '@/middleware';
import {
  JELAJAH_LOGIN_NOTICE,
  authQuery,
  callbackTarget,
  loginRetryPath,
  loginUrlFor,
  parseLoginReason,
  readPostLoginCookie,
  redirectTargetOr,
  safeRedirectPath,
} from '@/components/auth/login-redirect';
import { LoginNotice } from '@/components/auth/LoginNotice';
import { backLinkFor } from '@/lib/games/congklak/from-link';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {} }) }));

const { LoginForm, loginAndRedirect } = await import('@/components/auth/LoginForm');
const { SignupForm } = await import('@/components/auth/SignupForm');

describe('redirectTo validator (Phase 18)', () => {
  it.each([
    '//evil.com',
    '//evil.com/jelajah',
    'https://evil.com',
    'http://evil.com/jelajah',
    '/\\evil.com',
    '/\\/evil.com',
    '\\\\evil.com',
    'javascript:alert(1)',
    '/jelajah\njavascript:alert(1)',
    '/\tevil.com',
    ' /jelajah',
    'jelajah',
    '@evil.com',
    '',
    '/login',
    '/signup?redirectTo=/jelajah',
    '/' + 'a'.repeat(3000),
  ])('rejects %j', (value) => {
    expect(safeRedirectPath(value)).toBeNull();
    expect(redirectTargetOr(value)).toBe('/menu');
  });

  it.each([null, undefined, 42, ['/jelajah']])('rejects non-strings (%j)', (value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });

  it.each([
    ['/jelajah', '/jelajah'],
    ['/jelajah/sumatera-selatan', '/jelajah/sumatera-selatan'],
    ['/jelajah?debug=1', '/jelajah?debug=1'],
    ['/events/123#daftar', '/events/123#daftar'],
    ['/%2F%2Fevil.com', '/%2F%2Fevil.com'],
    ['/a/../jelajah', '/jelajah'],
  ])('accepts the same-site path %j', (value, expected) => {
    expect(safeRedirectPath(value)).toBe(expected);
  });

  it('only knows the jelajah reason', () => {
    expect(parseLoginReason('jelajah')).toBe('jelajah');
    expect(parseLoginReason('admin')).toBeNull();
    expect(parseLoginReason(undefined)).toBeNull();
  });

  it('builds the query between login and signup with valid values only', () => {
    expect(authQuery('/jelajah', 'jelajah')).toBe('?redirectTo=%2Fjelajah&reason=jelajah');
    expect(authQuery('//evil.com', null)).toBe('');
    expect(authQuery(null, null)).toBe('');
  });
});

describe('middleware decisions (Phase 18)', () => {
  it.each([
    ['/jelajah', '', '/login?redirectTo=%2Fjelajah&reason=jelajah'],
    ['/jelajah/sumatera-selatan', '', '/login?redirectTo=%2Fjelajah%2Fsumatera-selatan&reason=jelajah'],
    ['/jelajah', '?debug=1', '/login?redirectTo=%2Fjelajah%3Fdebug%3D1&reason=jelajah'],
  ])('sends a logged-out visitor of %s%s to the login notice', (path, search, location) => {
    expect(routeDecision(false, path, search)).toEqual({ location });
  });

  it('other protected pages keep redirectTo without a reason', () => {
    expect(routeDecision(false, '/profile', '')).toEqual({ location: '/login?redirectTo=%2Fprofile' });
  });

  it.each(['/main', '/main/congklak', '/', '/prot', '/jelajah/geo/indonesia-provinces.json'])(
    'lets a logged-out visitor open %s',
    (path) => {
      expect(routeDecision(false, path, '')).toBeNull();
    },
  );

  it('lets a logged-in visitor open /jelajah', () => {
    expect(routeDecision(true, '/jelajah', '')).toBeNull();
  });

  it('sends a logged-in visitor on /login to redirectTo (validated) or the profile', () => {
    expect(routeDecision(true, '/login', '?redirectTo=%2Fjelajah&reason=jelajah')).toEqual({ location: '/jelajah' });
    expect(routeDecision(true, '/login', '?redirectTo=%2F%2Fevil.com')).toEqual({ location: '/profile' });
    expect(routeDecision(true, '/signup', '')).toEqual({ location: '/profile' });
  });

  it('the congklak back links lead into the same gate', () => {
    for (const from of ['jelajah', 'jelajah-sumatera-selatan']) {
      const link = backLinkFor(from)!;
      expect(routeDecision(false, link.href, '')?.location).toMatch(/reason=jelajah$/);
    }
  });

  it('loginUrlFor marks only Jelajah paths', () => {
    expect(loginUrlFor('/jelajahx', '/jelajahx')).toBe('/login?redirectTo=%2Fjelajahx');
  });
});

describe('login page notice and post-login redirect (Phase 18)', () => {
  it('shows the Jelajah notice only for reason=jelajah', () => {
    expect(renderToStaticMarkup(<LoginNotice reason="jelajah" />)).toContain(JELAJAH_LOGIN_NOTICE);
    expect(renderToStaticMarkup(<LoginNotice reason={null} />)).toBe('');
  });

  it('the login form shows the notice and keeps redirectTo and reason on the signup link', () => {
    const html = renderToStaticMarkup(<LoginForm redirectTo="/jelajah" reason="jelajah" />);
    expect(html).toContain('Masuk dulu untuk memulai Tur Virtual');
    expect(html).toContain('href="/signup?redirectTo=%2Fjelajah&amp;reason=jelajah"');
    expect(html).toContain('role="status"');
  });

  it('the login form without a reason shows no notice', () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).not.toContain('data-login-notice');
    expect(html).toContain('href="/signup"');
  });

  it('reason=jelajah: no "Masuk sebagai Tamu", a short note with a link to the games instead (Phase 19)', () => {
    const html = renderToStaticMarkup(<LoginForm redirectTo="/jelajah" reason="jelajah" />);
    expect(html).not.toContain('Masuk sebagai Tamu');
    expect(html).toContain('data-login-guest-note');
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain('Peta Jelajah memerlukan akun. Game di menu Game tetap bisa dimainkan tanpa akun.');
    expect(html).toMatch(/<a [^>]*href="\/main"[^>]*>menu Game<\/a>/);
    // Without the reason the guest entry is unchanged.
    const plain = renderToStaticMarkup(<LoginForm />);
    expect(plain).toContain('Masuk sebagai Tamu');
    expect(plain).not.toContain('data-login-guest-note');
  });

  it('the signup form keeps redirectTo and reason on its login link', () => {
    const html = renderToStaticMarkup(<SignupForm redirectTo="/jelajah" reason="jelajah" />);
    expect(html).toContain('href="/login?redirectTo=%2Fjelajah&amp;reason=jelajah"');
    expect(html).toContain('data-login-notice="jelajah"');
  });

  it('after a successful login the visitor lands on redirectTo', async () => {
    const navigate = vi.fn();
    const signIn = vi.fn(async () => ({ error: null }));
    await expect(loginAndRedirect(signIn, navigate, 'a@b.c', 'pw', '/jelajah')).resolves.toBeNull();
    expect(navigate).toHaveBeenCalledWith('/jelajah');
  });

  it('without redirectTo (or with a bad one) the login lands on /menu', async () => {
    const navigate = vi.fn();
    const signIn = vi.fn(async () => ({ error: null }));
    await loginAndRedirect(signIn, navigate, 'a@b.c', 'pw', null);
    await loginAndRedirect(signIn, navigate, 'a@b.c', 'pw', '//evil.com');
    expect(navigate.mock.calls).toEqual([['/menu'], ['/menu']]);
  });

  it('a failed login does not navigate', async () => {
    const navigate = vi.fn();
    const signIn = vi.fn(async () => ({ error: new Error('Invalid login credentials') }));
    await expect(loginAndRedirect(signIn, navigate, 'a@b.c', 'x', '/jelajah')).resolves.toBe(
      'Invalid login credentials',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('OAuth callback target (Phase 18)', () => {
  it('prefers a valid next, then the cookie, then /menu', () => {
    expect(callbackTarget('/jelajah', encodeURIComponent('/events'))).toBe('/jelajah');
    expect(callbackTarget(null, encodeURIComponent('/jelajah/sumatera-selatan'))).toBe('/jelajah/sumatera-selatan');
    expect(callbackTarget(null, undefined)).toBe('/menu');
  });

  it.each(['@evil.com', '//evil.com', 'https://evil.com', '/\\evil.com'])('never follows next=%s', (next) => {
    expect(callbackTarget(next, undefined)).toBe('/menu');
  });

  it('ignores a forged cookie', () => {
    expect(readPostLoginCookie(encodeURIComponent('//evil.com'))).toBeNull();
    expect(readPostLoginCookie('%E0%A4%A')).toBeNull();
    expect(callbackTarget(null, encodeURIComponent('https://evil.com'))).toBe('/menu');
  });

  it('a failed callback goes back to the login page with the target and the notice', () => {
    expect(loginRetryPath('/jelajah')).toBe(
      '/login?error=auth_callback_error&redirectTo=%2Fjelajah&reason=jelajah',
    );
    expect(loginRetryPath('/menu')).toBe('/login?error=auth_callback_error');
  });

  it('the Google button remembers the target and the callback URL stays /auth/callback', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'components', 'auth', 'SocialAuthButtons.tsx'), 'utf8');
    expect(src).toContain('rememberPostLoginTarget(redirectTo)');
    expect(src).toContain('`${window.location.origin}/auth/callback`');
    const route = readFileSync(join(__dirname, '..', '..', 'app', 'auth', 'callback', 'route.ts'), 'utf8');
    expect(route).toContain('callbackTarget(');
    expect(route).not.toMatch(/\$\{origin\}\$\{next\}/);
  });
});

describe('landing hint (Phase 18)', () => {
  it('"Mulai Tur Virtual" keeps /jelajah and shows "Perlu masuk akun" to logged-out visitors', () => {
    const page = readFileSync(join(__dirname, '..', '..', 'app', 'page.tsx'), 'utf8');
    expect(page).toMatch(/\{!user && \(\s*<p[\s\S]*?Perlu masuk akun/);
    expect(page).toMatch(/href="\/jelajah"\s+prefetch=\{false\}/);
  });
});
