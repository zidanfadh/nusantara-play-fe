'use client';

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Clapperboard, MapPin, RefreshCw } from 'lucide-react';
import { GEO_ATTRIBUTION } from '@/lib/jelajah/geo';
import { isClickable } from '@/lib/jelajah/map-model';
import { PALETTES } from '@/lib/jelajah/palette';
import { ENTERABLE_PROVINCES, PILOT_PROVINCE } from '@/lib/jelajah/provinces';
import { useDebugFlag } from '@/lib/jelajah/use-debug-flag';
import { useDeviceTier } from '@/lib/jelajah/use-device-tier';
import { useJelajahData } from '@/lib/jelajah/use-jelajah-data';
import { useProvinceShapes } from '@/lib/jelajah/use-province-shapes';
import { useThemeMode } from '@/lib/jelajah/use-theme-mode';
import { useToastClearance } from '@/lib/jelajah/use-toast-clearance';
import Map2D from './Map2D';
import { ProvinceCard } from './ProvinceCard';
import { RewardHud } from './RewardHud';
import { TierMenu } from './TierMenu';
import { WebGLBoundary } from './WebGLBoundary';
import { JelajahBumper } from './bumper/JelajahBumper';
import { shouldAutoPlayBumper } from '@/lib/jelajah/bumper/session';
import { CONCEPT_REPLAY_LABEL, isConceptForced, nextIntroStep, planIntro, type IntroStep } from '@/lib/jelajah/concept/gate';
import { hasSeenConcept } from '@/lib/jelajah/concept/seen';

/**
 * Intro before the map (Phase 19): 'pending' until mounted (storage is read after hydration), then the
 * steps of `planIntro` in order (bumper once per day, concept video on the first visit), then 'done'.
 */
type IntroStage = 'pending' | IntroStep | 'done';

/** Longest wait for the automatic tier before the intro starts anyway (its probe normally takes 0.7 s). */
const BUMPER_TIER_WAIT_MS = 3000;

/** Film colour of the concept video, also its loading cover (no flash of the hub between the two). */
const CONCEPT_COVER = '#120F2A';

// three.js lives only in this chunk; it is requested only when the tier is full or lite.
const Map3D = dynamic(() => import('./Map3D'), {
  ssr: false,
  loading: () => <MapSkeleton label="Memuat peta 3D…" />,
});

