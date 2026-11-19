import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { loginUrlFor, safeRedirectPath } from '@/components/auth/login-redirect';

const publicExactRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/unauthorized',
  '/menu',
  '/events',
  '/calendar',
  '/nfts',
  // Games hosted on the site (Phase 17): /main lists them, /main/<game> plays one. No login (Phase 18 too).
  '/main',
];

const publicPrefixes = [
  /^\/events\/(?!create$|my-events$|my-registrations$)[^/]+$/,
  /^\/prot$/,
  /^\/prot\/(?!create$|verifikasi(?:\/.*)?$)[^/]+$/,
  /^\/nfts\/[^/]+$/,
  // Jelajah pages need a login since Phase 18 (owner decision). Only the static files under
  // public/jelajah/ stay public (map geometry, 3D assets, the local DEMO photo): they are data, not pages.
  /^\/jelajah\/(?:geo|assets|demo)\/.+$/,
  /^\/main\/.+$/,
];

export function isPublicPath(pathname: string) {
  return (
    publicExactRoutes.includes(pathname) ||
    publicPrefixes.some((pattern) => pattern.test(pathname))
  );
}

/**
 * Where the middleware sends a request, or null to let it through. Pure (tested). `loggedIn` is what the
 * frontend's current login says (Supabase today, `updateSession`); when the frontend switches to the
 * self-hosted login, only the caller below changes.
 */
export function routeDecision(
  loggedIn: boolean,
  pathname: string,
  search: string,
): { location: string } | null {
  if (!loggedIn && !isPublicPath(pathname)) {
    // Phase 18: carry the full target (path and query) and a reason (Jelajah gets its own notice).
    return { location: loginUrlFor(`${pathname}${search}`, pathname) };
  }
  if (loggedIn && (pathname === '/login' || pathname === '/signup')) {
    // Already logged in: go where the visitor wanted, otherwise the profile (as before).
    const target = safeRedirectPath(new URLSearchParams(search).get('redirectTo'));
    return { location: target ?? '/profile' };
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const decision = routeDecision(Boolean(user), pathname, search);
  if (decision) {
    return NextResponse.redirect(new URL(decision.location, request.nextUrl.origin));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // backend-api: browser API calls proxied to the NestJS backend by the rewrite in
    // next.config.ts. They must never run updateSession (a Supabase call) or redirect to /login.
    '/((?!_next/static|_next/image|backend-api(?:/|$)|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
