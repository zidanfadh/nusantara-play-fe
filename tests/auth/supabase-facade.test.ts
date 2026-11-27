/**
 * Phase 29 step 1: the Supabase implementation behind the auth facade does exactly what the app did before
 * (same Supabase calls, same messages, no retry on 401, no new features).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
  onAuthStateChange: vi.fn(),
};
const getCurrentUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));
vi.mock('@/lib/api/users', () => ({ getCurrentUser: () => getCurrentUser() }));

const { supabaseAuthClient: client } = await import('@/lib/auth/supabase/client');
const { authClient } = await import('@/lib/auth/client');

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  getCurrentUser.mockReset();
});

describe('supabase auth facade', () => {
  it('is the default implementation of this build (NEXT_PUBLIC_AUTH_MODE unset)', () => {
    expect(authClient).toBe(client);
    expect(client.mode).toBe('supabase');
    expect(client.supportsGoogle).toBe(true);
    expect(client.supportsSignOutEverywhere).toBe(false);
    expect(client.afterSignOutPath).toBe('/login');
  });

  it('reads the session and token from supabase.auth.getSession', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    expect(await client.getSession()).toEqual({ accessToken: 'tok' });
    expect(await client.getAccessToken()).toBe('tok');
    auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await client.getSession()).toBeNull();
    expect(await client.getAccessToken()).toBeNull();
  });

  it('checks the session with supabase.auth.getUser (protected layout)', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
    expect(await client.hasSession()).toBe(true);
    auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await client.hasSession()).toBe(false);
  });

  it('currentUser: null without a session, otherwise GET /users/me', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await client.currentUser()).toBeNull();
    expect(getCurrentUser).not.toHaveBeenCalled();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'pakar' });
    expect(await client.currentUser()).toEqual({ id: 'u', role: 'pakar' });
  });

  it('signs in and up with the same Supabase calls and passes Supabase messages through', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    expect(await client.signIn('a@example.test', 'pw')).toEqual({
      error: { code: 'unknown', message: 'Invalid login credentials' },
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.test', password: 'pw' });
    auth.signUp.mockResolvedValue({ error: null });
    expect(await client.signUp({ email: 'a@example.test', password: 'pw', fullName: 'A' })).toEqual({ error: null });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'a@example.test', password: 'pw' });
  });

  it('signs out and starts Google sign-in with the given callback URL', async () => {
    await client.signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await client.signInWithGoogle('http://localhost:3001/auth/callback');
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3001/auth/callback' },
    });
  });

  it('never retries after a 401 and has no local-only features', async () => {
    expect(await client.handleUnauthorized()).toBeNull();
    for (const result of [
      await client.requestPasswordReset('a@example.test'),
      await client.resetPassword('t', 'pw'),
      await client.verifyEmail('t'),
      await client.resendVerification('a@example.test'),
      await client.signOutEverywhere(),
    ]) {
      expect(result.error?.code).toBe('not_supported');
    }
  });

  it('maps Supabase auth events and unsubscribes', () => {
    const unsubscribe = vi.fn();
    let callback: (event: string) => void = () => {};
    auth.onAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      callback = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const events: string[] = [];
    const off = client.onChange((e) => events.push(e));
    for (const e of ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'SIGNED_OUT']) callback(e);
    expect(events).toEqual(['signed-in', 'signed-in', 'refreshed', 'user-changed', 'signed-out']);
    off();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
