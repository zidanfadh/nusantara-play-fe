'use client';

import { CalendarDays, Users } from 'lucide-react';
import { communityTiles, type CommunityStats } from '@/lib/jelajah/bumper/scene-data';
import { SceneLayout } from './SceneLayout';

/**
 * Scene 5: the real number of events and members from the public `GET /stats/landing`. While loading or
 * when the call fails, the scene is shown without numbers.
 */
export function CommunityScene({ stats }: { stats: CommunityStats | null }) {
  const tiles = communityTiles(stats);
  return (
    <SceneLayout
      kicker="Event dan komunitas"
      title="Bertemu sesama pelestari"
      text="Ikuti event permainan tradisional dan bergabung bersama komunitas."
      visual={
        <div className="mx-auto flex items-center justify-center gap-3" aria-hidden>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 md:h-20 md:w-20">
            <CalendarDays className="h-8 w-8 text-primary md:h-10 md:w-10" />
          </span>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/30 md:h-20 md:w-20">
            <Users className="h-8 w-8 text-foreground md:h-10 md:w-10" />
          </span>
        </div>
      }
    >
      {tiles.length > 0 && (
        <dl className="mx-auto grid max-w-xs grid-cols-2 gap-3" data-testid="bumper-community-stats">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-xl border border-border bg-card px-3 py-3 ${tiles.length === 1 ? 'col-span-2' : ''}`}>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.label}</dt>
              <dd className="text-3xl font-extrabold tabular-nums text-primary">{t.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </SceneLayout>
  );
}
