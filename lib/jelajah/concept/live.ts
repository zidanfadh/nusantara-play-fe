/**
 * Live data of the concept video (Phase 19), from the hub's own data (published PROT only: the map's
 * `fetchPublicProt` + `shapeProvinceSummaries`, the same code as the landing statistics). Pure; tested in
 * tests/jelajah/concept-live.test.ts. Unknown or 0 numbers are left out, never guessed.
 */
import type { JelajahData } from '../data';
import { archiveSubcaption } from './script';

export type HubStatus = 'loading' | 'ready' | 'error';

export interface PublishedCounts {
  prot: number;
  provinces: number;
}

/** Published PROT and the provinces that have one; null while loading, after an error, or when 0. */
export function publishedCounts(data: JelajahData, status: HubStatus): PublishedCounts | null {
  if (status !== 'ready') return null;
  const provinces = data.provinces.filter((p) => p.protCount > 0).length;
  if (data.totalProt <= 0 || provinces <= 0) return null;
  return { prot: data.totalProt, provinces };
}

/** Scene 4's subcaption, or null (then the scene has none). */
export function liveArchiveSubcaption(data: JelajahData, status: HubStatus): string | null {
  const counts = publishedCounts(data, status);
  return counts ? archiveSubcaption(counts.prot, counts.provinces) : null;
}

export interface ArchiveCard {
  /** Real PROT name, or null for a neutral card without a name. */
  nama: string | null;
  provinsi: string | null;
}

/**
 * `count` archive cards: real published PROT (one per province first, provinces in list order, PROT in
 * name order); when there are fewer (or the data is unknown) the rest are neutral cards without names.
 */
export function archiveCards(data: JelajahData, status: HubStatus, count: number): ArchiveCard[] {
  const cards: ArchiveCard[] = [];
  if (status === 'ready') {
    const lists = data.provinces.filter((p) => p.prots.length > 0);
    const seen = new Set<string>();
    for (let round = 0; cards.length < count; round += 1) {
      let any = false;
      for (const p of lists) {
        const prot = p.prots[round];
        if (!prot) continue;
        any = true;
        if (seen.has(prot.id) || !prot.nama.trim()) continue;
        seen.add(prot.id);
        cards.push({ nama: prot.nama.trim(), provinsi: p.nama });
        if (cards.length >= count) break;
      }
      if (!any) break;
    }
  }
  while (cards.length < count) cards.push({ nama: null, provinsi: null });
  return cards;
}
