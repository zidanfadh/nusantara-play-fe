import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUMPER_SEEN_KEY,
  browserSessionStorage,
  hasSeenBumper,
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

describe('bumper once-per-session rule (Phase 16)', () => {
  beforeEach(() => resetBumperMemoryForTests());

  it('plays on the first visit, not after it was marked', () => {
    const s = memoryStorage();
    expect(shouldAutoPlayBumper(s)).toBe(true);
    markBumperSeen(s);
    expect(s.map.get(BUMPER_SEEN_KEY)).toBe('1');
    expect(shouldAutoPlayBumper(s)).toBe(false);
  });

  it('a new session (empty storage, new page load) plays again', () => {
    const s = memoryStorage();
    markBumperSeen(s);
    resetBumperMemoryForTests();
    expect(shouldAutoPlayBumper(memoryStorage())).toBe(true);
  });

  it('only the exact value counts as seen', () => {
    const s = memoryStorage();
    s.setItem(BUMPER_SEEN_KEY, 'yes');
    expect(hasSeenBumper(s)).toBe(false);
  });

  it('storage that throws: plays once, then the in-memory flag stops repeats', () => {
    expect(shouldAutoPlayBumper(throwing)).toBe(true);
    expect(() => markBumperSeen(throwing)).not.toThrow();
    expect(shouldAutoPlayBumper(throwing)).toBe(false);
  });

  it('no storage at all (server, blocked getter): same in-memory behaviour', () => {
    expect(browserSessionStorage()).toBeNull(); // node: no window
    expect(shouldAutoPlayBumper(null)).toBe(true);
    markBumperSeen(null);
    expect(shouldAutoPlayBumper(null)).toBe(false);
  });

  it('a window whose sessionStorage getter throws gives null', () => {
    const g = globalThis as { window?: unknown };
    g.window = Object.defineProperty({}, 'sessionStorage', {
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(browserSessionStorage()).toBeNull();
      expect(shouldAutoPlayBumper()).toBe(true);
    } finally {
      delete g.window;
    }
  });
});
