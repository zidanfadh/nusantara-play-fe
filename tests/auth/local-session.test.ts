/**
 * Phase 29 step 2: the local login session (lib/auth/local/session.ts) against a fake backend: memory-only
 * token, single-flight refresh, 401 → refresh once, refresh_conflict retry, proactive refresh while visible,
 * BroadcastChannel between tabs (event type only), sign-out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalAuthClient, hasLoggedInHint, type LocalAuthDeps } from '@/lib/auth/local/session';
import { TAB_CHANNEL, TAB_STORAGE_KEY } from '@/lib/auth/local/broadcast';
import type { AuthUser } from '@/lib/auth/types';

const USER = { id: 'u1', full_name: 'Uji Coba', role: 'pakar', emailVerified: true } as AuthUser;

type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

/** In-memory BroadcastChannel shared by every "tab" of a test. */
class FakeChannel {
  static all: FakeChannel[] = [];
  static posted: unknown[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;
  constructor(readonly name: string) {
    FakeChannel.all.push(this);
  }
  postMessage(data: unknown) {
    FakeChannel.posted.push(data);
    for (const other of FakeChannel.all) {
      if (other !== this && !other.closed && other.name === this.name) other.onmessage?.({ data } as MessageEvent);
    }
  }
  close() {
    this.closed = true;
  }
}

interface Tab {
  client: ReturnType<typeof createLocalAuthClient>;
  calls: { path: string; init: RequestInit }[];
  replies: Map<string, Reply[]>;
  doc: { cookie: string; visibilityState: string; fire(): void };
  location: { pathname: string; search: string; assign: ReturnType<typeof vi.fn> };
  fetchCurrentUser: ReturnType<typeof vi.fn>;
}

/** One browser tab with its own fake backend replies (a queue per auth path; the last reply repeats). */
function openTab(options: { cookie?: string; pathname?: string; search?: string; channel?: boolean } = {}): Tab {
  const calls: Tab['calls'] = [];
  const replies = new Map<string, Reply[]>();
  let visibilityListener: () => void = () => {};
  const doc = {
    cookie: options.cookie ?? '',
    visibilityState: 'visible',
    addEventListener: (_type: 'visibilitychange', listener: () => void) => {
      visibilityListener = listener;
    },
    fire: () => visibilityListener(),
  };
  const location = { pathname: options.pathname ?? '/jelajah', search: options.search ?? '', assign: vi.fn() };
  const fetchCurrentUser = vi.fn(async () => USER);
  const deps: LocalAuthDeps = {
    fetch: async (input, init = {}) => {
      const path = input.replace('http://localhost:3001/backend-api/auth/', '');
      calls.push({ path, init });
      const queue = replies.get(path) ?? [{ status: 404 }];
      const reply = queue.length > 1 ? queue.shift()! : queue[0];
      if (reply.status === -1) throw new TypeError('Failed to fetch');
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: reply.headers,
      });
    },
    origin: () => 'http://localhost:3001',
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    document: doc,
    location,
    tabs: { BroadcastChannel: options.channel === false ? undefined : (FakeChannel as unknown as typeof BroadcastChannel) },
    fetchCurrentUser,
    conflictRetryDelayMs: 50,
  };
  return { client: createLocalAuthClient(deps), calls, replies, doc, location, fetchCurrentUser };
}

const session = (token: string, expiresIn = 900): Reply => ({
  status: 200,
  body: { accessToken: token, expiresIn, user: USER },
});

beforeEach(() => {
  vi.useFakeTimers();
  FakeChannel.all = [];
  FakeChannel.posted = [];
});
afterEach(() => {
  vi.useRealTimers();
});

describe('hasLoggedInHint', () => {
  it('reads exactly np_logged_in=1 among other cookies', () => {
    expect(hasLoggedInHint('a=1; np_logged_in=1; b=2')).toBe(true);
    expect(hasLoggedInHint('np_logged_in=0')).toBe(false);
    expect(hasLoggedInHint('x_np_logged_in=1')).toBe(false);
    expect(hasLoggedInHint('')).toBe(false);
  });
});

