/**
 * Client-side pacing of "kirim ulang" buttons (Phase 29). The backend sends at most 3 emails per address per
 * hour per purpose and silently skips the rest (it always answers 200), so the UI waits 60 s between sends and
 * stops after 3 in an hour instead of pretending to send. Only send times are stored (sessionStorage, this tab,
 * try/catch): never the email address.
 */
export type ResendPurpose = 'verification' | 'password_reset';

export const RESEND_COOLDOWN_MS = 60_000;
export const RESEND_WINDOW_MS = 60 * 60_000;
export const RESEND_MAX_PER_WINDOW = 3;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const key = (purpose: ResendPurpose) => `np_resend_${purpose}_v1`;

/** Fired on `window` after a send was recorded (the resend buttons re-read their state). */
export const RESEND_CHANGE_EVENT = 'np:resend-change';

/** The stored value as a string (a stable snapshot for useSyncExternalStore); "[]" when nothing is stored. */
export function rawSends(storage: StorageLike | null, purpose: ResendPurpose): string {
  try {
    return storage?.getItem(key(purpose)) ?? '[]';
  } catch {
    return '[]';
  }
}

/** Send times of the last hour from a stored value. */
export function parseSends(raw: string, now: number): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is number => typeof t === 'number' && t <= now && now - t < RESEND_WINDOW_MS);
  } catch {
    return [];
  }
}

export function readSends(storage: StorageLike | null, purpose: ResendPurpose, now: number): number[] {
  return parseSends(rawSends(storage, purpose), now);
}

export function recordSend(storage: StorageLike | null, purpose: ResendPurpose, now: number): number[] {
  const sends = [...readSends(storage, purpose, now), now];
  try {
    storage?.setItem(key(purpose), JSON.stringify(sends));
  } catch {
    // storage unavailable: the pacing then only lasts while the page is open
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(RESEND_CHANGE_EVENT));
  }
  return sends;
}

/** Seconds until the next send is allowed (0 = now), and whether the hourly limit is the reason. */
export function resendWait(sends: number[], now: number): { seconds: number; limitReached: boolean } {
  if (sends.length >= RESEND_MAX_PER_WINDOW) {
    const oldest = Math.min(...sends);
    return { seconds: Math.max(1, Math.ceil((oldest + RESEND_WINDOW_MS - now) / 1000)), limitReached: true };
  }
  const last = sends.length ? Math.max(...sends) : 0;
  const seconds = Math.ceil((last + RESEND_COOLDOWN_MS - now) / 1000);
  return { seconds: Math.max(0, seconds), limitReached: false };
}

/** Prefill of an email field between the auth pages (sessionStorage, cleared on read; never in a URL). */
export const PREFILL_EMAIL_KEY = 'np_auth_email_prefill_v1';

export function storePrefillEmail(storage: StorageLike | null, email: string): void {
  try {
    if (email.trim()) storage?.setItem(PREFILL_EMAIL_KEY, email.trim());
  } catch {
    // ignore
  }
}

/** Reads the prefill without removing it (a pure snapshot for useSyncExternalStore). */
export function peekPrefillEmail(storage: StorageLike | null): string {
  try {
    return storage?.getItem(PREFILL_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function takePrefillEmail(storage: (StorageLike & { removeItem(key: string): void }) | null): string {
  try {
    const value = storage?.getItem(PREFILL_EMAIL_KEY) ?? '';
    storage?.removeItem(PREFILL_EMAIL_KEY);
    return value;
  } catch {
    return '';
  }
}
