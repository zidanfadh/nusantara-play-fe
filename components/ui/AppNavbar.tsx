'use client';

import Link from 'next/link';
import { UserNav } from '@/components/ui/UserNav';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/menu" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
            Nusantara Virtual
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/menu" className="text-foreground/80 hover:text-foreground transition-colors">
              Menu
            </Link>
            <Link href="/calendar" className="text-foreground/80 hover:text-foreground transition-colors">
              Kalender
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
