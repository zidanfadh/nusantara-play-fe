import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Owner decision (Phase 17): games record nothing yet. No game file may call the network or import API
 * code, and the game code never imports three.js. Only localStorage settings are allowed.
 */
const root = fileURLToPath(new URL('../../', import.meta.url));

function files(dir: string): string[] {
  const abs = join(root, dir);
  return readdirSync(abs).flatMap((name) => {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) return files(join(dir, name));
    return /\.(ts|tsx)$/.test(name) ? [relative(root, p).split('\\').join('/')] : [];
  });
}

const GAME_FILES = [...files('lib/games'), ...files('components/games'), ...files('app/main')];

describe('games record nothing (Phase 17)', () => {
  it('covers the engine, the worker, the components and the pages', () => {
    expect(GAME_FILES).toEqual(
      expect.arrayContaining([
        'lib/games/congklak/engine.ts',
        'lib/games/congklak/core.ts',
        'lib/games/congklak/ai-worker-source.ts',
        'lib/games/congklak/rules.ts',
        'components/games/congklak/CongklakGame.tsx',
        'app/main/congklak/page.tsx',
        // Phase 20
        'lib/games/gasing/physics.ts',
        'lib/games/gasing/match.ts',
        'lib/games/gasing/ai.ts',
        'lib/games/gasing/texts.ts',
        'components/games/gasing/GasingGame.tsx',
        'components/games/gasing/GasingArena.tsx',
        'app/main/gasing/page.tsx',
      ]),
    );
  });

  it.each(GAME_FILES)('%s sends nothing and imports no API or three.js code', (f) => {
    const src = readFileSync(join(root, f), 'utf8');
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource|sessionStorage/);
    expect(src).not.toMatch(/from\s+['"]@\/(lib\/api|hooks|contexts|lib\/supabase)/);
    expect(src).not.toMatch(/from\s+['"](three|@react-three\/[^'"]+)['"]/);
  });

  it('the engine, rules and AI are pure (no React, no DOM storage)', () => {
    const congklak = ['core', 'engine', 'rules', 'state', 'ai', 'random', 'replay'].map((n) => `lib/games/congklak/${n}.ts`);
    const gasing = ['physics', 'match', 'ai', 'outcome', 'throw', 'rules', 'random', 'texts', 'types'].map((n) => `lib/games/gasing/${n}.ts`);
    for (const f of [...congklak, ...gasing]) {
      const src = readFileSync(join(root, f), 'utf8');
      expect(src, f).not.toMatch(/from\s+['"]react['"]|localStorage|document\.|window\./);
    }
  });
});
