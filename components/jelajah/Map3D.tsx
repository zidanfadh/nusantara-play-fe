'use client';

/**
 * 3D hub map (tiers full and lite). Loaded ONLY through next/dynamic with ssr: false from
 * JelajahHub, so three.js never lands in other routes or in the 2d tier.
 *
 * Draw calls: sea 1 + provinces 1 (merged) + borders 1. Fixed camera angle; drag/pinch to pan and
 * wheel/pinch to zoom within limits; no rotation.
 */
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { RenderStats } from '@/lib/jelajah/budget';
import { canvasSettings } from '@/lib/jelajah/device-tier';
import { hitTest, initialFrame, shapesBounds, type Bounds } from '@/lib/jelajah/geo';
import { isClickable, maxProtCount, shapeFill, type MapViewProps } from '@/lib/jelajah/map-model';
import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { buildMapGeometry, paintRange } from '@/lib/jelajah/three/map-geometry';
import { StatsOverlay, StatsProbe } from './three/StatsProbe';

const IS_DEV = process.env.NODE_ENV === 'development';
const FOV = 35;
/** Camera tilt from straight down (fixed). */
const TILT = (32 * Math.PI) / 180;
const HEIGHT_MUTED = 0.12;
const HEIGHT_ACTIVE = 0.3;
const PICK_Y = 0.2;
const MIN_DISTANCE = 7;

export interface Map3DProps extends MapViewProps {
  tier: 'full' | 'lite';
}

/** Camera distance that fits the whole map into the viewport at the fixed tilt. */
function fitDistance(bounds: Bounds, aspect: number): number {
  const halfV = Math.tan(((FOV / 2) * Math.PI) / 180);
  const width = bounds.maxX - bounds.minX;
  const depth = (bounds.maxY - bounds.minY) * Math.cos(TILT);
  return Math.max(width / 2 / (halfV * aspect), depth / 2 / halfV) * 1.08;
}

function cameraOffset(distance: number): Vector3 {
  return new Vector3(0, Math.cos(TILT) * distance, Math.sin(TILT) * distance);
}

function Provinces({
  shapes,
  summaryByKode,
  hoveredKode,
  selectedKode,
  palette,
}: Pick<MapViewProps, 'shapes' | 'summaryByKode' | 'hoveredKode' | 'selectedKode' | 'palette'>) {
  const invalidate = useThree((s) => s.invalidate);
  const heightsKey = shapes
    .map((s) => (isClickable(s.kode, summaryByKode) ? '1' : '0'))
    .join('');
  const geometry = useMemo(
    () =>
      buildMapGeometry(
        shapes,
        heightsKey.split('').map((c) => (c === '1' ? HEIGHT_ACTIVE : HEIGHT_MUTED)),
      ),
    [shapes, heightsKey],
  );
  useEffect(
    () => () => {
      geometry.surface.dispose();
      geometry.outline.dispose();
    },
    [geometry],
  );

  const maxCount = maxProtCount(summaryByKode);
  useEffect(() => {
    shapes.forEach((shape, i) =>
      paintRange(
        geometry.surface,
        geometry.ranges[i],
        shapeFill(shape, summaryByKode, maxCount, palette, hoveredKode, selectedKode),
      ),
    );
    invalidate();
  }, [geometry, shapes, summaryByKode, maxCount, palette, hoveredKode, selectedKode, invalidate]);

  return (
    <>
      <mesh geometry={geometry.surface}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <lineSegments geometry={geometry.outline}>
        <lineBasicMaterial color={palette.outline} />
      </lineSegments>
    </>
  );
}

/** Pointer picking on the ground plane with a point-in-polygon test (cheaper than raycasting 40k triangles). */
function Picker({
  shapes,
  summaryByKode,
  onHover,
  onSelect,
}: Pick<MapViewProps, 'shapes' | 'summaryByKode' | 'onHover' | 'onSelect'>) {
  const { camera, gl } = useThree();
  const latest = useRef({ shapes, summaryByKode, onHover, onSelect });
  useEffect(() => {
    latest.current = { shapes, summaryByKode, onHover, onSelect };
  });

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), -PICK_Y);
    const ndc = new Vector2();
    const hit = new Vector3();
    const active = new Set<number>();
    let down: { x: number; y: number; t: number; multi: boolean } | null = null;
    let lastHover: string | null = null;

    const pick = (e: PointerEvent): string | null => {
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      const { shapes: list, summaryByKode: summaries } = latest.current;
      const index = hitTest(list, [hit.x, -hit.z]);
      const kode = index >= 0 ? list[index].kode : null;
      return isClickable(kode, summaries) ? kode : null;
    };

    const setHover = (kode: string | null) => {
      if (kode === lastHover) return;
      lastHover = kode;
      el.style.cursor = kode ? 'pointer' : '';
      latest.current.onHover(kode);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && active.size === 0) setHover(pick(e));
    };
    const onDown = (e: PointerEvent) => {
      active.add(e.pointerId);
      if (active.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false };
      else if (down) down.multi = true;
    };
    const onUp = (e: PointerEvent) => {
      active.delete(e.pointerId);
      if (!down || active.size > 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      const wasMulti = down.multi;
      down = null;
      if (wasMulti || moved > 8 || !quick) return;
      const kode = pick(e);
      if (e.pointerType !== 'mouse') setHover(kode);
      latest.current.onSelect(kode);
    };
    const onCancel = (e: PointerEvent) => {
      active.delete(e.pointerId);
      down = null;
    };
    const onLeave = () => setHover(null);

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = '';
    };
  }, [camera, gl]);

  return null;
}

