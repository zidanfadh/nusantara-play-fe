/**
 * Phase 26: submitting a PROT for verification. Pure (the API is passed in), unit-tested in
 * tests/prot/submission.test.tsx.
 *
 * Backend rules (`nusantara-play-be/src/modules/prot/prot.service.ts`, deployed since before Phase 01):
 * - `POST /prot/:id/submit-kurasi { catatan? }` only for status DRAFT, only by the CREATOR (an admin who did not create
 *   the record is refused), roles kurator_daerah / admin_kpoti. `catatan` max 500 characters; stored on the queue entry
 *   only after the backend deploy (Pending deployment item 3, B7), accepted and ignored before it.
 * - `POST /prot/:id/resubmit` only for status REVISI, same owner and role rule. No body before Phase 26; the Phase 26
 *   backend accepts `{ catatan? }` (Pending deployment item 13), so the note is sent only with PROT_RESUBMIT_NOTE.
 */
import type { PROTEntity, VerifikasiEntity } from '@/types/prot';
import { PROTStatus } from '@/types/prot';

export const DEFAULT_SUBMISSION_NOTE = 'Diajukan oleh pengguna';
/** `SubmitKurasiDto.catatan` `@MaxLength(500)`. */
export const SUBMISSION_NOTE_MAX = 500;
/** Roles of the submit-kurasi and resubmit routes (`@Roles(KURATOR_DAERAH, ADMIN_KPOTI)`). */
export const SUBMIT_ROLES = ['kurator_daerah', 'admin_kpoti'] as const;

export type SubmissionRoute = 'submit-kurasi' | 'resubmit';

export function submissionRoute(status: PROTStatus | string | undefined): SubmissionRoute | null {
  if (status === PROTStatus.DRAFT) return 'submit-kurasi';
  if (status === PROTStatus.REVISI) return 'resubmit';
  return null;
}

/** The server allows only the creator (also for admins), in DRAFT or REVISI, with a submit role. */
export function canSubmitProt(
  user: { id?: string; role?: string } | null | undefined,
  prot: Pick<PROTEntity, 'status' | 'created_by'>,
): boolean {
  if (!user?.id || !user.role) return false;
  if (!(SUBMIT_ROLES as readonly string[]).includes(user.role)) return false;
  if (prot.created_by !== user.id) return false;
  return submissionRoute(prot.status) !== null;
}

/** The note that is sent: the contributor's own text, or the old default when they left it empty. */
export function submissionNote(text: string | null | undefined): string {
  const trimmed = (text ?? '').trim();
  return trimmed === '' ? DEFAULT_SUBMISSION_NOTE : trimmed;
}

export function validateSubmissionNote(text: string | null | undefined): string | null {
  if ((text ?? '').trim().length > SUBMISSION_NOTE_MAX) {
    return `Catatan maksimal ${SUBMISSION_NOTE_MAX} karakter.`;
  }
  return null;
}

export interface SubmitApi {
  submitKurasi: (id: string, catatan: string) => Promise<unknown>;
  resubmit: (id: string, catatan?: string) => Promise<unknown>;
}

/**
 * Calls the right route for the record's status. Returns which route was used and whether the note reached a route
 * that can take it (false for a resubmit without the flag: the old backend has no body there).
 */
export async function submitProt(
  api: SubmitApi,
  prot: Pick<PROTEntity, 'id' | 'status'>,
  noteText: string | null | undefined,
  options: { resubmitNote: boolean },
): Promise<{ route: SubmissionRoute; noteSent: boolean }> {
  const route = submissionRoute(prot.status);
  if (!route) throw new Error(`PROT dengan status ${prot.status} tidak bisa diajukan.`);
  const note = submissionNote(noteText);
  if (route === 'submit-kurasi') {
    await api.submitKurasi(prot.id, note);
    return { route, noteSent: true };
  }
  if (options.resubmitNote) {
    await api.resubmit(prot.id, note);
    return { route, noteSent: true };
  }
  await api.resubmit(prot.id);
  return { route, noteSent: false };
}

export interface RevisionNote {
  saranPerbaikan: string | null;
  catatan: string | null;
  reviewerName: string | null;
  date: string | null;
}

/**
 * The reviewer's notes that sent the record to REVISI: the newest REVISION_NEEDED entry of the verification history
 * (`GET /verifikasi/:protId/history`, newest first; sorted here again to be safe).
 */
export function latestRevisionNote(history: VerifikasiEntity[] | null | undefined): RevisionNote | null {
  const entries = (history ?? []).filter((h) => h?.status === 'REVISION_NEEDED');
  if (entries.length === 0) return null;
  const time = (h: VerifikasiEntity) => Date.parse(h.verified_at || h.created_at || '') || 0;
  const latest = [...entries].sort((a, b) => time(b) - time(a))[0];
  const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  return {
    saranPerbaikan: text(latest.saran_perbaikan),
    catatan: text(latest.catatan),
    reviewerName: text(latest.pakar?.full_name),
    date: latest.verified_at || latest.created_at || null,
  };
}

/** Indonesian message after a successful submission. */
export function submissionSuccessMessage(result: { route: SubmissionRoute; noteSent: boolean }): string {
  return result.route === 'resubmit'
    ? 'Berhasil diajukan ulang untuk verifikasi.'
    : 'Berhasil diajukan untuk verifikasi.';
}
