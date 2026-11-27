'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { TokenReason } from '@/lib/auth/types';
import { AuthHeading, AuthMessage, BackToLogin, PRIMARY_BUTTON_CLASS, ResendEmail } from './parts';

type State =
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'failed'; reason: TokenReason }
  | { kind: 'error'; message: string };

/** Removes the token from the address bar (history, referrer) once it has been read. */
function forgetTokenInUrl() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // ignore
  }
}

/**
 * The page the verification email links to (`/verify-email?token=…`, Phase 29, local mode): verifies once on
 * arrival and shows success, "already used", "expired" (with a new link) or "invalid".
 */
export function VerifyEmailLanding({ token }: { token: string | null }) {
  const { client, signedIn } = useAuth();
  const [state, setState] = useState<State>(token ? { kind: 'loading' } : { kind: 'failed', reason: 'invalid' });
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // once, also under React's development double effects
    forgetTokenInUrl();
    void client.verifyEmail(token).then(({ error }) => {
      if (!error) setState({ kind: 'success' });
      else if (error.code === 'invalid_token') setState({ kind: 'failed', reason: error.tokenReason ?? 'invalid' });
      else setState({ kind: 'error', message: error.message });
    });
  }, [client, token]);

  const resend = async (address: string) => (await client.resendVerification(address)).error?.message ?? null;

  return (
    <div className="space-y-6 w-full max-w-sm" data-auth-page="verify-email" data-verify-state={state.kind === 'failed' ? state.reason : state.kind}>
      {state.kind === 'loading' && (
        <>
          <AuthHeading title="Memverifikasi email" />
          <AuthMessage tone="info">Sebentar, kami sedang memeriksa tautanmu...</AuthMessage>
        </>
      )}

      {state.kind === 'success' && (
        <>
          <AuthHeading title="Email terverifikasi" />
          <AuthMessage tone="success">Terima kasih! Email kamu sudah terverifikasi.</AuthMessage>
          <Link href={signedIn ? '/menu' : '/login'} className={`block ${PRIMARY_BUTTON_CLASS} text-center`}>
            {signedIn ? 'Lanjut ke Menu' : 'Masuk'}
          </Link>
        </>
      )}

      {state.kind === 'failed' && state.reason === 'used' && (
        <>
          <AuthHeading title="Tautan sudah dipakai" />
          <AuthMessage tone="info">
            Tautan ini sudah pernah dipakai. Jika email kamu sudah terverifikasi, kamu tidak perlu melakukan apa-apa
            lagi.
          </AuthMessage>
          <Link href={signedIn ? '/menu' : '/login'} className={`block ${PRIMARY_BUTTON_CLASS} text-center`}>
            {signedIn ? 'Lanjut ke Menu' : 'Masuk'}
          </Link>
        </>
      )}

      {state.kind === 'failed' && state.reason !== 'used' && (
        <>
          <AuthHeading title={state.reason === 'expired' ? 'Tautan kedaluwarsa' : 'Tautan tidak valid'} />
          <AuthMessage tone="error">
            {state.reason === 'expired'
              ? 'Tautan verifikasi ini sudah kedaluwarsa (berlaku 24 jam).'
              : 'Tautan verifikasi ini tidak valid atau sudah diganti dengan tautan yang lebih baru.'}{' '}
            Minta tautan baru di bawah ini.
          </AuthMessage>
          <ResendEmail purpose="verification" initialEmail="" label="Kirim tautan verifikasi baru" send={resend} />
          <BackToLogin />
        </>
      )}

      {state.kind === 'error' && (
        <>
          <AuthHeading title="Verifikasi belum berhasil" />
          <AuthMessage tone="error">{state.message}</AuthMessage>
          <BackToLogin />
        </>
      )}
    </div>
  );
}
