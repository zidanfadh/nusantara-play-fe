'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function ProtTabBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const isActive = (href: string) => {
    if (href === '/prot') return pathname === '/prot';
    return pathname?.startsWith(href);
  };

  const tabClass = (href: string) =>
    `flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      isActive(href)
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  const canVerify =
    user &&
    (user.role === 'pakar' ||
      user.role === 'admin_kpoti' ||
      user.role === 'kurator_daerah');
  const canCreateProt =
    user && ['kurator_daerah', 'admin_kpoti'].includes(user.role);

  return (
    <div className="sticky top-16 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex overflow-x-auto gap-1 scrollbar-none">
          <Link href="/prot" className={tabClass('/prot')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Daftar PROT
          </Link>

          {canCreateProt && (
            <Link href="/prot/create" className={tabClass('/prot/create')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah PROT
            </Link>
          )}

          {canVerify && (
            <>
              <Link href="/prot/verifikasi/queue" className={tabClass('/prot/verifikasi/queue')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Antrean Verifikasi
              </Link>
              <Link href="/prot/verifikasi/my-queue" className={tabClass('/prot/verifikasi/my-queue')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tugas Saya
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
