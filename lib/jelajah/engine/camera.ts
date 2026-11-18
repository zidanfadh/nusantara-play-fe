/**
 * Follow-camera framing of the province scene (Phase 12). Pure math, no three.js, unit-tested in
 * tests/jelajah/camera.test.ts.
 *
 * The camera never rotates around the vertical axis and keeps a fixed pitch. It looks north (-z) and is
 * placed so that the player stands in the lower third of the screen (looking ahead). The distance is the
 * smallest one at which a set of "frame points" (relative to the player at the spawn point: the two
 * nearest stands, every stand sign) fits on screen, so phones get a closer camera and a wider field of
 * view instead of a far camera with an empty lower half.
 *
 * Camera space: forward d = (0, -sin p, -cos p), up u = (0, cos p, -sin p), right r = (1, 0, 0).
 * NDC: x and y in [-1, 1], y = -1 is the bottom edge.
 */
import { STAND_SIZE } from './collision';
import { SIGN_CENTER_Y, SIGN_HEIGHT, SIGN_WIDTH } from './sign-text';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A point that must be on screen. `fitX: false` = only the vertical position matters. */
export interface FramePoint extends Vec3 {
  fitX: boolean;
}

/** Fixed downward pitch (radians). */
export const CAMERA_PITCH = (40 * Math.PI) / 180;
/** Where the player's aim point sits on screen (NDC y; -1 = bottom edge). About the lower third. */
export const PLAYER_SCREEN_Y = -0.4;
/** Height of the aim point on the player (metres; chest of the scaled character). */
export const PLAYER_AIM_HEIGHT = 1.1;
/** Frame points must stay inside this NDC margin (|x|, |y| <= value). */
export const FRAME_MARGIN = 0.92;
export const MIN_DISTANCE = 11;
export const MAX_DISTANCE = 40;

