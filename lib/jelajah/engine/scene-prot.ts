/**
 * PROT shown in a province scene (Phase 11): the public PROT (status ARSIP_NASIONAL) of one province,
 * fetched through apiClient (lib/jelajah/data.ts), sorted by name (= the stand order). Every field is
 * treated as untrusted and rendered as plain text.
 */
import { apiClient } from '@/lib/api/client';
import { fetchPublicProt, firstPhoto, PUBLIC_PROT_STATUS, type GetJson, type RawProt } from '@/lib/jelajah/data';
import { visibleMedia } from '@/lib/prot/hidden-media';

export interface SceneProt {
  id: string;
  nama: string;
  /** First https activity photo (local development: also a loopback http URL), or null. */
  foto: string | null;
  deskripsi: string;
  caraBermain: string;
}

/** Max characters of the description and of "cara bermain" in the panel (the full text is on /prot/[id]). */
export const DESCRIPTION_LIMIT = 280;
export const CARA_BERMAIN_LIMIT = 420;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Shortens text to at most `max` characters at a word boundary, with an ellipsis. */
export function shortText(text: string, max: number): string {
  const t = text.replace(/\s+\n/g, '\n').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  // The cut already ends at a word boundary when the next character is whitespace.
  if (/\s/.test(t[max - 1])) return `${cut.trimEnd()}…`;
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Public PROT of `provinsiKode` from raw API rows: deduplicated, sorted by name. Pure. */
export function shapeSceneProt(rows: readonly RawProt[], provinsiKode: string): SceneProt[] {
  const seen = new Set<string>();
  const out: SceneProt[] = [];
  for (const row of rows) {
    if (row.status !== PUBLIC_PROT_STATUS) continue;
    if (clean(row.provinsiKode) !== provinsiKode) continue;
    const id = clean(row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      nama: clean(row.nama) || 'Tanpa nama',
      foto: firstPhoto(visibleMedia(row.fotoKegiatan, { protId: id, field: 'fotoKegiatan' })),
      deskripsi: shortText(clean(row.deskripsi), DESCRIPTION_LIMIT),
      caraBermain: shortText(clean(row.caraBermain), CARA_BERMAIN_LIMIT),
    });
  }
  return out.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

export async function loadSceneProt(provinsiKode: string, get: GetJson = apiClient.get): Promise<SceneProt[]> {
  const rows = await fetchPublicProt(get, { provinsi: provinsiKode });
  return shapeSceneProt(rows, provinsiKode);
}
