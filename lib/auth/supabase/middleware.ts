/**
 * Supabase implementation of the middleware session check (Phase 29): `updateSession()` refreshes the
 * Supabase cookies and returns the user, exactly as before. Only bundled in supabase mode.
 */
import type { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middlewareSession(
  request: NextRequest,
): Promise<{ loggedIn: boolean; response: NextResponse }> {
  const { supabaseResponse, user } = await updateSession(request);
  return { loggedIn: Boolean(user), response: supabaseResponse };
}
