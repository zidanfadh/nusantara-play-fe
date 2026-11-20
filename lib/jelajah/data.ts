/**
 * Data for the Jelajah hub map: provinces and their public PROT (status ARSIP_NASIONAL).
 *
 * Counting happens on the client: it loads every public PROT page by page. That does not scale
 * past a few thousand PROT; a backend endpoint (`GET /api/jelajah/provinces` returning the per-province
 * counts and a short list) should replace it later (Phase 10 report).
 */
import { apiClient } from '@/lib/api/client';
import { KNOWN_PROVINCES, provinceSlug, type ProvinceRef } from './provinces';
import { isHiddenMediaUrl, visibleMedia } from '@/lib/prot/hidden-media';

/** Only PROT with this status are public and may appear in Jelajah. */
export const PUBLIC_PROT_STATUS = 'ARSIP_NASIONAL';
export const PROT_PAGE_SIZE = 100;
/** Safety stop for the client-side count (100 × 50 = 5000 PROT). */
export const MAX_PROT_PAGES = 50;
/** PROT listed per province in the card. */
export const PROT_LIST_LIMIT = 6;

export interface JelajahProt {
  id: string;
  nama: string;
  /** First activity photo (https only) or null. */
  foto: string | null;
}

export interface ProvinceSummary {
  kode: string;
  nama: string;
  slug: string;
  protCount: number;
  /** Up to PROT_LIST_LIMIT PROT, sorted by name. */
  prots: JelajahProt[];
}

export interface JelajahData {
  provinces: ProvinceSummary[];
  totalProt: number;
  /** Public PROT whose provinsiKode is not in the province list (not shown on the map). */
  unassignedProt: number;
}

/** The fields of an API PROT that Jelajah reads. Everything is treated as untrusted. */
export interface RawProt {
  id?: unknown;
  nama?: unknown;
  status?: unknown;
  provinsiKode?: unknown;
  fotoKegiatan?: unknown;
  /** Read by the province scene (Phase 11). */
  deskripsi?: unknown;
  caraBermain?: unknown;
}

interface RawProvince {
  kode?: unknown;
  nama?: unknown;
}

interface Paginated<T> {
  data?: T[];
  pagination?: { hasNext?: boolean; totalPages?: number };
}

export type GetJson = <T>(endpoint: string) => Promise<T>;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Local development (Phase 13): the page itself is served from a loopback host (localhost:3001, next dev or
 * next start). Never true on the deployed site.
 */
export function isLocalPage(): boolean {
  try {
    return typeof window !== 'undefined' && LOOPBACK_HOSTS.has(window.location.hostname);
  } catch {
    return false;
  }
}

/**
 * First usable photo URL of a PROT, or null: https only. Exception for local development (Phase 13): an
 * http URL on a loopback host (the DEMO placeholder served by the local frontend) when `allowLocalHttp`,
 * i.e. when the page itself runs on a loopback host. On the deployed site no http URL is ever accepted.
 */
export function firstPhoto(fotoKegiatan: unknown, allowLocalHttp: boolean = isLocalPage()): string | null {
  if (!Array.isArray(fotoKegiatan)) return null;
  for (const value of fotoKegiatan) {
    if (typeof value !== 'string') continue;
    // Phase 25: never a hidden photo (lib/prot/hidden-media.ts).
    if (isHiddenMediaUrl(value)) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') return value;
      if (allowLocalHttp && url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) return value;
    } catch {
      // not a URL: skip
    }
  }
  return null;
}

function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Builds one summary per province (sorted by name) from the raw API lists. Pure. */
export function shapeProvinceSummaries(
  provinces: readonly RawProvince[],
  prots: readonly RawProt[],
  listLimit = PROT_LIST_LIMIT,
): JelajahData {
  const byKode = new Map<string, { ref: ProvinceRef; prots: JelajahProt[] }>();
  for (const p of provinces) {
    const kode = cleanName(p.kode);
    const nama = cleanName(p.nama);
    if (!kode || !nama || byKode.has(kode)) continue;
    byKode.set(kode, { ref: { kode, nama }, prots: [] });
  }

  const seen = new Set<string>();
  let totalProt = 0;
  let unassignedProt = 0;
  for (const prot of prots) {
    if (prot.status !== PUBLIC_PROT_STATUS) continue;
    const id = cleanName(prot.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    totalProt += 1;
    const entry = byKode.get(cleanName(prot.provinsiKode));
    if (!entry) {
      unassignedProt += 1;
      continue;
    }
    entry.prots.push({
      id,
      nama: cleanName(prot.nama) || 'Tanpa nama',
      foto: firstPhoto(visibleMedia(prot.fotoKegiatan, { protId: id, field: 'fotoKegiatan' })),
    });
  }

  const summaries: ProvinceSummary[] = [...byKode.values()].map(({ ref, prots: list }) => {
    const sorted = [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    return {
      kode: ref.kode,
      nama: ref.nama,
      slug: provinceSlug(ref.nama),
      protCount: list.length,
      prots: sorted.slice(0, listLimit),
    };
  });
  summaries.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  return { provinces: summaries, totalProt, unassignedProt };
}

/** Summaries with zero PROT for every known province (used while loading or after an error). */
export function emptySummaries(): ProvinceSummary[] {
  return shapeProvinceSummaries(KNOWN_PROVINCES, []).provinces;
}

export async function fetchProvinces(get: GetJson = apiClient.get): Promise<RawProvince[]> {
  const res = await get<Paginated<RawProvince>>('/daerah/provinces?page=1&limit=100');
  return Array.isArray(res?.data) ? res.data : [];
}

/**
 * Every public PROT, page by page. `status=ARSIP_NASIONAL` is sent explicitly because apiClient
 * attaches the login token, and logged-in kurator/admin users would otherwise also get drafts.
 */
export async function fetchPublicProt(
  get: GetJson = apiClient.get,
  query: Record<string, string> = {},
): Promise<RawProt[]> {
  const all: RawProt[] = [];
  for (let page = 1; page <= MAX_PROT_PAGES; page += 1) {
    const params = new URLSearchParams({
      ...query,
      status: PUBLIC_PROT_STATUS,
      page: String(page),
      limit: String(PROT_PAGE_SIZE),
    });
    const res = await get<Paginated<RawProt>>(`/prot?${params.toString()}`);
    const data = Array.isArray(res?.data) ? res.data : [];
    all.push(...data);
    if (!res?.pagination?.hasNext || data.length === 0) break;
  }
  return all;
}

export async function loadJelajahData(get: GetJson = apiClient.get): Promise<JelajahData> {
  const [provinces, prots] = await Promise.all([fetchProvinces(get), fetchPublicProt(get)]);
  return shapeProvinceSummaries(provinces.length > 0 ? provinces : KNOWN_PROVINCES, prots);
}

/** Public PROT of one province, full list (province page). */
export async function loadProvinceProt(
  kode: string,
  get: GetJson = apiClient.get,
): Promise<JelajahProt[]> {
  const prots = await fetchPublicProt(get, { provinsi: kode });
  const shaped = shapeProvinceSummaries([{ kode, nama: kode }], prots, Number.POSITIVE_INFINITY);
  return shaped.provinces[0]?.prots ?? [];
}
