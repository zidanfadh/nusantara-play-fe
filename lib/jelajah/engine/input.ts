/**
 * Movement input (Phase 11): on-screen joystick on touch devices, WASD and arrow keys on desktop.
 * An input vector is { x: right, y: forward } with length <= 1. The camera never rotates and looks
 * north, so "forward" is world -z. Pure, unit-tested.
 */
import type { Vec2 } from '@/lib/jelajah/scenes/types';

export interface InputVector {
  x: number;
  y: number;
}

export const ZERO_INPUT: InputVector = { x: 0, y: 0 };

/** Fraction of the joystick radius that is ignored (finger jitter). */
export const JOYSTICK_DEAD_ZONE = 0.15;

/**
 * Joystick knob offset in screen pixels (dx right, dy DOWN) → input vector. Clamped to the radius;
 * the dead zone is removed and the rest rescaled, so the speed grows smoothly from 0 to 1.
 */
export function joystickVector(dx: number, dy: number, radius: number, deadZone = JOYSTICK_DEAD_ZONE): InputVector {
  if (radius <= 0) return ZERO_INPUT;
  const length = Math.hypot(dx, dy);
  const t = Math.min(1, length / radius);
  if (t <= deadZone || length === 0) return ZERO_INPUT;
  const strength = (t - deadZone) / (1 - deadZone);
  return { x: (dx / length) * strength, y: (-dy / length) * strength };
}

/** Knob position for drawing: the offset clamped to the radius. */
export function clampKnob(dx: number, dy: number, radius: number): Vec2 {
  const length = Math.hypot(dx, dy);
  if (length <= radius || length === 0) return [dx, dy];
  return [(dx / length) * radius, (dy / length) * radius];
}

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);

/** KeyboardEvent.code values that move the player. */
export const MOVEMENT_CODES: ReadonlySet<string> = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT]);

/** Pressed key codes → input vector (diagonals normalised to length 1). */
export function keysToVector(pressed: ReadonlySet<string>): InputVector {
  const has = (set: Set<string>) => [...set].some((code) => pressed.has(code));
  const x = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
  const y = (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
  const length = Math.hypot(x, y);
  return length === 0 ? ZERO_INPUT : { x: x / length, y: y / length };
}

/** Sum of two inputs, clamped to length 1. */
export function combineInput(a: InputVector, b: InputVector): InputVector {
  const x = a.x + b.x;
  const y = a.y + b.y;
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/** Input vector → world movement direction [dx, dz] (forward = north = -z). */
export function inputToWorld(input: InputVector): Vec2 {
  return [input.x, -input.y];
}

/** Rotation (radians around the vertical axis, 0 = facing +z) of a movement direction. */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** Turns `from` towards `to` by at most `maxStep` radians along the shorter way. */
export function turnTowards(from: number, to: number, maxStep: number): number {
  let diff = (to - from) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}
