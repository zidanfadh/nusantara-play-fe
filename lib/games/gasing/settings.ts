/**
 * Local settings of the gasing page (Phase 20): the last mode and difficulty in
 * `localStorage['games.gasing.settings.v1']`, and whether the tutorial was seen in
 * `localStorage['games.gasing.tutorialSeen.v1']`. Nothing else about a game is stored, and nothing is ever
 * sent anywhere (games record nothing, owner decision Phase 17). Every storage access is in try/catch.
 */
import type { AiLevel, GameMode } from './types';

export const SETTINGS_KEY = 'games.gasing.settings.v1';
export const TUTORIAL_KEY = 'games.gasing.tutorialSeen.v1';

export interface GasingSettings {
  mode: GameMode;
  level: AiLevel;
}

export const DEFAULT_SETTINGS: GasingSettings = { mode: 'uri', level: 'sedang' };

const MODES: readonly GameMode[] = ['uri', 'pangkah'];
const LEVELS: readonly AiLevel[] = ['mudah', 'sedang', 'sulit'];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function browserLocalStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseSettings(raw: string | null): GasingSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!data || typeof data !== 'object') return { ...DEFAULT_SETTINGS };
  const d = data as Record<string, unknown>;
  return { mode: oneOf(d.mode, MODES, DEFAULT_SETTINGS.mode), level: oneOf(d.level, LEVELS, DEFAULT_SETTINGS.level) };
}

export function loadSettings(storage: StorageLike | null = browserLocalStorage()): GasingSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    return parseSettings(storage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GasingSettings, storage: StorageLike | null = browserLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ mode: settings.mode, level: settings.level }));
  } catch {
    // storage full or blocked: the settings simply are not remembered
  }
}

/** True when the tutorial was seen (or cannot be remembered and was seen in this page's memory). */
let seenInMemory = false;

export function tutorialSeen(storage: StorageLike | null = browserLocalStorage()): boolean {
  if (seenInMemory) return true;
  if (!storage) return false;
  try {
    return storage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(storage: StorageLike | null = browserLocalStorage()): void {
  seenInMemory = true;
  if (!storage) return;
  try {
    storage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // blocked: remembered for this page load only
  }
}

/** Tests only. */
export function resetTutorialMemoryForTests(): void {
  seenInMemory = false;
}
