/**
 * Local settings of the congklak page (Phase 17): the last mode, the difficulty and the animation speed,
 * in `localStorage['games.congklak.settings.v1']`. Nothing else about a game is stored, and nothing is ever
 * sent to the backend (owner decision). Every storage access is in try/catch; anything unexpected in the
 * stored value falls back to the defaults field by field.
 */
import type { AiLevel } from './ai';

export const SETTINGS_KEY = 'games.congklak.settings.v1';

export type GameMode = 'komputer' | 'dua-pemain';
export type AnimationSpeed = 'normal' | 'cepat' | 'tanpa';

export interface CongklakSettings {
  mode: GameMode;
  level: AiLevel;
  speed: AnimationSpeed;
}

export const DEFAULT_SETTINGS: CongklakSettings = { mode: 'komputer', level: 'sedang', speed: 'normal' };

const MODES: readonly GameMode[] = ['komputer', 'dua-pemain'];
const LEVELS: readonly AiLevel[] = ['mudah', 'sedang', 'sulit'];
const SPEEDS: readonly AnimationSpeed[] = ['normal', 'cepat', 'tanpa'];

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

export function parseSettings(raw: string | null): CongklakSettings {
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
    mode: oneOf(d.mode, MODES, DEFAULT_SETTINGS.mode),
    level: oneOf(d.level, LEVELS, DEFAULT_SETTINGS.level),
    speed: oneOf(d.speed, SPEEDS, DEFAULT_SETTINGS.speed),
  };
}

export function loadSettings(storage: StorageLike | null = browserLocalStorage()): CongklakSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    return parseSettings(storage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: CongklakSettings, storage: StorageLike | null = browserLocalStorage()): void {
  if (!storage) return;
  try {
    const { mode, level, speed } = settings;
    storage.setItem(SETTINGS_KEY, JSON.stringify({ mode, level, speed }));
  } catch {
    // storage full or blocked: the settings simply are not remembered
  }
}
