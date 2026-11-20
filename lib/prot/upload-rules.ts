/**
 * Phase 26: which files each PROT upload field accepts, with client-side checks and Indonesian errors. Pure,
 * unit-tested in tests/prot/upload-rules.test.ts.
 *
 * Server (`nusantara-play-be/src/modules/storage/storage.service.ts` `validateFile()`, deployed): MIME type one of
 * image/jpeg, image/jpg, image/png, image/webp, application/pdf, video/mp4, video/quicktime, at most 100 MB per file,
 * on EVERY upload route; `FilesInterceptor('files', 10)`: at most 10 files per request. Anything else is refused (DOC
 * and DOCX never worked). The per-field lists below are narrower on purpose (a PDF is not an activity photo).
 *
 * Sizes: the server allows 100 MB, but the request also passes the Vercel rewrite (unverified above 4.5 MB, CLAUDE.md
 * Risks) and nginx (repo config 50 MB; production unknown). The form therefore keeps its own, lower limits: photos
 * 10 MB, videos 50 MB, documents 20 MB (the limits the form already showed), all under the server's 100 MB.
 */

export const SERVER_MAX_BYTES = 100 * 1024 * 1024;
export const SERVER_MAX_FILES_PER_REQUEST = 10;
export const SERVER_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
] as const;

export type UploadKind = 'fotoKegiatan' | 'videoKegiatan' | 'dokumenKurikulum' | 'fotoAlat';

export interface UploadRule {
  label: string;
  mimeTypes: readonly string[];
  /** For the file picker; extensions help on systems that report no MIME type. */
  accept: string;
  maxBytes: number;
  /** Shown under the upload area. */
  hint: string;
  /** Extensions accepted when the browser reports an empty `file.type` (some Windows setups). */
  extensions: readonly string[];
}

const MB = 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  fotoKegiatan: {
    label: 'Foto kegiatan',
    mimeTypes: IMAGE_TYPES,
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    maxBytes: 10 * MB,
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    hint: 'JPG, PNG atau WEBP. Maksimal 10 MB per file, 10 file sekali unggah.',
  },
  fotoAlat: {
    label: 'Foto alat',
    mimeTypes: IMAGE_TYPES,
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    maxBytes: 10 * MB,
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    hint: 'JPG, PNG atau WEBP. Maksimal 10 MB per file, 10 file per alat.',
  },
  videoKegiatan: {
    label: 'Video kegiatan',
    mimeTypes: ['video/mp4', 'video/quicktime'],
    accept: 'video/mp4,video/quicktime,.mp4,.mov',
    maxBytes: 50 * MB,
    extensions: ['mp4', 'mov'],
    hint: 'MP4 atau MOV. Maksimal 50 MB per file, 10 file sekali unggah.',
  },
  dokumenKurikulum: {
    label: 'Dokumen',
    mimeTypes: ['application/pdf'],
    accept: 'application/pdf,.pdf',
    maxBytes: 20 * MB,
    extensions: ['pdf'],
    hint: 'Hanya PDF (Word/DOC/DOCX tidak diterima server; simpan dulu sebagai PDF). Maksimal 20 MB per file, 10 file sekali unggah.',
  },
};

export function formatMb(bytes: number): string {
  const mb = bytes / MB;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`.replace('.', ',');
}

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** null = acceptable; otherwise one Indonesian sentence naming the file. */
export function fileError(kind: UploadKind, file: FileLike): string | null {
  const rule = UPLOAD_RULES[kind];
  const type = (file.type || '').toLowerCase();
  const typeOk = type ? rule.mimeTypes.includes(type) : rule.extensions.includes(extensionOf(file.name));
  if (!typeOk) {
    const isWord = /\.(docx?|odt|rtf)$/i.test(file.name) || type.includes('word');
    if (kind === 'dokumenKurikulum' && isWord) {
      return `"${file.name}" adalah dokumen Word. Simpan sebagai PDF lalu unggah lagi.`;
    }
    return `"${file.name}" tidak diterima. ${rule.label} harus ${describeTypes(kind)}.`;
  }
  if (file.size > rule.maxBytes) {
    return `"${file.name}" terlalu besar (${formatMb(file.size)}). Maksimal ${formatMb(rule.maxBytes)} per file.`;
  }
  if (file.size === 0) return `"${file.name}" kosong (0 byte).`;
  return null;
}

function describeTypes(kind: UploadKind): string {
  switch (kind) {
    case 'videoKegiatan':
      return 'MP4 atau MOV';
    case 'dokumenKurikulum':
      return 'PDF';
    default:
      return 'JPG, PNG atau WEBP';
  }
}

/**
 * Splits newly picked files into accepted ones and errors. `alreadyQueued` = files of this field waiting for the
 * next save (they are uploaded in one request, at most 10).
 */
export function checkFiles<T extends FileLike>(
  kind: UploadKind,
  files: readonly T[],
  alreadyQueued = 0,
): { accepted: T[]; errors: string[] } {
  const accepted: T[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const error = fileError(kind, file);
    if (error) {
      errors.push(error);
    } else if (alreadyQueued + accepted.length >= SERVER_MAX_FILES_PER_REQUEST) {
      errors.push(
        `"${file.name}" tidak ditambahkan: maksimal ${SERVER_MAX_FILES_PER_REQUEST} file sekali simpan. Simpan dulu, lalu tambahkan sisanya.`,
      );
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}
