import { describe, expect, it } from 'vitest';
import { BUDGET, budgetViolations } from '@/lib/jelajah/budget';
import {
  AUTO_TIER_STORAGE_KEY,
  TIER_STORAGE_KEY,
  canvasSettings,
  decideTier,
  probeFps,
  readCachedAutoTier,
  readDeviceSignals,
  readTierChoice,
  writeTierChoice,
} from '@/lib/jelajah/device-tier';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('decideTier', () => {
  it.each([
    [{ webgl2: false, deviceMemory: 8, hardwareConcurrency: 8, probeFps: 60 }, '2d'],
    [{ webgl2: true, deviceMemory: 1 }, '2d'],
    [{ webgl2: true, probeFps: 15 }, '2d'],
    [{ webgl2: true, deviceMemory: 4, hardwareConcurrency: 8, probeFps: 60 }, 'lite'],
    [{ webgl2: true, deviceMemory: 8, hardwareConcurrency: 4, probeFps: 60 }, 'lite'],
    [{ webgl2: true, deviceMemory: 8, hardwareConcurrency: 8, probeFps: 40 }, 'lite'],
    [{ webgl2: true, deviceMemory: 8, hardwareConcurrency: 8, probeFps: 60 }, 'full'],
    // Browsers without deviceMemory (Firefox, Safari): missing signals are ignored.
    [{ webgl2: true, hardwareConcurrency: 10, probeFps: 120 }, 'full'],
    [{ webgl2: true }, 'full'],
  ] as const)('%o → %s', (signals, tier) => {
    expect(decideTier(signals)).toBe(tier);
  });
});

describe('canvasSettings', () => {
  it('lite caps the pixel ratio at 1.5 and turns antialiasing off', () => {
    expect(canvasSettings('lite')).toEqual({ dpr: [1, 1.5], antialias: false });
    expect(canvasSettings('full')).toEqual({ dpr: [1, 2], antialias: true });
  });
});

describe('stored choice', () => {
  it('reads, writes and clears the manual choice', () => {
    const storage = memoryStorage();
    expect(readTierChoice(storage)).toBeNull();
    writeTierChoice('2d', storage);
    expect(storage.data.get(TIER_STORAGE_KEY)).toBe('2d');
    expect(readTierChoice(storage)).toBe('2d');
    writeTierChoice('auto', storage);
    expect(readTierChoice(storage)).toBeNull();
  });

  it('ignores unknown stored values', () => {
    expect(readTierChoice(memoryStorage({ [TIER_STORAGE_KEY]: 'ultra' }))).toBeNull();
    expect(readCachedAutoTier(memoryStorage({ [AUTO_TIER_STORAGE_KEY]: '3d' }))).toBeNull();
    expect(readCachedAutoTier(memoryStorage({ [AUTO_TIER_STORAGE_KEY]: 'lite' }))).toBe('lite');
  });

  it('never throws when storage is blocked', () => {
    expect(readTierChoice(throwingStorage)).toBeNull();
    expect(readCachedAutoTier(throwingStorage)).toBeNull();
    expect(() => writeTierChoice('lite', throwingStorage)).not.toThrow();
    expect(() => writeTierChoice('auto', throwingStorage)).not.toThrow();
    expect(readTierChoice(null)).toBeNull();
  });
});

describe('readDeviceSignals', () => {
  it('reads deviceMemory and hardwareConcurrency when exposed', () => {
    expect(readDeviceSignals({ deviceMemory: 4, hardwareConcurrency: 8 } as unknown as Navigator)).toEqual({
      deviceMemory: 4,
      hardwareConcurrency: 8,
    });
    expect(readDeviceSignals({ hardwareConcurrency: 0 } as unknown as Navigator)).toEqual({
      deviceMemory: undefined,
      hardwareConcurrency: undefined,
    });
  });
});

describe('probeFps', () => {
  it('measures frames per second from requestAnimationFrame timestamps', async () => {
    let t = 0;
    const raf = (cb: FrameRequestCallback) => {
      t += 1000 / 40; // a 40 fps device
      queueMicrotask(() => cb(t));
      return 0;
    };
    const fps = await probeFps(500, raf, () => t);
    expect(fps).toBeGreaterThan(38);
    expect(fps).toBeLessThan(42);
  });
});

describe('budget', () => {
  it('has the agreed limits', () => {
    expect(BUDGET).toEqual({
      minFps: 30,
      initialDownloadBytes: 5 * 1024 * 1024,
      maxDrawCalls: 100,
      maxTriangles: 100_000,
    });
  });

  it('lists every exceeded budget', () => {
    expect(budgetViolations({ fps: 60, drawCalls: 3, triangles: 40_000 })).toEqual([]);
    expect(budgetViolations({ fps: 20, drawCalls: 101, triangles: 100_001 })).toEqual([
      'fps 20 < 30',
      'draw calls 101 > 100',
      'triangles 100001 > 100000',
    ]);
  });
});
