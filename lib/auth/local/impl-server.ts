/**
 * Local implementation of `@/lib/auth/impl/server` (Phase 29; aliased by next.config.ts in local mode). There is
 * NO access token on the server: the access token lives only in the browser tab's memory. Server components get
 * the `np_logged_in` cookie as a display hint (e.g. "Masuk" vs "Profil"), never as access to data.
 */
import { cookies } from 'next/headers';
import type { ServerAuth } from '@/lib/auth/server-types';
import { LOGGED_IN_COOKIE } from './session';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the supabase implementation
export async function getServerAuth(_options: { withToken?: boolean } = {}): Promise<ServerAuth> {
  const store = await cookies();
  return { loggedIn: store.get(LOGGED_IN_COOKIE)?.value === '1', fullName: null };
}

/** Google sign-in is not part of the local login yet (next phase): no OAuth code is ever accepted. */
export async function exchangeOAuthCode(): Promise<boolean> {
  return false;
}