describe('start-up', () => {
  it('without the np_logged_in cookie: signed out, no request at all', async () => {
    const tab = openTab();
    expect(await tab.client.getSession()).toBeNull();
    expect(await tab.client.currentUser()).toBeNull();
    expect(tab.calls).toHaveLength(0);
  });

  it('with the cookie: ONE refresh shared by every concurrent caller (single-flight per tab)', async () => {
    const tab = openTab({ cookie: 'np_logged_in=1' });
    tab.replies.set('refresh', [session('t1')]);
    const results = await Promise.all([
      tab.client.getAccessToken(),
      tab.client.getAccessToken(),
      tab.client.hasSession(),
      tab.client.getSession(),
    ]);
    expect(results).toEqual(['t1', 't1', true, { accessToken: 't1' }]);
    expect(tab.calls.map((c) => c.path)).toEqual(['refresh']);
  });

  it('auth calls are same-origin with credentials and the CSRF header, never with a body token', async () => {
    const tab = openTab({ cookie: 'np_logged_in=1' });
    tab.replies.set('refresh', [session('t1')]);
    await tab.client.getAccessToken();
    const { init } = tab.calls[0];
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
    expect(init.headers).toEqual({ 'X-Requested-With': 'nusantara-play' });
    expect(init.body).toBeUndefined();
  });
});

describe('stale np_logged_in hint (the middleware let a protected page through)', () => {
  it('the start-up refresh gets 401: signed out, and the protected page goes to the login with its target', async () => {
    const tab = openTab({ cookie: 'np_logged_in=1', pathname: '/jelajah', search: '' });
    tab.replies.set('refresh', [{ status: 401, body: { error: 'invalid_refresh_token' } }]);
    expect(await tab.client.getSession()).toBeNull();
    expect(tab.location.assign).toHaveBeenCalledWith('/login?redirectTo=%2Fjelajah&reason=jelajah');
  });

  it('on a public page it only signs out', async () => {
    const tab = openTab({ cookie: 'np_logged_in=1', pathname: '/' });
    tab.replies.set('refresh', [{ status: 401, body: { error: 'invalid_refresh_token' } }]);
    expect(await tab.client.getSession()).toBeNull();
    expect(tab.location.assign).not.toHaveBeenCalled();
  });
});

describe('sign-in', () => {
  it('keeps the token in memory only and tells other tabs (event type only)', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    const events: string[] = [];
    tab.client.onChange((e) => events.push(e));
    expect(await tab.client.signIn('a@example.test', 'rahasia123')).toEqual({ error: null });
    expect(await tab.client.getAccessToken()).toBe('t1');
    expect(JSON.parse(String(tab.calls[0].init.body))).toEqual({ email: 'a@example.test', password: 'rahasia123' });
    expect(events).toEqual(['signed-in']);
    expect(FakeChannel.posted).toEqual([{ type: 'signed-in' }]);
    expect(JSON.stringify(FakeChannel.posted)).not.toMatch(/t1|a@example|rahasia/);
  });

  it.each([
    [{ status: 401, body: { message: 'Invalid email or password' } }, 'invalid_credentials', 'Email atau kata sandi salah.'],
    [{ status: 403, body: {} }, 'account_unavailable', expect.stringContaining('tidak dapat masuk')],
    [{ status: 429, body: { message: 'Too many login attempts. Try again later.' } }, 'rate_limited', 'Terlalu banyak percobaan. Coba lagi nanti.'],
    [{ status: 503, body: {} }, 'unavailable', expect.stringContaining('tidak tersedia')],
    [{ status: -1 }, 'unavailable', expect.stringContaining('koneksi')],
  ])('maps %j to %s', async (reply, code, message) => {
    const tab = openTab();
    tab.replies.set('login', [reply as Reply]);
    const { error } = await tab.client.signIn('a@example.test', 'x');
    expect(error).toEqual({ code, message });
    expect(await tab.client.getAccessToken()).toBeNull();
  });

  it('lockout: 429 login_locked with the remaining time in minutes (rounded up)', async () => {
    const tab = openTab();
    tab.replies.set('login', [
      { status: 429, body: { code: 'login_locked', retryAfterSeconds: 841 }, headers: { 'Retry-After': '841' } },
    ]);
    const { error } = await tab.client.signIn('a@example.test', 'x');
    expect(error).toEqual({
      code: 'locked',
      message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
      retryAfterSeconds: 841,
    });
  });
});

