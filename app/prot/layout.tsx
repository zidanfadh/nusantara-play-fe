import { AppNavbar } from '@/components/ui/AppNavbar';
import { ProtTabBar } from '@/components/prot/ProtTabBar';

export default function ProtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <ProtTabBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
