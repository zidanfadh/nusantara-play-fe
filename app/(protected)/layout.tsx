'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { loginUrlFor } from '@/components/auth/login-redirect';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { AppFooter } from '@/components/ui/AppFooter';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!(await authClient.hasSession())) {
        // Supabase mode: /login as before (the middleware already checked the real session). Local mode
        // (Phase 29): the middleware only saw the np_logged_in hint, so keep the Phase 18 target.
        router.push(
          authClient.mode === 'local'
            ? loginUrlFor(`${window.location.pathname}${window.location.search}`, window.location.pathname)
            : '/login',
        );
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  if (loading) {
    return null;
  }

  // Admin layout manages its own navbar — skip wrapper here
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