describe('expiry, 401 and refresh', () => {
  it('a request refused with 401 gets ONE refresh and the new token (the caller retries once)', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('refresh', [session('t2')]);
    await tab.client.signIn('a@example.test', 'x');
    expect(await tab.client.handleUnauthorized()).toBe('t2');
    expect(await tab.client.getAccessToken()).toBe('t2');
    expect(tab.location.assign).not.toHaveBeenCalled();
  });

  it('parallel 401s share one refresh', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('refresh', [session('t2')]);
    await tab.client.signIn('a@example.test', 'x');
    const tokens = await Promise.all([tab.client.handleUnauthorized(), tab.client.handleUnauthorized()]);
    expect(tokens).toEqual(['t2', 't2']);
    expect(tab.calls.filter((c) => c.path === 'refresh')).toHaveLength(1);
  });

  it('refresh 401 = session over: signed out, other tabs told, protected page → /login with redirectTo', async () => {
    const tab = openTab({ pathname: '/jelajah/aceh', search: '?debug=1' });
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('refresh', [{ status: 401, body: { error: 'invalid_refresh_token' } }]);
    await tab.client.signIn('a@example.test', 'x');
    const events: string[] = [];
    tab.client.onChange((e) => events.push(e));
    expect(await tab.client.handleUnauthorized()).toBeNull();
    expect(await tab.client.getAccessToken()).toBeNull();
    expect(events).toEqual(['signed-out']);
    expect(FakeChannel.posted.at(-1)).toEqual({ type: 'signed-out' });
    expect(tab.location.assign).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fjelajah%2Faceh%3Fdebug%3D1&reason=jelajah',
    );
  });

  it('refresh 401 on a public page: signed out, but no redirect', async () => {
    const tab = openTab({ pathname: '/prot' });
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('refresh', [{ status: 401, body: { error: 'invalid_refresh_token' } }]);
    await tab.client.signIn('a@example.test', 'x');
    expect(await tab.client.handleUnauthorized()).toBeNull();
    expect(tab.location.assign).not.toHaveBeenCalled();
  });

  it('409 refresh_conflict: waits briefly and retries once, no logout', async () => {
    const tab = openTab({ cookie: 'np_logged_in=1' });
    tab.replies.set('refresh', [{ status: 409, body: { error: 'refresh_conflict' } }, session('t2')]);
    const pending = tab.client.getAccessToken();
    await vi.advanceTimersByTimeAsync(60);
    expect(await pending).toBe('t2');
    expect(tab.calls.map((c) => c.path)).toEqual(['refresh', 'refresh']);
  });

  it('409 twice or an offline refresh never signs out (the current token is kept while valid)', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    await tab.client.signIn('a@example.test', 'x');
    tab.replies.set('refresh', [{ status: 409, body: { error: 'refresh_conflict' } }]);
    const pending = tab.client.handleUnauthorized();
    await vi.advanceTimersByTimeAsync(60);
    expect(await pending).toBe('t1');
    tab.replies.set('refresh', [{ status: -1 }]);
    expect(await tab.client.handleUnauthorized()).toBe('t1');
    expect(FakeChannel.posted).toEqual([{ type: 'signed-in' }]);
    expect(tab.location.assign).not.toHaveBeenCalled();
  });

  it('an expired token is refreshed before it is handed out', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1', 2)]);
    tab.replies.set('refresh', [session('t2')]);
    await tab.client.signIn('a@example.test', 'x');
    vi.setSystemTime(Date.now() + 3_000);
    expect(await tab.client.getAccessToken()).toBe('t2');
  });
});

