/**
 * Once-per-session rule of the Jelajah intro bumper (Phase 16): it plays automatically on the first visit
 * of /jelajah in a browser session (tab), remembered in `sessionStorage['jelajah.bumperSeen.v1']`.
 *
 * Every storage access is in try/catch. When storage is unavailable (blocked site data, some private
 * modes), an in-memory flag takes over, so the bumper still plays only once per page load instead of on
 * every client-side visit of the hub.
 */

export const BUMPER_SEEN_KEY = 'jelajah.bumperSeen.v1';

type SessionLike = Pick<Storage, 'getItem' | 'setItem'>;

let seenInMemory = false;

/** `window.sessionStorage`, or null when it is missing or its getter throws. */
export function browserSessionStorage(): SessionLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function hasSeenBumper(storage: SessionLike | null = browserSessionStorage()): boolean {
  if (seenInMemory) return true;
  if (!storage) return false;
  try {
    return storage.getItem(BUMPER_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markBumperSeen(storage: SessionLike | null = browserSessionStorage()): void {
  seenInMemory = true;
  if (!storage) return;
  try {
    storage.setItem(BUMPER_SEEN_KEY, '1');
  } catch {
    // storage full or blocked: the in-memory flag still covers this page load
  }
}

/** Should the hub play the bumper by itself? (Replays from "Putar intro" ignore this.) */
export function shouldAutoPlayBumper(storage: SessionLike | null = browserSessionStorage()): boolean {
  return !hasSeenBumper(storage);
}

/** Tests only: forget the in-memory flag. */
export function resetBumperMemoryForTests(): void {
  seenInMemory = false;
}
