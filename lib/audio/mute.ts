/**
 * The visitor's sound choice (Phase 21), shared by the concept film and the intro bumper:
 * `localStorage['np_sound_muted_v1']` = '1' (muted) or '0' (sound on); nothing stored = sound on.
 * Every access is in try/catch; when storage fails, the choice lives in memory for this page load.
 */
export const SOUND_MUTED_KEY = 'np_sound_muted_v1';

let memory: boolean | null = null;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readSoundMuted(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    const value = storage?.getItem(SOUND_MUTED_KEY);
    if (value === '1') return true;
    if (value === '0') return false;
  } catch {
    // fall through to the in-memory choice
  }
  return memory ?? false;
}

export function writeSoundMuted(muted: boolean, storage: StorageLike | null = defaultStorage()): void {
  memory = muted;
  try {
    storage?.setItem(SOUND_MUTED_KEY, muted ? '1' : '0');
  } catch {
    // private mode or blocked storage: the in-memory choice still applies on this page
  }
}

/** Tests only: forget the in-memory choice. */
export function resetSoundMutedMemory(): void {
  memory = null;
}
