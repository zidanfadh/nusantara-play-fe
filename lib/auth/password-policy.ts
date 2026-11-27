/**
 * The self-hosted login's password rules (Phase 29), identical to the backend's `checkPasswordPolicy()`
 * (nusantara-play-be `password.service.ts`): 8 to 128 characters (Unicode code points) and not equal to the
 * email (case-insensitive, surrounding whitespace ignored). Shown before submit; the backend checks again.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  id: 'min' | 'max' | 'not-email';
  label: string;
  ok: boolean;
}

export function passwordRules(password: string, email: string): PasswordRule[] {
  const length = [...password].length;
  const sameAsEmail =
    email.trim() !== '' && password.trim().toLowerCase() === email.trim().toLowerCase();
  return [
    { id: 'min', label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`, ok: length >= PASSWORD_MIN_LENGTH },
    { id: 'max', label: `Maksimal ${PASSWORD_MAX_LENGTH} karakter`, ok: length <= PASSWORD_MAX_LENGTH },
    { id: 'not-email', label: 'Tidak sama dengan email', ok: password.length > 0 && !sameAsEmail },
  ];
}

/** The first broken rule as an Indonesian sentence, or null when the password is acceptable. */
export function passwordProblem(password: string, email: string): string | null {
  const length = [...password].length;
  if (length < PASSWORD_MIN_LENGTH) return 'Kata sandi minimal 8 karakter.';
  if (length > PASSWORD_MAX_LENGTH) return 'Kata sandi maksimal 128 karakter.';
  if (email.trim() && password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return 'Kata sandi tidak boleh sama dengan email.';
  }
  return null;
}
