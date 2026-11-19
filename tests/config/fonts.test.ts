import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?|mjs|css)$/.test(name) ? [full] : [];
  });
}

describe('self-hosted fonts (no build-time download from Google Fonts)', () => {
  it('no source file imports next/font/google', () => {
    const offenders = ['app', 'components', 'lib', 'contexts', 'hooks']
      .filter((d) => existsSync(join(root, d)))
      .flatMap((d) => sourceFiles(join(root, d)))
      .filter((f) => /from\s+['"]next\/font\/google['"]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the layout loads the committed woff2 files with the same CSS variables', () => {
    const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/from "next\/font\/local"/);
    expect(layout).toContain('--font-jakarta-sans');
    expect(layout).toContain('--font-geist-mono');
    for (const file of ['PlusJakartaSans-latin.woff2', 'GeistMono-latin.woff2', 'OFL-PlusJakartaSans.txt', 'OFL-GeistMono.txt']) {
      expect(existsSync(join(root, 'app/fonts', file)), file).toBe(true);
    }
    // woff2 signature
    expect(readFileSync(join(root, 'app/fonts/PlusJakartaSans-latin.woff2')).subarray(0, 4).toString()).toBe('wOF2');
    expect(readFileSync(join(root, 'app/fonts/GeistMono-latin.woff2')).subarray(0, 4).toString()).toBe('wOF2');
  });
});
