/**
 * Picks the render tier for /jelajah:
 * - full: 3D, antialiasing, pixel ratio up to 2
 * - lite: 3D, no antialiasing, pixel ratio up to 1.5
 * - 2d:   SVG map, three.js is never loaded
 *
 * Automatic choice: WebGL2 support, navigator.deviceMemory and hardwareConcurrency (when the browser
 * exposes them) and a short frame-rate probe on the first visit (cached). The user can override it
 * in the settings menu; the override is remembered in localStorage. Storage access is always wrapped
 * in try/catch (private windows, blocked storage).
 */
export type Tier = 'full' | 'lite' | '2d';
export type TierChoice = Tier | 'auto';

export const TIERS: readonly Tier[] = ['full', 'lite', '2d'];
export const TIER_STORAGE_KEY = 'jelajah.tier';
export const AUTO_TIER_STORAGE_KEY = 'jelajah.autoTier.v1';

export interface DeviceSignals {
  webgl2: boolean;
  /** GB, rounded by the browser (Chrome: 0.25 … 8). Undefined when not exposed. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  /** Frames per second measured by probeFps(); undefined when not measured. */
  probeFps?: number;
}

/** Pure decision. Weak signals push the tier down; missing signals are ignored. */
export function decideTier(s: DeviceSignals): Tier {
  if (!s.webgl2) return '2d';
  if (s.deviceMemory !== undefined && s.deviceMemory < 2) return '2d';
  if (s.probeFps !== undefined && s.probeFps < 24) return '2d';
  const weak =
    (s.deviceMemory !== undefined && s.deviceMemory <= 4) ||
    (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 4) ||
    (s.probeFps !== undefined && s.probeFps < 50);
  return weak ? 'lite' : 'full';
}

export interface CanvasSettings {
  /** [min, max] device pixel ratio for the canvas. */
  dpr: [number, number];
  antialias: boolean;
}

export function canvasSettings(tier: Exclude<Tier, '2d'>): CanvasSettings {
  return tier === 'full' ? { dpr: [1, 2], antialias: true } : { dpr: [1, 1.5], antialias: false };
}

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The user's manual choice, or null for automatic. */
export function readTierChoice(storage: StorageLike | null = defaultStorage()): Tier | null {
  try {
    const value = storage?.getItem(TIER_STORAGE_KEY);
    return isTier(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeTierChoice(choice: TierChoice, storage: StorageLike | null = defaultStorage()) {
  try {
    if (choice === 'auto') storage?.removeItem(TIER_STORAGE_KEY);
    else storage?.setItem(TIER_STORAGE_KEY, choice);
  } catch {
    // storage unavailable: the choice lasts for this page view only
  }
}

export function readCachedAutoTier(storage: StorageLike | null = defaultStorage()): Tier | null {
  try {
    const value = storage?.getItem(AUTO_TIER_STORAGE_KEY);
    return isTier(value) ? value : null;
  } catch {
    return null;
  }
}

function writeCachedAutoTier(tier: Tier, storage: StorageLike | null = defaultStorage()) {
  try {
    storage?.setItem(AUTO_TIER_STORAGE_KEY, tier);
  } catch {
    // ignore
  }
}

export function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ok = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function readDeviceSignals(nav: Navigator = navigator): Omit<DeviceSignals, 'webgl2' | 'probeFps'> {
  const memory = (nav as Navigator & { deviceMemory?: unknown }).deviceMemory;
  return {
    deviceMemory: typeof memory === 'number' ? memory : undefined,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
        ? nav.hardwareConcurrency
        : undefined,
  };
}

/**
 * Average frames per second over `durationMs` of requestAnimationFrame callbacks with a small
 * amount of main-thread work per frame. A rough signal for very slow devices, not a GPU benchmark.
 * Resolves NaN when frames never arrive (background tab).
 */
export function probeFps(
  durationMs = 700,
  raf: (cb: FrameRequestCallback) => number = (cb) => requestAnimationFrame(cb),
  now: () => number = () => performance.now(),
): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let start = -1;
    const tick = (t: number) => {
      if (start < 0) start = t;
      frames += 1;
      // A little work per frame, roughly like building one frame of a small scene.
      let acc = 0;
      for (let i = 0; i < 20_000; i += 1) acc += Math.sqrt(i);
      if (acc < 0) frames -= 1;
      const elapsed = t - start;
      if (elapsed >= durationMs) {
        resolve(((frames - 1) * 1000) / elapsed);
        return;
      }
      raf(tick);
    };
    raf(tick);
    // Background tabs pause rAF: give up after a hard timeout (NaN = not measured).
    const startedAt = now();
    setTimeout(() => {
      if (now() - startedAt >= durationMs * 3 && frames < 2) resolve(Number.NaN);
    }, durationMs * 3);
  });
}

/** The automatic tier, measured once per browser and cached. */
export async function resolveAutoTier(): Promise<Tier> {
  const cached = readCachedAutoTier();
  if (cached) return cached;
  const webgl2 = detectWebGL2();
  const signals: DeviceSignals = { webgl2, ...readDeviceSignals() };
  let measured = true;
  if (webgl2) {
    const fps = await probeFps();
    if (Number.isFinite(fps)) signals.probeFps = fps;
    else measured = false;
  }
  const tier = decideTier(signals);
  if (measured) writeCachedAutoTier(tier);
  return tier;
}
