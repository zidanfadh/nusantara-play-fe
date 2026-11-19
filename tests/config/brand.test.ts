import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE_NAME, SITE_NAME_WORDS } from '@/lib/brand';

const ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(tsx?|mjs|json|svg|webmanifest)$/.test(name)) out.push(path);
  }
  return out;
}

describe('brand (Phase 18)', () => {
  it('is "Nusantara Legacy"', () => {
    expect(SITE_NAME).toBe('Nusantara Legacy');
    expect(SITE_NAME_WORDS).toEqual(['Nusantara', 'Legacy']);
  });

  it('no user-visible "Nusantara Virtual" is left in app/, components/, lib/ or public/', () => {
    const offenders = ['app', 'components', 'lib', 'public']
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .filter((file) => /nusantara virtual/i.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it('the root layout declares Indonesian and takes its metadata from lib/brand.ts', () => {
    const layout = readFileSync(join(ROOT, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain('<html lang="id"');
    expect(layout).toMatch(/title: SITE_NAME/);
    expect(layout).toMatch(/siteName: SITE_NAME/);
  });
});
