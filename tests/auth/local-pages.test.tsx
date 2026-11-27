/**
 * Phase 29 step 4: the local-login pages and forms (static render, like the other component tests) and their
 * pure helpers (password rules = backend policy, resend pacing). Interactions run in tests/e2e-local/.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { passwordProblem, passwordRules } from '@/lib/auth/password-policy';
import {
  PREFILL_EMAIL_KEY,
  RESEND_COOLDOWN_MS,
  RESEND_WINDOW_MS,
  readSends,
  recordSend,
  resendWait,
  storePrefillEmail,
  takePrefillEmail,
} from '@/lib/auth/resend-limit';

vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'local');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
const client = {
  mode: 'local',
  afterSignOutPath: '/',
  supportsGoogle: false,
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyEmail: vi.fn(() => new Promise(() => {})),
  resetPassword: vi.fn(),
  signOutEverywhere: vi.fn(),
  currentUser: vi.fn(),
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), signedIn: false, client }),
}));

const { LoginForm, LEGACY_ACCOUNT_HINT } = await import('@/components/auth/LoginForm');
const { SignupForm } = await import('@/components/auth/SignupForm');
const { ForgotPasswordForm } = await import('@/components/auth/local/ForgotPasswordForm');
const { ResetPasswordForm } = await import('@/components/auth/local/ResetPasswordForm');
const { VerifyEmailLanding } = await import('@/components/auth/local/VerifyEmailLanding');
const { CheckEmail } = await import('@/components/auth/local/CheckEmail');
const { AccountSecurity } = await import('@/components/auth/local/AccountSecurity');
const { PasswordRules } = await import('@/components/auth/local/parts');

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('login and signup in local mode', () => {
  it('login: no Google button and no "atau lanjut dengan email" divider, a "Lupa kata sandi?" link', () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).not.toContain('Masuk dengan Google');
    expect(html).not.toContain('atau lanjut dengan email');
    expect(html).toMatch(/<a [^>]*href="\/forgot-password"[^>]*>Lupa kata sandi\?<\/a>/);
    expect(html).toContain('autoComplete="current-password"');
  });

  it('login keeps the Phase 18/19 Jelajah notice, the redirect on the signup link and the guest note', () => {
    const html = renderToStaticMarkup(<LoginForm redirectTo="/jelajah" reason="jelajah" />);
    expect(html).toContain('Masuk dulu untuk memulai Tur Virtual');
    expect(html).toContain('href="/signup?redirectTo=%2Fjelajah&amp;reason=jelajah"');
    expect(html).toContain('data-login-guest-note');
    expect(html).not.toContain('Masuk sebagai Tamu');
  });

  it('the legacy hint text is the one the prompt asked for', () => {
    expect(LEGACY_ACCOUNT_HINT).toBe('Akun lama? Atur kata sandi baru sekali lewat email');
  });

  it('signup: a name field, the password rules before submit, no Google', () => {
    const html = renderToStaticMarkup(<SignupForm redirectTo="/jelajah" reason="jelajah" />);
    expect(html).toContain('Nama lengkap');
    expect(html).toContain('autoComplete="name"');
    expect(html).not.toContain('Daftar dengan Google');
    expect(html).toContain('aria-label="Syarat kata sandi"');
    expect(text(html)).toContain('Minimal 8 karakter');
    expect(text(html)).toContain('Maksimal 128 karakter');
    expect(text(html)).toContain('Tidak sama dengan email');
    expect(html).toContain('aria-describedby="password-rules"');
    expect(html).toContain('href="/login?redirectTo=%2Fjelajah&amp;reason=jelajah"');
  });

  it('the password rules state met / not met in text (not colour only)', () => {
    const html = renderToStaticMarkup(<PasswordRules id="r" password="pendek" email="a@b.c" />);
    expect(text(html)).toContain('Minimal 8 karakter (belum terpenuhi)');
    expect(text(html)).toContain('Maksimal 128 karakter (terpenuhi)');
  });
});

describe('email-link and password pages', () => {
  it('forgot password: email field and the generic wording; legacy variant explains the one-time step', () => {
    const plain = renderToStaticMarkup(<ForgotPasswordForm />);
    expect(plain).toContain('Lupa kata sandi');
    expect(plain).toContain('autoComplete="email"');
    const legacy = text(renderToStaticMarkup(<ForgotPasswordForm legacy />));
    expect(legacy).toContain('Akun lama? Atur kata sandi baru sekali lewat email.');
    expect(legacy).toContain('atur kata sandi baru sekali lewat email');
  });

  it('reset password: rules shown; without a token the page asks for a new link', () => {
    const form = renderToStaticMarkup(<ResetPasswordForm token="abc" />);
    expect(form).toContain('Kata sandi baru');
    expect(form).toContain('aria-describedby="new-password-rules"');
    expect(form).toContain('autoComplete="new-password"');
    const missing = renderToStaticMarkup(<ResetPasswordForm token={null} />);
    expect(missing).toContain('data-token-reason="invalid"');
    expect(missing).toContain('href="/forgot-password"');
  });

  it('verify email: "loading" with a token (verified on mount), "invalid" without one', () => {
    expect(renderToStaticMarkup(<VerifyEmailLanding token="abc" />)).toContain('data-verify-state="loading"');
    const invalid = renderToStaticMarkup(<VerifyEmailLanding token={null} />);
    expect(invalid).toContain('data-verify-state="invalid"');
    expect(text(invalid)).toContain('Tautan tidak valid');
  });

  it('"Cek email kamu" keeps the login target', () => {
    const html = renderToStaticMarkup(<CheckEmail loginHref="/login?redirectTo=%2Fjelajah&amp;reason=jelajah" />);
    expect(text(html)).toContain('Cek email kamu');
    expect(html).toContain('data-auth-page="check-email"');
  });

  it('account security: unverified email → resend; verified → confirmation; always "Keluar dari semua perangkat"', () => {
    const base = { id: 'u', email: 'a@example.test', full_name: 'A', role: 'publik' } as never;
    const unverified = renderToStaticMarkup(<AccountSecurity user={{ ...(base as object), emailVerified: false } as never} />);
    expect(unverified).toContain('data-testid="email-unverified"');
    expect(text(unverified)).toContain('Kirim ulang email verifikasi');
    expect(text(unverified)).toContain('Keluar dari semua perangkat');
    const verified = renderToStaticMarkup(<AccountSecurity user={{ ...(base as object), emailVerified: true } as never} />);
    expect(text(verified)).toContain('Email kamu sudah terverifikasi.');
  });

  it('the token pages send no referrer and 404 outside local mode', () => {
    for (const page of ['reset-password', 'verify-email']) {
      const src = readFileSync(join(__dirname, '..', '..', 'app', '(auth)', page, 'page.tsx'), 'utf8');
      expect(src).toContain("referrer: 'no-referrer'");
    }
    for (const page of ['reset-password', 'verify-email', 'forgot-password', 'cek-email']) {
      const src = readFileSync(join(__dirname, '..', '..', 'app', '(auth)', page, 'page.tsx'), 'utf8');
      expect(src).toContain("if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'local') notFound();");
    }
  });
});

describe('password rules = backend policy (8 to 128 code points, not the email)', () => {
  it.each([
    ['1234567', 'a@b.c', 'Kata sandi minimal 8 karakter.'],
    ['12345678', 'a@b.c', null],
    ['x'.repeat(128), 'a@b.c', null],
    ['x'.repeat(129), 'a@b.c', 'Kata sandi maksimal 128 karakter.'],
    [' A@Example.Test ', 'a@example.test', 'Kata sandi tidak boleh sama dengan email.'],
    ['😀😀😀😀😀😀😀', '', 'Kata sandi minimal 8 karakter.'],
    ['😀😀😀😀😀😀😀😀', '', null],
  ])('%j with %j → %j', (password, email, expected) => {
    expect(passwordProblem(password, email)).toBe(expected);
    expect(passwordRules(password, email).every((rule) => rule.ok)).toBe(expected === null);
  });
});

describe('resend pacing (60 s apart, at most 3 per hour, no email stored)', () => {
  const memory = () => {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
  };

  it('waits 60 s after a send, stops after 3 within an hour', () => {
    const store = memory();
    const t0 = 1_000_000_000;
    expect(resendWait(readSends(store, 'verification', t0), t0)).toEqual({ seconds: 0, limitReached: false });
    recordSend(store, 'verification', t0);
    expect(resendWait(readSends(store, 'verification', t0 + 1_000), t0 + 1_000)).toEqual({ seconds: 59, limitReached: false });
    expect(resendWait(readSends(store, 'verification', t0 + RESEND_COOLDOWN_MS), t0 + RESEND_COOLDOWN_MS).seconds).toBe(0);
    recordSend(store, 'verification', t0 + 70_000);
    const sends = recordSend(store, 'verification', t0 + 140_000);
    const wait = resendWait(sends, t0 + 200_000);
    expect(wait.limitReached).toBe(true);
    expect(wait.seconds).toBe(Math.ceil((RESEND_WINDOW_MS - 200_000) / 1000));
    // Other purpose unaffected; an hour later the old sends are forgotten.
    expect(readSends(store, 'password_reset', t0 + 200_000)).toEqual([]);
    expect(readSends(store, 'verification', t0 + RESEND_WINDOW_MS + 150_000)).toEqual([]);
    expect([...store.map.values()].join()).not.toContain('@');
  });

  it('broken or missing storage never throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(readSends(broken, 'verification', 1)).toEqual([]);
    expect(recordSend(broken, 'verification', 1)).toEqual([1]);
    expect(readSends(null, 'verification', 1)).toEqual([]);
    expect(takePrefillEmail(broken)).toBe('');
  });

  it('the email prefill is read once and removed', () => {
    const store = memory();
    storePrefillEmail(store, ' a@example.test ');
    expect(store.map.get(PREFILL_EMAIL_KEY)).toBe('a@example.test');
    expect(takePrefillEmail(store)).toBe('a@example.test');
    expect(takePrefillEmail(store)).toBe('');
  });
});
