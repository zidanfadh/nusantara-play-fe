'use client';

/**
 * The Indonesia outline of the concept video (scenes 3, 5, 7): the generated province paths
 * (lib/jelajah/concept/indonesia-paths.ts, no three.js) and where the map sits on each layout's art board.
 */
import { CONCEPT_MAP_VIEW, CONCEPT_PROVINCE_PATHS } from '@/lib/jelajah/concept/indonesia-paths';
import type { ConceptLayout } from '@/lib/jelajah/concept/layout';

export { CONCEPT_MAP_VIEW, CONCEPT_PROVINCE_PATHS };

/** Map rectangle on the art board (stage units); the height follows the map's aspect ratio. */
export const MAP_RECT: Record<ConceptLayout, { x: number; y: number; w: number }> = {
  portrait: { x: 10, y: 168, w: 380 },
  landscape: { x: 120, y: 38, w: 660 },
  desktop: { x: 190, y: 140, w: 1220 },
};

export function mapScale(layout: ConceptLayout) {
  return MAP_RECT[layout].w / CONCEPT_MAP_VIEW.width;
}

/** Map units → art board units. */
export function mapToStage(layout: ConceptLayout, x: number, y: number): [number, number] {
  const r = MAP_RECT[layout];
  const s = mapScale(layout);
  return [r.x + x * s, r.y + y * s];
}

export function mapCenter(layout: ConceptLayout): [number, number] {
  return mapToStage(layout, CONCEPT_MAP_VIEW.width / 2, CONCEPT_MAP_VIEW.height / 2);
}

export function mapTransformAttr(layout: ConceptLayout) {
  const r = MAP_RECT[layout];
  return `translate(${r.x} ${r.y}) scale(${mapScale(layout)})`;
}

/** Island thickness of the paper look in map units of the film's map (about 0.28 degrees, like the Jelajah map). */
export const ISLAND_EDGE = 6;

/**
 * Phase 28: the provinces as low-poly "paper" islands, like the Jelajah map: an earth edge offset downwards, then the
 * tops. Static (painted once); stroke widths in map units.
 */
export function PaperIslands({
  fill,
  edge,
  seam,
  depth = ISLAND_EDGE,
  strokeWidth = 1,
}: {
  fill: string;
  edge: string;
  seam: string;
  depth?: number;
  strokeWidth?: number;
}) {
  return (
    <>
      <g fill={edge} transform={`translate(0 ${depth})`}>
        {CONCEPT_PROVINCE_PATHS.map((p) => (
          <path key={p.kode} d={p.d} />
        ))}
      </g>
      <ProvincePaths fill={fill} stroke={seam} strokeWidth={strokeWidth} />
    </>
  );
}

/** All provinces as plain paths (static layer). Stroke widths are in map units, so they scale with the map. */
export function ProvincePaths({ fill, stroke, strokeWidth }: { fill: string; stroke: string; strokeWidth: number }) {
  return (
    <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
      {CONCEPT_PROVINCE_PATHS.map((p) => (
        <path key={p.kode} d={p.d} />
      ))}
    </g>
  );
}
