'use client';

/**
 * Development only: samples fps, draw calls and triangles once a second and warns in the console when
 * the set of exceeded budgets changes (Phase 10, shared with the province scene in Phase 11).
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { budgetViolations, type RenderStats } from '@/lib/jelajah/budget';

export function StatsProbe({ onStats }: { onStats: (s: RenderStats) => void }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ frames: 0, since: -1, warned: '' });
  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    if (a.since < 0) a.since = now;
    a.frames += 1;
    if (now - a.since < 1000) return;
    const stats = {
      fps: (a.frames * 1000) / (now - a.since),
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    };
    a.frames = 0;
    a.since = now;
    onStats(stats);
    // Warn when the SET of exceeded budgets changes, not on every new value.
    const issues = budgetViolations(stats);
    const key = issues.map((i) => i.split(' ').slice(0, -3).join(' ')).join(',');
    if (key && key !== a.warned) console.warn(`[jelajah] budget exceeded: ${issues.join(', ')}`);
    a.warned = key;
  });
  return null;
}

/** The overlay box shown next to the 3D view in development. */
export function StatsOverlay({ stats, tier, className }: { stats: RenderStats; tier: string; className: string }) {
  return (
    <div
      data-testid="jelajah-stats"
      className={`pointer-events-none absolute rounded bg-black/70 px-2 py-1 font-mono text-[11px] leading-tight text-white ${className}`}
    >
      <div>{stats.fps.toFixed(0)} fps</div>
      <div>{stats.drawCalls} draw calls</div>
      <div>{(stats.triangles / 1000).toFixed(1)}k triangles</div>
      <div>tier {tier}</div>
    </div>
  );
}
