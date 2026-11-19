import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { CongklakGame } from '@/components/games/congklak/CongklakGame';

export const metadata: Metadata = {
  title: 'Congklak',
  description: 'Main congklak di browser: lawan komputer atau berdua di satu perangkat. Tanpa masuk akun.',
};

/** /main/congklak (Phase 17): public, static; the game runs entirely in the browser. */
export default function CongklakPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main>
        {/* useSearchParams (the "from" back link) needs a Suspense boundary on a static page. */}
        <Suspense fallback={<div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />}>
          <CongklakGame />
        </Suspense>
      </main>
    </div>
  );
}
