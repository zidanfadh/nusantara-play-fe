'use client';

/**
 * Concept video player (Phase 19): "Kenali" + SITE_NAME, a code-driven motion-graphics film of eight
 * scenes (≈ 48 s) between the intro bumper and the /jelajah map. Loaded only through next/dynamic from
 * the hub when it will actually play.
 *
 * - ONE clock (`useConceptClock`, requestAnimationFrame) drives a MotionValue of the film time; scenes
 *   derive their transforms and opacities from it, so React renders only when a scene or caption changes.
 * - Controls: "Lewati" (always visible, Esc) skips; Enter/Space on the last scene (or "Mulai Menjelajah")
 *   continues; after the last scene the film continues to the map by itself FINAL_HOLD_MS later unless
 *   the viewer touched it. The clock pauses while the tab is hidden.
 * - Reduced motion: the same eight scenes as still frames with cross-fades, "Lanjut" or every 5 s; no
 *   particles, no camera moves.
 * - Accessibility: role="dialog" aria-modal, focus moves to the player and stays inside (Tab cycles), an
 *   aria-live="polite" region announces each caption; captions are real text.
 * - Particles only on the full/lite tiers (300/120), dropped for the rest of the film when the 2 s
 *   average frame rate falls below LOW_FPS. No audio (see CONCEPT_MUSIC in the script).
 */
