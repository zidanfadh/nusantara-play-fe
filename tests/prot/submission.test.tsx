/**
 * Phase 26 step 2: submit vs resubmit, the contributor's note, the reviewer's notes on REVISI records.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn(async (...args: unknown[]) => ({ args })) }));
vi.mock('@/lib/api/client', () => ({ apiClient: { post, get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import { protApi } from '@/lib/api/prot';
import { RevisionNotice } from '@/components/prot/RevisionNotice';
import { SubmissionNoteField } from '@/components/prot/SubmitDialog';
import {
  canSubmitProt,
  DEFAULT_SUBMISSION_NOTE,
  latestRevisionNote,
  submissionNote,
  submissionRoute,
  submitProt,
  validateSubmissionNote,
} from '@/lib/prot/submission';
import { PROTStatus, type VerifikasiEntity } from '@/types/prot';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('route choice', () => {
  it('DRAFT → submit-kurasi, REVISI → resubmit, anything else → none', () => {
    expect(submissionRoute(PROTStatus.DRAFT)).toBe('submit-kurasi');
    expect(submissionRoute(PROTStatus.REVISI)).toBe('resubmit');
    for (const s of [PROTStatus.DIKURASI, PROTStatus.DIVERIFIKASI, PROTStatus.ARSIP_NASIONAL, undefined]) {
      expect(submissionRoute(s)).toBeNull();
    }
  });

  it('only the creator with a submit role may submit (the server refuses an admin who is not the creator)', () => {
    const draft = { status: PROTStatus.DRAFT, created_by: 'u1' };
    expect(canSubmitProt({ id: 'u1', role: 'kurator_daerah' }, draft)).toBe(true);
    expect(canSubmitProt({ id: 'u1', role: 'admin_kpoti' }, { ...draft, status: PROTStatus.REVISI })).toBe(true);
    expect(canSubmitProt({ id: 'u2', role: 'admin_kpoti' }, draft)).toBe(false);
    expect(canSubmitProt({ id: 'u1', role: 'pakar' }, draft)).toBe(false);
    expect(canSubmitProt({ id: 'u1', role: 'kurator_daerah' }, { ...draft, status: PROTStatus.DIKURASI })).toBe(false);
    expect(canSubmitProt(null, draft)).toBe(false);
  });
});

describe('the note', () => {
  it('is the contributor text, or the old default only when empty', () => {
    expect(submissionNote('  Foto diganti  ')).toBe('Foto diganti');
    expect(submissionNote('')).toBe(DEFAULT_SUBMISSION_NOTE);
    expect(submissionNote('   ')).toBe(DEFAULT_SUBMISSION_NOTE);
    expect(submissionNote(undefined)).toBe('Diajukan oleh pengguna');
  });

  it('has the DTO limit of 500 characters', () => {
    expect(validateSubmissionNote('a'.repeat(500))).toBeNull();
    expect(validateSubmissionNote('a'.repeat(501))).toMatch(/maksimal 500/);
  });

  it('the hard-coded default is gone from the pages', () => {
    expect(read('app/prot/[id]/page.tsx')).not.toContain('Diajukan oleh pengguna');
  });
});

describe('submitProt', () => {
  const api = () => ({ submitKurasi: vi.fn(async () => ({})), resubmit: vi.fn(async () => ({})) });

  it('DRAFT uses submit-kurasi with the note', async () => {
    const a = api();
    await expect(submitProt(a, { id: 'p', status: PROTStatus.DRAFT }, 'Catatan', { resubmitNote: false })).resolves.toEqual({
      route: 'submit-kurasi',
      noteSent: true,
    });
    expect(a.submitKurasi).toHaveBeenCalledWith('p', 'Catatan');
    expect(a.resubmit).not.toHaveBeenCalled();
  });

  it('REVISI uses resubmit WITHOUT a body while the flag is off (production backend)', async () => {
    const a = api();
    const result = await submitProt(a, { id: 'p', status: PROTStatus.REVISI }, 'Catatan', { resubmitNote: false });
    expect(result).toEqual({ route: 'resubmit', noteSent: false });
    expect(a.resubmit).toHaveBeenCalledTimes(1);
    expect(a.resubmit.mock.calls[0]).toEqual(['p']);
    expect(a.submitKurasi).not.toHaveBeenCalled();
  });

  it('REVISI sends the note with the flag on (after the backend deploy)', async () => {
    const a = api();
    await submitProt(a, { id: 'p', status: PROTStatus.REVISI }, '', { resubmitNote: true });
    expect(a.resubmit).toHaveBeenCalledWith('p', DEFAULT_SUBMISSION_NOTE);
  });

  it('refuses other statuses without calling the API', async () => {
    const a = api();
    await expect(submitProt(a, { id: 'p', status: PROTStatus.DIKURASI }, '', { resubmitNote: true })).rejects.toThrow(
      /tidak bisa diajukan/,
    );
    expect(a.submitKurasi).not.toHaveBeenCalled();
    expect(a.resubmit).not.toHaveBeenCalled();
  });

  it('protApi.resubmit posts no body without a note, { catatan } with one', async () => {
    post.mockClear();
    await protApi.resubmit('p');
    expect(post.mock.calls[0]).toEqual(['/prot/p/resubmit']);
    await protApi.resubmit('p', 'x');
    expect(post.mock.calls[1]).toEqual(['/prot/p/resubmit', { catatan: 'x' }]);
  });
});

const entry = (over: Partial<VerifikasiEntity>): VerifikasiEntity => ({
  id: 'v',
  prot_id: 'p',
  pakar_id: 'r',
  status: 'REVISION_NEEDED',
  verified_at: '2026-11-01T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...over,
});

describe('the reviewer notes on REVISI records', () => {
  it('takes the newest REVISION_NEEDED entry', () => {
    const note = latestRevisionNote([
      entry({ saran_perbaikan: 'lama', verified_at: '2026-10-01T00:00:00Z' }),
      entry({ status: 'APPROVED', catatan: 'bukan ini', verified_at: '2026-12-01T00:00:00Z' }),
      entry({ saran_perbaikan: 'Ganti foto pertama', catatan: '  ', pakar: { id: 'r', full_name: 'Pemeriksa A' } }),
    ]);
    expect(note).toEqual({
      saranPerbaikan: 'Ganti foto pertama',
      catatan: null,
      reviewerName: 'Pemeriksa A',
      date: '2026-11-01T00:00:00Z',
    });
    expect(latestRevisionNote([entry({ status: 'APPROVED' })])).toBeNull();
    expect(latestRevisionNote(undefined)).toBeNull();
  });

  it('renders the notes prominently, and the loading, failed and empty states', () => {
    const html = renderToStaticMarkup(
      <RevisionNotice note={{ saranPerbaikan: 'Ganti foto', catatan: 'Teks terpotong', reviewerName: null, date: null }} />,
    );
    expect(html).toContain('Perlu revisi: catatan kurator');
    expect(html).toContain('Ganti foto');
    expect(html).toContain('Teks terpotong');
    expect(html).toContain('Ajukan Ulang');
    expect(renderToStaticMarkup(<RevisionNotice note={null} loading />)).toContain('Memuat catatan');
    expect(renderToStaticMarkup(<RevisionNotice note={null} failed />)).toContain('History');
    expect(renderToStaticMarkup(<RevisionNotice note={null} />)).toContain('Tidak ada catatan tertulis');
  });

  it('is shown on the detail page and on the edit page of REVISI records', () => {
    expect(read('app/prot/[id]/page.tsx')).toContain('<RevisionNoticeLoader protId={item.id} />');
    expect(read('app/prot/[id]/edit/page.tsx')).toContain('<RevisionNoticeLoader protId={initialData.id} />');
  });
});

describe('the note field', () => {
  const render = (isResubmit: boolean, resubmitNoteEnabled: boolean) =>
    renderToStaticMarkup(
      <SubmissionNoteField value="" onChange={() => {}} isResubmit={isResubmit} resubmitNoteEnabled={resubmitNoteEnabled} error={null} />,
    );

  it('is optional, limited to 500 and names the default', () => {
    const html = render(false, false);
    expect(html).toContain('tidak wajib');
    expect(html).toContain('maxLength="500"');
    expect(html).toContain(DEFAULT_SUBMISSION_NOTE);
    expect(html).not.toContain('disabled=""');
  });

  it('is disabled with an explanation for a resubmit while the backend cannot store it', () => {
    const html = render(true, false);
    expect(html).toContain('disabled=""');
    expect(html).toContain('setelah pembaruan server');
    expect(render(true, true)).not.toContain('disabled=""');
  });
});
