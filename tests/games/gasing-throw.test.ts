import { describe, expect, it } from 'vitest';
import { PHYSICS, forwardAngle } from '@/lib/games/gasing/physics';
import {
  THROW_INPUT,
  beginDrag,
  deadZonePx,
  dragAim,
  evaluateRelease,
  keyAimAdjust,
  keyAimAngle,
  keyAimStart,
  keyCharge,
  keyRelease,
  moveDrag,
  releaseDrag,
  steadiness,
  windState,
  type DragView,
} from '@/lib/games/gasing/throw';

const view: DragView = { maxDragPx: 200, ySquash: 0.75 };
const FULL = THROW_INPUT.windFullMs;
const WINDOW = THROW_INPUT.perfectWindowMs;
const none = { left: false, right: false, up: false, down: false };

describe('gasing release rule (Phase 20)', () => {
  it('winds up, opens the perfect window, then slips', () => {
    expect(windState(0)).toEqual({ winding: 0, inWindow: false, slip: 1 });
    expect(windState(FULL / 2).winding).toBeCloseTo(0.5, 10);
    expect(windState(FULL).inWindow).toBe(true);
    expect(windState(FULL + WINDOW).inWindow).toBe(true);
    expect(windState(FULL + WINDOW + 1).inWindow).toBe(false);
    expect(windState(FULL + WINDOW + THROW_INPUT.slipMs).slip).toBeCloseTo(THROW_INPUT.slipMin, 10);
    expect(windState(60_000).slip).toBe(THROW_INPUT.slipMin);
  });

  it('a steady release in the window is perfect; a flick is weak; a shaky hand is never perfect', () => {
    const base = { angle: -1, power: 0.6 };
    const perfect = evaluateRelease({ ...base, steadiness: 1, heldMs: FULL + 100 });
    expect(perfect.perfect).toBe(true);
    expect(perfect.quality).toBe(1);
    const flick = evaluateRelease({ ...base, steadiness: 1, heldMs: 0 });
    expect(flick.perfect).toBe(false);
    expect(flick.quality).toBeCloseTo(THROW_INPUT.windBase, 10);
    const shaky = evaluateRelease({ ...base, steadiness: 0.6, heldMs: FULL + 100 });
    expect(shaky.perfect).toBe(false);
    expect(shaky.quality).toBeCloseTo(0.6, 10);
    const late = evaluateRelease({ ...base, steadiness: 1, heldMs: FULL + WINDOW + 5000 });
    expect(late.perfect).toBe(false);
    expect(late.quality).toBeCloseTo(THROW_INPUT.slipMin, 10);
    expect(evaluateRelease({ ...base, power: 3, steadiness: Number.NaN, heldMs: 0 })).toMatchObject({ power: 1, quality: 0 });
  });
});

