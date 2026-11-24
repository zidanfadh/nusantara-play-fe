'use client';

/**
 * /jelajah/[provinsi] (Phase 11): the walkable village scene (tiers full and lite) or its 2D fallback
 * (tier 2d), the PROT stands, the panel and the overlays. three.js lives only in the dynamically loaded
 * VillageScene3D chunk, which is requested only on the full and lite tiers.
 *
 * Phase 12: the SIMULATED reward HUD (entering +25 XP, opening a PROT panel +10 XP, Paspor stamp) and a
 * one-time banner when the province has no public PROT yet. Rewards never reach the backend.
 */
import { BatikMotif } from '@/components/brand/Batik';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Hand, Map as MapIcon, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { GAME_SOON_TITLE, gameHref as linkToGame, gamePlayLabel } from '@/lib/games/links';
import { markBumperSeen } from '@/lib/jelajah/bumper/session';
import { gamePavilion } from '@/lib/jelajah/engine/pavilion';
import { enterProvince, openProt } from '@/lib/jelajah/demo-rewards';
import { ZERO_INPUT, type InputVector } from '@/lib/jelajah/engine/input';
import { hasSeenHelp, markHelpSeen } from '@/lib/jelajah/engine/help-hint';
import { loadSceneProt, type SceneProt } from '@/lib/jelajah/engine/scene-prot';
import { assignStands } from '@/lib/jelajah/engine/stands';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';
import { fallbackMessage } from '@/lib/jelajah/perf';
import { placeToasts } from '@/lib/jelajah/toast-clearance';
import { useDebugFlag } from '@/lib/jelajah/use-debug-flag';
import { useDeviceTier } from '@/lib/jelajah/use-device-tier';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { useToastClearance } from '@/lib/jelajah/use-toast-clearance';
import { GameCard, GamePrompt, GameSoonCard, PAVILION_TITLE } from './GamePrompt';
import { Joystick } from './Joystick';
import { grantDemoReward, RewardHud } from './RewardHud';
import { ProvinceScene2D } from './ProvinceScene2D';
import { StandPanel, type PanelContent } from './StandPanel';
import { StandPrompt } from './StandPrompt';
import { TierMenu } from './TierMenu';
import { WebGLBoundary } from './WebGLBoundary';

const VillageScene3D = dynamic(() => import('./three/VillageScene3D'), {
  ssr: false,
  loading: () => <SceneMessage text="Memuat desa 3D…" />,
});

type DataState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; prots: SceneProt[] };

