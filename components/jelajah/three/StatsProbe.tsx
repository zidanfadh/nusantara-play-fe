'use client';

/**
 * Frame measurement inside the 3D canvases (Phase 10, extended in Phase 13).
 *
 * - `StatsProbe`: fps (2 s average), draw calls, triangles, device pixel ratio and canvas size, once a
 *   second, for the stats overlay. Mounted only with `?debug=1` (and in development, where it also warns in
 *   the console when the set of exceeded budgets changes). Without the flag nothing here is mounted.
 * - `AutoFallbackProbe`: the automatic tier fallback (lib/jelajah/perf.ts). Mounted only while the tier is
 *   automatic; starts after the intro and pauses while the tab is hidden.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { budgetViolations, type RenderStats } from '@/lib/jelajah/budget';
import { fallbackStep, FpsWindow, INITIAL_FALLBACK_STATE, type FallbackState } from '@/lib/jelajah/perf';

type Tier = 'full' | 'lite' | '2d';

export interface DebugStats extends RenderStats {
  /** window.devicePixelRatio */
  devicePixelRatio: number;
  /** Pixel ratio the renderer actually uses (the tier caps it). */
  pixelRatio: number;
  /** Drawing buffer size in device pixels. */
  canvasWidth: number;
  canvasHeight: number;
}

const IS_DEV = process.env.NODE_ENV === 'development';

export function StatsProbe({ onStats }: { onStats: (s: DebugStats) => void }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ window: new FpsWindow(), last: -1, warned: '' });
  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    a.window.push(now);
    if (a.last < 0) a.last = now;
    if (now - a.last < 1000) return;
    a.last = now;
    const fps = a.window.fps(now);
    if (fps === null) return;
    const stats: DebugStats = {
      fps,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      devicePixelRatio: window.devicePixelRatio,
      pixelRatio: gl.getPixelRatio(),
      canvasWidth: gl.domElement.width,
      canvasHeight: gl.domElement.height,
    };
    onStats(stats);
    if (!IS_DEV) return;
    // Warn when the SET of exceeded budgets changes, not on every new value.
    const issues = budgetViolations(stats);
    const key = issues.map((i) => i.split(' ').slice(0, -3).join(' ')).join(',');
    if (key && key !== a.warned) console.warn(`[jelajah] budget exceeded: ${issues.join(', ')}`);
    a.warned = key;
  });
  return null;
}

/**
 * Switches full → lite → 2d once each when the frame rate stays low (lib/jelajah/perf.ts). `startAfterMs`
 * skips the intro glide; the 2 s average then needs a full window before any decision.
 */
export function AutoFallbackProbe({
  tier,
  startAfterMs,
  onFallback,
}: {
  tier: Tier;
  startAfterMs: number;
  onFallback: (to: Tier) => void;
}) {
  const acc = useRef({
    window: new FpsWindow(),
    state: INITIAL_FALLBACK_STATE as FallbackState,
    mountedAt: -1,
    lastStep: 0,
    done: false,
  });

  // Hidden tab: rAF stops; forget the frames so the gap does not count as a slowdown.
  useEffect(() => {
    const onVisibility = () => {
      acc.current.window.reset();
      acc.current.state = INITIAL_FALLBACK_STATE;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useFrame(() => {
    const a = acc.current;
    if (a.done) return;
    const now = performance.now();
    if (a.mountedAt < 0) a.mountedAt = now;
    if (now - a.mountedAt < startAfterMs) return;
    a.window.push(now);
    if (now - a.lastStep < 250) return;
    a.lastStep = now;
    const r = fallbackStep(a.state, { tier, manual: false, hidden: document.hidden, fps: a.window.fps(now), now });
    a.state = r.state;
    if (r.switchTo) {
      a.done = true;
      onFallback(r.switchTo);
    }
  });
  return null;
}

/** The ?debug=1 overlay box next to the 3D view. */
export function StatsOverlay({ stats, tier, className }: { stats: DebugStats; tier: string; className: string }) {
  return (
    <div
      data-testid="jelajah-stats"
      className={`pointer-events-none absolute z-20 rounded bg-black/75 px-2 py-1 font-mono text-[10px] leading-tight text-white ${className}`}
    >
      <div>{stats.fps.toFixed(0)} fps (2 s)</div>
      <div>{stats.drawCalls} draw calls</div>
      <div>{(stats.triangles / 1000).toFixed(1)}k triangles</div>
      <div>tier {tier}</div>
      <div>
        dpr {stats.devicePixelRatio.toFixed(2)} → {stats.pixelRatio.toFixed(2)}
      </div>
      <div>
        {stats.canvasWidth}×{stats.canvasHeight} px
      </div>
    </div>
  );
}