/** Vertical field of view (degrees) for a viewport aspect (width / height): wider on portrait phones. */
export function fovForAspect(aspect: number): number {
  const PORTRAIT = 0.46; // 390 × 844 is 0.462
  const LANDSCAPE = 1.3;
  const t = Math.min(1, Math.max(0, (aspect - PORTRAIT) / (LANDSCAPE - PORTRAIT)));
  return 62 + (44 - 62) * t;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Camera position relative to the player's feet for a distance (camera → aim point) and pitch, such
 * that the aim point projects to PLAYER_SCREEN_Y.
 */
export function cameraOffset(distance: number, pitch: number, fovDeg: number): Vec3 {
  // Angle between the view axis and the ray to the aim point: tan(alpha) = |y_ndc| · tan(fov / 2).
  const alpha = Math.atan(-PLAYER_SCREEN_Y * Math.tan(rad(fovDeg) / 2));
  const below = pitch + alpha; // ray to the aim point, angle below the horizon
  return { x: 0, y: PLAYER_AIM_HEIGHT + distance * Math.sin(below), z: distance * Math.cos(below) };
}

/** Projects a point (same frame as `camera`) to NDC. `depth` <= 0 means behind the camera. */
export function projectNdc(point: Vec3, camera: Vec3, pitch: number, fovDeg: number, aspect: number) {
  const qx = point.x - camera.x;
  const qy = point.y - camera.y;
  const qz = point.z - camera.z;
  const sin = Math.sin(pitch);
  const cos = Math.cos(pitch);
  const depth = -qy * sin - qz * cos;
  const up = qy * cos - qz * sin;
  const t = Math.tan(rad(fovDeg) / 2);
  return { x: qx / (depth * t * aspect), y: up / (depth * t), depth };
}

export interface CameraFrame {
  fov: number;
  pitch: number;
  distance: number;
  /** Camera position minus the player's feet position. */
  offset: Vec3;
}

function fits(points: readonly FramePoint[], camera: Vec3, pitch: number, fov: number, aspect: number): boolean {
  for (const p of points) {
    const n = projectNdc(p, camera, pitch, fov, aspect);
    if (n.depth < 0.5) return false;
    if (Math.abs(n.y) > FRAME_MARGIN) return false;
    if (p.fitX && Math.abs(n.x) > FRAME_MARGIN) return false;
  }
  return true;
}

/** Smallest distance (in 0.25 m steps, clamped to MIN/MAX_DISTANCE) at which every point fits. */
export function frameCamera(aspect: number, points: readonly FramePoint[], pitch = CAMERA_PITCH): CameraFrame {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const fov = fovForAspect(safeAspect);
  let distance = MAX_DISTANCE;
  for (let d = MIN_DISTANCE; d <= MAX_DISTANCE; d += 0.25) {
    if (fits(points, cameraOffset(d, pitch, fov), pitch, fov, safeAspect)) {
      distance = d;
      break;
    }
  }
  return { fov, pitch, distance, offset: cameraOffset(distance, pitch, fov) };
}

/**
 * Frame points of a scene, relative to the spawn point: the player, the footprint and the sign of the
 * two stands nearest to the spawn (fully visible), and the top edge of every stand sign (vertically).
 */
export function spawnFramePoints(scene: Pick<SceneDefinition, 'spawn' | 'stands'>): FramePoint[] {
  const { x: sx, z: sz } = scene.spawn;
  const out: FramePoint[] = [
    { x: 0, y: 0, z: 0, fitX: true },
    { x: 0, y: 2.4, z: 0, fitX: true },
  ];
  const signTop = SIGN_CENTER_Y + SIGN_HEIGHT / 2;
  const signBottom = SIGN_CENTER_Y - SIGN_HEIGHT / 2;
  const byDistance = [...scene.stands].sort((a, b) => Math.hypot(a.x - sx, a.z - sz) - Math.hypot(b.x - sx, b.z - sz));
  byDistance.forEach((s, i) => {
    const x = s.x - sx;
    const z = s.z - sz;
    const nearest = i < 2;
    if (nearest) {
      const c = Math.cos(s.rotation);
      const n = Math.sin(s.rotation);
      for (const [lx, lz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const wx = (lx * STAND_SIZE.width) / 2;
        const wz = (lz * STAND_SIZE.depth) / 2;
        out.push({ x: x + wx * c + wz * n, y: 0, z: z - wx * n + wz * c, fitX: true });
      }
    }
    // Sprite signs face the camera, so their corners are offset along world x.
    for (const dx of [-SIGN_WIDTH / 2, SIGN_WIDTH / 2]) {
      out.push({ x: x + dx, y: signTop, z, fitX: nearest });
      if (nearest) out.push({ x: x + dx, y: signBottom, z, fitX: true });
    }
  });
  return out;
}

/** Duration of the entry glide (seconds). */
export const INTRO_SECONDS = 1.5;
/** The glide starts this much higher (pitch) and farther (distance factor). */
export const INTRO_EXTRA_PITCH = (24 * Math.PI) / 180;
export const INTRO_DISTANCE_FACTOR = 1.9;

/** Ease-out cubic, clamped to [0, 1]. */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** Camera pose during the intro glide at `elapsed` seconds; at INTRO_SECONDS it equals the frame. */
export function introPose(frame: CameraFrame, elapsed: number): { pitch: number; offset: Vec3; done: boolean } {
  const e = easeOutCubic(elapsed / INTRO_SECONDS);
  const done = elapsed >= INTRO_SECONDS;
  const pitch = frame.pitch + INTRO_EXTRA_PITCH * (1 - e);
  const distance = frame.distance * (1 + (INTRO_DISTANCE_FACTOR - 1) * (1 - e));
  return { pitch, offset: done ? frame.offset : cameraOffset(distance, pitch, frame.fov), done };
}

/** Critically damped follow (frame-rate independent, no overshoot), updated in place without allocating. */
export interface DampState {
  value: number;
  velocity: number;
}

export function smoothDamp(state: DampState, target: number, smoothTime: number, dt: number): void {
  if (dt <= 0) return;
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - target;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * exp;
  let next = target + (change + temp) * exp;
  // Never overshoot the target.
  if (target - state.value > 0 === next > target) {
    next = target;
    state.velocity = 0;
  }
  state.value = next;
}
