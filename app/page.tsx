import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
            Nusantara Play
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Tentang
            </Link>
            <Link href="/prot" className="text-muted-foreground hover:text-foreground transition-colors">
              Jelajahi PROT
            </Link>
            <Link href="#community" className="text-muted-foreground hover:text-foreground transition-colors">
              Komunitas
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/menu"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Menu Saya
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />

          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
                Arsip Digital <span className="text-primary">Permainan Rakyat</span> Nusantara
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
                Melestarikan budaya bermain, memverifikasi sejarah, dan membangun komunitas untuk masa depan identitas bangsa.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href={user ? "/menu" : "/login"}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {user ? "Ke Menu Saya" : "Mulai Sekarang"}
                </Link>
                <Link
                  href="/prot"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Jelajahi PROT
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Arsip Terverifikasi</h3>
                <p className="text-muted-foreground">
                  Dokumentasi permainan tradisional yang dikurasi oleh ahli budaya dan komunitas lokal untuk memastikan keaslian sejarah.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Komunitas & Event</h3>
                <p className="text-muted-foreground">
                  Temukan komunitas penggiat permainan tradisional di sekitarmu dan ikuti kegiatan pelestarian budaya.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Sertifikasi Budaya</h3>
                <p className="text-muted-foreground">
                  Dapatkan apresiasi digital atas kontribusimu dalam mendokumentasikan dan melestarikan permainan rakyat.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-accent rounded-sm rotate-45" />
            <span className="text-sm font-semibold">Nusantara Play</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} Nusantara Play. Dilindungi undang-undang.
          </p>
          <div className="flex gap-6">
             <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
             <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
