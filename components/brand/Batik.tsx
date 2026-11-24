/**
 * Batik ornaments (Phase 27): original ceplok / kawung-like floral lattice in the spirit of the design team's cover.
 * Geometry in `lib/brand/batik.ts`. Every ornament is decorative: `aria-hidden`, never focusable, coloured with
 * `currentColor` (default `text-ornament`: terracotta on cream, amber on dark brown), so it works in both themes.
 *
 * Use with restraint (CLAUDE.md "Visual identity (Phase 27)"): hero corners, section dividers, footer, empty states,
 * loading screens, Paspor / stamp frames. Never behind body text at full strength: the background texture
 * (`.nl-batik-texture` in `app/globals.css`) is the only ornament allowed behind text, at its tested low opacity.
 */
import { BATIK_TILE, FLOWER_D, FRAME_D, FRAME_STROKE, SMALL_FLOWER_D, cornerLattice } from '@/lib/brand/batik';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const FLIP: Record<Corner, string> = {
  'top-left': '',
  'top-right': '-scale-x-100',
  'bottom-left': '-scale-y-100',
  'bottom-right': 'rotate-180',
};

/** Lattice size in tile units: a triangle with legs of 5.5 tiles (as much as the cover shows per corner). */
const CORNER_SIZE = BATIK_TILE * 5.5;
const LATTICE = cornerLattice(CORNER_SIZE);

/**
 * The cover's corner ornament: a triangle of whole motifs cut along a 45° line. Position and size it with
 * `className` (e.g. `absolute left-0 top-0 w-40 md:w-72`); `corner` mirrors it.
 */
export function BatikCorner({ corner = 'top-left', className = '' }: { corner?: Corner; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-batik="corner"
      viewBox={`0 0 ${CORNER_SIZE} ${CORNER_SIZE}`}
      className={`pointer-events-none select-none text-ornament ${FLIP[corner]} ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth={FRAME_STROKE} strokeLinejoin="round">
        {LATTICE.cells.map(([x, y]) => (
          <path key={`f${x}-${y}`} d={FRAME_D} transform={`translate(${x} ${y})`} />
        ))}
      </g>
      <g fill="currentColor">
        {LATTICE.cells.map(([x, y]) => (
          <path key={`p${x}-${y}`} d={FLOWER_D} transform={`translate(${x} ${y})`} />
        ))}
        {LATTICE.flowers.map(([x, y]) => (
          <path key={`s${x}-${y}`} d={SMALL_FLOWER_D} transform={`translate(${x} ${y})`} />
        ))}
      </g>
    </svg>
  );
}

/** A thin border band of the motif between two lines: section separators, card tops, the footer. */
export function BatikBand({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" data-batik="band" className={`nl-batik-band ${className}`} />;
}

/** One framed flower: bullets, badges, empty states, stamp frames. Size it with `className` (default 1em). */
export function BatikMotif({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-batik="motif"
      viewBox="3 3 42 42"
      className={`inline-block h-[1em] w-[1em] shrink-0 text-ornament ${className}`}
    >
      <path d={FRAME_D} fill="none" stroke="currentColor" strokeWidth={FRAME_STROKE} strokeLinejoin="round" />
      <path d={FLOWER_D} fill="currentColor" />
    </svg>
  );
}
