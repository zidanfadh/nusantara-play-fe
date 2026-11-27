'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { recordSend } from '@/lib/auth/resend-limit';
import {
  AuthHeading,
  AuthMessage,
  BackToLogin,
  clearPrefillEmail,
  Field,
  inputClass,
  PRIMARY_BUTTON_CLASS,
  ResendEmail,
  sessionStore,
  usePrefillEmail,
} from './parts';

/**
 * "Lupa kata sandi" (Phase 29, local mode). Also the one-time path for LEGACY accounts (created with the old
 * login, `legacy`): the reset email lets them set a password for the new login. The answer is always the same,
 * so the page never says whether the email has an account.
 */
export function ForgotPasswordForm({ legacy = false }: { legacy?: boolean }) {
  const { client } = useAuth();
  // Pre-filled from the login form (sessionStorage; never in the URL) until the visitor types.
  const prefill = usePrefillEmail();
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? prefill ?? '';
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (address: string) => (await client.requestPasswordReset(address)).error?.message ?? null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await request(email.trim());
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    recordSend(sessionStore(), 'password_reset', Date.now());
    clearPrefillEmail();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-6 w-full max-w-sm" data-auth-page="forgot-password-sent">
        <AuthHeading title="Cek email kamu" />
        <AuthMessage tone="success">
          Jika email tersebut terdaftar, kami sudah mengirim tautan untuk mengatur kata sandi baru. Tautan berlaku
          1 jam dan hanya bisa dipakai sekali. Cek juga folder spam.
        </AuthMessage>
        <ResendEmail purpose="password_reset" initialEmail={email.trim()} label="Kirim ulang tautan" send={request} />
        <BackToLogin />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-sm" data-auth-page={legacy ? 'forgot-password-legacy' : 'forgot-password'}>
      {legacy ? (
        <AuthHeading
          title="Atur kata sandi baru"
          subtitle="Akun lama? Atur kata sandi baru sekali lewat email."
        />
      ) : (
        <AuthHeading title="Lupa kata sandi" subtitle="Kami kirim tautan untuk mengatur kata sandi baru." />
      )}

      {legacy && (
        <AuthMessage tone="info">
          Kami memperbarui sistem masuk. Jika akunmu dibuat sebelum pembaruan ini, atur kata sandi baru sekali
          lewat email. Setelah itu kamu bisa masuk seperti biasa dengan email dan kata sandi barumu.
        </AuthMessage>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="forgot-email" label="Email">
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setTyped(e.target.value)}
            className={inputClass}
            placeholder="nama@email.com"
          />
        </Field>
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
          {busy ? 'Mengirim...' : 'Kirim tautan'}
        </button>
      </form>
      <BackToLogin />
    </div>
  );
}
