import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUMPER_LAST_PLAYED_KEY,
  BUMPER_SEEN_KEY,
  browserLocalStorage,
  browserSessionStorage,
  browserStores,
  hasSeenBumper,
  localDateKey,
  markBumperSeen,
  resetBumperMemoryForTests,
  shouldAutoPlayBumper,
} from '@/lib/jelajah/bumper/session';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const throwing = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

// Local times (no "Z"): the rule uses the visitor's calendar date.
const MORNING = new Date(2026, 10, 19, 8, 0);
const LATE = new Date(2026, 10, 19, 23, 59);
const NEXT_DAY = new Date(2026, 10, 20, 0, 1);

describe('bumper once per day per browser (Phase 17)', () => {
  beforeEach(() => resetBumperMemoryForTests());

  it('stores the local date under a versioned key', () => {
    expect(BUMPER_LAST_PLAYED_KEY).toBe('jelajah.bumperLastPlayed.v1');
    expect(localDateKey(MORNING)).toBe('2026-11-19');
    expect(localDateKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
    const local = memoryStorage();
    markBumperSeen({ local, session: memoryStorage() }, MORNING);
    expect(local.map.get(BUMPER_LAST_PLAYED_KEY)).toBe('2026-11-19');
  });

  it('plays on the first visit, not again the same day (new tab, new page load)', () => {
    const local = memoryStorage();
    expect(shouldAutoPlayBumper({ local, session: memoryStorage() }, MORNING)).toBe(true);
    markBumperSeen({ local, session: memoryStorage() }, MORNING);
    resetBumperMemoryForTests(); // a new page load
    expect(shouldAutoPlayBumper({ local, session: memoryStorage() }, LATE)).toBe(false);
  });

  it('plays again on the next day', () => {
    const local = memoryStorage();
    markBumperSeen({ local, session: memoryStorage() }, LATE);
    resetBumperMemoryForTests();
    expect(shouldAutoPlayBumper({ local, session: memoryStorage() }, NEXT_DAY)).toBe(true);
    markBumperSeen({ local, session: memoryStorage() }, NEXT_DAY);
    expect(local.map.get(BUMPER_LAST_PLAYED_KEY)).toBe('2026-11-20');
  });

  it('within one page load the in-memory flag also stops repeats', () => {
    const local = memoryStorage();
    markBumperSeen({ local, session: null }, MORNING);
    expect(shouldAutoPlayBumper({ local, session: null }, NEXT_DAY)).toBe(false);
  });

  it('only a date string counts; anything else plays', () => {
    const local = memoryStorage();
    local.setItem(BUMPER_LAST_PLAYED_KEY, 'yes');
    expect(hasSeenBumper({ local, session: null }, MORNING)).toBe(false);
  });

  it('localStorage throwing: falls back to the once-per-session rule', () => {
    const session = memoryStorage();
    expect(shouldAutoPlayBumper({ local: throwing, session }, MORNING)).toBe(true);
    expect(() => markBumperSeen({ local: throwing, session }, MORNING)).not.toThrow();
    expect(session.map.get(BUMPER_SEEN_KEY)).toBe('1');
    resetBumperMemoryForTests(); // same tab, new page load: the session flag holds, even on another day
    expect(shouldAutoPlayBumper({ local: throwing, session }, NEXT_DAY)).toBe(false);
    resetBumperMemoryForTests(); // a new session
    expect(shouldAutoPlayBumper({ local: throwing, session: memoryStorage() }, MORNING)).toBe(true);
  });

  it('localStorage readable but not writable (full): the session flag is written instead', () => {
    const session = memoryStorage();
    const readOnly = { getItem: () => null, setItem: throwing.setItem };
    markBumperSeen({ local: readOnly, session }, MORNING);
    expect(session.map.get(BUMPER_SEEN_KEY)).toBe('1');
    resetBumperMemoryForTests();
    expect(shouldAutoPlayBumper({ local: readOnly, session }, MORNING)).toBe(false);
  });

  it('no localStorage at all (missing or blocked getter): the session rule', () => {
    const session = memoryStorage();
    markBumperSeen({ local: null, session }, MORNING);
    expect(session.map.get(BUMPER_SEEN_KEY)).toBe('1');
    resetBumperMemoryForTests();
    expect(shouldAutoPlayBumper({ local: null, session }, MORNING)).toBe(false);
  });

  it('every storage throwing: plays once, then the in-memory flag stops repeats', () => {
    const stores = { local: throwing, session: throwing };
    expect(shouldAutoPlayBumper(stores, MORNING)).toBe(true);
    expect(() => markBumperSeen(stores, MORNING)).not.toThrow();
    expect(shouldAutoPlayBumper(stores, MORNING)).toBe(false);
  });

  it('no window (server): no storage, same in-memory behaviour', () => {
    expect(browserLocalStorage()).toBeNull();
    expect(browserSessionStorage()).toBeNull();
    expect(shouldAutoPlayBumper()).toBe(true);
    markBumperSeen();
    expect(shouldAutoPlayBumper()).toBe(false);
  });

  it('a window whose storage getters throw gives null stores', () => {
    const g = globalThis as { window?: unknown };
    const blocked = {};
    for (const k of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(blocked, k, {
        get() {
          throw new Error('SecurityError');
        },
      });
    }
    g.window = blocked;
    try {
      expect(browserStores()).toEqual({ local: null, session: null });
      expect(shouldAutoPlayBumper()).toBe(true);
    } finally {
      delete g.window;
    }
  });
});
