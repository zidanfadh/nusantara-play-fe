import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  createDemoRewardsStore,
  DEMO_REWARD_RULES,
  DEMO_REWARDS_STORAGE_KEY,
  EMPTY_DEMO_REWARDS,
  enterProvince,
  levelForXp,
  levelProgress,
  loadDemoRewards,
  openProt,
  parseDemoRewards,
  questProgress,
  saveDemoRewards,
  stampTarget,
  xpForLevel,
  type DemoRewardsState,
  type StorageLike,
} from '@/lib/jelajah/demo-rewards';

const SUMSEL = '16';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('levels start at 1 (50 × (L − 1) × L total XP)', () => {
  it('xpForLevel follows the level-1 curve', () => {
    expect([1, 2, 3, 4, 10].map(xpForLevel)).toEqual([0, 100, 300, 600, 4500]);
    expect(xpForLevel(0)).toBe(0); // below the first level counts as level 1
  });

  it('levelForXp is exact at the boundaries and never below 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(4499)).toBe(9);
    expect(levelForXp(4500)).toBe(10);
    expect(levelForXp(-5)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
  });

  it('levelForXp agrees with xpForLevel for every XP value up to level 30', () => {
    for (let xp = 0; xp <= xpForLevel(30); xp += 7) {
      const l = levelForXp(xp);
      expect(xpForLevel(l)).toBeLessThanOrEqual(xp);
      expect(xpForLevel(l + 1)).toBeGreaterThan(xp);
    }
  });

  it('levelProgress gives the fraction towards the next level (the HUD shows Lv 1 at 0 XP)', () => {
    expect(levelProgress(0)).toMatchObject({ level: 1, levelStartXp: 0, nextLevelXp: 100, fraction: 0 });
    expect(levelProgress(25)).toMatchObject({ level: 1, levelStartXp: 0, nextLevelXp: 100, fraction: 0.25 });
    expect(levelProgress(200)).toMatchObject({ level: 2, levelStartXp: 100, nextLevelXp: 300, fraction: 0.5 });
  });
});

