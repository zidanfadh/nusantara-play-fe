'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { MapSceneData } from '@/lib/jelajah/bumper/scene-data';
import { shapesBounds, svgPath, type ProvinceShape } from '@/lib/jelajah/geo';
import { SceneLayout } from './SceneLayout';

const PAD = 0.6;

/**
 * Scene 3: a flat SVG outline of Indonesia from the hub's own province geometry (no three.js), the
 * provinces with public PROT in the primary colour, and their number. Without geometry (still loading or
 * failed) only the text is shown.
 */
export function MapScene({ scene, shapes }: { scene: MapSceneData; shapes: readonly ProvinceShape[] | null }) {
  const outline = useMemo(() => {
    if (!shapes || shapes.length === 0) return null;
    const b = shapesBounds(shapes);
    return {
      viewBox: `${b.minX - PAD} ${-b.maxY - PAD} ${b.maxX - b.minX + 2 * PAD} ${b.maxY - b.minY + 2 * PAD}`,
      paths: shapes.map((s) => ({ key: s.name, kode: s.kode, d: svgPath(s) })),
    };
  }, [shapes]);
  const highlighted = useMemo(() => new Set(scene.highlighted), [scene.highlighted]);

  return (
    <SceneLayout
      dense
      kicker="Jelajah Nusantara"
      title={scene.headline}
      text={scene.text}
      visual={
        outline ? (
          <svg viewBox={outline.viewBox} className="mx-auto w-full max-w-lg" role="img" aria-label="Peta Indonesia">
            {outline.paths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="var(--color-muted)"
                stroke="var(--color-border)"
                strokeWidth={0.08}
              />
            ))}
            {outline.paths
              .filter((p) => p.kode && highlighted.has(p.kode))
              .map((p, i) => (
                <motion.path
                  key={`hl-${p.key}`}
                  d={p.d}
                  fill="var(--color-primary)"
                  stroke="var(--color-background)"
                  strokeWidth={0.08}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                />
              ))}
          </svg>
        ) : undefined
      }
    />
  );
}
