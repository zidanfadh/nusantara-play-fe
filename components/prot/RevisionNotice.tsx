'use client';

/**
 * Phase 26: the reviewer's notes on a record in REVISI, shown prominently on /prot/[id] and on the edit page, so the
 * contributor knows what to fix before resubmitting. Source: `GET /verifikasi/:protId/history` (roles kurator_daerah,
 * pakar, admin_kpoti; available in production).
 */
import { useEffect, useState } from 'react';
import { protApi } from '@/lib/api/prot';
import { latestRevisionNote, type RevisionNote } from '@/lib/prot/submission';

export function RevisionNotice({ note, loading = false, failed = false }: { note: RevisionNote | null; loading?: boolean; failed?: boolean }) {
  return (
    <section
      role="region"
      aria-label="Catatan kurator untuk revisi"
      data-revision-notice
      className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/70 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <h2 className="text-base font-bold">Perlu revisi: catatan kurator</h2>
      {loading ? (
        <p className="mt-2 text-sm">Memuat catatan…</p>
      ) : failed ? (
        <p className="mt-2 text-sm">
          Catatan kurator tidak bisa dimuat. Buka halaman &quot;History&quot; PROT ini untuk melihatnya.
        </p>
      ) : !note || (!note.saranPerbaikan && !note.catatan) ? (
        <p className="mt-2 text-sm">Tidak ada catatan tertulis. Hubungi kurator atau admin jika tidak jelas apa yang perlu diperbaiki.</p>
      ) : (
        <div className="mt-2 space-y-3 text-sm">
          {note.saranPerbaikan && (
            <div>
              <p className="font-semibold">Saran perbaikan</p>
              <p className="whitespace-pre-line" data-revision-saran>{note.saranPerbaikan}</p>
            </div>
          )}
          {note.catatan && (
            <div>
              <p className="font-semibold">Catatan pemeriksa</p>
              <p className="whitespace-pre-line" data-revision-catatan>{note.catatan}</p>
            </div>
          )}
          {(note.reviewerName || note.date) && (
            <p className="text-xs opacity-80">
              {note.reviewerName ? `Dari ${note.reviewerName}` : 'Dari pemeriksa'}
              {note.date ? `, ${new Date(note.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            </p>
          )}
        </div>
      )}
      <p className="mt-3 text-xs">
        Perbaiki lewat tombol &quot;Edit&quot;, lalu tekan &quot;Ajukan Ulang&quot; di halaman PROT.
      </p>
    </section>
  );
}

/** Loads the history and renders the notice. Mount it only for a REVISI record and a role that may read the history. */
export function RevisionNoticeLoader({ protId }: { protId: string }) {
  const [state, setState] = useState<{ loading: boolean; failed: boolean; note: RevisionNote | null }>({
    loading: true,
    failed: false,
    note: null,
  });

  useEffect(() => {
    let alive = true;
    protApi
      .getHistory(protId)
      .then((history) => {
        if (alive) setState({ loading: false, failed: false, note: latestRevisionNote(history) });
      })
      .catch(() => {
        if (alive) setState({ loading: false, failed: true, note: null });
      });
    return () => {
      alive = false;
    };
  }, [protId]);

  return <RevisionNotice note={state.note} loading={state.loading} failed={state.failed} />;
}
