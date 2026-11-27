/**
 * Local implementation of `@/lib/auth/impl/middleware` (Phase 29; aliased by next.config.ts in local mode). The
 * `np_logged_in` cookie decides redirects ONLY (a hint, never proof of a session): the pages and the backend
 * check the real session. No network call per request.
 */
import { NextResponse, type NextRequest } from 'next/server';

export async function middlewareSession(
  request: NextRequest,
): Promise<{ loggedIn: boolean; response: NextResponse }> {
  return { loggedIn: request.cookies.get('np_logged_in')?.value === '1', response: NextResponse.next() };
}
