/**
 * Phase 26 step 1: deskripsi and jumlahPemain in the PROT form, the whitelist payload builder and the backend
 * feature flags.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: () => {}, push: () => {} }),
}));

import { ProtForm } from '@/components/prot/ProtForm';
import { DeskripsiCounter } from '@/components/prot/FormHints';
import { parseFlag } from '@/lib/prot/backend-features';
import {
  DESKRIPSI_JELAJAH_CHARS,
  DESKRIPSI_SERVER_MAX,
  deskripsiCounter,
  FIELD_HELP,
  JELAJAH_BADGE_LABEL,
  JELAJAH_RECOMMENDED_FIELDS,
  parseJumlahPemain,
  toProtWritePayload,
} from '@/lib/prot/form-fields';
import { DESCRIPTION_LIMIT } from '@/lib/jelajah/engine/scene-prot';
import { PROTJenis, PROTStatus, TargetUsia, type PROTEntity } from '@/types/prot';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('parseJumlahPemain (backend: @IsInt @Min(1), int column)', () => {
  it('treats empty input as "not filled in"', () => {
    expect(parseJumlahPemain('')).toEqual({ ok: true, value: null });
    expect(parseJumlahPemain('   ')).toEqual({ ok: true, value: null });
    expect(parseJumlahPemain(null)).toEqual({ ok: true, value: null });
    expect(parseJumlahPemain(undefined)).toEqual({ ok: true, value: null });
  });

  it('accepts whole numbers from 1', () => {
    expect(parseJumlahPemain('1')).toEqual({ ok: true, value: 1 });
    expect(parseJumlahPemain(' 12 ')).toEqual({ ok: true, value: 12 });
    expect(parseJumlahPemain(4)).toEqual({ ok: true, value: 4 });
  });

  it('refuses 0, negatives, decimals, text and numbers beyond the int column, in Indonesian', () => {
    for (const bad of ['0', '-3', '2.5', '2,5', 'empat', '1e3', '2147483648']) {
      const result = parseJumlahPemain(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Jumlah pemain/);
    }
    expect(parseJumlahPemain('2147483647')).toEqual({ ok: true, value: 2147483647 });
  });
});

describe('deskripsi counter', () => {
  it('uses the Jelajah stand panel length as a guide, not a server limit', () => {
    expect(DESKRIPSI_JELAJAH_CHARS).toBe(DESCRIPTION_LIMIT);
    expect(DESKRIPSI_SERVER_MAX).toBeNull();
    expect(deskripsiCounter('').text).toBe(`0 karakter · sekitar ${DESKRIPSI_JELAJAH_CHARS} karakter pertama tampil di panel stan Jelajah`);
    expect(deskripsiCounter('a'.repeat(DESKRIPSI_JELAJAH_CHARS)).overJelajah).toBe(false);
    const over = deskripsiCounter('a'.repeat(DESKRIPSI_JELAJAH_CHARS + 1));
    expect(over.overJelajah).toBe(true);
    expect(over.text).toContain('hanya menampilkan');
  });

  it('renders the count with aria-live', () => {
    const html = renderToStaticMarkup(<DeskripsiCounter id="c" text="abc" />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('3 karakter');
  });
});

const apiRecord: PROTEntity & Record<string, unknown> = {
  id: 'p1',
  nama: 'Egrang',
  jenis: PROTJenis.PERMAINAN_RAKYAT,
  status: PROTStatus.REVISI,
  targetUsia: TargetUsia.ANAK,
  provinsiKode: '33',
  kabkotaKode: '33.08',
  provinsiName: 'Jawa Tengah',
  kabkotaName: 'Kabupaten Magelang',
  kecamatanName: 'X',
  desaName: 'Y',
  deskripsi: 'Ringkasan',
  caraBermain: 'Langkah',
  created_by: 'u1',
  created_at: '2026-01-01',
  fotoKegiatan: ['https://example.test/a.jpg'],
  dokumenKurikulum: ['https://example.test/a.pdf'],
  peralatan: [
    { nama: 'Bambu', fotoAlat: ['https://example.test/b.jpg'], urlPembelian: ['https://shop.test/x', ''], extra: 1 } as never,
  ],
  fotoFiles: [],
  existingFotos: [],
};

describe('toProtWritePayload (whitelist of CreatePROTDto / UpdatePROTDto)', () => {
  it('sends only DTO keys: no read-only API fields, no media arrays, no form file lists', () => {
    const payload = toProtWritePayload({ ...apiRecord, jumlahPemain: 4 }, 'update');
    expect(Object.keys(payload).sort()).toEqual(
      ['caraBermain', 'deskripsi', 'jenis', 'jumlahPemain', 'kabkotaKode', 'nama', 'peralatan', 'provinsiKode', 'targetUsia'].sort(),
    );
    expect(payload.deskripsi).toBe('Ringkasan');
    expect(payload.jumlahPemain).toBe(4);
  });

  it('keeps only PeralatanDto keys and drops empty purchase-link inputs', () => {
    const payload = toProtWritePayload(apiRecord, 'update');
    expect(payload.peralatan).toEqual([
      { nama: 'Bambu', fotoAlat: ['https://example.test/b.jpg'], urlPembelian: ['https://shop.test/x'] },
    ]);
  });

  it('omits an empty jumlahPemain on create and clears it (null) on update', () => {
    expect('jumlahPemain' in toProtWritePayload({ ...apiRecord, jumlahPemain: null }, 'create')).toBe(false);
    expect(toProtWritePayload({ ...apiRecord, jumlahPemain: null }, 'update').jumlahPemain).toBeNull();
    expect(toProtWritePayload({ ...apiRecord, jumlahPemain: '7' as never }, 'create').jumlahPemain).toBe(7);
  });

  it('sends an emptied deskripsi as "" so it can be cleared', () => {
    expect(toProtWritePayload({ ...apiRecord, deskripsi: '' }, 'update').deskripsi).toBe('');
  });

  it('is used by both the create and the edit page', () => {
    expect(read('app/prot/create/page.tsx')).toMatch(/protApi\.create\(toProtWritePayload\(protData, 'create'\)\)/);
    expect(read('app/prot/[id]/edit/page.tsx')).toMatch(/protApi\.update\(id, toProtWritePayload\(protData, 'update'\)\)/);
  });
});

describe('ProtForm', () => {
  const render = (initialData?: Partial<PROTEntity>) =>
    renderToStaticMarkup(<ProtForm onSubmit={async () => {}} isLoading={false} title="t" initialData={initialData} />);

  it('has a multi-line deskripsi with a counter and help text, and a numeric jumlahPemain', () => {
    const html = render();
    expect(html).toMatch(/<textarea[^>]*id="prot-deskripsi"[^>]*name="deskripsi"/);
    expect(html).toContain('Deskripsi Singkat');
    expect(html).toContain('0 karakter');
    expect(html).toContain(FIELD_HELP.deskripsi.replace('&', '&amp;'));
    const jumlah = html.match(/<input[^>]*id="prot-jumlah-pemain"[^>]*>/)?.[0] ?? '';
    for (const attr of ['type="number"', 'name="jumlahPemain"', 'min="1"', 'step="1"']) expect(jumlah).toContain(attr);
    expect(html).toContain('Jumlah Pemain');
    expect(html).toContain(FIELD_HELP.jumlahPemain);
  });

  it('marks the fields the guide recommends for Jelajah', () => {
    const html = render();
    const badges = html.match(/data-jelajah-badge/g) ?? [];
    expect(badges.length).toBe(JELAJAH_RECOMMENDED_FIELDS.length);
    expect(html).toContain(JELAJAH_BADGE_LABEL);
  });

  it('fills both fields from an existing record', () => {
    const html = render({ deskripsi: 'Halo dunia', jumlahPemain: 6 });
    expect(html).toContain('>Halo dunia</textarea>');
    expect(html).toMatch(/id="prot-jumlah-pemain"[^>]*value="6"/);
    expect(html).toContain('10 karakter');
  });
});

describe('/prot/[id] shows the new fields', () => {
  it('renders deskripsi as "Ringkasan" and jumlahPemain in the basic info', () => {
    const src = read('app/prot/[id]/page.tsx');
    expect(src).toContain('data-prot-deskripsi');
    expect(src).toContain('{item.deskripsi}');
    expect(src).toContain('data-prot-jumlah-pemain');
  });
});

describe('backend feature flags', () => {
  it('are on only for the literal "true"', () => {
    expect(parseFlag('true')).toBe(true);
    expect(parseFlag(' TRUE ')).toBe(true);
    for (const v of [undefined, '', 'false', '1', 'yes']) expect(parseFlag(v)).toBe(false);
  });

  it('are read as literal process.env names so Next inlines them', () => {
    const src = read('lib/prot/backend-features.ts');
    expect(src).toContain('process.env.NEXT_PUBLIC_PROT_RESUBMIT_NOTE');
    expect(src).toContain('process.env.NEXT_PUBLIC_PROT_SELF_REVIEW_RULE');
  });
});
