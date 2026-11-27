/**
 * Prefill of an email field between the auth pages (Phase 29): sessionStorage of this tab, never in a URL.
 * Tiny on purpose: the login form imports it statically (the write must happen before the next page reads it).
 */
export const PREFILL_EMAIL_KEY = 'np_auth_email_prefill_v1';

export function storePrefillEmail(storage: { setItem(key: string, value: string): void } | null, email: string): void {
  try {
    if (email.trim()) storage?.setItem(PREFILL_EMAIL_KEY, email.trim());
  } catch {
    // ignore
  }
}
