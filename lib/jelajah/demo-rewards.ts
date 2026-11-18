/**
 * SIMULATED rewards of Jelajah Nusantara (Phase 12). Frontend only, labelled "Simulasi, tidak disimpan" in
 * the UI, NEVER sent to the backend (this module imports no API code and never calls fetch; a test
 * guards that), kept only for the current browser tab (sessionStorage, every access in try/catch).
 *
 * The real rewards come later from the backend, which validates every action and decides every reward
 * (CLAUDE.md "Current direction" item 3). Nothing here is a source of truth.
 *
 * Pure rules (unit-tested in tests/jelajah/demo-rewards.test.ts) plus a tiny store without React, so the
 * hub and the province scene share one state.
 */

/** Demo rules in one place, easy to change. */
export const DEMO_REWARD_RULES = {
  /** First entry into a province scene in this tab. */
  enterProvinceXp: 25,
  /** Opening the panel of a stand with a PROT, once per PROT. */
  openProtXp: 10,
  /** The province's Paspor stamp. */
  stampXp: 50,
  /** Different PROT panels needed for the stamp (fewer when the province has fewer PROT, at least 1). */
  stampProtTarget: 3,
  /** Level n needs levelBaseXp × n × (n + 1) total XP (placeholder curve of the backend plan). */
  levelBaseXp: 50,
} as const;

export const DEMO_REWARDS_STORAGE_KEY = 'jelajah.demoRewards.v1';
export const DEMO_REWARDS_VERSION = 1;

export interface DemoRewardsState {
  version: typeof DEMO_REWARDS_VERSION;
  xp: number;
  /** Province codes entered in this tab. */
  entered: string[];
  /** Province code → ids of the PROT whose panel was opened. */
  opened: Record<string, string[]>;
  /** Province codes with a Paspor stamp. */
  stamps: string[];
}

export const EMPTY_DEMO_REWARDS: DemoRewardsState = Object.freeze({
  version: DEMO_REWARDS_VERSION,
  xp: 0,
  entered: [],
  opened: {},
  stamps: [],
}) as DemoRewardsState;

export type RewardEvent =
  | { kind: 'enter'; xp: number; provinsiKode: string }
  | { kind: 'open-prot'; xp: number; provinsiKode: string; protId: string }
  | { kind: 'stamp'; xp: number; provinsiKode: string };

export interface RewardResult {
  state: DemoRewardsState;
  events: RewardEvent[];
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
}

// ---------------------------------------------------------------------------------------------------
// Levels

/** Total XP needed for level n (level 0 = 0 XP). */
export function xpForLevel(n: number): number {
  const level = Math.max(0, Math.floor(n));
  return DEMO_REWARD_RULES.levelBaseXp * level * (level + 1);
}

/** Highest level whose total XP requirement is met. */
export function levelForXp(xp: number): number {
  const total = Math.max(0, Number.isFinite(xp) ? xp : 0);
  // Solve 50 n (n + 1) <= xp, then correct for floating point at the boundaries.
  let n = Math.floor((-1 + Math.sqrt(1 + (4 * total) / DEMO_REWARD_RULES.levelBaseXp)) / 2);
  while (xpForLevel(n + 1) <= total) n += 1;
  while (n > 0 && xpForLevel(n) > total) n -= 1;
  return n;
}

export interface LevelProgress {
  level: number;
  xp: number;
  /** Total XP at which the current level started and the next one starts. */
  levelStartXp: number;
  nextLevelXp: number;
  /** 0..1 progress towards the next level. */
  fraction: number;
}

export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const level = levelForXp(total);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return { level, xp: total, levelStartXp, nextLevelXp, fraction: (total - levelStartXp) / (nextLevelXp - levelStartXp) };
}

// ---------------------------------------------------------------------------------------------------
// Rules

/** PROT panels needed for a province's stamp: 3, or all of them with fewer than 3, but at least 1. */
export function stampTarget(provinceProtCount: number): number {
  const count = Math.max(0, Math.floor(provinceProtCount) || 0);
  return Math.max(1, Math.min(DEMO_REWARD_RULES.stampProtTarget, count));
}

function result(before: DemoRewardsState, state: DemoRewardsState, events: RewardEvent[]): RewardResult {
  const xpGained = events.reduce((sum, e) => sum + e.xp, 0);
  return { state, events, xpGained, levelBefore: levelForXp(before.xp), levelAfter: levelForXp(state.xp) };
}

/** +25 XP the first time a province scene is entered in this tab; nothing afterwards. */
export function enterProvince(state: DemoRewardsState, provinsiKode: string): RewardResult {
  if (!provinsiKode || state.entered.includes(provinsiKode)) return result(state, state, []);
  const xp = DEMO_REWARD_RULES.enterProvinceXp;
  const next: DemoRewardsState = { ...state, xp: state.xp + xp, entered: [...state.entered, provinsiKode] };
  return result(state, next, [{ kind: 'enter', xp, provinsiKode }]);
}

