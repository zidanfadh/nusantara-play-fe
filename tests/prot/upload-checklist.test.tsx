/**
 * Phase 26 step 3: upload types and sizes the server accepts, client-side checks, and the submission checklist.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: () => {}, push: () => {} }) }));

import { ProtForm } from '@/components/prot/ProtForm';
import { UploadErrors } from '@/components/prot/FormHints';
import { SubmitChecklist } from '@/components/prot/SubmitDialog';
import { checklistComplete, SUBMIT_CHECKLIST, toggleChecklist } from '@/lib/prot/submit-checklist';
import {
  checkFiles,
  fileError,
  formatMb,
  SERVER_MAX_BYTES,
  SERVER_MAX_FILES_PER_REQUEST,
  SERVER_MIME_TYPES,
  UPLOAD_RULES,
  type UploadKind,
} from '@/lib/prot/upload-rules';

const MB = 1024 * 1024;
const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('upload rules match the server', () => {
  it('every field accepts only server MIME types, within the server size and the 10-files-per-request limit', () => {
    for (const kind of Object.keys(UPLOAD_RULES) as UploadKind[]) {
      const rule = UPLOAD_RULES[kind];
      for (const type of rule.mimeTypes) expect(SERVER_MIME_TYPES as readonly string[]).toContain(type);
      expect(rule.maxBytes).toBeLessThanOrEqual(SERVER_MAX_BYTES);
      expect(rule.accept).not.toMatch(/doc|msword|image\/\*|video\/\*/);
    }
    expect(SERVER_MAX_FILES_PER_REQUEST).toBe(10);
  });

  it('documents are PDF only', () => {
    expect(UPLOAD_RULES.dokumenKurikulum.mimeTypes).toEqual(['application/pdf']);
    expect(fileError('dokumenKurikulum', file('a.pdf', 'application/pdf'))).toBeNull();
    expect(fileError('dokumenKurikulum', file('panduan.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(
      '"panduan.docx" adalah dokumen Word. Simpan sebagai PDF lalu unggah lagi.',
    );
    expect(fileError('dokumenKurikulum', file('lama.doc', 'application/msword'))).toMatch(/dokumen Word/);
  });

  it('photos are JPG/PNG/WEBP, videos MP4/MOV; a PDF is not a photo', () => {
    expect(fileError('fotoKegiatan', file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(fileError('fotoAlat', file('a.webp', 'image/webp'))).toBeNull();
    expect(fileError('fotoKegiatan', file('a.gif', 'image/gif'))).toBe('"a.gif" tidak diterima. Foto kegiatan harus JPG, PNG atau WEBP.');
    expect(fileError('fotoKegiatan', file('a.heic', 'image/heic'))).toMatch(/tidak diterima/);
    expect(fileError('fotoKegiatan', file('a.pdf', 'application/pdf'))).toMatch(/tidak diterima/);
    expect(fileError('videoKegiatan', file('a.mov', 'video/quicktime'))).toBeNull();
    expect(fileError('videoKegiatan', file('a.webm', 'video/webm'))).toBe('"a.webm" tidak diterima. Video kegiatan harus MP4 atau MOV.');
  });

  it('falls back to the extension when the browser reports no type', () => {
    expect(fileError('fotoKegiatan', file('A.JPG', ''))).toBeNull();
    expect(fileError('dokumenKurikulum', file('x.pdf', ''))).toBeNull();
    expect(fileError('dokumenKurikulum', file('x.docx', ''))).toMatch(/dokumen Word/);
  });

  it('refuses files above the field limit, and empty files', () => {
    expect(fileError('fotoKegiatan', file('big.jpg', 'image/jpeg', 10 * MB))).toBeNull();
    expect(fileError('fotoKegiatan', file('big.jpg', 'image/jpeg', 10 * MB + 1))).toBe(
      '"big.jpg" terlalu besar (10 MB). Maksimal 10 MB per file.',
    );
    expect(fileError('videoKegiatan', file('v.mp4', 'video/mp4', 60 * MB))).toMatch(/Maksimal 50 MB/);
    expect(fileError('dokumenKurikulum', file('d.pdf', 'application/pdf', 25 * MB))).toMatch(/Maksimal 20 MB/);
    expect(fileError('fotoKegiatan', file('e.png', 'image/png', 0))).toMatch(/kosong/);
    expect(formatMb(2.5 * MB)).toBe('2,5 MB');
  });

  it('checkFiles keeps the good files and stops at 10 per save', () => {
    const picked = [file('ok.jpg', 'image/jpeg'), file('bad.gif', 'image/gif'), file('ok2.png', 'image/png')];
    const result = checkFiles('fotoKegiatan', picked);
    expect(result.accepted.map((f) => f.name)).toEqual(['ok.jpg', 'ok2.png']);
    expect(result.errors).toHaveLength(1);
    const tooMany = checkFiles('fotoKegiatan', [file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')], 9);
    expect(tooMany.accepted.map((f) => f.name)).toEqual(['a.jpg']);
    expect(tooMany.errors[0]).toMatch(/maksimal 10 file/);
  });

  it('the form shows the limits and uses the narrow accept lists', () => {
    const html = renderToStaticMarkup(
      <ProtForm onSubmit={async () => {}} isLoading={false} title="t" initialData={{ nama: 'x', peralatan: [{ nama: 'Alat' }] }} />,
    );
    for (const kind of ['fotoKegiatan', 'videoKegiatan', 'dokumenKurikulum', 'fotoAlat'] as UploadKind[]) {
      expect(html).toContain(`accept="${UPLOAD_RULES[kind].accept}"`);
      expect(html).toContain(UPLOAD_RULES[kind].hint.replace(/"/g, '&quot;'));
    }
    expect(html).not.toContain('DOC (Maks');
    expect(html).not.toContain('accept="image/*"');
  });

  it('renders upload errors as an alert list, nothing without errors', () => {
    expect(renderToStaticMarkup(<UploadErrors errors={['a', 'b']} />)).toBe(
      '<ul role="alert" data-upload-errors="true" class="space-y-1 text-xs font-medium text-red-600"><li>a</li><li>b</li></ul>',
    );
    expect(renderToStaticMarkup(<UploadErrors errors={[]} />)).toBe('');
  });
});

describe('submission checklist', () => {
  it('covers the five points of the guide', () => {
    const text = SUBMIT_CHECKLIST.map((i) => i.label).join(' ');
    for (const word of ['terpotong', 'permainan INI', 'data pribadi', 'wajah anak', 'tautan pembelian']) {
      expect(text).toContain(word);
    }
    expect(new Set(SUBMIT_CHECKLIST.map((i) => i.id)).size).toBe(SUBMIT_CHECKLIST.length);
  });

  it('is complete only when every point is ticked', () => {
    let checked = new Set<string>();
    expect(checklistComplete(checked)).toBe(false);
    for (const item of SUBMIT_CHECKLIST) checked = toggleChecklist(checked, item.id);
    expect(checklistComplete(checked)).toBe(true);
    checked = toggleChecklist(checked, SUBMIT_CHECKLIST[0].id);
    expect(checklistComplete(checked)).toBe(false);
    expect(checklistComplete(SUBMIT_CHECKLIST.map((i) => i.id))).toBe(true);
  });

  it('renders one labelled checkbox per point and says it is not stored', () => {
    const html = renderToStaticMarkup(<SubmitChecklist checked={new Set([SUBMIT_CHECKLIST[1].id])} onToggle={() => {}} />);
    expect(html.match(/type="checkbox"/g)).toHaveLength(SUBMIT_CHECKLIST.length);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    for (const item of SUBMIT_CHECKLIST) expect(html).toContain(`for="prot-check-${item.id}"`);
    expect(html).toContain('tidak disimpan');
  });
});
