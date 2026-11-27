import Link from 'next/link';
import Image from 'next/image';
import { getServerAuth } from '@/lib/auth/server';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';
import { AppFooter } from '@/components/ui/AppFooter';
import { HeroCarousel } from '@/components/ui/HeroCarousel';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import { getBackendApiUrl } from '@/lib/api/base-url';
import type { PaginatedResponse, PROTEntity } from '@/types/prot';
import { getLandingStats } from '@/lib/api/stats';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';
import { Logotype } from '@/components/brand/Logotype';
import { BatikBand, BatikCorner, BatikMotif } from '@/components/brand/Batik';
import { LANDING_PAGE_LINKS } from '@/components/ui/nav-links';
import { getPublishedCounts, landingStatTiles } from '@/components/landing/published-stats';
import { featuredProtQuery, onlyPublishedProt } from '@/components/landing/featured-prot';
import { firstVisiblePhoto } from '@/lib/prot/hidden-media';
import { DesktopOnlyImage } from '@/components/landing/DesktopOnlyImage';
import { LANDING_IMAGE_SIZES } from '@/components/landing/image-sizes';
import tourPreviewImage from '@/public/images/landing/nusantara-legacy.webp';
import arsipImage from '@/public/images/landing/arsip.webp';
import komunitasImage from '@/public/images/landing/komunitas.webp';
import sertifikasiImage from '@/public/images/landing/sertifikasi.webp';
import blockchainImage from '@/public/images/landing/blockchain.webp';


