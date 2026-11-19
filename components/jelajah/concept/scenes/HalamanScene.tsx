'use client';

import { seg } from '@/lib/jelajah/concept/timeline';
import { Courtyard } from '../art/Courtyard';
import { Stage, useStyle, type SceneProps } from '../scene-kit';

/** Scene 1 "halaman" (0–6 s): a warm dusk courtyard, children at play; a slow camera push-in. */
export function HalamanScene({ lt, layout, still }: SceneProps) {
  const camera = useStyle(lt, (t) => ({ transform: `scale(${(1 + seg(still ? 3300 : t, 0, 6000) * 0.06).toFixed(4)})` }));
  return (
    <div ref={camera} className="absolute inset-0" style={{ transformOrigin: '50% 68%' }}>
      <Stage layout={layout}>
        <Courtyard lt={lt} layout={layout} tone="warm" still={still} />
      </Stage>
    </div>
  );
}
