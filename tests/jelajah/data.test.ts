import { describe, expect, it, vi } from 'vitest';
import {
  MAX_PROT_PAGES,
  PROT_LIST_LIMIT,
  emptySummaries,
  fetchPublicProt,
  firstPhoto,
  loadJelajahData,
  loadProvinceProt,
  shapeProvinceSummaries,
  type GetJson,
  type RawProt,
} from '@/lib/jelajah/data';

const prot = (id: string, provinsiKode: string, extra: Partial<RawProt> = {}): RawProt => ({
  id,
  nama: `PROT ${id}`,
  status: 'ARSIP_NASIONAL',
  provinsiKode,
  fotoKegiatan: [],
  ...extra,
});

describe('firstPhoto', () => {
  it('returns the first https URL only', () => {
    expect(firstPhoto(['http://x.test/a.jpg', 'not a url', 'https://cdn.test/b.webp'])).toBe('https://cdn.test/b.webp');
    expect(firstPhoto(['javascript:alert(1)'])).toBeNull();
    expect(firstPhoto([])).toBeNull();
    expect(firstPhoto(undefined)).toBeNull();
    expect(firstPhoto('https://cdn.test/a.jpg')).toBeNull();
  });
});

describe('shapeProvinceSummaries', () => {
  const provinces = [
    { kode: '32', nama: 'Jawa Barat' },
    { kode: '16', nama: 'Sumatera Selatan' },
    { kode: '11', nama: 'Aceh' },
  ];

  it('counts public PROT per province, sorted by province name, with slugs', () => {
    const result = shapeProvinceSummaries(provinces, [
      prot('a', '32', { nama: 'Zebra', fotoKegiatan: ['https://cdn.test/z.jpg'] }),
      prot('b', '32', { nama: 'Anoa' }),
      prot('c', '11'),
    ]);
    expect(result.provinces.map((p) => [p.nama, p.slug, p.protCount])).toEqual([
      ['Aceh', 'aceh', 1],
      ['Jawa Barat', 'jawa-barat', 2],
      ['Sumatera Selatan', 'sumatera-selatan', 0],
    ]);
    expect(result.provinces[1].prots).toEqual([
      { id: 'b', nama: 'Anoa', foto: null },
      { id: 'a', nama: 'Zebra', foto: 'https://cdn.test/z.jpg' },
    ]);
    expect(result.totalProt).toBe(3);
    expect(result.unassignedProt).toBe(0);
  });

  it('ignores non-public and duplicate PROT and counts PROT of unknown provinces separately', () => {
    const result = shapeProvinceSummaries(provinces, [
      prot('a', '32'),
      prot('a', '32'),
      prot('d', '32', { status: 'DRAFT' }),
      prot('e', '99'),
      prot('', '32'),
    ]);
    expect(result.provinces.find((p) => p.kode === '32')?.protCount).toBe(1);
    expect(result.totalProt).toBe(2);
    expect(result.unassignedProt).toBe(1);
  });

  it('limits the per-province list but keeps the full count', () => {
    const many = Array.from({ length: PROT_LIST_LIMIT + 3 }, (_, i) => prot(`p${i}`, '16'));
    const sumsel = shapeProvinceSummaries(provinces, many).provinces.find((p) => p.kode === '16')!;
    expect(sumsel.protCount).toBe(PROT_LIST_LIMIT + 3);
    expect(sumsel.prots).toHaveLength(PROT_LIST_LIMIT);
  });

  it('skips malformed and duplicate province entries', () => {
    const result = shapeProvinceSummaries(
      [{ kode: '11', nama: 'Aceh' }, { kode: '11', nama: 'Aceh lagi' }, { kode: '', nama: 'x' }, {}],
      [],
    );
    expect(result.provinces).toEqual([{ kode: '11', nama: 'Aceh', slug: 'aceh', protCount: 0, prots: [] }]);
  });

  it('emptySummaries lists every known province with zero PROT', () => {
    const empty = emptySummaries();
    expect(empty).toHaveLength(35);
    expect(empty.every((p) => p.protCount === 0)).toBe(true);
  });
});

describe('fetching', () => {
  it('pages through /prot with status=ARSIP_NASIONAL until hasNext is false', async () => {
    const get = vi.fn(async (endpoint: string) => {
      const page = Number(new URL(endpoint, 'http://x').searchParams.get('page'));
      return { data: [prot(`p${page}`, '16')], pagination: { hasNext: page < 3 } };
    });
    const result = await fetchPublicProt(get as unknown as GetJson, { provinsi: '16' });
    expect(result.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(get).toHaveBeenCalledTimes(3);
    const params = new URL(get.mock.calls[0][0], 'http://x').searchParams;
    expect(params.get('status')).toBe('ARSIP_NASIONAL');
    expect(params.get('provinsi')).toBe('16');
    expect(params.get('limit')).toBe('100');
  });

  it('stops after MAX_PROT_PAGES even if the API keeps saying hasNext', async () => {
    const get = vi.fn(async () => ({ data: [prot('x', '16')], pagination: { hasNext: true } }));
    await fetchPublicProt(get as unknown as GetJson);
    expect(get).toHaveBeenCalledTimes(MAX_PROT_PAGES);
  });

  it('cannot be tricked into a different status by the extra query', async () => {
    const get = vi.fn(async (endpoint: string) => ({ endpoint, data: [], pagination: { hasNext: false } }));
    await fetchPublicProt(get as unknown as GetJson, { status: 'DRAFT' });
    expect(new URL(get.mock.calls[0][0], 'http://x').searchParams.getAll('status')).toEqual(['ARSIP_NASIONAL']);
  });

  it('loadJelajahData falls back to the known province list when the API returns none', async () => {
    const get = vi.fn(async (endpoint: string) =>
      endpoint.startsWith('/daerah')
        ? { data: [] }
        : { data: [prot('a', '16')], pagination: { hasNext: false } },
    );
    const data = await loadJelajahData(get as unknown as GetJson);
    expect(data.provinces).toHaveLength(35);
    expect(data.provinces.find((p) => p.kode === '16')?.protCount).toBe(1);
  });

  it('loadJelajahData rejects when the API fails (the hub shows the retry message)', async () => {
    const get = vi.fn(async () => {
      throw new Error('HTTP error! status: 502');
    });
    await expect(loadJelajahData(get as unknown as GetJson)).rejects.toThrow('502');
  });

  it('loadProvinceProt returns the full list of one province', async () => {
    const many = Array.from({ length: PROT_LIST_LIMIT + 2 }, (_, i) => prot(`p${i}`, '16'));
    const get = vi.fn(async () => ({ data: many, pagination: { hasNext: false } }));
    expect(await loadProvinceProt('16', get as unknown as GetJson)).toHaveLength(PROT_LIST_LIMIT + 2);
  });
});
