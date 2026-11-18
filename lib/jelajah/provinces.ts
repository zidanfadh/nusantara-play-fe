/**
 * Province registry for Jelajah Nusantara.
 *
 * Codes are the two-digit Kemendagri codes used by the backend (`GET /daerah/provinces`, PROT
 * `provinsiKode`). KNOWN_PROVINCES mirrors the production list as of Phase 10 (35 provinces) so the
 * map can still label and match shapes when the API is unreachable.
 */

export interface ProvinceRef {
  kode: string;
  nama: string;
}

/** Production `GET /api/daerah/provinces` on 2026-11-18 (35 entries, sorted by name). */
export const KNOWN_PROVINCES: readonly ProvinceRef[] = [
  { kode: '11', nama: 'Aceh' },
  { kode: '51', nama: 'Bali' },
  { kode: '36', nama: 'Banten' },
  { kode: '17', nama: 'Bengkulu' },
  { kode: '34', nama: 'Daerah Istimewa Yogyakarta' },
  { kode: '31', nama: 'Dki Jakarta' },
  { kode: '75', nama: 'Gorontalo' },
  { kode: '15', nama: 'Jambi' },
  { kode: '32', nama: 'Jawa Barat' },
  { kode: '33', nama: 'Jawa Tengah' },
  { kode: '35', nama: 'Jawa Timur' },
  { kode: '61', nama: 'Kalimantan Barat' },
  { kode: '63', nama: 'Kalimantan Selatan' },
  { kode: '62', nama: 'Kalimantan Tengah' },
  { kode: '64', nama: 'Kalimantan Timur' },
  { kode: '65', nama: 'Kalimantan Utara' },
  { kode: '19', nama: 'Kepulauan Bangka Belitung' },
  { kode: '21', nama: 'Kepulauan Riau' },
  { kode: '18', nama: 'Lampung' },
  { kode: '81', nama: 'Maluku' },
  { kode: '82', nama: 'Maluku Utara' },
  { kode: '52', nama: 'Nusa Tenggara Barat' },
  { kode: '53', nama: 'Nusa Tenggara Timur' },
  { kode: '91', nama: 'Papua' },
  { kode: '92', nama: 'Papua Barat' },
  { kode: '93', nama: 'Papua Selatan' },
  { kode: '14', nama: 'Riau' },
  { kode: '76', nama: 'Sulawesi Barat' },
  { kode: '73', nama: 'Sulawesi Selatan' },
  { kode: '72', nama: 'Sulawesi Tengah' },
  { kode: '74', nama: 'Sulawesi Tenggara' },
  { kode: '71', nama: 'Sulawesi Utara' },
  { kode: '13', nama: 'Sumatera Barat' },
  { kode: '16', nama: 'Sumatera Selatan' },
  { kode: '12', nama: 'Sumatera Utara' },
];

/** The pilot province (owner decision, Phase 10). */
export const PILOT_PROVINCE = {
  kode: '16',
  nama: 'Sumatera Selatan',
  slug: 'sumatera-selatan',
} as const;

/** Provinces that have a /jelajah/[provinsi] page. Every other slug is a 404. */
export const ENTERABLE_PROVINCES = [PILOT_PROVINCE] as const;

export function findEnterableProvince(slug: string) {
  return ENTERABLE_PROVINCES.find((p) => p.slug === slug) ?? null;
}

/** "Daerah Istimewa Yogyakarta" → "daerah-istimewa-yogyakarta". */
export function provinceSlug(nama: string): string {
  return normalizeProvinceName(nama).replace(/ /g, '-');
}

/**
 * Alternative spellings seen in boundary datasets, mapped to the normalized backend name.
 * Keys and values are already normalized (see normalizeProvinceName).
 */
const NAME_ALIASES: Record<string, string> = {
  'nanggroe aceh darussalam': 'aceh',
  'di aceh': 'aceh',
  'di yogyakarta': 'daerah istimewa yogyakarta',
  diy: 'daerah istimewa yogyakarta',
  yogyakarta: 'daerah istimewa yogyakarta',
  jakarta: 'dki jakarta',
  'jakarta raya': 'dki jakarta',
  'dki jakarta raya': 'dki jakarta',
  'daerah khusus ibukota jakarta': 'dki jakarta',
  'bangka belitung': 'kepulauan bangka belitung',
  'kep bangka belitung': 'kepulauan bangka belitung',
  'kep riau': 'kepulauan riau',
  'irian jaya barat': 'papua barat',
  'sumatra barat': 'sumatera barat',
  'sumatra selatan': 'sumatera selatan',
  'sumatra utara': 'sumatera utara',
  ntb: 'nusa tenggara barat',
  ntt: 'nusa tenggara timur',
};

/** Lowercase, no accents, no "Provinsi" prefix, punctuation removed, single spaces. */
export function normalizeProvinceName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^provinsi /, '')
    .replace(/\s+/g, ' ');
}

export interface ShapeMatchResult {
  /** shape name → province code, for every shape that matched. */
  codeByShape: Map<string, string>;
  /** Shape names with no province (not drawn as clickable). */
  unmatchedShapes: string[];
  /** Provinces with no shape on the map (listed in the text view only). */
  provincesWithoutShape: ProvinceRef[];
}

/** Matches boundary shape names to province codes by normalized name, then by alias. */
export function matchShapesToProvinces(
  shapeNames: readonly string[],
  provinces: readonly ProvinceRef[],
): ShapeMatchResult {
  const codeByName = new Map<string, string>();
  for (const p of provinces) codeByName.set(normalizeProvinceName(p.nama), p.kode);

  const codeByShape = new Map<string, string>();
  const unmatchedShapes: string[] = [];
  for (const shapeName of shapeNames) {
    const normalized = normalizeProvinceName(shapeName);
    const kode = codeByName.get(normalized) ?? codeByName.get(NAME_ALIASES[normalized] ?? '');
    if (kode) codeByShape.set(shapeName, kode);
    else unmatchedShapes.push(shapeName);
  }

  const matchedCodes = new Set(codeByShape.values());
  const provincesWithoutShape = provinces.filter((p) => !matchedCodes.has(p.kode));
  return { codeByShape, unmatchedShapes, provincesWithoutShape };
}
