import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const menuItems = [
    {
      title: 'Permainan & Olahraga Tradisional',
      description: 'Jelajahi dan kelola database PROT Indonesia',
      image: 'https://smansakuto.sch.id/assets/upload/berita/7f1f5a49f9c3704e9513d0b63ecd0daa.jpg',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
      href: '/prot',
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Events',
      description: 'Jelajahi dan kelola event yang tersedia',
      image: 'https://www.aprilasia.com/id/images/media/pacu-jalur-rapp-02.jpg',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      href: '/events',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Marketplace',
      description: 'Jelajahi dan kelola produk di marketplace',
      image: 'https://down-id.img.susercontent.com/file/0e88b598d61825ceda008b0854ece18d',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      href: '/marketplace',
      color: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Sertifikat Prestasi',
      description: 'Sertifikasi dan Prestasi',
      image: 'https://gawai.co/wp-content/uploads/2025/06/IMG_20250603_101425.jpg',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      href: '/sertifikat',
      color: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Kalender',
      description: 'Lihat tanggal penting, jadwal, dan event budaya',
      image: 'https://images.twinkl.co.uk/tw1n/image/private/t_630_eco/image_repo/12/64/id-ll-1692253235-flashcard-mainan-tradisional-indonesia_ver_1.jpg',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      href: '/calendar',
      color: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Selamat Datang, {user?.user_metadata?.full_name?.split(' ')[0] || 'Kawan'}!
        </h1>
        <p className="text-muted-foreground">
          Pilih menu di bawah untuk mulai menjelajah Nusantara Play.
        </p>
      </div>

      {/* Menu Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Menu Utama</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {/* Card Image */}
              <div className="relative h-44 w-full overflow-hidden bg-muted">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 space-y-4">
                
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center text-sm font-medium text-primary">
                  Buka
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
