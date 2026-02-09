'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UserNav } from '@/components/ui/UserNav';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router, supabase]);

  // Check if current route is admin
  const isAdminRoute = pathname?.startsWith('/admin');

  if (loading) {
    return null;
  }

  // For admin routes, don't render the navbar (AdminHeader will handle it)
  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
              <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
              Nusantara Play
            </Link>
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/menu" className="text-foreground/80 hover:text-foreground transition-colors">
                Menu
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
            <UserNav />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
