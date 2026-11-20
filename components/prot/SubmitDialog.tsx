'use client';

/**
 * Phase 26: "Ajukan Verifikasi" / "Ajukan Ulang". The contributor may write their own note (optional; the old default
 * "Diajukan oleh pengguna" is sent when it is empty) and the right route is chosen from the status
 * (lib/prot/submission.ts).
 */
import { useState } from 'react';
import { DemoDialog } from '@/components/jelajah/DemoDialog';
import { protApi } from '@/lib/api/prot';
import { PROT_RESUBMIT_NOTE } from '@/lib/prot/backend-features';
import {
  DEFAULT_SUBMISSION_NOTE,
  SUBMISSION_NOTE_MAX,
  submissionRoute,
  submissionSuccessMessage,
  submitProt,
  validateSubmissionNote,
} from '@/lib/prot/submission';
import type { PROTEntity } from '@/types/prot';

/** The note field and its hints, without state (rendered by the dialog, tested on its own). */
export function SubmissionNoteField({
  value,
  onChange,
  isResubmit,
  resubmitNoteEnabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  isResubmit: boolean;
  resubmitNoteEnabled: boolean;
  error: string | null;
}) {
  const disabled = isResubmit && !resubmitNoteEnabled;
  return (
    <div>
      <label htmlFor="prot-submit-note" className="block text-sm font-semibold">
        Catatan untuk pemeriksa <span className="font-normal text-muted-foreground">(tidak wajib)</span>
      </label>
      <textarea
        id="prot-submit-note"
        name="catatan"
        rows={3}
        maxLength={SUBMISSION_NOTE_MAX}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="prot-submit-note-help"
        aria-invalid={error ? true : undefined}
        className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm disabled:opacity-60"
        placeholder={
          isResubmit
            ? 'Contoh: Foto pertama sudah diganti, cara bermain dilengkapi.'
            : 'Contoh: Sumber cerita dari sesepuh desa; foto diambil saat festival.'
        }
      />
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <p id="prot-submit-note-help" className="mt-1 text-xs text-muted-foreground">
        {disabled
          ? 'Catatan untuk pengajuan ulang bisa dikirim setelah pembaruan server. Untuk sekarang, tulis perbaikan Anda di isian yang bersangkutan.'
          : `${value.trim().length}/${SUBMISSION_NOTE_MAX} karakter. Jika kosong, terkirim "${DEFAULT_SUBMISSION_NOTE}".`}
      </p>
    </div>
  );
}

export function SubmitDialog({
  open,
  onClose,
  prot,
  onSubmitted,
  children,
  canConfirm = true,
}: {
  open: boolean;
  onClose: () => void;
  prot: Pick<PROTEntity, 'id' | 'status' | 'nama'>;
  onSubmitted: (message: string) => void;
  /** Extra content above the note (the Step 3 checklist). */
  children?: React.ReactNode;
  /** False while the checklist is incomplete. */
  canConfirm?: boolean;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isResubmit = submissionRoute(prot.status) === 'resubmit';

  const confirm = async () => {
    const noteError = validateSubmissionNote(note);
    if (noteError) {
      setError(noteError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitProt(protApi, prot, note, { resubmitNote: PROT_RESUBMIT_NOTE });
      setNote('');
      onSubmitted(submissionSuccessMessage(result));
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '';
      setError(`Gagal mengajukan. ${message || 'Silakan coba lagi.'}`.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DemoDialog
      open={open}
      onClose={onClose}
      title={isResubmit ? 'Ajukan ulang untuk verifikasi' : 'Ajukan verifikasi'}
      subtitle={`${prot.nama}. Selama diperiksa, data tidak bisa diubah.`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">
            Batal
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting || !canConfirm}
            data-submit-confirm
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : isResubmit ? 'Ajukan Ulang' : 'Ajukan Verifikasi'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {children}
        <SubmissionNoteField
          value={note}
          onChange={(v) => {
            setNote(v);
            if (error) setError(null);
          }}
          isResubmit={isResubmit}
          resubmitNoteEnabled={PROT_RESUBMIT_NOTE}
          error={error}
        />
      </div>
    </DemoDialog>
  );
}
