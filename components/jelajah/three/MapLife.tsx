'use client';

/**
 * Ambient life on the paper map (Phase 28): sailing ships (one InstancedMesh) and volcano smoke (one InstancedMesh).
 *
 * - `moving` (full tier, no reduced motion): ships sail their loops and bob, smoke rises; the map then renders at
 *   about 30 frames per second through `AmbientTicker` (it renders on demand otherwise, as before).
 * - not moving (reduced motion, or the lite tier's smoke): everything is placed once, at fixed phases, and never
 *   animates; ships stay docked at the start of their route.
 * Imported only by Map3D (three.js isolation).
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Matrix4, Object3D, type InstancedMesh } from 'three';
import { loopPoint, shipLoops, smokePuff } from '@/lib/jelajah/map-nature';
import type { MapPalette } from '@/lib/jelajah/palette';
import type { MapGeometry } from '@/lib/jelajah/three/map-geometry';
import { puffGeometry, SHIP_SCALE, shipGeometry } from '@/lib/jelajah/three/ships';

/** Ship speed in map units per second (a loop takes one to two minutes). */
const SHIP_SPEED = 0.3;
const PUFFS_PER_VENT = 3;

/** Asks for a frame about 30 times a second while `active` (the canvas renders on demand). */
export function AmbientTicker({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, 33);
    return () => window.clearInterval(id);
  }, [active, invalidate]);
  return null;
}

export function Ships({ palette, moving }: { palette: MapPalette; moving: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => shipGeometry(palette), [palette]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const loops = useMemo(() => {
    return shipLoops().map((pts, n) => {
      let length = 0;
      let prev = loopPoint(pts, 0).p;
      for (let s = 1; s <= 200; s += 1) {
        const p = loopPoint(pts, s / 200).p;
        length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
      }
      return { pts, period: length / SHIP_SPEED, offset: n * 0.37 };
    });
  }, []);
  const dummy = useMemo(() => new Object3D(), []);

  const place = (seconds: number, still: boolean) => {
    const m = mesh.current;
    if (!m) return;
    loops.forEach((loop, n) => {
      const t = still ? loop.offset % 1 : seconds / loop.period + loop.offset;
      const { p, tangent } = loopPoint(loop.pts, t);
      const bob = still ? 0 : Math.sin(seconds * 1.7 + n) * 0.025;
      dummy.position.set(p[0], 0.01 + bob, -p[1]);
      dummy.rotation.set(still ? 0 : Math.sin(seconds * 1.3 + n * 2) * 0.05, Math.atan2(tangent[1], tangent[0]), 0, 'YXZ');
      dummy.scale.setScalar(SHIP_SCALE);
      dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    place(0, !moving);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, geometry]);
  useFrame(({ clock }) => {
    if (moving) place(clock.elapsedTime, false);
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, loops.length]} frustumCulled={false}>
      <meshLambertMaterial vertexColors flatShading side={DoubleSide} />
    </instancedMesh>
  );
}

export function Smoke({
  vents,
  lifts,
  palette,
  moving,
}: {
  vents: MapGeometry['vents'];
  /** Current lift of each shape (hover / selected), so the smoke rises from the lifted crater. */
  lifts: { current: ReadonlyMap<number, number> };
  palette: MapPalette;
  moving: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => puffGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const dummy = useMemo(() => new Object3D(), []);
  const hidden = useMemo(() => new Matrix4().makeScale(0, 0, 0), []);
  const count = vents.length * PUFFS_PER_VENT;

  const place = (seconds: number, still: boolean) => {
    const m = mesh.current;
    if (!m) return;
    vents.forEach((vent, v) => {
      const lift = lifts.current.get(vent.shape) ?? 0;
      for (let k = 0; k < PUFFS_PER_VENT; k += 1) {
        const puff = smokePuff(k, PUFFS_PER_VENT, seconds + v * 1.9, still);
        const index = v * PUFFS_PER_VENT + k;
        if (puff.size <= 0.001) {
          m.setMatrixAt(index, hidden);
          continue;
        }
        dummy.position.set(vent.x + puff.drift, vent.y + lift + puff.rise, vent.z - puff.drift * 0.3);
        dummy.rotation.set(k * 0.9, v + k, 0);
        dummy.scale.setScalar(puff.size);
        dummy.updateMatrix();
        m.setMatrixAt(index, dummy.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    place(0, !moving);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, vents]);
  useFrame(({ clock }) => {
    if (moving) place(clock.elapsedTime, false);
    else place(0, true); // cheap; keeps the puffs on a lifted crater
  });

  if (count === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshLambertMaterial color={palette.smoke} flatShading />
    </instancedMesh>
  );
}
