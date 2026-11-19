/**
 * Landing page statistics (Phase 18, owner decision): PROT and province counts come from PUBLISHED PROT
 * only (status ARSIP_NASIONAL, through the public `GET /prot` API), counted with the same code as the
 * Jelajah map and the intro bumper (`fetchPublicProt` + `shapeProvinceSummaries`), so the three always
 * agree. Events and members still come from `GET /stats/landing`. A number that is 0 or unknown is hidden.
 */
import { getBackendApiUrl } from '@/lib/api/base-url';
import type { LandingStats } from '@/lib/api/stats';
import { fetchPublicProt, shapeProvinceSummaries, type GetJson } from '@/lib/jelajah/data';
import { KNOWN_PROVINCES } from '@/lib/jelajah/provinces';

export interface PublishedCounts {
  totalProt: number;
  totalProvinsi: number;
}

export interface StatTile {
  value: string;
  label: string;
}

/**
 * Server-side GET without a login token (public data only; a kurator's token would also list drafts),
 * cached like the rest of the landing page (60 s).
 */
const publicGet: GetJson = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${getBackendApiUrl()}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
};

/** Published PROT and the provinces that have at least one; null when the API fails (numbers hidden). */
export async function getPublishedCounts(get: GetJson = publicGet): Promise<PublishedCounts | null> {
  try {
    const prots = await fetchPublicProt(get);
    const { provinces, totalProt } = shapeProvinceSummaries(KNOWN_PROVINCES, prots);
    return { totalProt, totalProvinsi: provinces.filter((p) => p.protCount > 0).length };
  } catch {
    return null;
  }
}

/** The tiles to show, in order; a 0 (or unknown) number is left out (same rule as the bumper). */
export function landingStatTiles(published: PublishedCounts | null, stats: LandingStats): StatTile[] {
  const tiles: Array<{ n: number | null | undefined; label: string }> = [
    { n: published?.totalProt, label: 'Permainan' },
    { n: published?.totalProvinsi, label: 'Provinsi' },
    { n: stats.totalEvents, label: 'Events' },
    { n: stats.totalUsers, label: 'Anggota' },
  ];
  return tiles
    .filter((t): t is { n: number; label: string } => typeof t.n === 'number' && Number.isFinite(t.n) && t.n > 0)
    .map((t) => ({ value: t.n.toLocaleString('id-ID'), label: t.label }));
}
