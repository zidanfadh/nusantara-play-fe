/**
 * Canvas 2D drawing of the gasing arena (Phase 20). Everything is drawn in code: an arena of packed earth
 * with a rope ring (cached once per size), pseudo-3D carved wooden tops with painted bands, wobble, motion
 * blur rings, the aim line, landing marker, power arc and string winding, dust puffs, sparks and a small
 * screen shake. No images, no libraries.
 *
 * The two sides differ in colour AND pattern (colour-blind safe): the player's top is warm (red/amber) with
 * dots, the computer's is cool (blue/teal) with stripes; the HUD chips use the same swatches.
 */
import type { TopState } from '@/lib/games/gasing/types';

export interface View {
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** Arena radius in CSS px. */
  R: number;
  /** Screen y = world y × squash (the arena is seen slightly from the front). */
  squash: number;
}

export const SQUASH = 0.78;

/** The tops in hand sit this far from the centre (world units, see GasingArena heldPosition). */
export const HELD_DISTANCE = 1.14;

export function computeView(w: number, h: number): View {
  // Room above the ring for the computer's top in hand and its height, below it for the player's.
  const R = Math.max(40, Math.min(w * 0.45, h * 0.44));
  const above = HELD_DISTANCE * R * SQUASH + 0.27 * R;
  const below = HELD_DISTANCE * R * SQUASH + 0.12 * R;
  return { w, h, cx: w / 2, cy: above + (h - above - below) / 2, R, squash: SQUASH };
}

export function toScreen(v: View, x: number, y: number): [number, number] {
  return [v.cx + x * v.R, v.cy + y * v.R * v.squash];
}

export function toWorld(v: View, sx: number, sy: number): [number, number] {
  return [(sx - v.cx) / v.R, (sy - v.cy) / (v.R * v.squash)];
}

export interface TopStyle {
  band1: string;
  band2: string;
  mark: string;
  pattern: 'dots' | 'stripes';
}

export const TOP_STYLES: readonly [TopStyle, TopStyle] = [
  { band1: '#d6452f', band2: '#f2a93b', mark: '#fff3d6', pattern: 'dots' },
  { band1: '#1f5fa8', band2: '#3bb3a4', mark: '#f1f7ff', pattern: 'stripes' },
];

/** CSS backgrounds of the HUD swatches (same colours and patterns as the tops). */
export const SWATCH_CSS: readonly [string, string] = [
  `radial-gradient(circle at 50% 50%, #fff3d6 0 2px, transparent 2.5px) 0 0 / 7px 7px, radial-gradient(circle, #f2a93b 0 45%, #d6452f 46%)`,
  `repeating-linear-gradient(45deg, #f1f7ff 0 2px, transparent 2px 6px), radial-gradient(circle, #3bb3a4 0 45%, #1f5fa8 46%)`,
];

// --------------------------------------------------------------------------------------------------------
// Arena (cached)
// --------------------------------------------------------------------------------------------------------

