/**
 * Phase 26: every media item of a record on the review page, so the reviewer sees what they approve: photos (with a
 * link to the full size), videos, document names with an open/download link, equipment photos and purchase links
 * with their domain. Denylisted files (Phase 25) are listed as hidden and never shown. Stateless.
 */
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import type { ReviewFile, ReviewMedia } from '@/lib/prot/review-media';

const sectionCls = 'rounded-lg border border-border bg-background p-4';
const headingCls = 'mb-3 text-sm font-semibold';

function HiddenItem({ file }: { file: ReviewFile }) {
  return (
    <div
      data-review-hidden
      className="flex aspect-square items-center justify-center rounded border border-dashed border-border bg-muted p-2 text-center text-[11px] text-muted-foreground"
    >
      Disembunyikan dari situs (daftar sembunyi). Jangan setujui sebelum file ini dihapus atau diganti.
      <span className="sr-only"> {file.fileName}</span>
    </div>
  );
}

function PhotoGrid({ files, label }: { files: ReviewFile[]; label: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {files.map((file, i) => (
        <li key={`${file.url}-${i}`} data-review-photo>
          {file.hidden ? (
            <HiddenItem file={file} />
          ) : (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Buka ukuran penuh di tab baru"
            >
              <div className="relative aspect-square bg-muted">
                <ProtPhoto src={file.url} alt={`${label} ${i + 1}`} size="cover" />
              </div>
              <span className="block px-2 py-1 text-[11px] text-primary-text">
                {i === 0 && label === 'Foto kegiatan' ? 'Foto pertama · ' : ''}Buka ukuran penuh ↗
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReviewMediaPanel({ media }: { media: ReviewMedia }) {
  return (
    <div className="space-y-4" data-review-media>
      <p className="text-sm text-muted-foreground">
        {media.total === 0
          ? 'Data ini tidak punya foto, video, dokumen atau tautan.'
          : `${media.total} file dan tautan. Buka setiap item sebelum menyetujui.`}
      </p>

      <section className={sectionCls} aria-label="Foto kegiatan">
        <h3 className={headingCls}>Foto kegiatan ({media.photos.length})</h3>
        {media.photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada foto. Tanpa foto, PROT tampil tanpa gambar di Jelajah.</p>
        ) : (
          <PhotoGrid files={media.photos} label="Foto kegiatan" />
        )}
      </section>

      <section className={sectionCls} aria-label="Video kegiatan">
        <h3 className={headingCls}>Video kegiatan ({media.videos.length})</h3>
        {media.videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada video.</p>
        ) : (
          <ul className="space-y-3">
            {media.videos.map((file, i) => (
              <li key={`${file.url}-${i}`} data-review-video>
                {file.hidden ? (
                  <HiddenItem file={file} />
                ) : (
                  <>
                    <video src={file.url} controls preload="metadata" className="w-full max-h-72 rounded bg-black" />
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-text hover:underline">
                      Buka video di tab baru ↗
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionCls} aria-label="Dokumen">
        <h3 className={headingCls}>Dokumen ({media.documents.length})</h3>
        {media.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada dokumen.</p>
        ) : (
          <ul className="space-y-2">
            {media.documents.map((file, i) => (
              <li key={`${file.url}-${i}`} data-review-document className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 break-all font-medium">{file.fileName}</span>
                {file.hidden ? (
                  <span data-review-hidden className="text-xs text-muted-foreground">Disembunyikan (daftar sembunyi)</span>
                ) : (
                  <a href={file.url} target="_blank" rel="noopener noreferrer" download className="shrink-0 text-primary-text hover:underline">
                    Buka / unduh ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {media.documents.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Baca setiap dokumen sampai halaman terakhir. Jangan setujui dokumen yang berisi data pribadi (NIK/KTP, telepon,
            email, alamat, tanda tangan, daftar peserta).
          </p>
        )}
      </section>

      <section className={sectionCls} aria-label="Peralatan">
        <h3 className={headingCls}>Peralatan ({media.equipment.length})</h3>
        {media.equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada peralatan.</p>
        ) : (
          <ul className="space-y-4">
            {media.equipment.map((alat, i) => (
              <li key={i} data-review-equipment className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="font-medium">
                  {alat.nama}
                  {alat.kisaranHarga ? <span className="font-normal text-muted-foreground"> · Rp {alat.kisaranHarga}</span> : null}
                </p>
                {alat.deskripsi && <p className="whitespace-pre-line text-sm">{alat.deskripsi}</p>}
                {alat.photos.length > 0 ? (
                  <PhotoGrid files={alat.photos} label={`Foto alat ${alat.nama}`} />
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada foto alat.</p>
                )}
                {alat.links.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {alat.links.map((link, j) => (
                      <li key={j} data-review-link className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold" data-review-domain>
                          {link.domain ?? 'Tautan tidak valid'}
                        </span>
                        {link.hidden ? (
                          <span data-review-hidden className="text-xs text-muted-foreground">Disembunyikan (daftar sembunyi)</span>
                        ) : link.domain ? (
                          <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 break-all text-xs text-primary-text hover:underline">
                            {link.url}
                          </a>
                        ) : (
                          <span className="min-w-0 break-all text-xs text-muted-foreground">{link.url}</span>
                        )}
                        {link.domain && !link.https && <span className="text-xs text-warning">tanpa https</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function SelfReviewWarning({ state, action = 'memeriksa' }: { state: 'warn' | 'override-required' | 'blocked'; action?: string }) {
  return (
    <div role="alert" data-self-review={state} className="rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
      <p className="font-bold">Anda adalah pembuat PROT ini.</p>
      {state === 'warn' && (
        <p className="mt-1">
          Jangan {action} PROT buatan sendiri: minta pemeriksa lain. Aturan ini akan ditegakkan server setelah pembaruan
          server.
        </p>
      )}
      {state === 'blocked' && (
        <p className="mt-1">Server menolak pemeriksaan PROT buatan sendiri. Lepaskan PROT ini agar diperiksa orang lain.</p>
      )}
      {state === 'override-required' && (
        <p className="mt-1">
          Sebagai admin Anda boleh melanjutkan hanya dengan alasan tertulis. Alasan dicatat di log audit.
        </p>
      )}
    </div>
  );
}
