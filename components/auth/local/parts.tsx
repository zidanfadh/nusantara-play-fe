'use client';

/**
 * Shared pieces of the local-login pages (Phase 29), in the auth pages' existing design (Phase 27/28 tokens,
 * the same input and button classes as LoginForm / SignupForm).
 */
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { passwordRules } from '@/lib/auth/password-policy';
import {
  PREFILL_EMAIL_KEY,
  RESEND_CHANGE_EVENT,
  parseSends,
  peekPrefillEmail,
  rawSends,
  recordSend,
  resendWait,
  type ResendPurpose,
  type StorageLike,
} from '@/lib/auth/resend-limit';

export const inputClass =
  'w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50';
export const PRIMARY_BUTTON_CLASS =
  'w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
export const SECONDARY_BUTTON_CLASS =
  'w-full py-2 px-4 border border-border text-foreground font-medium rounded-md hover:bg-muted transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed';
export const LINK_CLASS = 'text-primary-text font-medium hover:underline';

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="text-center sm:text-left">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

/** A message box: `alert` for errors (announced at once), `status` for information and success. */
export function AuthMessage({
  tone,
  children,
  testId,
}: {
  tone: 'error' | 'info' | 'success';
  children: ReactNode;
  testId?: string;
}) {
  const style =
    tone === 'error'
      ? 'border-danger/40 bg-danger-soft text-danger-soft-foreground'
      : tone === 'success'
        ? 'border-success/40 bg-success-soft text-success-soft-foreground'
        : 'border-border bg-muted text-foreground';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-auth-message={tone}
      data-testid={testId}
      className={`rounded-md border px-3 py-2 text-sm leading-relaxed ${style}`}
    >
      {children}
    </div>
  );
}

export function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1 text-foreground">
        {label}
      </label>
      {children}
      {hint}
    </div>
  );
}

/** The password rules, visible before submitting; each rule says met / not met in text, not only colour. */
export function PasswordRules({ id, password, email }: { id: string; password: string; email: string }) {
  const rules = passwordRules(password, email);
  return (
    <ul id={id} className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Syarat kata sandi">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-center gap-1.5" data-rule={rule.id} data-ok={rule.ok}>
          {rule.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span>
            {rule.label}
            <span className="sr-only">{rule.ok ? ' (terpenuhi)' : ' (belum terpenuhi)'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function sessionStore(): (StorageLike & { removeItem(key: string): void }) | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const subscribeResend = (onChange: () => void) => {
  window.addEventListener(RESEND_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(RESEND_CHANGE_EVENT, onChange);
};
const noSubscribe = () => () => {};

/**
 * The email handed over from the previous auth page (sessionStorage of this tab; null during the server render
 * and hydration, then the stored value or ""). `clearPrefillEmail()` removes it once a request succeeded.
 */
export function usePrefillEmail(): string | null {
  return useSyncExternalStore(noSubscribe, () => peekPrefillEmail(sessionStore()), () => null);
}

export function clearPrefillEmail(): void {
  try {
    sessionStore()?.removeItem(PREFILL_EMAIL_KEY);
  } catch {
    // ignore
  }
}

/**
 * "Kirim ulang" with a countdown (60 s between sends, at most 3 per hour, like the backend's limit). Asks for
 * the email when none is known. `send` returns an error message or null.
 */
export function ResendEmail({
  purpose,
  initialEmail,
  label,
  send,
}: {
  purpose: ResendPurpose;
  initialEmail: string;
  label: string;
  send: (email: string) => Promise<string | null>;
}) {
  const emailId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [now, setNow] = useState(() => Date.now());
  // Stored send times (sessionStorage; "[]" on the server and during hydration).
  const raw = useSyncExternalStore(subscribeResend, () => rawSends(sessionStore(), purpose), () => '[]');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const askEmail = !initialEmail;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const wait = resendWait(parseSends(raw, now), now);

  const onSend = async () => {
    if (!email.trim() || wait.seconds > 0) return;
    setBusy(true);
    setMessage(null);
    const error = await send(email.trim());
    setBusy(false);
    if (error) {
      setMessage({ tone: 'error', text: error });
      return;
    }
    const at = Date.now();
    recordSend(sessionStore(), purpose, at);
    setNow(at);
    setMessage({ tone: 'success', text: 'Tautan baru sudah dikirim jika alamat ini terdaftar. Cek kotak masuk dan folder spam.' });
  };

  const minutes = Math.ceil(wait.seconds / 60);
  return (
    <div className="space-y-3" data-resend={purpose}>
      {askEmail && (
        <Field id={emailId} label="Email">
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="nama@email.com"
          />
        </Field>
      )}
      <button
        type="button"
        onClick={onSend}
        disabled={busy || wait.seconds > 0 || !email.trim()}
        className={SECONDARY_BUTTON_CLASS}
        aria-describedby={wait.seconds > 0 ? `${emailId}-wait` : undefined}
      >
        {busy ? 'Mengirim...' : label}
      </button>
      {wait.seconds > 0 && (
        <p id={`${emailId}-wait`} className="text-center text-xs text-muted-foreground" data-resend-wait>
          {wait.limitReached
            ? `Batas pengiriman tercapai. Coba lagi dalam ${minutes} menit.`
            : `Kirim ulang tersedia dalam ${wait.seconds} detik.`}
        </p>
      )}
      {message && <AuthMessage tone={message.tone}>{message.text}</AuthMessage>}
    </div>
  );
}

export function BackToLogin({ href = '/login' }: { href?: string }) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      <Link href={href} className={LINK_CLASS}>
        Kembali ke halaman masuk
      </Link>
    </p>
  );
}

export { sessionStore };
