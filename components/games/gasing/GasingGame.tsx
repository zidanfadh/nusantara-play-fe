'use client';

/**
 * Gasing (Phase 20), the second game hosted on the site, built like congklak: public, no login, nothing
 * recorded or sent anywhere; only the local settings (mode, difficulty) and "tutorial seen" are remembered in
 * localStorage. Start screen → arena (lib/games/gasing/ engine, match and AI, canvas in GasingArena) → end
 * screen. `?from=jelajah` adds the allowlisted back link; `?debug=1` adds the fps overlay and the test hook.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, BookOpen, Info, RotateCcw, Settings2 } from 'lucide-react';
import { backLinkFor } from '@/lib/games/gasing/from-link';
import { loadSettings, saveSettings, type GasingSettings } from '@/lib/games/gasing/settings';
import { GAME_TITLE, UI } from '@/lib/games/gasing/texts';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { GasingArena } from './GasingArena';
import { AboutSheet, RulesSheet } from './InfoSheets';
import { StartScreen } from './StartScreen';

const noopSubscribe = () => () => {};

function newSeed(): number {
  return Math.floor(Math.random() * 4294967296) | 0;
}

const iconButton =
  'rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function GasingGame() {
  const params = useSearchParams();
  const back = backLinkFor(params.get('from'));
  const debug = params.get('debug') === '1';
  const reducedMotion = useReducedMotion();
  // Settings come from localStorage, so the page renders only after hydration (like congklak).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [settings, setSettingsState] = useState<GasingSettings>(() => loadSettings());
  const [running, setRunning] = useState<GasingSettings>(settings);
  const [phase, setPhase] = useState<'start' | 'play'>('start');
  const [seed, setSeed] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const setSettings = (s: GasingSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };
  const start = (s: GasingSettings = settings) => {
    setRunning(s);
    setSeed(newSeed());
    setPhase('play');
  };

  if (!mounted) return <div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />;

  const backEl = back ? (
    <Link
      href={back.href}
      prefetch={false}
      data-testid="gasing-back"
      className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
    </Link>
  ) : null;

  const sheets = (
    <>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
    <div className="relative mx-auto flex h-[calc(100dvh-4rem-1px)] w-full max-w-5xl flex-col px-3 pb-1.5 pt-1.5 sm:px-4" data-testid="gasing-game" data-reduced-motion={reducedMotion ? '1' : '0'}>
      <div className="flex items-center gap-1">
        {back ? (
          <Link
            href={back.href}
            prefetch={false}
            data-testid="gasing-back"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
          </Link>
        ) : (
          <h1 className="px-1 text-lg font-extrabold text-primary-text">{GAME_TITLE}</h1>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" onClick={() => setRulesOpen(true)} className={iconButton} aria-label={UI.rules} title={UI.rules}>
            <BookOpen className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => setAboutOpen(true)} className={iconButton} aria-label={UI.about} title={UI.about}>
            <Info className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => start(running)} className={iconButton} aria-label={UI.restart} title={UI.restart} data-testid="gasing-restart">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => setPhase('start')} className={iconButton} aria-label={UI.settingsAria} title={UI.settings}>
            <Settings2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      <GasingArena
        key={seed}
        settings={running}
        seed={seed}
        reducedMotion={reducedMotion}
        debug={debug}
        dialogOpen={rulesOpen || aboutOpen}
        backLink={back}
        onRestart={() => start(running)}
        onSettings={() => setPhase('start')}
      />
      {sheets}
    </div>
  );
}
