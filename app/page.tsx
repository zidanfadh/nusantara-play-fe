import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AnimatedThemeToggler } from '@/components/ui/AnimatedThemeToggler';
import {
  LockKeyhole,
  ShieldCheck,
  Eye,
  Archive,
  ArrowRight,
  Globe,
  Share2,
  Send,
} from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tighter text-primary"
          >
            Nusantara Legacy
          </Link>

          <div className="hidden md:flex items-center space-x-8">
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
                className="text-foreground/70 font-medium hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <AnimatedThemeToggler className="hover:bg-muted/50 transition-colors" />
            {user ? (
              <Link
                href="/menu"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all"
              >
                Main Menu
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2 text-foreground font-medium hover:opacity-80 transition-all"
                >
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden px-6">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-medium text-foreground mb-6">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Platform Pelestarian Budaya Digital Indonesia
              </div>
              <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-foreground mb-8 leading-[0.9]">
                Nusantara <br />
                <span className="text-primary">Legacy</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl mb-12 leading-relaxed">
                Menjaga Warisan, Memainkan Masa Depan. Platform berbasis
                blockchain untuk mendokumentasikan, mensertifikasi, dan
                merayakan kekayaan permainan tradisional Indonesia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={user ? '/menu' : '/login'}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center"
                >
                  Mulai Sekarang
                </Link>
                <Link
                  href="/prot"
                  className="px-8 py-4 bg-muted text-foreground rounded-xl font-bold text-lg hover:bg-muted/70 transition-all duration-300 text-center"
                >
                  Jelajahi PROT
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block">
              <div
                className="aspect-square rounded-[3rem] bg-muted overflow-hidden rotate-3 scale-105"
                style={{
                  boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.05)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                  alt="Children playing traditional Indonesian games in a village"
                  src="/images/landing/hero.webp"
                />
              </div>
              <div
                className="absolute -bottom-8 -left-8 p-6 bg-card rounded-2xl max-w-[240px] border border-border/20 -rotate-3"
                style={{
                  boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.05)',
                }}
              >
                <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">
                  &ldquo;Budaya adalah identitas. Nusantara Legacy membawa
                  identitas tersebut ke era digital.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 -z-10 w-1/2 h-full opacity-5 pointer-events-none">
            <svg
              className="w-full h-full text-primary fill-current"
              viewBox="0 0 100 100"
            >
              <path
                d="M0 0 L100 0 L100 100 L0 100 Z"
                fill="url(#pattern-v2)"
              />
              <defs>
                <pattern
                  id="pattern-v2"
                  x="0"
                  y="0"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
            </svg>
          </div>
        </section>

        {/* New Nusantara Legacy Tour Banner */}
        <section className="py-12 lg:py-12 px-6 pt-0 lg:pt-0">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-[3rem] bg-muted/80 flex flex-col lg:flex-row items-center border border-border/10 shadow-[0_24px_40px_-10px_rgba(0,0,0,0.05)] pt-0">
              <div className="w-full lg:w-1/2 p-10 md:p-16 lg:p-20 z-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs tracking-widest uppercase mb-6">
                  Baru: Pengalaman Imersif
                </span>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground mb-6 leading-tight">
                  Nusantara <br className="hidden md:block" /> Legacy Tour
                </h2>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-md">
                  Jelajahi warisan budaya dalam tampilan 3D interaktif. Lihat setiap detail permainan tradisional langsung dari layar Anda.
                </p>
                <a 
                  href="https://multimedia-demo.wellmagicteam.com/nusalega/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group w-fit"
                >
                  Mulai Tur Virtual
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
              <div className="w-full lg:w-1/2 h-80 lg:h-[600px] relative bg-primary/5 p-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Nusantara Legacy Virtual Tour Preview"
                  className="absolute inset-0 w-full h-full object-contain p-8" /* Saya tambahkan p-8 di sini agar paddingnya teraplikasi ke gambar yang absolute */
                  src="/images/landing/nusantara-legacy.webp"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-12 bg-muted/50 border-y border-border/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {[
                { value: '500+', label: 'Permainan' },
                { value: '34', label: 'Provinsi' },
                { value: '120+', label: 'Komunitas' },
                { value: '5.000+', label: 'Anggota' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center ${i > 0 ? 'md:border-l border-border/20' : ''}`}
                >
                  <p className="text-4xl font-extrabold text-primary mb-1">
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

        {/* Features - Membangun Ekosistem Budaya */}
        <section id="tentang" className="py-24 md:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20">
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">
                Membangun Ekosistem Budaya
              </h2>
              <div className="h-1 w-24 bg-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  title: 'Arsip Terverifikasi',
                  desc: 'Pendataan komprehensif aturan, sejarah, dan filosofi permainan dari berbagai pelosok Nusantara.',
                  img: '/images/landing/arsip.webp',
                  imgAlt: 'Old manuscript of traditional Indonesian rules',
                },
                {
                  title: 'Komunitas & Event',
                  desc: 'Temukan kawan bermain dan ikut serta dalam festival permainan tradisional di kotamu.',
                  img: '/images/landing/komunitas.webp',
                  imgAlt: 'Indonesian youth gathering at a cultural event',
                },
                {
                  title: 'Sertifikasi Budaya',
                  desc: 'Setiap kontribusi data dan partisipasi event mendapatkan sertifikasi digital yang diakui.',
                  img: '/images/landing/sertifikasi.webp',
                  imgAlt: 'Traditional batik patterns and stamps',
                },
              ].map((feature) => (
                <div key={feature.title} className="group">
                  <div className="mb-8 aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                      alt={feature.imgAlt}
                      src={feature.img}
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
        <section id="blockchain" className="py-24 md:py-32 bg-[#1C1C18] text-[#FDF9F3]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="inline-flex items-center space-x-3 mb-8 px-4 py-2 bg-primary/20 rounded-full border border-primary/30">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold tracking-widest uppercase">
                    Powered by Polygon
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">
                  Keamanan Warisan di Atas{' '}
                  <span className="text-[#ffdad2]">Blockchain</span>
                </h2>

                <p className="text-xl text-[#FDF9F3]/70 mb-12 leading-relaxed">
                  Kami menggunakan teknologi Polygon untuk memastikan setiap data
                  kebudayaan bersifat kekal, transparan, dan tidak dapat
                  dimanipulasi oleh siapapun.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    {
                      icon: <LockKeyhole className="w-8 h-8 text-primary" />,
                      title: 'Immutability',
                      desc: 'Data yang telah tercatat tidak akan pernah bisa dihapus atau diubah.',
                    },
                    {
                      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
                      title: 'Keaslian Data',
                      desc: 'Setiap entry divalidasi oleh ahli sejarah dan budayawan ternama.',
                    },
                    {
                      icon: <Eye className="w-8 h-8 text-primary" />,
                      title: 'Transparansi',
                      desc: 'Publik dapat melacak asal usul setiap permainan secara terbuka.',
                    },
                    {
                      icon: <Archive className="w-8 h-8 text-primary" />,
                      title: 'Warisan Masa Depan',
                      desc: 'Arsip digital yang akan tetap relevan hingga ratusan tahun ke depan.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="p-6 bg-[#262621] rounded-2xl border border-white/5"
                    >
                      <div className="mb-4">{item.icon}</div>
                      <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                      <p className="text-sm text-[#FDF9F3]/50">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="aspect-square bg-gradient-to-tr from-primary/20 to-transparent rounded-full absolute -inset-10 blur-3xl" />
                <div
                  className="relative aspect-square rounded-[4rem] overflow-hidden border border-white/10"
                  style={{
                    boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.3)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="w-full h-full object-cover"
                    alt="Abstract 3D blockchain representation with cultural patterns"
                    src="/images/landing/blockchain.webp"
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
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
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
                  color: 'bg-primary/10 text-primary',
                },
                {
                  step: '02',
                  title: 'Jelajahi & Pelajari',
                  desc: 'Telusuri ratusan permainan rakyat dari seluruh Nusantara. Filter berdasarkan provinsi, kategori, atau kata kunci.',
                  color: 'bg-accent/10 text-accent-foreground',
                },
                {
                  step: '03',
                  title: 'Berkontribusi',
                  desc: 'Dokumentasikan permainan dari daerahmu, ikuti event komunitas, dan bangun warisan budaya bersama.',
                  color: 'bg-secondary/10 text-secondary',
                },
              ].map((item) => (
                <div key={item.step} className="relative group flex flex-col items-center text-center">
                  {/* Number circle */}
                  <div className="bg-background p-2 rounded-full relative z-10 mb-6">
                    <div
                      className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center text-2xl font-extrabold`}
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
                <h2 className="text-4xl font-extrabold tracking-tight mb-4">
                  Permainan Unggulan
                </h2>
                <p className="text-muted-foreground">
                  Arsip terpopuler minggu ini yang paling banyak dikontribusi
                  oleh komunitas.
                </p>
              </div>
              <Link
                href="/prot"
                className="flex items-center space-x-2 text-primary font-bold group/link shrink-0"
              >
                <span>Lihat Semua Koleksi</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  name: 'Congklak',
                  origin: 'Jawa',
                  desc: 'Permainan adu strategi menggunakan papan kayu berlubang dan biji kerang.',
                  img: '/images/landing/congklak.webp',
                  imgAlt: 'Traditional Congklak wooden board with shells',
                },
                {
                  name: 'Egrang',
                  origin: 'Nasional',
                  desc: 'Uji keseimbangan menggunakan galah bambu tinggi sebagai kaki tambahan.',
                  img: '/images/landing/egrang.webp',
                  imgAlt: 'Bamboo stilts known as Egrang',
                },
                {
                  name: 'Gobak Sodor',
                  origin: 'Sumatera',
                  desc: 'Permainan tim yang mengandalkan kecepatan dan ketangkasan menghalangi lawan.',
                  img: '/images/landing/gobak-sodor.webp',
                  imgAlt: 'Group of kids playing Gobak Sodor outdoors',
                },
                {
                  name: 'Petak Umpet',
                  origin: 'Global',
                  desc: 'Permainan klasik sembunyi-sembunyi yang melatih kejelian dan kesabaran.',
                  img: '/images/landing/petak-umpet.webp',
                  imgAlt: 'Children hiding during Petak Umpet game',
                },
              ].map((game) => (
                <div
                  key={game.name}
                  className="bg-card p-4 rounded-3xl group cursor-pointer border border-transparent hover:border-primary/20 transition-all"
                  style={{
                    boxShadow: '0 24px 40px -10px rgba(28, 28, 24, 0.05)',
                  }}
                >
                  <div className="aspect-square rounded-2xl overflow-hidden mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      alt={game.imgAlt}
                      src={game.img}
                    />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl font-bold">{game.name}</h4>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase rounded-full">
                      {game.origin}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {game.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="community" className="py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="bg-primary rounded-[3rem] p-12 md:p-24 relative overflow-hidden flex flex-col items-center text-center">
              {/* Background texture */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern
                      id="batik-v2"
                      x="0"
                      y="0"
                      width="100"
                      height="100"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <path
                        d="M50 10 L50 90 M10 50 L90 50"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#batik-v2)" />
                </svg>
              </div>

              <h2 className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-8 max-w-3xl relative z-10 leading-tight">
                Siap Menjadi Bagian dari Penjaga Warisan Bangsa?
              </h2>
              <p className="text-xl text-primary-foreground/70 mb-12 max-w-2xl relative z-10 leading-relaxed">
                Daftar sekarang dan mulailah perjalananmu melintasi waktu
                melalui ribuan permainan tradisional Indonesia yang menanti
                untuk ditemukan kembali.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                <Link
                  href={user ? '/menu' : '/signup'}
                  className="px-12 py-5 bg-primary-foreground text-primary rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Daftar Gratis
                </Link>
                <Link
                  href="/prot"
                  className="px-12 py-5 border-2 border-primary-foreground/40 text-primary-foreground rounded-xl font-bold text-xl hover:bg-primary-foreground/10 transition-all duration-300"
                >
                  Pelajari Dokumentasi
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 w-full pt-16 pb-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-xl font-bold text-primary mb-4 block"
            >
              Nusantara Legacy
            </Link>
            <p className="text-foreground/60 mb-8 leading-relaxed text-sm">
              Platform digital terdesentralisasi pertama yang fokus pada
              pelestarian warisan permainan tradisional Indonesia.
            </p>
            <div className="flex space-x-4">
              <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Globe className="w-5 h-5" />
              </span>
              <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Share2 className="w-5 h-5" />
              </span>
            </div>
          </div>

          <div>
            <h5 className="font-bold mb-6 text-foreground">Platform</h5>
            <ul className="space-y-4">
              {[
                { label: 'Tentang Kami', href: '#tentang' },
                { label: 'Jelajahi Permainan', href: '/prot' },
                { label: 'Kontribusi Data', href: '/signup' },
                { label: 'Sertifikasi PROT', href: '/prot' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-foreground/60 hover:text-primary transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-6 text-foreground">Dukungan</h5>
            <ul className="space-y-4">
              {[
                { label: 'Pusat Bantuan', href: '#' },
                { label: 'Syarat & Ketentuan', href: '#' },
                { label: 'Kebijakan Privasi', href: '#' },
                { label: 'Kontak', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-foreground/60 hover:text-primary transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-6 text-foreground">Newsletter</h5>
            <p className="text-sm text-foreground/60 mb-4">
              Dapatkan update mingguan tentang warisan budaya terbaru.
            </p>
            <div className="flex">
              <input
                className="bg-muted border-none rounded-l-lg px-4 py-3 w-full focus:ring-1 focus:ring-primary text-sm"
                placeholder="Email Anda"
                type="email"
              />
              <button className="bg-primary text-primary-foreground px-4 py-3 rounded-r-lg hover:opacity-90 transition-opacity">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-border/10 text-center">
          <p className="text-foreground/60 text-sm">
            &copy; {new Date().getFullYear()} Nusantara Legacy. Menjaga Warisan,
            Memainkan Masa Depan.
          </p>
        </div>
      </footer>
    </div>
  );
}
