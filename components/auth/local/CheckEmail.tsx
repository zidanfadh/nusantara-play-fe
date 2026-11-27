'use client';

import { useAuth } from '@/hooks/useAuth';
import { AuthHeading, AuthMessage, BackToLogin, ResendEmail, usePrefillEmail } from './parts';

/**
 * "Cek email kamu" after signing up (Phase 29, local mode). The backend answers every registration the same way
 * (new or existing email), so this page does too: a verification link OR an "akun sudah ada" email is on its way.
 */
export function CheckEmail({ loginHref }: { loginHref: string }) {
  const { client } = useAuth();
  const email = usePrefillEmail();

  return (
    <div className="space-y-6 w-full max-w-sm" data-auth-page="check-email">
      <AuthHeading title="Cek email kamu" subtitle="Satu langkah lagi untuk mengaktifkan akunmu." />
      <AuthMessage tone="success">
        Kami mengirim email ke alamat yang kamu daftarkan. Buka tautan di dalamnya untuk memverifikasi email
        (berlaku 24 jam). Jika alamat itu sudah punya akun, kamu akan menerima email berisi petunjuk masuk.
      </AuthMessage>
      <p className="text-sm text-muted-foreground">
        Kamu sudah bisa masuk sekarang. Beberapa fitur nanti memerlukan email yang terverifikasi.
      </p>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Belum menerima email?</p>
        {email !== null && (
          <ResendEmail
            purpose="verification"
            initialEmail={email}
            label="Kirim ulang email verifikasi"
            send={async (address) => (await client.resendVerification(address)).error?.message ?? null}
          />
        )}
      </div>
      <BackToLogin href={loginHref} />
    </div>
  );
}
