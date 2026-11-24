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
import { checklistComplete, SUBMIT_CHECKLIST, toggleChecklist } from '@/lib/prot/submit-checklist';
import type { PROTEntity } from '@/types/prot';

/**
 * Phase 26: the checklist ticked before submitting (lib/prot/submit-checklist.ts). Not stored: the backend has no
 * field for it.
 */
export function SubmitChecklist({ checked, onToggle }: { checked: ReadonlySet<string>; onToggle: (id: string) => void }) {
  return (
    <fieldset data-submit-checklist>
      <legend className="text-sm font-semibold">Sebelum mengajukan, pastikan:</legend>
      <ul className="mt-2 space-y-2">
        {SUBMIT_CHECKLIST.map((item) => {
          const id = `prot-check-${item.id}`;
          return (
            <li key={item.id} className="flex items-start gap-2">
              <input
                id={id}
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => onToggle(item.id)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-green-600"
              />
              <label htmlFor={id} className="text-sm leading-snug">
                {item.label}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Daftar ini hanya pengingat dan tidak disimpan. Panduan lengkap: bagian 7 &quot;Daftar periksa kontributor&quot;.
      </p>
    </fieldset>
  );
}

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
}: {
  open: boolean;
  onClose: () => void;
  prot: Pick<PROTEntity, 'id' | 'status' | 'nama'>;
  onSubmitted: (message: string) => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const canConfirm = checklistComplete(checked);
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
      setChecked(new Set());
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
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : isResubmit ? 'Ajukan Ulang' : 'Ajukan Verifikasi'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <SubmitChecklist checked={checked} onToggle={(id) => setChecked((prev) => toggleChecklist(prev, id))} />
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
        {!canConfirm && (
          <p className="text-xs text-muted-foreground" data-checklist-hint>
            Centang semua poin di atas untuk mengaktifkan tombol.
          </p>
        )}
      </div>
    </DemoDialog>
  );
}
