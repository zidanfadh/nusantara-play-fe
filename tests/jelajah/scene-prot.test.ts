import { describe, expect, it, vi } from 'vitest';
import { loadSceneProt, shapeSceneProt, shortText } from '@/lib/jelajah/engine/scene-prot';
import { hasSeenHelp, HELP_HINT_STORAGE_KEY, markHelpSeen } from '@/lib/jelajah/engine/help-hint';

const row = (over: Record<string, unknown>) => ({
  id: 'a',
  nama: 'B',
  status: 'ARSIP_NASIONAL',
  provinsiKode: '16',
  deskripsi: 'd',
  caraBermain: 'c',
  fotoKegiatan: [],
  ...over,
});

describe('shapeSceneProt', () => {
  it('keeps only public PROT of the province, deduplicated and sorted by name', () => {
    const out = shapeSceneProt(
      [
        row({ id: '1', nama: 'Zeta' }),
        row({ id: '2', nama: 'alpha', fotoKegiatan: ['http://insecure/x.jpg', 'https://cdn.example/x.jpg'] }),
        row({ id: '2', nama: 'alpha again' }),
        row({ id: '3', status: 'DRAFT' }),
        row({ id: '4', provinsiKode: '32' }),
        row({ id: '' }),
      ],
      '16',
    );
    expect(out.map((p) => p.id)).toEqual(['2', '1']);
    expect(out[0].foto).toBe('https://cdn.example/x.jpg');
    expect(out[1].foto).toBeNull();
  });

  it('treats non-string fields as empty', () => {
    const [p] = shapeSceneProt([row({ nama: 42, deskripsi: { x: 1 }, caraBermain: null })], '16');
    expect(p).toMatchObject({ nama: 'Tanpa nama', deskripsi: '', caraBermain: '' });
  });

  it('shortens long texts at a word boundary', () => {
    expect(shortText('pendek', 10)).toBe('pendek');
    const t = shortText('satu dua tiga empat lima enam tujuh', 20);
    expect(t.length).toBeLessThanOrEqual(20);
    expect(t).toBe('satu dua tiga empat…');
  });
});

describe('loadSceneProt', () => {
  it('requests the province with status ARSIP_NASIONAL', async () => {
    const get = vi.fn().mockResolvedValue({ data: [row({ id: 'x' })], pagination: { hasNext: false } });
    const out = await loadSceneProt('16', get);
    expect(out.map((p) => p.id)).toEqual(['x']);
    const url = get.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/prot\?/);
    expect(url).toContain('provinsi=16');
    expect(url).toContain('status=ARSIP_NASIONAL');
  });

  it('empty province: no PROT', async () => {
    const get = vi.fn().mockResolvedValue({ data: [], pagination: { hasNext: false } });
    expect(await loadSceneProt('16', get)).toEqual([]);
  });
});

describe('help hint storage', () => {
  it('remembers that the hint was seen', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    expect(hasSeenHelp(storage)).toBe(false);
    markHelpSeen(storage);
    expect(map.get(HELP_HINT_STORAGE_KEY)).toBe('1');
    expect(hasSeenHelp(storage)).toBe(true);
  });

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(hasSeenHelp(blocked)).toBe(false);
    expect(() => markHelpSeen(blocked)).not.toThrow();
    expect(hasSeenHelp(null)).toBe(false);
  });
});
