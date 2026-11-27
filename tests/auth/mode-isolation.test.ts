/**
 * Phase 29: the two auth implementations stay apart. The local implementation never imports Supabase, the
 * switch points under lib/auth/impl/ are the ONLY places that name the Supabase implementation, every local
 * alias target exists and exports the same names, and a local-mode build outside Vercel needs BACKEND_ORIGIN.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOCAL_AUTH_ALIASES,
  assertLocalAuthBackend,
  authAliases,
  resolveAuthMode,
} from '@/next.config';
import { parseAuthMode } from '@/lib/auth/mode';

const ROOT = join(__dirname, '..', '..');

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const importsOf = (path: string) =>
  [...readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);

const exportNames = (path: string) =>
  [...readFileSync(path, 'utf8').matchAll(/export\s+(?:async\s+)?(?:const|function)\s+(\w+)|export\s*\{([^}]+)\}/g)]
    .flatMap((m) => (m[1] ? [m[1]] : m[2].split(',').map((part) => part.split(/\s+as\s+/).pop()!.trim())))
    .filter(Boolean)
    .sort();

describe('auth mode switch', () => {
  it('reads NEXT_PUBLIC_AUTH_MODE the same way in next.config.ts and lib/auth/mode.ts', () => {
    for (const value of [undefined, '', 'local', 'supabase', 'LOCAL', 'other']) {
      expect(resolveAuthMode(value)).toBe(parseAuthMode(value));
    }
    expect(resolveAuthMode(undefined)).toBe('supabase');
    expect(resolveAuthMode('local')).toBe('local');
  });

  it('aliases nothing in supabase mode and the three switch points in local mode', () => {
    expect(authAliases('supabase')).toEqual({});
    expect(Object.keys(authAliases('local')).sort()).toEqual([
      '@/lib/auth/impl/client',
      '@/lib/auth/impl/middleware',
      '@/lib/auth/impl/server',
    ]);
  });

  it.each(Object.entries(LOCAL_AUTH_ALIASES))('%s → %s exists and exports what the default exports', (from, to) => {
    const target = join(ROOT, to);
    const source = join(ROOT, `${from.replace('@/', '')}.ts`);
    expect(existsSync(target)).toBe(true);
    expect(existsSync(source)).toBe(true);
    expect(exportNames(target)).toEqual(exportNames(source));
  });

  it('local mode outside Vercel needs BACKEND_ORIGIN (never the production API by accident)', () => {
    expect(() => assertLocalAuthBackend({ NEXT_PUBLIC_AUTH_MODE: 'local' })).toThrow(/BACKEND_ORIGIN/);
    expect(() => assertLocalAuthBackend({ NEXT_PUBLIC_AUTH_MODE: 'local', BACKEND_ORIGIN: ' ' })).toThrow();
    expect(() =>
      assertLocalAuthBackend({ NEXT_PUBLIC_AUTH_MODE: 'local', BACKEND_ORIGIN: 'http://localhost:3000' }),
    ).not.toThrow();
    expect(() => assertLocalAuthBackend({ NEXT_PUBLIC_AUTH_MODE: 'local', VERCEL: '1' })).not.toThrow();
    expect(() => assertLocalAuthBackend({})).not.toThrow();
    expect(() => assertLocalAuthBackend({ NEXT_PUBLIC_AUTH_MODE: 'supabase' })).not.toThrow();
  });
});

describe('import isolation', () => {
  const localFiles = filesUnder(join(ROOT, 'lib', 'auth', 'local'));

  it.each(localFiles.map((f) => relative(ROOT, f)))('%s imports no Supabase code', (file) => {
    for (const spec of importsOf(join(ROOT, file))) {
      expect(spec).not.toMatch(/supabase/i);
    }
  });

  it('only lib/auth/impl/* and the supabase implementation name lib/supabase or lib/auth/supabase', () => {
    const scanned = ['app', 'components', 'contexts', 'hooks', 'lib', 'types']
      .flatMap((dir) => filesUnder(join(ROOT, dir)))
      .concat([join(ROOT, 'middleware.ts')]);
    const offenders = scanned
      .filter((file) => importsOf(file).some((spec) => /(^|\/)lib\/supabase(\/|$)|lib\/auth\/supabase/.test(spec) || spec.startsWith('@supabase/')))
      .map((file) => relative(ROOT, file).replace(/\\/g, '/'))
      .filter((file) => !file.startsWith('lib/auth/impl/') && !file.startsWith('lib/auth/supabase/') && !file.startsWith('lib/supabase/'));
    expect(offenders).toEqual([]);
  });
});
