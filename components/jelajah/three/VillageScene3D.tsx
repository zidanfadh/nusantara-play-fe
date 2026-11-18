'use client';

/**
 * Walkable 3D province scene (Phase 11, tiers full and lite). Loaded ONLY through next/dynamic with
 * ssr: false from ProvinceExperience, so three.js never lands in other routes or in the 2d tier.
 *
 * Draw calls (full tier, Sumatera Selatan): 1 merged village mesh (ground, plaza, paths, banks,
 * houses, stands) + 1 water + 1 per Nature Kit model type (instanced, vertex colours) + 1 blob
 * shadows + 1 per stand sign (sprite) + the player (2 skinned meshes + 2 occlusion silhouettes + 1 blob).
 * No realtime shadows.
 */
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useGLTF, useProgress } from '@react-three/drei';
import {
  DoubleSide,
  GreaterDepth,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  SkinnedMesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  type AnimationAction,
  type Group,
  type PerspectiveCamera,
} from 'three';
import type { RenderStats } from '@/lib/jelajah/budget';
import { canvasSettings } from '@/lib/jelajah/device-tier';
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
import { nearestStand, type StandContent } from '@/lib/jelajah/engine/stands';
import type { DecorDef, NatureModel, SceneDefinition, Vec2 } from '@/lib/jelajah/scenes/types';
import { createBlobTexture, createSignTexture, SIGN_CANVAS, type SignContent } from '@/lib/jelajah/three/canvas-textures';
import { bakeModel } from '@/lib/jelajah/three/model-bake';
import { buildVillageGeometry, buildWaterGeometry, STAND_ROOF_TOP } from '@/lib/jelajah/three/village-geometry';
import { StatsOverlay, StatsProbe } from './StatsProbe';

const IS_DEV = process.env.NODE_ENV === 'development';
const FOV = 45;
/** Camera offset from the player: fixed pitch (about 40° down), never rotates. */
const CAMERA_OFFSET = new Vector3(0, 13.5, 15.5);
const PLAYER_SCALE = 2.5;
const WALK_SPEED = 4.2; // m/s at full input
const TURN_SPEED = 10; // rad/s
const SIGN_WIDTH = 2.9;

export interface VillageScene3DProps {
  scene: SceneDefinition;
  tier: 'full' | 'lite';
  stands: readonly StandContent<SceneProt>[];
  /** Joystick input, written by the DOM joystick. */
  joystickRef: MutableRefObject<InputVector>;
  /** True while a panel is open: movement keys are ignored. */
  paused: boolean;
  onNearStand: (index: number | null) => void;
  /** E (or Enter on the canvas) pressed. */
  onInteract: () => void;
  onReady: () => void;
}

function signContent(content: StandContent<SceneProt>): SignContent {
  if (content.kind === 'prot') return { kind: 'prot', title: content.prot.nama };
  if (content.kind === 'board') return { kind: 'board', names: content.prots.map((p) => p.nama), total: content.prots.length };
  return { kind: 'empty' };
}

