import type { AuthMode } from './types';

/**
 * Login implementation of this build (Phase 29): NEXT_PUBLIC_AUTH_MODE = "supabase" (default when unset or
 * anything else) | "local". Read as the literal `process.env.…` so Next inlines it at build time. The same rule
 * lives in `next.config.ts` (`resolveAuthMode`), which swaps the `@/lib/auth/impl/*` modules for the local ones.
 */
export function parseAuthMode(value: string | undefined): AuthMode {
  return value === 'local' ? 'local' : 'supabase';
}

export const AUTH_MODE: AuthMode = parseAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE);

export const IS_LOCAL_AUTH = AUTH_MODE === 'local';
