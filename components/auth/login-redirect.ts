/**
 * Where a visitor goes after logging in (Phase 18). Pure and edge-safe: `middleware.ts`, the login and
 * signup forms and the OAuth callback all use it.
 *
 * Rules: `redirectTo` is a same-site path only. It must start with exactly one "/", may not contain a
 * backslash, control characters or whitespace, may not resolve to another origin, and may not point back to
 * /login or /signup (loop). Everything else falls back to the default (no open redirect).
 */

/** Where a login lands when there is no (valid) redirectTo; unchanged from before Phase 18. */
export const DEFAULT_AFTER_LOGIN = '/menu';

/** Reasons the login page explains. Only Jelajah has one today. */
export type LoginReason = 'jelajah';

export const JELAJAH_LOGIN_NOTICE =
  'Masuk dulu untuk memulai Tur Virtual. Setelah masuk, kamu langsung diarahkan ke peta.';

/**
 * Cookie that carries the target through Google sign-in: the Supabase OAuth redirect URL stays exactly
 * `/auth/callback` (as allowlisted in Supabase today), and the callback reads the target from here.
 */
export const POST_LOGIN_COOKIE = 'np_post_login';
export const POST_LOGIN_COOKIE_MAX_AGE = 600;

const MAX_LENGTH = 2048;
const BASE = 'https://same-site.invalid';
const AUTH_PAGES = new Set(['/login', '/signup']);

/** The validated same-site path (pathname + search + hash), or null. */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return null;
  if (value[0] !== '/' || value[1] === '/' || value[1] === '\\') return null;
  // Browsers treat "\" like "/" (so "/\evil.com" is "//evil.com"); controls and spaces are never valid here.
  if (/[\\\u0000- \u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  if (AUTH_PAGES.has(url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Validated target or the default. */
export function redirectTargetOr(value: unknown, fallback: string = DEFAULT_AFTER_LOGIN): string {
  return safeRedirectPath(value) ?? fallback;
}

export function parseLoginReason(value: unknown): LoginReason | null {
  return value === 'jelajah' ? 'jelajah' : null;
}

/** Jelajah pages (the map and every province page) need a login. */
export function isJelajahPath(pathname: string): boolean {
  return pathname === '/jelajah' || pathname.startsWith('/jelajah/');
}

/** `?redirectTo=…&reason=…` for links between the login and signup pages (only valid values). */
export function authQuery(redirectTo: string | null, reason: LoginReason | null): string {
  const params = new URLSearchParams();
  const target = safeRedirectPath(redirectTo);
  if (target) params.set('redirectTo', target);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The login URL for a visitor who wanted `pathWithSearch` (relative, used by the middleware). */
export function loginUrlFor(pathWithSearch: string, pathname: string): string {
  return `/login${authQuery(pathWithSearch, isJelajahPath(pathname) ? 'jelajah' : null)}`;
}

/** Remembers the target for the Google sign-in round trip (browser only; try/catch). */
export function rememberPostLoginTarget(redirectTo: string | null): void {
  try {
    const target = safeRedirectPath(redirectTo);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = target
      ? `${POST_LOGIN_COOKIE}=${encodeURIComponent(target)}; Path=/; Max-Age=${POST_LOGIN_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
      : `${POST_LOGIN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    // no cookies: Google sign-in then lands on the default page
  }
}

/** Reads the remembered target back from the raw cookie value (callback side). */
export function readPostLoginCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return safeRedirectPath(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * The OAuth callback's target: a valid `next` query, else the remembered cookie target (Google sign-in),
 * else /menu. Both validated, so `next=@evil.com` or `next=//evil.com` never leave the site.
 */
export function callbackTarget(next: string | null, cookieValue: string | undefined): string {
  return safeRedirectPath(next) ?? readPostLoginCookie(cookieValue) ?? DEFAULT_AFTER_LOGIN;
}

/** The login page URL after a failed callback, keeping the target (and the Jelajah notice). */
export function loginRetryPath(target: string): string {
  const params = new URLSearchParams({ error: 'auth_callback_error' });
  if (target !== DEFAULT_AFTER_LOGIN) params.set('redirectTo', target);
  if (isJelajahPath(new URL(target, BASE).pathname)) params.set('reason', 'jelajah');
  return `/login?${params.toString()}`;
}
