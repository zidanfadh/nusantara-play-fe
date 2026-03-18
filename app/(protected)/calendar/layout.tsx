import { CalendarTabBar } from '@/components/calendar/CalendarTabBar';

export default function ProtectedCalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CalendarTabBar />
      {children}
    </>
  );
}
