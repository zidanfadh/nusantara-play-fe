'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { MapSceneData } from '@/lib/jelajah/bumper/scene-data';
import { shapesBounds, svgPath, type ProvinceShape } from '@/lib/jelajah/geo';
import { mixHex, PALETTES } from '@/lib/jelajah/palette';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { useThemeMode } from '@/lib/jelajah/use-theme-mode';
import { SceneLayout } from './SceneLayout';

const PAD = 0.6;
/** Island edge and the lift of the provinces with PROT (map units), as on the Jelajah paper map. */
const EDGE = 0.26;
const LIFT = 0.22;

/**
 * Scene 3: Indonesia from the hub's own province geometry (no three.js) in the Jelajah map's paper look (Phase 28):
 * low-poly green islands on an earth-brown edge; the provinces with public PROT rise, deeper green with an amber rim,
 * and their number. Without geometry (still loading or failed) only the text is shown.
 */
export function MapScene({ scene, shapes }: { scene: MapSceneData; shapes: readonly ProvinceShape[] | null }) {
  const palette = PALETTES[useThemeMode()];
  const outline = useMemo(() => {
    if (!shapes || shapes.length === 0) return null;
    const low = lowPolyShapes(shapes);
    const b = shapesBounds(low);
    return {
      viewBox: `${b.minX - PAD} ${-b.maxY - PAD - LIFT} ${b.maxX - b.minX + 2 * PAD} ${b.maxY - b.minY + 2 * PAD + LIFT}`,
      paths: low.map((s) => ({ key: s.name, kode: s.kode, d: svgPath(s) })),
    };
  }, [shapes]);
  const highlighted = useMemo(() => new Set(scene.highlighted), [scene.highlighted]);
  const edge = mixHex(palette.earthBottom, palette.earthTop, 0.35);

  return (
    <SceneLayout
      dense
      kicker="Jelajah Nusantara"
      title={scene.headline}
      text={scene.text}
      visual={
        outline ? (
          <svg viewBox={outline.viewBox} className="mx-auto w-full max-w-lg" role="img" aria-label="Peta Indonesia">
            <g fill={edge} transform={`translate(0 ${EDGE})`}>
              {outline.paths.map((p) => (
                <path key={p.key} d={p.d} />
              ))}
            </g>
            <g fill={palette.muted} stroke={palette.outline} strokeOpacity={0.55} strokeWidth={0.05} strokeLinejoin="round">
              {outline.paths.map((p) => (
                <path key={p.key} d={p.d} />
              ))}
            </g>
            {outline.paths
              .filter((p) => p.kode && highlighted.has(p.kode))
              .map((p, i) => (
                <motion.g
                  key={`hl-${p.key}`}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -LIFT }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                >
                  <path d={p.d} fill={palette.earthTop} transform={`translate(0 ${EDGE + LIFT * 0.6})`} />
                  <path d={p.d} fill={palette.protHigh} stroke={palette.rim} strokeWidth={0.12} strokeLinejoin="round" />
                </motion.g>
              ))}
          </svg>
        ) : undefined
      }
    />
  );
}
