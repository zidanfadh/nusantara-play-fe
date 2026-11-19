'use client';

import { motion } from 'framer-motion';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { ProtSceneData } from '@/lib/jelajah/bumper/scene-data';
import { popVariants, SceneLayout } from './SceneLayout';

/**
 * Scene 2: the real number of public PROT and up to 4 real PROT photos through ProtPhoto `cover` (the same
 * variants as /prot, the stand panel and the landing page). Without photos only the text is shown.
 */
export function ProtScene({ scene }: { scene: ProtSceneData }) {
  const { photos } = scene;
  return (
    <SceneLayout
      kicker="Arsip PROT"
      title={scene.headline}
      text={scene.text}
      visual={
        photos.length > 0 ? (
          <motion.ul
            className={`mx-auto grid max-w-sm gap-2 md:max-w-md ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            aria-label="Contoh foto PROT"
          >
            {photos.map((p, i) => (
              <motion.li
                key={p.id}
                variants={popVariants}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow ${
                  photos.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''
                }`}
              >
                <ProtPhoto src={p.foto} alt={p.nama} size="cover" />
                <span className="absolute inset-x-0 bottom-0 line-clamp-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-left text-[11px] font-semibold text-white">
                  {p.nama}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        ) : undefined
      }
    />
  );
}
