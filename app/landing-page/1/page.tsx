import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';

export default async function LandingPageV1() {
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
            <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors justify-items-end" />
            {user ? (
              <Link
                href="/menu"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Main Menu
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
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-foreground">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Platform Pelestarian Budaya Digital Indonesia
              </div>
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
                  {user ? "Main Menu" : "Mulai Sekarang"}
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

        {/* Stats Bar */}
        <section className="bg-primary py-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-primary-foreground">
              {[
                { value: "500+", label: "Permainan Terdokumentasi" },
                { value: "34", label: "Provinsi Terwakili" },
                { value: "120+", label: "Komunitas Aktif" },
                { value: "5.000+", label: "Anggota Terdaftar" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-extrabold text-accent">{stat.value}</div>
                  <div className="mt-1 text-sm text-primary-foreground/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Mengapa Nusantara Play?
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Satu platform untuk mendokumentasikan, memverifikasi, dan merayakan kekayaan permainan rakyat Indonesia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Arsip Terverifikasi</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Setiap permainan dikurasi oleh komunitas lokal dan ahli budaya. Data asal daerah, aturan main, hingga sejarahnya tercatat dengan ketat dan transparan.
                </p>
                <span className="text-xs font-medium text-secondary">Dikurasi komunitas</span>
              </div>

              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Komunitas & Event</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Temukan penggiat permainan tradisional di kotamu, ikuti festival budaya, dan daftarkan diri ke event pelestarian yang diselenggarakan komunitas.
                </p>
                <span className="text-xs font-medium text-accent-foreground/70">Dari komunitas, untuk komunitas</span>
              </div>

              <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Sertifikasi Budaya</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Kontribusimu dalam mendokumentasikan permainan rakyat mendapat apresiasi digital resmi. Bangun portofolio budayamu dan akui keahlianmu.
                </p>
                <span className="text-xs font-medium text-primary">Apresiasi nyata</span>
              </div>
            </div>
          </div>
        </section>

        {/* Blockchain Integration */}
        <section className="py-16 md:py-24 border-y border-border bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              {/* Text Content */}
              <div className="md:w-1/3 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Powered by Polygon
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Integritas Data Budaya dengan Web3
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Nusantara Play menggunakan teknologi Blockchain (Jaringan Polygon) untuk memberikan lapisan keamanan tertinggi pada arsip budaya bangsa. Setiap data yang disetujui Pakar akan otomatis dikunci (anchored) ke dalam jaringan blockchain.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Ini menciptakan &quot;sidik jari digital&quot; (SHA-256 Hash) yang memastikan data budaya kita terlindungi, otentik, dan menjadi jejak sejarah yang kekal.
                </p>
              </div>

              {/* Grid Content */}
              <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                {[
                  {
                    title: "Jejak Permanen (Immutability)",
                    desc: "Bukti persetujuan dicatat permanen di blockchain. Tidak ada pihak manapun yang bisa memanipulasi, mengubah, atau menghapus sejarah secara diam-diam.",
                    icon: (
                      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Jaminan Keaslian Data",
                    desc: "Sistem otomatis mencocokkan data di website dengan sidik jari digital di blockchain. Menjamin informasi (aturan main, nilai moral, asal usul) selalu sama persis.",
                    icon: (
                      <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Transparansi Maksimal",
                    desc: "Arsip permainan akan mendapat Badge Verifikasi Hijau. Publik dapat memverifikasi mandiri bukti transaksi dan nomor blok di jaringan publik Polygon.",
                    icon: (
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Menjaga Warisan Masa Depan",
                    desc: "Dengan menyimpan esensi data permainan di dalam smart contract yang terdesentralisasi, arsip bukan hanya aman di database biasa, tapi abadi di ekosistem web3.",
                    icon: (
                      <svg className="w-5 h-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    ),
                  },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col space-y-3 p-5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Cara Kerja</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Tiga langkah sederhana untuk mulai berkontribusi melestarikan budaya bangsa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line (hidden on mobile) */}
              <div className="hidden md:block absolute top-10 left-[16.5%] right-[16.5%] h-px bg-border" />

              {[
                {
                  step: "01",
                  title: "Daftar Akun",
                  desc: "Buat akun gratis dengan email. Tidak perlu kartu kredit, tidak ada biaya tersembunyi.",
                  color: "bg-primary/10 text-primary",
                },
                {
                  step: "02",
                  title: "Jelajahi & Pelajari",
                  desc: "Telusuri ratusan permainan rakyat dari seluruh Nusantara. Filter berdasarkan provinsi, kategori, atau kata kunci.",
                  color: "bg-accent/10 text-accent-foreground",
                },
                {
                  step: "03",
                  title: "Berkontribusi",
                  desc: "Dokumentasikan permainan dari daerahmu, ikuti event komunitas, dan bangun warisan budaya bersama.",
                  color: "bg-secondary/10 text-secondary",
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center space-y-4 px-2 md:px-6">
                  <div className="bg-background p-2 rounded-full relative z-10">
                    <div className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center text-2xl font-extrabold`}>
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Games */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Permainan Unggulan</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Sebagian kecil dari ratusan permainan rakyat yang telah terdokumentasi di platform kami.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: "Congklak",
                  origin: "Jawa & Sumatera",
                  desc: "Permainan strategi menggunakan papan berlubang dan biji-bijian yang mengajarkan perhitungan dan kesabaran.",
                  tag: "Strategi",
                  tagColor: "bg-secondary/10 text-secondary",
                },
                {
                  name: "Egrang",
                  origin: "Seluruh Nusantara",
                  desc: "Permainan keseimbangan menggunakan galah bambu yang melatih koordinasi tubuh dan keberanian.",
                  tag: "Fisik",
                  tagColor: "bg-primary/10 text-primary",
                },
                {
                  name: "Gobak Sodor",
                  origin: "Jawa Tengah",
                  desc: "Permainan tim yang melatih kecepatan, strategi, dan kerja sama dalam melewati garis penjaga.",
                  tag: "Tim",
                  tagColor: "bg-accent/10 text-accent-foreground",
                },
                {
                  name: "Petak Umpet",
                  origin: "Seluruh Nusantara",
                  desc: "Permainan klasik yang mengasah kepekaan, kesabaran, dan kemampuan berpikir taktis anak-anak.",
                  tag: "Klasik",
                  tagColor: "bg-secondary/10 text-secondary",
                },
              ].map((game) => (
                <div
                  key={game.name}
                  className="flex flex-col space-y-3 p-5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground">{game.name}</h3>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${game.tagColor}`}>
                      {game.tag}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{game.origin}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/prot"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
              >
                Lihat Semua Permainan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="community" className="py-20 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
                Mulai Lestarikan Budaya Bermain Hari Ini
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Bergabunglah dengan ribuan penggiat budaya yang telah mendokumentasikan permainan rakyat Nusantara. Gratis, terbuka, dan dibangun bersama komunitas.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href={user ? "/menu" : "/signup"}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-8 text-sm font-bold text-accent-foreground shadow transition-colors hover:bg-accent/90"
                >
                  {user ? "Ke Main Menu" : "Daftar Gratis Sekarang"}
                </Link>
                <Link
                  href="/prot"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-primary-foreground/30 px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  Jelajahi Arsip PROT
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-3 md:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
                <span className="text-lg font-bold text-primary">Nusantara Play</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Platform digital untuk mendokumentasikan, memverifikasi, dan melestarikan permainan rakyat Nusantara bagi generasi mendatang.
              </p>
            </div>

            {/* Navigasi */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Navigasi</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/prot" className="hover:text-foreground transition-colors">Jelajahi PROT</Link></li>
                <li><Link href="/calendar" className="hover:text-foreground transition-colors">Kalender Event</Link></li>
                <li><Link href="/signup" className="hover:text-foreground transition-colors">Daftar Akun</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Masuk</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Syarat & Ketentuan</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Nusantara Play. Dibuat dengan cinta untuk budaya Indonesia.
            </p>
            <p className="text-xs text-muted-foreground">
              Seluruh hak cipta dilindungi undang-undang.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
