/**
 * Phase 25: the hidden-media denylist (lib/prot/hidden-media.ts) and every renderer of PROT media.
 * The shared helper is tested once (first block); each renderer then has a test that it goes through it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  canSeeProtDocuments,
  firstVisiblePhoto,
  HIDDEN_FIELDS,
  HIDDEN_MEDIA,
  isHiddenField,
  isHiddenMediaUrl,
  mediaKey,
  parseShowDocumentsFlag,
  publicProtMedia,
  SHOW_PROT_DOCUMENTS,
  visibleMedia,
} from '@/lib/prot/hidden-media';
import { firstPhoto, shapeProvinceSummaries } from '@/lib/jelajah/data';
import { shapeSceneProt } from '@/lib/jelajah/engine/scene-prot';
import { pickProtPhotos } from '@/lib/jelajah/bumper/scene-data';
import { ProtCard } from '@/components/prot/ProtCard';
import { ProtPhoto } from '@/components/prot/ProtPhoto';
import { PROTJenis, PROTStatus, TargetUsia, type PROTEntity } from '@/types/prot';

const SEPANGKAL = '752aeea4-a9c4-455b-a216-71f508bcfe3c';
const S3 = 'https://nusantara-play-storage.s3.ap-southeast-2.amazonaws.com';
const PDF = `${S3}/prot/dokumen-kurikulum/7a4de8b1-c0bd-4570-bc9f-9a8b421a673e.pdf`;
const TROPHY = `${S3}/prot/peralatan/33403898-d974-458e-906d-9d13001e2701.png`;
const CAKE =
  'https://www.lazada.co.id/products/kue-biji-ketapang-kelapa-parut-asli-renyah-gurih-kemasan-toples-300gr-i5195340660-s9759820242.html?from_gmc=1&fl_tag=1';
const OK_PHOTO = `${S3}/prot/foto-kegiatan/00000000-0000-4000-8000-000000000001.jpg`;
const OK_PHOTO_2 = `${S3}/prot/foto-kegiatan/00000000-0000-4000-8000-000000000002.jpg`;
const OK_DOC = `${S3}/prot/dokumen-kurikulum/00000000-0000-4000-8000-000000000003.pdf`;
const OK_LINK = 'https://example.com/egrang';
/** Any listed URL works as a "hidden photo" in the renderer tests. */
const HIDDEN_PHOTO = TROPHY;

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('hidden-media helper (Phase 25)', () => {
  it('lists the SEPANGKAL PDF, the trophy photo and the cake link, each with a reason', () => {
    for (const url of [PDF, TROPHY, CAKE]) expect(isHiddenMediaUrl(url)).toBe(true);
    for (const e of HIDDEN_MEDIA) expect(e.reason.length).toBeGreaterThan(10);
    for (const r of HIDDEN_FIELDS) expect(r.reason.length).toBeGreaterThan(10);
  });

  it('every entry is a unique, valid https URL; reasons hold no digits, emails or quotes of personal data', () => {
    const keys = HIDDEN_MEDIA.map((e) => mediaKey(e.url));
    expect(keys.every((k) => k?.startsWith('https://'))).toBe(true);
    expect(new Set(keys).size).toBe(HIDDEN_MEDIA.length);
    expect(HIDDEN_MEDIA.length).toBe(13); // 3 (Step 1) + 10 (Phase 25 audit)
    for (const e of [...HIDDEN_MEDIA, ...HIDDEN_FIELDS]) expect(e.reason).not.toMatch(/\d{4,}|@/);
  });

  it('matches without query string or fragment and with any host case; other URLs stay visible', () => {
    expect(isHiddenMediaUrl(`${PDF}?download=1#page=2`)).toBe(true);
    expect(isHiddenMediaUrl(PDF.replace('nusantara-play-storage', 'NUSANTARA-PLAY-STORAGE'))).toBe(true);
    expect(isHiddenMediaUrl(`  ${TROPHY}  `)).toBe(true);
    expect(isHiddenMediaUrl(OK_PHOTO)).toBe(false);
    expect(isHiddenMediaUrl(PDF.replace('.pdf', '.PDF'))).toBe(false); // the path is exact
    expect(isHiddenMediaUrl('not a url')).toBe(false);
    expect(isHiddenMediaUrl(undefined)).toBe(false);
    expect(mediaKey('nope')).toBeNull();
  });

  it('visibleMedia drops hidden URLs, non-strings and empty strings, and never throws', () => {
    expect(visibleMedia([OK_PHOTO, TROPHY, 3, '', null, OK_PHOTO_2])).toEqual([OK_PHOTO, OK_PHOTO_2]);
    expect(visibleMedia(null)).toEqual([]);
    expect(visibleMedia('x')).toEqual([]);
  });

  it('a field rule hides a whole field of one record (and of one equipment item only)', () => {
    const ctx = { protId: SEPANGKAL, field: 'urlPembelian' as const };
    expect(isHiddenField({ ...ctx, peralatanNama: ' biji pinang ' })).toBe(true);
    expect(isHiddenField({ ...ctx, peralatanNama: 'Lapangan' })).toBe(false);
    expect(isHiddenField({ ...ctx, protId: 'other', peralatanNama: 'Biji Pinang' })).toBe(false);
    expect(visibleMedia([OK_LINK], { ...ctx, peralatanNama: 'Biji Pinang' })).toEqual([]);
    expect(visibleMedia([OK_LINK], { ...ctx, peralatanNama: 'Lapangan' })).toEqual([OK_LINK]);
  });

  it('documents are hidden by default; the flag turns them on; hidden documents never show', () => {
    expect(SHOW_PROT_DOCUMENTS).toBe(false); // not set in the test environment
    expect(parseShowDocumentsFlag(undefined)).toBe(false);
    expect(parseShowDocumentsFlag('')).toBe(false);
    expect(parseShowDocumentsFlag('1')).toBe(false);
    expect(parseShowDocumentsFlag('false')).toBe(false);
    expect(parseShowDocumentsFlag(' TRUE ')).toBe(true);
    const prot = { id: 'x', dokumenKurikulum: [OK_DOC, PDF] };
    expect(publicProtMedia(prot).dokumenKurikulum).toEqual([]);
    expect(publicProtMedia(prot, { showDocuments: canSeeProtDocuments(undefined, true) }).dokumenKurikulum).toEqual([
      OK_DOC,
    ]);
  });

  it('reviewer roles see documents without the flag; visitors and publik users do not', () => {
    expect(canSeeProtDocuments(undefined, false)).toBe(false);
    expect(canSeeProtDocuments(null, false)).toBe(false);
    expect(canSeeProtDocuments('publik', false)).toBe(false);
    for (const role of ['kurator_daerah', 'pakar', 'admin_kpoti']) expect(canSeeProtDocuments(role, false)).toBe(true);
    expect(canSeeProtDocuments(undefined, true)).toBe(true);
  });

  it('publicProtMedia filters every field of the SEPANGKAL shape', () => {
    const media = publicProtMedia<{ nama: string; fotoAlat?: string[]; urlPembelian?: string[] }>(
      {
        id: SEPANGKAL,
        fotoKegiatan: [OK_PHOTO],
        videoKegiatan: null,
        dokumenKurikulum: [PDF],
        peralatan: [
          { nama: 'Lapangan', fotoAlat: [OK_PHOTO_2] },
          { nama: 'Biji Pinang', fotoAlat: [TROPHY], urlPembelian: [CAKE] },
        ],
      },
      { showDocuments: true },
    );
    expect(media.fotoKegiatan).toEqual([OK_PHOTO]);
    expect(media.videoKegiatan).toEqual([]);
    expect(media.dokumenKurikulum).toEqual([]);
    expect(media.peralatan.map((p) => [p.item.nama, p.fotoAlat, p.urlPembelian])).toEqual([
      ['Lapangan', [OK_PHOTO_2], []],
      ['Biji Pinang', [], []],
    ]);
    expect(firstVisiblePhoto({ id: 'y', fotoKegiatan: [HIDDEN_PHOTO, OK_PHOTO] })).toBe(OK_PHOTO);
    expect(firstVisiblePhoto({ id: 'y', fotoKegiatan: [HIDDEN_PHOTO] })).toBeNull();
  });
});

