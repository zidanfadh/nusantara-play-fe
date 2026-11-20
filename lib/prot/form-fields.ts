/**
 * Phase 26: rules of the PROT form fields that the backend accepts, and the ONE payload builder for create and
 * update. Pure (no React), unit-tested in tests/prot/form-fields.test.ts.
 *
 * Source of truth is the backend DTO `nusantara-play-be/src/modules/prot/dto/create-prot.dto.ts` (+ `peralatan.dto.ts`):
 * the global ValidationPipe has `forbidNonWhitelisted: true`, so ONE unknown key fails the whole request. Both
 * `deskripsi` and `jumlahPemain` are in the DTO deployed in production (Phase 26 report, step 0).
 */
import { DESCRIPTION_LIMIT } from '@/lib/jelajah/engine/scene-prot';
import type { Peralatan, PROTEntity } from '@/types/prot';

/** About this many characters of `deskripsi` are shown in a Jelajah stand panel (`lib/jelajah/engine/scene-prot.ts`). */
export const DESKRIPSI_JELAJAH_CHARS = DESCRIPTION_LIMIT;

/**
 * The backend has NO length limit for `deskripsi` (`@IsString()`, column `text`). The counter therefore shows the
 * Jelajah panel length as a guide, never as an error.
 */
export const DESKRIPSI_SERVER_MAX: number | null = null;

/** `jumlahPemain`: `@IsInt() @Min(1)`, column `int` (PostgreSQL integer, so at most 2147483647). */
export const JUMLAH_PEMAIN_MIN = 1;
export const JUMLAH_PEMAIN_MAX = 2147483647;

export function deskripsiCounter(text: string | null | undefined): { text: string; overJelajah: boolean } {
  const length = (text ?? '').length;
  const overJelajah = length > DESKRIPSI_JELAJAH_CHARS;
  const base = `${length} karakter`;
  return {
    overJelajah,
    text: overJelajah
      ? `${base} · panel stan Jelajah hanya menampilkan sekitar ${DESKRIPSI_JELAJAH_CHARS} karakter pertama`
      : `${base} · sekitar ${DESKRIPSI_JELAJAH_CHARS} karakter pertama tampil di panel stan Jelajah`,
  };
}

export type JumlahPemainResult = { ok: true; value: number | null } | { ok: false; error: string };

/** Form input → the value to send. Empty = not filled in (null). Only whole numbers >= 1. */
export function parseJumlahPemain(raw: string | number | null | undefined): JumlahPemainResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const text = String(raw).trim();
  if (text === '') return { ok: true, value: null };
  if (!/^\d+$/.test(text)) {
    return { ok: false, error: 'Jumlah pemain harus berupa angka bulat, misalnya 4.' };
  }
  const value = Number(text);
  if (value < JUMLAH_PEMAIN_MIN) return { ok: false, error: 'Jumlah pemain minimal 1.' };
  if (!Number.isSafeInteger(value) || value > JUMLAH_PEMAIN_MAX) {
    return { ok: false, error: 'Jumlah pemain terlalu besar.' };
  }
  return { ok: true, value };
}

/**
 * Fields the guide (`docs/panduan-input-prot.md`, "Supaya tampil bagus di Jelajah") recommends for Jelajah, plus
 * `deskripsi`, which the stand panel shows. The form marks them with a "Disarankan untuk Jelajah" badge.
 */
export const JELAJAH_RECOMMENDED_FIELDS = [
  'nama',
  'wilayah',
  'deskripsi',
  'caraBermain',
  'nilaiMoral',
  'fotoKegiatan',
] as const;
export type JelajahRecommendedField = (typeof JELAJAH_RECOMMENDED_FIELDS)[number];
export const JELAJAH_BADGE_LABEL = 'Disarankan untuk Jelajah';

/** Help texts: where each new field is shown. */
export const FIELD_HELP = {
  deskripsi:
    'Ringkasan singkat permainan dalam 1 sampai 3 kalimat. Tampil di panel stan desa Jelajah (sekitar 280 karakter pertama) dan di halaman PROT.',
  jumlahPemain:
    'Jumlah pemain yang biasa bermain dalam satu permainan (angka bulat, minimal 1). Tampil di halaman PROT. Kosongkan jika tidak tentu.',
} as const;

/** Keys of `CreatePROTDto` (and `UpdatePROTDto` = PartialType of it). */
const PROT_WRITE_KEYS = [
  'nama',
  'jenis',
  'statusAsalUsul',
  'provinsiKode',
  'kabkotaKode',
  'kecamatanKode',
  'desaKode',
  'alamatLengkap',
  'deskripsi',
  'caraBermain',
  'nilaiMoral',
  'targetUsia',
  'peralatan',
  'jumlahPemain',
] as const;

/** Keys of `PeralatanDto`. */
const PERALATAN_KEYS = ['nama', 'deskripsi', 'kisaranHarga', 'fotoAlat', 'urlPembelian'] as const;

export type ProtWritePayload = Partial<Pick<PROTEntity, (typeof PROT_WRITE_KEYS)[number]>>;

function cleanPeralatan(item: Peralatan): Peralatan {
  const out: Record<string, unknown> = {};
  for (const key of PERALATAN_KEYS) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    if (key === 'fotoAlat' || key === 'urlPembelian') {
      // Empty purchase-link inputs are not data (the backend would store "").
      out[key] = (Array.isArray(value) ? value : []).filter((v) => typeof v === 'string' && v.trim() !== '');
    } else {
      out[key] = value;
    }
  }
  return out as unknown as Peralatan;
}

/**
 * Builds the body of `POST /prot` (`mode: 'create'`) or `PATCH /prot/:id` (`mode: 'update'`) from the form state.
 * Whitelist: only DTO keys are copied, so read-only API fields (id, status, kecamatanName, desaName, …) and the
 * form's own file lists never reach the backend. Media arrays are managed by the upload/delete routes and are not
 * sent. `jumlahPemain`: on create an empty value is left out; on update it is sent as null to clear it.
 */
export function toProtWritePayload(
  data: Partial<PROTEntity> & Record<string, unknown>,
  mode: 'create' | 'update',
): ProtWritePayload {
  const out: Record<string, unknown> = {};
  for (const key of PROT_WRITE_KEYS) {
    const value = data[key];
    if (key === 'jumlahPemain') {
      const parsed = parseJumlahPemain(value as string | number | null | undefined);
      const jumlah = parsed.ok ? parsed.value : null;
      if (jumlah !== null) out.jumlahPemain = jumlah;
      else if (mode === 'update') out.jumlahPemain = null;
      continue;
    }
    if (value === undefined || value === null) continue;
    if (key === 'peralatan') {
      out.peralatan = (Array.isArray(value) ? value : []).map((p) => cleanPeralatan(p as Peralatan));
      continue;
    }
    out[key] = value;
  }
  return out as ProtWritePayload;
}
