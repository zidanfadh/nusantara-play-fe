'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SocialAuthButtons } from './SocialAuthButtons';

export function LoginForm() {
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

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      router.push('/menu');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold text-foreground">Masuk</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selamat datang kembali di Nusantara Play
        </p>
      </div>

      <SocialAuthButtons />

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
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
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
          <Link href="/signup" className="text-secondary font-medium hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </form>
    </div>
  );
}
