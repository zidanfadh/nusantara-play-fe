/**
 * Supabase implementation of the server-side auth (Phase 29): the calls server components and the OAuth
 * callback made before Phase 29, unchanged. Only bundled in supabase mode (`lib/auth/impl/server.ts`).
 */
import { createClient } from '@/lib/supabase/server';
import type { ServerAuth } from '@/lib/auth/server-types';

export async function getServerAuth(options: { withToken?: boolean } = {}): Promise<ServerAuth> {
  const supabase = await createClient();
  if (options.withToken) {
    // The landing page asked for the user and the session together (its fetches sent the visitor's token).
    const [
      {
        data: { user },
      },
      {
        data: { session },
      },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
    return {
      loggedIn: Boolean(user),
      accessToken: session?.access_token,
      fullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return {
    loggedIn: Boolean(user),
    fullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
  };
}

/** OAuth callback: exchanges the code for a session (sets the Supabase cookies). True on success. */
export async function exchangeOAuthCode(code: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}
