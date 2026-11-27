/**
 * Build-time switch point (Phase 29) for the local-login UI pieces that other pages mount. SUPABASE version
 * (default): nothing, no imports, so supabase-mode pages carry none of the local-login UI. Local mode: aliased
 * to `lib/auth/local/impl-ui.tsx` by `next.config.ts`. Plain functions: usable from server and client components.
 */
import type { ReactNode } from 'react';
import type { AuthUser } from '@/lib/auth/types';

/** Site-wide notices of the local login (root layout). */
export function AuthNotices(): ReactNode {
  return null;
}

/** /menu greeting: supabase mode knows the name on the server already. */
export function WelcomeName({ fallback }: { fallback: string }): ReactNode {
  return fallback;
}

/** Profile panel of the local login (email status, sign out everywhere). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the local implementation
export function AccountSecurity(_props: { user: AuthUser }): ReactNode {
  return null;
}

/** Password rules under the sign-up field (local login only). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the local implementation
export function PasswordRules(_props: { id: string; password: string; email: string }): ReactNode {
  return null;
}
