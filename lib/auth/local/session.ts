/**
 * The local (self-hosted backend) login, Phase 29. Rules:
 * - The access token lives ONLY in this tab's memory (never storage, never a cookie we set, never logged).
 *   The refresh token is the backend's httpOnly `np_refresh` cookie; `np_logged_in=1` is a readable hint.
 * - On start: if `np_logged_in` is present, refresh ONCE (single-flight per tab: concurrent callers share it).
 * - 409 `refresh_conflict` (another tab rotated the cookie a moment ago): wait briefly, retry once, never log out.
 * - 401 on refresh: the session is over → signed out (other tabs are told), and a protected page goes to
 *   `/login?redirectTo=…` (Phase 18 rules). A network error or 5xx never signs out.
 * - Proactive refresh ~60 s before the access token expires, only while the tab is visible (a hidden tab
 *   refreshes when it becomes visible again, or on its next request).
 * - Other tabs: sign-in and sign-out events through BroadcastChannel (storage-event fallback), event type only.
 * Everything browser-specific is injected, so the logic is unit-tested in Node.
 */
import { loginUrlFor } from '@/components/auth/login-redirect';
import { isPublicPath } from '@/lib/auth/public-routes';
import type { AuthChangeEvent, AuthClient, AuthResult, AuthUser } from '@/lib/auth/types';
import { openTabChannel, type TabChannel, type TabChannelEnv, type TabMessage } from './broadcast';
import {
  authRequest,
  emailOnlyError,
  loginError,
  passwordFormError,
  readSessionBody,
  verifyEmailError,
  type AuthResponse,
  type FetchLike,
} from './http';

export const LOGGED_IN_COOKIE = 'np_logged_in';
/** Refresh this long before the access token expires. */
export const REFRESH_LEAD_MS = 60_000;
/** A token this close to its expiry is not handed out any more (refreshed first). */
export const EXPIRY_MARGIN_MS = 5_000;
/** Wait after a 409 refresh_conflict before the one retry (the other tab's new cookie is then in place). */
export const CONFLICT_RETRY_DELAY_MS = 400;

