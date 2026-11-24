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

  it('the layout loads the committed woff2 files (Phase 27: Poppins, Cinzel Decorative, Geist Mono)', () => {
    const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/from "next\/font\/local"/);
    expect(layout).toContain('--font-poppins');
    expect(layout).toContain('--font-cinzel-decorative');
    expect(layout).toContain('--font-geist-mono');
    expect(layout).not.toMatch(/jakarta/i);
    const files = [
      'Poppins-Regular-latin.woff2',
      'Poppins-Medium-latin.woff2',
      'Poppins-SemiBold-latin.woff2',
      'Poppins-Bold-latin.woff2',
      'CinzelDecorative-Bold.woff2',
      'GeistMono-latin.woff2',
    ];
    for (const file of [...files, 'OFL-Poppins.txt', 'OFL-CinzelDecorative.txt', 'OFL-GeistMono.txt']) {
      expect(existsSync(join(root, 'app/fonts', file)), file).toBe(true);
    }
    for (const file of files) {
      expect(readFileSync(join(root, 'app/fonts', file)).subarray(0, 4).toString(), file).toBe('wOF2');
      expect(layout, file).toContain(file);
    }
    // Poppins in the four UI weights only.
    for (const w of ['400', '500', '600', '700']) expect(layout).toContain(`weight: "${w}"`);
    expect(existsSync(join(root, 'app/fonts/PlusJakartaSans-latin.woff2'))).toBe(false);
  });

  it('the fonts are actually used (Phase 14 / 27): font theme lines inline, body on the next/font variable', () => {
    const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
    const inline = css.match(/@theme inline\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(inline).toContain('--font-sans: var(--font-poppins);');
    expect(inline).toContain('--font-display: var(--font-cinzel-decorative);');
    expect(inline).toContain('--font-mono: var(--font-geist-mono);');
    // No font line left in a plain @theme block (it would be resolved on :root, where next/font sets nothing).
    for (const block of css.matchAll(/@theme\s*\{([^}]*)\}/g)) expect(block[1]).not.toMatch(/--font-(sans|mono|display)\s*:/);
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-poppins\)/);
  });

  it('Cinzel Decorative (font-display) is never the body, button or form font', () => {
    const offenders = ['app', 'components']
      .flatMap((d) => sourceFiles(join(root, d)))
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        // Controls never; a paragraph only as a large display figure (text-3xl or larger).
        if (/<(?:button|input|textarea|select|label)(?=[\s>])[^>]*className="[^"]*(?<![\w-])font-display(?![\w-])/.test(src)) return true;
        return [...src.matchAll(/<p(?=[\s>])[^>]*className="([^"]*)"/g)].some(
          ([, cls]) => /(?<![\w-])font-display(?![\w-])/.test(cls) && !/(?<![\w-])text-([3-9]xl)(?![\w-])/.test(cls),
        );
      });
    expect(offenders).toEqual([]);
  });
});
