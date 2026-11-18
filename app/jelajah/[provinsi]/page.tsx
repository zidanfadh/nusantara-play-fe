import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { ProvincePlaceholder } from '@/components/jelajah/ProvincePlaceholder';
import { ENTERABLE_PROVINCES, findEnterableProvince } from '@/lib/jelajah/provinces';

// Only the enterable provinces exist; every other slug is a 404 (no runtime rendering).
export const dynamicParams = false;

export function generateStaticParams() {
  return ENTERABLE_PROVINCES.map((p) => ({ provinsi: p.slug }));
}

type Params = { params: Promise<{ provinsi: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const province = findEnterableProvince((await params).provinsi);
  return { title: province ? `${province.nama} · Jelajah Nusantara` : 'Jelajah Nusantara' };
}

export default async function JelajahProvinsiPage({ params }: Params) {
  const province = findEnterableProvince((await params).provinsi);
  if (!province) notFound();
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ProvincePlaceholder kode={province.kode} nama={province.nama} />
      </main>
    </div>
  );
}
