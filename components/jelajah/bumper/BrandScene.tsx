'use client';

import Image from 'next/image';
import { SITE_TAGLINE } from '@/lib/brand';
import { Logotype } from '@/components/brand/Logotype';
import { BatikMotif } from '@/components/brand/Batik';
import { SceneLayout } from './SceneLayout';

/**
 * Scene 1: the site icon (app/apple-icon.png: the provisional "NL" monogram since Phase 27) on a batik motif, the
 * logotype (dark on cream, gradient on dark brown) and the tagline.
 */
export function BrandScene() {
  return (
    <SceneLayout
      dense
      kicker="Selamat datang di"
      title={<Logotype />}
      text={SITE_TAGLINE}
      visual={
        <div className="relative mx-auto h-28 w-28 md:h-36 md:w-36">
          <BatikMotif fill className="opacity-70" />
          <Image
            src="/apple-icon.png"
            alt=""
            width={180}
            height={180}
            unoptimized
            priority
            className="relative mx-auto mt-[18%] h-[64%] w-[64%] rounded-[22%] object-cover shadow-lg"
          />
        </div>
      }
    />
  );
}
