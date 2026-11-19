'use client';

/**
 * Congklak (Phase 17), the first game hosted on the site. Public, no login. Nothing about a game is
 * recorded or sent anywhere; only the local settings (mode, difficulty, animation speed) are remembered in
 * localStorage. The rules come from lib/games/congklak/ (engine + rules config); the computer opponent runs
 * in a Web Worker.
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, BookOpen, FastForward, RotateCcw, Settings2 } from 'lucide-react';
import type { AiClient } from '@/lib/games/congklak/ai-client';
import { createAiClient } from '@/lib/games/congklak/ai-client';
import { describeMove, playerNames, resultHeading, turnText } from '@/lib/games/congklak/announce';
import { applyMove, type MoveEvent } from '@/lib/games/congklak/engine';
import { backLinkFor } from '@/lib/games/congklak/from-link';
import { boardGeometry } from '@/lib/games/congklak/layout';
import { eventDelayMs } from '@/lib/games/congklak/playback';
import { replayEvent, handAfter } from '@/lib/games/congklak/replay';
import { loadSettings, saveSettings, type CongklakSettings } from '@/lib/games/congklak/settings';
import {
  createInitialState,
  holeIndex,
  holeOf,
  isLegalMove,
  legalMoves,
  scores,
  type CongklakState,
  type Player,
} from '@/lib/games/congklak/state';
import { useReducedMotion } from '@/lib/jelajah/use-reduced-motion';
import { CongklakBoard, type HandView } from './CongklakBoard';
import { RulesSheet } from './RulesSheet';
import { NO_DATA_NOTE, StartScreen, type Starter } from './StartScreen';

type Phase = 'start' | 'play' | 'end';

interface BoardView {
  pits: number[];
  hand: HandView | null;
  flash: number[];
  flashKey: number;
  captureFlash: number[];
}

interface Animation {
  events: MoveEvent[];
  i: number;
  pits: number[];
  sown: number;
  final: number[];
  captureFlash: number[];
  timer: number | null;
  done: () => void;
}

/** Minimum "thinking" time of the computer, so its moves are readable. */
const THINK_MS = { normal: 550, cepat: 300, tanpa: 250 } as const;
const END_DELAY_MS = 900;

