/**
 * Paspor stamp designs (Phase 22): one simple, code-drawn stamp per enterable province, each with its own colour and
 * motif, shown in the Paspor and in the toast of the SIMULATED PASPOR_STAMP reward. Motifs echo the province's scene
 * (no logos, no traced artwork). Provinces without a design show the generic stamp icon.
 */

export type StampMotif = 'river' | 'palm' | 'wave' | 'mountain' | 'boat';

export interface StampDesign {
  color: string;
  motif: StampMotif;
}

export const STAMP_DESIGNS: Readonly<Record<string, StampDesign>> = {
  // Sumatera Selatan: a raised house by the river.
  '16': { color: '#9E3C24', motif: 'river' },
  // Aceh: a coconut palm.
  '11': { color: '#2F6B3A', motif: 'palm' },
  // Kepulauan Riau: a spinning top above the waves.
  '21': { color: '#1C6E8C', motif: 'wave' },
  // Jawa Tengah: a volcano above the terraces.
  '33': { color: '#7A4A1C', motif: 'mountain' },
  // Sulawesi Selatan: a sailing boat.
  '73': { color: '#5B3A8C', motif: 'boat' },
};

export function stampDesign(kode: string): StampDesign | null {
  return STAMP_DESIGNS[kode] ?? null;
}