/** Small deterministic generator for the arena texture (the look must not change between frames). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawArena(canvas: HTMLCanvasElement, v: View, dpr: number): void {
  canvas.width = Math.max(1, Math.round(v.w * dpr));
  canvas.height = Math.max(1, Math.round(v.h * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, v.w, v.h);
  const { cx, cy, R, squash } = v;

  // Packed earth around the ring, fading into the page.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, squash);
  const outer = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.42);
  outer.addColorStop(0, 'rgba(150, 104, 60, 0.95)');
  outer.addColorStop(0.55, 'rgba(150, 104, 60, 0.55)');
  outer.addColorStop(1, 'rgba(150, 104, 60, 0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.42, 0, Math.PI * 2);
  ctx.fill();

  // The arena floor.
  const floor = ctx.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R);
  floor.addColorStop(0, '#caa06a');
  floor.addColorStop(0.7, '#b48550');
  floor.addColorStop(1, '#9c6d3d');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Speckles, pebbles and a few scuffs (in screen space, inside the ellipse).
  const rnd = lcg(20_2611);
  const count = Math.round(Math.min(900, R * 4));
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * R * 1.3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * squash;
    const inside = r < R * 0.985;
    const dark = rnd() < 0.55;
    ctx.fillStyle = dark ? `rgba(70, 42, 18, ${inside ? 0.18 : 0.1})` : `rgba(255, 238, 205, ${inside ? 0.16 : 0.08})`;
    const s = 0.5 + rnd() * 1.4;
    ctx.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * R * 0.92;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * squash;
    const s = (1.2 + rnd() * 2.2) * Math.max(1, R / 220);
    ctx.fillStyle = 'rgba(60, 40, 22, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.8, s, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rnd() < 0.5 ? '#b8a48a' : '#8f7a63';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const r = (0.2 + rnd() * 0.65) * R;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * squash, 0, a, a + 0.3 + rnd() * 0.6);
    ctx.stroke();
  }

  // Darker rim inside the ring (worn by play).
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, squash);
  const rim = ctx.createRadialGradient(0, 0, R * 0.75, 0, 0, R);
  rim.addColorStop(0, 'rgba(60, 35, 15, 0)');
  rim.addColorStop(1, 'rgba(60, 35, 15, 0.22)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The rope ring: shadow, rope, twist.
  const lw = Math.max(3, R * 0.034);
  ctx.lineWidth = lw;
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + lw * 0.6, R, R * squash, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#e9d8ab';
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * squash, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([lw * 0.9, lw * 0.9]);
  ctx.lineWidth = lw * 0.55;
  ctx.strokeStyle = '#b6955a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * squash, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Chalk throw marks on both sides.
  ctx.strokeStyle = 'rgba(255, 252, 240, 0.7)';
  ctx.lineWidth = Math.max(1.5, R * 0.01);
  for (const side of [1, -1]) {
    const [x, y] = [cx, cy + side * R * squash * 0.9];
    const s = R * 0.035;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * squash);
    ctx.lineTo(x + s, y + s * squash);
    ctx.moveTo(x + s, y - s * squash);
    ctx.lineTo(x - s, y + s * squash);
    ctx.stroke();
  }
}

// --------------------------------------------------------------------------------------------------------
// Tops
// --------------------------------------------------------------------------------------------------------

export interface HeldView {
  /** World offset of the top in the hand (pulled back while aiming). */
  x: number;
  y: number;
  /** 0..1 string winding, and whether the perfect window is open. */
  winding: number;
  inWindow: boolean;
}

