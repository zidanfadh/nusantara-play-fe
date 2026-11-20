import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { BUMPER_LAST_PLAYED_KEY, localDateKey, resetBumperMemoryForTests, shouldAutoPlayBumper } from '@/lib/jelajah/bumper/session';
import { isConceptForced, nextIntroStep, planIntro, type IntroStep } from '@/lib/jelajah/concept/gate';
import { CONCEPT_SEEN_KEY, hasSeenConcept, resetConceptMemoryForTests } from '@/lib/jelajah/concept/seen';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (f: string) => readFileSync(join(root, f), 'utf8');

function store(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const NOW = new Date(2026, 10, 19, 10, 0, 0);

/** The hub's decision, from real storage contents (same functions the hub calls). */
function decide(bumperSeenToday: boolean, conceptSeen: boolean, search: string): IntroStep[] {
  const local = store({
    ...(bumperSeenToday ? { [BUMPER_LAST_PLAYED_KEY]: localDateKey(NOW) } : {}),
    ...(conceptSeen ? { [CONCEPT_SEEN_KEY]: '1' } : {}),
  });
  const stores = { local, session: store() };
  return planIntro({
    bumperDue: shouldAutoPlayBumper(stores, NOW),
    conceptSeen: hasSeenConcept(stores),
    forced: isConceptForced(search),
  });
}

describe('intro gate: bumper → concept video → map (Phase 19)', () => {
  afterEach(() => {
    resetBumperMemoryForTests();
    resetConceptMemoryForTests();
  });

  const cases: [boolean, boolean, string, IntroStep[]][] = [
    // bumper seen today, concept seen, search → steps
    [false, false, '', ['bumper', 'concept']], // first visit ever
    [false, true, '', ['bumper']], // a later day
    [true, false, '', ['concept']], // bumper already today (e.g. before Phase 19), concept never
    [true, true, '', []], // second visit the same day: straight to the map
    [false, false, '?concept=1', ['bumper', 'concept']],
    [false, true, '?concept=1', ['bumper', 'concept']],
    [true, false, '?concept=1', ['concept']],
    [true, true, '?concept=1', ['concept']],
  ];
  for (const [bumperSeen, conceptSeen, search, expected] of cases) {
    it(`bumper ${bumperSeen ? 'seen' : 'unseen'} × concept ${conceptSeen ? 'seen' : 'unseen'}${search ? ' × forced' : ''} → ${expected.join(' → ') || 'map'}`, () => {
      expect(decide(bumperSeen, conceptSeen, search)).toEqual(expected);
    });
  }

  it('the next step after each one, then the map', () => {
    expect(nextIntroStep(['bumper', 'concept'], 'bumper')).toBe('concept');
    expect(nextIntroStep(['bumper', 'concept'], 'concept')).toBeNull();
    expect(nextIntroStep(['bumper'], 'bumper')).toBeNull();
    expect(nextIntroStep([], 'concept')).toBeNull();
  });

  it('?concept=1 exactly forces it, like ?debug=1', () => {
    expect(isConceptForced('?concept=1')).toBe(true);
    expect(isConceptForced('?debug=1&concept=1')).toBe(true);
    expect(isConceptForced('?concept=0')).toBe(false);
    expect(isConceptForced('?concept=true')).toBe(false);
    expect(isConceptForced('')).toBe(false);
  });
});

function files(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(root, dir, name);
    if (statSync(path).isDirectory()) return files(join(dir, name));
    return /\.(ts|tsx)$/.test(name) ? [relative(root, path).replace(/\\/g, '/')] : [];
  });
}

describe('concept video loading (Phase 19)', () => {
  const sources = ['app', 'components', 'lib'].flatMap(files);
  const hub = read('components/jelajah/JelajahHub.tsx');

  it('the player is loaded only via next/dynamic with ssr: false from the hub', () => {
    expect(hub).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\('\.\/concept\/ConceptVideo'\),\s*\{\s*ssr:\s*false/);
    const outside = sources.filter(
      (f) => !f.startsWith('components/jelajah/concept/') && /from\s+['"][^'"]*concept\/(ConceptVideo|scenes\/|art\/|scene-kit|ParticleField)/.test(read(f)),
    );
    expect(outside).toEqual([]);
  });

  it('the hub imports only the small gate pieces of the concept video (no scenes, no film code)', () => {
    const imports = (hub.match(/^import[^;]*;/gm) ?? []).filter((l) => l.includes('/concept/'));
    expect(imports.map((l) => l.match(/from\s+'([^']+)'/)?.[1]).sort()).toEqual([
      '@/lib/jelajah/concept/gate',
      '@/lib/jelajah/concept/seen',
    ]);
    // Never the script: it would put every caption into /jelajah's initial JS (found in the Phase 19 build).
    expect(hub).not.toMatch(/concept\/script/);
  });

  it('gate and seen stay tiny (no React, no scenes, no script)', () => {
    for (const f of ['lib/jelajah/concept/gate.ts', 'lib/jelajah/concept/seen.ts']) {
      const imports = (read(f).match(/^import[^;]*;/gm) ?? []).join('\n');
      expect(imports, f).not.toMatch(/'react'|\.\/script|scenes|framer-motion|components\//);
    }
  });

  it('the map has a "Tonton pengenalan" replay button (icon + text from md, aria-label on phones, 44 px)', () => {
    expect(hub).toContain('aria-label={CONCEPT_REPLAY_LABEL}');
    expect(hub).toContain('onClick={replayConcept}');
    expect(hub).toMatch(/min-h-\[44px\] min-w-\[44px\]/);
    expect(hub).toContain('<span className="hidden md:inline">{CONCEPT_REPLAY_LABEL}</span>');
    expect(read('lib/jelajah/concept/gate.ts')).toContain("CONCEPT_REPLAY_LABEL = 'Tonton pengenalan'");
    expect(read('lib/jelajah/concept/script.ts')).toContain('export { CONCEPT_REPLAY_LABEL };');
  });

  it('while the film plays, the 3D map chunk is prefetched (the 2d tier never fetches it)', () => {
    expect(hub).toMatch(/if \(stage === 'concept' && tier && tier !== '2d'\) void import\('\.\/Map3D'\)/);
  });

  it('the bumper\'s "Main Congklak" ends the intro without starting the concept video', () => {
    const bumper = read('components/jelajah/bumper/JelajahBumper.tsx');
    // Phase 23: one button per game, the same exit for each.
    expect(bumper).toMatch(/onPlay=\{\(game\) => \{\s*onLeave\?\.\(\);\s*skip\(\);/);
    expect(hub).toContain('onLeave={leaveIntro}');
  });
});
