/**
 * Gasing physics (Phase 20): a pure, deterministic, top-down 2D simulation of two spinning tops in a round
 * arena. Fixed timestep 1/120 s; randomness only from the seeded generator stored in the world; no Date, no
 * Math.random, no DOM.
 *
 * Model (all numbers in PHYSICS):
 * - A throw sends the top through the air from its side of the ring along the aim; the power sets the
 *   landing distance and part of the spin, the release quality the rest of the spin and the starting tilt.
 * - On the ground the top slides (rolling friction + drag), its spin decays (faster when tilted), and the
 *   tilt grows as the spin falls below a critical spin (gyroscopic stability above it). Below a spin or
 *   above a tilt threshold the top falls: spin 0, stopped.
 * - Wobble: the tilted top precesses; precession pushes it around (it wanders). That push is paid for with
 *   spin energy, so the total energy never grows without a throw.
 * - Two tops on the ground collide as discs: normal impulse with restitution, Coulomb friction between the
 *   spinning rims (spin turns into deflection, capped by friction and never adding energy), then a spin loss
 *   and a tilt kick proportional to the impact speed.
 * - A top whose centre leaves the ring is out.
 *
 * Mutating functions (`applyThrow`, `step`) work on a world the caller owns; `simulate` is the pure wrapper
 * (it clones first) used by the AI and the tests.
 */
import { DEFAULT_RULES, type GasingRules } from './rules';
import { mulberry32Step } from './random';
import type { ScheduledThrow, Side, Throw, TopState, World, WorldEvent } from './types';

export const STEP_HZ = 120;
export const DT = 1 / STEP_HZ;

export const PHYSICS = {
  topRadius: 0.085,
  topMass: 1,
  /** I = k·m·r² (a carved top is between a cone and a disc). */
  inertiaFactor: 0.4,
  /** Throw origin: on the ring, on the thrower's side (fraction of the arena radius). */
  originDistance: 1,
  /** Largest aim deviation from straight ahead (radians, 75°). */
  maxAim: (75 * Math.PI) / 180,
  /** Landing distance from the origin, min and max (fractions of the arena radius). */
  landMin: 0.3,
  landMax: 1.95,
  /** Flight time: base + power share (seconds). */
  flightBase: 0.3,
  flightPower: 0.22,
  /** Spin at landing (rad/s) before the quality factor. */
  spinMin: 60,
  spinMax: 150,
  /** Share of the spin that depends on the quality (the rest comes from the power). */
  qualitySpinShare: 0.3,
  /** Horizontal speed kept when landing (plain landing / landing on the other top). */
  slide: 0.26,
  directSlide: 0.85,
  /** Tilt at landing: base + bad release share; a perfect release halves the bad share. */
  tiltBase: 0.03,
  tiltBad: 0.24,
  perfectSpin: 1.07,
  perfectTilt: 0.5,
  /** Landing direction jitter (radians) per unit of starting tilt. */
  landJitter: 1.2,
  /** Ground: rolling deceleration (units/s²) and linear drag (1/s). */
  rollDecel: 0.08,
  linDrag: 2.5,
  /** Spin decay: constant + tilt share (rad/s²) and drag (1/s). */
  spinDecel: 9,
  spinTiltDecel: 40,
  spinDrag: 0.06,
  /** Spin below which gravity wins over gyroscopic stability (rad/s). */
  critSpin: 32,
  tiltGrow: 1.1,
  tiltStab: 1.6,
  tiltFloor: 0.01,
  /** Falls at this tilt or below this spin. */
  fallTilt: 1,
  stopSpin: 3,
  /** Precession rate = k / spin (rad/s), and the wander push per unit of tilt (units/s²). */
  precessionK: 160,
  driftK: 1.6,
  /** Collisions. */
  restitution: 0.55,
  friction: 0.25,
  hitSpinLoss: 0.1,
  hitTilt: 0.13,
  /** Extra tilt for the top that is landed on directly (per unit of landing speed). */
  directTilt: 0.05,
  /** Pangkah: the striking top is heavier (the archive's gasing pemangkah has a thicker body). */
  pemangkahMass: 1.5,
  pemangkahRadius: 0.092,
} as const;

