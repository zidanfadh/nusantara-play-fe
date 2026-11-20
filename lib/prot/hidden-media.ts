/**
 * Hidden PROT media (Phase 25, privacy hotfix).
 *
 * Published PROT media cannot be removed through the UI yet (the backend accepts media changes only in DRAFT /
 * REVISI, and the admin removal endpoint of Phase 25 is not deployed). Until it is, this file hides media on
 * every page that renders PROT media: /prot, /prot/[id], the landing page's featured cards, the Jelajah hub card,
 * stand panels and 2D cards, and the intro bumper's photo strip. A hidden item disappears silently: no broken
 * image, no empty frame, no link.
 *
 * IMPORTANT: this is only a display filter. The files stay in the public S3 bucket and their URLs stay in the
 * public API response until an admin removes them on the backend (backend CLAUDE.md "Pending deployment").
 *
 * Rules for entries:
 * - Hide files that contain personal data or that are clearly harmful / unrelated and embarrassing. Do NOT hide
 *   files that are merely of low quality (those go to the curator).
 * - Never write personal data here: the reason names the record, the field and the TYPE of problem only.
 * - Every entry points to the phase report that found it.
 *
 * Documents ("dokumenKurikulum") are not shown on public pages at all unless the build-time flag
 * NEXT_PUBLIC_SHOW_PROT_DOCUMENTS is "true" (default off). Reviewer roles still see the documents that are not
 * hidden here, on /prot/[id] (see `canSeeProtDocuments`).
 */

export type ProtMediaField = 'fotoKegiatan' | 'videoKegiatan' | 'dokumenKurikulum' | 'fotoAlat' | 'urlPembelian';

export interface HiddenMediaEntry {
  /** Exact URL (compared without query string and fragment, host case-insensitive). */
  url: string;
  reason: string;
}

export interface HiddenFieldRule {
  protId: string;
  field: ProtMediaField;
  /** For fotoAlat / urlPembelian: the equipment name (case-insensitive, trimmed). Omitted = every equipment. */
  peralatanNama?: string;
  reason: string;
}

const SEPANGKAL = '752aeea4-a9c4-455b-a216-71f508bcfe3c';

/** Exact files that must never be displayed. See nusantara-play-be/docs/phase-reports/phase-24.md and phase-25.md. */
export const HIDDEN_MEDIA: readonly HiddenMediaEntry[] = [
  {
    // SEPANGKAL (Aceh), dokumenKurikulum. Phase 24 report section 9.1; Phase 25 audit.
    url: 'https://nusantara-play-storage.s3.ap-southeast-2.amazonaws.com/prot/dokumen-kurikulum/7a4de8b1-c0bd-4570-bc9f-9a8b421a673e.pdf',
    reason: 'Personal data: names and national ID (KTP) numbers of real people; unrelated to the game.',
  },
  {
    // SEPANGKAL, equipment "Biji Pinang", fotoAlat. Phase 24 report section 8 / 9.2.
    url: 'https://nusantara-play-storage.s3.ap-southeast-2.amazonaws.com/prot/peralatan/33403898-d974-458e-906d-9d13001e2701.png',
    reason: 'Unrelated and embarrassing: a football trophy, not the equipment.',
  },
  {
    // SEPANGKAL, equipment "Biji Pinang", urlPembelian. Phase 24 report section 8 / 9.2.
    url: 'https://www.lazada.co.id/products/kue-biji-ketapang-kelapa-parut-asli-renyah-gurih-kemasan-toples-300gr-i5195340660-s9759820242.html',
    reason: 'Unrelated purchase link: a cake product, not the equipment.',
  },
];

/** Whole fields of one record (optionally one equipment item) that must never be displayed. */
export const HIDDEN_FIELDS: readonly HiddenFieldRule[] = [
  {
    // Phase 24 report section 8: every purchase link of this equipment item is a placeholder.
    protId: SEPANGKAL,
    field: 'urlPembelian',
    peralatanNama: 'Biji Pinang',
    reason: 'Purchase link unrelated to the equipment.',
  },
];

