'use client';

/**
 * 3D hub map (tiers full and lite). Loaded ONLY through next/dynamic with ssr: false from
 * JelajahHub, so three.js never lands in other routes or in the 2d tier.
 *
 * Phase 28: the low-poly "paper" map. Islands = one merged slab mesh with baked lighting (MeshBasicMaterial);
 * the paper = one plane with a canvas texture; borders = one LineSegments. Full tier: one real shadow map,
 * re-rendered only when the islands change. Lite tier: the shadow is painted into the paper texture.
 * Fixed camera angle; drag/pinch to pan and wheel/pinch to zoom within limits; no rotation.
 */
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { PCFShadowMap, Plane, Raycaster, Vector2, Vector3, type DirectionalLight, type PerspectiveCamera } from 'three';
import { canvasSettings } from '@/lib/jelajah/device-tier';
import { hitTest, initialFrame, shapesBounds, type Bounds, type ProvinceShape } from '@/lib/jelajah/geo';
import { isClickable, maxProtCount, shapeFill, type MapViewProps } from '@/lib/jelajah/map-model';
import { facetColours, type MapPalette } from '@/lib/jelajah/palette';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { ENTERABLE_PROVINCES, markerLabel, PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { buildMapGeometry, LIGHT_DIR, paintShape, PAPER_SLAB, type MapGeometry } from '@/lib/jelajah/three/map-geometry';
import { drawPaper, PAPER, paperArea, paperTexture, shadowMode } from '@/lib/jelajah/three/paper';
import { StatsOverlay, StatsProbe, type DebugStats } from './three/StatsProbe';

const IS_DEV = process.env.NODE_ENV === 'development';
const FOV = 35;
/** Camera tilt from straight down (fixed). */
const TILT = (32 * Math.PI) / 180;
/** Slab heights: provinces that open a card stand taller than the muted ones. */
const HEIGHT_MUTED = 0.26;
const HEIGHT_ACTIVE = 0.42;
const PICK_Y = 0.36;
const MIN_DISTANCE = 7;

type Tier = 'full' | 'lite';

export interface Map3DProps extends MapViewProps {
  tier: Tier;
  /** ?debug=1: stats overlay and continuous rendering (Phase 13). */
  debug: boolean;
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

/** Colours of one province for its current state. */
function shapePaint(
  shape: ProvinceShape,
  props: Pick<MapViewProps, 'summaryByKode' | 'hoveredKode' | 'selectedKode' | 'palette'>,
  maxCount: number,
) {
  const { palette } = props;
  const fill = shapeFill(shape, props.summaryByKode, maxCount, palette, props.hoveredKode, props.selectedKode);
  const muted = !isClickable(shape.kode, props.summaryByKode);
  return {
    tops: facetColours(palette, fill, muted),
    wallTop: palette.earthTop,
    wallBottom: palette.earthBottom,
    water: palette.water,
    rockLight: palette.rockLight,
    rockDark: palette.rockDark,
    crater: palette.crater,
  };
}

function Islands({
  geometry,
  shapes,
  summaryByKode,
  hoveredKode,
  selectedKode,
  palette,
  tier,
}: Pick<MapViewProps, 'summaryByKode' | 'hoveredKode' | 'selectedKode' | 'palette'> & {
  geometry: MapGeometry;
  shapes: readonly ProvinceShape[];
  tier: Tier;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const maxCount = maxProtCount(summaryByKode);
  useEffect(() => {
    shapes.forEach((shape, i) =>
      paintShape(geometry, i, shapePaint(shape, { summaryByKode, hoveredKode, selectedKode, palette }, maxCount)),
    );
    invalidate();
  }, [geometry, shapes, summaryByKode, maxCount, palette, hoveredKode, selectedKode, invalidate]);

  return (
    <>
      <mesh geometry={geometry.surface} castShadow={shadowMode(tier) === 'map'}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <lineSegments geometry={geometry.outline}>
        <lineBasicMaterial color={palette.outline} transparent opacity={0.55} />
      </lineSegments>
    </>
  );
}

/** The paper plane; full tier: lit, receives the shadow map; lite: unlit, the shadow is in the texture. */
function Paper({
  bounds,
  shapes,
  palette,
  tier,
}: {
  bounds: Bounds;
  shapes: readonly ProvinceShape[];
  palette: MapPalette;
  tier: Tier;
}) {
  const area = useMemo(() => paperArea(bounds), [bounds]);
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = drawPaper(palette, area, {
      px: tier === 'full' ? 2048 : 1024,
      shadowShapes: shadowMode(tier) === 'baked' ? shapes : null,
      shadowHeight: HEIGHT_ACTIVE,
    });
    return paperTexture(canvas);
  }, [palette, area, tier, shapes]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const cx = (area.minX + area.maxX) / 2;
  const cy = (area.minY + area.maxY) / 2;
  return (
    <mesh rotation-x={-Math.PI / 2} position={[cx, -0.002, -cy]} receiveShadow={shadowMode(tier) === 'map'}>
      <planeGeometry args={[PAPER.width, PAPER.depth]} />
      {shadowMode(tier) === 'map' ? <meshLambertMaterial map={texture} /> : <meshBasicMaterial map={texture} />}
    </mesh>
  );
}

/**
 * Full tier: the key light with ONE shadow map over the archipelago. The shadow map is rendered only when the
 * islands change (`autoUpdate` off), so a still map costs only the paper's shadow lookups.
 * Paper brightness: ambient + key · n·L = π (three's Lambert divides by π), so lit paper shows its texture colour.
 */
function KeyLight({ bounds, tier, version }: { bounds: Bounds; tier: Tier; version: unknown }) {
  const get = useThree((s) => s.get);
  const light = useRef<DirectionalLight>(null);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = -(bounds.minY + bounds.maxY) / 2;
  const distance = 60;
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(cx, 0, cz);
    l.target.updateMatrixWorld();
    if (shadowMode(tier) === 'map') {
      // `autoUpdate` is off (Canvas `shadows` prop): render the shadow map once for this state of the islands.
      const state = get();
      state.gl.shadowMap.needsUpdate = true;
      state.invalidate();
    }
  }, [get, cx, cz, tier, version]);
  const ambient = Math.PI * 0.64;
  const key = (Math.PI * 0.36) / LIGHT_DIR[1];
  return (
    <>
      <ambientLight intensity={ambient} color="#FFF8EE" />
      <directionalLight
        ref={light}
        position={[cx + LIGHT_DIR[0] * distance, LIGHT_DIR[1] * distance, cz + LIGHT_DIR[2] * distance]}
        intensity={key}
        color="#FFF1DC"
        castShadow={shadowMode(tier) === 'map'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={20}
        shadow-camera-far={110}
        shadow-radius={5}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
    </>
  );
}

/** Pointer picking on the ground plane with a point-in-polygon test (cheaper than raycasting the slabs). */
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
 * Used to keep the marker buttons of the enterable provinces (Phase 22; before: the pilot), plain DOM elements,
 * over their provinces.
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

export default function Map3D(props: Map3DProps) {
  const { tier, shapes: sourceShapes, palette } = props;
  const settings = canvasSettings(tier);
  // Phase 28: the low-poly outline (borders shared by two provinces simplified once); picking uses it too, so what
  // is drawn is what is clicked.
  const shapes = useMemo(() => lowPolyShapes(sourceShapes), [sourceShapes]);
  const bounds = useMemo(() => shapesBounds(shapes), [shapes]);
  const heightsKey = shapes.map((s) => (isClickable(s.kode, props.summaryByKode) ? '1' : '0')).join('');
  const geometry = useMemo(
    () =>
      buildMapGeometry(
        shapes,
        heightsKey.split('').map((c) => (c === '1' ? HEIGHT_ACTIVE : HEIGHT_MUTED)),
        PAPER_SLAB,
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
  const [stats, setStats] = useState<DebugStats | null>(null);
  const showStats = IS_DEV || props.debug;
  // Phase 22: a marker for every enterable province ("★ Pilot" for the pilot, "★ Desa" for the others).
  const markers = useMemo(
    () =>
      ENTERABLE_PROVINCES.flatMap((p) => {
        const shape = shapes.find((s) => s.kode === p.kode);
        return shape ? [{ province: p, shape }] : [];
      }),
    [shapes],
  );
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const moveMarker = (kode: string) => (x: number, y: number, visible: boolean) => {
    const el = markerRefs.current.get(kode);
    if (!el) return;
    el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.visibility = visible ? 'visible' : 'hidden';
  };

  return (
    <div className="absolute inset-0" style={{ background: palette.paperEdge }}>
      <Canvas
        key={tier}
        dpr={settings.dpr}
        gl={{ antialias: settings.antialias, powerPreference: 'default' }}
        flat
        shadows={shadowMode(tier) === 'map' ? { type: PCFShadowMap, autoUpdate: false } : false}
        // Production renders on demand (battery); development and ?debug=1 render continuously so the fps
        // overlay measures real frame cost.
        frameloop={showStats ? 'always' : 'demand'}
        camera={{ fov: FOV, near: 1, far: 400, position: [0, 60, 40] }}
        aria-label="Peta 3D provinsi Indonesia"
        role="img"
      >
        <color attach="background" args={[palette.paperEdge]} />
        <KeyLight bounds={bounds} tier={tier} version={geometry} />
        <Paper bounds={bounds} shapes={shapes} palette={palette} tier={tier} />
        <Islands
          geometry={geometry}
          shapes={shapes}
          summaryByKode={props.summaryByKode}
          hoveredKode={props.hoveredKode}
          selectedKode={props.selectedKode}
          palette={palette}
          tier={tier}
        />
        {markers.map(({ province, shape }) => (
          <TrackScreenPoint
            key={province.kode}
            position={[shape.anchor[0], HEIGHT_ACTIVE, -shape.anchor[1]]}
            onMove={moveMarker(province.kode)}
          />
        ))}
        <Picker
          shapes={shapes}
          summaryByKode={props.summaryByKode}
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
        <Controls bounds={bounds} />
        {showStats && <StatsProbe onStats={setStats} />}
      </Canvas>
      {markers.map(({ province }) => (
        <button
          key={province.kode}
          ref={(el) => {
            if (el) markerRefs.current.set(province.kode, el);
            else markerRefs.current.delete(province.kode);
          }}
          type="button"
          onClick={() => props.onSelect(province.kode)}
          style={{ visibility: 'hidden' }}
          className="absolute left-0 top-0 z-10 flex flex-col items-center focus:outline-none [&:focus-visible>span]:ring-accent"
          aria-label={`${province.nama}, ${province.kode === PILOT_PROVINCE.kode ? 'provinsi pilot' : 'desa virtual'}`}
          data-marker={province.slug}
        >
          <span className="whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-md ring-2 ring-background">
            {markerLabel(province.kode)}
          </span>
          <span className="h-2.5 w-0.5 bg-primary" aria-hidden />
        </button>
      ))}
      {props.debug && stats && <StatsOverlay stats={stats} tier={tier} className="right-3 top-1/2 -translate-y-1/2" />}
    </div>
  );
}
