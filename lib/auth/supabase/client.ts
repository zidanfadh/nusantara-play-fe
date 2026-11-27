/**
 * Supabase implementation of the auth facade (Phase 29): exactly the calls the app made before Phase 29,
 * moved here unchanged (sign-in, sign-up, sign-out, session, Google OAuth). Only bundled when
 * NEXT_PUBLIC_AUTH_MODE is not "local" (see `lib/auth/impl/client.ts`).
 */
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, AuthClient, AuthResult } from '@/lib/auth/types';

const NOT_SUPPORTED: AuthResult = {
  error: { code: 'not_supported', message: 'Fitur ini belum tersedia.' },
};

function toResult(error: { message: string } | null): AuthResult {
  // Before Phase 29 the forms showed Supabase's own message; unchanged.
  return { error: error ? { code: 'unknown', message: error.message } : null };
}

function toEvent(event: string): AuthChangeEvent {
  if (event === 'SIGNED_OUT') return 'signed-out';
  if (event === 'TOKEN_REFRESHED') return 'refreshed';
  if (event === 'USER_UPDATED') return 'user-changed';
  return 'signed-in';
}

export const supabaseAuthClient: AuthClient = {
  mode: 'supabase',
  supportsGoogle: true,
  supportsSignOutEverywhere: false,
  afterSignOutPath: '/login',

  async getSession() {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    return session?.access_token ? { accessToken: session.access_token } : null;
  },

  async getAccessToken() {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    return session?.access_token ?? null;
  },

  async hasSession() {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    return Boolean(user);
  },

  async currentUser() {
    // As before (hooks/useCurrentUser.ts): no session → null; otherwise GET /users/me.
    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (!session?.access_token) return null;
    // Loaded on demand: the users API module stays out of the chunk every page loads (as before Phase 29).
    const { getCurrentUser } = await import('@/lib/api/users');
    return getCurrentUser();
  },

  async signIn(email, password) {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    return toResult(error);
  },

  async signUp({ email, password }) {
    const { error } = await createClient().auth.signUp({ email, password });
    return toResult(error);
  },

  async signOut() {
    await createClient().auth.signOut();
  },

  async signOutEverywhere() {
    return NOT_SUPPORTED;
  },

  async signInWithGoogle(redirectUrl) {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
  },

  async requestPasswordReset() {
    return NOT_SUPPORTED;
  },
  async resetPassword() {
    return NOT_SUPPORTED;
  },
  async verifyEmail() {
    return NOT_SUPPORTED;
  },
  async resendVerification() {
    return NOT_SUPPORTED;
  },

  onChange(listener) {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event) => listener(toEvent(event)));
    return () => subscription.unsubscribe();
  },

  async handleUnauthorized() {
    // Before Phase 29 a 401 was simply an error (Supabase refreshes its own session); unchanged.
    return null;
  },
};
