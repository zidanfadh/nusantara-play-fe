/** State shared by the 2D and 3D map views. No three.js here. */
import type { ProvinceSummary } from './data';
import type { ProvinceShape } from './geo';
import { provinceFill, type MapPalette, type ProvinceVisualState } from './palette';
import { enterableByKode } from './provinces';

export interface MapViewProps {
  shapes: readonly ProvinceShape[];
  summaryByKode: ReadonlyMap<string, ProvinceSummary>;
  hoveredKode: string | null;
  selectedKode: string | null;
  palette: MapPalette;
  onHover: (kode: string | null) => void;
  /** null = tap on the sea or on a province that is not clickable (closes the card). */
  onSelect: (kode: string | null) => void;
}

export function maxProtCount(summaryByKode: ReadonlyMap<string, ProvinceSummary>): number {
  let max = 0;
  for (const s of summaryByKode.values()) max = Math.max(max, s.protCount);
  return max;
}

/** Provinces with public PROT, and every enterable province (Phase 22; before: the pilot), open a card. Others are muted. */
export function isClickable(
  kode: string | null,
  summaryByKode: ReadonlyMap<string, ProvinceSummary>,
): kode is string {
  if (!kode) return false;
  if (enterableByKode(kode)) return true;
  return (summaryByKode.get(kode)?.protCount ?? 0) > 0;
}

export function visualState(
  kode: string | null,
  hoveredKode: string | null,
  selectedKode: string | null,
): ProvinceVisualState {
  if (kode && kode === selectedKode) return 'selected';
  if (kode && kode === hoveredKode) return 'hover';
  return 'idle';
}

export function shapeFill(
  shape: ProvinceShape,
  summaryByKode: ReadonlyMap<string, ProvinceSummary>,
  maxCount: number,
  palette: MapPalette,
  hoveredKode: string | null,
  selectedKode: string | null,
): string {
  const count = shape.kode ? summaryByKode.get(shape.kode)?.protCount ?? 0 : 0;
  const clickable = isClickable(shape.kode, summaryByKode);
  const state = clickable ? visualState(shape.kode, hoveredKode, selectedKode) : 'idle';
  return provinceFill(palette, count, maxCount, enterableByKode(shape.kode) !== null, state);
}

/** Lifts of the states (map units; the 2D map scales them), Phase 28. */
export const LIFT = { hover: 0.1, selected: 0.18 } as const;

export interface ProvinceCues {
  state: ProvinceVisualState;
  /** Provinces that open a card (PROT or enterable) stand taller than the muted ones. */
  raised: boolean;
  /** Extra lift of the hovered / selected province. */
  lift: number;
  /** Amber rim around the hovered / selected province. */
  rim: boolean;
  /** Terracotta ★ flag: an enterable province. */
  flag: boolean;
}

/**
 * Every state of a province on both maps (Phase 28), with cues that do not rely on colour alone: height, lift, rim
 * and flag. The colour (`shapeFill`) comes on top.
 */
export function provinceCues(
  kode: string | null,
  summaryByKode: ReadonlyMap<string, ProvinceSummary>,
  hoveredKode: string | null,
  selectedKode: string | null,
): ProvinceCues {
  const raised = isClickable(kode, summaryByKode);
  const state = raised ? visualState(kode, hoveredKode, selectedKode) : 'idle';
  return {
    state,
    raised,
    lift: state === 'selected' ? LIFT.selected : state === 'hover' ? LIFT.hover : 0,
    rim: state !== 'idle',
    flag: enterableByKode(kode) !== null,
  };
}