function SceneMessage({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40">
      <BatikMotif className="h-10 w-10 motion-safe:animate-pulse" />
      <p className="animate-pulse text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// Touch device = coarse primary pointer (phones, tablets). Server snapshot: false.
function subscribeCoarse(onChange: () => void) {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;

function DemoBadge() {
  return (
    <span
      className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
      title="Pratinjau: belum ada hadiah atau pemain lain"
    >
      Demo
    </span>
  );
}

export function ProvinceExperience({ scene }: { scene: SceneDefinition }) {
  const { tier, choice, autoTier, choose, fallBack } = useDeviceTier();
  const debug = useDebugFlag();
  // Automatic fallback (Phase 13): only while the tier is automatic; a manual choice is never overridden.
  const onAutoFallback = useCallback(
    (to: 'lite' | '2d') => {
      if (!fallBack(to)) return;
      placeToasts();
      toast(fallbackMessage(to), { duration: 4000 });
    },
    [fallBack],
  );
  const touch = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  const reducedMotion = useReducedMotion();

  // Intro bumper (Phase 16): never on a province page; a visitor who came in through a deep link has already
  // entered Jelajah, so "Kembali ke peta" later in this session does not start the intro either.
  useEffect(() => markBumperSeen(), []);

  const [data, setData] = useState<DataState>({ status: 'loading' });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let isMounted = true;
    loadSceneProt(scene.provinsiKode)
      .then((prots) => isMounted && setData({ status: 'ready', prots }))
      .catch(() => isMounted && setData({ status: 'error' }));
    return () => {
      isMounted = false;
    };
  }, [scene.provinsiKode, refresh]);

  const prots = data.status === 'ready' ? data.prots : null;
  const stands = useMemo(() => assignStands(prots ?? [], scene.stands.length), [prots, scene.stands.length]);

  // SIMULATED rewards (frontend only, this tab only). Opening a PROT panel: +10 XP once per PROT.
  const protCount = prots?.length ?? 0;
  const rewardOpenedProt = useCallback(
    (protId: string) => grantDemoReward((s) => openProt(s, scene.provinsiKode, protId, protCount)),
    [scene.provinsiKode, protCount],
  );

  const [near, setNear] = useState<number | null>(null);
  // Phase 17: the plaza pavilion opens a game page (scene data `centrepiece.game`); Phase 22: any hosted game;
  // Phase 23: a separate game pavilion (`gamePavilion`) and the game's variant (`?varian=`).
  const [nearPavilion, setNearPavilion] = useState(false);
  const router = useRouter();
  const pavilionDef = gamePavilion(scene);
  const game = pavilionDef?.game ?? null;
  const gameHref = game ? linkToGame(game, `jelajah-${scene.slug}`, pavilionDef?.variant) : null;
  // Phase 25: the egrang pavilions name their variant ("Main Egrang Bambu" / "Main Egrang Batok").
  const gameVariant = pavilionDef?.variant;
  const gameLabel = game ? gamePlayLabel(game, gameVariant) : '';
  const [panel, setPanel] = useState<PanelContent | null>(null);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hudOverlay, setHudOverlay] = useState(false);
  const [emptyBannerClosed, setEmptyBannerClosed] = useState(false);
  const joystickRef = useRef<InputVector>(ZERO_INPUT);
  const returnFocus = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const lihatRef = useRef<HTMLButtonElement>(null);

  const openStand = useCallback(
    (index: number, trigger?: HTMLElement | null) => {
      const content = stands[index];
      if (!content || content.kind === 'empty') return;
      // Keyboard (E) or the Lihat button: focus goes back to the Lihat button, which stays mounted.
      const active = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      returnFocus.current = trigger ?? lihatRef.current ?? active;
      joystickRef.current = ZERO_INPUT;
      if (content.kind === 'prot') {
        setPanel({ kind: 'prot', prot: content.prot });
        rewardOpenedProt(content.prot.id);
      } else {
        setPanel({ kind: 'board', prots: content.prots });
      }
    },
    [stands, rewardOpenedProt],
  );

  const closePanel = useCallback(() => {
    setPanel(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    // Back to the element that opened the panel; the scene section when it is gone.
    requestAnimationFrame(() => {
      if (el && el.isConnected) el.focus();
      else sceneRef.current?.focus();
    });
  }, []);

  const onReady = useCallback(() => {
    setReady(true);
    setShowHelp(!hasSeenHelp());
  }, []);
  const dismissHelp = () => {
    markHelpSeen();
    setShowHelp(false);
  };
  const onInteract = useCallback(() => {
    if (nearPavilion && gameHref) router.push(gameHref);
    else if (near !== null) openStand(near);
  }, [near, nearPavilion, gameHref, router, openStand]);

  const nearContent = near !== null ? stands[near] : null;
  const is3D = tier === 'full' || tier === 'lite';
  const entered = ready || tier === '2d';

  // Entering the scene (once it is shown): +25 XP the first time in this tab.
  useEffect(() => {
    if (entered) grantDemoReward((s) => enterProvince(s, scene.provinsiKode));
  }, [entered, scene.provinsiKode]);

  const quests = useMemo(
    () => [{ provinsiKode: scene.provinsiKode, nama: scene.nama, protCount: prots ? prots.length : null }],
    [scene.provinsiKode, scene.nama, prots],
  );
  const hud = <RewardHud quests={quests} onOverlayChange={setHudOverlay} />;
  // Top-centre toasts below the title bar, HUD and panel close button (Phase 13).
  useToastClearance(`${tier}:${entered}:${panel ? 'panel' : ''}`);

  // Friendly one-time banner when the province has no public PROT yet (production today).
  const emptyBanner = entered && prots !== null && prots.length === 0 && !emptyBannerClosed && (
    <div
      role="status"
      className="pointer-events-auto w-full rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-card-foreground shadow-lg"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 leading-relaxed">
          PROT {scene.nama} sedang dalam proses kurasi. Sementara itu, jelajahi PROT dari provinsi lain di peta.
        </p>
        <button
          type="button"
          onClick={() => setEmptyBannerClosed(true)}
          aria-label="Tutup pemberitahuan"
          className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <Link
        href="/jelajah"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MapIcon className="h-3.5 w-3.5" aria-hidden /> Kembali ke peta
      </Link>
    </div>
  );

  const errorBanner = data.status === 'error' && (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
    >
      <p className="flex-1">Data PROT belum bisa dimuat.</p>
      <button
        type="button"
        onClick={() => {
          setData({ status: 'loading' });
          setRefresh((n) => n + 1);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Coba lagi
      </button>
    </div>
  );

  const topBar = (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur" data-toast-avoid>
        <Link
          href="/jelajah"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Peta</span><span className="sr-only sm:hidden">Kembali ke peta</span>
        </Link>
        <h1 className="whitespace-nowrap text-sm font-bold leading-tight text-primary-text sm:text-base md:text-lg">{scene.nama}</h1>
        <DemoBadge />
      </div>
      <div className="pointer-events-auto">
        <TierMenu choice={choice} autoTier={autoTier} onChoose={choose} />
      </div>
    </div>
  );

  const panelView = panel && (
    <StandPanel
      content={panel}
      onClose={closePanel}
      onSelectProt={(prot) => {
        setPanel({ kind: 'prot', prot });
        rewardOpenedProt(prot.id);
      }}
    />
  );

  if (tier === '2d') {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)] bg-background text-foreground">
        <div className="relative h-16">{topBar}</div>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-2 sm:px-6">
          {hud}
          {errorBanner}
          {emptyBanner}
        </div>
        {data.status === 'loading' && <p className="px-6 pt-4 text-sm text-muted-foreground">Memuat data PROT…</p>}
        <ProvinceScene2D
          nama={scene.nama}
          stands={stands}
          onOpen={(i, el) => openStand(i, el)}
          scene={scene}
          extra={game && gameHref ? <GameCard game={game} href={gameHref} variant={gameVariant} /> : scene.gameSoon ? <GameSoonCard /> : undefined}
        />
        {panel && <div className="fixed inset-0 z-30 md:pointer-events-none [&>aside]:pointer-events-auto">{panelView}</div>}
      </div>
    );
  }

  return (
    <section
      ref={sceneRef}
      tabIndex={-1}
      aria-label={`Desa virtual ${scene.nama}`}
      className="relative h-[calc(100dvh-4rem)] min-h-[440px] w-full overflow-hidden outline-none"
      style={{ background: scene.colors.background }}
    >
      {!tier ? (
        <SceneMessage text="Menyiapkan desa…" />
      ) : is3D ? (
        <WebGLBoundary fallback={<SceneMessage text="3D tidak tersedia di perangkat ini. Pilih Peta 2D di menu Tampilan." />}>
          <VillageScene3D
            scene={scene}
            tier={tier}
            stands={stands}
            joystickRef={joystickRef}
            paused={panel !== null || hudOverlay}
            onNearStand={setNear}
            onNearPavilion={setNearPavilion}
            onInteract={onInteract}
            onReady={onReady}
            reducedMotion={reducedMotion}
            debug={debug}
            onAutoFallback={choice === 'auto' ? onAutoFallback : undefined}
          />
        </WebGLBoundary>
      ) : null}

      {topBar}

      {/* Simulated reward HUD under the title bar, left; messages below it (clear of the joystick and the panel). */}
      {entered && <div className="pointer-events-none absolute left-3 top-[4.25rem] z-20">{hud}</div>}
      <div className="pointer-events-none absolute left-3 right-3 top-[10.75rem] z-20 flex flex-col items-center gap-2 lg:left-1/2 lg:right-auto lg:top-20 lg:w-[26rem] lg:-translate-x-1/2">
        {errorBanner && <div className="pointer-events-auto w-full">{errorBanner}</div>}
        {ready && emptyBanner}
        {ready && showHelp && (
          <div className="pointer-events-auto w-full max-w-[24rem] rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-card-foreground shadow-lg">
            <p className="flex items-start gap-2">
              <Hand className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
              {touch
                ? 'Geser joystick di kiri bawah untuk berjalan. Dekati stand, lalu ketuk Lihat.'
                : 'Berjalan dengan W A S D atau tombol panah. Dekati stand, lalu tekan E atau klik Lihat.'}
            </p>
            <button
              type="button"
              onClick={dismissHelp}
              className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mengerti
            </button>
          </div>
        )}
      </div>

      {ready && nearContent && (
        // Phones: right of the joystick, so neither the joystick nor the player (lower third) is covered.
        <div
          data-testid="stand-prompt"
          className={`absolute z-20 ${touch ? 'bottom-8 left-[10.5rem] right-3' : 'bottom-6 left-1/2 w-[min(92%,22rem)] -translate-x-1/2'} ${panel ? 'invisible' : ''}`}
        >
          <StandPrompt
            key={near}
            ref={lihatRef}
            content={nearContent}
            provinsiNama={scene.nama}
            compact={touch}
            onOpen={(trigger) => openStand(near as number, trigger)}
          />
        </div>
      )}

      {ready && nearPavilion && game && gameHref && !panel && (
        <div className={`absolute z-20 ${touch ? 'bottom-8 left-[10.5rem] right-3' : 'bottom-6 left-1/2 w-[min(92%,22rem)] -translate-x-1/2'}`}>
          <GamePrompt game={game} href={gameHref} compact={touch} variant={gameVariant} />
        </div>
      )}

      {ready && touch && !panel && <Joystick outputRef={joystickRef} />}

      {/* Text alternative of the stands for screen readers and keyboard users. */}
      <nav aria-label="Daftar stand PROT" className="sr-only">
        <ul>
          {stands.map((content, i) => (
            <li key={i}>
              {content.kind === 'empty' ? (
                <span>Stand {i + 1}: segera hadir</span>
              ) : (
                <button type="button" onClick={(e) => openStand(i, e.currentTarget)}>
                  Stand {i + 1}: {content.kind === 'prot' ? content.prot.nama : `${content.prots.length} PROT lainnya`}
                </button>
              )}
            </li>
          ))}
          {game && gameHref && (
            <li>
              <Link href={gameHref}>
                {PAVILION_TITLE}: {gameLabel}
              </Link>
            </li>
          )}
          {!game && scene.gameSoon && <li>{GAME_SOON_TITLE}</li>}
        </ul>
      </nav>

      {panelView}
    </section>
  );
}
