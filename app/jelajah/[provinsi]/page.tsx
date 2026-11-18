import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { ProvinceExperience } from '@/components/jelajah/ProvinceExperience';
import { ENTERABLE_PROVINCES, findEnterableProvince } from '@/lib/jelajah/provinces';
import { findScene } from '@/lib/jelajah/scenes';

// Only the enterable provinces exist; every other slug is a 404 (no runtime rendering).
export const dynamicParams = false;

export function generateStaticParams() {
  return ENTERABLE_PROVINCES.map((p) => ({ provinsi: p.slug }));
}

type Params = { params: Promise<{ provinsi: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const province = findEnterableProvince((await params).provinsi);
  return {
    title: province ? `${province.nama} · Jelajah Nusantara` : 'Jelajah Nusantara',
    description: province ? `Desa virtual ${province.nama}: jelajahi stand PROT dari provinsi ini.` : undefined,
  };
}

export default async function JelajahProvinsiPage({ params }: Params) {
  const slug = (await params).provinsi;
  const province = findEnterableProvince(slug);
  const scene = findScene(slug);
  if (!province || !scene) notFound();
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main>
        <ProvinceExperience scene={scene} />
      </main>
    </div>
  );
}
