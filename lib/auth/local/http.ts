/**
 * HTTP layer of the local login (Phase 29). Every auth call goes to the SAME-ORIGIN path `/backend-api/auth/*`
 * (the Vercel / Next rewrite to the backend), with `credentials: "include"` and the CSRF header the backend's
 * cookie endpoints need. Never logs anything (no tokens, passwords or emails), never throws.
 */
import type { AuthError, AuthUser, TokenReason } from '@/lib/auth/types';

export const AUTH_PATH = '/backend-api/auth';
export const CSRF_HEADER = { 'X-Requested-With': 'nusantara-play' } as const;

export interface AuthResponse {
  /** HTTP status; 0 = no answer (network error, offline). */
  status: number;
  body: Record<string, unknown> | null;
  /** `Retry-After` in seconds, when the backend sent one. */
  retryAfter: number | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function authRequest(
  fetchImpl: FetchLike,
  origin: string,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; accessToken?: string | null } = {},
): Promise<AuthResponse> {
  const headers: Record<string, string> = { ...CSRF_HEADER };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers['Authorization'] = `Bearer ${options.accessToken}`;
  let response: Response;
  try {
    response = await fetchImpl(`${origin}${AUTH_PATH}/${path}`, {
      method: options.method ?? 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    return { status: 0, body: null, retryAfter: null };
  }
  let body: Record<string, unknown> | null = null;
  try {
    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    body = null;
  }
  const retryHeader = Number(response.headers.get('retry-after'));
  return {
    status: response.status,
    body,
    retryAfter: Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null,
  };
}

/** `{ accessToken, expiresIn, user }` of login and refresh, or null when the body is not that. */
export function readSessionBody(
  body: Record<string, unknown> | null,
): { accessToken: string; expiresIn: number; user: AuthUser } | null {
  if (!body) return null;
  const { accessToken, expiresIn, user } = body;
  if (typeof accessToken !== 'string' || !accessToken) return null;
  if (typeof expiresIn !== 'number' || !(expiresIn > 0)) return null;
  if (!user || typeof user !== 'object') return null;
  return { accessToken, expiresIn, user: user as AuthUser };
}

// ------------------------------------------------------------------ messages (Indonesian, shown as they are)

export const MESSAGES = {
  invalidCredentials: 'Email atau kata sandi salah.',
  locked: (minutes: number) => `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`,
  rateLimited: 'Terlalu banyak percobaan. Coba lagi nanti.',
  accountUnavailable: 'Akun ini tidak dapat masuk. Hubungi admin jika menurutmu ini keliru.',
  unavailable: 'Layanan masuk sedang tidak tersedia. Coba lagi nanti.',
  offline: 'Tidak dapat terhubung ke server. Periksa koneksi internet kamu lalu coba lagi.',
  invalidInput: 'Periksa kembali data yang kamu isi.',
  invalidEmail: 'Masukkan alamat email yang valid.',
  passwordTooShort: 'Kata sandi minimal 8 karakter.',
  passwordTooLong: 'Kata sandi maksimal 128 karakter.',
  passwordEqualsEmail: 'Kata sandi tidak boleh sama dengan email.',
  tokenUsed: 'Tautan ini sudah pernah dipakai.',
  tokenExpired: 'Tautan ini sudah kedaluwarsa.',
  tokenInvalid: 'Tautan ini tidak valid.',
  unknown: 'Terjadi kesalahan. Coba lagi.',
} as const;

/** Backend policy messages (`auth-users.ts` POLICY_MESSAGES) → Indonesian; null when it is not one. */
export function policyMessage(message: unknown): string | null {
  if (typeof message !== 'string') return null;
  if (/at least 8 characters/i.test(message)) return MESSAGES.passwordTooShort;
  if (/at most 128 characters/i.test(message)) return MESSAGES.passwordTooLong;
  if (/same as the email/i.test(message)) return MESSAGES.passwordEqualsEmail;
  return null;
}

function err(code: AuthError['code'], message: string, extra: Partial<AuthError> = {}): AuthError {
  return { code, message, ...extra };
}

/** Errors every auth endpoint shares (no answer, 429, 503, 5xx). */
function common(response: AuthResponse): AuthError | null {
  if (response.status === 0) return err('unavailable', MESSAGES.offline);
  if (response.status === 429) return err('rate_limited', MESSAGES.rateLimited);
  if (response.status === 503 || response.status >= 500) return err('unavailable', MESSAGES.unavailable);
  return null;
}

/** POST /auth/login. */
export function loginError(response: AuthResponse): AuthError {
  if (response.status === 429 && response.body?.code === 'login_locked') {
    const seconds = Number(response.body.retryAfterSeconds) || response.retryAfter || 15 * 60;
    return err('locked', MESSAGES.locked(Math.max(1, Math.ceil(seconds / 60))), { retryAfterSeconds: seconds });
  }
  if (response.status === 401) return err('invalid_credentials', MESSAGES.invalidCredentials);
  if (response.status === 403) return err('account_unavailable', MESSAGES.accountUnavailable);
  if (response.status === 400) return err('validation', MESSAGES.invalidInput);
  return common(response) ?? err('unknown', MESSAGES.unknown);
}

/** POST /auth/register and /auth/reset-password (password policy, then the token for reset). */
export function passwordFormError(response: AuthResponse): AuthError {
  const tokenError = emailTokenError(response);
  if (tokenError) return tokenError;
  if (response.status === 400) {
    const policy = policyMessage(response.body?.message);
    return policy ? err('policy', policy) : err('validation', MESSAGES.invalidInput);
  }
  return common(response) ?? err('unknown', MESSAGES.unknown);
}

/** 400 `invalid_or_expired_token` (+ `reason` since Phase 29) of verify-email and reset-password, else null. */
export function emailTokenError(response: AuthResponse): AuthError | null {
  if (response.status !== 400 || response.body?.code !== 'invalid_or_expired_token') return null;
  const reason: TokenReason =
    response.body.reason === 'used' || response.body.reason === 'expired' ? response.body.reason : 'invalid';
  const message =
    reason === 'used' ? MESSAGES.tokenUsed : reason === 'expired' ? MESSAGES.tokenExpired : MESSAGES.tokenInvalid;
  return err('invalid_token', message, { tokenReason: reason });
}

/** POST /auth/verify-email. */
export function verifyEmailError(response: AuthResponse): AuthError {
  return emailTokenError(response) ?? common(response) ?? err('unknown', MESSAGES.unknown);
}

/** POST /auth/forgot-password and /auth/resend-verification (always 200 unless the input is invalid). */
export function emailOnlyError(response: AuthResponse): AuthError {
  if (response.status === 400) return err('validation', MESSAGES.invalidEmail);
  return common(response) ?? err('unknown', MESSAGES.unknown);
}