/** `biasa` = the normal top; `pemangkah` = the heavier striking top of the Pangkah mode. */
export type TopKind = 'biasa' | 'pemangkah';

function rand(world: World): number {
  const [v, next] = mulberry32Step(world.rng);
  world.rng = next;
  return v;
}

function heldTop(side: Side): TopState {
  const r = PHYSICS.topRadius;
  const m = PHYSICS.topMass;
  return {
    side,
    phase: 'held',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    flightT: 0,
    flightDur: 0,
    spin: 0,
    spinStart: 0,
    tilt: 0,
    precession: 0,
    angle: 0,
    mass: m,
    radius: r,
    inertia: PHYSICS.inertiaFactor * m * r * r,
    spinTime: 0,
    endReason: null,
  };
}

export function createWorld(seed: number): World {
  return { t: 0, steps: 0, rng: seed | 0, tops: [heldTop(0), heldTop(1)] };
}

export function cloneWorld(w: World): World {
  return { t: w.t, steps: w.steps, rng: w.rng, tops: [{ ...w.tops[0] }, { ...w.tops[1] }] };
}

/** Straight ahead for a side: side 0 throws up (−y), side 1 down (+y). */
export function forwardAngle(side: Side): number {
  return side === 0 ? -Math.PI / 2 : Math.PI / 2;
}

export function throwOrigin(side: Side, rules: GasingRules = DEFAULT_RULES): { x: number; y: number } {
  const d = PHYSICS.originDistance * rules.arenaRadius;
  return { x: 0, y: side === 0 ? d : -d };
}

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** The throw as the engine will use it: aim inside ±maxAim of straight ahead, power and quality in 0..1. */
export function normalizeThrow(side: Side, t: Throw): Throw {
  const fwd = forwardAngle(side);
  const dev = clamp(wrapAngle((Number.isFinite(t.angle) ? t.angle : fwd) - fwd), -PHYSICS.maxAim, PHYSICS.maxAim);
  return {
    angle: fwd + dev,
    power: clamp(Number.isFinite(t.power) ? t.power : 0, 0, 1),
    quality: clamp(Number.isFinite(t.quality) ? t.quality : 0, 0, 1),
    perfect: !!t.perfect,
  };
}

export function landingDistance(power: number, rules: GasingRules = DEFAULT_RULES): number {
  return (PHYSICS.landMin + clamp(power, 0, 1) * (PHYSICS.landMax - PHYSICS.landMin)) * rules.arenaRadius;
}

/** Inverse of landingDistance: the power that lands at `distance` from the origin (clamped to 0..1). */
export function powerForDistance(distance: number, rules: GasingRules = DEFAULT_RULES): number {
  return clamp((distance / rules.arenaRadius - PHYSICS.landMin) / (PHYSICS.landMax - PHYSICS.landMin), 0, 1);
}

/** Where a throw lands (before sliding). Used by the aim preview and the AI. */
export function predictLanding(side: Side, t: Throw, rules: GasingRules = DEFAULT_RULES): { x: number; y: number } {
  const n = normalizeThrow(side, t);
  const o = throwOrigin(side, rules);
  const d = landingDistance(n.power, rules);
  return { x: o.x + Math.cos(n.angle) * d, y: o.y + Math.sin(n.angle) * d };
}

/** Spin (rad/s) a throw gives at landing. */
export function throwSpin(t: Throw): number {
  const base = PHYSICS.spinMin + (PHYSICS.spinMax - PHYSICS.spinMin) * (0.55 + 0.45 * t.power);
  const q = 1 - PHYSICS.qualitySpinShare + PHYSICS.qualitySpinShare * t.quality;
  return base * q * (t.perfect ? PHYSICS.perfectSpin : 1);
}