describe('demo rules', () => {
  it('entering a province: +25 XP once per tab', () => {
    const first = enterProvince(EMPTY_DEMO_REWARDS, SUMSEL);
    expect(first.xpGained).toBe(DEMO_REWARD_RULES.enterProvinceXp);
    expect(first.state.entered).toEqual([SUMSEL]);
    const again = enterProvince(first.state, SUMSEL);
    expect(again.xpGained).toBe(0);
    expect(again.events).toEqual([]);
    expect(again.state).toBe(first.state);
  });

  it('opening a PROT panel: +10 XP once per PROT', () => {
    const a = openProt(EMPTY_DEMO_REWARDS, SUMSEL, 'p1', 4);
    expect(a.xpGained).toBe(10);
    expect(openProt(a.state, SUMSEL, 'p1', 4).xpGained).toBe(0);
    expect(openProt(a.state, SUMSEL, 'p2', 4).xpGained).toBe(10);
  });

  it('3 different PROT of a province: the stamp and +50 XP, only once', () => {
    let s: DemoRewardsState = EMPTY_DEMO_REWARDS;
    s = openProt(s, SUMSEL, 'p1', 4).state;
    s = openProt(s, SUMSEL, 'p2', 4).state;
    expect(s.stamps).toEqual([]);
    const third = openProt(s, SUMSEL, 'p3', 4);
    expect(third.events.map((e) => e.kind)).toEqual(['open-prot', 'stamp']);
    expect(third.xpGained).toBe(10 + 50);
    expect(third.state.stamps).toEqual([SUMSEL]);
    const fourth = openProt(third.state, SUMSEL, 'p4', 4);
    expect(fourth.events.map((e) => e.kind)).toEqual(['open-prot']);
  });

  it('a province with fewer than 3 PROT needs all of them, but at least 1', () => {
    expect([0, 1, 2, 3, 9].map(stampTarget)).toEqual([1, 1, 2, 3, 3]);
    const one = openProt(EMPTY_DEMO_REWARDS, '51', 'only', 1);
    expect(one.state.stamps).toEqual(['51']);
    const twoA = openProt(EMPTY_DEMO_REWARDS, '52', 'a', 2);
    expect(twoA.state.stamps).toEqual([]);
    expect(openProt(twoA.state, '52', 'b', 2).state.stamps).toEqual(['52']);
  });

  it('PROT are counted per province', () => {
    let s: DemoRewardsState = EMPTY_DEMO_REWARDS;
    s = openProt(s, SUMSEL, 'p1', 5).state;
    s = openProt(s, '51', 'p2', 5).state;
    s = openProt(s, '52', 'p3', 5).state;
    expect(s.stamps).toEqual([]);
  });

  it('the full DEMO walk (105 XP: enter + 3 stands) levels up exactly once, from 1 to 2', () => {
    const entered = enterProvince(EMPTY_DEMO_REWARDS, SUMSEL);
    expect([entered.levelBefore, entered.levelAfter]).toEqual([1, 1]);
    let s = entered.state;
    const levelUps: Array<[number, number]> = [];
    for (const id of ['p1', 'p2', 'p3']) {
      const r = openProt(s, SUMSEL, id, 4);
      if (r.levelAfter > r.levelBefore) levelUps.push([r.levelBefore, r.levelAfter]);
      s = r.state;
    }
    expect(s.xp).toBe(105);
    expect(levelForXp(s.xp)).toBe(2);
    expect(levelUps).toEqual([[1, 2]]);
  });

  it('production today (0 PROT): only the +25 for entering is possible', () => {
    const s = enterProvince(EMPTY_DEMO_REWARDS, SUMSEL).state;
    expect(s.xp).toBe(25);
    expect(questProgress(s, SUMSEL, 0)).toEqual({ opened: 0, target: 1, done: false, unavailable: true });
  });

  it('quest progress follows the opened PROT and the stamp', () => {
    let s: DemoRewardsState = EMPTY_DEMO_REWARDS;
    expect(questProgress(s, SUMSEL, 4)).toEqual({ opened: 0, target: 3, done: false, unavailable: false });
    s = openProt(s, SUMSEL, 'p1', 4).state;
    expect(questProgress(s, SUMSEL, 4).opened).toBe(1);
    s = openProt(openProt(s, SUMSEL, 'p2', 4).state, SUMSEL, 'p3', 4).state;
    expect(questProgress(s, SUMSEL, 4)).toEqual({ opened: 3, target: 3, done: true, unavailable: false });
  });

  it('rules never mutate the previous state', () => {
    const before = enterProvince(EMPTY_DEMO_REWARDS, SUMSEL).state;
    const snapshot = JSON.stringify(before);
    openProt(before, SUMSEL, 'p1', 1);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(EMPTY_DEMO_REWARDS).toEqual({ version: 2, xp: 0, entered: [], opened: {}, stamps: [] });
  });
});

