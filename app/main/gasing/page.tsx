import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { GasingGame } from '@/components/games/gasing/GasingGame';
import { SITE_NAME } from '@/lib/brand';
import { GAME_TAGLINE } from '@/lib/games/gasing/texts';

const description = `${GAME_TAGLINE} Main gasing di browser melawan komputer, tanpa masuk akun.`;

export const metadata: Metadata = {
  title: `Gasing · ${SITE_NAME}`,
  description,
  openGraph: { title: `Gasing · ${SITE_NAME}`, description, siteName: SITE_NAME, locale: 'id_ID', type: 'website' },
};

/** /main/gasing (Phase 20): public, static; the game runs entirely in the browser. */
export default function GasingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main>
        {/* useSearchParams (the "from" back link, ?debug=1) needs a Suspense boundary on a static page. */}
        <Suspense fallback={<div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />}>
          <GasingGame />
        </Suspense>
      </main>
    </div>
  );
}
