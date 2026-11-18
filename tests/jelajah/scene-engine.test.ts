import { describe, expect, it } from 'vitest';
import {
  clampToBounds,
  distanceToCollider,
  pushOut,
  resolveMove,
  sceneColliders,
  standCollider,
  STAND_SIZE,
  type BoxCollider,
  type Collider,
} from '@/lib/jelajah/engine/collision';
import {
  clampKnob,
  combineInput,
  headingOf,
  inputToWorld,
  joystickVector,
  keysToVector,
  turnTowards,
} from '@/lib/jelajah/engine/input';
import { assignStands, INTERACT_DISTANCE, nearestStand } from '@/lib/jelajah/engine/stands';
import { SUMATERA_SELATAN_SCENE as scene } from '@/lib/jelajah/scenes/sumatera-selatan';
import type { Vec2 } from '@/lib/jelajah/scenes/types';

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

describe('assignStands', () => {
  const prots = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

  it('empty list: every stand is "Segera hadir"', () => {
    expect(assignStands([], 6)).toEqual(Array(6).fill({ kind: 'empty' }));
  });

  it('fewer PROT than stands: in order, the rest empty', () => {
    expect(assignStands(prots(4), 6)).toEqual([
      { kind: 'prot', prot: 'p1' },
      { kind: 'prot', prot: 'p2' },
      { kind: 'prot', prot: 'p3' },
      { kind: 'prot', prot: 'p4' },
      { kind: 'empty' },
      { kind: 'empty' },
    ]);
  });

  it('exactly as many PROT as stands: no board', () => {
    const out = assignStands(prots(6), 6);
    expect(out.every((s) => s.kind === 'prot')).toBe(true);
    expect(out[5]).toEqual({ kind: 'prot', prot: 'p6' });
  });

  it('more than 6 PROT: the last stand becomes a board listing the rest', () => {
    const out = assignStands(prots(9), 6);
    expect(out.slice(0, 5).map((s) => (s.kind === 'prot' ? s.prot : null))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(out[5]).toEqual({ kind: 'board', prots: ['p6', 'p7', 'p8', 'p9'] });
  });

  it('no stands: nothing', () => {
    expect(assignStands(prots(3), 0)).toEqual([]);
  });
});

describe('colliders and bounds', () => {
  it('clamps to the walkable rectangle, keeping the radius inside', () => {
    expect(clampToBounds(20, -20, bounds, 0.5)).toEqual([9.5, -9.5]);
    expect(clampToBounds(1, 2, bounds, 0.5)).toEqual([1, 2]);
  });

  it('pushes a circle out of a circle collider', () => {
    const col: Collider = { kind: 'circle', x: 0, z: 0, r: 1 };
    const [x, z] = pushOut(col, 0.5, 0, 0.5);
    expect(x).toBeCloseTo(1.5);
    expect(z).toBeCloseTo(0);
    expect(pushOut(col, 3, 0, 0.5)).toEqual([3, 0]);
  });

  it('pushes out of an axis-aligned box and measures a turned box', () => {
    const box: BoxCollider = { kind: 'box', x: 0, z: 0, halfW: 2, halfD: 1, rotation: 0 };
    const [, z1] = pushOut(box, 0, 1.2, 0.5);
    expect(z1).toBeCloseTo(1.5);
    // Centre inside: leaves through the nearest face (+z is 0.2 away, x is 1.5 away).
    const [, z2] = pushOut(box, 0.5, 0.8, 0.5);
    expect(z2).toBeCloseTo(1.5);
    const turned: BoxCollider = { ...box, rotation: Math.PI / 2 }; // width now along z
    expect(distanceToCollider(turned, 0, 1.9)).toBe(0);
    expect(distanceToCollider(turned, 1.9, 0)).toBeCloseTo(0.9);
  });

  it('cannot walk through a box; slides along it instead', () => {
    const wall: Collider[] = [{ kind: 'box', x: 0, z: 0, halfW: 5, halfD: 0.5, rotation: 0 }];
    let pos: Vec2 = [0, 3];
    for (let i = 0; i < 40; i += 1) pos = resolveMove(pos, [0.05, -0.2], wall, bounds, 0.35);
    expect(pos[1]).toBeGreaterThanOrEqual(0.85 - 1e-9); // stays south of the wall
    expect(pos[0]).toBeGreaterThan(1.5); // slid east
  });

  it('stays inside the bounds while pushed by colliders near the edge', () => {
    const cols: Collider[] = [{ kind: 'circle', x: 9.6, z: 0, r: 1 }];
    const [x] = resolveMove([8, 0], [2, 0], cols, bounds, 0.35);
    expect(x).toBeLessThanOrEqual(9.65);
  });

  it('houses, stands and colliding decor block; detail-only items are optional', () => {
    const all = sceneColliders(scene);
    const blocking = scene.decor.filter((d) => d.collide !== undefined).length;
    expect(all).toHaveLength(scene.houses.length + scene.stands.length + blocking);
    expect(sceneColliders(scene, false).length).toBeLessThanOrEqual(all.length);
  });

  it('the spawn point is inside the walkable area and free of colliders', () => {
    const { spawn, walkable } = scene;
    expect(spawn.x).toBeGreaterThanOrEqual(walkable.minX);
    expect(spawn.x).toBeLessThanOrEqual(walkable.maxX);
    expect(spawn.z).toBeGreaterThanOrEqual(walkable.minZ);
    expect(spawn.z).toBeLessThanOrEqual(walkable.maxZ);
    for (const c of sceneColliders(scene)) expect(distanceToCollider(c, spawn.x, spawn.z)).toBeGreaterThan(0.5);
  });

  it('the scene has 6 stands that do not overlap each other or the houses', () => {
    expect(scene.stands).toHaveLength(6);
    const cols = sceneColliders(scene).slice(0, scene.houses.length + scene.stands.length);
    for (const s of scene.stands) {
      const others = cols.filter((c) => !(c.x === s.x && c.z === s.z));
      for (const c of others) expect(distanceToCollider(c, s.x, s.z)).toBeGreaterThan(STAND_SIZE.width / 2);
    }
  });
});

describe('proximity', () => {
  const stands = [
    { x: 0, z: 0, rotation: 0 },
    { x: 10, z: 0, rotation: Math.PI / 2 },
  ];

  it('finds the stand within 2 m of its footprint', () => {
    const edge = STAND_SIZE.depth / 2;
    expect(nearestStand([0, edge + 1.9], stands)).toBe(0);
    expect(nearestStand([0, edge + INTERACT_DISTANCE + 0.1], stands)).toBeNull();
  });

  it('picks the closer of two stands and respects rotation', () => {
    // Stand 1 is turned 90°: its depth lies along x, so 1.9 m east of that edge is in range.
    expect(nearestStand([10 + STAND_SIZE.depth / 2 + 1.9, 0], stands)).toBe(1);
    expect(nearestStand([5, 0], stands)).toBeNull();
  });

  it('every scene stand is reachable from a free spot in front of it', () => {
    const colliders = sceneColliders(scene);
    scene.stands.forEach((s, i) => {
      const front: Vec2 = [
        s.x + Math.sin(s.rotation) * (STAND_SIZE.depth / 2 + 1),
        s.z + Math.cos(s.rotation) * (STAND_SIZE.depth / 2 + 1),
      ];
      expect(distanceToCollider(standCollider(s), front[0], front[1])).toBeCloseTo(1);
      expect(nearestStand(front, scene.stands)).toBe(i);
      for (const c of colliders) expect(distanceToCollider(c, front[0], front[1])).toBeGreaterThan(0.35);
    });
  });
});

describe('input', () => {
  it('joystick: dead zone, clamping and direction (screen y down = backward)', () => {
    expect(joystickVector(5, 0, 50)).toEqual({ x: 0, y: 0 });
    const up = joystickVector(0, -100, 50);
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(1);
    const back = joystickVector(0, 30, 50); // 0.6 of the radius, dead zone 0.15
    expect(back.y).toBeCloseTo(-(0.6 - 0.15) / 0.85);
    const diag = joystickVector(100, 100, 50);
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
    expect(joystickVector(10, 10, 0)).toEqual({ x: 0, y: 0 });
  });

  it('knob drawing offset is clamped to the radius', () => {
    expect(clampKnob(30, 40, 100)).toEqual([30, 40]);
    const [x, y] = clampKnob(60, 80, 50);
    expect(x).toBeCloseTo(30);
    expect(y).toBeCloseTo(40);
  });

  it('keys: WASD and arrows, diagonals normalised, opposite keys cancel', () => {
    expect(keysToVector(new Set(['KeyW']))).toEqual({ x: 0, y: 1 });
    expect(keysToVector(new Set(['ArrowLeft']))).toEqual({ x: -1, y: 0 });
    const d = keysToVector(new Set(['KeyW', 'KeyD']));
    expect(d.x).toBeCloseTo(Math.SQRT1_2);
    expect(d.y).toBeCloseTo(Math.SQRT1_2);
    expect(keysToVector(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 });
    expect(keysToVector(new Set(['KeyQ']))).toEqual({ x: 0, y: 0 });
  });

  it('combines keyboard and joystick without exceeding length 1', () => {
    const c = combineInput({ x: 1, y: 0 }, { x: 0, y: 1 });
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(1);
    expect(combineInput({ x: 0.2, y: 0 }, { x: 0, y: 0.3 })).toEqual({ x: 0.2, y: 0.3 });
  });

  it('forward is north (-z); heading and turning take the shorter way', () => {
    const [x, z] = inputToWorld({ x: 0, y: 1 });
    expect(x).toBe(0);
    expect(z).toBe(-1);
    expect(headingOf(0, 1)).toBeCloseTo(0);
    expect(headingOf(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(turnTowards(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnTowards(3, -3, 0.1)).toBeCloseTo(3.1); // through ±π (0.28 rad away), not back through 0
    expect(turnTowards(3, -3, 0.5)).toBe(-3); // within one step: snaps to the target
    expect(turnTowards(1, 1.1, 0.5)).toBe(1.1);
  });
});