describe('persistence (sessionStorage, versioned key, try/catch)', () => {
  it('uses a versioned key, bumped to v2 for the level-1 curve', () => {
    expect(DEMO_REWARDS_STORAGE_KEY).toBe('jelajah.demoRewards.v2');
  });

  it('ignores the Phase 12 (v1) simulation state', () => {
    const storage = memoryStorage();
    storage.setItem('jelajah.demoRewards.v1', JSON.stringify({ version: 1, xp: 105, entered: ['16'], opened: {}, stamps: ['16'] }));
    expect(loadDemoRewards(storage)).toEqual(EMPTY_DEMO_REWARDS);
    // Even v1 content under the new key is rejected (version check).
    storage.setItem(DEMO_REWARDS_STORAGE_KEY, JSON.stringify({ version: 1, xp: 105, entered: [], opened: {}, stamps: [] }));
    expect(loadDemoRewards(storage)).toEqual(EMPTY_DEMO_REWARDS);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const state = openProt(enterProvince(EMPTY_DEMO_REWARDS, SUMSEL).state, SUMSEL, 'p1', 4).state;
    saveDemoRewards(state, storage);
    expect(storage.data.has(DEMO_REWARDS_STORAGE_KEY)).toBe(true);
    expect(loadDemoRewards(storage)).toEqual(state);
  });

  it('broken, foreign or old data gives an empty simulation', () => {
    for (const raw of [
      'not json',
      'null',
      '[]',
      JSON.stringify({ version: 1, xp: 10, entered: [], opened: {}, stamps: [] }),
      JSON.stringify({ version: 3, xp: 10, entered: [], opened: {}, stamps: [] }),
      JSON.stringify({ version: 2, xp: -1, entered: [], opened: {}, stamps: [] }),
      JSON.stringify({ version: 2, xp: 10, entered: [1], opened: {}, stamps: [] }),
      JSON.stringify({ version: 2, xp: 10, entered: [], opened: { 16: 'x' }, stamps: [] }),
    ]) {
      expect(parseDemoRewards(raw)).toBeNull();
      const storage = memoryStorage();
      storage.setItem(DEMO_REWARDS_STORAGE_KEY, raw);
      expect(loadDemoRewards(storage)).toEqual(EMPTY_DEMO_REWARDS);
    }
  });

  it('blocked storage never throws', () => {
    expect(loadDemoRewards(throwing)).toEqual(EMPTY_DEMO_REWARDS);
    expect(() => saveDemoRewards(EMPTY_DEMO_REWARDS, throwing)).not.toThrow();
    expect(loadDemoRewards(null)).toEqual(EMPTY_DEMO_REWARDS);
    const store = createDemoRewardsStore(() => throwing);
    expect(store.apply((s) => enterProvince(s, SUMSEL)).xpGained).toBe(25);
    expect(store.getSnapshot().xp).toBe(25); // keeps running in memory
    expect(() => store.reset()).not.toThrow();
  });
});

describe('store', () => {
  it('loads lazily, saves on change, notifies, and resets', () => {
    const storage = memoryStorage();
    const store = createDemoRewardsStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getSnapshot()).toEqual(EMPTY_DEMO_REWARDS);
    store.apply((s) => enterProvince(s, SUMSEL));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(loadDemoRewards(storage).xp).toBe(25);
    store.apply((s) => enterProvince(s, SUMSEL)); // no change: no save, no notification
    expect(listener).toHaveBeenCalledTimes(1);
    // A reload of the tab = a new store on the same sessionStorage: the state stays.
    expect(createDemoRewardsStore(() => storage).getSnapshot().xp).toBe(25);
    // A new tab = an empty sessionStorage: the simulation starts empty.
    expect(createDemoRewardsStore(() => memoryStorage()).getSnapshot()).toEqual(EMPTY_DEMO_REWARDS);
    store.reset();
    expect(store.getSnapshot()).toEqual(EMPTY_DEMO_REWARDS);
    expect(storage.data.has(DEMO_REWARDS_STORAGE_KEY)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('getSnapshot returns the same object until something changes (useSyncExternalStore)', () => {
    const store = createDemoRewardsStore(() => memoryStorage());
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});

describe('simulation only: never talks to the backend', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const FILES = [
    'lib/jelajah/demo-rewards.ts',
    'lib/jelajah/use-demo-rewards.ts',
    'components/jelajah/RewardHud.tsx',
    'components/jelajah/PasporModal.tsx',
    'components/jelajah/MisiPanel.tsx',
  ];

  it.each(FILES)('%s imports no API code and calls no network API', (file) => {
    const src = readFileSync(join(root, file), 'utf8');
    const imports = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?/gm) ?? []).join('\n');
    expect(imports).not.toMatch(/lib\/api|apiClient|jelajah\/data|scene-prot|supabase/);
    expect(src).not.toMatch(/\bfetch\s*\(|apiClient|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
  });

  it('the rules module imports nothing at all (pure)', () => {
    const src = readFileSync(join(root, 'lib/jelajah/demo-rewards.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/from\s+['"]react['"]/);
  });
});