describe('proactive refresh', () => {
  it('refreshes ~60 s before expiry while the tab is visible', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1', 900)]);
    tab.replies.set('refresh', [session('t2', 900)]);
    await tab.client.signIn('a@example.test', 'x');
    await vi.advanceTimersByTimeAsync(839_000);
    expect(tab.calls.filter((c) => c.path === 'refresh')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(tab.calls.filter((c) => c.path === 'refresh')).toHaveLength(1);
    expect(await tab.client.getAccessToken()).toBe('t2');
  });

  it('a hidden tab waits and refreshes when it becomes visible again', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1', 900)]);
    tab.replies.set('refresh', [session('t2', 900)]);
    await tab.client.signIn('a@example.test', 'x');
    tab.doc.visibilityState = 'hidden';
    await vi.advanceTimersByTimeAsync(845_000);
    expect(tab.calls.filter((c) => c.path === 'refresh')).toHaveLength(0);
    tab.doc.visibilityState = 'visible';
    tab.doc.fire();
    await vi.advanceTimersByTimeAsync(0);
    expect(tab.calls.filter((c) => c.path === 'refresh')).toHaveLength(1);
  });
});

describe('two tabs', () => {
  it('sign-out in one tab signs the other out without a request', async () => {
    const a = openTab();
    const b = openTab({ cookie: 'np_logged_in=1' });
    a.replies.set('login', [session('a1')]);
    a.replies.set('logout', [{ status: 204 }]);
    b.replies.set('refresh', [session('b1')]);
    await a.client.signIn('a@example.test', 'x');
    expect(await b.client.getAccessToken()).toBe('b1');
    const events: string[] = [];
    b.client.onChange((e) => events.push(e));
    const before = b.calls.length;
    await a.client.signOut();
    expect(await a.client.getAccessToken()).toBeNull();
    expect(events).toEqual(['signed-out']);
    b.doc.cookie = '';
    expect(await b.client.getAccessToken()).toBeNull();
    expect(b.calls.length).toBe(before);
    // b is on /jelajah (protected): it goes to the login with its target (Phase 18 rules).
    expect(b.location.assign).toHaveBeenCalledWith('/login?redirectTo=%2Fjelajah&reason=jelajah');
    // a signed out with its own button: no redirect from the session (the UI goes to /).
    expect(a.location.assign).not.toHaveBeenCalled();
  });

  it('another tab signing out does not move a public page', async () => {
    const a = openTab();
    const b = openTab({ pathname: '/main/congklak' });
    a.replies.set('login', [session('a1')]);
    a.replies.set('logout', [{ status: 204 }]);
    await a.client.signIn('a@example.test', 'x');
    await b.client.getAccessToken();
    await a.client.signOut();
    expect(b.location.assign).not.toHaveBeenCalled();
  });

  it('sign-in in one tab is picked up by the other (one refresh with the shared cookie)', async () => {
    const a = openTab();
    const b = openTab();
    a.replies.set('login', [session('a1')]);
    b.replies.set('refresh', [session('b1')]);
    expect(await b.client.getAccessToken()).toBeNull();
    const events: string[] = [];
    b.client.onChange((e) => events.push(e));
    await a.client.signIn('a@example.test', 'x');
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['signed-in']);
    expect(await b.client.getAccessToken()).toBe('b1');
  });

  it('falls back to the storage event without BroadcastChannel (event type only)', async () => {
    const storage = new Map<string, string>();
    const listeners: ((e: StorageEvent) => void)[] = [];
    const { openTabChannel } = await import('@/lib/auth/local/broadcast');
    const received: string[] = [];
    const env = {
      localStorage: { setItem: (k: string, v: string) => storage.set(k, v) },
      addEventListener: (_t: 'storage', l: (e: StorageEvent) => void) => listeners.push(l),
      removeEventListener: () => {},
    };
    const sender = openTabChannel(env, () => {});
    openTabChannel(env, (m) => received.push(m));
    sender.post('signed-out');
    const value = storage.get(TAB_STORAGE_KEY)!;
    expect(value).toMatch(/^signed-out:\d+:0$/);
    listeners[1]({ key: TAB_STORAGE_KEY, newValue: value } as StorageEvent);
    listeners[1]({ key: 'other', newValue: 'signed-in:1:1' } as StorageEvent);
    expect(received).toEqual(['signed-out']);
    expect(TAB_CHANNEL).toBe('np-auth-v1');
  });
});