// Concept video (Phase 19): its own chunk, requested only when it will actually play.
const ConceptVideo = dynamic(() => import('./concept/ConceptVideo'), {
  ssr: false,
  loading: () => <div aria-hidden className="fixed inset-0 z-[60]" style={{ background: CONCEPT_COVER }} />,
});

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
      <p className="animate-pulse text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function JelajahHub() {
  const { data, status, retry } = useJelajahData();
  const refs = useMemo(() => data.provinces.map(({ kode, nama }) => ({ kode, nama })), [data.provinces]);
  const { parsed, failed: geoFailed, retry: retryGeo } = useProvinceShapes(refs);
  const { tier, choice, autoTier, choose } = useDeviceTier();
  const debug = useDebugFlag();
  const theme = useThemeMode();
  const palette = PALETTES[theme];

  const [hoveredKode, setHoveredKode] = useState<string | null>(null);
  const [selectedKode, setSelectedKode] = useState<string | null>(null);
  const mapRef = useRef<HTMLElement>(null);

  // Intro (Phase 16 bumper, Phase 19 concept video), decided after mount (storage). The hub stays mounted
  // behind it, so the data, the geometry and (tier full/lite) the 3D chunk load meanwhile.
  // On a first visit the automatic tier runs a 0.7 s frame-rate probe; the intro's animations would lower
  // that (cached) measurement, so an automatic intro waits on its plain cover until the automatic tier is
  // known (at most BUMPER_TIER_WAIT_MS). Replays ("Putar intro", "Tonton pengenalan") play one step only.
  const [stage, setStage] = useState<IntroStage>('pending');
  const [plan, setPlan] = useState<IntroStep[]>([]);
  const [replay, setReplay] = useState(false);
  const [tierWaitOver, setTierWaitOver] = useState(false);
  const [introRun, setIntroRun] = useState(0);
  const [bumperPlayed, setBumperPlayed] = useState(false);
  const [conceptNearEnd, setConceptNearEnd] = useState(false);
  /** Where focus goes when the intro closes: the map menu, or the button that replayed the concept video. */
  const returnFocus = useRef<'menu' | 'concept' | null>(null);
  const conceptButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const steps = planIntro({
      bumperDue: shouldAutoPlayBumper(),
      conceptSeen: hasSeenConcept(),
      forced: isConceptForced(window.location.search),
    });
    // Reading storage is only possible after mount; one extra render is intended here.
    setPlan(steps);
    setStage(steps[0] ?? 'done');
    const id = setTimeout(() => setTierWaitOver(true), BUMPER_TIER_WAIT_MS);
    return () => clearTimeout(id);
  }, []);
  const tierKnown = autoTier !== null || tierWaitOver;
  const introReady = replay || tierKnown;
  const bumperShown = stage === 'bumper' && introReady;
  const conceptShown = stage === 'concept' && introReady;
  const introCover = stage === 'pending' || ((stage === 'bumper' || stage === 'concept') && !introReady);
  const introOpen = bumperShown || conceptShown || introCover;
  useEffect(() => {
    if (bumperShown) setBumperPlayed(true);
  }, [bumperShown]);

  const endStep = useCallback(
    (current: IntroStep) => {
      const next = replay ? null : nextIntroStep(plan, current);
      if (next) {
        setStage(next);
        return;
      }
      returnFocus.current ??= 'menu';
      setStage('done');
      setReplay(false);
    },
    [plan, replay],
  );
  const closeBumper = useCallback(() => endStep('bumper'), [endStep]);
  const closeConcept = useCallback(() => endStep('concept'), [endStep]);
  /** The bumper's "Main Congklak" leaves the page: no concept video now (it plays on the next visit). */
  const leaveIntro = useCallback(() => {
    setStage('done');
    setReplay(false);
  }, []);
  const replayBumper = useCallback(() => {
    setIntroRun((n) => n + 1);
    setReplay(true);
    returnFocus.current = 'menu';
    setStage('bumper');
  }, []);
  const replayConcept = useCallback(() => {
    setIntroRun((n) => n + 1);
    setReplay(true);
    returnFocus.current = 'concept';
    setConceptNearEnd(false);
    setStage('concept');
  }, []);
  const onConceptScene = useCallback((_index: number, last: boolean) => setConceptNearEnd(last), []);
  // After the intro: focus the first control of the map overlay (the "Tampilan" menu button), or the
  // "Tonton pengenalan" button after a replay of the concept video.
  useEffect(() => {
    if (stage !== 'done' || !returnFocus.current) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target === 'concept') conceptButtonRef.current?.focus();
    else mapRef.current?.querySelector<HTMLElement>('[data-jelajah-menu]')?.focus();
  }, [stage]);

  // While the concept video plays, the 3D map chunk is fetched in the background, but a 3D map that is not
  // mounted yet (no bumper before it, e.g. ?concept=1) is mounted only from the last scene on, so building
  // the map never competes with the film's frames. Its data and geometry load meanwhile as always.
  const deferMap3D = stage === 'concept' && !replay && !bumperPlayed && !conceptNearEnd;
  useEffect(() => {
    if (stage === 'concept' && tier && tier !== '2d') void import('./Map3D');
  }, [stage, tier]);

  const summaryByKode = useMemo(() => new Map(data.provinces.map((p) => [p.kode, p])), [data.provinces]);
  const selected = selectedKode ? summaryByKode.get(selectedKode) ?? null : null;
  // Top-centre toasts below the title card and the HUD (Phase 13).
  useToastClearance(selectedKode);
  const hovered = hoveredKode ? summaryByKode.get(hoveredKode) ?? null : null;

  const onSelect = useCallback(
    (kode: string | null) => setSelectedKode(isClickable(kode, summaryByKode) ? kode : null),
    [summaryByKode],
  );
  const closeCard = useCallback(() => setSelectedKode(null), []);

  const openFromList = (kode: string) => {
    setSelectedKode(kode);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // One demo quest per province scene (Phase 12, SIMULATED rewards).
  const quests = useMemo(
    () =>
      ENTERABLE_PROVINCES.map((p) => ({
        provinsiKode: p.kode,
        nama: p.nama,
        protCount: status === 'ready' ? summaryByKode.get(p.kode)?.protCount ?? 0 : null,
      })),
    [status, summaryByKode],
  );

  const clickable = data.provinces.filter((p) => isClickable(p.kode, summaryByKode));
  const others = data.provinces.filter((p) => !isClickable(p.kode, summaryByKode));
  const shapes = parsed?.shapes ?? null;

  const viewProps = shapes && {
    shapes,
    summaryByKode,
    hoveredKode,
    selectedKode,
    palette,
    onHover: setHoveredKode,
    onSelect,
  };

  let map: ReactNode;
  if (geoFailed) {
    map = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40 p-6 text-center">
        <p className="text-sm text-muted-foreground">Peta tidak dapat dimuat.</p>
        <button
          type="button"
          onClick={retryGeo}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
        </button>
      </div>
    );
  } else if (!viewProps || !tier || (deferMap3D && tier !== '2d')) {
    map = <MapSkeleton label="Menyiapkan peta…" />;
  } else if (tier === '2d') {
    map = <Map2D {...viewProps} />;
  } else {
    map = (
      <WebGLBoundary fallback={<Map2D {...viewProps} />}>
        <Map3D {...viewProps} tier={tier} debug={debug && stage === 'done'} />
      </WebGLBoundary>
    );
  }

  return (
    <>
    <div className="bg-background text-foreground" inert={introOpen}>
      <section
        ref={mapRef}
        aria-label="Peta Jelajah Nusantara"
        className="relative h-[calc(100dvh-4rem)] min-h-[440px] w-full overflow-hidden"
        style={{ background: palette.seaDeep }}
      >
        {map}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
          <div className="pointer-events-auto rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur" data-toast-avoid>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-tight text-primary md:text-lg">Jelajah Nusantara</h1>
              <span
                className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
                title="Pratinjau: belum ada hadiah atau pemain lain yang tersimpan"
              >
                Demo
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">Pilih provinsi untuk melihat PROT-nya.</p>
          </div>
          <div className="pointer-events-auto">
            <TierMenu choice={choice} autoTier={autoTier} onChoose={choose} onReplayIntro={replayBumper} />
          </div>
        </div>

        {/* Simulated reward HUD under the title card; hidden on phones while a province card is open. */}
        <div className={`pointer-events-none absolute left-3 top-[4.5rem] z-20 md:top-[5.25rem] ${selected ? 'hidden md:block' : ''}`}>
          <RewardHud quests={quests} />
        </div>

        {hovered && !selected && (
          <div className="pointer-events-none absolute left-1/2 top-[11rem] z-20 lg:top-20 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm font-medium text-card-foreground shadow">
            {hovered.nama} · {hovered.protCount} PROT
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="absolute left-1/2 top-[11rem] z-20 lg:top-20 flex w-[min(92%,26rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
          >
            <p className="flex-1">Data PROT belum bisa dimuat. Peta tetap bisa dilihat.</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Coba lagi
            </button>
          </div>
        )}
        {status === 'loading' && (
          <p className="absolute left-1/2 top-[11rem] z-20 lg:top-20 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow">
            Memuat data PROT…
          </p>
        )}

        {selected && <ProvinceCard summary={selected} status={status} onClose={closeCard} />}

        {/* Phase 19: replays the concept video; small, bottom left (icon only on phones). */}
        <button
          ref={conceptButtonRef}
          type="button"
          onClick={replayConcept}
          aria-label={CONCEPT_REPLAY_LABEL}
          data-concept-replay
          className={`absolute bottom-3 left-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card/90 px-3 text-sm font-medium text-card-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:py-2 ${selected ? 'hidden md:inline-flex' : ''}`}
        >
          <Clapperboard className="h-4 w-4 text-primary" aria-hidden />
          <span className="hidden md:inline">{CONCEPT_REPLAY_LABEL}</span>
        </button>

        <div
          className={`pointer-events-none absolute bottom-3 right-3 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-[11px] text-card-foreground shadow-sm backdrop-blur ${selected ? 'hidden md:block' : ''}`}
          aria-hidden
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-5 rounded-sm"
              style={{ background: `linear-gradient(90deg, ${palette.protLow}, ${palette.protHigh})` }}
            />{' '}
            Ada PROT (makin banyak, makin tua)
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-sm" style={{ background: palette.pilot }} /> Pilot
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-sm border border-border" style={{ background: palette.muted }} /> Belum
            ada PROT
          </div>
        </div>
      </section>

      <section aria-labelledby="jelajah-list" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h2 id="jelajah-list" className="text-xl font-bold">
          Daftar provinsi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Versi teks dari peta. {status === 'ready' && `${data.totalProt} PROT publik di ${clickable.filter((p) => p.protCount > 0).length} provinsi.`}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {clickable.map((p) => (
            <li key={p.kode}>
              <button
                type="button"
                onClick={() => openFromList(p.kode)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />
                  {p.nama}
                  {p.kode === PILOT_PROVINCE.kode && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Pilot
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{p.protCount} PROT</span>
              </button>
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {others.length} provinsi belum memiliki PROT publik
            </summary>
            <p className="mt-2 leading-relaxed text-muted-foreground">{others.map((p) => p.nama).join(', ')}</p>
          </details>
        )}
        {parsed && parsed.provincesWithoutShape.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Belum ada batas wilayah di peta untuk: {parsed.provincesWithoutShape.map((p) => p.nama).join(', ')} (data batas
            2019).
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">{GEO_ATTRIBUTION}</p>
      </section>
    </div>
    <AnimatePresence>
      {introCover && (
        // Server render, hydration and the first-visit tier probe: a plain cover in the colour of the step that
        // follows, so a first visit never flashes the hub before the intro; without an intro it fades out
        // right after hydration.
        <motion.div
          key="bumper-cover"
          aria-hidden
          className="fixed inset-0 z-[60] bg-background"
          style={stage === 'concept' ? { background: CONCEPT_COVER } : undefined}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        />
      )}
      {bumperShown && (
        <JelajahBumper
          key={`bumper-${introRun}`}
          data={data}
          status={status}
          shapes={shapes}
          onClose={closeBumper}
          onLeave={leaveIntro}
        />
      )}
      {conceptShown && (
        <ConceptVideo
          key={`concept-${introRun}`}
          data={data}
          status={status}
          tier={tier}
          debug={debug}
          onClose={closeConcept}
          onScene={onConceptScene}
        />
      )}
    </AnimatePresence>
    </>
  );
}
