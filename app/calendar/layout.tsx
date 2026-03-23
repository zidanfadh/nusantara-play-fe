import { AppNavbar } from '@/components/ui/AppNavbar';
import { CalendarTabBar } from '@/components/calendar/CalendarTabBar';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <CalendarTabBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
