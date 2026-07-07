import { AppNavbar } from '@/components/ui/AppNavbar';
import { AppFooter } from '@/components/ui/AppFooter';

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
