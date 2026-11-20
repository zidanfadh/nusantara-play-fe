/**
 * Phase 26: what a reviewer must see before approving: every media item of the record, plus the self-review rule.
 * Pure, unit-tested in tests/prot/review-media.test.tsx.
 *
 * Unlike the public pages, the review list does NOT drop denylisted files silently: a file on the Phase 25 denylist
 * (lib/prot/hidden-media.ts) is listed as "disembunyikan" without showing it, so the reviewer knows it exists.
 */
import { isHiddenField, isHiddenMediaUrl, type ProtMediaField } from '@/lib/prot/hidden-media';
import type { Peralatan, PROTEntity } from '@/types/prot';

export interface ReviewFile {
  url: string;
  hidden: boolean;
  fileName: string;
}

export interface ReviewLink {
  url: string;
  /** Host name without "www."; null when the text is not a valid http(s) URL. */
  domain: string | null;
  https: boolean;
  hidden: boolean;
}

export interface ReviewEquipment {
  nama: string;
  deskripsi: string | null;
  kisaranHarga: string | null;
  photos: ReviewFile[];
  links: ReviewLink[];
}

export interface ReviewMedia {
  photos: ReviewFile[];
  videos: ReviewFile[];
  documents: ReviewFile[];
  equipment: ReviewEquipment[];
  total: number;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

export function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '');
    return last || url;
  } catch {
    return url.split('/').pop() || url;
  }
}

export function linkInfo(url: string): ReviewLink {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { url, domain: null, https: false, hidden: isHiddenMediaUrl(url) };
    return {
      url,
      domain: parsed.hostname.replace(/^www\./i, '').toLowerCase(),
      https: parsed.protocol === 'https:',
      hidden: isHiddenMediaUrl(url),
    };
  } catch {
    return { url, domain: null, https: false, hidden: isHiddenMediaUrl(url) };
  }
}

export function reviewMedia(
  prot: Pick<PROTEntity, 'id' | 'fotoKegiatan' | 'videoKegiatan' | 'dokumenKurikulum' | 'peralatan'>,
): ReviewMedia {
  const fieldHidden = (field: ProtMediaField, peralatanNama?: string) =>
    isHiddenField({ protId: prot.id, field, peralatanNama });
  const toFile =
    (fieldIsHidden: boolean) =>
    (url: string): ReviewFile => ({ url, hidden: fieldIsHidden || isHiddenMediaUrl(url), fileName: fileNameFromUrl(url) });
  const photos = strings(prot.fotoKegiatan).map(toFile(fieldHidden('fotoKegiatan')));
  const videos = strings(prot.videoKegiatan).map(toFile(fieldHidden('videoKegiatan')));
  const documents = strings(prot.dokumenKurikulum).map(toFile(fieldHidden('dokumenKurikulum')));
  const equipment = (Array.isArray(prot.peralatan) ? prot.peralatan : []).map((p: Peralatan) => ({
    nama: typeof p?.nama === 'string' && p.nama.trim() ? p.nama : 'Tanpa nama',
    deskripsi: typeof p?.deskripsi === 'string' && p.deskripsi.trim() ? p.deskripsi : null,
    kisaranHarga: typeof p?.kisaranHarga === 'string' && p.kisaranHarga.trim() ? p.kisaranHarga : null,
    photos: strings(p?.fotoAlat).map(toFile(fieldHidden('fotoAlat', p?.nama))),
    links: strings(p?.urlPembelian).map((url) => {
      const link = linkInfo(url);
      return fieldHidden('urlPembelian', p?.nama) ? { ...link, hidden: true } : link;
    }),
  }));
  const total =
    photos.length +
    videos.length +
    documents.length +
    equipment.reduce((n, e) => n + e.photos.length + e.links.length, 0);
  return { photos, videos, documents, equipment, total };
}

export function isOwnRecord(user: { id?: string } | null | undefined, prot: Pick<PROTEntity, 'created_by'> | null | undefined): boolean {
  return Boolean(user?.id && prot?.created_by && user.id === prot.created_by);
}

/**
 * - `none`: not the creator.
 * - `warn`: the creator, production backend (no rule yet): warn, never send the override field.
 * - `override-required`: the creator is an admin and the Phase 26 backend is deployed (flag on): a reason is required.
 * - `blocked`: the creator is not an admin and the rule is deployed: the server refuses, so the form is disabled.
 */
export type SelfReviewState = 'none' | 'warn' | 'override-required' | 'blocked';

export function selfReviewState(
  user: { id?: string; role?: string } | null | undefined,
  prot: Pick<PROTEntity, 'created_by'> | null | undefined,
  ruleDeployed: boolean,
): SelfReviewState {
  if (!isOwnRecord(user, prot)) return 'none';
  if (!ruleDeployed) return 'warn';
  return user?.role === 'admin_kpoti' ? 'override-required' : 'blocked';
}

/** `selfReviewOverrideReason` in the Phase 26 DTOs: 10 to 500 characters. */
export const OVERRIDE_REASON_MIN = 10;
export const OVERRIDE_REASON_MAX = 500;

export function validateOverrideReason(text: string | null | undefined): string | null {
  const length = (text ?? '').trim().length;
  if (length < OVERRIDE_REASON_MIN) return `Tulis alasan minimal ${OVERRIDE_REASON_MIN} karakter.`;
  if (length > OVERRIDE_REASON_MAX) return `Alasan maksimal ${OVERRIDE_REASON_MAX} karakter.`;
  return null;
}
