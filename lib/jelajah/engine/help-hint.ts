/**
 * The controls hint of the province scene is shown once per browser (Phase 11). Every storage access is
 * wrapped in try/catch (private windows, blocked storage); without storage the hint simply shows again.
 */
export const HELP_HINT_STORAGE_KEY = 'jelajah.sceneHelpSeen.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenHelp(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(HELP_HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHelpSeen(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(HELP_HINT_STORAGE_KEY, '1');
  } catch {
    // storage unavailable: the hint shows again next time
  }
}