/** md:grid-cols-N as literal class names (Tailwind only sees full strings). */
const STAT_COLUMNS = ['', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'];
import {
  LockKeyhole,
  ShieldCheck,
  Eye,
  Archive,
  ArrowRight,
} from 'lucide-react';

async function getFeaturedGames(accessToken?: string): Promise<PROTEntity[]> {
  // Phase 19: published PROT only (ARSIP_NASIONAL), like the map; a curator's token must not list drafts here.
  const query = featuredProtQuery();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${getBackendApiUrl()}/prot?${query}`, {
      headers,
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as PaginatedResponse<PROTEntity>;
    return onlyPublishedProt(result.data);
  } catch (error) {
    console.error('Error fetching featured PROT data:', error);
    return [];
  }
}

function getGameLocation(game: PROTEntity): string {
  const city = game.kabkotaName || game.kabkotaKode;
  const province = game.provinsiName || game.provinsiKode;

  return [city, province].filter(Boolean).join(', ') || 'Indonesia';
}

function getGameSummary(game: PROTEntity): string {
  return (
    game.nilaiMoral ||
    game.caraBermain ||
    `Permainan rakyat dan olahraga tradisional yang terdokumentasi dalam arsip ${SITE_NAME}.`
  );
}

export default async function Home() {
  // Phase 29: supabase mode sends the visitor's token as before; local mode has no token on the server, so both
  // fetches are public (featured PROT are published-only anyway, the stats are public). `user` only picks the
  // buttons (local mode: the np_logged_in hint).
  const auth = await getServerAuth({ withToken: true });
  const user = auth.loggedIn;
  const [featuredGames, stats, published] = await Promise.all([
    getFeaturedGames(auth.accessToken),
    getLandingStats(auth.accessToken),
    // Phase 18: PROT and provinces from published PROT only, so they match the map and the bumper.
    getPublishedCounts(),
  ]);
  const statTiles = landingStatTiles(published, stats);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="shrink-0 text-[0.95rem] sm:text-xl md:text-2xl" aria-label={SITE_NAME}>
            <Logotype />
          </Link>

          {/* Section anchors from xl; the page links (Tur Virtual, Game) from md. Phones: the row below. */}
          <div className="hidden md:flex items-center gap-6 xl:gap-8">
            {[
              { label: 'Ekosistem', href: '#tentang' },
              { label: 'Blockchain', href: '#blockchain' },
              { label: 'Cara Kerja', href: '#cara-kerja' },
              { label: 'Permainan', href: '#permainan' },
              { label: 'Komunitas', href: '#community' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hidden xl:inline text-foreground/70 font-medium hover:text-primary-text transition-colors"
              >
                {link.label}
              </a>
            ))}
            {LANDING_PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch ? undefined : false}
                className="text-foreground font-semibold hover:text-primary-text transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
            {user ? (
              <Link
                href="/menu"
                prefetch={false}
                className="px-4 sm:px-6 py-2.5 whitespace-nowrap bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all"
              >
                Main Menu
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-5 py-2 text-foreground font-medium hover:opacity-80 transition-all"
                >
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="px-4 sm:px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Phones and small tablets: the page links get their own row (the bar above is full there). */}
        <div className="md:hidden border-t border-border/20">
          <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center gap-8 text-sm">
            {LANDING_PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch ? undefined : false}
                className="font-semibold text-foreground/80 hover:text-primary-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="pt-[7.5rem] md:pt-20">
        {/* Hero (Phase 27): the design team's cover in both themes. Dark brown, amber batik corners, the gradient
            logotype; the corners stay in the corners, never behind the text (small on phones). */}
        <section
          data-landing-hero=""
          className="relative min-h-[90vh] flex items-center overflow-hidden px-6 py-24 lg:py-28 bg-brand-brown text-brand-cream"
        >
          <BatikCorner
            corner="top-left"
            className="absolute left-0 top-0 w-24 sm:w-36 lg:w-44 xl:w-52 text-brand-amber!"
          />
          <BatikCorner
            corner="bottom-right"
            className="absolute right-0 bottom-0 w-24 sm:w-36 lg:w-44 xl:w-52 text-brand-amber!"
          />
          <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 z-10 text-center lg:text-left">
              <p className="mb-5 text-sm sm:text-base font-normal italic uppercase tracking-[0.3em] text-brand-cream">
                Platform Pelestarian Budaya Digital Indonesia
              </p>
              <h1 className="mb-8 text-[2.6rem] leading-[1.1] sm:text-6xl xl:text-7xl">
                <Logotype variant="gradient" />
              </h1>
              <p className="text-lg md:text-2xl text-brand-cream/90 max-w-xl mx-auto lg:mx-0 mb-12 leading-relaxed">
                {SITE_TAGLINE} Platform budaya digital
                untuk mendokumentasikan, memverifikasi, dan menghidupkan kembali
                permainan tradisional Indonesia bersama komunitas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href={user ? '/menu' : '/login'}
                  prefetch={false}
                  className="px-8 py-4 bg-brand-amber text-brand-brown rounded-xl font-bold text-lg hover:bg-brand-amber-300 hover:-translate-y-1 transition-all duration-300 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-amber"
                >
                  Mulai Sekarang
                </Link>
                <Link
                  href="/menu"
                  prefetch={false}
                  className="px-8 py-4 border-2 border-brand-cream/50 text-brand-cream rounded-xl font-bold text-lg hover:bg-brand-cream/10 transition-all duration-300 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-amber"
                >
                  Jelajahi Menu
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block">
              <div
                className="aspect-square rounded-[3rem] bg-brand-cream/10 overflow-hidden rotate-3 scale-105 ring-1 ring-brand-amber/40"
                style={{
                  boxShadow: '0 24px 40px -10px rgba(0, 0, 0, 0.4)',
                }}
              >
                <HeroCarousel />
              </div>
              <div
                className="absolute -bottom-8 -left-8 p-6 bg-brand-cream text-brand-brown rounded-2xl max-w-[240px] border border-brand-amber/60 -rotate-3"
                style={{
                  boxShadow: '0 24px 40px -10px rgba(0, 0, 0, 0.4)',
                }}
              >
                <p className="text-sm font-medium italic leading-relaxed">
                  &ldquo;Budaya adalah identitas. {SITE_NAME} membawa
                  identitas tersebut ke era digital.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="bg-brand-brown pb-3" aria-hidden="true">
          <BatikBand className="text-brand-amber!" />
        </div>

        {/* Tur Virtual banner (Jelajah Nusantara) */}
        <section className="py-12 lg:py-12 px-6 pt-0 lg:pt-0">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-[3rem] bg-muted/80 flex flex-col lg:flex-row items-center border border-border/10 shadow-[0_24px_40px_-10px_rgba(0,0,0,0.05)] pt-0">
              <div className="w-full lg:w-1/2 p-10 md:p-16 lg:p-20 z-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary-soft text-primary-soft-foreground font-bold text-xs tracking-widest uppercase mb-6">
                  Baru: Pengalaman Imersif
                </span>
                <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Tur Virtual <br className="hidden md:block" /> Jelajah Nusantara
                </h2>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-md">
                  Jelajahi warisan budaya dalam pengalaman 3D interaktif dan
                  lihat detail permainan tradisional dari sudut pandang yang
                  lebih hidup, dekat, dan imersif.
                </p>
                {/* Phase 17: our own Jelajah Nusantara instead of the external tour site (same tab). */}
                {/* Phase 18: the map needs a login; logged-out visitors pass the login notice first. */}
                <Link
                  href="/jelajah"
                  prefetch={false}
                  aria-describedby={user ? undefined : 'tur-virtual-login-hint'}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group w-fit"
                >
                  Mulai Tur Virtual
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                {!user && (
                  <p
                    id="tur-virtual-login-hint"
                    data-login-hint=""
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
                  >
                    <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                    Perlu masuk akun
                  </p>
                )}
              </div>
              <div className="w-full lg:w-1/2 h-80 lg:h-[600px] relative bg-primary/5 p-8">
                {/* next/image (Phase 18): optimized and lazy; p-8 inside the padded box as before. */}
                <Image
                  src={tourPreviewImage}
                  alt={`Pratinjau Tur Virtual ${SITE_NAME}`}
                  fill
                  sizes={LANDING_IMAGE_SIZES.tourPreview}
                  className="object-contain p-8"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar: published content only; numbers that are 0 or unknown are hidden (Phase 18). */}
        {statTiles.length > 0 && (
        <section data-landing-stats="" className="py-12 bg-muted/50 border-y border-border/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className={`grid grid-cols-2 ${STAT_COLUMNS[statTiles.length]} gap-8 md:gap-4`}>
              {statTiles.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center ${i > 0 ? 'md:border-l border-border/20' : ''}`}
                >
                  <p className="font-display text-4xl font-bold text-primary-text mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm font-bold text-muted-foreground tracking-wider uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Features - Membangun Ekosistem Budaya */}
        <section id="tentang" className="py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Membangun Ekosistem Budaya
              </h2>
              <BatikBand className="w-40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  title: 'Arsip Terverifikasi',
                  desc: 'Dokumentasi yang merangkum aturan main, sejarah, konteks daerah, dan nilai budaya dari berbagai penjuru Nusantara.',
                  img: arsipImage,
                  imgAlt: 'Old manuscript of traditional Indonesian rules',
                },
                {
                  title: 'Komunitas & Event',
                  desc: 'Temukan sesama pegiat budaya, ikuti agenda komunitas, dan hadir dalam ruang perjumpaan yang menghidupkan tradisi.',
                  img: komunitasImage,
                  imgAlt: 'Indonesian youth gathering at a cultural event',
                },
                {
                  title: 'Sertifikasi Budaya',
                  desc: 'Kontribusi data dan partisipasi kegiatan dapat terhubung dengan sertifikasi digital sebagai bentuk apresiasi yang terdokumentasi.',
                  img: sertifikasiImage,
                  imgAlt: 'Traditional batik patterns and stamps',
                },
              ].map((feature) => (
                <div key={feature.title} className="group">
                  <div className="mb-8 aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative">
                    <Image
                      src={feature.img}
                      alt={feature.imgAlt}
                      fill
                      sizes={LANDING_IMAGE_SIZES.feature}
                      className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blockchain Section */}
        <section id="blockchain" className="py-24 md:py-32 bg-brand-brown dark:bg-surface text-brand-cream">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="inline-flex items-center space-x-3 mb-8 px-4 py-2 bg-brand-amber/15 rounded-full border border-brand-amber/40">
                  <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
                  <span className="text-sm font-bold tracking-widest uppercase">
                    Powered by Polygon
                  </span>
                </div>

                <h2 className="font-display text-3xl md:text-5xl font-bold mb-8 leading-tight">
                  Keamanan Warisan di Atas{' '}
                  <span className="text-brand-amber">Blockchain</span>
                </h2>

                <p className="text-xl text-brand-cream/90 mb-12 leading-relaxed">
                  Kami memanfaatkan teknologi Polygon untuk membantu menjaga
                  integritas arsip budaya agar lebih transparan, mudah
                  diverifikasi, dan lebih tahan terhadap perubahan yang tidak
                  bertanggung jawab.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    {
                      icon: <LockKeyhole className="w-8 h-8 text-brand-amber" />,
                      title: 'Immutability',
                      desc: 'Data yang telah tercatat tidak akan pernah bisa dihapus atau diubah.',
                    },
                    {
                      icon: <ShieldCheck className="w-8 h-8 text-brand-amber" />,
                      title: 'Keaslian Data',
                      desc: 'Setiap entry divalidasi oleh ahli sejarah dan budayawan ternama.',
                    },
                    {
                      icon: <Eye className="w-8 h-8 text-brand-amber" />,
                      title: 'Transparansi',
                      desc: 'Publik dapat melacak asal usul setiap permainan secara terbuka.',
                    },
                    {
                      icon: <Archive className="w-8 h-8 text-brand-amber" />,
                      title: 'Warisan Masa Depan',
                      desc: 'Arsip digital yang akan tetap relevan hingga ratusan tahun ke depan.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="p-6 bg-brand-cream/5 rounded-2xl border border-brand-amber/20"
                    >
                      <div className="mb-4">{item.icon}</div>
                      <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                      <p className="text-sm text-brand-cream/85">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="aspect-square bg-gradient-to-tr from-brand-amber/20 to-transparent rounded-full absolute -inset-10 blur-3xl" />
                <div
                  className="relative aspect-square rounded-[4rem] overflow-hidden border border-brand-amber/30"
                  style={{
                    boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.3)',
                  }}
                >
                  {/* lg only: phones download nothing (Phase 18, <picture> like the hero carousel). */}
                  <DesktopOnlyImage
                    image={blockchainImage}
                    alt="Abstract 3D blockchain representation with cultural patterns"
                    sizes={LANDING_IMAGE_SIZES.blockchain}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Cara Kerja */}
        <section id="cara-kerja" className="py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
                Cara Kerja
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tiga langkah sederhana untuk mulai berkontribusi melestarikan
                budaya bangsa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {/* Connector line (hidden on mobile) */}
              <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-border" />

              {[
                {
                  step: '01',
                  title: 'Daftar Akun',
                  desc: 'Buat akun gratis dengan email. Tidak perlu kartu kredit, tidak ada biaya tersembunyi.',
                  color: 'bg-primary-soft text-primary-soft-foreground',
                },
                {
                  step: '02',
                  title: 'Jelajahi & Pelajari',
                  desc: 'Telusuri ratusan permainan rakyat dari seluruh Nusantara. Filter berdasarkan provinsi, kategori, atau kata kunci.',
                  color: 'bg-accent/25 text-foreground',
                },
                {
                  step: '03',
                  title: 'Berkontribusi',
                  desc: 'Dokumentasikan permainan dari daerahmu, ikuti event komunitas, dan bangun warisan budaya bersama.',
                  color: 'bg-secondary/10 text-primary-text',
                },
              ].map((item) => (
                <div key={item.step} className="relative group flex flex-col items-center text-center">
                  {/* Number circle */}
                  <div className="bg-background p-2 rounded-full relative z-10 mb-6">
                    <div
                      className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center font-display text-2xl font-bold`}
                    >
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground max-w-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Games */}
        <section id="permainan" className="py-24 md:py-32 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  Permainan Unggulan
                </h2>
                <p className="text-muted-foreground">
                  Pilihan arsip yang paling menarik untuk mulai mengenal ragam
                  permainan rakyat dan olahraga tradisional dari berbagai daerah.
                </p>
              </div>
              <Link
                href="/prot"
                className="flex items-center space-x-2 text-primary-text font-bold group/link shrink-0"
              >
                <span>Lihat Semua Koleksi</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredGames.length > 0 ? (
                featuredGames.map((game) => {
                  const photo = firstVisiblePhoto(game);
                  return (
                  <Link
                    key={game.id}
                    href={`/prot/${game.id}`}
                    className="bg-card p-4 rounded-3xl group cursor-pointer border border-transparent hover:border-primary/20 transition-all"
                    style={{
                      boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.05)',
                    }}
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-muted">
                      {photo ? (
                        // Same `cover` variants as /prot (no extra transformations); far below the fold, so lazy.
                        <ProtPhoto
                          src={photo}
                          alt={game.nama}
                          size="cover"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                          <Archive className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h4 className="text-xl font-bold line-clamp-2">
                        {game.nama}
                      </h4>
                      <span className="px-3 py-1 bg-primary-soft text-primary-soft-foreground text-[10px] font-bold tracking-widest uppercase rounded-full shrink-0">
                        {game.jenis === 'PERMAINAN_RAKYAT' ? 'Permainan' : 'Olahraga'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                      {getGameLocation(game)}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {getGameSummary(game)}
                    </p>
                  </Link>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                  <BatikMotif className="mx-auto mb-3 h-10 w-10" />
                  Data permainan belum tersedia untuk ditampilkan.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 md:py-32 px-6 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-5">
                Hal yang Perlu Diketahui
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
                Beberapa hal yang biasanya ingin diketahui sebelum mulai
                menjelajahi arsip permainan tradisional, mengikuti event, atau
                berkontribusi ke ekosistem {SITE_NAME}.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: `Apa itu ${SITE_NAME}?`,
                  answer:
                    `${SITE_NAME} adalah platform digital untuk mendokumentasikan, menampilkan, dan merayakan permainan tradisional Indonesia. Di dalamnya, pengguna dapat menjelajahi arsip budaya, mempelajari nilai dan aturan permainan, serta ikut terlibat dalam komunitas yang aktif menjaga warisan budaya.`,
                },
                {
                  question: 'Apa itu PROT di platform ini?',
                  answer:
                    'PROT adalah arsip Permainan Rakyat dan Olahraga Tradisional yang menjadi inti koleksi platform. Setiap entri memuat informasi seperti asal daerah, cara bermain, nilai moral, dokumentasi visual, dan jejak verifikasi agar pengetahuan budaya tersimpan lebih rapi dan mudah diakses.',
                },
                {
                  question: 'Apakah saya harus punya akun untuk melihat isi platform?',
                  answer:
                    'Sebagian informasi publik dapat dijelajahi secara terbuka, tetapi membuat akun akan membuka pengalaman yang lebih lengkap, seperti mengakses menu utama, mengikuti aktivitas komunitas, dan menggunakan fitur yang mendukung kontribusi serta partisipasi lebih lanjut.',
                },
                {
                  question: 'Bagaimana cara berkontribusi melestarikan budaya di sini?',
                  answer:
                    'Kamu bisa mulai dengan membuat akun, lalu menjelajahi koleksi PROT untuk memahami format dokumentasi yang digunakan. Setelah itu, kamu dapat ikut event, membagikan pengetahuan tentang permainan dari daerahmu, dan menjadi bagian dari ekosistem yang membantu menjaga budaya tetap hidup di era digital.',
                },
                {
                  question: 'Kenapa platform ini menyinggung blockchain?',
                  answer:
                    'Blockchain digunakan untuk mendukung integritas data budaya. Dengan pendekatan ini, jejak verifikasi dan bukti pencatatan bisa dibuat lebih transparan, lebih sulit dimanipulasi, dan lebih meyakinkan bagi publik yang ingin memastikan keaslian arsip.',
                },
                {
                  question: 'Apakah kontribusi atau partisipasi saya bisa mendapatkan sertifikasi?',
                  answer:
                    'Ya, platform ini dirancang agar kontribusi data dan partisipasi tertentu dapat terhubung dengan sertifikasi digital. Tujuannya bukan hanya memberi apresiasi, tetapi juga membangun rekam jejak keterlibatan budaya yang dapat dilihat dan dibanggakan.',
                },
              ].map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm transition-all open:border-primary/30 open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-bold text-foreground marker:content-none">
                    <span>{item.question}</span>
                    <span className="relative h-6 w-6 shrink-0 rounded-full border border-border/70 bg-muted/70">
                      <span className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80" />
                      <span className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 transition-transform duration-200 group-open:scale-y-0" />
                    </span>
                  </summary>
                  <p className="mt-4 pr-10 text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="community" className="py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="bg-primary rounded-[3rem] p-12 md:p-24 relative overflow-hidden flex flex-col items-center text-center">
              <BatikCorner corner="top-left" className="absolute left-0 top-0 w-24 md:w-48 opacity-30 text-primary-foreground!" />
              <BatikCorner corner="bottom-right" className="absolute right-0 bottom-0 w-24 md:w-48 opacity-30 text-primary-foreground!" />

              <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-8 max-w-3xl relative z-10 leading-tight">
                Siap Menjadi Bagian dari Penjaga Warisan Bangsa?
              </h2>
              <p className="text-xl text-primary-foreground mb-12 max-w-2xl relative z-10 leading-relaxed">
                Bergabunglah untuk menjelajahi arsip budaya, mendukung
                dokumentasi permainan tradisional, dan ikut membangun ruang
                digital yang membuat warisan Nusantara tetap relevan bagi
                generasi berikutnya.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                <Link
                  href={user ? '/menu' : '/signup'}
                  className="px-12 py-5 bg-primary-foreground text-primary-text rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Daftar Gratis
                </Link>
                <Link
                  href="/prot"
                  className="px-12 py-5 border-2 border-primary-foreground/40 text-primary-foreground rounded-xl font-bold text-xl hover:bg-primary-foreground/10 transition-all duration-300"
                >
                  Jelajahi Arsip PROT
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter className="mt-20" />
    </div>
  );
}