import { AnimatePresence, motion, motionValue, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import type { JelajahData } from '@/lib/jelajah/data';
import type { Tier } from '@/lib/jelajah/device-tier';
import { FpsWindow } from '@/lib/jelajah/perf';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { layoutFor, type ConceptLayout } from '@/lib/jelajah/concept/layout';
import { archiveCards, liveArchiveSubcaption, type HubStatus } from '@/lib/jelajah/concept/live';
import { LOW_FPS, particleBudget } from '@/lib/jelajah/concept/particles';
import { ARCHIVE_CARD_COUNT, CONCEPT_SCENES, CONCEPT_TEXT, CONCEPT_TOTAL_MS } from '@/lib/jelajah/concept/script';
import { markConceptSeen } from '@/lib/jelajah/concept/seen';
import {
  CONCEPT_END_MS,
  REDUCED_END_MS,
  REDUCED_TOTAL_MS,
  midTime,
  mountedScenes,
  reducedIndexAt,
  sceneIndexAt,
  sceneOpacity,
  stillTime,
} from '@/lib/jelajah/concept/timeline';
import type { ConceptEndReason, ConceptSceneId } from '@/lib/jelajah/concept/types';
import { ParticleField } from './ParticleField';
import { ConceptDefs, useStyle, type SceneProps } from './scene-kit';
import { ArsipScene } from './scenes/ArsipScene';
import { BersamaScene } from './scenes/BersamaScene';
import { HalamanScene } from './scenes/HalamanScene';
import { JelajahScene } from './scenes/JelajahScene';
import { MainScene } from './scenes/MainScene';
import { MulaiScene } from './scenes/MulaiScene';
import { NusantaraScene } from './scenes/NusantaraScene';
import { TerlupaScene } from './scenes/TerlupaScene';
import { useConceptClock } from './use-concept-clock';

export interface ConceptVideoProps {
  data: JelajahData;
  status: HubStatus;
  /** The hub's render tier (particle budget); null while unknown = no particles. */
  tier: Tier | null;
  /** `?debug=1`: fps overlay and the seek hook in production. */
  debug: boolean;
  onClose: (reason: ConceptEndReason) => void;
  /** Called when the scene on screen changes (the hub mounts the 3D map once the last scene is reached). */
  onScene?: (index: number, last: boolean) => void;
}

/** Test hook (development, or `?debug=1`): `window.__nlConcept.seek(ms)` etc. */
export interface ConceptTestHook {
  seek: (ms: number) => void;
  pause: () => void;
  resume: () => void;
  time: () => number;
  scenes: { id: ConceptSceneId; start: number; duration: number; mid: number; still: number }[];
  reduced: boolean;
}

declare global {
  interface Window {
    __nlConcept?: ConceptTestHook;
  }
}

const LAST = CONCEPT_SCENES.length - 1;
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
/** Mark the film as seen once it has played this long (a quick navigation away does not count). */
const SEEN_AFTER_MS = 1000;

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function useLayout(): ConceptLayout {
  return useSyncExternalStore(
    subscribeResize,
    () => layoutFor(window.innerWidth, window.innerHeight),
    () => 'desktop',
  );
}

export default function ConceptVideo({ data, status, tier, debug, onClose, onScene }: ConceptVideoProps) {
  const reduced = useReducedMotion();
  const layout = useLayout();
  const endMs = reduced ? REDUCED_END_MS : CONCEPT_END_MS;
  const holdAt = reduced ? REDUCED_TOTAL_MS : CONCEPT_TOTAL_MS;

  const seenRef = useRef(false);
  const markSeen = useCallback(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    markConceptSeen();
  }, []);
  const close = useCallback(
    (reason: ConceptEndReason) => {
      markSeen();
      onClose(reason);
    },
    [markSeen, onClose],
  );
  const { time, controls } = useConceptClock(endMs, holdAt, close);

  // Scene index and the mounted scenes change only at boundaries: React state, updated from the clock.
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<number[]>([0]);
  const [lowFps, setLowFps] = useState(false);
  const [fpsShown, setFpsShown] = useState<number | null>(null);
  const fpsRef = useRef<FpsWindow | null>(null);
  const onSceneRef = useRef(onScene);
  useEffect(() => {
    onSceneRef.current = onScene;
  });

  useEffect(() => {
    let lastIndex = -1;
    let lastMounted = '';
    let lastFpsShown = 0;
    fpsRef.current ??= new FpsWindow();
    const fps = fpsRef.current;
    const update = (t: number) => {
      if (t >= SEEN_AFTER_MS) markSeen();
      const i = reduced ? reducedIndexAt(t) : sceneIndexAt(t);
      if (i !== lastIndex) {
        lastIndex = i;
        setIndex(i);
        onSceneRef.current?.(i, i === LAST);
      }
      const m = reduced ? [i] : mountedScenes(t);
      const key = m.join(',');
      if (key !== lastMounted) {
        lastMounted = key;
        setMounted(m);
      }
      const now = performance.now();
      fps.push(now);
      const avg = fps.fps(now);
      if (avg !== null && avg < LOW_FPS && !reduced) setLowFps(true);
      if (debug && now - lastFpsShown > 500) {
        lastFpsShown = now;
        setFpsShown(avg);
      }
    };
    const onVisibility = () => fps.reset();
    document.addEventListener('visibilitychange', onVisibility);
    const unsubscribe = time.on('change', update);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [time, reduced, debug, markSeen]);

  const budget = particleBudget(tier, { reduced, lowFps });
  const canvas = budget > 0;

  // The held last scene: any pointer or key (other than the continue keys) keeps it on screen.
  const touched = useCallback(() => {
    if (index === LAST) controls.hold();
  }, [index, controls]);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.focus();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        controls.skip();
        return;
      }
      const isContinue = e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';
      if (isContinue && index === LAST && !e.repeat) {
        // A focused button ("Lewati", "Mulai Menjelajah") is pressed natively instead.
        if (e.target instanceof Element && e.target.closest('button')) return;
        e.preventDefault();
        controls.finish();
        return;
      }
      if (!isContinue) touched();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [controls, index, touched]);

  // Test hook (deterministic screenshots and recordings): development, or ?debug=1 in production.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !debug) return;
    window.__nlConcept = {
      seek: controls.seek,
      pause: controls.pause,
      resume: controls.resume,
      time: controls.now,
      reduced,
      scenes: CONCEPT_SCENES.map((s, i) => ({ id: s.id, start: s.start, duration: s.duration, mid: midTime(i), still: stillTime(i) })),
    };
    return () => {
      delete window.__nlConcept;
    };
  }, [controls, debug, reduced]);

  // TODO(music): CONCEPT_MUSIC.src (lib/jelajah/concept/script.ts) is null in Phase 19. When a track is
  // added, start it here only after a user gesture, muted by default with a visible toggle; pause it with
  // the clock (tab hidden) and stop it on close. Never autoplay sound.

  const cards = useMemo(() => archiveCards(data, status, ARCHIVE_CARD_COUNT), [data, status]);
  const scene = CONCEPT_SCENES[index];
  const subcaption = scene.id === 'arsip' ? liveArchiveSubcaption(data, status) : scene.subcaption ?? null;

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !rootRef.current) return;
    const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const renderScene = (i: number, lt: MotionValue<number>, still: boolean) => {
    const props: SceneProps = { lt, layout, still, canvas: canvas && !still };
    switch (CONCEPT_SCENES[i].id) {
      case 'halaman':
        return <HalamanScene {...props} />;
      case 'terlupa':
        return <TerlupaScene {...props} />;
      case 'nusantara':
        return <NusantaraScene {...props} />;
      case 'arsip':
        return <ArsipScene {...props} cards={cards} />;
      case 'jelajah':
        return <JelajahScene {...props} />;
      case 'main':
        return <MainScene {...props} />;
      case 'bersama':
        return <BersamaScene {...props} />;
      default:
        return <MulaiScene {...props} onStart={controls.finish} />;
    }
  };

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={CONCEPT_TEXT.dialogLabel}
      tabIndex={-1}
      data-testid="concept-video"
      data-scene={scene.id}
      data-reduced={reduced ? '1' : undefined}
      className="fixed inset-0 z-[60] overflow-hidden bg-[#120F2A] font-sans text-white outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.35 } }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      onKeyDown={trapTab}
      onPointerDown={touched}
    >
      <ConceptDefs />
      <div className="absolute inset-0" aria-hidden={index === LAST ? undefined : true}>
        {reduced ? (
          <AnimatePresence initial={false}>
            <motion.div
              key={`still-${index}-${layout}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.6 } }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
            >
              <StillScene i={index} render={renderScene} />
            </motion.div>
          </AnimatePresence>
        ) : (
          mounted.map((i) => (
            <SceneLayer key={`${CONCEPT_SCENES[i].id}-${layout}`} i={i} time={time}>
              {(lt) => renderScene(i, lt, false)}
            </SceneLayer>
          ))
        )}
      </div>
      {canvas && <ParticleField time={time} count={budget} maxDpr={tier === 'full' ? 2 : 1.5} />}

      <Captions sceneKey={`${scene.id}`} caption={scene.caption} subcaption={subcaption} layout={layout} reduced={reduced} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {scene.caption}
        {subcaption ? ` ${subcaption}` : ''}
      </p>
      <p className="sr-only">{CONCEPT_TEXT.sceneOf(index + 1, CONCEPT_SCENES.length)}</p>

      {reduced && index < LAST && (
        <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[6] flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              controls.seek((index + 1) * (REDUCED_TOTAL_MS / CONCEPT_SCENES.length));
            }}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full bg-[#F7C95C] px-6 text-base font-bold text-[#3B1E0E] shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            {CONCEPT_TEXT.next} <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          controls.skip();
        }}
        aria-keyshortcuts="Escape"
        className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[7] inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:text-base"
      >
        {CONCEPT_TEXT.skip} <X className="h-4 w-4" aria-hidden />
      </button>

      <Progress time={time} total={reduced ? REDUCED_TOTAL_MS : CONCEPT_TOTAL_MS} />
      {debug && <DebugOverlay fps={fpsShown} tier={tier} particles={budget} layout={layout} time={time} />}
    </motion.div>
  );
}

function SceneLayer({ i, time, children }: { i: number; time: MotionValue<number>; children: (lt: MotionValue<number>) => ReactNode }) {
  const start = CONCEPT_SCENES[i].start;
  const lt = useTransform(time, (t) => t - start);
  const opacity = useTransform(time, (t) => sceneOpacity(i, t));
  return (
    <motion.div className="absolute inset-0" style={{ opacity, zIndex: i }}>
      {children(lt)}
    </motion.div>
  );
}

function StillScene({ i, render }: { i: number; render: (i: number, lt: MotionValue<number>, still: boolean) => ReactNode }) {
  const s = CONCEPT_SCENES[i];
  const [lt] = useState(() => motionValue(s.still * s.duration));
  return <>{render(i, lt, true)}</>;
}

function Captions({
  sceneKey,
  caption,
  subcaption,
  layout,
  reduced,
}: {
  sceneKey: string;
  caption: string;
  subcaption: string | null;
  layout: ConceptLayout;
  reduced: boolean;
}) {
  const pad = reduced ? 'pb-[calc(max(1.5rem,env(safe-area-inset-bottom))+3.75rem)]' : 'pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+0.75rem))]';
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex flex-col items-center px-[max(1rem,env(safe-area-inset-left))] ${pad} ${
        layout === 'landscape' ? 'pt-10' : 'pt-24'
      }`}
      style={{ background: 'linear-gradient(180deg, rgba(8,6,16,0) 0%, rgba(8,6,16,0.62) 45%, rgba(8,6,16,0.85) 100%)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={sceneKey}
          className="max-w-[min(92vw,56rem)] text-center"
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
          exit={{ opacity: 0, y: reduced ? 0 : -6, transition: { duration: 0.25 } }}
        >
          <p
            className="line-clamp-2 text-balance font-extrabold leading-[1.18] tracking-tight text-[#FFF8EA] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]"
            style={{ fontSize: 'clamp(1.375rem, 3.4vmin + 0.55rem, 2.5rem)' }}
          >
            {caption}
          </p>
          {subcaption && (
            <p
              className="mt-1.5 line-clamp-2 text-balance font-semibold leading-snug text-[#F7C95C] [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
              style={{ fontSize: 'clamp(1.125rem, 1.9vmin + 0.55rem, 1.6rem)' }}
            >
              {subcaption}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Progress({ time, total }: { time: MotionValue<number>; total: number }) {
  const ref = useStyle(time, (t) => ({ transform: `scaleX(${Math.min(1, Math.max(0, t / total)).toFixed(4)})` }));
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 z-[6] h-1 bg-white/15">
      <div ref={ref} className="h-full origin-left bg-[#F7C95C]" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}

function DebugOverlay({
  fps,
  tier,
  particles,
  layout,
  time,
}: {
  fps: number | null;
  tier: Tier | null;
  particles: number;
  layout: ConceptLayout;
  time: MotionValue<number>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => time.on('change', (t) => ref.current && (ref.current.textContent = (t / 1000).toFixed(1))), [time]);
  return (
    <div
      data-testid="concept-stats"
      className="pointer-events-none absolute right-2 top-1/2 z-[8] -translate-y-1/2 rounded bg-black/75 px-2 py-1 font-mono text-[10px] leading-tight text-white"
    >
      <div data-fps={fps === null ? '' : fps.toFixed(1)}>{fps === null ? '…' : fps.toFixed(0)} fps (2 s)</div>
      <div>tier {tier ?? '?'}</div>
      <div>{particles} particles</div>
      <div>{layout}</div>
      <div>
        t <span ref={ref}>0.0</span> s
      </div>
    </div>
  );
}
