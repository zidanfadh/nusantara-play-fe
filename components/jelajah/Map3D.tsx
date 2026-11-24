'use client';

/**
 * 3D hub map (tiers full and lite). Loaded ONLY through next/dynamic with ssr: false from
 * JelajahHub, so three.js never lands in other routes or in the 2d tier.
 *
 * Phase 28: the low-poly "paper" map (design reference: Konsep Visual page 4). Draw calls: paper 1, islands 1 (one
 * merged mesh with mountains, volcanoes, rivers and lakes, lighting baked into the vertex colours), seams 1, rim 0–2
 * (hovered / selected), smoke 1, ships 1 (full tier), plus the shadow pass on the full tier (rendered only when the
 * islands change). Lite: the shadow is painted into the paper, no ships, no rivers, fewer mountains.
 * States without relying on colour: hover = the province lifts + amber rim; selected = higher lift + rim +
 * terracotta tint; provinces with PROT stand taller than the others; enterable provinces carry a flag pin.
 * Fixed tilted camera framing the whole archipelago; drag/pinch to pan, wheel/pinch to zoom within limits.
 */
import { useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { DoubleSide, PCFShadowMap, Plane, Raycaster, Vector2, Vector3, type DirectionalLight, type PerspectiveCamera } from 'three';
import { canvasSettings } from '@/lib/jelajah/device-tier';
import { hitTest, shapesBounds, type Bounds, type ProvinceShape } from '@/lib/jelajah/geo';
import { isClickable, maxProtCount, provinceCues, shapeFill, type MapViewProps } from '@/lib/jelajah/map-model';
import { ambientMode, NATURE_FULL, NATURE_LITE, placeNature } from '@/lib/jelajah/map-nature';
import { facetColours, type MapPalette } from '@/lib/jelajah/palette';
import { cameraPosition, frameMap, MAP_FOV, zoomLimits } from '@/lib/jelajah/paper-camera';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { ENTERABLE_PROVINCES, markerLabel, PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import {
  buildMapGeometry,
  buildRim,
  liftShape,
  LIGHT_DIR,
  paintShape,
  PAPER_SLAB,
  type MapGeometry,
} from '@/lib/jelajah/three/map-geometry';
import { drawPaper, PAPER, paperArea, paperTexture, shadowMode } from '@/lib/jelajah/three/paper';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { AmbientTicker, Ships, Smoke } from './three/MapLife';
import { StatsOverlay, StatsProbe, type DebugStats } from './three/StatsProbe';

const IS_DEV = process.env.NODE_ENV === 'development';
/** Slab heights: provinces that open a card (PROT or enterable) stand taller than the muted ones. */
export const HEIGHT_MUTED = 0.26;
export const HEIGHT_ACTIVE = 0.42;
const RIM_WIDTH = 0.09;
const PICK_Y = 0.38;

type Tier = 'full' | 'lite';

export interface Map3DProps extends MapViewProps {
  tier: Tier;
  /** ?debug=1: stats overlay and continuous rendering (Phase 13). */
  debug: boolean;
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
    tops: facetColours(palette, fill, muted, shape.kode !== null && shape.kode === props.selectedKode),
    wallTop: palette.earthTop,
    wallBottom: palette.earthBottom,
    water: palette.water,
    rockLight: palette.rockLight,
    rockDark: palette.rockDark,
    crater: palette.crater,
  };
}

/** The lift of every shape in a state (only clickable provinces have one). */
function stateLifts(
  shapes: readonly ProvinceShape[],
  summaryByKode: MapViewProps['summaryByKode'],
  hoveredKode: string | null,
  selectedKode: string | null,
): Map<number, number> {
  const lifts = new Map<number, number>();
  shapes.forEach((s, i) => {
    const { lift } = provinceCues(s.kode, summaryByKode, hoveredKode, selectedKode);
    if (lift > 0) lifts.set(i, lift);
  });
  return lifts;
}

function Islands({
  geometry,
  shapes,
  heights,
  summaryByKode,
  hoveredKode,
  selectedKode,
  palette,
  tier,
  liftsRef,
}: Pick<MapViewProps, 'summaryByKode' | 'hoveredKode' | 'selectedKode' | 'palette'> & {
  geometry: MapGeometry;
  shapes: readonly ProvinceShape[];
  heights: readonly number[];
  tier: Tier;
  liftsRef: RefObject<Map<number, number>>;
}) {
  const get = useThree((s) => s.get);
  const maxCount = maxProtCount(summaryByKode);
  useEffect(() => {
    shapes.forEach((shape, i) =>
      paintShape(geometry, i, shapePaint(shape, { summaryByKode, hoveredKode, selectedKode, palette }, maxCount)),
    );
    get().invalidate();
  }, [geometry, shapes, summaryByKode, maxCount, palette, hoveredKode, selectedKode, get]);

  // Lift the hovered / selected province (only the changed ranges are touched and uploaded).
  const target = useMemo(
    () => stateLifts(shapes, summaryByKode, hoveredKode, selectedKode),
    [shapes, summaryByKode, hoveredKode, selectedKode],
  );
  useEffect(() => {
    const previous = liftsRef.current;
    for (const i of previous.keys()) if (!target.has(i)) liftShape(geometry, i, 0);
    for (const [i, dy] of target) if (previous.get(i) !== dy) liftShape(geometry, i, dy);
    liftsRef.current = new Map(target);
    const state = get();
    if (shadowMode(tier) === 'map') state.gl.shadowMap.needsUpdate = true;
    state.invalidate();
  }, [geometry, target, tier, liftsRef, get]);
  // A new geometry starts flat: forget the lifts of the old one.
  useEffect(() => () => liftsRef.current.clear(), [geometry, liftsRef]);

  // Rims of the hovered and the selected province, above their highest facet.
  const rims = useMemo(
    () =>
      [...target].map(([i, lift]) => ({
        key: `${i}-${lift}`,
        geometry: buildRim(shapes[i], heights[i] + PAPER_SLAB.noise + lift + 0.014, RIM_WIDTH),
      })),
    [target, shapes, heights],
  );
  useEffect(() => () => rims.forEach((r) => r.geometry.dispose()), [rims]);

  return (
    <>
      <mesh geometry={geometry.surface} castShadow={shadowMode(tier) === 'map'}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <lineSegments geometry={geometry.outline}>
        <lineBasicMaterial color={palette.outline} transparent opacity={0.55} />
      </lineSegments>
      {rims.map((r) => (
        <mesh key={r.key} geometry={r.geometry} renderOrder={2}>
          <meshBasicMaterial color={palette.rim} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
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
 * Warm key light + soft ambient. Full tier: ONE shadow map over the archipelago, rendered only when the islands change
 * (`autoUpdate` off), so a still map costs only the paper's shadow lookups. The islands' lighting is baked; only the
 * paper (full), ships and smoke are lit. Paper brightness: ambient + key · n·L = π (three's Lambert divides by π), so
 * lit paper shows its texture colour.
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
    const state = get();
    if (shadowMode(tier) === 'map') state.gl.shadowMap.needsUpdate = true;
    state.invalidate();
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

/**
 * Fixed-angle pan/zoom. The first view frames the whole archipelago (lib/jelajah/paper-camera.ts, tested for portrait
 * phones, landscape phones and desktop); zoom out stops a little beyond that, zoom in at MIN_DISTANCE; the target stays
 * over the map.
 */
function Controls({ bounds }: { bounds: Bounds }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useRef<ComponentRef<typeof MapControls>>(null);
  const aspect = size.width / Math.max(1, size.height);
  // Initial framing (and again when the viewport shape changes a lot, e.g. phone rotation).
  const aspectBucket = Math.round(aspect * 8);
  const limits = useMemo(() => zoomLimits(bounds, aspect), [bounds, aspectBucket]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = controls.current;
    const pose = frameMap(bounds, aspect);
    camera.position.set(...cameraPosition(pose));
    camera.lookAt(...pose.target);
    if (c) {
      c.target.set(...pose.target);
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
      minDistance={limits.min}
      maxDistance={limits.max}
      zoomToCursor
      onChange={clamp}
    />
  );
}

/**
 * Reports the screen position of a 3D point on every rendered frame (so it follows pan, zoom and the lift).
 * Used to keep the marker buttons of the enterable provinces (Phase 22; before: the pilot), plain DOM elements,
 * over their provinces.
 */
function TrackScreenPoint({
  position,
  onMove,
}: {
  position: () => [number, number, number];
  onMove: (x: number, y: number, visible: boolean) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    point.set(...position()).project(camera);
    const visible = point.z < 1 && Math.abs(point.x) <= 1.05 && Math.abs(point.y) <= 1.05;
    onMove(((point.x + 1) / 2) * size.width, ((1 - point.y) / 2) * size.height, visible);
  });
  return null;
}

/** ?debug=1 only: `window.__nlMap.point(kode)` = the province anchor in client pixels (screenshots, recordings). */
function DebugHook({ shapes, heights }: { shapes: readonly ProvinceShape[]; heights: readonly number[] }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const w = window as unknown as { __nlMap?: unknown };
    w.__nlMap = {
      point: (kode: string) => {
        const i = shapes.findIndex((s) => s.kode === kode);
        if (i < 0) return null;
        const v = new Vector3(shapes[i].anchor[0], heights[i], -shapes[i].anchor[1]).project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
      },
    };
    return () => {
      delete w.__nlMap;
    };
  }, [shapes, heights, camera, gl]);
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
  const heights = useMemo(() => heightsKey.split('').map((c) => (c === '1' ? HEIGHT_ACTIVE : HEIGHT_MUTED)), [heightsKey]);
  // Phase 28 nature: lite has fewer mountains and no rivers or lakes.
  const nature = useMemo(() => placeNature(shapes, tier === 'full' ? NATURE_FULL : NATURE_LITE), [shapes, tier]);
  const geometry = useMemo(() => buildMapGeometry(shapes, heights, PAPER_SLAB, nature), [shapes, heights, nature]);
  useEffect(
    () => () => {
      geometry.surface.dispose();
      geometry.outline.dispose();
    },
    [geometry],
  );
  // Ships and moving smoke only on the full tier and never with reduced motion (Phase 28).
  const ambient = ambientMode(tier, useReducedMotion());
  /** Current lift per shape index (hover / selected), read by the smoke and the markers every frame. */
  const liftsRef = useRef(new Map<number, number>());
  const [stats, setStats] = useState<DebugStats | null>(null);
  const showStats = IS_DEV || props.debug;
  // Phase 22: a marker for every enterable province ("★ Pilot" for the pilot, "★ Desa" for the others).
  const markers = useMemo(
    () =>
      ENTERABLE_PROVINCES.flatMap((p) => {
        const index = shapes.findIndex((s) => s.kode === p.kode);
        return index >= 0 ? [{ province: p, shape: shapes[index], index }] : [];
      }),
    [shapes],
  );
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const moveMarker = (kode: string) => (x: number, y: number, visible: boolean) => {
    const el = markerRefs.current.get(kode);
    if (!el) return;
    el.style.transform = `translate(-1px, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
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
        // overlay measures real frame cost. Ships and smoke ask for ~30 frames per second (AmbientTicker).
        frameloop={showStats ? 'always' : 'demand'}
        camera={{ fov: MAP_FOV, near: 1, far: 500, position: [0, 60, 40] }}
        aria-label="Peta 3D provinsi Indonesia"
        role="img"
      >
        <color attach="background" args={[palette.paperEdge]} />
        <KeyLight bounds={bounds} tier={tier} version={geometry} />
        <Paper bounds={bounds} shapes={shapes} palette={palette} tier={tier} />
        <Islands
          geometry={geometry}
          shapes={shapes}
          heights={heights}
          summaryByKode={props.summaryByKode}
          hoveredKode={props.hoveredKode}
          selectedKode={props.selectedKode}
          palette={palette}
          tier={tier}
          liftsRef={liftsRef}
        />
        {ambient.ships !== 'none' && <Ships palette={palette} moving={ambient.ships === 'sailing'} />}
        <Smoke vents={geometry.vents} liftsRef={liftsRef} palette={palette} moving={ambient.smoke === 'rising'} />
        <AmbientTicker active={ambient.animate && !showStats} />
        {markers.map(({ province, shape, index }) => (
          <TrackScreenPoint
            key={province.kode}
            position={() => [
              shape.anchor[0],
              heights[index] + PAPER_SLAB.noise + (liftsRef.current.get(index) ?? 0),
              -shape.anchor[1],
            ]}
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
        {props.debug && <DebugHook shapes={shapes} heights={heights} />}
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
          className="group absolute left-0 top-0 z-10 flex flex-col items-start focus:outline-none"
          aria-label={`${province.nama}, ${province.kode === PILOT_PROVINCE.kode ? 'provinsi pilot' : 'desa virtual'}`}
          aria-pressed={props.selectedKode === province.kode}
          data-marker={province.slug}
        >
          {/* A terracotta flag on a pole (Phase 28): #B4500F with cream text (4.67:1), cream border on both papers. */}
          <span className="whitespace-nowrap rounded-md rounded-bl-none border-[1.5px] border-brand-cream bg-brand-terracotta-600 px-1.5 py-px text-[10px] font-bold leading-[14px] text-brand-cream sm:px-2 sm:py-0.5 sm:text-xs sm:leading-4 shadow-md transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-focus-ring group-focus-visible:ring-offset-1 group-aria-pressed:-translate-y-0.5">
            {markerLabel(province.kode)}
          </span>
          <span className="h-3.5 w-[2px]" style={{ background: palette.earthTop }} aria-hidden />
          <span className="-ml-[2px] h-1.5 w-1.5 rounded-full" style={{ background: palette.earthTop }} aria-hidden />
        </button>
      ))}
      {props.debug && stats && <StatsOverlay stats={stats} tier={tier} className="right-3 top-1/2 -translate-y-1/2" />}
    </div>
  );
}
