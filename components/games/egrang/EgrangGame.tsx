'use client';

/**
 * Egrang (Phase 23), the third game hosted on the site, built like congklak and gasing: public, no login,
 * nothing recorded or sent anywhere; only the local settings (variant, difficulty) and "tutorial seen" per
 * variant are remembered in localStorage. Start screen → race (lib/games/egrang/ engine and AI, canvas in
 * EgrangRace) → end screen. `?varian=bambu|batok` preselects the variant, `?from=` adds the allowlisted back
 * link, `?debug=1` adds the fps overlay and the test hook. Sound: the Phase 21 engine (use-egrang-sound.ts).
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, BookOpen, Info, RotateCcw, Settings2 } from 'lucide-react';
import { SoundControls } from '@/components/audio/SoundControls';
import { backLinkFor } from '@/lib/games/egrang/from-link';
import { loadSettings, parseVariantParam, saveSettings, type EgrangSettings } from '@/lib/games/egrang/settings';
import { GAME_TITLE, UI, VARIANT_TEXTS } from '@/lib/games/egrang/texts';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { EgrangRace } from './EgrangRace';
import { AboutSheet, RulesSheet } from './InfoSheets';
import { StartScreen } from './StartScreen';
import { useEgrangSound } from './use-egrang-sound';

const noopSubscribe = () => () => {};

function newSeed(): number {
  return Math.floor(Math.random() * 4294967296) | 0;
}

const iconButton =
  'rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function EgrangGame() {
  const params = useSearchParams();
  const back = backLinkFor(params.get('from'));
  const debug = params.get('debug') === '1';
  const preselect = parseVariantParam(params.get('varian'));
  const reducedMotion = useReducedMotion();
  // Settings come from localStorage, so the page renders only after hydration (like congklak and gasing).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [settings, setSettingsState] = useState<EgrangSettings>(() => {
    const stored = loadSettings();
    return preselect ? { ...stored, variant: preselect } : stored;
  });
  const [running, setRunning] = useState<EgrangSettings>(settings);
  const [phase, setPhase] = useState<'start' | 'play'>('start');
  const [seed, setSeed] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const sound = useEgrangSound(phase === 'play' ? running.variant : settings.variant);

  const setSettings = (s: EgrangSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };
  const start = (s: EgrangSettings = settings) => {
    // The click is a user gesture: if the browser blocked audio (and it is not muted), start it now.
    sound.unlockIfBlocked();
    setRunning(s);
    setSeed(newSeed());
    setPhase('play');
  };

  if (!mounted) return <div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />;

  const shownVariant = phase === 'play' ? running.variant : settings.variant;
  const backEl = back ? (
    <Link
      href={back.href}
      prefetch={false}
      data-testid="egrang-back"
      className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
    </Link>
  ) : null;

  const sheets = (
    <>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} variant={shownVariant} />
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} variant={shownVariant} />
    </>
  );

  if (phase === 'start') {
    return (
      <>
        <StartScreen
          settings={settings}
          onSettings={setSettings}
          onStart={() => start()}
          onRules={() => setRulesOpen(true)}
          onAbout={() => setAboutOpen(true)}
          backLink={backEl}
        />
        {sheets}
      </>
    );
  }

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-4rem-1px)] w-full max-w-6xl flex-col px-2 pb-1 pt-1 sm:px-4" data-testid="egrang-game" data-reduced-motion={reducedMotion ? '1' : '0'}>
      <div className="flex items-center gap-1">
        {back ? (
          <Link
            href={back.href}
            prefetch={false}
            data-testid="egrang-back"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
          </Link>
        ) : (
          <h1 className="truncate px-1 text-lg font-extrabold text-primary">
            {GAME_TITLE} <span className="text-sm font-semibold text-muted-foreground">· {VARIANT_TEXTS[running.variant].label}</span>
          </h1>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <SoundControls status={sound.status} onToggle={sound.toggle} onEnable={sound.enable} variant="site" />
          <button type="button" onClick={() => setRulesOpen(true)} className={iconButton} aria-label={UI.rules} title={UI.rules}>
            <BookOpen className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => setAboutOpen(true)} className={iconButton} aria-label={UI.about} title={UI.about}>
            <Info className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => start(running)} className={iconButton} aria-label={UI.restart} title={UI.restart} data-testid="egrang-restart">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => setPhase('start')} className={iconButton} aria-label={UI.settingsAria} title={UI.settings}>
            <Settings2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      <EgrangRace
        key={seed}
        settings={running}
        seed={seed}
        reducedMotion={reducedMotion}
        debug={debug}
        dialogOpen={rulesOpen || aboutOpen}
        backLink={back}
        sound={sound}
        onRestart={() => start(running)}
        onSettings={() => setPhase('start')}
      />
      {sheets}
    </div>
  );
}
