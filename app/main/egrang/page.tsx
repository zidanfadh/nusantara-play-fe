import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { EgrangGame } from '@/components/games/egrang/EgrangGame';
import { SITE_NAME } from '@/lib/brand';
import { GAME_TAGLINE } from '@/lib/games/egrang/texts';

const description = `${GAME_TAGLINE} Main egrang di browser melawan komputer, tanpa masuk akun.`;

export const metadata: Metadata = {
  title: `Egrang · ${SITE_NAME}`,
  description,
  openGraph: { title: `Egrang · ${SITE_NAME}`, description, siteName: SITE_NAME, locale: 'id_ID', type: 'website' },
};

/** /main/egrang (Phase 23): public, static; the game runs entirely in the browser. */
export default function EgrangPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavbar />
      <main>
        {/* useSearchParams (?from=, ?varian=, ?debug=1) needs a Suspense boundary on a static page. */}
        <Suspense fallback={<div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />}>
          <EgrangGame />
        </Suspense>
      </main>
    </div>
  );
}
