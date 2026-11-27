'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/lib/auth/types';
import { AuthMessage, ResendEmail, SECONDARY_BUTTON_CLASS } from './parts';

/**
 * Profile panel of the self-hosted login (Phase 29, local mode only): email verification status with a resend
 * button, and "Keluar dari semua perangkat" (backend `POST /auth/logout-all`).
 */
export function AccountSecurity({ user }: { user: AuthUser }) {
  const { client } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOutEverywhere = async () => {
    setBusy(true);
    setError(null);
    const result = await client.signOutEverywhere();
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push(client.afterSignOutPath);
    router.refresh();
  };

  return (
    <section
      aria-labelledby="account-security-title"
      data-account-security
      className="rounded-xl border border-border bg-surface p-6 space-y-5"
    >
      <h2 id="account-security-title" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <ShieldCheck className="h-5 w-5 text-primary-text" aria-hidden />
        Keamanan akun
      </h2>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Status email</p>
        {user.emailVerified ? (
          <AuthMessage tone="success">Email kamu sudah terverifikasi.</AuthMessage>
        ) : (
          <>
            <AuthMessage tone="info" testId="email-unverified">
              Email kamu belum diverifikasi. Beberapa fitur memerlukan email yang terverifikasi.
            </AuthMessage>
            <ResendEmail
              purpose="verification"
              initialEmail={user.email}
              label="Kirim ulang email verifikasi"
              send={async (address) => (await client.resendVerification(address)).error?.message ?? null}
            />
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <p className="text-sm font-medium text-foreground">Perangkat</p>
        <p className="text-sm text-muted-foreground">
          Keluar dari akun ini di semua perangkat dan browser, termasuk yang sedang kamu pakai.
        </p>
        <button type="button" onClick={signOutEverywhere} disabled={busy} className={SECONDARY_BUTTON_CLASS}>
          {busy ? 'Memproses...' : 'Keluar dari semua perangkat'}
        </button>
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
      </div>
    </section>
  );
}
