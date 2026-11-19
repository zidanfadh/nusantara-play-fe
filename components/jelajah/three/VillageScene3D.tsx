'use client';

/**
 * Walkable 3D province scene (Phase 11, tiers full and lite). Loaded ONLY through next/dynamic with
 * ssr: false from ProvinceExperience, so three.js never lands in other routes or in the 2d tier.
 *
 * Draw calls (full tier, Sumatera Selatan): 1 merged village mesh (ground, plaza, paths, banks,
 * houses, stands) + 1 water + 1 per Nature Kit model type (instanced, vertex colours) + 1 blob
 * shadows + 1 per stand sign (sprite) + the player (2 skinned meshes + 2 silhouette fills + 2 silhouette
 * edges + 1 blob). The plaza centrepiece is part of the merged mesh. No realtime shadows.
 *
 * Phase 12: framed follow camera (lib/jelajah/engine/camera.ts) with a short entry glide, a silhouette in
 * the site's primary colour with an edge, and cheap ambient life (water shimmer, palm sway, canoe bob) on
 * the full tier only, never with prefers-reduced-motion.
 */
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useGLTF, useProgress } from '@react-three/drei';
import {
  AddEquation,
  BackSide,
  CustomBlending,
  DoubleSide,
  Euler,
  GreaterDepth,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NotEqualStencilFunc,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Quaternion,
  ReplaceStencilOp,
  SkinnedMesh,
  SrcAlphaFactor,
  Sprite,
  SpriteMaterial,
  Vector3,
  type AnimationAction,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from 'three';
import { canvasSettings } from '@/lib/jelajah/device-tier';
import { frameCamera, INTRO_SECONDS, introPose, smoothDamp, spawnFramePoints, type DampState } from '@/lib/jelajah/engine/camera';
import { resolveMove, sceneColliders, STAND_SIZE } from '@/lib/jelajah/engine/collision';
import {
  combineInput,
  headingOf,
  inputToWorld,
  keysToVector,
  MOVEMENT_CODES,
  turnTowards,
  ZERO_INPUT,
  type InputVector,
} from '@/lib/jelajah/engine/input';
import type { SceneProt } from '@/lib/jelajah/engine/scene-prot';
import { nearestTarget } from '@/lib/jelajah/engine/pavilion';
import type { StandContent } from '@/lib/jelajah/engine/stands';
import type { DecorDef, NatureModel, SceneDefinition, Vec2 } from '@/lib/jelajah/scenes/types';
import { SIGN_CENTER_Y, SIGN_HEIGHT, SIGN_WIDTH } from '@/lib/jelajah/engine/sign-text';
import { createBlobTexture, createSignTexture, type SignContent } from '@/lib/jelajah/three/canvas-textures';
import { bakeModel } from '@/lib/jelajah/three/model-bake';
import { buildVillageGeometry, buildWaterGeometry } from '@/lib/jelajah/three/village-geometry';
import { AutoFallbackProbe, StatsOverlay, StatsProbe, type DebugStats } from './StatsProbe';

const IS_DEV = process.env.NODE_ENV === 'development';
const PLAYER_SCALE = 2.5;
const WALK_SPEED = 4.2; // m/s at full input
const TURN_SPEED = 10; // rad/s
/** Camera follow smoothing (seconds, critically damped). */
const FOLLOW_SMOOTH_TIME = 0.16;
/** Hidden-player silhouette: the site's primary colour (light theme --color-primary) and a light edge. */
const SILHOUETTE_COLOR = '#9E3C24';
const SILHOUETTE_OPACITY = 0.82;
const SILHOUETTE_EDGE_COLOR = '#FFF1DC';
/** Edge width in metres (view space). */
const SILHOUETTE_EDGE_WIDTH = 0.055;

export interface VillageScene3DProps {
  scene: SceneDefinition;
  tier: 'full' | 'lite';
  stands: readonly StandContent<SceneProt>[];
  /** Joystick input, written by the DOM joystick. */
  joystickRef: MutableRefObject<InputVector>;
  /** True while a panel is open: movement keys are ignored. */
  paused: boolean;
  onNearStand: (index: number | null) => void;
  /** Phase 17: the player is near the game pavilion (closer to it than to any stand). */
  onNearPavilion?: (near: boolean) => void;
  /** E (or Enter on the canvas) pressed. */
  onInteract: () => void;
  onReady: () => void;
  /** prefers-reduced-motion: no entry glide and no ambient animation. */
  reducedMotion: boolean;
  /** ?debug=1: fps, draw calls, triangles, tier, pixel ratio and canvas size overlay (Phase 13). */
  debug: boolean;
  /** Set only while the tier is automatic: called once when the frame rate stays too low (Phase 13). */
  onAutoFallback?: (to: 'lite' | '2d') => void;
}

function signContent(content: StandContent<SceneProt>): SignContent {
  if (content.kind === 'prot') return { kind: 'prot', title: content.prot.nama };
  if (content.kind === 'board') return { kind: 'board', names: content.prots.map((p) => p.nama), total: content.prots.length };
  return { kind: 'empty' };
}

function markInstancesDirty(mesh: InstancedMesh) {
  mesh.instanceMatrix.needsUpdate = true;
}

/** Instances whose transform is animated (palms sway, the canoe bobs). Plain numbers, set up once. */
interface AnimatedInstances {
  mesh: InstancedMesh;
  kind: 'palm' | 'canoe';
  items: { x: number; y: number; z: number; rotation: number; scale: number; phase: number }[];
}

/** Static village: merged procedural mesh, water, instanced Nature Kit models and blob shadows. */
function World({ scene, tier, animate }: { scene: SceneDefinition; tier: 'full' | 'lite'; animate: boolean }) {
  const { scene: nature } = useGLTF(scene.assets.nature, false, true);

  const village = useMemo(() => buildVillageGeometry(scene), [scene]);
  const water = useMemo(() => buildWaterGeometry(scene, tier === 'full'), [scene, tier]);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  const decor = useMemo(() => scene.decor.filter((d) => tier === 'full' || !d.detail), [scene, tier]);
  const waterRef = useRef<Mesh>(null);

  const { meshes: instanced, animated } = useMemo(() => {
    const byModel = new Map<NatureModel, DecorDef[]>();
    for (const d of decor) byModel.set(d.model, [...(byModel.get(d.model) ?? []), d]);
    const meshes: InstancedMesh[] = [];
    const animatedList: AnimatedInstances[] = [];
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    for (const [model, items] of byModel) {
      const node = nature.getObjectByName(model);
      if (!node) continue;
      const geometry = bakeModel(node, scene.colors.materials);
      const mesh = new InstancedMesh(geometry, material, items.length);
      items.forEach((d, i) => {
        const s = scene.modelScale * (d.scale ?? 1);
        q.setFromAxisAngle(up, d.rotation ?? 0);
        mesh.setMatrixAt(i, m.compose(new Vector3(d.x, d.y ?? 0, d.z), q, new Vector3(s, s, s)));
      });
      mesh.computeBoundingSphere();
      mesh.name = model;
      meshes.push(mesh);
      const kind = model.startsWith('tree_palm') ? 'palm' : model === 'canoe' ? 'canoe' : null;
      if (kind) {
        animatedList.push({
          mesh,
          kind,
          items: items.map((d, i) => ({
            x: d.x,
            y: d.y ?? 0,
            z: d.z,
            rotation: d.rotation ?? 0,
            scale: scene.modelScale * (d.scale ?? 1),
            phase: (d.x * 0.37 + d.z * 0.61 + i) % (Math.PI * 2),
          })),
        });
      }
    }
    return { meshes, animated: animatedList };
  }, [nature, decor, scene, material]);

  // Ambient life (full tier, no reduced motion). Scratch objects are reused: no allocations per frame.
  const scratch = useMemo(
    () => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), p: new Vector3(), s: new Vector3() }),
    [],
  );
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    const w = waterRef.current;
    if (w) {
      (w.material as MeshLambertMaterial).color.setScalar(1 + 0.05 * Math.sin(t * 1.3));
      w.position.x = Math.sin(t * 0.21) * 0.9; // the streaks drift back and forth (the river is 160 m wide)
    }
    const { m, q, e, p, s } = scratch;
    for (const a of animated) {
      for (let i = 0; i < a.items.length; i += 1) {
        const d = a.items[i];
        if (a.kind === 'palm') {
          e.set(Math.sin(t * 0.8 + d.phase) * 0.035, d.rotation, Math.cos(t * 0.63 + d.phase) * 0.03);
          p.set(d.x, d.y, d.z);
        } else {
          e.set(Math.sin(t * 1.1 + d.phase) * 0.03, d.rotation, Math.sin(t * 1.4 + d.phase) * 0.05);
          p.set(d.x, d.y + Math.sin(t * 1.6 + d.phase) * 0.05, d.z);
        }
        q.setFromEuler(e);
        s.setScalar(d.scale);
        a.mesh.setMatrixAt(i, m.compose(p, q, s));
      }
      markInstancesDirty(a.mesh);
    }
  });

  // Blob shadows under houses, stands and the larger models.
  const blobs = useMemo(() => {
    const spots: { x: number; z: number; w: number; d: number; rot: number }[] = [];
    for (const h of scene.houses) spots.push({ x: h.x, z: h.z, w: h.width + 1.4, d: h.depth + 1.6, rot: h.rotation });
    for (const s of scene.stands) spots.push({ x: s.x, z: s.z, w: STAND_SIZE.width + 1, d: STAND_SIZE.depth + 1, rot: s.rotation });
    const c = scene.centrepiece;
    if (c) spots.push({ x: c.x, z: c.z, w: c.size + 2.2, d: c.size + 2.2, rot: c.rotation });
    for (const d of decor) {
      if (!/^tree_|bamboo|bushLarge|log_stack|rock_large/.test(d.model)) continue;
      const r = (d.model.startsWith('tree_') ? 1.6 : 1.1) * (d.scale ?? 1);
      spots.push({ x: d.x, z: d.z, w: r * 1.8, d: r * 1.8, rot: d.rotation ?? 0 });
    }
    const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const blobMaterial = new MeshBasicMaterial({
      color: '#3b2a1a',
      alphaMap: createBlobTexture(),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const mesh = new InstancedMesh(geometry, blobMaterial, spots.length);
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    spots.forEach((s, i) => {
      q.setFromAxisAngle(up, s.rot);
      mesh.setMatrixAt(i, m.compose(new Vector3(s.x, 0.045, s.z), q, new Vector3(s.w, 1, s.d)));
    });
    mesh.renderOrder = 1;
    mesh.computeBoundingSphere();
    return mesh;
  }, [scene, decor]);

  useEffect(
    () => () => {
      village.dispose();
      water.dispose();
    },
    [village, water],
  );
  useEffect(
    () => () => {
      for (const mesh of instanced) mesh.geometry.dispose();
    },
    [instanced],
  );
  useEffect(
    () => () => {
      blobs.geometry.dispose();
      const mat = blobs.material as MeshBasicMaterial;
      mat.alphaMap?.dispose();
      mat.dispose();
    },
    [blobs],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <>
      <mesh geometry={village} material={material} />
      <mesh ref={waterRef} geometry={water}>
        <meshLambertMaterial vertexColors />
      </mesh>
      {instanced.map((mesh) => (
        <primitive key={mesh.name} object={mesh} />
      ))}
      <primitive object={blobs} />
    </>
  );
}

/** One canvas-texture sprite per stand, above its roof. */
function Signs({ scene, stands }: { scene: SceneDefinition; stands: readonly StandContent<SceneProt>[] }) {
  const sprites = useMemo(
    () =>
      scene.stands.map((s, i) => {
        const content = stands[i] ?? { kind: 'empty' };
        const material = new SpriteMaterial({ map: createSignTexture(signContent(content)), transparent: true });
        const sprite = new Sprite(material);
        sprite.position.set(s.x, SIGN_CENTER_Y, s.z);
        sprite.scale.set(SIGN_WIDTH, SIGN_HEIGHT, 1);
        return sprite;
      }),
    [scene, stands],
  );
  useEffect(
    () => () => {
      for (const s of sprites) {
        s.material.map?.dispose();
        s.material.dispose();
      }
    },
    [sprites],
  );
  return (
    <>
      {sprites.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
    </>
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** The player: model + animations, movement with colliders, fixed-pitch follow camera, proximity. */
function Player({
  scene,
  tier,
  joystickRef,
  paused,
  onNearStand,
  onNearPavilion,
  onInteract,
  reducedMotion,
}: Pick<VillageScene3DProps, 'scene' | 'tier' | 'joystickRef' | 'paused' | 'onNearStand' | 'onNearPavilion' | 'onInteract' | 'reducedMotion'>) {
  const gltf = useGLTF(scene.assets.player, false, true);
  const group = useRef<Group>(null);
  const blob = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, group);
  const size = useThree((s) => s.size);
  const colliders = useMemo(() => sceneColliders(scene, tier === 'full'), [scene, tier]);
  const state = useRef({
    pos: [scene.spawn.x, scene.spawn.z] as Vec2,
    heading: scene.spawn.rotation,
    moving: false,
    near: null as number | null,
    nearPavilion: false,
    snapped: false,
  });
  const keys = useRef(new Set<string>());
  const latest = useRef({ paused, onNearStand, onNearPavilion, onInteract });
  useEffect(() => {
    latest.current = { paused, onNearStand, onNearPavilion, onInteract };
  });
  const blobTexture = useMemo(() => createBlobTexture(), []);
  useEffect(() => () => blobTexture.dispose(), [blobTexture]);

  useEffect(() => {
    const skinned: SkinnedMesh[] = [];
    gltf.scene.traverse((o) => {
      o.frustumCulled = false; // skinned meshes: the bind-pose bounds do not follow the animation
      if (o instanceof SkinnedMesh) skinned.push(o);
    });
    // Silhouette where the player is hidden behind a roof or a house (Phase 11, restyled in Phase 12):
    // copies of each skinned mesh (sharing the skeleton) that draw only where they are BEHIND the depth
    // buffer. Order in the opaque pass: scene (0) → fill (1) → edge (1.5) → player (2), so both are
    // tested against the scene only, never against the player's own body.
    // - Fill: the site's primary colour at a fixed opacity. It stays in the opaque pass (transparent:
    //   false) but blends through CustomBlending; the stencil makes every pixel blend only once, so
    //   overlapping body parts do not get darker.
    // - Edge: the same mesh pushed out along its normals (view space), drawn only outside the fill
    //   (stencil), as a light outline around the shape.
    const fill = new MeshBasicMaterial({
      color: SILHOUETTE_COLOR,
      opacity: SILHOUETTE_OPACITY,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: SrcAlphaFactor,
      blendDst: OneMinusSrcAlphaFactor,
      depthWrite: false,
      depthFunc: GreaterDepth,
      toneMapped: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: NotEqualStencilFunc,
      stencilZPass: ReplaceStencilOp,
    });
    const edge = new MeshBasicMaterial({
      color: SILHOUETTE_EDGE_COLOR,
      side: BackSide,
      depthWrite: false,
      depthFunc: GreaterDepth,
      toneMapped: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: NotEqualStencilFunc,
      stencilZPass: ReplaceStencilOp,
    });
    edge.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        mvPosition.xyz += normalize( normalMatrix * objectNormal ) * ${SILHOUETTE_EDGE_WIDTH.toFixed(3)};
        gl_Position = projectionMatrix * mvPosition;`,
      );
    };
    const copies = skinned.flatMap((mesh) => {
      mesh.renderOrder = 2;
      return [
        [fill, 1],
        [edge, 1.5],
      ].map(([material, order]) => {
        const copy = mesh.clone();
        copy.material = material as MeshBasicMaterial;
        copy.renderOrder = order as number;
        mesh.parent?.add(copy);
        return copy;
      });
    });
    return () => {
      for (const c of copies) c.removeFromParent();
      fill.dispose();
      edge.dispose();
    };
  }, [gltf.scene]);

  useEffect(() => {
    actions.idle?.reset().play();
  }, [actions]);

  useEffect(() => {
    const pressed = keys.current;
    const onDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (MOVEMENT_CODES.has(e.code)) {
        if (latest.current.paused) return;
        pressed.add(e.code);
        if (e.code.startsWith('Arrow')) e.preventDefault(); // no page scroll while walking
        return;
      }
      const onCanvas = e.target === document.body || e.target instanceof HTMLCanvasElement;
      if (!latest.current.paused && (e.code === 'KeyE' || (e.code === 'Enter' && onCanvas))) {
        if (state.current.near !== null || state.current.nearPavilion) {
          e.preventDefault();
          latest.current.onInteract();
        }
      }
    };
    const onUp = (e: KeyboardEvent) => pressed.delete(e.code);
    const clear = () => pressed.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useEffect(() => {
    if (paused) keys.current.clear();
  }, [paused]);

  // Framing: the player in the lower third, the two nearest stands and every sign on screen at the spawn
  // point; closer camera and wider field of view on portrait phones (lib/jelajah/engine/camera.ts).
  const framePoints = useMemo(() => spawnFramePoints(scene), [scene]);
  const frame = useMemo(
    () => frameCamera(size.width / Math.max(1, size.height), framePoints),
    [size.width, size.height, framePoints],
  );

  // Entry glide from a higher view (full tier only, never with reduced motion); any input skips it.
  const intro = useRef({ active: tier === 'full' && !reducedMotion, elapsed: 0 });
  useEffect(() => {
    if (!intro.current.active) return;
    const skip = () => {
      intro.current.active = false;
    };
    const events = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
    for (const e of events) window.addEventListener(e, skip, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, skip);
    };
  }, []);
  const follow = useRef<{ x: DampState; z: DampState }>({ x: { value: 0, velocity: 0 }, z: { value: 0, velocity: 0 } });

  const setAction = (moving: boolean, strength: number) => {
    const walk = actions.walk as AnimationAction | null | undefined;
    const idle = actions.idle as AnimationAction | null | undefined;
    walk?.setEffectiveTimeScale(0.8 + strength * 0.9);
    if (moving === state.current.moving) return;
    state.current.moving = moving;
    const from = moving ? idle : walk;
    const to = moving ? walk : idle;
    to?.reset().fadeIn(0.18).play();
    from?.fadeOut(0.18);
  };

  useFrame((three, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const cam = three.camera as PerspectiveCamera;
    if (cam.fov !== frame.fov) {
      cam.fov = frame.fov;
      cam.updateProjectionMatrix();
    }
    const s = state.current;
    const input = latest.current.paused ? ZERO_INPUT : combineInput(keysToVector(keys.current), joystickRef.current);
    const strength = Math.hypot(input.x, input.y);
    const moving = strength > 0.02;
    if (moving) {
      const [dx, dz] = inputToWorld(input);
      const step = WALK_SPEED * strength * dt;
      s.pos = resolveMove(s.pos, [(dx / strength) * step, (dz / strength) * step], colliders, scene.walkable);
      s.heading = turnTowards(s.heading, headingOf(dx, dz), TURN_SPEED * dt);
    }
    setAction(moving, strength);

    const g = group.current;
    if (g) {
      g.position.set(s.pos[0], 0, s.pos[1]);
      g.rotation.y = s.heading;
    }
    blob.current?.position.set(s.pos[0], 0.05, s.pos[1]);

    // Camera: a critically damped focus point (no jitter at low frame rates) at a constant offset,
    // constant pitch, no rotation around the vertical axis. No allocations per frame.
    const f = follow.current;
    if (!s.snapped) {
      f.x.value = s.pos[0];
      f.z.value = s.pos[1];
      s.snapped = true;
    } else {
      smoothDamp(f.x, s.pos[0], FOLLOW_SMOOTH_TIME, dt);
      smoothDamp(f.z, s.pos[1], FOLLOW_SMOOTH_TIME, dt);
    }
    let pitch = frame.pitch;
    let off = frame.offset;
    const i = intro.current;
    if (i.active) {
      if (moving) i.active = false;
      else {
        i.elapsed += dt;
        const pose = introPose(frame, i.elapsed);
        pitch = pose.pitch;
        off = pose.offset;
        if (pose.done) i.active = false;
      }
    }
    cam.position.set(f.x.value + off.x, off.y, f.z.value + off.z);
    cam.rotation.set(-pitch, 0, 0);

    const target = nearestTarget(s.pos, scene);
    if (target.stand !== s.near) {
      s.near = target.stand;
      latest.current.onNearStand(target.stand);
    }
    if (target.pavilion !== s.nearPavilion) {
      s.nearPavilion = target.pavilion;
      latest.current.onNearPavilion?.(target.pavilion);
    }
  });

  return (
    <>
      <group ref={group} scale={PLAYER_SCALE}>
        <primitive object={gltf.scene} />
      </group>
      <group ref={blob}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshBasicMaterial color="#2e2014" alphaMap={blobTexture} transparent opacity={0.45} depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
    </>
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/** Loading screen with the progress of the asset downloads (drei useProgress). */
function LoadingScreen({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  if (ready) return null;
  const pct = Math.round(progress);
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 text-foreground">
      <p className="text-sm font-medium">Memuat desa…</p>
      <div
        className="h-2 w-48 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Memuat aset 3D"
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{pct}%</p>
    </div>
  );
}

export default function VillageScene3D(props: VillageScene3DProps) {
  const { scene, tier } = props;
  const settings = canvasSettings(tier);
  const [ready, setReady] = useState(false);
  // Start both downloads at once (Suspense would otherwise request them one after the other).
  useState(() => {
    useGLTF.preload(scene.assets.nature, false, true);
    useGLTF.preload(scene.assets.player, false, true);
    return true;
  });
  const [stats, setStats] = useState<DebugStats | null>(null);
  const { onReady, onAutoFallback } = props;
  const showStats = IS_DEV || props.debug;
  const handleReady = useMemo(
    () => () => {
      setReady(true);
      onReady();
    },
    [onReady],
  );

  return (
    <div className="absolute inset-0">
      <Canvas
        key={tier}
        dpr={settings.dpr}
        gl={{ antialias: settings.antialias, powerPreference: 'default', stencil: true }}
        camera={{ fov: 50, near: 0.5, far: 140, position: [0, 10, 25] }}
        aria-label={`Desa virtual 3D ${scene.nama}`}
        role="img"
        tabIndex={0}
      >
        <color attach="background" args={[scene.colors.background]} />
        <fog attach="fog" args={[scene.colors.background, 34, 80]} />
        <ambientLight color={scene.colors.ambient} intensity={1.45} />
        <directionalLight color={scene.colors.sun} position={[-22, 20, 14]} intensity={1.3} />
        <Suspense fallback={null}>
          <World scene={scene} tier={tier} animate={tier === 'full' && !props.reducedMotion} />
          <Signs scene={scene} stands={props.stands} />
          <Player
            scene={scene}
            tier={tier}
            joystickRef={props.joystickRef}
            paused={props.paused}
            onNearStand={props.onNearStand}
            onNearPavilion={props.onNearPavilion}
            onInteract={props.onInteract}
            reducedMotion={props.reducedMotion}
          />
          <ReadySignal onReady={handleReady} />
          {onAutoFallback && (
            // Mounted with the scene (assets loaded); measures after the entry glide.
            <AutoFallbackProbe
              tier={tier}
              startAfterMs={tier === 'full' && !props.reducedMotion ? INTRO_SECONDS * 1000 : 0}
              onFallback={(to) => to !== 'full' && onAutoFallback(to)}
            />
          )}
        </Suspense>
        {showStats && <StatsProbe onStats={setStats} />}
      </Canvas>
      <LoadingScreen ready={ready} />
      {props.debug && stats && <StatsOverlay stats={stats} tier={tier} className="right-3 top-1/2 -translate-y-1/2" />}
    </div>
  );
}
