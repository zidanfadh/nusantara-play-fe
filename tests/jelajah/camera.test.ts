import { describe, expect, it } from 'vitest';
import {
  cameraOffset,
  CAMERA_PITCH,
  easeOutCubic,
  FRAME_MARGIN,
  fovForAspect,
  frameCamera,
  introPose,
  INTRO_SECONDS,
  MAX_DISTANCE,
  MIN_DISTANCE,
  PLAYER_AIM_HEIGHT,
  PLAYER_SCREEN_Y,
  projectNdc,
  smoothDamp,
  spawnFramePoints,
  type CameraFrame,
  type DampState,
  type FramePoint,
} from '@/lib/jelajah/engine/camera';
import { SUMATERA_SELATAN_SCENE as scene } from '@/lib/jelajah/scenes/sumatera-selatan';

const PHONE = 390 / 844;
const LAPTOP = 1440 / 900;
const ASPECTS = [
  ['portrait phone 390x844', PHONE],
  ['portrait phone 360x780', 360 / 780],
  ['tablet portrait 768x1024', 768 / 1024],
  ['square', 1],
  ['landscape phone 844x390', 844 / 390],
  ['laptop 1440x900', LAPTOP],
  ['ultrawide 2560x1080', 2560 / 1080],
] as const;

const points = spawnFramePoints(scene);
const ndc = (p: { x: number; y: number; z: number }, frame: CameraFrame, aspect: number) =>
  projectNdc(p, frame.offset, frame.pitch, frame.fov, aspect);

describe('fovForAspect', () => {
  it('is wider on portrait screens and stays in a sane range', () => {
    expect(fovForAspect(PHONE)).toBeGreaterThan(fovForAspect(LAPTOP));
    for (const [, a] of ASPECTS) {
      expect(fovForAspect(a)).toBeGreaterThanOrEqual(44);
      expect(fovForAspect(a)).toBeLessThanOrEqual(62);
    }
  });
});

describe('cameraOffset', () => {
  it('puts the player aim point at PLAYER_SCREEN_Y (lower third), centred horizontally', () => {
    for (const d of [11, 18, 30]) {
      for (const fov of [44, 55, 62]) {
        const offset = cameraOffset(d, CAMERA_PITCH, fov);
        const p = projectNdc({ x: 0, y: PLAYER_AIM_HEIGHT, z: 0 }, offset, CAMERA_PITCH, fov, 1);
        expect(p.y).toBeCloseTo(PLAYER_SCREEN_Y, 6);
        expect(p.x).toBeCloseTo(0, 6);
        expect(p.depth).toBeGreaterThan(0);
      }
    }
  });

  it('the camera is behind (south of) and above the player', () => {
    const o = cameraOffset(15, CAMERA_PITCH, 50);
    expect(o.z).toBeGreaterThan(0);
    expect(o.y).toBeGreaterThan(PLAYER_AIM_HEIGHT);
    expect(o.x).toBe(0);
  });
});

