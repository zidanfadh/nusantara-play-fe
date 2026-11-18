import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * three.js must stay out of every route except the 3D tier of /jelajah (Phase 10). Static guard:
 * only the 3D view and its geometry module may import three or @react-three, and the 3D view may
 * only be loaded through next/dynamic. (The build output is also checked in the phase report.)
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'lib', 'hooks', 'contexts', 'types'];
const ALLOWED_THREE_IMPORTERS = new Set(['components/jelajah/Map3D.tsx', 'lib/jelajah/three/map-geometry.ts']);

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
  it('only the 3D view and its geometry module import three / @react-three', () => {
    const importers = files.filter((f) => THREE_IMPORT.test(read(f)));
    expect(importers.sort()).toEqual([...ALLOWED_THREE_IMPORTERS].sort());
  });

  it('nothing imports the three geometry module except the 3D view', () => {
    const users = files.filter((f) => /jelajah\/three\/map-geometry/.test(read(f)));
    expect(users).toEqual(['components/jelajah/Map3D.tsx']);
  });

  it('Map3D is loaded only via next/dynamic with ssr: false', () => {
    const staticImports = files.filter((f) => /from\s+['"][^'"]*\/Map3D['"]/.test(read(f)));
    expect(staticImports).toEqual([]);
    const dynamicUsers = files.filter((f) => /import\(\s*['"][^'"]*\/Map3D['"]\s*\)/.test(read(f)));
    expect(dynamicUsers).toEqual(['components/jelajah/JelajahHub.tsx']);
    expect(read('components/jelajah/JelajahHub.tsx')).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\('\.\/Map3D'\),\s*\{\s*ssr:\s*false/);
  });
});