export function throwTilt(t: Throw): number {
  return PHYSICS.tiltBase + PHYSICS.tiltBad * (1 - t.quality) * (t.perfect ? PHYSICS.perfectTilt : 1);
}

/** Starts a throw for `side` (mutates). Ignored when that top is not in the hand any more. */
export function applyThrow(
  world: World,
  side: Side,
  input: Throw,
  events?: WorldEvent[],
  rules: GasingRules = DEFAULT_RULES,
  kind: TopKind = 'biasa',
): void {
  const top = world.tops[side];
  if (top.phase !== 'held') return;
  const t = normalizeThrow(side, input);
  top.mass = kind === 'pemangkah' ? PHYSICS.pemangkahMass : PHYSICS.topMass;
  top.radius = kind === 'pemangkah' ? PHYSICS.pemangkahRadius : PHYSICS.topRadius;
  top.inertia = PHYSICS.inertiaFactor * top.mass * top.radius * top.radius;
  const o = throwOrigin(side, rules);
  const dur = PHYSICS.flightBase + PHYSICS.flightPower * t.power;
  const speed = landingDistance(t.power, rules) / dur;
  top.phase = 'flying';
  top.x = o.x;
  top.y = o.y;
  top.vx = Math.cos(t.angle) * speed;
  top.vy = Math.sin(t.angle) * speed;
  top.flightT = 0;
  top.flightDur = dur;
  top.spin = throwSpin(t);
  top.spinStart = 0;
  top.tilt = throwTilt(t);
  top.precession = rand(world) * 2 * Math.PI;
  top.angle = 0;
  top.spinTime = 0;
  top.endReason = null;
  events?.push({ type: 'throw', side });
}

/** Kinetic + spin energy of the tops in play (flying or spinning). */
export function energy(world: World): number {
  let e = 0;
  for (const top of world.tops) {
    if (top.phase !== 'flying' && top.phase !== 'spinning') continue;
    e += 0.5 * top.mass * (top.vx * top.vx + top.vy * top.vy) + 0.5 * top.inertia * top.spin * top.spin;
  }
  return e;
}

function endTop(top: TopState, phase: 'stopped' | 'out', events?: WorldEvent[]): void {
  top.phase = phase;
  top.spin = 0;
  top.vx = 0;
  top.vy = 0;
  top.endReason = phase === 'out' ? 'keluar' : 'jatuh';
  events?.push(phase === 'out' ? { type: 'out', side: top.side, x: top.x, y: top.y } : { type: 'stop', side: top.side, x: top.x, y: top.y });
}

function isOutside(top: TopState, rules: GasingRules): boolean {
  return top.x * top.x + top.y * top.y > rules.arenaRadius * rules.arenaRadius;
}

function land(world: World, top: TopState, events: WorldEvent[] | undefined, rules: GasingRules): void {
  const other = world.tops[top.side === 0 ? 1 : 0];
  const speed = Math.hypot(top.vx, top.vy);
  top.phase = 'spinning';
  top.flightT = 0;
  top.flightDur = 0;
  top.spinStart = Math.abs(top.spin);
  if (isOutside(top, rules)) {
    events?.push({ type: 'land', side: top.side, x: top.x, y: top.y, strength: speed, direct: false });
    endTop(top, 'out', events);
    return;
  }
  const reach = other.radius + top.radius;
  const direct = other.phase === 'spinning' && Math.hypot(other.x - top.x, other.y - top.y) < reach;
  if (direct && speed > 0) {
    // Landed on the other top: move back along the flight path to the first contact, so the collision
    // in this step resolves the hit with the striker still moving into the target.
    const ux = top.vx / speed;
    const uy = top.vy / speed;
    const dx = top.x - other.x;
    const dy = top.y - other.y;
    const along = dx * ux + dy * uy;
    const disc = along * along - (dx * dx + dy * dy) + reach * reach;
    const back = along + Math.sqrt(Math.max(0, disc)) - reach * 0.02;
    top.x -= ux * back;
    top.y -= uy * back;
  }
  // A shaky release lands crooked: the slide direction is turned by up to ±(tilt · jitter / 2).
  const turn = (rand(world) - 0.5) * PHYSICS.landJitter * top.tilt;
  const keep = direct ? PHYSICS.directSlide : PHYSICS.slide;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const vx = (top.vx * c - top.vy * s) * keep;
  const vy = (top.vx * s + top.vy * c) * keep;
  top.vx = vx;
  top.vy = vy;
  if (direct) other.tilt += PHYSICS.directTilt * speed;
  events?.push({ type: 'land', side: top.side, x: top.x, y: top.y, strength: speed, direct });
}

