/**
 * Camera framing of the paper map (Phase 28), pure (no three.js): a fixed tilt like the design reference, the whole
 * archipelago on screen on load in every viewport (portrait phones, landscape phones, desktop), and the zoom limits.
 * `project()` is the same perspective projection the three.js camera uses (camera.lookAt with up = +y), so the tests
 * can check the framing without WebGL.
 *
 * World axes as in the 3D map: x = map x (east), z = -map y (south), y = up.
 */
import type { Bounds } from './geo';

export const MAP_FOV = 35;
/** Tilt from straight down (the reference looks at the archipelago at about 40 degrees). */
export const MAP_TILT = (40 * Math.PI) / 180;
/** Height of the tallest things on the map (volcano + lift), so peaks are framed too. */
export const MAP_TOP = 1.3;
/** Share of the viewport kept free around the map on load (each side, in NDC units). */
export const FRAME_MARGIN = 0.06;
/** Closest zoom (camera distance). */
export const MIN_DISTANCE = 6;
/** How far the user may zoom out beyond the initial framing. */
export const MAX_DISTANCE_FACTOR = 1.2;

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  /** Look-at point on the paper (y = 0). */
  target: Vec3;
  distance: number;
}

/** Camera position for a pose (south of and above the target, fixed tilt). */
export function cameraPosition({ target, distance }: CameraPose): Vec3 {
  return [target[0], target[1] + Math.cos(MAP_TILT) * distance, target[2] + Math.sin(MAP_TILT) * distance];
}

/** NDC of a world point (x right, y up; |x|, |y| <= 1 = on screen), or null when it is behind the camera. */
export function project(point: Vec3, pose: CameraPose, aspect: number, fov = MAP_FOV): [number, number] | null {
  const c = cameraPosition(pose);
  const s = Math.sin(MAP_TILT);
  const k = Math.cos(MAP_TILT);
  const v = [point[0] - c[0], point[1] - c[1], point[2] - c[2]];
  // Camera basis: forward (0, -cos, -sin), right (1, 0, 0), up (0, sin, -cos).
  const depth = -k * v[1] - s * v[2];
  if (depth <= 0) return null;
  const x = v[0];
  const y = s * v[1] - k * v[2];
  const t = Math.tan(((fov / 2) * Math.PI) / 180);
  return [x / (depth * t * aspect), y / (depth * t)];
}

function corners(b: Bounds): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [b.minX, b.maxX]) for (const y of [b.minY, b.maxY]) for (const h of [0, MAP_TOP]) out.push([x, h, -y]);
  return out;
}

/** The NDC rectangle the bounds cover for a pose. */
export function screenBox(bounds: Bounds, pose: CameraPose, aspect: number) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of corners(bounds)) {
    const n = project(p, pose, aspect);
    if (!n) return null;
    minX = Math.min(minX, n[0]);
    maxX = Math.max(maxX, n[0]);
    minY = Math.min(minY, n[1]);
    maxY = Math.max(maxY, n[1]);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * The closest pose that shows the whole map with FRAME_MARGIN on every side, centred on screen. The target is
 * shifted south/north so the tilted (trapezoid) picture is centred vertically.
 */
export function frameMap(bounds: Bounds, aspect: number): CameraPose {
  const cx = (bounds.minX + bounds.maxX) / 2;
  let tz = -(bounds.minY + bounds.maxY) / 2;
  const limit = 1 - FRAME_MARGIN;
  let distance = 50;
  for (let round = 0; round < 4; round += 1) {
    let lo = 1;
    let hi = 2000;
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      const box = screenBox(bounds, { target: [cx, 0, tz], distance: mid }, aspect);
      const fits = box && box.minX >= -limit && box.maxX <= limit && box.minY >= -limit && box.maxY <= limit;
      if (fits) hi = mid;
      else lo = mid;
    }
    distance = hi;
    // Re-centre vertically: move the target by the screen offset converted to ground units at the target.
    const box = screenBox(bounds, { target: [cx, 0, tz], distance }, aspect)!;
    const offset = (box.maxY + box.minY) / 2;
    if (Math.abs(offset) < 1e-4) break;
    const groundPerNdc = (distance * Math.tan(((MAP_FOV / 2) * Math.PI) / 180)) / Math.cos(MAP_TILT);
    tz -= offset * groundPerNdc;
  }
  return { target: [cx, 0, tz], distance };
}

/** Zoom limits for a viewport: as close as MIN_DISTANCE, as far as a bit beyond the initial framing. */
export function zoomLimits(bounds: Bounds, aspect: number) {
  const fit = frameMap(bounds, aspect).distance;
  return { min: Math.min(MIN_DISTANCE, fit), max: fit * MAX_DISTANCE_FACTOR };
}