/**
 * +10 XP the first time the panel of a PROT is opened; the province's stamp (+50 XP) as soon as enough
 * different PROT of that province were opened (see stampTarget).
 */
export function openProt(
  state: DemoRewardsState,
  provinsiKode: string,
  protId: string,
  provinceProtCount: number,
): RewardResult {
  if (!provinsiKode || !protId) return result(state, state, []);
  const opened = state.opened[provinsiKode] ?? [];
  if (opened.includes(protId)) return result(state, state, []);
  const events: RewardEvent[] = [];
  const nowOpened = [...opened, protId];
  let next: DemoRewardsState = {
    ...state,
    xp: state.xp + DEMO_REWARD_RULES.openProtXp,
    opened: { ...state.opened, [provinsiKode]: nowOpened },
  };
  events.push({ kind: 'open-prot', xp: DEMO_REWARD_RULES.openProtXp, provinsiKode, protId });
  // A PROT was just opened, so the province has at least that many (guards a stale or missing count).
  const target = stampTarget(Math.max(provinceProtCount, nowOpened.length));
  if (!next.stamps.includes(provinsiKode) && nowOpened.length >= target) {
    next = { ...next, xp: next.xp + DEMO_REWARD_RULES.stampXp, stamps: [...next.stamps, provinsiKode] };
    events.push({ kind: 'stamp', xp: DEMO_REWARD_RULES.stampXp, provinsiKode });
  }
  return result(state, next, events);
}

export interface QuestProgress {
  opened: number;
  target: number;
  done: boolean;
  /** The province has no public PROT yet: the quest cannot be done now. */
  unavailable: boolean;
}

/** Progress of a province's demo quest ("Buka 3 stan PROT di <provinsi>"). */
export function questProgress(state: DemoRewardsState, provinsiKode: string, provinceProtCount: number): QuestProgress {
  const target = stampTarget(provinceProtCount);
  const opened = (state.opened[provinsiKode] ?? []).length;
  const done = state.stamps.includes(provinsiKode);
  return { opened: Math.min(opened, target), target, done, unavailable: !done && provinceProtCount <= 0 };
}

// ---------------------------------------------------------------------------------------------------
// Persistence (sessionStorage = this tab only)

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

/** Validates parsed JSON; anything unexpected (other version, wrong shape) gives null. */
export function parseDemoRewards(raw: string | null): DemoRewardsState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== DEMO_REWARDS_VERSION) return null;
  if (typeof d.xp !== 'number' || !Number.isFinite(d.xp) || d.xp < 0) return null;
  if (!isStringArray(d.entered) || !isStringArray(d.stamps)) return null;
  if (!d.opened || typeof d.opened !== 'object' || Array.isArray(d.opened)) return null;
  const opened: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(d.opened as Record<string, unknown>)) {
    if (!isStringArray(v)) return null;
    opened[k] = v;
  }
  return { version: DEMO_REWARDS_VERSION, xp: d.xp, entered: d.entered, opened, stamps: d.stamps };
}

export function loadDemoRewards(storage: StorageLike | null = sessionStore()): DemoRewardsState {
  try {
    return parseDemoRewards(storage?.getItem(DEMO_REWARDS_STORAGE_KEY) ?? null) ?? EMPTY_DEMO_REWARDS;
  } catch {
    return EMPTY_DEMO_REWARDS;
  }
}

export function saveDemoRewards(state: DemoRewardsState, storage: StorageLike | null = sessionStore()): void {
  try {
    storage?.setItem(DEMO_REWARDS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: the simulation keeps running in memory for this page
  }
}

export function clearDemoRewards(storage: StorageLike | null = sessionStore()): void {
  try {
    storage?.removeItem(DEMO_REWARDS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------------------------------
// Store (no React; components read it with useSyncExternalStore)

export interface DemoRewardsStore {
  getSnapshot(): DemoRewardsState;
  subscribe(listener: () => void): () => void;
  /** Applies a rule, saves and notifies when something changed. */
  apply(rule: (state: DemoRewardsState) => RewardResult): RewardResult;
  /** Back to an empty simulation (also clears the tab's storage). */
  reset(): void;
}

export function createDemoRewardsStore(storage: () => StorageLike | null = sessionStore): DemoRewardsStore {
  let current: DemoRewardsState | null = null;
  const listeners = new Set<() => void>();
  const get = () => {
    if (current === null) current = loadDemoRewards(storage());
    return current;
  };
  const notify = () => {
    for (const l of listeners) l();
  };
  return {
    getSnapshot: get,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply(rule) {
      const res = rule(get());
      if (res.events.length > 0) {
        current = res.state;
        saveDemoRewards(current, storage());
        notify();
      }
      return res;
    },
    reset() {
      current = EMPTY_DEMO_REWARDS;
      clearDemoRewards(storage());
      notify();
    },
  };
}

/** The one store of this browser tab. */
export const demoRewardsStore = createDemoRewardsStore();
