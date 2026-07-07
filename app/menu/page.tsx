import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShoppingBag,
  BadgeCheck,
  Calendar,
  Award,
  Landmark,
  Dumbbell,
  Gem,
} from 'lucide-react';

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || 'Kawan';

  return (
    <>
      {/* Welcome Section */}
      <section className="mb-16 pt-4">
        <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded mb-4">
          Menu Utama
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-4">
          Selamat Datang,{' '}
          <span className="text-primary">{firstName}</span>!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Jelajahi kekayaan permainan dan olahraga tradisional Indonesia.
          Mulai perjalananmu dalam melestarikan warisan budaya nusantara
          bersama komunitas kami.
        </p>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* PROT — Large featured card */}
        <Link
          href="/prot"
          className="md:col-span-8 group relative overflow-hidden rounded-xl bg-muted/50 shadow-sm hover:shadow-xl transition-all duration-500"
        >
          <div className="flex flex-col md:flex-row h-full min-h-[380px]">
            <div className="md:w-1/2 p-10 flex flex-col justify-between">
              <div>
                <Dumbbell className="w-12 h-12 text-primary mb-4" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">
                  Permainan &amp; Olahraga Tradisional
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Telusuri dan dokumentasikan ratusan permainan rakyat dari
                  seluruh pelosok Nusantara, dari Pencak Silat hingga Engklek.
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold">
                <span>Buka</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            <div className="md:w-1/2 relative min-h-[280px] overflow-hidden md:[mask-image:linear-gradient(to_right,transparent_0%,black_50%)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Traditional Indonesian Sports"
                className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:scale-105 transition-transform duration-700"
                src="/images/landing/menu-olahraga.webp"
              />
            </div>
          </div>
        </Link>

        {/* Events */}
        <Link
          href="/events"
          className="md:col-span-4 group bg-muted/50 rounded-xl p-8 flex flex-col justify-between hover:bg-muted transition-colors duration-300"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <Landmark className="w-10 h-10 text-primary" />
              <div className="bg-primary/10 px-3 py-1 rounded-full text-[0.65rem] font-bold text-primary uppercase tracking-tighter">
                Live Now
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              Events
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ikuti turnamen, kompetisi, dan festival budaya tradisional yang
              diselenggarakan komunitas nusantara.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full border-2 border-background bg-stone-300 flex items-center justify-center text-xs font-bold text-stone-600">
                A
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-background bg-stone-400 flex items-center justify-center text-xs font-bold text-stone-700">
                B
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[0.6rem] text-primary-foreground font-bold">
                +12k
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>Buka</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Marketplace */}
        <Link
          href="/login?redirectTo=/marketplace"
          className="md:col-span-4 group relative overflow-hidden rounded-xl bg-muted min-h-[320px] flex flex-col justify-end p-8 hover:shadow-lg transition-all"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Craftsmanship Marketplace"
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000"
            src="/images/landing/menu-marketplace.webp"
          />
          <div className="relative z-10">
            <ShoppingBag className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Marketplace
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Temukan produk kriya fisik dan aset digital dari para pengrajin
              dan komunitas budaya lokal nusantara.
            </p>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>Buka</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Sertifikat Prestasi */}
        <Link
          href="/login?redirectTo=/sertifikat"
          className="md:col-span-4 group bg-muted/50 border-b-4 border-primary rounded-xl p-8 flex flex-col justify-between hover:bg-muted transition-all duration-300"
        >
          <div>
            <BadgeCheck className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              Sertifikat Prestasi
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Raih dan pamerkan sertifikat atas kontribusimu dalam
              mendokumentasikan serta melestarikan warisan budaya bangsa.
            </p>
          </div>
          <div className="mt-6 p-4 bg-background/50 rounded-lg flex items-center gap-4">
            <div className="w-12 h-12 flex-shrink-0 bg-primary/10 rounded flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-[0.65rem] font-bold text-primary uppercase tracking-wider">
                Badge Terbaru
              </div>
              <div className="text-sm font-bold">Gasing Master 2024</div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm">
            <span>Buka</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Kalender */}
        <Link
          href="/calendar"
          className="md:col-span-4 group bg-muted/50 rounded-xl p-8 flex flex-col justify-between hover:bg-primary transition-all duration-300"
        >
          <div>
            <Calendar className="w-10 h-10 text-primary group-hover:text-primary-foreground mb-4 transition-colors" />
            <h3 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary-foreground mb-3 transition-colors">
              Kalender
            </h3>
            <p className="text-muted-foreground group-hover:text-primary-foreground/70 text-sm leading-relaxed transition-colors">
              Atur jadwal kegiatan, sesi latihan, dan pantau hari besar budaya
              nusantara dalam satu kalender terpadu.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-primary group-hover:text-primary-foreground font-bold text-sm transition-colors">
            <span>Buka</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Katalog NFT */}
        <Link
          href="/nfts"
          className="md:col-span-4 group bg-muted/50 rounded-xl p-8 flex flex-col justify-between hover:bg-muted transition-all duration-300"
        >
          <div>
            <Gem className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              Katalog NFT
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Jelajahi dan temukan representasi digital arsip budaya Nusantara di blockchain. Bukan fungsi jual-beli, melainkan dokumentasi.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm">
            <span>Buka</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

    </>
  );
}
