'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu as MenuIcon, X } from 'lucide-react';
import { UserNav } from '@/components/ui/UserNav';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';
import { SITE_NAME } from '@/lib/brand';
import { Logotype } from '@/components/brand/Logotype';
import { APP_NAV_LINKS, isActiveLink } from '@/components/ui/nav-links';

const DESKTOP_LINK =
  'text-foreground/80 hover:text-foreground transition-colors aria-[current=page]:text-primary-text aria-[current=page]:font-semibold';
const PHONE_LINK =
  'block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors aria-[current=page]:text-primary-text aria-[current=page]:font-semibold';

/**
 * Phones (below md): the page links live behind a small menu button next to the theme toggle, so the bar
 * stays one row at 360 px. Closes on a link, Esc, or a click outside.
 */
function PhoneNavMenu({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="app-phone-nav"
        aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>
      {open && (
        <nav
          id="app-phone-nav"
          aria-label="Navigasi utama"
          className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card py-1 shadow-lg ring-1 ring-black/5 z-50"
        >
          {APP_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch ? undefined : false}
              aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
              className={PHONE_LINK}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-2">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/menu"
            prefetch={false}
            aria-label={SITE_NAME}
            className="text-base sm:text-xl whitespace-nowrap"
          >
            <Logotype />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden md:flex gap-6 text-sm font-medium">
            {APP_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch ? undefined : false}
                aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
                className={DESKTOP_LINK}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
          <PhoneNavMenu pathname={pathname} />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