export interface LocalDocument {
  cookie: string;
  visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface LocalLocation {
  pathname: string;
  search: string;
  assign(url: string): void;
}

export interface LocalAuthDeps {
  fetch: FetchLike;
  /** `window.location.origin`. */
  origin: () => string;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  document: LocalDocument;
  location: LocalLocation;
  tabs: TabChannelEnv;
  /** GET /users/me with the current session (the role and profile, as in supabase mode). */
  fetchCurrentUser: () => Promise<AuthUser | null>;
  conflictRetryDelayMs?: number;
}

interface SessionState {
  accessToken: string;
  /** Epoch ms. */
  expiresAt: number;
}

const OK: AuthResult = { error: null };

export function hasLoggedInHint(cookie: string): boolean {
  return cookie.split(';').some((part) => part.trim() === `${LOGGED_IN_COOKIE}=1`);
}

export function createLocalAuthClient(deps: LocalAuthDeps): AuthClient & {
  /** For tests: forget the in-memory session and the start-up state. */
  reset(): void;
} {
  let session: SessionState | null = null;
  let started: Promise<void> | null = null;
  let inflight: Promise<string | null> | null = null;
  let refreshTimer: unknown = null;
  let refreshDue = false;
  let tabs: TabChannel | null = null;
  const listeners = new Set<(event: AuthChangeEvent) => void>();

  const emit = (event: AuthChangeEvent) => {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        // a broken listener must not break the session
      }
    }
  };

  const call = (path: string, options?: Parameters<typeof authRequest>[3]): Promise<AuthResponse> =>
    authRequest(deps.fetch, deps.origin(), path, options);

  const clearTimer = () => {
    if (refreshTimer !== null) deps.clearTimeout(refreshTimer);
    refreshTimer = null;
    refreshDue = false;
  };

  const scheduleRefresh = () => {
    clearTimer();
    if (!session) return;
    const delay = Math.max(1_000, session.expiresAt - REFRESH_LEAD_MS - deps.now());
    refreshTimer = deps.setTimeout(() => {
      refreshTimer = null;
      if (deps.document.visibilityState === 'visible') {
        void refresh();
      } else {
        refreshDue = true;
      }
    }, delay);
  };

  const apply = (body: Record<string, unknown> | null): string | null => {
    const parsed = readSessionBody(body);
    if (!parsed) return null;
    const wasSignedIn = session !== null;
    session = { accessToken: parsed.accessToken, expiresAt: deps.now() + parsed.expiresIn * 1000 };
    scheduleRefresh();
    emit(wasSignedIn ? 'refreshed' : 'signed-in');
    return session.accessToken;
  };

  const clearHintCookie = () => {
    // The backend clears it too; this covers a logout whose request failed (offline). Same Path as the backend.
    try {
      deps.document.cookie = `${LOGGED_IN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  /** Ends the session in this tab. `tell` = also tell the other tabs (not when the news came from one). */
  const endSession = (tell: boolean) => {
    const wasSignedIn = session !== null;
    session = null;
    clearTimer();
    if (tell) tabs?.post('signed-out');
    if (wasSignedIn || tell) emit('signed-out');
  };

  const sendToLogin = () => {
    const { pathname, search } = deps.location;
    if (!isPublicPath(pathname)) deps.location.assign(loginUrlFor(`${pathname}${search}`, pathname));
  };

  const wait = (ms: number) => new Promise<void>((resolve) => deps.setTimeout(resolve, ms));

  const doRefresh = async (): Promise<string | null> => {
    let response = await call('refresh');
    if (response.status === 409 && response.body?.error === 'refresh_conflict') {
      await wait(deps.conflictRetryDelayMs ?? CONFLICT_RETRY_DELAY_MS);
      response = await call('refresh');
    }
    if (response.status === 200) {
      return apply(response.body);
    }
    if (response.status === 401) {
      // The refresh token is gone (expired, revoked, reused, password reset): the session is over everywhere.
      endSession(true);
      return null;
    }
    // 409 twice, CSRF 403, 5xx, offline: keep what we have (no logout); the next request or timer tries again.
    return session && session.expiresAt - EXPIRY_MARGIN_MS > deps.now() ? session.accessToken : null;
  };

  /** Single-flight per tab: every caller during a refresh gets the same promise. */
  const refresh = (): Promise<string | null> => {
    if (!inflight) {
      inflight = doRefresh().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };

  const onTabMessage = (message: TabMessage) => {
    if (message === 'signed-out') {
      endSession(false);
    } else {
      // Another tab signed in: the new np_refresh cookie is shared, so pick the session up.
      void refresh();
    }
  };

  const start = (): Promise<void> => {
    if (started) return started;
    tabs = openTabChannel(deps.tabs, onTabMessage);
    deps.document.addEventListener('visibilitychange', () => {
      if (deps.document.visibilityState !== 'visible' || !session) return;
      if (refreshDue || session.expiresAt - REFRESH_LEAD_MS <= deps.now()) void refresh();
    });
    started = hasLoggedInHint(deps.document.cookie) ? refresh().then(() => undefined) : Promise.resolve();
    return started;
  };

  const getAccessToken = async (): Promise<string | null> => {
    await start();
    if (inflight) return inflight;
    if (session && session.expiresAt - EXPIRY_MARGIN_MS > deps.now()) return session.accessToken;
    if (session || hasLoggedInHint(deps.document.cookie)) return refresh();
    return null;
  };

  return {
    mode: 'local',
    supportsGoogle: false,
    supportsSignOutEverywhere: true,
    afterSignOutPath: '/',

    async getSession() {
      const accessToken = await getAccessToken();
      return accessToken ? { accessToken } : null;
    },

    getAccessToken,

    async hasSession() {
      return (await getAccessToken()) !== null;
    },

    async currentUser() {
      if (!(await getAccessToken())) return null;
      return deps.fetchCurrentUser();
    },

    async signIn(email, password) {
      await start();
      const response = await call('login', { body: { email, password } });
      if (response.status === 200 && apply(response.body)) {
        tabs?.post('signed-in');
        return OK;
      }
      return { error: loginError(response) };
    },

    async signUp({ email, password, fullName }) {
      const response = await call('register', { body: { email, password, full_name: fullName ?? '' } });
      // Always the same 201 for new and existing emails: the UI says "Cek email kamu" either way.
      return response.status === 201 ? OK : { error: passwordFormError(response) };
    },

    async signOut() {
      await start();
      await call('logout');
      clearHintCookie();
      endSession(true);
    },

    async signOutEverywhere() {
      const accessToken = await getAccessToken();
      if (!accessToken) return { error: { code: 'invalid_credentials', message: 'Sesi kamu sudah berakhir.' } };
      const response = await call('logout-all', { accessToken });
      if (response.status !== 204) {
        return { error: { code: 'unknown', message: 'Gagal keluar dari semua perangkat. Coba lagi.' } };
      }
      clearHintCookie();
      endSession(true);
      return OK;
    },

    async signInWithGoogle() {
      // Google sign-in for the local login is the next phase; the buttons are hidden (supportsGoogle false).
    },

    async requestPasswordReset(email) {
      const response = await call('forgot-password', { body: { email } });
      return response.status === 200 ? OK : { error: emailOnlyError(response) };
    },

    async resetPassword(token, newPassword) {
      const response = await call('reset-password', { body: { token, newPassword } });
      return response.status === 200 ? OK : { error: passwordFormError(response) };
    },

    async verifyEmail(token) {
      const response = await call('verify-email', { body: { token } });
      return response.status === 200 ? OK : { error: verifyEmailError(response) };
    },

    async resendVerification(email) {
      const response = await call('resend-verification', { body: { email } });
      return response.status === 200 ? OK : { error: emailOnlyError(response) };
    },

    onChange(listener) {
      listeners.add(listener);
      void start();
      return () => {
        listeners.delete(listener);
      };
    },

    async handleUnauthorized() {
      // A request was refused with this tab's token (expired, or issued before a password change). One refresh;
      // the caller retries once. If the session is over, send a protected page to the login.
      const hadSession = session !== null || hasLoggedInHint(deps.document.cookie);
      if (!hadSession) return null;
      const token = await refresh();
      if (!token && session === null) sendToLogin();
      return token;
    },

    reset() {
      session = null;
      started = null;
      inflight = null;
      clearTimer();
      tabs?.close();
      tabs = null;
      listeners.clear();
    },
  };
}
