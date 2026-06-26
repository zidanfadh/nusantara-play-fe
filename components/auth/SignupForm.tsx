'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SocialAuthButtons } from './SocialAuthButtons';

export function SignupForm() {
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

    if (password.length < 6) {
      setError('Password harus minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
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
        <Link href="/login" className="text-secondary hover:underline text-sm font-medium">
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-sm">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground">Daftar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bergabung dengan komunitas Nusantara Virtual
        </p>
      </div>

      <SocialAuthButtons />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">atau daftar dengan email</span>
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
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
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
          <Link href="/login" className="text-secondary font-medium hover:underline">
            Masuk sekarang
          </Link>
        </p>
      </form>
    </div>
  );
}