describe('sign-out and other calls', () => {
  it('sign-out posts /logout, clears memory and the hint cookie, tells other tabs', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('logout', [{ status: 204 }]);
    await tab.client.signIn('a@example.test', 'x');
    tab.doc.cookie = 'np_logged_in=1';
    await tab.client.signOut();
    expect(tab.calls.at(-1)?.path).toBe('logout');
    expect(tab.doc.cookie).toBe('np_logged_in=; Path=/; Max-Age=0; SameSite=Lax');
    expect(await tab.client.getAccessToken()).toBeNull();
    expect(FakeChannel.posted.at(-1)).toEqual({ type: 'signed-out' });
    expect(tab.client.afterSignOutPath).toBe('/');
  });

  it('sign-out still ends the local session when the request fails (offline)', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('logout', [{ status: -1 }]);
    await tab.client.signIn('a@example.test', 'x');
    await tab.client.signOut();
    expect(await tab.client.getAccessToken()).toBeNull();
  });

  it('logout-all sends the access token and the CSRF header', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    tab.replies.set('logout-all', [{ status: 204 }]);
    await tab.client.signIn('a@example.test', 'x');
    expect(await tab.client.signOutEverywhere()).toEqual({ error: null });
    const init = tab.calls.at(-1)!.init;
    expect(init.headers).toEqual({ 'X-Requested-With': 'nusantara-play', Authorization: 'Bearer t1' });
    expect(await tab.client.getAccessToken()).toBeNull();
  });

  it('currentUser = GET /users/me while signed in (role from the backend)', async () => {
    const tab = openTab();
    tab.replies.set('login', [session('t1')]);
    await tab.client.signIn('a@example.test', 'x');
    expect(await tab.client.currentUser()).toEqual(USER);
    expect(tab.fetchCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('register sends full_name and answers the same for every 201', async () => {
    const tab = openTab();
    tab.replies.set('register', [{ status: 201, body: { success: true } }]);
    expect(await tab.client.signUp({ email: 'a@example.test', password: 'rahasia123', fullName: 'Uji' })).toEqual({
      error: null,
    });
    expect(JSON.parse(String(tab.calls[0].init.body))).toEqual({
      email: 'a@example.test',
      password: 'rahasia123',
      full_name: 'Uji',
    });
    tab.replies.set('register', [{ status: 400, body: { message: 'Password must be at least 8 characters long' } }]);
    expect((await tab.client.signUp({ email: 'a@example.test', password: 'x' })).error).toEqual({
      code: 'policy',
      message: 'Kata sandi minimal 8 karakter.',
    });
  });

  it.each([
    ['used', 'Tautan ini sudah pernah dipakai.'],
    ['expired', 'Tautan ini sudah kedaluwarsa.'],
    [undefined, 'Tautan ini tidak valid.'],
  ])('verify-email: invalid_or_expired_token reason %s', async (reason, message) => {
    const tab = openTab();
    tab.replies.set('verify-email', [{ status: 400, body: { code: 'invalid_or_expired_token', reason } }]);
    expect((await tab.client.verifyEmail('tok')).error).toEqual({
      code: 'invalid_token',
      message,
      tokenReason: reason ?? 'invalid',
    });
  });

  it('forgot-password, resend-verification and reset-password', async () => {
    const tab = openTab();
    tab.replies.set('forgot-password', [{ status: 200, body: {} }]);
    tab.replies.set('resend-verification', [{ status: 400, body: { message: ['email must be an email'] } }]);
    tab.replies.set('reset-password', [{ status: 200, body: {} }]);
    expect(await tab.client.requestPasswordReset('a@example.test')).toEqual({ error: null });
    expect((await tab.client.resendVerification('nope')).error?.code).toBe('validation');
    expect(await tab.client.resetPassword('tok', 'rahasia-baru')).toEqual({ error: null });
    expect(JSON.parse(String(tab.calls.at(-1)!.init.body))).toEqual({ token: 'tok', newPassword: 'rahasia-baru' });
  });
});
