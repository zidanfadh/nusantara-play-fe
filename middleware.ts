import { NextResponse, type NextRequest } from 'next/server';
import { middlewareSession } from '@/lib/auth/impl/middleware';
import { loginUrlFor, safeRedirectPath } from '@/components/auth/login-redirect';
import { isPublicPath } from '@/lib/auth/public-routes';

// Public pages: lib/auth/public-routes.ts (Phase 29; re-exported for the tests and older imports).
export { isPublicPath };

/**
 * Where the middleware sends a request, or null to let it through. Pure (tested). `loggedIn` is what the
 * build's login says (Phase 29, `middlewareSession`): supabase mode = a Supabase user (`updateSession`), local
 * mode = the `np_logged_in` cookie as a hint (the pages and the API still check the real session).
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
  const { loggedIn, response } = await middlewareSession(request);
  const { pathname, search } = request.nextUrl;

  const decision = routeDecision(loggedIn, pathname, search);
  if (decision) {
    return NextResponse.redirect(new URL(decision.location, request.nextUrl.origin));
  }

  return response;
}

export const config = {
  matcher: [
    // backend-api: browser API calls proxied to the NestJS backend by the rewrite in
    // next.config.ts. They must never run the session check (a Supabase call in supabase mode) or redirect to /login.
    '/((?!_next/static|_next/image|backend-api(?:/|$)|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
