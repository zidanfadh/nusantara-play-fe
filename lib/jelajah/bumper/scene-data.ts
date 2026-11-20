/**
 * Data and texts of the Jelajah intro bumper scenes (Phase 16). Pure, tested in
 * `tests/jelajah/bumper-scene-data.test.ts`.
 *
 * Only real data or neutral text: numbers come from the hub data (public PROT, ARSIP_NASIONAL) and from
 * `GET /stats/landing`; when a number is unknown (still loading, error, invalid), the scene shows its
 * text without the number. Nothing here invents facts.
 */
import type { GetJson, JelajahData, JelajahProt } from '../data';
import { isHiddenMediaUrl } from '@/lib/prot/hidden-media';

export type BumperSceneId = 'brand' | 'prot' | 'peta' | 'game' | 'komunitas' | 'mulai';

/** Storyboard order and duration (ms) of each scene: 19 s in total. */
export const BUMPER_SCENES: readonly { id: BumperSceneId; label: string; durationMs: number }[] = [
  { id: 'brand', label: 'Pembuka', durationMs: 3000 },
  { id: 'prot', label: 'Arsip PROT', durationMs: 3000 },
  { id: 'peta', label: 'Jelajah Nusantara', durationMs: 3000 },
  { id: 'game', label: 'Main game tradisional', durationMs: 3000 },
  { id: 'komunitas', label: 'Event dan komunitas', durationMs: 3000 },
  { id: 'mulai', label: 'XP dan Paspor', durationMs: 4000 },
];

export const BUMPER_DURATIONS = BUMPER_SCENES.map((s) => s.durationMs);

export const MAX_BUMPER_PHOTOS = 4;

export type HubStatus = 'loading' | 'ready' | 'error';

const fmt = (n: number) => n.toLocaleString('id-ID');

export interface BumperPhoto {
  id: string;
  nama: string;
  foto: string;
}

/**
 * Up to `max` PROT with a photo, at most one per province first (for variety), then the rest; provinces
 * in their list order (by name), PROT in name order. Deterministic.
 */
export function pickProtPhotos(data: JelajahData, max = MAX_BUMPER_PHOTOS): BumperPhoto[] {
  const withPhoto = (list: readonly JelajahProt[]) =>
    list.filter(
      (p): p is JelajahProt & { foto: string } =>
        typeof p.foto === 'string' && p.foto.length > 0 && !isHiddenMediaUrl(p.foto), // Phase 25
    );
  const perProvince = data.provinces.map((p) => withPhoto(p.prots));
  const picked: BumperPhoto[] = [];
  const seen = new Set<string>();
  for (let round = 0; picked.length < max; round += 1) {
    let any = false;
    for (const list of perProvince) {
      const prot = list[round];
      if (!prot) continue;
      any = true;
      if (seen.has(prot.id)) continue;
      seen.add(prot.id);
      picked.push({ id: prot.id, nama: prot.nama, foto: prot.foto });
      if (picked.length >= max) break;
    }
    if (!any) break;
  }
  return picked;
}

export interface ProtSceneData {
  /** Number of public PROT, or null while unknown (loading or error). */
  count: number | null;
  photos: BumperPhoto[];
  headline: string;
  text: string;
}

export function protSceneData(data: JelajahData, status: HubStatus): ProtSceneData {
  const count = status === 'ready' ? data.totalProt : null;
  const photos = status === 'ready' ? pickProtPhotos(data) : [];
  if (count === null) {
    return {
      count,
      photos,
      headline: 'Arsip PROT',
      text: 'Permainan rakyat dan olahraga tradisional (PROT) dalam arsip publik.',
    };
  }
  if (count === 0) {
    return {
      count,
      photos,
      headline: 'Arsip PROT',
      text: 'PROT publik akan tampil di sini setelah selesai dikurasi.',
    };
  }
  return {
    count,
    photos,
    headline: `${fmt(count)} PROT publik`,
    text: 'Permainan rakyat dan olahraga tradisional dalam arsip publik.',
  };
}

export interface MapSceneData {
  /** Codes of the provinces with at least one public PROT (empty while unknown). */
  highlighted: string[];
  /** Number of those provinces, or null while unknown. */
  count: number | null;
  headline: string;
  text: string;
}

const MAP_TEXT = 'Pilih provinsi di peta Indonesia, lalu lihat PROT-nya.';

export function mapSceneData(data: JelajahData, status: HubStatus): MapSceneData {
  const highlighted = status === 'ready' ? data.provinces.filter((p) => p.protCount > 0).map((p) => p.kode) : [];
  const count = status === 'ready' ? highlighted.length : null;
  return {
    highlighted,
    count,
    headline: count ? `${fmt(count)} provinsi dengan PROT publik` : 'Peta provinsi Indonesia',
    text: MAP_TEXT,
  };
}

export interface CommunityStats {
  events: number | null;
  members: number | null;
}

const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;

/** The two numbers the bumper shows from `GET /stats/landing`; null when neither is usable. */
export function parseLandingStats(raw: unknown): CommunityStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { totalEvents?: unknown; totalUsers?: unknown };
  const stats = { events: count(r.totalEvents), members: count(r.totalUsers) };
  return stats.events === null && stats.members === null ? null : stats;
}

export const LANDING_STATS_ENDPOINT = '/stats/landing';

/** Public, read-only. Any failure (network, HTTP error, odd body) gives null: the scene then shows no numbers. */
export async function loadBumperStats(get: GetJson): Promise<CommunityStats | null> {
  try {
    return parseLandingStats(await get<unknown>(LANDING_STATS_ENDPOINT));
  } catch {
    return null;
  }
}

/** The number tiles of the community scene: only numbers greater than 0 (a 0 tile says nothing). */
export function communityTiles(stats: CommunityStats | null): { value: string; label: string }[] {
  if (!stats) return [];
  const tiles: { value: string; label: string }[] = [];
  if (stats.events !== null && stats.events > 0) tiles.push({ value: fmt(stats.events), label: 'Event' });
  if (stats.members !== null && stats.members > 0) tiles.push({ value: fmt(stats.members), label: 'Anggota' });
  return tiles;
}
