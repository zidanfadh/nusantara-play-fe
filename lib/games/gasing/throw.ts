/**
 * The gasing throw model (Phase 20): pointer slingshot and keyboard → `Throw`. Pure (times are passed in,
 * no DOM), so the page, the tests and the AI share one release rule.
 *
 * Pointer: press anywhere in the throw zone, drag BACK, release. Aim = opposite of the drag, power = drag
 * length / max drag (clamped). Releasing within the dead zone around the press point cancels.
 *
 * Release quality (both inputs, `evaluateRelease`):
 * - steadiness: how still the hand is in the last 150 ms before release (spread of the pointer positions;
 *   keyboard: 1, or 0.5 when an arrow key was pressed in those 150 ms);
 * - winding: how long the aim has been held steady (the string is wound after WIND_FULL_MS);
 * - the "perfect" window: released after full winding and at most PERFECT_WINDOW_MS later, with a steady
 *   hand → `perfect` (bonus spin, less tilt; the page shows "Lemparan mantap!"). Holding much longer lets
 *   the string slip a little (quality × down to SLIP_MIN).
 */
import { forwardAngle, PHYSICS } from './physics';
import type { Side, Throw } from './types';

export const THROW_INPUT = {
  /** Window for the steadiness measure (ms). */
  smoothWindowMs: 150,
  /** Steady hold until the string is fully wound (ms). */
  windFullMs: 450,
  /** Length of the perfect window after full winding (ms). */
  perfectWindowMs: 450,
  /** After the window the string slips over this time down to SLIP_MIN. */
  slipMs: 700,
  slipMin: 0.85,
  /** Minimum steadiness for a perfect release. */
  perfectSteadiness: 0.85,
  /** Quality = steadiness × (WIND_BASE + (1 − WIND_BASE) × winding) × slip. */
  windBase: 0.55,
  /** A move larger than this fraction of the max drag restarts the winding. */
  steadyMoveFraction: 0.035,
  /** Position spread (fraction of the max drag) at which steadiness reaches 0. */
  jitterFraction: 0.06,
  /** Dead zone radius as a fraction of the max drag (and at least DEAD_ZONE_MIN_PX). */
  deadZoneFraction: 0.12,
  deadZoneMinPx: 14,
  /** Keyboard: aim step per second (radians) and power step per second. */
  keyAimSpeed: 1.2,
  keyPowerSpeed: 0.6,
} as const;

export interface ReleaseInput {
  /** World angle of the throw. */
  angle: number;
  power: number;
  /** 0..1. */
  steadiness: number;
  /** Time the aim was held steady before release (ms). */
  heldMs: number;
}