function groundStep(top: TopState): void {
  // Precession push (wander), paid for with spin energy so the total energy never grows.
  const mag0 = Math.abs(top.spin);
  const keBefore = 0.5 * top.mass * (top.vx * top.vx + top.vy * top.vy);
  const push = PHYSICS.driftK * top.tilt * DT;
  let vx = top.vx + Math.cos(top.precession) * push;
  let vy = top.vy + Math.sin(top.precession) * push;
  const gain = 0.5 * top.mass * (vx * vx + vy * vy) - keBefore;
  let mag = mag0;
  if (gain > 0) {
    const s2 = mag * mag - (2 * gain) / top.inertia;
    if (s2 > 0) mag = Math.sqrt(s2);
    else {
      vx = top.vx;
      vy = top.vy;
    }
  }
  // Rolling friction and drag (only ever slow the top down).
  const speed = Math.hypot(vx, vy);
  if (speed > 0) {
    const next = Math.max(0, speed - PHYSICS.rollDecel * DT) * (1 - PHYSICS.linDrag * DT);
    vx *= next / speed;
    vy *= next / speed;
  }
  top.vx = vx;
  top.vy = vy;
  // Spin decay, faster when tilted.
  mag = Math.max(0, mag - (PHYSICS.spinDecel + PHYSICS.spinTiltDecel * top.tilt) * DT) * (1 - PHYSICS.spinDrag * DT);
  // Tilt: gravity wins below the critical spin, gyroscopic stability above it.
  const s = mag / PHYSICS.critSpin;
  const grow = (PHYSICS.tiltGrow / (s * s + 0.05)) * (top.tilt + PHYSICS.tiltFloor);
  const stab = PHYSICS.tiltStab * top.tilt * Math.max(0, 1 - 1 / Math.max(s, 1e-6));
  top.tilt = clamp(top.tilt + (grow - stab) * DT, 0, 1.5);
  // Precession turns the same way as the spin (a mirrored top wobbles the mirrored way).
  top.precession = (top.precession + (top.spin < 0 ? -1 : 1) * (PHYSICS.precessionK / Math.max(mag, 5)) * DT) % (2 * Math.PI);
  top.spin = top.spin < 0 ? -mag : mag;
  top.angle = (top.angle + top.spin * DT) % (2 * Math.PI);
  top.x += top.vx * DT;
  top.y += top.vy * DT;
  top.spinTime += DT;
}

