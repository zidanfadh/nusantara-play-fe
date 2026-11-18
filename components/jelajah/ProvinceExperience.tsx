'use client';

/**
 * /jelajah/[provinsi] (Phase 11): the walkable village scene (tiers full and lite) or its 2D fallback
 * (tier 2d), the PROT stands, the panel and the overlays. three.js lives only in the dynamically loaded
 * VillageScene3D chunk, which is requested only on the full and lite tiers.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Hand, RefreshCw } from 'lucide-react';
import { ZERO_INPUT, type InputVector } from '@/lib/jelajah/engine/input';
import { hasSeenHelp, markHelpSeen } from '@/lib/jelajah/engine/help-hint';
import { loadSceneProt, type SceneProt } from '@/lib/jelajah/engine/scene-prot';
import { assignStands } from '@/lib/jelajah/engine/stands';
import type { SceneDefinition } from '@/lib/jelajah/scenes/types';
import { useDeviceTier } from '@/lib/jelajah/use-device-tier';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { Joystick } from './Joystick';
import { ProvinceScene2D } from './ProvinceScene2D';
import { StandPanel, type PanelContent } from './StandPanel';
import { TierMenu } from './TierMenu';
import { WebGLBoundary } from './WebGLBoundary';

const VillageScene3D = dynamic(() => import('./three/VillageScene3D'), {
  ssr: false,
  loading: () => <SceneMessage text="Memuat desa 3D…" />,
});

type DataState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; prots: SceneProt[] };

function SceneMessage({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
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
  const { tier, choice, autoTier, choose } = useDeviceTier();
  const touch = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  const reducedMotion = useReducedMotion();

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

  const [near, setNear] = useState<number | null>(null);
  const [panel, setPanel] = useState<PanelContent | null>(null);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
      setPanel(content.kind === 'prot' ? { kind: 'prot', prot: content.prot } : { kind: 'board', prots: content.prots });
    },
    [stands],
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
    if (near !== null) openStand(near);
  }, [near, openStand]);

  const nearContent = near !== null ? stands[near] : null;
  const is3D = tier === 'full' || tier === 'lite';

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
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur">
        <Link
          href="/jelajah"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Peta</span><span className="sr-only sm:hidden">Kembali ke peta</span>
        </Link>
        <h1 className="whitespace-nowrap text-sm font-bold leading-tight text-primary sm:text-base md:text-lg">{scene.nama}</h1>
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
      onSelectProt={(prot) => setPanel({ kind: 'prot', prot })}
    />
  );

  if (tier === '2d') {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)] bg-background text-foreground">
        <div className="relative h-16">{topBar}</div>
        {errorBanner && <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">{errorBanner}</div>}
        {data.status === 'loading' && <p className="px-6 pt-4 text-sm text-muted-foreground">Memuat data PROT…</p>}
        <ProvinceScene2D nama={scene.nama} stands={stands} onOpen={(i, el) => openStand(i, el)} />
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
            paused={panel !== null}
            onNearStand={setNear}
            onInteract={onInteract}
            onReady={onReady}
            reducedMotion={reducedMotion}
          />
        </WebGLBoundary>
      ) : null}

      {topBar}

      {errorBanner && <div className="absolute left-1/2 top-20 z-20 w-[min(92%,26rem)] -translate-x-1/2">{errorBanner}</div>}

      {ready && nearContent && (
        <div className={`absolute bottom-6 left-1/2 z-20 w-[min(92%,22rem)] -translate-x-1/2 ${panel ? 'invisible' : ''}`}>
          {nearContent.kind === 'empty' ? (
            <p className="rounded-xl border border-border bg-card/95 px-4 py-3 text-center text-sm text-card-foreground shadow-lg">
              Segera hadir. Stand ini menunggu PROT dari {scene.nama}.
            </p>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 text-card-foreground shadow-lg">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {nearContent.kind === 'prot' ? nearContent.prot.nama : `${nearContent.prots.length} PROT lainnya`}
              </p>
              <button
                ref={lihatRef}
                type="button"
                onClick={(e) => openStand(near as number, e.currentTarget)}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lihat
              </button>
            </div>
          )}
        </div>
      )}

      {ready && showHelp && (
        <div className="absolute left-1/2 top-20 z-20 w-[min(92%,24rem)] -translate-x-1/2 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-card-foreground shadow-lg">
          <p className="flex items-start gap-2">
            <Hand className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
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
        </ul>
      </nav>

      {panelView}
    </section>
  );
}