describe('gasing pointer throw (Phase 20)', () => {
  it('drag back = throw forward; length = power; the arena tilt is undone', () => {
    let d = beginDrag(0, 100, 100, 0);
    d = moveDrag(d, 100, 200, 16, view); // straight down by 100 px
    const aim = dragAim(d, view);
    expect(aim.cancel).toBe(false);
    expect(aim.angle).toBeCloseTo(forwardAngle(0), 10);
    expect(aim.power).toBeCloseTo(0.5, 10);
    // Down-left drag → up-right throw; the screen y is stretched back by 1 / ySquash.
    d = moveDrag(d, 25, 175, 32, view);
    const a2 = dragAim(d, view);
    expect(a2.angle).toBeCloseTo(Math.atan2(-75 / view.ySquash, 75), 10);
    // Longer than the max drag: full power.
    d = moveDrag(d, 100, 500, 48, view);
    expect(dragAim(d, view).power).toBe(1);
  });

  it('releasing inside the dead zone cancels', () => {
    let d = beginDrag(0, 50, 50, 0);
    d = moveDrag(d, 50 + deadZonePx(view) - 1, 50, 100, view);
    expect(dragAim(d, view).cancel).toBe(true);
    expect(releaseDrag(d, 200, view)).toBeNull();
    // Dragged out and back in: still cancelled.
    d = moveDrag(d, 50, 150, 300, view);
    d = moveDrag(d, 52, 53, 400, view);
    expect(releaseDrag(d, 500, view)).toBeNull();
  });

  it('holding still winds the string: drag, hold, release in the window = perfect', () => {
    let d = beginDrag(0, 100, 100, 0);
    d = moveDrag(d, 100, 160, 50, view);
    d = moveDrag(d, 100, 230, 100, view);
    // No pointer events while the finger is still; released 600 ms later.
    const t = releaseDrag(d, 100 + FULL + 150, view)!;
    expect(t.perfect).toBe(true);
    expect(t.quality).toBe(1);
    expect(t.power).toBeCloseTo(130 / 200, 10);
  });

  it('a flick (moving fast at release) gives a poor, unsteady throw', () => {
    let d = beginDrag(0, 100, 100, 0);
    for (let i = 1; i <= 10; i++) d = moveDrag(d, 100 + (i % 2) * 6, 100 + i * 15, i * 16, view);
    expect(steadiness(d, 160, view)).toBeLessThan(0.3);
    const t = releaseDrag(d, 160, view)!;
    expect(t.perfect).toBe(false);
    expect(t.quality).toBeLessThan(0.3);
  });

  it('small hand tremor keeps the winding but lowers steadiness a little', () => {
    let d = beginDrag(0, 100, 100, 0);
    d = moveDrag(d, 100, 250, 40, view);
    for (let i = 0; i < 40; i++) d = moveDrag(d, 100 + (i % 2), 250 + ((i + 1) % 2), 60 + i * 16, view);
    const at = 60 + 39 * 16 + 10;
    const s = steadiness(d, at, view);
    expect(s).toBeGreaterThan(0.85);
    expect(s).toBeLessThan(1);
    expect(releaseDrag(d, at, view)!.perfect).toBe(true);
  });
});

describe('gasing keyboard throw (Phase 20)', () => {
  it('arrows aim and set the power; Space winds; release throws', () => {
    let k = keyAimStart(0, 0.4);
    expect(keyAimAngle(k)).toBeCloseTo(forwardAngle(0), 10);
    k = keyAimAdjust(k, { ...none, right: true }, 250, 1000);
    expect(Math.cos(keyAimAngle(k))).toBeGreaterThan(0); // to the thrower's right = +x for the bottom side
    k = keyAimAdjust(k, { ...none, up: true }, 500, 1250);
    expect(k.power).toBeCloseTo(0.4 + THROW_INPUT.keyPowerSpeed * 0.5, 10);
    k = keyAimAdjust(k, { ...none, left: true }, 10_000, 1300);
    expect(k.offset).toBe(-PHYSICS.maxAim);
    k = keyCharge(k, 2000);
    const t = keyRelease(k, 2000 + FULL + 100);
    expect(t.perfect).toBe(true);
    expect(t.quality).toBe(1);
  });

  it('adjusting while winding restarts the winding and is not steady', () => {
    let k = keyCharge(keyAimStart(0), 0);
    k = keyAimAdjust(k, { ...none, right: true }, 16, 500);
    const t = keyRelease(k, 520);
    expect(t.perfect).toBe(false);
    expect(t.quality).toBeLessThan(0.5);
  });

  it('gives the same throw as the pointer for the same aim, power and hold', () => {
    let k = keyAimStart(0, 0.5);
    k = keyCharge(k, 0);
    const key = keyRelease(k, FULL + 200);
    let d = beginDrag(0, 100, 100, -50);
    d = moveDrag(d, 100, 200, 0, view);
    const ptr = releaseDrag(d, FULL + 200, view)!;
    expect(ptr.angle).toBeCloseTo(key.angle, 10);
    expect(ptr.power).toBeCloseTo(key.power, 10);
    expect(ptr.quality).toBeCloseTo(key.quality, 10);
    expect(ptr.perfect).toBe(key.perfect);
  });

  it('the top side aims mirrored (its right is −x)', () => {
    const k = keyAimAdjust(keyAimStart(1), { ...none, right: true }, 250, 0);
    expect(Math.cos(keyAimAngle(k))).toBeLessThan(0);
  });
});
