'use client';

/**
 * Jelajah intro bumper (Phase 16): a short animated tour of the whole site before the hub map. Six scenes
 * of about 3 s (19 s in total), built in React + framer-motion (already on every page through the navbar
 * theme toggle), no video, no sound, no three.js.
 *
 * Controls: "Lewati" (always visible; Esc), tap/click anywhere or Enter for the next scene, progress dots.
 * Focus starts on "Lewati" and stays inside the bumper (Tab cycles); the hub moves it to its menu when the
 * bumper closes. The scene timer pauses while the tab is hidden. With reduced motion there is no movement
 * (cross-fades only) and no auto-advance: the user advances.
 *
 * The hub stays mounted behind the bumper and loads its data and the 3D chunk meanwhile; the scenes read
 * that data (`data`, `status`, `shapes`) as it arrives.
 */
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { apiClient } from '@/lib/api/client';
import { congklakHref } from '@/lib/games/congklak/from-link';
import {
  BUMPER_DURATIONS,
  BUMPER_SCENES,
  loadBumperStats,
  mapSceneData,
  protSceneData,
  type CommunityStats,
  type HubStatus,
} from '@/lib/jelajah/bumper/scene-data';
import { markBumperSeen } from '@/lib/jelajah/bumper/session';
import type { BumperEndReason } from '@/lib/jelajah/bumper/timeline';
import { useBumperTimeline } from '@/lib/jelajah/bumper/use-bumper-timeline';
import type { JelajahData } from '@/lib/jelajah/data';
import type { ProvinceShape } from '@/lib/jelajah/geo';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { BrandScene } from './BrandScene';
import { CommunityScene } from './CommunityScene';
import { GameScene } from './GameScene';
import { MapScene } from './MapScene';
import { ProtScene } from './ProtScene';
import { BumperReducedMotion } from './SceneLayout';
import { StartScene } from './StartScene';

const FILL_KEYFRAMES = '@keyframes jelajah-bumper-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}';

interface JelajahBumperProps {
  data: JelajahData;
  status: HubStatus;
  shapes: readonly ProvinceShape[] | null;
  onClose: (reason: BumperEndReason) => void;
  /** Phase 19: "Main Congklak" leaves /jelajah; the hub then starts no further intro step. */
  onLeave?: () => void;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function JelajahBumper({ data, status, shapes, onClose, onLeave }: JelajahBumperProps) {
  const reduced = useReducedMotion();
  const { index, paused, next, skip } = useBumperTimeline(BUMPER_DURATIONS, !reduced, onClose);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Played once per browser session (the hub decides; replays mark it again, harmless).
  useEffect(() => {
    markBumperSeen();
    skipRef.current?.focus();
    // No page scrolling behind the bumper.
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, []);

  // Public, read-only; on failure the community scene simply shows no numbers.
  useEffect(() => {
    let isMounted = true;
    loadBumperStats(apiClient.get).then((result) => {
      if (isMounted) setStats(result);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Esc and Enter anywhere on the page while the bumper is open (focus may sit on <body>).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'Enter' && !e.repeat) {
        // A scene's own action button (scene 4 "Main Congklak") is pressed normally.
        if (e.target instanceof Element && e.target.closest('[data-bumper-action]')) return;
        // Enter always means "next" (on the last scene that is "Mulai Jelajah"); Lewati uses Space or Esc.
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, skip]);

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !rootRef.current) return;
    const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const prot = useMemo(() => protSceneData(data, status), [data, status]);
  const map = useMemo(() => mapSceneData(data, status), [data, status]);
  const scene = BUMPER_SCENES[index];
  const last = index === BUMPER_SCENES.length - 1;

  let content;
  switch (scene.id) {
    case 'brand':
      content = <BrandScene />;
      break;
    case 'prot':
      content = <ProtScene scene={prot} />;
      break;
    case 'peta':
      content = <MapScene scene={map} shapes={shapes} />;
      break;
    case 'game':
      // Phase 17: "Main Congklak" ends the bumper and opens the game (its back link leads to the map).
      content = (
        <GameScene
          onPlay={() => {
            onLeave?.();
            skip();
            router.push(congklakHref('jelajah'));
          }}
        />
      );
      break;
    case 'komunitas':
      content = <CommunityScene stats={stats} />;
      break;
    default:
      content = <StartScene onStart={next} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <BumperReducedMotion.Provider value={reduced}>
      <motion.div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Intro Jelajah Nusantara"
        data-testid="jelajah-bumper"
        data-scene={scene.id}
        className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.35 } }}
        onClick={() => next()}
        onKeyDown={trapTab}
      >
        <style>{FILL_KEYFRAMES}</style>
        {/* Soft colour wash from the site tokens; readable in both themes. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 45% at 85% 0%, color-mix(in oklab, var(--color-accent) 35%, transparent), transparent 70%), radial-gradient(55% 40% at 0% 100%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)',
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
          <ol className="flex flex-1 items-center gap-1.5" aria-label="Kemajuan intro">
            {BUMPER_SCENES.map((s, i) => (
              <li key={s.id} className="h-1.5 max-w-12 flex-1 overflow-hidden rounded-full bg-foreground/15">
                <span className="sr-only">
                  {s.label}
                  {i === index ? ' (sekarang)' : ''}
                </span>
                <span
                  aria-hidden
                  className="block h-full origin-left rounded-full bg-primary"
                  style={
                    i < index || (i === index && reduced)
                      ? undefined
                      : i > index
                        ? { transform: 'scaleX(0)' }
                        : {
                            animation: `jelajah-bumper-fill ${s.durationMs}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }
                  }
                  key={i === index ? `run-${index}` : `static-${i}`}
                />
              </li>
            ))}
          </ol>
          <button
            ref={skipRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skip();
            }}
            aria-keyshortcuts="Escape"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card/90 px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Lewati <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto py-6" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={scene.id} className="w-full" exit={{ opacity: 0, transition: { duration: 0.25 } }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="relative z-10 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground md:pb-6">
          {last ? 'Tekan Mulai Jelajah untuk membuka peta' : reduced ? 'Ketuk atau tekan Enter untuk lanjut' : 'Ketuk untuk lanjut'}
          <span className="sr-only">
            {' '}
            · Adegan {index + 1} dari {BUMPER_SCENES.length}: {scene.label}
          </span>
        </p>
      </motion.div>
      </BumperReducedMotion.Provider>
    </MotionConfig>
  );
}