// Portrait phones get the vertical board. Server snapshot: horizontal (the board only renders after start).
const PORTRAIT = '(orientation: portrait) and (max-width: 767px)';
function subscribePortrait(onChange: () => void) {
  const mq = window.matchMedia(PORTRAIT);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isPortrait = () => window.matchMedia(PORTRAIT).matches;
const noopSubscribe = () => () => {};

function changedPits(a: readonly number[], b: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      data-testid="congklak-back"
      className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}

export function CongklakGame() {
  const from = useSearchParams().get('from');
  const back = backLinkFor(from);
  const reducedMotion = useReducedMotion();
  const portrait = useSyncExternalStore(subscribePortrait, isPortrait, () => false);
  // Settings come from localStorage, so the controls render only after hydration.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [settings, setSettingsState] = useState<CongklakSettings>(() => loadSettings());
  const [starter, setStarter] = useState<Starter>('pertama');
  const [phase, setPhase] = useState<Phase>('start');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [game, setGame] = useState<CongklakState>(() => createInitialState(0));
  const [view, setView] = useState<BoardView>(() => ({ pits: [...createInitialState(0).pits], hand: null, flash: [], flashKey: 0, captureFlash: [] }));
  const [animating, setAnimating] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  /** The settings of the running game (changing the start screen never affects it). */
  const [running, setRunning] = useState<CongklakSettings>(settings);

  const gameRef = useRef(game);
  const anim = useRef<Animation | null>(null);
  const ai = useRef<AiClient | null>(null);
  const token = useRef(0);
  const endTimer = useRef<number | null>(null);
  const endHeadingRef = useRef<HTMLHeadingElement>(null);

  const names = useMemo(() => playerNames(running.mode), [running.mode]);
  const vsComputer = running.mode === 'komputer';
  const isComputer = useCallback((p: Player) => vsComputer && p === 1, [vsComputer]);
  const instant = running.speed === 'tanpa' || reducedMotion;
  const geometry = useMemo(() => boardGeometry(portrait ? 'vertical' : 'horizontal'), [portrait]);

  const setSettings = (s: CongklakSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };

  useEffect(
    () => () => {
      ai.current?.dispose();
      ai.current = null;
      if (anim.current?.timer) window.clearTimeout(anim.current.timer);
      if (endTimer.current) window.clearTimeout(endTimer.current);
    },
    [],
  );

  const finishAnimation = useCallback(() => {
    const a = anim.current;
    if (!a) return;
    if (a.timer) window.clearTimeout(a.timer);
    anim.current = null;
    setView((v) => ({ pits: a.final, hand: null, flash: changedPits(v.pits, a.final), flashKey: v.flashKey + 1, captureFlash: a.captureFlash }));
    a.done();
  }, []);

  const step = useCallback(() => {
    const a = anim.current;
    if (!a) return;
    if (a.i >= a.events.length) {
      finishAnimation();
      return;
    }
    const e = a.events[a.i++];
    a.pits = replayEvent(a.pits, e);
    if (e.type === 'sow') a.sown += 1;
    const handCount = handAfter(0, e);
    const hand = (e.type === 'pickup' || e.type === 'relay' || e.type === 'sow') && handCount > 0 ? { pit: e.pit, count: handCount } : null;
    let flash: number[] = [];
    if (e.type === 'sow' || e.type === 'pickup' || e.type === 'relay') flash = [e.pit];
    else if (e.type === 'capture') {
      flash = [e.pit, e.opposite, e.store];
      a.captureFlash = [e.pit, e.opposite, e.store];
    } else if (e.type === 'sweep') flash = [...e.pits, e.store];
    const pits = a.pits;
    const captureFlash = a.captureFlash;
    setView((v) => ({ pits, hand, flash, flashKey: v.flashKey + 1, captureFlash }));
    const delay = eventDelayMs(e, a.sown, running.speed);
    if (delay === 0) step();
    else a.timer = window.setTimeout(step, delay);
  }, [finishAnimation, running.speed]);

  const playMove = useCallback(
    (hole: number) => {
      const current = gameRef.current;
      if (anim.current || !isLegalMove(current, hole)) return;
      const result = applyMove(current, hole);
      gameRef.current = result.state;
      setGame(result.state);
      setSelected(null);
      setAnimating(true);
      const myToken = token.current;
      const text = describeMove(result, hole, names);
      const captureFlash = (() => {
        const c = result.events.find((e) => e.type === 'capture');
        return c && c.type === 'capture' ? [c.pit, c.opposite, c.store] : [];
      })();
      const done = () => {
        if (token.current !== myToken) return;
        setAnimating(false);
        setMessage(text);
        if (result.state.over) {
          endTimer.current = window.setTimeout(() => {
            if (token.current === myToken) setPhase('end');
          }, END_DELAY_MS);
        }
      };
      setMessage('');
      if (instant) {
        setView((v) => ({
          pits: [...result.state.pits],
          hand: null,
          flash: changedPits(v.pits, result.state.pits),
          flashKey: v.flashKey + 1,
          captureFlash,
        }));
        done();
        return;
      }
      anim.current = {
        events: result.events,
        i: 0,
        pits: [...current.pits],
        sown: 0,
        final: [...result.state.pits],
        captureFlash: [],
        timer: null,
        done,
      };
      setView((v) => ({ ...v, captureFlash: [] }));
      step();
    },
    [instant, names, step],
  );

  const playPit = useCallback(
    (pit: number) => {
      const h = holeOf(pit);
      if (h && h.player === gameRef.current.toMove) playMove(h.hole);
    },
    [playMove],
  );

  // The computer's turn: ask the worker, wait at least THINK_MS, then play.
  useEffect(() => {
    if (phase !== 'play' || animating || game.over || !isComputer(game.toMove)) return;
    let cancelled = false;
    const client = (ai.current ??= createAiClient());
    const minWait = new Promise((r) => window.setTimeout(r, THINK_MS[running.speed]));
    Promise.all([client.chooseMove(game, running.level), minWait]).then(([hole]) => {
      if (!cancelled && gameRef.current === game) playMove(hole);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, animating, game, isComputer, running.level, running.speed, playMove]);

  const startGame = useCallback(
    (s: CongklakSettings = settings) => {
      token.current += 1;
      if (anim.current?.timer) window.clearTimeout(anim.current.timer);
      anim.current = null;
      if (endTimer.current) window.clearTimeout(endTimer.current);
      const first: Player = starter === 'pertama' ? 0 : starter === 'kedua' ? 1 : Math.random() < 0.5 ? 0 : 1;
      const initial = createInitialState(first);
      gameRef.current = initial;
      setRunning(s);
      setGame(initial);
      setView((v) => ({ pits: [...initial.pits], hand: null, flash: [], flashKey: v.flashKey + 1, captureFlash: [] }));
      setAnimating(false);
      setSelected(null);
      const n = playerNames(s.mode);
      setMessage(`Permainan dimulai. ${turnText(first, n)}.`);
      setPhase('play');
    },
    [settings, starter],
  );

  useEffect(() => {
    if (phase === 'end') endHeadingRef.current?.focus();
  }, [phase]);

  const humanTurn = phase === 'play' && !animating && !game.over && !isComputer(game.toMove);
  const playable = useMemo(
    () => new Set(humanTurn ? legalMoves(game).map((h) => holeIndex(game.toMove, h)) : []),
    [humanTurn, game],
  );
  const [s0, s1] = scores({ ...game, pits: view.pits });
  const total = view.pits.reduce((a, b) => a + b, 0);

  const backLink = back ? <BackLink href={back.href} label={back.label} /> : null;

  if (!mounted) {
    return <div className="h-[calc(100dvh-4rem-1px)]" aria-busy="true" />;
  }

  if (phase === 'start') {
    return (
      <>
        <StartScreen
          settings={settings}
          starter={starter}
          onSettings={setSettings}
          onStarter={setStarter}
          onStart={() => startGame()}
          onRules={() => setRulesOpen(true)}
          backLink={backLink}
        />
        <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </>
    );
  }

  const toMove = game.toMove;
  let status: string;
  if (animating) status = 'Menabur…';
  else if (phase === 'end' || game.over) status = 'Permainan selesai';
  else if (isComputer(toMove)) status = 'Komputer berpikir…';
  else status = vsComputer ? 'Giliranmu: pilih lubang' : `${turnText(toMove, names)}: pilih lubang`;

  const scoreChip = (p: Player, value: number) => {
    const active = !game.over && !animating && toMove === p;
    return (
      <div
        className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
          active ? 'border-accent bg-accent/20' : 'border-border bg-card'
        }`}
        data-testid={`congklak-score-${p}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p === 0 ? 'bg-primary' : 'bg-secondary'}`} aria-hidden />
        <span className="truncate text-xs font-semibold sm:text-sm">{names[p]}</span>
        <span className="ml-auto text-base font-extrabold tabular-nums sm:text-lg">{value}</span>
      </div>
    );
  };

  return (
    <div
      className="relative mx-auto flex h-[calc(100dvh-4rem-1px)] w-full max-w-5xl flex-col px-3 pb-2 pt-2 sm:px-4"
      data-testid="congklak-game"
      data-phase={phase}
      data-to-move={game.over ? '' : String(toMove)}
      data-animating={animating ? '1' : '0'}
      data-total={total}
      data-scores={`${s0},${s1}`}
      data-over={game.over ? '1' : '0'}
    >
      <div className="flex items-center gap-1">
        {back ? (
          <Link
            href={back.href}
            data-testid="congklak-back"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
          </Link>
        ) : (
          <h1 className="px-1 text-lg font-extrabold text-primary">Congklak</h1>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setRulesOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Cara bermain" title="Cara bermain">
            <BookOpen className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => startGame(running)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Mulai ulang" title="Mulai ulang" data-testid="congklak-restart">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              token.current += 1;
              if (anim.current?.timer) window.clearTimeout(anim.current.timer);
              anim.current = null;
              setAnimating(false);
              setPhase('start');
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Pengaturan permainan"
            title="Pengaturan"
          >
            <Settings2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Same order as the board: player 2's store / column on the left, player 1's on the right. */}
      <div className="mt-1 grid grid-cols-2 gap-2">
        {scoreChip(1, s1)}
        {scoreChip(0, s0)}
      </div>
      <p className="mt-1.5 text-center text-sm font-bold" data-testid="congklak-status">
        <span className={!game.over && !animating && toMove === 1 ? 'text-secondary' : 'text-primary'}>{status}</span>
      </p>

      <div className="relative mt-1 min-h-0 flex-1">
        <CongklakBoard
          geometry={geometry}
          pits={view.pits}
          playable={playable}
          selected={selected}
          onSelect={setSelected}
          onPlay={playPit}
          activePlayer={game.over ? null : toMove}
          names={names}
          hand={view.hand}
          flash={view.flash}
          flashKey={view.flashKey}
          captureFlash={view.captureFlash}
          reducedMotion={reducedMotion}
        />

        {phase === 'end' && game.winner !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" data-testid="congklak-end">
            <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center text-card-foreground shadow-xl" aria-labelledby="congklak-result">
              <h2 id="congklak-result" ref={endHeadingRef} tabIndex={-1} className="text-2xl font-extrabold text-primary outline-none">
                {resultHeading(game.winner, names, running.mode)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {names[0]} {s0} biji · {names[1]} {s1} biji
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startGame(running)}
                  data-testid="congklak-main-lagi"
                  className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                >
                  Main lagi
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('start')}
                  className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ubah pengaturan
                </button>
                {back && (
                  <Link href={back.href} className="rounded-xl px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {back.label}
                  </Link>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="mt-1 flex min-h-[2.75rem] items-center gap-2">
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground" aria-live="polite" data-testid="congklak-message">
          {message}
        </p>
        {animating && !instant && (
          <button
            type="button"
            onClick={finishAnimation}
            data-testid="congklak-skip"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FastForward className="h-4 w-4" aria-hidden /> Lewati animasi
          </button>
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{NO_DATA_NOTE}</p>

      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
