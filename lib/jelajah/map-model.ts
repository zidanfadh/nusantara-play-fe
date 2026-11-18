/** State shared by the 2D and 3D map views. No three.js here. */
import type { ProvinceSummary } from './data';
import type { ProvinceShape } from './geo';
import { provinceFill, type MapPalette, type ProvinceVisualState } from './palette';
import { PILOT_PROVINCE } from './provinces';

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

/** Provinces with public PROT, and the pilot province, open a card. Others are muted. */
export function isClickable(
  kode: string | null,
  summaryByKode: ReadonlyMap<string, ProvinceSummary>,
): kode is string {
  if (!kode) return false;
  if (kode === PILOT_PROVINCE.kode) return true;
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
  return provinceFill(palette, count, maxCount, shape.kode === PILOT_PROVINCE.kode, state);
}
