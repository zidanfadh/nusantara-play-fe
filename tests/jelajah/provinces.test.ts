import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  KNOWN_PROVINCES,
  PILOT_PROVINCE,
  findEnterableProvince,
  matchShapesToProvinces,
  normalizeProvinceName,
  provinceSlug,
} from '@/lib/jelajah/provinces';

const geoPath = fileURLToPath(new URL('../../public/jelajah/geo/indonesia-provinces.json', import.meta.url));

describe('normalizeProvinceName / provinceSlug', () => {
  it.each([
    ['Sumatera Selatan', 'sumatera selatan'],
    ['  PROVINSI Jawa  Barat ', 'jawa barat'],
    ['Daerah Istimewa Yogyakarta', 'daerah istimewa yogyakarta'],
    ['Kep. Riau', 'kep riau'],
    ['Dki Jakarta', 'dki jakarta'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeProvinceName(input)).toBe(expected);
  });

  it('builds URL slugs', () => {
    expect(provinceSlug('Sumatera Selatan')).toBe('sumatera-selatan');
    expect(provinceSlug('Daerah Istimewa Yogyakarta')).toBe('daerah-istimewa-yogyakarta');
  });
});

describe('matchShapesToProvinces', () => {
  it('matches exact names, aliases, and reports both kinds of misses', () => {
    const result = matchShapesToProvinces(
      ['Sumatera Selatan', 'DKI Jakarta Raya', 'Kep. Riau', 'Nanggroe Aceh Darussalam', 'Atlantis'],
      [
        { kode: '16', nama: 'Sumatera Selatan' },
        { kode: '31', nama: 'Dki Jakarta' },
        { kode: '21', nama: 'Kepulauan Riau' },
        { kode: '11', nama: 'Aceh' },
        { kode: '93', nama: 'Papua Selatan' },
      ],
    );
    expect(Object.fromEntries(result.codeByShape)).toEqual({
      'Sumatera Selatan': '16',
      'DKI Jakarta Raya': '31',
      'Kep. Riau': '21',
      'Nanggroe Aceh Darussalam': '11',
    });
    expect(result.unmatchedShapes).toEqual(['Atlantis']);
    expect(result.provincesWithoutShape).toEqual([{ kode: '93', nama: 'Papua Selatan' }]);
  });

  it('matches every shape of the committed GeoJSON to a production province code', () => {
    const geo = JSON.parse(readFileSync(geoPath, 'utf8')) as { features: { properties: { name: string } }[] };
    const names = geo.features.map((f) => f.properties.name);
    const result = matchShapesToProvinces(names, KNOWN_PROVINCES);

    expect(names).toHaveLength(34);
    expect(result.unmatchedShapes).toEqual([]);
    expect(new Set(result.codeByShape.values()).size).toBe(34);
    expect(result.codeByShape.get('Sumatera Selatan')).toBe('16');
    // The 2019 boundaries predate the 2022 Papua split: Papua Selatan has no shape of its own.
    expect(result.provincesWithoutShape).toEqual([{ kode: '93', nama: 'Papua Selatan' }]);
  });
});

describe('KNOWN_PROVINCES and the pilot', () => {
  it('has 35 unique two-digit codes and contains the pilot', () => {
    expect(KNOWN_PROVINCES).toHaveLength(35);
    expect(new Set(KNOWN_PROVINCES.map((p) => p.kode)).size).toBe(35);
    expect(KNOWN_PROVINCES.every((p) => /^\d{2}$/.test(p.kode))).toBe(true);
    expect(KNOWN_PROVINCES).toContainEqual({ kode: PILOT_PROVINCE.kode, nama: PILOT_PROVINCE.nama });
  });

  it('only sumatera-selatan is enterable', () => {
    expect(findEnterableProvince('sumatera-selatan')?.kode).toBe('16');
    expect(findEnterableProvince('jawa-barat')).toBeNull();
    expect(findEnterableProvince('')).toBeNull();
  });
});
