'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { EMAIL_NOT_VERIFIED_EVENT } from '@/lib/api/client';
import { ResendEmail } from './parts';

/**
 * Site-wide notice (Phase 29, local mode only; mounted in the root layout): appears when the backend refuses a
 * request with 403 EMAIL_NOT_VERIFIED (`@RequireVerifiedEmail()`), with a resend button. Dismissible; appears
 * again on the next such answer.
 */
export function EmailNotVerifiedNotice() {
  const { client } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      void client
        .currentUser()
        .then((user) => setEmail(user?.email ?? ''))
        .catch(() => setEmail(''));
    };
    window.addEventListener(EMAIL_NOT_VERIFIED_EVENT, show);
    return () => window.removeEventListener(EMAIL_NOT_VERIFIED_EVENT, show);
  }, [client]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="email-not-verified-title"
      aria-describedby="email-not-verified-text"
      data-email-not-verified
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-xl sm:inset-x-auto sm:right-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="email-not-verified-title" className="text-base font-bold text-foreground">
          Verifikasi email dulu
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p id="email-not-verified-text" className="mt-2 mb-4 text-sm text-muted-foreground">
        Fitur ini hanya untuk akun dengan email yang terverifikasi. Buka tautan di email verifikasi kami, atau minta
        tautan baru.
      </p>
      {email !== null && (
        <ResendEmail
          purpose="verification"
          initialEmail={email}
          label="Kirim ulang email verifikasi"
          send={async (address) => (await client.resendVerification(address)).error?.message ?? null}
        />
      )}
    </div>
  );
}