/** Static village: merged procedural mesh, water, instanced Nature Kit models and blob shadows. */
function World({ scene, tier }: { scene: SceneDefinition; tier: 'full' | 'lite' }) {
  const { scene: nature } = useGLTF(scene.assets.nature, false, true);

  const village = useMemo(() => buildVillageGeometry(scene), [scene]);
  const water = useMemo(() => buildWaterGeometry(scene, tier === 'full'), [scene, tier]);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);
  const decor = useMemo(() => scene.decor.filter((d) => tier === 'full' || !d.detail), [scene, tier]);

  const instanced = useMemo(() => {
    const byModel = new Map<NatureModel, DecorDef[]>();
    for (const d of decor) byModel.set(d.model, [...(byModel.get(d.model) ?? []), d]);
    const meshes: InstancedMesh[] = [];
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
    }
    return meshes;
  }, [nature, decor, scene, material]);

  // Blob shadows under houses, stands and the larger models.
  const blobs = useMemo(() => {
    const spots: { x: number; z: number; w: number; d: number; rot: number }[] = [];
    for (const h of scene.houses) spots.push({ x: h.x, z: h.z, w: h.width + 1.4, d: h.depth + 1.6, rot: h.rotation });
    for (const s of scene.stands) spots.push({ x: s.x, z: s.z, w: STAND_SIZE.width + 1, d: STAND_SIZE.depth + 1, rot: s.rotation });
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
      <mesh geometry={water}>
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
        sprite.position.set(s.x, STAND_ROOF_TOP + 0.95, s.z);
        sprite.scale.set(SIGN_WIDTH, (SIGN_WIDTH * SIGN_CANVAS.height) / SIGN_CANVAS.width, 1);
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
  onInteract,
}: Pick<VillageScene3DProps, 'scene' | 'tier' | 'joystickRef' | 'paused' | 'onNearStand' | 'onInteract'>) {
  const gltf = useGLTF(scene.assets.player, false, true);
  const group = useRef<Group>(null);
  const blob = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, group);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const colliders = useMemo(() => sceneColliders(scene, tier === 'full'), [scene, tier]);
  const state = useRef({
    pos: [scene.spawn.x, scene.spawn.z] as Vec2,
    heading: scene.spawn.rotation,
    moving: false,
    near: null as number | null,
    focus: new Vector3(scene.spawn.x, 0, scene.spawn.z),
    snapped: false,
  });
  const keys = useRef(new Set<string>());
  const latest = useRef({ paused, onNearStand, onInteract });
  useEffect(() => {
    latest.current = { paused, onNearStand, onInteract };
  });
  const blobTexture = useMemo(() => createBlobTexture(), []);
  useEffect(() => () => blobTexture.dispose(), [blobTexture]);

  useEffect(() => {
    const skinned: SkinnedMesh[] = [];
    gltf.scene.traverse((o) => {
      o.frustumCulled = false; // skinned meshes: the bind-pose bounds do not follow the animation
      if (o instanceof SkinnedMesh) skinned.push(o);
    });
    // Silhouette where the player is hidden behind a roof or a house: a copy of each skinned mesh
    // (sharing the skeleton) that draws only where it is BEHIND the depth buffer (+2 draw calls).
    // Order in the opaque pass: scene (0) → silhouette (1) → player (2), so the silhouette is tested
    // against the scene only, never against the player's own body (no pale patches on the player).
    const ghostMaterial = new MeshBasicMaterial({
      color: '#F3DFC1',
      depthWrite: false,
      depthFunc: GreaterDepth,
    });
    const ghosts = skinned.map((mesh) => {
      const ghost = mesh.clone();
      ghost.material = ghostMaterial;
      ghost.renderOrder = 1;
      mesh.renderOrder = 2;
      mesh.parent?.add(ghost);
      return ghost;
    });
    return () => {
      for (const g of ghosts) g.removeFromParent();
      ghostMaterial.dispose();
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
        if (state.current.near !== null) {
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

  const offset = useMemo(() => {
    // Narrow (portrait) screens: step back a little so the plaza still fits.
    const aspect = size.width / Math.max(1, size.height);
    return CAMERA_OFFSET.clone().multiplyScalar(aspect < 0.65 ? 1.7 : aspect < 0.9 ? 1.4 : aspect < 1.2 ? 1.12 : 1);
  }, [size.width, size.height]);

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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
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

    // Camera: follow a smoothed focus point at a constant offset (constant pitch, no rotation).
    const target = new Vector3(s.pos[0], 0, s.pos[1]);
    if (!s.snapped) {
      s.focus.copy(target);
      s.snapped = true;
    } else {
      s.focus.lerp(target, 1 - Math.exp(-dt * 7));
    }
    camera.position.copy(s.focus).add(offset);
    camera.lookAt(s.focus.x, s.focus.y + 1.1, s.focus.z);

    const near = nearestStand(s.pos, scene.stands);
    if (near !== s.near) {
      s.near = near;
      latest.current.onNearStand(near);
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
  const [stats, setStats] = useState<RenderStats | null>(null);
  const { onReady } = props;
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
        gl={{ antialias: settings.antialias, powerPreference: 'default' }}
        camera={{ fov: FOV, near: 0.5, far: 140, position: [0, 10, 25] }}
        aria-label={`Desa virtual 3D ${scene.nama}`}
        role="img"
        tabIndex={0}
      >
        <color attach="background" args={[scene.colors.background]} />
        <fog attach="fog" args={[scene.colors.background, 34, 80]} />
        <ambientLight color={scene.colors.ambient} intensity={1.45} />
        <directionalLight color={scene.colors.sun} position={[-22, 20, 14]} intensity={1.3} />
        <Suspense fallback={null}>
          <World scene={scene} tier={tier} />
          <Signs scene={scene} stands={props.stands} />
          <Player
            scene={scene}
            tier={tier}
            joystickRef={props.joystickRef}
            paused={props.paused}
            onNearStand={props.onNearStand}
            onInteract={props.onInteract}
          />
          <ReadySignal onReady={handleReady} />
        </Suspense>
        {IS_DEV && <StatsProbe onStats={setStats} />}
      </Canvas>
      <LoadingScreen ready={ready} />
      {IS_DEV && stats && <StatsOverlay stats={stats} tier={tier} className="bottom-3 right-3" />}
    </div>
  );
}