export interface WindState {
  /** 0..1: how far the string is wound. */
  winding: number;
  /** Inside the perfect window right now. */
  inWindow: boolean;
  /** 1 until the window has passed, then down to SLIP_MIN. */
  slip: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function windState(heldMs: number): WindState {
  const t = Math.max(0, heldMs);
  const winding = clamp(t / THROW_INPUT.windFullMs, 0, 1);
  const after = t - THROW_INPUT.windFullMs - THROW_INPUT.perfectWindowMs;
  const slip = after > 0 ? Math.max(THROW_INPUT.slipMin, 1 - (after / THROW_INPUT.slipMs) * (1 - THROW_INPUT.slipMin)) : 1;
  return { winding, inWindow: t >= THROW_INPUT.windFullMs && after <= 0, slip };
}

/** The one release rule for every input. */
export function evaluateRelease(r: ReleaseInput): Throw {
  const s = clamp(Number.isFinite(r.steadiness) ? r.steadiness : 0, 0, 1);
  const w = windState(r.heldMs);
  const quality = clamp(s * (THROW_INPUT.windBase + (1 - THROW_INPUT.windBase) * w.winding) * w.slip, 0, 1);
  return {
    angle: r.angle,
    power: clamp(r.power, 0, 1),
    quality,
    perfect: w.inWindow && s >= THROW_INPUT.perfectSteadiness,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Pointer (touch / mouse)
// ---------------------------------------------------------------------------------------------------------

export interface DragView {
  /** Drag length (CSS px) that gives full power. */
  maxDragPx: number;
  /** Screen y = world y × ySquash (the arena is drawn slightly tilted). */
  ySquash: number;
}

export interface DragSample {
  x: number;
  y: number;
  t: number;
}

export interface DragState {
  side: Side;
  startX: number;
  startY: number;
  /** Recent samples (last ~300 ms), oldest first. */
  samples: DragSample[];
  /** Where and since when the pointer has been held steady. */
  anchorX: number;
  anchorY: number;
  steadySince: number;
  lastX: number;
  lastY: number;
}

export function beginDrag(side: Side, x: number, y: number, t: number): DragState {
  return { side, startX: x, startY: y, samples: [{ x, y, t }], anchorX: x, anchorY: y, steadySince: t, lastX: x, lastY: y };
}

export function moveDrag(d: DragState, x: number, y: number, t: number, view: DragView): DragState {
  const samples = d.samples.filter((s) => s.t >= t - 300);
  samples.push({ x, y, t });
  const moved = Math.hypot(x - d.anchorX, y - d.anchorY) > THROW_INPUT.steadyMoveFraction * view.maxDragPx;
  return {
    ...d,
    samples,
    anchorX: moved ? x : d.anchorX,
    anchorY: moved ? y : d.anchorY,
    steadySince: moved ? t : d.steadySince,
    lastX: x,
    lastY: y,
  };
}

export function deadZonePx(view: DragView): number {
  return Math.max(THROW_INPUT.deadZoneMinPx, THROW_INPUT.deadZoneFraction * view.maxDragPx);
}

/** Steadiness from the pointer positions in the last 150 ms (the last known position counts as held). */
export function steadiness(d: DragState, t: number, view: DragView): number {
  const from = t - THROW_INPUT.smoothWindowMs;
  const pts = d.samples.filter((s) => s.t >= from).map((s) => [s.x, s.y]);
  // The position held at the start of the window (the last sample before it), and at release.
  const before = [...d.samples].reverse().find((s) => s.t < from);
  if (before) pts.unshift([before.x, before.y]);
  pts.push([d.lastX, d.lastY]);
  if (pts.length < 2) return 1;
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const spread = Math.sqrt(pts.reduce((a, p) => a + (p[0] - mx) ** 2 + (p[1] - my) ** 2, 0) / pts.length);
  return clamp(1 - spread / (THROW_INPUT.jitterFraction * view.maxDragPx), 0, 1);
}

export interface Aim {
  angle: number;
  power: number;
  /** True while the pointer is inside the dead zone (releasing now cancels). */
  cancel: boolean;
}

/** Live aim of a drag: slingshot, so the throw goes opposite to the drag. */
export function dragAim(d: DragState, view: DragView): Aim {
  const dx = d.lastX - d.startX;
  const dy = d.lastY - d.startY;
  const len = Math.hypot(dx, dy);
  if (len < deadZonePx(view)) return { angle: forwardAngle(d.side), power: 0, cancel: true };
  const angle = Math.atan2(-dy / view.ySquash, -dx);
  return { angle, power: clamp(len / view.maxDragPx, 0, 1), cancel: false };
}

/** The throw of a released drag, or null when it was cancelled (released in the dead zone). */
export function releaseDrag(d: DragState, t: number, view: DragView): Throw | null {
  const aim = dragAim(d, view);
  if (aim.cancel) return null;
  return evaluateRelease({ angle: aim.angle, power: aim.power, steadiness: steadiness(d, t, view), heldMs: t - d.steadySince });
}

// ---------------------------------------------------------------------------------------------------------
// Keyboard: ← → aim, ↑ ↓ power, hold Space to wind, release Space to throw.
// ---------------------------------------------------------------------------------------------------------

export interface KeyAim {
  side: Side;
  /** Aim relative to straight ahead (radians, ± PHYSICS.maxAim). Positive = to the thrower's right. */
  offset: number;
  power: number;
  /** Space is held since (ms), or null. */
  chargingSince: number | null;
  /** Last time an arrow key changed the aim or power (ms). */
  lastAdjust: number;
}

export function keyAimStart(side: Side, power = 0.45): KeyAim {
  return { side, offset: 0, power, chargingSince: null, lastAdjust: Number.NEGATIVE_INFINITY };
}

/** World angle of a keyboard aim. */
export function keyAimAngle(k: KeyAim): number {
  // The thrower's right: side 0 looks up (−y), its right is +x; side 1 looks down, its right is −x. In both
  // cases that is a larger world angle (y points down).
  return forwardAngle(k.side) + k.offset;
}

/** Applies held arrow keys for `dtMs`. */
export function keyAimAdjust(k: KeyAim, keys: { left: boolean; right: boolean; up: boolean; down: boolean }, dtMs: number, t: number): KeyAim {
  const dt = dtMs / 1000;
  const turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const push = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  if (!turn && !push) return k;
  return {
    ...k,
    offset: clamp(k.offset + turn * THROW_INPUT.keyAimSpeed * dt, -PHYSICS.maxAim, PHYSICS.maxAim),
    power: clamp(k.power + push * THROW_INPUT.keyPowerSpeed * dt, 0.05, 1),
    lastAdjust: t,
    // Adjusting while winding restarts the winding, like moving the pointer.
    chargingSince: k.chargingSince === null ? null : t,
  };
}

export function keyCharge(k: KeyAim, t: number): KeyAim {
  return k.chargingSince === null ? { ...k, chargingSince: t } : k;
}

export function keyHeldMs(k: KeyAim, t: number): number {
  return k.chargingSince === null ? 0 : t - k.chargingSince;
}

/** Releasing Space: the throw (same rule as the pointer). */
export function keyRelease(k: KeyAim, t: number): Throw {
  const shaky = t - k.lastAdjust < THROW_INPUT.smoothWindowMs;
  return evaluateRelease({ angle: keyAimAngle(k), power: k.power, steadiness: shaky ? 0.5 : 1, heldMs: keyHeldMs(k, t) });
}
