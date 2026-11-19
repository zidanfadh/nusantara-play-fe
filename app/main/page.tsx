import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { GAMES } from '@/lib/games/registry';

export const metadata: Metadata = {
  title: 'Main permainan tradisional',
  description: 'Permainan tradisional yang bisa dimainkan langsung di browser, tanpa masuk akun.',
};

/**
 * /main (Phase 17): the games hosted on the site. Public, no login. Phase 20: gasing next to congklak; the
 * game links are not prefetched (each game is its own heavy chunk, like the other heavy routes).
 */
export default function GamesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Main permainan tradisional</h1>
        <p className="mt-2 text-muted-foreground">Langsung di browser, tanpa masuk akun.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.slug}>
              <Link
                href={g.href}
                prefetch={false}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xl font-bold">{g.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{g.description}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Main {g.title} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">Permainan ini tidak menyimpan data apa pun.</p>
      </main>
    </div>
  );
}
