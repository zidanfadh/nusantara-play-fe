'use client';

import Image from 'next/image';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';
import { SceneLayout } from './SceneLayout';

/** Scene 1: the logo (the site icon, app/apple-icon.png, 180 px, 6 KB), the site name and the tagline. */
export function BrandScene() {
  return (
    <SceneLayout
      kicker="Selamat datang di"
      title={SITE_NAME}
      text={SITE_TAGLINE}
      visual={
        <div className="relative mx-auto h-28 w-28 md:h-36 md:w-36">
          <div className="absolute inset-2 rotate-45 rounded-2xl bg-accent/70" aria-hidden />
          <Image
            src="/apple-icon.png"
            alt=""
            width={180}
            height={180}
            unoptimized
            priority
            className="relative h-full w-full rounded-full border-4 border-background object-cover shadow-lg"
          />
        </div>
      }
    />
  );
}
