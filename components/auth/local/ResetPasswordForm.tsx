'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { passwordProblem } from '@/lib/auth/password-policy';
import type { TokenReason } from '@/lib/auth/types';
import { AuthHeading, AuthMessage, BackToLogin, Field, inputClass, PRIMARY_BUTTON_CLASS, PasswordRules } from './parts';

/**
 * The page the reset email links to (`/reset-password?token=…`, Phase 29, local mode). The token is used only on
 * submit (an email scanner opening the link changes nothing). A successful reset signs every session out
 * (backend), so the user signs in again with the new password.
 */
export function ResetPasswordForm({ token: initialToken }: { token: string | null }) {
  const { client } = useAuth();
  const [token] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenFailed, setTokenFailed] = useState<TokenReason | null>(initialToken ? null : 'invalid');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Keep the token in memory only; remove it from the address bar (history, referrer).
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('token')) {
        url.searchParams.delete('token');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // ignore
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    // The email is unknown here; the backend also refuses a password equal to the account's email.
    const problem = passwordProblem(password, '');
    if (problem) {
      setError(problem);
      return;
    }
    if (!token) return;
    setBusy(true);
    const result = await client.resetPassword(token, password);
    setBusy(false);
    if (!result.error) {
      // The old session (if this browser had one) was revoked by the reset: end it here too.
      await client.signOut().catch(() => {});
      setDone(true);
    } else if (result.error.code === 'invalid_token') {
      setTokenFailed(result.error.tokenReason ?? 'invalid');
    } else {
      setError(result.error.message);
    }
  };

  if (done) {
    return (
      <div className="space-y-6 w-full max-w-sm" data-auth-page="reset-password-done">
        <AuthHeading title="Kata sandi diperbarui" />
        <AuthMessage tone="success">
          Kata sandi barumu sudah disimpan. Demi keamanan, semua perangkat yang tadinya masuk ke akunmu sudah
          dikeluarkan. Silakan masuk lagi dengan kata sandi baru.
        </AuthMessage>
        <Link href="/login" className={`block ${PRIMARY_BUTTON_CLASS} text-center`}>
          Masuk
        </Link>
      </div>
    );
  }

  if (tokenFailed) {
    return (
      <div className="space-y-6 w-full max-w-sm" data-auth-page="reset-password-invalid" data-token-reason={tokenFailed}>
        <AuthHeading
          title={tokenFailed === 'used' ? 'Tautan sudah dipakai' : tokenFailed === 'expired' ? 'Tautan kedaluwarsa' : 'Tautan tidak valid'}
        />
        <AuthMessage tone="error">
          {tokenFailed === 'used'
            ? 'Tautan ini sudah pernah dipakai untuk mengatur kata sandi.'
            : tokenFailed === 'expired'
              ? 'Tautan ini sudah kedaluwarsa (berlaku 1 jam).'
              : 'Tautan ini tidak valid atau sudah diganti dengan tautan yang lebih baru.'}{' '}
          Minta tautan baru untuk mengatur kata sandi.
        </AuthMessage>
        <Link href="/forgot-password" className={`block ${PRIMARY_BUTTON_CLASS} text-center`}>
          Minta tautan baru
        </Link>
        <BackToLogin />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-sm" data-auth-page="reset-password">
      <AuthHeading title="Atur kata sandi baru" subtitle="Pilih kata sandi baru untuk akunmu." />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          id="new-password"
          label="Kata sandi baru"
          hint={<PasswordRules id="new-password-rules" password={password} email="" />}
        >
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="new-password-rules"
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        <Field id="confirm-new-password" label="Konfirmasi kata sandi baru">
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
          {busy ? 'Menyimpan...' : 'Simpan kata sandi'}
        </button>
      </form>
      <BackToLogin />
    </div>
  );
}