/** "true" (case-insensitive, trimmed) turns documents on; anything else (also unset) keeps them off. */
export function parseShowDocumentsFlag(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

/**
 * Build-time flag. Must be read as the literal `process.env.NEXT_PUBLIC_SHOW_PROT_DOCUMENTS` so that Next.js inlines
 * it into the browser bundle.
 */
export const SHOW_PROT_DOCUMENTS: boolean = parseShowDocumentsFlag(process.env.NEXT_PUBLIC_SHOW_PROT_DOCUMENTS);

/** Roles that review records (existing role check of the PROT pages). */
export const DOCUMENT_REVIEWER_ROLES: readonly string[] = ['kurator_daerah', 'pakar', 'admin_kpoti'];

/** Documents are displayed when the flag is on, or to a logged-in reviewer role. Hidden documents never. */
export function canSeeProtDocuments(role: string | null | undefined, flag: boolean = SHOW_PROT_DOCUMENTS): boolean {
  return flag || (typeof role === 'string' && DOCUMENT_REVIEWER_ROLES.includes(role));
}

/** Comparison key of a URL: lower-case protocol and host, path as is, no query or fragment. Null if not a URL. */
export function mediaKey(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
  } catch {
    return null;
  }
}

const HIDDEN_KEYS: ReadonlySet<string> = new Set(
  HIDDEN_MEDIA.map((e) => mediaKey(e.url)).filter((k): k is string => k !== null),
);

/** True for a URL in HIDDEN_MEDIA (any query string or fragment). */
export function isHiddenMediaUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const key = mediaKey(url);
  return key !== null && HIDDEN_KEYS.has(key);
}

export interface MediaContext {
  protId?: unknown;
  field: ProtMediaField;
  peralatanNama?: unknown;
}

function norm(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** True when a HIDDEN_FIELDS rule hides the whole field in this context. */
export function isHiddenField(ctx: MediaContext): boolean {
  const id = norm(ctx.protId);
  if (!id) return false;
  return HIDDEN_FIELDS.some(
    (r) =>
      norm(r.protId) === id &&
      r.field === ctx.field &&
      (r.peralatanNama === undefined || norm(r.peralatanNama) === norm(ctx.peralatanNama)),
  );
}

/**
 * THE shared helper: the displayable URLs of one media field. Drops non-strings, empty strings, URLs in
 * HIDDEN_MEDIA, and everything when a HIDDEN_FIELDS rule hides the field. Never throws.
 */
export function visibleMedia(urls: unknown, ctx?: MediaContext): string[] {
  if (!Array.isArray(urls)) return [];
  if (ctx && isHiddenField(ctx)) return [];
  return urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0 && !isHiddenMediaUrl(u));
}

interface MediaShape {
  id?: unknown;
  fotoKegiatan?: unknown;
  videoKegiatan?: unknown;
  dokumenKurikulum?: unknown;
  peralatan?: unknown;
}

export interface PublicPeralatan<P> {
  item: P;
  fotoAlat: string[];
  urlPembelian: string[];
}

export interface PublicProtMedia<P> {
  fotoKegiatan: string[];
  videoKegiatan: string[];
  /** Empty unless `showDocuments`. */
  dokumenKurikulum: string[];
  peralatan: PublicPeralatan<P>[];
}

/** Every displayable media of a record, through `visibleMedia`. Equipment items themselves are kept. */
export function publicProtMedia<P extends { nama?: unknown; fotoAlat?: unknown; urlPembelian?: unknown }>(
  prot: MediaShape,
  opts: { showDocuments?: boolean } = {},
): PublicProtMedia<P> {
  const protId = prot.id;
  const peralatan = Array.isArray(prot.peralatan) ? (prot.peralatan as P[]) : [];
  return {
    fotoKegiatan: visibleMedia(prot.fotoKegiatan, { protId, field: 'fotoKegiatan' }),
    videoKegiatan: visibleMedia(prot.videoKegiatan, { protId, field: 'videoKegiatan' }),
    dokumenKurikulum: opts.showDocuments
      ? visibleMedia(prot.dokumenKurikulum, { protId, field: 'dokumenKurikulum' })
      : [],
    peralatan: peralatan
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        item,
        fotoAlat: visibleMedia(item.fotoAlat, { protId, field: 'fotoAlat', peralatanNama: item.nama }),
        urlPembelian: visibleMedia(item.urlPembelian, { protId, field: 'urlPembelian', peralatanNama: item.nama }),
      })),
  };
}

/** First displayable activity photo of a record, or null (cards). */
export function firstVisiblePhoto(prot: MediaShape): string | null {
  return visibleMedia(prot.fotoKegiatan, { protId: prot.id, field: 'fotoKegiatan' })[0] ?? null;
}
