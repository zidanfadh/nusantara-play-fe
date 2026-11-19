import { stampDesign, type StampMotif } from '@/lib/jelajah/stamps';

/** Motif paths in a 48 × 48 box (stroke-based, drawn in the stamp colour). */
const MOTIFS: Readonly<Record<StampMotif, readonly string[]>> = {
  river: ['M14 25 L24 15 L34 25', 'M16 25 V30 M32 25 V30 M16 27 H32', 'M11 34 q3.25 -3 6.5 0 t6.5 0 t6.5 0 t6.5 0'],
  palm: ['M23 36 Q25 27 24 17', 'M24 17 Q16 13 11 19', 'M24 17 Q32 13 37 19', 'M24 17 Q19 9 13 10', 'M24 17 Q29 9 35 10'],
  wave: ['M24 11 L30 19 L24 26 L18 19 Z', 'M24 26 V29', 'M11 33 q3.25 -3 6.5 0 t6.5 0 t6.5 0 t6.5 0', 'M14 38 q2.5 -2 5 0 t5 0 t5 0 t5 0'],
  mountain: ['M10 31 L20 15 L28 15 L38 31', 'M20 15 Q24 12 28 15', 'M9 35 H39 M12 39 H36'],
  boat: ['M10 31 Q24 37 38 29', 'M20 30 V12 M28 29 V15', 'M20 13 L13 27 H20 M28 16 L35 27 H28'],
};

/**
 * A province's Paspor stamp (Phase 22): a round, slightly turned stamp with a double ring and the province's motif in
 * its own colour. Decorative (aria-hidden); the caller names the province. Null for provinces without a design.
 */
export function ProvinceStamp({ kode, size = 28, className = '' }: { kode: string; size?: number; className?: string }) {
  const design = stampDesign(kode);
  if (!design) return null;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
      data-stamp={kode}
      style={{ color: design.color }}
    >
      <g transform="rotate(-10 24 24)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={24} cy={24} r={21.5} strokeWidth={2.6} />
        <circle cx={24} cy={24} r={17.5} strokeWidth={1.2} strokeDasharray="2.2 2.2" />
        {MOTIFS[design.motif].map((d) => (
          <path key={d} d={d} strokeWidth={2.2} />
        ))}
      </g>
    </svg>
  );
}
