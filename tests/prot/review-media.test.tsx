/**
 * Phase 26 step 4: the review page shows every media item; self-review warning and (flagged) override.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewMediaPanel, SelfReviewWarning } from '@/components/prot/ReviewMediaPanel';
import { HIDDEN_MEDIA } from '@/lib/prot/hidden-media';
import {
  fileNameFromUrl,
  isOwnRecord,
  linkInfo,
  reviewMedia,
  selfReviewState,
  validateOverrideReason,
} from '@/lib/prot/review-media';

const S3 = 'https://nusantara-play-storage.s3.ap-southeast-2.amazonaws.com';
const PHOTO = `${S3}/prot/foto-kegiatan/00000000-0000-4000-8000-000000000001.jpg`;
const VIDEO = `${S3}/prot/video-kegiatan/00000000-0000-4000-8000-000000000002.mp4`;
const DOC = `${S3}/prot/dokumen-kurikulum/00000000-0000-4000-8000-000000000003.pdf`;
const ALAT = `${S3}/prot/peralatan/00000000-0000-4000-8000-000000000004.png`;
const HIDDEN = HIDDEN_MEDIA[0].url;
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const record = {
  id: 'p1',
  fotoKegiatan: [PHOTO, HIDDEN, '', 7 as unknown as string],
  videoKegiatan: [VIDEO],
  dokumenKurikulum: [DOC],
  peralatan: [
    {
      nama: 'Batok',
      kisaranHarga: '20.000',
      fotoAlat: [ALAT],
      urlPembelian: ['https://www.tokopedia.com/toko/egrang', 'http://shop.test/x', 'bukan url', 'javascript:alert(1)'],
    },
  ],
};

describe('reviewMedia', () => {
  it('lists every item, keeps denylisted files as hidden entries, drops non-strings', () => {
    const media = reviewMedia(record);
    expect(media.photos.map((p) => [p.url, p.hidden])).toEqual([
      [PHOTO, false],
      [HIDDEN, true],
    ]);
    expect(media.videos).toHaveLength(1);
    expect(media.documents[0].fileName).toBe('00000000-0000-4000-8000-000000000003.pdf');
    expect(media.equipment[0].photos).toHaveLength(1);
    expect(media.total).toBe(2 + 1 + 1 + 1 + 4);
  });

  it('shows the domain of purchase links; invalid or non-http links get none', () => {
    const links = reviewMedia(record).equipment[0].links;
    expect(links.map((l) => [l.domain, l.https])).toEqual([
      ['tokopedia.com', true],
      ['shop.test', false],
      [null, false],
      [null, false],
    ]);
    expect(linkInfo('https://WWW.Shopee.co.id/a').domain).toBe('shopee.co.id');
    expect(fileNameFromUrl('https://x.test/a/b%20c.pdf')).toBe('b c.pdf');
  });

  it('honours the field rule of the denylist (SEPANGKAL "Biji Pinang" purchase links)', () => {
    const media = reviewMedia({
      id: '752aeea4-a9c4-455b-a216-71f508bcfe3c',
      peralatan: [{ nama: 'Biji Pinang', urlPembelian: ['https://example.com/anything'] }],
    });
    expect(media.equipment[0].links[0].hidden).toBe(true);
  });
});

describe('ReviewMediaPanel', () => {
  const html = renderToStaticMarkup(<ReviewMediaPanel media={reviewMedia(record)} />);

  it('renders photos with a full-size link, the video, the document name with a download link', () => {
    expect(html.match(/data-review-photo/g)).toHaveLength(3); // 2 activity + 1 equipment
    expect(html).toContain(`href="${PHOTO}"`);
    expect(html).toContain('Buka ukuran penuh');
    expect(html).toContain(`<video src="${VIDEO}"`);
    expect(html).toContain('00000000-0000-4000-8000-000000000003.pdf');
    expect(html).toMatch(new RegExp(`href="${DOC}"[^>]*download`));
  });

  it('never renders a denylisted file, but says it is there', () => {
    expect(html).not.toContain(HIDDEN);
    expect(html).toContain('Disembunyikan dari situs');
  });

  it('shows each purchase-link domain and never links a javascript: URL', () => {
    expect(html.match(/data-review-domain/g)).toHaveLength(4);
    expect(html).toContain('>tokopedia.com<');
    expect(html).toContain('tanpa https');
    expect(html).toContain('Tautan tidak valid');
    expect(html).not.toContain('href="javascript:');
  });

  it('says so when a record has no media', () => {
    expect(renderToStaticMarkup(<ReviewMediaPanel media={reviewMedia({ id: 'x' })} />)).toContain('tidak punya foto');
  });
});

describe('self-review', () => {
  const prot = { created_by: 'u1' };

  it('is detected only for the creator', () => {
    expect(isOwnRecord({ id: 'u1' }, prot)).toBe(true);
    expect(isOwnRecord({ id: 'u2' }, prot)).toBe(false);
    expect(isOwnRecord(null, prot)).toBe(false);
    expect(isOwnRecord({ id: 'u1' }, { created_by: undefined })).toBe(false);
  });

  it('warns only while the rule is not deployed; then blocks non-admins and asks admins for a reason', () => {
    expect(selfReviewState({ id: 'u2', role: 'pakar' }, prot, true)).toBe('none');
    expect(selfReviewState({ id: 'u1', role: 'kurator_daerah' }, prot, false)).toBe('warn');
    expect(selfReviewState({ id: 'u1', role: 'admin_kpoti' }, prot, false)).toBe('warn');
    expect(selfReviewState({ id: 'u1', role: 'kurator_daerah' }, prot, true)).toBe('blocked');
    expect(selfReviewState({ id: 'u1', role: 'admin_kpoti' }, prot, true)).toBe('override-required');
  });

  it('needs an override reason of 10 to 500 characters', () => {
    expect(validateOverrideReason('pendek')).toMatch(/minimal 10/);
    expect(validateOverrideReason('a'.repeat(10))).toBeNull();
    expect(validateOverrideReason('a'.repeat(501))).toMatch(/maksimal 500/);
  });

  it('renders a warning per state', () => {
    expect(renderToStaticMarkup(<SelfReviewWarning state="warn" />)).toContain('Anda adalah pembuat PROT ini.');
    expect(renderToStaticMarkup(<SelfReviewWarning state="blocked" />)).toContain('Server menolak');
    expect(renderToStaticMarkup(<SelfReviewWarning state="override-required" />)).toContain('log audit');
  });

  it('the review page sends selfReviewOverrideReason only in the override state, and uses the media panel', () => {
    const src = read('app/prot/verifikasi/[id]/review/page.tsx');
    expect(src).toContain("...(selfReview === 'override-required' ? { selfReviewOverrideReason: overrideReason.trim() } : {})");
    expect(src).toContain('<ReviewMediaPanel media={media} />');
    expect(src).toContain('<SelfReviewWarning state={selfReview} />');
    expect(src).toContain('selfReviewState(user, protData, PROT_SELF_REVIEW_RULE)');
  });

  it('the detail page publish sends the override only with the flag', () => {
    const src = read('app/prot/[id]/page.tsx');
    expect(src).toContain('if (own && PROT_SELF_REVIEW_RULE)');
    expect(read('lib/api/prot.ts')).toContain('selfReviewOverrideReason === undefined ? { catatan } : { catatan, selfReviewOverrideReason }');
  });
});
