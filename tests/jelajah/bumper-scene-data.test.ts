import { describe, expect, it } from 'vitest';
import {
  communityTiles,
  LANDING_STATS_ENDPOINT,
  loadBumperStats,
  mapSceneData,
  parseLandingStats,
  pickProtPhotos,
  protSceneData,
} from '@/lib/jelajah/bumper/scene-data';
import { emptySummaries, type JelajahData, type ProvinceSummary } from '@/lib/jelajah/data';

const province = (kode: string, nama: string, prots: { id: string; foto: string | null }[]): ProvinceSummary => ({
  kode,
  nama,
  slug: nama.toLowerCase(),
  protCount: prots.length,
  prots: prots.map((p) => ({ ...p, nama: `PROT ${p.id}` })),
});

const data: JelajahData = {
  provinces: [
    province('11', 'Aceh', [
      { id: 'a1', foto: 'https://x/a1.jpg' },
      { id: 'a2', foto: 'https://x/a2.jpg' },
      { id: 'a3', foto: 'https://x/a3.jpg' },
    ]),
    province('32', 'Jawa Barat', [{ id: 'b1', foto: null }, { id: 'b2', foto: 'https://x/b2.jpg' }]),
    province('51', 'Bali', []),
  ],
  totalProt: 1234,
  unassignedProt: 0,
};

const empty: JelajahData = { provinces: emptySummaries(), totalProt: 0, unassignedProt: 0 };

describe('bumper scene data (Phase 16)', () => {
  it('photos: one per province first, only PROT with a photo, at most 4', () => {
    expect(pickProtPhotos(data).map((p) => p.id)).toEqual(['a1', 'b2', 'a2', 'a3']);
    expect(pickProtPhotos(data, 2).map((p) => p.id)).toEqual(['a1', 'b2']);
    expect(pickProtPhotos(empty)).toEqual([]);
  });

  it('PROT scene: the real number when ready', () => {
    const s = protSceneData(data, 'ready');
    expect(s.count).toBe(1234);
    expect(s.headline).toBe('1.234 PROT publik');
    expect(s.photos).toHaveLength(4);
  });

  it('PROT scene: 0 PROT shows a neutral text, no number, no photos', () => {
    const s = protSceneData(empty, 'ready');
    expect(s.count).toBe(0);
    expect(s.headline).not.toMatch(/\d/);
    expect(s.text).toContain('setelah selesai dikurasi');
    expect(s.photos).toEqual([]);
  });

  it('PROT scene: loading or error shows no number', () => {
    for (const status of ['loading', 'error'] as const) {
      const s = protSceneData(data, status);
      expect(s.count).toBeNull();
      expect(`${s.headline} ${s.text}`).not.toMatch(/\d/);
      expect(s.photos).toEqual([]);
    }
  });

  it('map scene: provinces with PROT highlighted and counted', () => {
    const s = mapSceneData(data, 'ready');
    expect(s.highlighted).toEqual(['11', '32']);
    expect(s.count).toBe(2);
    expect(s.headline).toBe('2 provinsi dengan PROT publik');
  });

  it('map scene: no number while unknown or when no province has PROT', () => {
    expect(mapSceneData(data, 'loading')).toMatchObject({ highlighted: [], count: null, headline: 'Peta provinsi Indonesia' });
    expect(mapSceneData(data, 'error').count).toBeNull();
    expect(mapSceneData(empty, 'ready')).toMatchObject({ highlighted: [], count: 0, headline: 'Peta provinsi Indonesia' });
  });

  it('stats: parses the two numbers and rejects anything odd', () => {
    expect(parseLandingStats({ totalProt: 5, totalProvinsi: 5, totalEvents: 1, totalUsers: 42 })).toEqual({ events: 1, members: 42 });
    expect(parseLandingStats({ totalEvents: 'x', totalUsers: -1 })).toBeNull();
    expect(parseLandingStats({ totalEvents: 3 })).toEqual({ events: 3, members: null });
    expect(parseLandingStats(null)).toBeNull();
    expect(parseLandingStats('oops')).toBeNull();
  });

  it('stats: GET /stats/landing; a failing endpoint gives null (scene without numbers)', async () => {
    const calls: string[] = [];
    const ok = async <T,>(endpoint: string) => {
      calls.push(endpoint);
      return { totalEvents: 2, totalUsers: 1500 } as T;
    };
    expect(await loadBumperStats(ok)).toEqual({ events: 2, members: 1500 });
    expect(calls).toEqual([LANDING_STATS_ENDPOINT]);
    const failing = async <T,>(): Promise<T> => {
      throw new Error('HTTP error! status: 502');
    };
    expect(await loadBumperStats(failing)).toBeNull();
  });

  it('community tiles: only numbers above 0, formatted for Indonesia', () => {
    expect(communityTiles(null)).toEqual([]);
    expect(communityTiles({ events: 0, members: 1500 })).toEqual([{ value: '1.500', label: 'Anggota' }]);
    expect(communityTiles({ events: 2, members: null })).toEqual([{ value: '2', label: 'Event' }]);
  });
});
