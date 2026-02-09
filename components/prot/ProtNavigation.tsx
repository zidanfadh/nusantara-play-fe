'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function ProtNavigation() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const navLinks = [
    {
      href: '/prot',
      label: 'Daftar PROT',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: '/prot/create',
      label: 'Tambah PROT',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  // Tambahkan link verifikasi jika user adalah verifikator atau admin
  if (user && (user.role === 'pakar' || user.role === 'admin_kpoti')) {
    navLinks.push(
      {
        href: '/prot/verifikasi/queue',
        label: 'Antrean Verifikasi',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
      {
        href: '/prot/verifikasi/my-queue',
        label: 'Tugas Saya',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      }
    );
  }

  const isActive = (href: string) => {
    if (href === '/prot') {
      return pathname === '/prot';
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L2 7v10l8 5 8-5V7l-8-5z" />
              </svg>
            </div>
            <span className="hidden sm:inline">PROT Indonesia</span>
            <span className="sm:hidden">PROT</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive(link.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{user.full_name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 hover:bg-muted rounded-md">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border">
        <nav className="container mx-auto px-4 py-2 flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${
                  isActive(link.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