/** Disc–disc collision of two tops on the ground (symmetric in a and b). */
function collide(a: TopState, b: TopState, events?: WorldEvent[]): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist < 1e-9) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const wa = 1 / a.mass;
  const wb = 1 / b.mass;
  // Push apart along the normal, by inverse mass (no energy change).
  const overlap = minDist - dist;
  a.x -= nx * overlap * (wa / (wa + wb));
  a.y -= ny * overlap * (wa / (wa + wb));
  b.x += nx * overlap * (wb / (wa + wb));
  b.y += ny * overlap * (wb / (wa + wb));
  const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rvn >= 0) return; // separating
  const j = (-(1 + PHYSICS.restitution) * rvn) / (wa + wb);
  a.vx -= j * nx * wa;
  a.vy -= j * ny * wa;
  b.vx += j * nx * wb;
  b.vy += j * ny * wb;
  // Coulomb friction between the rims: t = z × n; relative surface speed of a against b along t.
  const tx = -ny;
  const ty = nx;
  const u = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty + a.spin * a.radius + b.spin * b.radius;
  const kt = wa + wb + (a.radius * a.radius) / a.inertia + (b.radius * b.radius) / b.inertia;
  const limit = PHYSICS.friction * j;
  const jt = clamp(-u / kt, -limit, limit);
  a.vx += jt * tx * wa;
  a.vy += jt * ty * wa;
  b.vx -= jt * tx * wb;
  b.vy -= jt * ty * wb;
  a.spin += (jt * a.radius) / a.inertia;
  b.spin += (jt * b.radius) / b.inertia;
  // Impact: each top loses spin and gets a tilt kick proportional to its own change of speed (j / m), so a
  // heavier top suffers less. Equal masses: both get the same.
  const impact = -rvn;
  const dva = j * wa;
  const dvb = j * wb;
  a.spin *= Math.max(0.5, 1 - PHYSICS.hitSpinLoss * dva);
  b.spin *= Math.max(0.5, 1 - PHYSICS.hitSpinLoss * dvb);
  a.tilt += PHYSICS.hitTilt * dva;
  b.tilt += PHYSICS.hitTilt * dvb;
  events?.push({ type: 'hit', x: a.x + nx * a.radius, y: a.y + ny * a.radius, strength: impact });
}

/** Advances the world by one fixed step (mutates). */
export function step(world: World, events?: WorldEvent[], rules: GasingRules = DEFAULT_RULES): void {
  for (const top of world.tops) {
    if (top.phase === 'flying') {
      top.x += top.vx * DT;
      top.y += top.vy * DT;
      top.angle = (top.angle + top.spin * DT) % (2 * Math.PI);
      top.flightT += DT;
      if (top.flightT >= top.flightDur - 1e-9) land(world, top, events, rules);
    } else if (top.phase === 'spinning') {
      groundStep(top);
    }
  }
  const [a, b] = world.tops;
  if (a.phase === 'spinning' && b.phase === 'spinning') collide(a, b, events);
  for (const top of world.tops) {
    if (top.phase !== 'spinning') continue;
    if (isOutside(top, rules)) endTop(top, 'out', events);
    else if (top.tilt >= PHYSICS.fallTilt || Math.abs(top.spin) <= PHYSICS.stopSpin) endTop(top, 'stopped', events);
  }
  world.steps += 1;
  world.t = world.steps * DT;
}

/**
 * Headless simulation (pure): clones `world`, applies the scheduled throws at their steps and runs `steps`
 * fixed steps. Optional `until` stops early (checked after every step).
 */
export function simulate(
  world: World,
  inputs: readonly ScheduledThrow[],
  steps: number,
  options: { rules?: GasingRules; until?: (w: World) => boolean; collectEvents?: boolean } = {},
): { world: World; events: WorldEvent[] } {
  const w = cloneWorld(world);
  const events: WorldEvent[] = [];
  const sink = options.collectEvents === false ? undefined : events;
  const rules = options.rules ?? DEFAULT_RULES;
  const start = w.steps;
  for (let i = 0; i < steps; i++) {
    for (const input of inputs) {
      if (input.atStep === w.steps - start) applyThrow(w, input.side, input.throw, sink, rules, input.kind);
    }
    step(w, sink, rules);
    if (options.until?.(w)) break;
  }
  return { world: w, events };
}

/** True while a top is in the air or on the ground spinning. */
export function inPlay(top: TopState): boolean {
  return top.phase === 'flying' || top.phase === 'spinning';
}
