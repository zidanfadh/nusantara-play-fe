/**
 * Real-device measurement and the automatic tier fallback of the Jelajah 3D scenes (Phase 13).
 * Pure (no imports, no three.js); unit-tested in tests/jelajah/perf.test.ts.
 *
 * - `FpsWindow`: average frame rate over the last 2 s from frame timestamps (fixed ring buffer, no
 *   allocation per frame). Used by the ?debug=1 overlay and by the fallback.
 * - `fallbackStep`: full → lite when the 2 s average stays below 24 fps for 5 s, lite → 2d when it stays
 *   below 20 fps for another 5 s. Never when the user chose a tier manually; the timer restarts while the
 *   tab is hidden or no average is available yet.
 * - `isDebugSearch`: `?debug=1` turns on the stats overlay.
 */

type Tier = 'full' | 'lite' | '2d';

/** Window of the fps average (overlay and fallback). */
export const FPS_WINDOW_MS = 2000;

export const FALLBACK_RULES = {
  full: { belowFps: 24, forMs: 5000, to: 'lite' },
  lite: { belowFps: 20, forMs: 5000, to: '2d' },
} as const satisfies Record<Exclude<Tier, '2d'>, { belowFps: number; forMs: number; to: Tier }>;

/** Average frames per second over the last `windowMs`, from frame timestamps (ms). */
export class FpsWindow {
  private readonly times: Float64Array;
  private head = 0;
  private count = 0;
  private startedAt = -1;

  constructor(
    readonly windowMs = FPS_WINDOW_MS,
    capacity = 512,
  ) {
    this.times = new Float64Array(capacity);
  }

  /** Forget everything (tab hidden, new canvas). */
  reset(): void {
    this.head = 0;
    this.count = 0;
    this.startedAt = -1;
  }

  push(t: number): void {
    if (this.startedAt < 0) this.startedAt = t;
    this.times[this.head] = t;
    this.head = (this.head + 1) % this.times.length;
    this.count = Math.min(this.count + 1, this.times.length);
  }

  /**
   * Frames in the last `windowMs` divided by the window (a stall counts as missing frames), or null until a
   * full window has been observed since the last reset. With more frames than the buffer holds (very high
   * refresh rates) the average uses the span the buffer covers.
   */
  fps(now: number): number | null {
    if (this.startedAt < 0 || now - this.startedAt < this.windowMs) return null;
    const cap = this.times.length;
    const from = now - this.windowMs;
    let frames = 0;
    let oldest = now;
    for (let i = 1; i <= this.count; i += 1) {
      const t = this.times[(this.head - i + cap) % cap];
      if (t <= from) return (frames * 1000) / this.windowMs;
      oldest = t;
      frames += 1;
    }
    // Buffer full before reaching the window start.
    return this.count === cap ? (frames * 1000) / Math.max(1, now - oldest) : (frames * 1000) / this.windowMs;
  }
}

export interface FallbackInput {
  /** The tier currently rendered. */
  tier: Tier;
  /** The user picked the tier in the "Tampilan" menu: never overridden. */
  manual: boolean;
  /** document.hidden: measurement paused. */
  hidden: boolean;
  /** 2 s average, or null while not measurable (warm-up, intro). */
  fps: number | null;
  now: number;
}

export interface FallbackState {
  /** Since when the average has been below the threshold (null = not below). */
  lowSince: number | null;
}

export const INITIAL_FALLBACK_STATE: FallbackState = Object.freeze({ lowSince: null }) as FallbackState;

/** One decision step; `switchTo` is the lower tier once the rule is met. */
export function fallbackStep(state: FallbackState, input: FallbackInput): { state: FallbackState; switchTo: Tier | null } {
  const idle = { state: INITIAL_FALLBACK_STATE, switchTo: null };
  if (input.manual || input.tier === '2d' || input.hidden || input.fps === null) return idle;
  const rule = FALLBACK_RULES[input.tier];
  if (input.fps >= rule.belowFps) return idle;
  const lowSince = state.lowSince ?? input.now;
  if (input.now - lowSince >= rule.forMs) return { state: INITIAL_FALLBACK_STATE, switchTo: rule.to };
  return { state: lowSince === state.lowSince ? state : { lowSince }, switchTo: null };
}

/** Toast after an automatic switch (neutral, Indonesian). */
export function fallbackMessage(to: Tier): string {
  return to === '2d' ? 'Beralih ke Peta 2D agar lebih lancar' : 'Beralih ke mode Ringan agar lebih lancar';
}

/** `?debug=1` (exactly) turns on the stats overlay. */
export function isDebugSearch(search: string): boolean {
  try {
    return new URLSearchParams(search).get('debug') === '1';
  } catch {
    return false;
  }
}