describe('frameCamera at the spawn point', () => {
  it.each(ASPECTS)('%s: player in the lower third, every frame point on screen', (_, aspect) => {
    const frame = frameCamera(aspect, points);
    expect(frame.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
    expect(frame.distance).toBeLessThan(MAX_DISTANCE);
    const feet = ndc({ x: 0, y: 0, z: 0 }, frame, aspect);
    const aim = ndc({ x: 0, y: PLAYER_AIM_HEIGHT, z: 0 }, frame, aspect);
    expect(aim.y).toBeLessThan(-1 / 3); // lower third
    expect(feet.y).toBeGreaterThan(-FRAME_MARGIN - 1e-9); // not cut off at the bottom
    for (const p of points) {
      const n = ndc(p, frame, aspect);
      expect(n.depth).toBeGreaterThan(0);
      expect(Math.abs(n.y)).toBeLessThanOrEqual(FRAME_MARGIN + 1e-9); // signs never cut off at the top
      if (p.fitX) expect(Math.abs(n.x)).toBeLessThanOrEqual(FRAME_MARGIN + 1e-9);
    }
  });

  it('portrait phone: the two nearest side stands are fully visible, with a closer camera than Phase 11', () => {
    const frame = frameCamera(PHONE, points);
    const nearestCorners = points.filter((p) => p.fitX && p.y === 0 && (p.x !== 0 || p.z !== 0));
    expect(nearestCorners).toHaveLength(8); // 2 stands × 4 footprint corners
    const xs = nearestCorners.map((p) => ndc(p, frame, PHONE).x);
    expect(Math.min(...xs)).toBeLessThan(-0.3); // one stand on each side
    expect(Math.max(...xs)).toBeGreaterThan(0.3);
    // Phase 11 used offset (0, 13.5, 15.5) × 1.7 on portrait phones: 34.9 m from the player.
    const phase11 = Math.hypot(13.5, 15.5) * 1.7;
    const now = Math.hypot(frame.offset.y - PLAYER_AIM_HEIGHT, frame.offset.z);
    expect(now).toBeLessThan(phase11 * 0.8);
    expect(frame.fov).toBeGreaterThan(frameCamera(LAPTOP, points).fov);
  });

  it('landscape does not need to stand farther back than portrait', () => {
    expect(frameCamera(LAPTOP, points).distance).toBeLessThanOrEqual(frameCamera(PHONE, points).distance);
  });

  it('falls back to a sane frame for a broken aspect ratio', () => {
    for (const aspect of [0, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const frame = frameCamera(aspect, points);
      expect(Number.isFinite(frame.distance)).toBe(true);
      expect(Number.isFinite(frame.fov)).toBe(true);
    }
  });

  it('uses MAX_DISTANCE when nothing fits', () => {
    const impossible: FramePoint[] = [{ x: 0, y: 200, z: -1, fitX: true }];
    expect(frameCamera(1, impossible).distance).toBe(MAX_DISTANCE);
  });
});

describe('spawnFramePoints', () => {
  it('contains the player, the footprints of the two nearest stands and every sign top', () => {
    const fitX = points.filter((p) => p.fitX);
    const yOnly = points.filter((p) => !p.fitX);
    expect(fitX.length).toBe(2 + 2 * 4 + 2 * 4); // player, 2 stands × 4 corners, 2 signs × 4 corners
    expect(yOnly.length).toBe((scene.stands.length - 2) * 2);
  });
});

describe('intro glide', () => {
  const frame = frameCamera(PHONE, points);

  it('starts higher and farther, and ends exactly on the frame', () => {
    const start = introPose(frame, 0);
    expect(start.pitch).toBeGreaterThan(frame.pitch);
    expect(start.offset.y).toBeGreaterThan(frame.offset.y);
    expect(start.done).toBe(false);
    const end = introPose(frame, INTRO_SECONDS);
    expect(end.done).toBe(true);
    expect(end.pitch).toBe(frame.pitch);
    expect(end.offset).toEqual(frame.offset);
  });

  it('descends monotonically', () => {
    let last = Number.POSITIVE_INFINITY;
    for (let t = 0; t <= INTRO_SECONDS; t += 0.1) {
      const y = introPose(frame, t).offset.y;
      expect(y).toBeLessThanOrEqual(last + 1e-9);
      last = y;
    }
  });

  it('easeOutCubic is clamped', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
  });
});

describe('smoothDamp (camera follow)', () => {
  const run = (fps: number, seconds: number, target: number) => {
    const s: DampState = { value: 0, velocity: 0 };
    const trace: number[] = [];
    for (let i = 0; i < fps * seconds; i += 1) {
      smoothDamp(s, target, 0.16, 1 / fps);
      trace.push(s.value);
    }
    return trace;
  };

  it('reaches the target without overshooting', () => {
    const trace = run(60, 2, 10);
    for (const v of trace) expect(v).toBeLessThanOrEqual(10);
    expect(trace.at(-1)).toBeCloseTo(10, 2);
  });

  it('moves monotonically towards the target (no jitter), also at a low frame rate', () => {
    for (const fps of [60, 20, 10]) {
      const trace = run(fps, 1, 5);
      for (let i = 1; i < trace.length; i += 1) expect(trace[i]).toBeGreaterThanOrEqual(trace[i - 1]);
    }
  });

  it('is frame-rate independent', () => {
    const fast = run(60, 0.5, 5).at(-1) as number;
    const slow = run(15, 0.5, 5).at(-1) as number;
    expect(Math.abs(fast - slow)).toBeLessThan(0.25);
  });

  it('ignores a zero time step', () => {
    const s: DampState = { value: 1, velocity: 0 };
    smoothDamp(s, 5, 0.16, 0);
    expect(s.value).toBe(1);
  });
});
