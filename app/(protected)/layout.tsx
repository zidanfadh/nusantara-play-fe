import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
              <Link href="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/profile" className="text-foreground/80 hover:text-foreground transition-colors">
                Profil Saya
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
