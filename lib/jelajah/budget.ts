/**
 * Performance budget of Jelajah Nusantara (CLAUDE.md "Current direction" item 6; hardware target:
 * a mid-range Android phone with 4 GB RAM and Chrome).
 */
export const BUDGET = {
  minFps: 30,
  /** Total transfer size of a cold load of /jelajah. */
  initialDownloadBytes: 5 * 1024 * 1024,
  maxDrawCalls: 100,
  maxTriangles: 100_000,
} as const;

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

/** Human-readable list of exceeded budgets (empty when everything is within budget). */
export function budgetViolations(stats: RenderStats): string[] {
  const out: string[] = [];
  if (stats.fps < BUDGET.minFps) out.push(`fps ${stats.fps.toFixed(0)} < ${BUDGET.minFps}`);
  if (stats.drawCalls > BUDGET.maxDrawCalls) {
    out.push(`draw calls ${stats.drawCalls} > ${BUDGET.maxDrawCalls}`);
  }
  if (stats.triangles > BUDGET.maxTriangles) {
    out.push(`triangles ${stats.triangles} > ${BUDGET.maxTriangles}`);
  }
  return out;
}