/** Fixed-angle pan/zoom with the target clamped to the map bounds. */
function Controls({ bounds }: { bounds: Bounds }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useRef<ComponentRef<typeof MapControls>>(null);
  const aspect = size.width / Math.max(1, size.height);
  const maxDistance = fitDistance(bounds, aspect) * 1.15;

  // Initial framing (and again when the viewport shape changes a lot, e.g. phone rotation).
  const aspectBucket = Math.round(aspect * 4);
  useEffect(() => {
    const c = controls.current;
    const frame = initialFrame(bounds, aspect);
    const cx = (frame.minX + frame.maxX) / 2;
    const cz = -(frame.minY + frame.maxY) / 2;
    const target = new Vector3(cx, 0, cz);
    camera.position.copy(target).add(cameraOffset(fitDistance(frame, aspect)));
    camera.lookAt(target);
    if (c) {
      c.target.copy(target);
      c.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, aspectBucket, camera]);

  const clamp = () => {
    const c = controls.current;
    if (!c) return;
    const x = Math.min(bounds.maxX, Math.max(bounds.minX, c.target.x));
    const z = Math.min(-bounds.minY, Math.max(-bounds.maxY, c.target.z));
    const dx = x - c.target.x;
    const dz = z - c.target.z;
    if (dx !== 0 || dz !== 0) {
      c.target.x += dx;
      c.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
    }
  };

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableRotate={false}
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning={false}
      minDistance={MIN_DISTANCE}
      maxDistance={maxDistance}
      zoomToCursor
      onChange={clamp}
    />
  );
}

/**
 * Reports the screen position of a 3D point on every rendered frame (so it follows pan and zoom).
 * Used to keep the pilot marker button, a plain DOM element, over its province.
 */
function TrackScreenPoint({
  position,
  onMove,
}: {
  position: [number, number, number];
  onMove: (x: number, y: number, visible: boolean) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    point.set(...position).project(camera);
    const visible = point.z < 1 && Math.abs(point.x) <= 1.05 && Math.abs(point.y) <= 1.05;
    onMove(((point.x + 1) / 2) * size.width, ((1 - point.y) / 2) * size.height, visible);
  });
  return null;
}

function SceneColors({ sea, seaDeep }: { sea: string; seaDeep: string }) {
  return (
    <>
      <color attach="background" args={[seaDeep]} />
      <fog attach="fog" args={[seaDeep, 120, 320]} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.06}>
        <planeGeometry args={[600, 600]} />
        <meshLambertMaterial color={sea} />
      </mesh>
    </>
  );
}

export default function Map3D(props: Map3DProps) {
  const { tier, shapes, palette } = props;
  const settings = canvasSettings(tier);
  const bounds = useMemo(() => shapesBounds(shapes), [shapes]);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const pilot = shapes.find((s) => s.kode === PILOT_PROVINCE.kode);
  const pilotRef = useRef<HTMLButtonElement>(null);
  const movePilotMarker = (x: number, y: number, visible: boolean) => {
    const el = pilotRef.current;
    if (!el) return;
    el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.visibility = visible ? 'visible' : 'hidden';
  };

  return (
    <div className="absolute inset-0">
      <Canvas
        key={tier}
        dpr={settings.dpr}
        gl={{ antialias: settings.antialias, powerPreference: 'default' }}
        // Production renders on demand (battery); development renders continuously so the fps
        // overlay measures real frame cost.
        frameloop={IS_DEV ? 'always' : 'demand'}
        camera={{ fov: FOV, near: 0.5, far: 400, position: [0, 60, 40] }}
        aria-label="Peta 3D provinsi Indonesia"
        role="img"
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[-30, 60, 40]} intensity={1.4} />
        <SceneColors sea={palette.sea} seaDeep={palette.seaDeep} />
        <Provinces
          shapes={shapes}
          summaryByKode={props.summaryByKode}
          hoveredKode={props.hoveredKode}
          selectedKode={props.selectedKode}
          palette={palette}
        />
        {pilot && (
          <TrackScreenPoint
            position={[pilot.anchor[0], HEIGHT_ACTIVE, -pilot.anchor[1]]}
            onMove={movePilotMarker}
          />
        )}
        <Picker
          shapes={shapes}
          summaryByKode={props.summaryByKode}
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
        <Controls bounds={bounds} />
        {IS_DEV && <StatsProbe onStats={setStats} />}
      </Canvas>
      {pilot && (
        <button
          ref={pilotRef}
          type="button"
          onClick={() => props.onSelect(PILOT_PROVINCE.kode)}
          style={{ visibility: 'hidden' }}
          className="absolute left-0 top-0 z-10 flex flex-col items-center focus:outline-none [&:focus-visible>span]:ring-accent"
          aria-label={`${PILOT_PROVINCE.nama}, provinsi pilot`}
        >
          <span className="whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-md ring-2 ring-background">
            ★ Pilot
          </span>
          <span className="h-2.5 w-0.5 bg-primary" aria-hidden />
        </button>
      )}
      {IS_DEV && stats && <StatsOverlay stats={stats} tier={tier} className="left-3 top-28" />}
    </div>
  );
}