const entity = (fotoKegiatan: string[]): PROTEntity => ({
  id: 'card-1',
  nama: 'Kartu',
  jenis: PROTJenis.PERMAINAN_RAKYAT,
  status: PROTStatus.ARSIP_NASIONAL,
  targetUsia: TargetUsia.SEMUA_USIA,
  fotoKegiatan,
});

describe('renderers use the helper (Phase 25)', () => {
  it('ProtPhoto renders nothing for a hidden URL (last line of defence)', () => {
    expect(renderToStaticMarkup(<ProtPhoto src={HIDDEN_PHOTO} alt="" size="cover" />)).toBe('');
    expect(renderToStaticMarkup(<ProtPhoto src={OK_PHOTO} alt="" size="cover" />)).toContain('<img');
  });

  it('ProtCard (/prot list) skips a hidden first photo and shows the next one or the placeholder', () => {
    const next = renderToStaticMarkup(<ProtCard item={entity([HIDDEN_PHOTO, OK_PHOTO])} />);
    expect(next).toContain(encodeURIComponent(OK_PHOTO));
    expect(next).not.toContain(encodeURIComponent(HIDDEN_PHOTO));
    const none = renderToStaticMarkup(<ProtCard item={entity([HIDDEN_PHOTO])} />);
    expect(none).not.toContain('<img');
  });

  it('Jelajah hub card and bumper data (shapeProvinceSummaries, firstPhoto) skip hidden photos', () => {
    expect(firstPhoto([HIDDEN_PHOTO, OK_PHOTO], false)).toBe(OK_PHOTO);
    const shaped = shapeProvinceSummaries(
      [{ kode: '11', nama: 'Aceh' }],
      [
        { id: 'a', nama: 'A', status: 'ARSIP_NASIONAL', provinsiKode: '11', fotoKegiatan: [HIDDEN_PHOTO] },
        { id: 'b', nama: 'B', status: 'ARSIP_NASIONAL', provinsiKode: '11', fotoKegiatan: [HIDDEN_PHOTO, OK_PHOTO] },
      ],
    );
    expect(shaped.provinces[0].prots.map((p) => p.foto)).toEqual([null, OK_PHOTO]);
    expect(pickProtPhotos(shaped).map((p) => p.foto)).toEqual([OK_PHOTO]);
  });

  it('bumper photo strip drops a hidden photo even if one reaches its data', () => {
    const photos = pickProtPhotos({
      provinces: [
        { kode: '11', nama: 'Aceh', slug: 'aceh', protCount: 1, prots: [{ id: 'a', nama: 'A', foto: HIDDEN_PHOTO }] },
      ],
      totalProt: 1,
      unassignedProt: 0,
    });
    expect(photos).toEqual([]);
  });

  it('Jelajah stand panel and 2D cards (shapeSceneProt) skip hidden photos', () => {
    const rows = shapeSceneProt(
      [{ id: 'a', nama: 'A', status: 'ARSIP_NASIONAL', provinsiKode: '11', fotoKegiatan: [HIDDEN_PHOTO, OK_PHOTO] }],
      '11',
    );
    expect(rows[0].foto).toBe(OK_PHOTO);
  });

  it('/prot/[id] reads every media field through publicProtMedia (no raw media field rendered)', () => {
    const src = read('app/prot/[id]/page.tsx');
    expect(src).toContain("from '@/lib/prot/hidden-media'");
    expect(src).toContain('publicProtMedia<Peralatan>(item, { showDocuments: canSeeProtDocuments(user?.role) })');
    expect(src).toContain('setActiveImage(firstVisiblePhoto(data))');
    expect(src).not.toMatch(
      /(item|data|alat)\.(fotoKegiatan|videoKegiatan|dokumenKurikulum|peralatan|fotoAlat|urlPembelian)/,
    );
  });

  it('landing featured cards use firstVisiblePhoto', () => {
    const src = read('app/page.tsx');
    expect(src).toContain('firstVisiblePhoto(game)');
    expect(src).not.toMatch(/game\.fotoKegiatan/);
  });

  it('Jelajah views render only the shaped `foto` (from data.ts / scene-prot.ts) through ProtPhoto', () => {
    for (const f of [
      'components/jelajah/StandPanel.tsx',
      'components/jelajah/ProvinceScene2D.tsx',
      'components/jelajah/ProvinceCard.tsx',
      'components/jelajah/bumper/ProtScene.tsx',
    ]) {
      const src = read(f);
      expect(src, f).toContain('ProtPhoto');
      expect(src, f).not.toMatch(/fotoKegiatan|fotoAlat|dokumenKurikulum|<img/);
    }
    expect(read('lib/jelajah/data.ts')).toContain('visibleMedia(prot.fotoKegiatan');
    expect(read('lib/jelajah/engine/scene-prot.ts')).toContain('visibleMedia(row.fotoKegiatan');
  });

  it('the concept film shows no PROT media (names only)', () => {
    expect(read('lib/jelajah/concept/live.ts')).not.toMatch(/foto|dokumen/);
  });
});
