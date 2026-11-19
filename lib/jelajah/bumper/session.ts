/**
 * How often the Jelajah intro bumper plays by itself.
 *
 * Phase 17 (owner decision): once per DAY per browser. The local date of the last play (`YYYY-MM-DD`) is kept
 * in `localStorage['jelajah.bumperLastPlayed.v1']`; the bumper plays again on the first visit of /jelajah
 * on a later date.
 *
 * Fallback (the Phase 16 rule): when localStorage is unavailable (missing, its getter throws, or reading or
 * writing it throws), the bumper plays once per browser session (tab), remembered in
 * `sessionStorage['jelajah.bumperSeen.v1']`. When that is unavailable too, an in-memory flag still limits it
 * to once per page load. Every storage access is in try/catch.
 *
 * Unchanged: "Putar intro" replays it any time, and opening a province page marks it as played, so a deep
 * link never leads to the bumper on "Kembali ke peta".
 */

export const BUMPER_LAST_PLAYED_KEY = 'jelajah.bumperLastPlayed.v1';
/** Fallback key (Phase 16 rule), used only when localStorage is unavailable. */
export const BUMPER_SEEN_KEY = 'jelajah.bumperSeen.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface BumperStores {
  local: StorageLike | null;
  session: StorageLike | null;
}

let seenInMemory = false;

function storage(kind: 'localStorage' | 'sessionStorage'): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}

/** `window.sessionStorage`, or null when it is missing or its getter throws. */
export function browserSessionStorage(): StorageLike | null {
  return storage('sessionStorage');
}

/** `window.localStorage`, or null when it is missing or its getter throws. */
export function browserLocalStorage(): StorageLike | null {
  return storage('localStorage');
}

export function browserStores(): BumperStores {
  return { local: browserLocalStorage(), session: browserSessionStorage() };
}

/** Local calendar date `YYYY-MM-DD` (the visitor's time zone). */
export function localDateKey(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** The stored date, '' when nothing is stored, or null when localStorage cannot be read. */
function readLastPlayed(local: StorageLike | null): string | null {
  if (!local) return null;
  try {
    return local.getItem(BUMPER_LAST_PLAYED_KEY) ?? '';
  } catch {
    return null;
  }
}

function sessionSeen(session: StorageLike | null): boolean {
  if (!session) return false;
  try {
    return session.getItem(BUMPER_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasSeenBumper(stores: BumperStores = browserStores(), now: Date = new Date()): boolean {
  if (seenInMemory) return true;
  const last = readLastPlayed(stores.local);
  // localStorage readable: the daily rule. The session flag is only written when localStorage could not be
  // written, so it still counts (it can only make the bumper rarer, never more frequent).
  if (last !== null) return last === localDateKey(now) || sessionSeen(stores.session);
  return sessionSeen(stores.session);
}

export function markBumperSeen(stores: BumperStores = browserStores(), now: Date = new Date()): void {
  seenInMemory = true;
  if (stores.local) {
    try {
      stores.local.setItem(BUMPER_LAST_PLAYED_KEY, localDateKey(now));
      return;
    } catch {
      // blocked or full: fall back to the once-per-session rule
    }
  }
  if (!stores.session) return;
  try {
    stores.session.setItem(BUMPER_SEEN_KEY, '1');
  } catch {
    // the in-memory flag still covers this page load
  }
}

/** Should the hub play the bumper by itself? (Replays from "Putar intro" ignore this.) */
export function shouldAutoPlayBumper(stores: BumperStores = browserStores(), now: Date = new Date()): boolean {
  return !hasSeenBumper(stores, now);
}

/** Tests only: forget the in-memory flag. */
export function resetBumperMemoryForTests(): void {
  seenInMemory = false;
}