function drawFace(ctx: CanvasRenderingContext2D, style: TopStyle, rx: number, angle: number, blur: number, alpha: number) {
  // Painted bands (in a unit circle of radius rx, already squashed by the caller).
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style.band1;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c99358';
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.band2;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9a86b';
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // The pattern, smeared over `blur` radians when the top spins fast.
  const copies = blur > 0.35 ? 4 : 1;
  for (let k = 0; k < copies; k++) {
    const a = angle - (blur * k) / copies;
    ctx.globalAlpha = alpha * (copies === 1 ? 1 : 0.38);
    ctx.fillStyle = style.mark;
    ctx.strokeStyle = style.mark;
    if (style.pattern === 'dots') {
      for (let i = 0; i < 8; i++) {
        const t = a + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(t) * rx * 0.87, Math.sin(t) * rx * 0.87, rx * 0.085, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rx * 0.45, Math.sin(a) * rx * 0.45, rx * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = rx * 0.11;
      for (let i = 0; i < 6; i++) {
        const t = a + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(t) * rx * 0.32, Math.sin(t) * rx * 0.32);
        ctx.lineTo(Math.cos(t + 0.25) * rx * 0.97, Math.sin(t + 0.25) * rx * 0.97);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Draws one top. `frameSpin` = radians the top turns in one frame (sets the blur). Ground point = world
 * (top.x, top.y); `lift` raises it (flight).
 */
export function drawTop(
  ctx: CanvasRenderingContext2D,
  v: View,
  top: Pick<TopState, 'x' | 'y' | 'phase' | 'angle' | 'spin' | 'tilt' | 'precession' | 'flightT' | 'flightDur' | 'radius' | 'side'>,
  style: TopStyle,
  frameSpin: number,
  held: HeldView | null,
): void {
  const wx = held ? held.x : top.x;
  const wy = held ? held.y : top.y;
  const [gx, gy] = toScreen(v, wx, wy);
  const rp = top.radius * v.R * 1.15;
  const flying = top.phase === 'flying' && top.flightDur > 0;
  const f = flying ? Math.min(1, top.flightT / top.flightDur) : 0;
  const arc = flying ? 4 * f * (1 - f) : 0;
  const lift = arc * v.R * 0.38;
  const scale = 1 + arc * 0.28;
  const lying = top.phase === 'stopped' || top.phase === 'out';

  // Shadow on the ground (smaller and lighter while high).
  ctx.save();
  const sh = ctx.createRadialGradient(gx, gy, 0, gx, gy, rp * 1.5);
  sh.addColorStop(0, `rgba(30, 16, 5, ${0.42 - arc * 0.25})`);
  sh.addColorStop(1, 'rgba(30, 16, 5, 0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(gx + rp * 0.25, gy + rp * 0.12, rp * (1.45 - arc * 0.5), rp * (0.62 - arc * 0.2), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (lying) {
    // A fallen top lies on its side, pointing away from where it leaned.
    const dir = top.precession;
    const dx = Math.cos(dir);
    const dy = Math.sin(dir) * v.squash;
    ctx.save();
    ctx.globalAlpha = top.phase === 'out' ? 0.75 : 1;
    ctx.translate(gx, gy - rp * 0.35);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = '#6e4520';
    ctx.beginPath();
    ctx.moveTo(-rp * 1.5, 0);
    ctx.lineTo(0, -rp * 0.8);
    ctx.lineTo(0, rp * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.scale(0.45, 1);
    drawFace(ctx, style, rp * 0.95, 0, 0, 1);
    ctx.restore();
    ctx.fillStyle = '#5a3517';
    ctx.fillRect(rp * 0.3, -rp * 0.18, rp * 0.5, rp * 0.36);
    ctx.restore();
    return;
  }

  const H = rp * 2.1 * scale;
  const lean = Math.min(top.tilt, 1) * H * 0.75;
  const lx = Math.cos(top.precession) * lean;
  const ly = Math.sin(top.precession) * lean * v.squash;
  const tipX = gx;
  const tipY = gy - lift;
  const bx = tipX + lx * 0.55;
  const by = tipY - H * 0.45 + ly * 0.55;
  const rx = rp * 1.0 * scale;
  const ry = rx * 0.42;
  const thick = rp * 0.32 * scale;

  // Cone from the tip (paksi) to the body.
  const cone = ctx.createLinearGradient(bx - rx, by, bx + rx, by);
  cone.addColorStop(0, '#5b381a');
  cone.addColorStop(0.45, '#8a5a2b');
  cone.addColorStop(1, '#4a2c12');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(bx - rx * 0.98, by);
  ctx.ellipse(bx, by, rx * 0.98, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  // Iron tip.
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.arc(tipX, tipY, Math.max(1.2, rp * 0.09), 0, Math.PI * 2);
  ctx.fill();

  // Body side (thickness of the widest part).
  const side = ctx.createLinearGradient(bx - rx, by, bx + rx, by);
  side.addColorStop(0, '#6b4220');
  side.addColorStop(0.4, style.band1);
  side.addColorStop(1, '#3d230d');
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(bx - rx, by - thick);
  ctx.ellipse(bx, by - thick, rx, ry, 0, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();

  // Top face with the painted bands, turning.
  const blur = Math.min(Math.PI, Math.abs(frameSpin));
  ctx.save();
  ctx.translate(bx, by - thick);
  ctx.scale(1, ry / rx);
  drawFace(ctx, style, rx, top.angle, blur, 1);
  // Motion blur rings, stronger with more spin.
  const s = Math.min(1, Math.abs(top.spin) / 140);
  if (s > 0.15) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 * s})`;
    ctx.lineWidth = rx * 0.05;
    for (const r of [0.52, 0.8]) {
      ctx.beginPath();
      ctx.arc(0, 0, rx * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Handle knob on top (shape differs per side as well: round vs flat).
  const kx = tipX + lx;
  const ky = tipY - H + ly;
  ctx.strokeStyle = '#4a2c12';
  ctx.lineWidth = Math.max(2, rp * 0.22);
  ctx.beginPath();
  ctx.moveTo(bx, by - thick);
  ctx.lineTo(kx, ky + rp * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#5a3517';
  if (style.pattern === 'dots') {
    ctx.beginPath();
    ctx.arc(kx, ky, rp * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(kx - rp * 0.22, ky - rp * 0.1, rp * 0.44, rp * 0.2);
  }

  // The string wound around the top in the hand, glowing gold in the perfect window.
  if (held) {
    const turns = Math.round(2 + held.winding * 5);
    ctx.strokeStyle = held.inWindow ? '#ffd24a' : '#f1e6c8';
    ctx.lineWidth = Math.max(1.2, rp * 0.08);
    for (let i = 0; i < turns; i++) {
      const t = i / Math.max(1, turns - 1);
      const yy = tipY - H * 0.12 - t * H * 0.32;
      const ww = rx * (0.25 + 0.7 * t);
      ctx.beginPath();
      ctx.ellipse(tipX + lx * 0.4 * t, yy, ww, ww * 0.3, 0, 0, Math.PI);
      ctx.stroke();
    }
    if (held.winding > 0) {
      ctx.strokeStyle = held.inWindow ? 'rgba(255, 210, 74, 0.95)' : 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = Math.max(2, rp * 0.14);
      ctx.beginPath();
      ctx.arc(bx, by - H * 0.2, rp * 1.9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * held.winding);
      ctx.stroke();
      if (held.inWindow) {
        ctx.fillStyle = 'rgba(255, 210, 74, 0.18)';
        ctx.beginPath();
        ctx.arc(bx, by - H * 0.2, rp * 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// --------------------------------------------------------------------------------------------------------
// Aim
// --------------------------------------------------------------------------------------------------------

export interface AimView {
  origin: { x: number; y: number };
  landing: { x: number; y: number };
  power: number;
  cancel: boolean;
  /** Screen points of the drag (pointer) or null (keyboard). */
  drag: { sx: number; sy: number; ex: number; ey: number; dead: number } | null;
  topRadius: number;
}

export function drawAim(ctx: CanvasRenderingContext2D, v: View, a: AimView): void {
  if (a.drag) {
    const d = a.drag;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(d.sx, d.sy, d.dead, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!a.cancel) {
      ctx.strokeStyle = 'rgba(241, 230, 200, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(d.sx, d.sy);
      ctx.lineTo(d.ex, d.ey);
      ctx.stroke();
      ctx.fillStyle = '#f1e6c8';
      ctx.beginPath();
      ctx.arc(d.ex, d.ey, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (a.cancel) return;
  const [ox, oy] = toScreen(v, a.origin.x, a.origin.y);
  const [lx, ly] = toScreen(v, a.landing.x, a.landing.y);
  // Aim line with an arrow head.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(ly - oy, lx - ox);
  const head = 12;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx - Math.cos(ang - 0.4) * head, ly - Math.sin(ang - 0.4) * head);
  ctx.lineTo(lx - Math.cos(ang + 0.4) * head, ly - Math.sin(ang + 0.4) * head);
  ctx.closePath();
  ctx.fill();
  // Landing marker.
  const rr = a.topRadius * v.R * 1.4;
  ctx.strokeStyle = '#fff6dd';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.ellipse(lx, ly, rr, rr * v.squash, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Power arc around the throw origin: green → amber → red.
  const pr = v.R * 0.2;
  ctx.lineWidth = Math.max(5, v.R * 0.03);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(ox, oy, pr, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  const col = a.power < 0.55 ? '#5cc46a' : a.power < 0.8 ? '#f2b23b' : '#e2553b';
  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.arc(ox, oy, pr, Math.PI * 1.15, Math.PI * (1.15 + 0.7 * a.power));
  ctx.stroke();
}

// --------------------------------------------------------------------------------------------------------
// Effects
// --------------------------------------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: 'dust' | 'spark';
}

export interface Effects {
  particles: Particle[];
  shake: number;
  reduced: boolean;
}

export function createEffects(reduced: boolean): Effects {
  return { particles: [], shake: 0, reduced };
}

const MAX_PARTICLES = 90;

export function dustPuff(fx: Effects, v: View, x: number, y: number, strength: number): void {
  const [sx, sy] = toScreen(v, x, y);
  const n = fx.reduced ? 3 : Math.round(6 + Math.min(8, strength * 3));
  for (let i = 0; i < n && fx.particles.length < MAX_PARTICLES; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const sp = (12 + Math.random() * 30) * (v.R / 200);
    fx.particles.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * v.squash, life: 0, max: 0.6 + Math.random() * 0.4, size: (3 + Math.random() * 4) * (v.R / 200), kind: 'dust' });
  }
}

export function sparks(fx: Effects, v: View, x: number, y: number, strength: number): void {
  const [sx, sy] = toScreen(v, x, y);
  const n = fx.reduced ? 3 : Math.round(6 + Math.min(14, strength * 6));
  for (let i = 0; i < n && fx.particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (60 + Math.random() * 140) * (v.R / 200) * Math.min(1.5, 0.5 + strength / 2);
    fx.particles.push({ x: sx, y: sy - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * v.squash - 20, life: 0, max: 0.25 + Math.random() * 0.25, size: 1.5 + Math.random() * 1.5, kind: 'spark' });
  }
  if (!fx.reduced) fx.shake = Math.max(fx.shake, Math.min(8, 2 + strength * 2.5) * (v.R / 200));
}

/** Advances particles and the shake by `dt` seconds (real frame time; purely visual). */
export function updateEffects(fx: Effects, dt: number): void {
  for (const p of fx.particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = p.kind === 'dust' ? 2.5 : 4;
    p.vx *= 1 - Math.min(1, drag * dt);
    p.vy *= 1 - Math.min(1, drag * dt);
  }
  fx.particles = fx.particles.filter((p) => p.life < p.max);
  fx.shake = fx.shake * Math.exp(-dt * 14);
  if (fx.shake < 0.2) fx.shake = 0;
}

export function shakeOffset(fx: Effects): [number, number] {
  if (fx.shake <= 0 || fx.reduced) return [0, 0];
  return [(Math.random() - 0.5) * 2 * fx.shake, (Math.random() - 0.5) * 2 * fx.shake];
}

export function drawEffects(ctx: CanvasRenderingContext2D, fx: Effects): void {
  for (const p of fx.particles) {
    const t = p.life / p.max;
    if (p.kind === 'dust') {
      ctx.fillStyle = `rgba(214, 186, 140, ${0.45 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + t * 1.6), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(255, ${200 + Math.round(55 * (1 - t))}, 120, ${1 - t})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    }
  }
}

/** Name tags under / above the tops in hand ("Kamu", "Komputer"). */
export function drawTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(20, 12, 4, 0.62)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 10, w, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}
