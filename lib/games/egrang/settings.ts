/**
 * Local settings of the egrang page (Phase 23): the last variant and difficulty in
 * `localStorage['games.egrang.settings.v1']`, and which variants' tutorials were seen in
 * `localStorage['games.egrang.tutorialSeen.v1']` (comma-separated variants). Nothing else about a game is
 * stored, and nothing is ever sent anywhere (games record nothing, owner decision Phase 17). Every storage
 * access is in try/catch.
 */
import type { AiLevel, Variant } from './types';

export const SETTINGS_KEY = 'games.egrang.settings.v1';
export const TUTORIAL_KEY = 'games.egrang.tutorialSeen.v1';

export interface EgrangSettings {
  variant: Variant;
  level: AiLevel;
}

export const DEFAULT_SETTINGS: EgrangSettings = { variant: 'bambu', level: 'sedang' };

const VARIANTS: readonly Variant[] = ['bambu', 'batok'];
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

/** `?varian=bambu|batok` (preselects the variant on the start screen); anything else = null. */
export function parseVariantParam(value: string | null | undefined): Variant | null {
  return value === 'bambu' || value === 'batok' ? value : null;
}

export function parseSettings(raw: string | null): EgrangSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!data || typeof data !== 'object') return { ...DEFAULT_SETTINGS };
  const d = data as Record<string, unknown>;
  return {
    variant: oneOf(d.variant, VARIANTS, DEFAULT_SETTINGS.variant),
    level: oneOf(d.level, LEVELS, DEFAULT_SETTINGS.level),
  };
}

export function loadSettings(storage: StorageLike | null = browserLocalStorage()): EgrangSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    return parseSettings(storage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: EgrangSettings, storage: StorageLike | null = browserLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ variant: settings.variant, level: settings.level }));
  } catch {
    // storage full or blocked: the settings simply are not remembered
  }
}

/** Variants whose tutorial was seen in this page's memory (used when storage fails). */
const seenInMemory = new Set<Variant>();

function readSeen(storage: StorageLike | null): Set<Variant> {
  const seen = new Set<Variant>(seenInMemory);
  if (!storage) return seen;
  try {
    const raw = storage.getItem(TUTORIAL_KEY) ?? '';
    for (const part of raw.split(',')) {
      const v = parseVariantParam(part.trim());
      if (v) seen.add(v);
    }
  } catch {
    // blocked: memory only
  }
  return seen;
}

export function tutorialSeen(variant: Variant, storage: StorageLike | null = browserLocalStorage()): boolean {
  return readSeen(storage).has(variant);
}

export function markTutorialSeen(variant: Variant, storage: StorageLike | null = browserLocalStorage()): void {
  seenInMemory.add(variant);
  if (!storage) return;
  try {
    const seen = readSeen(storage);
    seen.add(variant);
    storage.setItem(TUTORIAL_KEY, VARIANTS.filter((v) => seen.has(v)).join(','));
  } catch {
    // blocked: remembered for this page load only
  }
}

/** Tests only. */
export function resetTutorialMemoryForTests(): void {
  seenInMemory.clear();
}
