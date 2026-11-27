/**
 * Local implementation of `@/lib/auth/impl/client` (Phase 29). `next.config.ts` aliases that import path here
 * when NEXT_PUBLIC_AUTH_MODE=local. Must never import @supabase/* or lib/supabase (tested).
 *
 * On the server (SSR of client components) there is no session: every call answers "signed out" without any
 * network request; the browser instance starts on first use.
 */
import { getCurrentUser } from '@/lib/api/users';
import type { AuthClient } from '@/lib/auth/types';
import { createLocalAuthClient } from './session';

function browserClient(): AuthClient {
  return createLocalAuthClient({
    fetch: (input, init) => window.fetch(input, init),
    origin: () => window.location.origin,
    now: () => Date.now(),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    document,
    location: window.location,
    tabs: {
      BroadcastChannel: typeof BroadcastChannel === 'function' ? BroadcastChannel : undefined,
      localStorage: (() => {
        try {
          return window.localStorage;
        } catch {
          return undefined;
        }
      })(),
      addEventListener: (type, listener) => window.addEventListener(type, listener),
      removeEventListener: (type, listener) => window.removeEventListener(type, listener),
    },
    fetchCurrentUser: () => getCurrentUser(),
  });
}

const SIGNED_OUT = { error: { code: 'unavailable' as const, message: 'Muat ulang halaman lalu coba lagi.' } };

/** Server-side stand-in: signed out, no network. */
const serverClient: AuthClient = {
  mode: 'local',
  supportsGoogle: false,
  supportsSignOutEverywhere: true,
  afterSignOutPath: '/',
  getSession: async () => null,
  getAccessToken: async () => null,
  hasSession: async () => false,
  currentUser: async () => null,
  signIn: async () => SIGNED_OUT,
  signUp: async () => SIGNED_OUT,
  signOut: async () => {},
  signOutEverywhere: async () => SIGNED_OUT,
  signInWithGoogle: async () => {},
  requestPasswordReset: async () => SIGNED_OUT,
  resetPassword: async () => SIGNED_OUT,
  verifyEmail: async () => SIGNED_OUT,
  resendVerification: async () => SIGNED_OUT,
  onChange: () => () => {},
  handleUnauthorized: async () => null,
};

export const authClient: AuthClient = typeof window === 'undefined' ? serverClient : browserClient();
