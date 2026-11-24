'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SocialAuthButtons } from './SocialAuthButtons';
import { LoginNotice } from './LoginNotice';
import { JELAJAH_GUEST_NOTE, authQuery, redirectTargetOr, type LoginReason } from './login-redirect';
import { SITE_NAME } from '@/lib/brand';

/**
 * Email/password login, then the validated target (Phase 18). Returns the error message, or null after
 * navigating. Kept outside the component so the post-login redirect is unit-tested.
 */
export async function loginAndRedirect(
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>,
  navigate: (href: string) => void,
  email: string,
  password: string,
  redirectTo: string | null,
): Promise<string | null> {
  const { error } = await signIn(email, password);
  if (error) return error.message;
  navigate(redirectTargetOr(redirectTo));
  return null;
}

export interface LoginFormProps {
  /** Validated same-site path to open after login (Phase 18), or null for the default (/menu). */
  redirectTo?: string | null;
  reason?: LoginReason | null;
  callbackError?: boolean;
}

export function LoginForm({ redirectTo = null, reason = null, callbackError = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const message = await loginAndRedirect(
      signIn,
      (href) => {
        router.push(href);
        router.refresh();
      },
      email,
      password,
      redirectTo,
    );

    if (message) {
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground">Masuk</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selamat datang kembali di {SITE_NAME}
        </p>
      </div>

      <LoginNotice reason={reason} />

      {callbackError && (
        <div role="alert" className="text-danger text-sm">
          Masuk dengan Google gagal. Silakan coba lagi.
        </div>
      )}

      <SocialAuthButtons redirectTo={redirectTo} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">atau lanjut dengan email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
            placeholder="nama@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-danger text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link href={`/signup${authQuery(redirectTo, reason)}`} className="text-primary-text font-medium hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">atau</span>
        </div>
      </div>

      {reason === 'jelajah' ? (
        // Phase 19: the map needs an account, so no guest entry here; the games stay open without one.
        <p data-login-guest-note className="text-center text-sm text-muted-foreground">
          {JELAJAH_GUEST_NOTE.before}
          <Link href={JELAJAH_GUEST_NOTE.href} className="font-medium text-primary-text hover:underline">
            {JELAJAH_GUEST_NOTE.link}
          </Link>
          {JELAJAH_GUEST_NOTE.after}
        </p>
      ) : (
        <Link
          href="/menu"
          className="block w-full py-2 px-4 border border-border text-foreground font-medium rounded-md hover:bg-muted transition-colors text-center"
        >
          Masuk sebagai Tamu
        </Link>
      )}
    </div>
  );
}
