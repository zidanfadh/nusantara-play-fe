import { describe, expect, it, vi } from 'vitest';
import { getPublishedCounts, landingStatTiles } from '@/components/landing/published-stats';
import type { GetJson } from '@/lib/jelajah/data';

function fakeGet(pages: unknown[][]): { get: GetJson; urls: string[] } {
  const urls: string[] = [];
  const get = vi.fn(async (endpoint: string) => {
    urls.push(endpoint);
    const page = Number(new URLSearchParams(endpoint.split('?')[1]).get('page'));
    return { data: pages[page - 1] ?? [], pagination: { hasNext: page < pages.length } };
  }) as unknown as GetJson;
  return { get, urls };
}

describe('landing statistics: published content only (Phase 18)', () => {
  it('asks only for ARSIP_NASIONAL and counts published PROT and their provinces', async () => {
    const { get, urls } = fakeGet([
      [
        { id: 'a', status: 'ARSIP_NASIONAL', provinsiKode: '16' },
        { id: 'b', status: 'ARSIP_NASIONAL', provinsiKode: '16' },
        { id: 'c', status: 'DRAFT', provinsiKode: '32' },
      ],
      [
        { id: 'd', status: 'ARSIP_NASIONAL', provinsiKode: '51' },
        { id: 'a', status: 'ARSIP_NASIONAL', provinsiKode: '16' },
        { id: 'e', status: 'ARSIP_NASIONAL', provinsiKode: '99' },
      ],
    ]);
    // e (unknown province) counts as a PROT but not as a province, exactly like the map and the bumper.
    await expect(getPublishedCounts(get)).resolves.toEqual({ totalProt: 4, totalProvinsi: 2 });
    expect(urls.every((u) => u.includes('status=ARSIP_NASIONAL'))).toBe(true);
  });

  it('returns null when the API fails (numbers hidden, never guessed)', async () => {
    const get = (async () => {
      throw new Error('down');
    }) as GetJson;
    await expect(getPublishedCounts(get)).resolves.toBeNull();
  });

  it('hides numbers that are 0 or unknown and keeps the order', () => {
    expect(
      landingStatTiles({ totalProt: 0, totalProvinsi: 0 }, { totalProt: 9, totalProvinsi: 9, totalEvents: 1, totalUsers: 1234 }),
    ).toEqual([
      { value: '1', label: 'Events' },
      { value: '1.234', label: 'Anggota' },
    ]);
    expect(
      landingStatTiles(null, { totalProt: 0, totalProvinsi: 0, totalEvents: 0, totalUsers: 0 }),
    ).toEqual([]);
    expect(
      landingStatTiles({ totalProt: 3, totalProvinsi: 2 }, { totalProt: 99, totalProvinsi: 30, totalEvents: 0, totalUsers: 5 }),
    ).toEqual([
      { value: '3', label: 'Permainan' },
      { value: '2', label: 'Provinsi' },
      { value: '5', label: 'Anggota' },
    ]);
  });
});
