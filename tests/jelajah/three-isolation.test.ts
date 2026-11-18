import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * three.js must stay out of every route except the 3D tiers of /jelajah and /jelajah/[provinsi]
 * (Phase 10, extended in Phase 11). Static guard on the import graph:
 * - only the 3D views (components/jelajah/Map3D.tsx, components/jelajah/three/*) and the three helpers
 *   (lib/jelajah/three/*) may import three or @react-three;
 * - the three helpers and the scene components are used only by those 3D views;
 * - each 3D view is loaded only through next/dynamic with ssr: false, from exactly one place.
 * (The build output is also checked in the phase reports.)
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'lib', 'hooks', 'contexts', 'types'];

const isThreeZone = (f: string) =>
  f === 'components/jelajah/Map3D.tsx' || f.startsWith('components/jelajah/three/') || f.startsWith('lib/jelajah/three/');

function sourceFiles(dir: string): string[] {
  const abs = join(root, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const path = join(abs, name);
    if (statSync(path).isDirectory()) return sourceFiles(join(dir, name));
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [relative(root, path).replace(/\\/g, '/')] : [];
  });
}

const files = SOURCE_DIRS.flatMap(sourceFiles);
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const THREE_IMPORT = /from\s+['"](three|three\/[^'"]*|@react-three\/[^'"]+)['"]|import\(\s*['"](three|@react-three\/[^'"]+)['"]/;

describe('three.js isolation', () => {
  it('only the 3D views and the three helpers import three / @react-three', () => {
    const importers = files.filter((f) => THREE_IMPORT.test(read(f)));
    expect(importers.filter((f) => !isThreeZone(f))).toEqual([]);
    expect(importers).toContain('components/jelajah/Map3D.tsx');
    expect(importers).toContain('components/jelajah/three/VillageScene3D.tsx');
  });

  it('the three helpers and the 3D scene components are imported only inside the three zone', () => {
    const users = files.filter(
      (f) => !isThreeZone(f) && /from\s+['"][^'"]*(jelajah\/three\/|\.\/three\/|\/Map3D['"])/.test(read(f)),
    );
    expect(users).toEqual([]);
  });

  it('Map3D is loaded only via next/dynamic with ssr: false from JelajahHub', () => {
    const dynamicUsers = files.filter((f) => /import\(\s*['"][^'"]*\/Map3D['"]\s*\)/.test(read(f)));
    expect(dynamicUsers).toEqual(['components/jelajah/JelajahHub.tsx']);
    expect(read('components/jelajah/JelajahHub.tsx')).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\('\.\/Map3D'\),\s*\{\s*ssr:\s*false/);
  });

  it('VillageScene3D is loaded only via next/dynamic with ssr: false from ProvinceExperience', () => {
    const dynamicUsers = files.filter((f) => /import\(\s*['"][^'"]*three\/VillageScene3D['"]\s*\)/.test(read(f)));
    expect(dynamicUsers).toEqual(['components/jelajah/ProvinceExperience.tsx']);
    expect(read('components/jelajah/ProvinceExperience.tsx')).toMatch(
      /dynamic\(\s*\(\)\s*=>\s*import\('\.\/three\/VillageScene3D'\),\s*\{\s*ssr:\s*false/,
    );
  });

  it('the 2D views never import the 3D code', () => {
    for (const f of ['components/jelajah/Map2D.tsx', 'components/jelajah/ProvinceScene2D.tsx']) {
      const imports = (read(f).match(/^import[^;]*;/gm) ?? []).join('\n');
      expect(imports).not.toMatch(/three|Map3D|VillageScene3D/);
    }
  });
});
