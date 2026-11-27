/**
 * The auth facade (Phase 29). Components, hooks and API modules use ONLY these types and the client from
 * `lib/auth/client.ts`; the two implementations live in `lib/auth/supabase/` (today's login, the default) and
 * `lib/auth/local/` (the self-hosted backend login). Which one a build contains is decided at build time by
 * NEXT_PUBLIC_AUTH_MODE (see `lib/auth/mode.ts` and `next.config.ts`).
 *
 * Type-only module: no runtime code, no imports of either implementation.
 */
import type { UserProfile } from '@/types/user';

export type AuthMode = 'supabase' | 'local';

/** The backend user (`GET /users/me`; local login and refresh return the same object). */
export type AuthUser = UserProfile & { emailVerified?: boolean };

export type AuthErrorCode =
  /** Wrong email or password, or an account that cannot use a password yet (legacy Supabase-only). */
  | 'invalid_credentials'
  /** Too many failed logins for this email: `retryAfterSeconds` says how long. */
  | 'locked'
  /** A rate limit without a known retry time. */
  | 'rate_limited'
  /** Suspended or inactive account (only after a correct password). */
  | 'account_unavailable'
  /** The backend cannot sign anyone in right now (503) or could not be reached. */
  | 'unavailable'
  /** Email link (verification or reset) is unknown, used or expired: `tokenReason`. */
  | 'invalid_token'
  /** The password breaks the policy (8 to 128 characters, not the email). */
  | 'policy'
  /** Any other 400 (validation). */
  | 'validation'
  /** The feature does not exist in this mode (for example password reset in supabase mode). */
  | 'not_supported'
  | 'unknown';

export type TokenReason = 'used' | 'expired' | 'invalid';

export interface AuthError {
  code: AuthErrorCode;
  /** Text to show. Supabase mode: Supabase's own message (unchanged behaviour). Local mode: Indonesian. */
  message: string;
  retryAfterSeconds?: number;
  tokenReason?: TokenReason;
}

export interface AuthResult {
  error: AuthError | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  /** Required by the local backend (`full_name`); ignored by Supabase. */
  fullName?: string;
}

export interface AuthSessionInfo {
  accessToken: string;
}

/**
 * `signed-in` / `signed-out`: the session started or ended (this tab or, in local mode, another tab).
 * `refreshed`: a new access token for the same session. `user-changed`: the cached user object changed.
 */
export type AuthChangeEvent = 'signed-in' | 'signed-out' | 'refreshed' | 'user-changed';

export interface AuthClient {
  readonly mode: AuthMode;
  /** Google sign-in exists in this build (supabase mode only in Phase 29). */
  readonly supportsGoogle: boolean;
  /** Logging out from all devices exists (local mode: `POST /auth/logout-all`). */
  readonly supportsSignOutEverywhere: boolean;
  /** Where the UI goes after signing out. */
  readonly afterSignOutPath: string;

  /** The current session (access token), or null when signed out. */
  getSession(): Promise<AuthSessionInfo | null>;
  /** Shorthand for `(await getSession())?.accessToken ?? null`. */
  getAccessToken(): Promise<string | null>;
  /** True when the visitor is signed in (the protected layout's check). */
  hasSession(): Promise<boolean>;
  /** The backend user with its role, or null when signed out. */
  currentUser(): Promise<AuthUser | null>;

  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  signOutEverywhere(): Promise<AuthResult>;
  /** Google sign-in (supabase mode); `redirectUrl` is the OAuth callback. */
  signInWithGoogle(redirectUrl: string): Promise<void>;

  requestPasswordReset(email: string): Promise<AuthResult>;
  resetPassword(token: string, newPassword: string): Promise<AuthResult>;
  verifyEmail(token: string): Promise<AuthResult>;
  resendVerification(email: string): Promise<AuthResult>;

  /** Subscribes to session changes; returns the unsubscribe function. */
  onChange(listener: (event: AuthChangeEvent) => void): () => void;

  /**
   * Called by the API client after a 401. Local mode: refreshes once and returns the new access token (the
   * caller retries once), or null after signing out. Supabase mode: always null (no retry, as before).
   */
  handleUnauthorized(): Promise<string | null>;
}
