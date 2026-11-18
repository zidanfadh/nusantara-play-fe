import type { Metadata } from 'next';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { JelajahHub } from '@/components/jelajah/JelajahHub';

export const metadata: Metadata = {
  title: 'Jelajah Nusantara',
  description: 'Peta provinsi Indonesia dengan permainan rakyat dan olahraga tradisional (PROT).',
};

export default function JelajahPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main>
        <JelajahHub />
      </main>
    </div>
  );
}
