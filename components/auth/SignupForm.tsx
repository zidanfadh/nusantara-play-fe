'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { passwordProblem } from '@/lib/auth/password-policy';
import { recordSend, storePrefillEmail } from '@/lib/auth/resend-limit';
import { SocialAuthButtons } from './SocialAuthButtons';
import { LoginNotice } from './LoginNotice';
import { PasswordRules } from './local/parts';
import { authQuery, type LoginReason } from './login-redirect';
import { SITE_NAME } from '@/lib/brand';

/** Build-time constant (Phase 29): the local login needs a name, shows the password rules, no Google button. */
const LOCAL = process.env.NEXT_PUBLIC_AUTH_MODE === 'local';

export interface SignupFormProps {
  /** Kept on the way back to the login page and through Google sign-up (Phase 18). */
  redirectTo?: string | null;
  reason?: LoginReason | null;
}

const inputClass =
  'w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50';

export function SignupForm({ redirectTo = null, reason = null }: SignupFormProps) {
  const loginHref = `/login${authQuery(redirectTo, reason)}`;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (LOCAL) {
      if (!fullName.trim()) {
        setError('Nama lengkap wajib diisi.');
        return;
      }
      const problem = passwordProblem(password, email);
      if (problem) {
        setError(problem);
        return;
      }
    } else if (password.length < 6) {
      setError('Password harus minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(LOCAL ? { email, password, fullName: fullName.trim() } : { email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else if (LOCAL) {
      // Phase 29: the same answer for new and existing emails; the next page says "Cek email kamu".
      try {
        storePrefillEmail(window.sessionStorage, email);
        recordSend(window.sessionStorage, 'verification', Date.now());
      } catch {
        // no storage: the resend form asks for the email
      }
      router.push(`/cek-email${authQuery(redirectTo, reason)}`);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 w-full max-w-sm">
        <div className="text-green-600 dark:text-green-400 font-medium text-lg">
          Cek email Anda untuk konfirmasi!
        </div>
        <p className="text-sm text-muted-foreground">
          Kami telah mengirimkan tautan konfirmasi ke {email}
        </p>
        <Link href={loginHref} className="text-primary-text hover:underline text-sm font-medium">
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-sm">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-foreground">Daftar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bergabung dengan komunitas {SITE_NAME}
        </p>
      </div>

      <LoginNotice reason={reason} />

      {!LOCAL && (
        <>
          <SocialAuthButtons redirectTo={redirectTo} label="Daftar dengan Google" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">atau daftar dengan email</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {LOCAL && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1 text-foreground">
              Nama lengkap
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={255}
              autoComplete="name"
              className={inputClass}
              placeholder="Nama kamu"
            />
          </div>
        )}

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
            autoComplete={LOCAL ? 'email' : undefined}
            className={inputClass}
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
            autoComplete={LOCAL ? 'new-password' : undefined}
            aria-describedby={LOCAL ? 'password-rules' : undefined}
            className={inputClass}
            placeholder="••••••••"
          />
          {LOCAL && <PasswordRules id="password-rules" password={password} email={email} />}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-foreground">
            Konfirmasi Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete={LOCAL ? 'new-password' : undefined}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div role={LOCAL ? 'alert' : undefined} className="text-danger text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? 'Membuat akun...' : 'Daftar'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href={loginHref} className="text-primary-text font-medium hover:underline">
            Masuk sekarang
          </Link>
        </p>
      </form>
    </div>
  );
}
