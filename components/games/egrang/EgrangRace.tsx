'use client';

/**
 * The egrang play view (Phase 23): the canvas race with its fixed-step loop (1/120 s simulation, interpolated
 * drawing, device pixel ratio capped at 2, paused while the tab is hidden or the tutorial or a dialog is
 * open), the tap zones and keyboard steps (one input queue, `lib/games/egrang/input.ts`), the computer, the
 * HUD (progress of both racers, race clock), countdown, flashes, the end screen and the sound cues. The race
 * itself is lib/games/egrang/engine.ts; nothing is recorded or sent.
 */
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createAi } from '@/lib/games/egrang/ai';
import { DT, TUNING, cloneWorld, createWorld, raceTime, stepWorld, timeToIdeal, beatTime, otherFoot, type Controller, type StepInput } from '@/lib/games/egrang/engine';
import { DEFAULT_RULES } from '@/lib/games/egrang/rules';
import {
  MAX_LAG_SECONDS,
  createInputQueue,
  createSimClock,
  footFromKey,
  footFromPointer,
  pauseClock,
  queueStep,
  resumeClock,
  simAt,
  takeInputs,
  type InputQueue,
  type SimClock,
} from '@/lib/games/egrang/input';
import type { EgrangSettings } from '@/lib/games/egrang/settings';
import { markTutorialSeen, tutorialSeen } from '@/lib/games/egrang/settings';
import { BAMBU_PULSE, batokPulse, countdownSounds, endPhrase, eventSounds, raceCueSheet, egrangSoundList, type TimedEvent } from '@/lib/games/egrang/sound';
import { NAMES, NO_DATA_NOTE, RACE_HINT, UI, finishText, formatClock, formatSeconds, raceHeading, raceSummary, statsLine } from '@/lib/games/egrang/texts';
import type { Foot, RaceEvent, RaceResult, Side, World } from '@/lib/games/egrang/types';
import {
  ROW,
  SWATCH_CSS,
  animReset,
  animStep,
  animUpdate,
  buildLaneCaches,
  buildMidTile,
  computeView,
  confetti,
  createEffects,
  createRacerAnim,
  drawBackdrop,
  drawBalanceArc,
  drawEffects,
  drawMid,
  drawRacer,
  drawRhythmRing,
  drawTag,
  drawTrackCached,
  dustPuff,
  headHeight,
  shakeOffset,
  shakeOn,
  sparkles,
  splash,
  toScreen,
  updateEffects,
  type LaneCache,
  type MidTile,
  type RacerAnim,
  type View,
} from './render';
import { Tutorial } from './Tutorial';
import type { EgrangSound } from './use-egrang-sound';

// Landscape phones: a slimmer HUD, smaller pads, the message over the track (no hint lines below).
const COMPACT = '(orientation: landscape) and (max-height: 500px)';
function subscribeCompact(onChange: () => void) {
  const mq = window.matchMedia(COMPACT);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isCompact = () => window.matchMedia(COMPACT).matches;

const DPR_CAP = 2;
const MAX_STEPS_PER_FRAME = 12;
/** The end screen appears this long after the race is decided (the finish stays visible). */
const END_OVERLAY_MS = 1300;
/** How far ahead (s) the kendang beats are scheduled on the audio clock. */
const BEAT_LOOKAHEAD = 0.2;

interface Props {
  settings: EgrangSettings;
  seed: number;
  reducedMotion: boolean;
  debug: boolean;
  dialogOpen: boolean;
  backLink: { href: string; label: string } | null;
  sound: EgrangSound;
  onRestart: () => void;
  onSettings: () => void;
}

type Stage = 'countdown' | 'race' | 'done';

function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function EgrangRace({ settings, seed, reducedMotion, debug, dialogOpen, backLink, sound, onRestart, onSettings }: Props) {
  const variant = settings.variant;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const queueRef = useRef<InputQueue | null>(null);
  const clockRef = useRef<SimClock | null>(null);
  const pausedRef = useRef(false);
  const reducedRef = useRef(reducedMotion);
  const progressRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)] as const;
  const distRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
  const clockTextRef = useRef<HTMLSpanElement>(null);
  const padRefs = { L: useRef<HTMLDivElement>(null), R: useRef<HTMLDivElement>(null) };
  const fpsRef = useRef<HTMLSpanElement>(null);
  const endHeadingRef = useRef<HTMLHeadingElement>(null);
  const overlayTimer = useRef<number | null>(null);

  const [stage, setStage] = useState<Stage>('countdown');
  const [count, setCount] = useState<string | null>(null);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [playerStats, setPlayerStats] = useState({ perfect: 0, falls: 0, slips: 0 });
  const [overlay, setOverlay] = useState<'none' | 'end'>('none');
  const [message, setMessage] = useState('');
  const [flash, setFlash] = useState<{ text: string; key: number; tone: 'good' | 'bad' } | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen(variant));
  const [inputMode, setInputMode] = useState<'touch' | 'keyboard'>('touch');
  const compact = useSyncExternalStore(subscribeCompact, isCompact, () => false);

  useEffect(() => {
    pausedRef.current = tutorialOpen || dialogOpen;
    reducedRef.current = reducedMotion;
    sound.pause(tutorialOpen || dialogOpen);
  }, [tutorialOpen, dialogOpen, reducedMotion, sound]);

  const showFlash = useCallback((text: string, tone: 'good' | 'bad') => {
    setFlash((f) => ({ text, tone, key: (f?.key ?? 0) + 1 }));
  }, []);

  const pressPad = (foot: Foot) => {
    const el = padRefs[foot].current;
    if (!el) return;
    el.dataset.pressed = '1';
    window.setTimeout(() => {
      if (el.dataset.pressed === '1') delete el.dataset.pressed;
    }, 110);
  };

  /** THE player step: from a tap or a key, stamped with its own time. */
  const step = useCallback((foot: Foot, timeStampMs: number) => {
    const w = worldRef.current;
    const q = queueRef.current;
    const c = clockRef.current;
    if (!w || !q || !c || pausedRef.current || w.result) return;
    queueStep(q, foot, simAt(c, timeStampMs), w.t);
  }, []);

  // The race and the frame loop. A new seed (restart) starts a new race.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const bg = bgRef.current;
    if (!canvas || !wrap || !bg) return;
    // The browser's default (GPU-backed) 2D canvas; `?debug=1&canvas=cpu` switches to a CPU-backed one for
    // comparison (like gasing). No `desynchronized` (it bypassed the compositor in gasing's screenshots).
    const backend = debug ? new URLSearchParams(window.location.search).get('canvas') : null;
    const ctx = canvas.getContext('2d', { willReadFrequently: backend === 'cpu' });
    if (!ctx) return;
    const w = createWorld(variant, seed);
    worldRef.current = w;
    const ai = createAi(variant, settings.level, (seed ^ 0x5bd1e995) | 0);
    let autoplay: Controller | null = null;
    const q = createInputQueue();
    queueRef.current = q;
    const clock = createSimClock(performance.now());
    if (pausedRef.current) pauseClock(clock, performance.now());
    clockRef.current = clock;
    const fx = createEffects(reducedRef.current);
    const anims: [RacerAnim, RacerAnim] = [createRacerAnim(0), createRacerAnim(0)];
    let prevX: [number, number] = [0, 0];
    let cam = 0;
    let dpr = 1;
    let view: View = computeView(1, 1, variant);
    let tile: MidTile | null = null;
    let lanes: LaneCache[] = [];
    let dark = isDarkTheme();
    const rebuild = () => {
      drawBackdrop(bg, view, dpr, variant, dark);
      tile = buildMidTile(view, dpr, variant, dark);
      lanes = buildLaneCaches(view, dpr, w.track, dark);
    };
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      view = computeView(Math.max(1, r.width), Math.max(1, r.height), variant);
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      rebuild();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const mo = new MutationObserver(() => {
      const d = isDarkTheme();
      if (d !== dark) {
        dark = d;
        rebuild();
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Sound scheduling state and the debug recording.
    let nextTick = 0;
    let nextBeat = 1;
    let lastExtreme = -1;
    let lastPlayerFoot: Foot | null = null;
    const record: TimedEvent[] = [];
    const extremes: number[] = [];
    let goShownUntil = 0;
    let shownCount: string | null = null;
    let shownStage: Stage = 'countdown';
    const hud = { clock: '', p: ['', ''], d: ['', ''] };
    const fpsTimes: number[] = [];
    let fpsShown = 0;

    const handleEvents = (events: RaceEvent[], t: number) => {
      for (const e of events) {
        if (debug) record.push({ t, event: e });
        for (const s of eventSounds(variant, e)) sound.api.current?.at(0, s);
        switch (e.type) {
          case 'go':
            setMessage(UI.go);
            goShownUntil = w.t + 0.8;
            break;
          case 'step': {
            const r = w.racers[e.side];
            animStep(anims[e.side], e.foot, r.x + r.stride, t, variant);
            const seedN = w.steps * 2 + e.side;
            if (e.obstacle === 'genangan') splash(fx, e.side, r.x + r.stride + 0.2, seedN);
            else dustPuff(fx, e.side, r.x + r.stride + 0.2, 0.4 + e.quality * 0.4, dark, seedN);
            if (e.side === 0) {
              if (e.perfect) {
                showFlash(UI.perfect, 'good');
                sparkles(fx, 0, r.x, headHeight(variant), seedN);
              } else if (variant === 'bambu' && e.quality === 0 && lastPlayerFoot === e.foot) {
                showFlash(UI.sameFoot, 'bad');
              }
              lastPlayerFoot = e.foot;
            }
            break;
          }
          case 'wobble':
            if (e.side === 0) showFlash(UI.wobble, 'bad');
            break;
          case 'fall': {
            dustPuff(fx, e.side, e.x, 1.4, dark, w.steps);
            if (e.side === 0) {
              shakeOn(fx, 1);
              showFlash(UI.fall, 'bad');
              setMessage(UI.fall);
              lastPlayerFoot = null;
            }
            break;
          }
          case 'slip': {
            if (e.obstacle === 'genangan') splash(fx, e.side, e.x + 0.2, w.steps);
            else dustPuff(fx, e.side, e.x + 0.2, 0.8, dark, w.steps);
            if (e.side === 0) {
              shakeOn(fx, 0.35);
              showFlash(UI.slip, 'bad');
              setMessage(UI.slip);
              lastPlayerFoot = null;
            }
            break;
          }
          case 'up':
            animReset(anims[e.side], w.racers[e.side].x);
            if (e.side === 0) setMessage('');
            break;
          case 'finish':
            setMessage(finishText(e.side, e.time));
            if (e.side === 0) {
              showFlash(UI.finish, 'good');
              confetti(fx, w.track.length, w.steps);
            }
            break;
          case 'end': {
            const r = e.result;
            setResult(r);
            const s = w.racers[0].stats;
            setPlayerStats({ perfect: s.perfect, falls: s.falls, slips: s.slips });
            if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
            overlayTimer.current = window.setTimeout(() => {
              setOverlay('end');
              for (const p of endPhrase(r.winner)) sound.api.current?.at(0, p);
            }, END_OVERLAY_MS);
            break;
          }
        }
      }
    };

    const scheduleSound = (simNow: number) => {
      const api = sound.api.current;
      while (nextTick < w.countdown && w.t >= nextTick) {
        if (simNow - nextTick < 0.2) api?.at(0, countdownSounds());
        nextTick += 1;
      }
      if (w.result) return;
      if (variant === 'batok') {
        while (w.countdown + beatTime(nextBeat) <= simNow + BEAT_LOOKAHEAD) {
          const at = w.countdown + beatTime(nextBeat);
          if (at - simNow > -0.03) api?.at(Math.max(0, at - simNow), batokPulse(nextBeat));
          nextBeat += 1;
        }
      } else {
        const r = w.racers[0];
        if (r.phase === 'walking' && r.lastFoot !== null && raceTime(w) >= 0) {
          const d = Math.min(timeToIdeal(r, 'L'), timeToIdeal(r, 'R'));
          const ext = w.t + d;
          if (d <= 0.15 && ext > lastExtreme + 0.25) {
            lastExtreme = ext;
            if (debug) extremes.push(ext);
            api?.at(Math.max(0, ext - simNow), BAMBU_PULSE);
          }
        }
      }
    };

    const updateUiState = () => {
      let next: string | null = null;
      if (w.t < w.countdown) next = String(Math.max(1, Math.ceil(w.countdown - w.t - 1e-9)));
      else if (w.t < goShownUntil) next = UI.go;
      if (next !== shownCount) {
        shownCount = next;
        setCount(next);
        if (next && next !== UI.go) setMessage(`${UI.ready} ${next}`);
      }
      const st: Stage = w.result ? 'done' : w.t < w.countdown ? 'countdown' : 'race';
      if (st !== shownStage) {
        shownStage = st;
        setStage(st);
      }
    };

    const updateHud = (renderX: [number, number]) => {
      const clockText = w.t < w.countdown ? formatClock(0) : formatClock(w.result ? Math.min(raceTime(w), Math.max(...w.result.times.map((t) => t ?? 0))) : raceTime(w));
      const own = w.racers[0].finishT;
      const text = own !== null ? formatClock(own) : clockText;
      if (text !== hud.clock && clockTextRef.current) {
        hud.clock = text;
        clockTextRef.current.textContent = text;
      }
      for (const side of [0, 1] as const) {
        const frac = Math.min(1, renderX[side] / w.track.length);
        const tr = `scaleX(${frac.toFixed(3)})`;
        if (tr !== hud.p[side] && progressRefs[side].current) {
          hud.p[side] = tr;
          progressRefs[side].current!.style.transform = tr;
        }
        const d = `${Math.min(w.track.length, Math.floor(renderX[side]))} / ${w.track.length} ${UI.metres}`;
        if (d !== hud.d[side] && distRefs[side].current) {
          hud.d[side] = d;
          distRefs[side].current!.textContent = d;
        }
      }
    };

    const draw = (renderX: [number, number], renderT: number, dtReal: number, now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [sx, sy] = shakeOffset(fx, now / 1000);
      ctx.clearRect(0, 0, view.w, view.h);
      ctx.translate(sx, sy);
      // Camera: follows the player, a little smoothed.
      cam += (renderX[0] - cam) * Math.min(1, dtReal * 7);
      if (tile) drawMid(ctx, view, tile, cam);
      drawTrackCached(ctx, view, w.track, cam, dark, lanes);
      const poseOf = (side: Side) => {
        const r = w.racers[side];
        // Length of the current penalty phase (s), for the fall / climb / stumble animation.
        const penalty = DEFAULT_RULES[variant].penaltySeconds;
        const pen = variant === 'bambu' ? penalty * (r.phase === 'fallen' ? TUNING.bambu.fallShare : 1 - TUNING.bambu.fallShare) : penalty;
        return {
          side,
          x: renderX[side],
          tilt: r.swayAmp * Math.sin(r.swayPhase),
          phase: r.phase,
          progress: r.phase === 'walking' || r.phase === 'finished' ? 0 : 1 - r.phaseLeft / pen,
          finished: r.finishT !== null,
        };
      };
      // Back lane first.
      drawRacer(ctx, view, w.track, cam, poseOf(1), anims[1], renderT, variant);
      drawRacer(ctx, view, w.track, cam, poseOf(0), anims[0], renderT, variant);
      drawEffects(ctx, view, w.track, cam, fx);
      // Tags and indicators.
      const hh = headHeight(variant);
      const [cx, cy] = toScreen(view, cam, renderX[1], ROW.computer, hh + 0.25, w.track);
      drawTag(ctx, NAMES[1], cx, cy, SWATCH_CSS[1], view.w);
      const p = w.racers[0];
      if (variant === 'bambu') {
        // The balance arc sits at the bottom centre, above the tap pads (near the thumbs).
        drawBalanceArc(ctx, view, view.w / 2, view.h - (view.compact ? 58 : view.w >= 640 ? 96 : 74), p, { left: UI.left, right: UI.right });
      } else {
        const [fx2, fy2] = toScreen(view, cam, renderX[0], ROW.player, 0, w.track);
        const nextFoot = p.lastFoot ? otherFoot(p.lastFoot) : null;
        drawRhythmRing(ctx, view, fx2, fy2, p, renderT - w.countdown, nextFoot === 'L' ? UI.left : nextFoot === 'R' ? UI.right : '');
      }
      const [tx, ty] = toScreen(view, cam, renderX[0], ROW.player, hh + 0.2, w.track);
      drawTag(ctx, NAMES[0], tx, ty, SWATCH_CSS[0], view.w);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (debug) {
        fpsTimes.push(now);
        while (fpsTimes.length && fpsTimes[0] < now - 2000) fpsTimes.shift();
        const fps = fpsTimes.length > 1 ? ((fpsTimes.length - 1) * 1000) / (fpsTimes[fpsTimes.length - 1] - fpsTimes[0]) : 0;
        if (Math.abs(fps - fpsShown) >= 0.5 && fpsRef.current) {
          fpsShown = fps;
          fpsRef.current.textContent = `${fps.toFixed(1)} fps · dpr ${dpr} · ${Math.round(view.w * dpr)}x${Math.round(view.h * dpr)}`;
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      let alpha = 1;
      if (pausedRef.current) pauseClock(clock, now);
      else {
        resumeClock(clock, now);
        fx.reduced = reducedRef.current;
        let target = simAt(clock, now);
        if (target - w.t > MAX_LAG_SECONDS) {
          clock.origin += (target - w.t - MAX_LAG_SECONDS) * 1000;
          target = simAt(clock, now);
        }
        let n = 0;
        while (w.t + DT <= target + 1e-9 && !w.result && n < MAX_STEPS_PER_FRAME) {
          prevX = [w.racers[0].x, w.racers[1].x];
          const inputs: StepInput[] = takeInputs(q, w.t + DT).map((foot) => ({ side: 0 as const, foot }));
          if (autoplay) {
            const f = autoplay(w, 0);
            if (f) inputs.push({ side: 0, foot: f });
          }
          const af = ai(w, 1);
          if (af) inputs.push({ side: 1, foot: af });
          stepWorld(w, inputs);
          if (w.events.length) handleEvents(w.events, w.t);
          n += 1;
        }
        alpha = w.result ? 1 : Math.max(0, Math.min(1, (target - w.t) / DT));
        scheduleSound(target);
      }
      const renderX: [number, number] = [prevX[0] + (w.racers[0].x - prevX[0]) * alpha, prevX[1] + (w.racers[1].x - prevX[1]) * alpha];
      const renderT = w.t - DT + alpha * DT;
      animUpdate(anims[0], renderT, dtReal);
      animUpdate(anims[1], renderT, dtReal);
      if (!pausedRef.current) updateEffects(fx, dtReal);
      draw(renderX, renderT, dtReal, now);
      updateHud(renderX);
      updateUiState();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        pauseClock(clock, performance.now());
      } else if (!raf) {
        last = performance.now();
        if (!pausedRef.current) resumeClock(clock, performance.now());
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    const hook = debug
      ? {
          stage: () => (w.result ? 'done' : w.t < w.countdown ? 'countdown' : 'race'),
          world: () => cloneWorld(w),
          step: (foot: Foot) => queueStep(q, foot, simAt(clock, performance.now()), w.t),
          /** Lets the computer model play the player's side (recordings, fps measurements); null stops it. */
          autoplay: (level: EgrangSettings['level'] | null) => {
            autoplay = level ? createAi(variant, level, seed + 17) : null;
          },
          fps: () => (fpsTimes.length > 1 ? ((fpsTimes.length - 1) * 1000) / (fpsTimes[fpsTimes.length - 1] - fpsTimes[0]) : 0),
          /** Offline WAV of the race so far (base64, 48 kHz stereo; WAV time 0 = countdown start). */
          renderWav: async () => {
            const { renderOffline, toBase64 } = await import('@/lib/audio/offline');
            const cues = raceCueSheet(variant, w.countdown, record, extremes);
            const seconds = Math.max(5, (cues.length ? cues[cues.length - 1].at / 1000 : w.t) + 4);
            const out = await renderOffline({ cues, sounds: egrangSoundList(variant), seconds });
            return { wav: toBase64(out.wav), seconds, cues: out.cues, peakVoices: out.peakVoices };
          },
        }
      : null;
    if (hook) (window as unknown as { __nlEgrang?: unknown }).__nlEgrang = hook;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
      if (hook) delete (window as unknown as { __nlEgrang?: unknown }).__nlEgrang;
      worldRef.current = null;
      queueRef.current = null;
      clockRef.current = null;
    };
    // progressRefs / distRefs are stable refs; the settings and the seed define the race.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, variant, settings.level, debug, showFlash]);

  // Keyboard: ← / → (A / L) anywhere on the page while the race view is shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const foot = footFromKey(e.key);
      if (!foot) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      if (e.repeat) return;
      setInputMode('keyboard');
      pressPad(foot);
      step(foot, e.timeStamp);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // pressPad only touches refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (overlay === 'end') endHeadingRef.current?.focus();
  }, [overlay]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const foot = footFromPointer(e.clientX, r.left, r.width);
    sound.unlockIfBlocked();
    setInputMode('touch');
    pressPad(foot);
    step(foot, e.timeStamp);
  };

  const chip = (side: Side) => (
    <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-2 ${compact ? 'py-0.5' : 'py-1'}`} data-testid={`egrang-chip-${side}`}>
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-black/20"
        style={{ background: side === 0 ? `radial-gradient(circle, #ffe7b0 22%, transparent 24%) 0 0 / 6px 6px, ${SWATCH_CSS[0]}` : `repeating-linear-gradient(0deg, ${SWATCH_CSS[1]} 0 3px, #9fd6ef 3px 5px)` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-xs font-semibold">{NAMES[side]}</span>
          <span ref={distRefs[side]} className="ml-auto whitespace-nowrap text-[11px] font-bold tabular-nums text-muted-foreground" />
        </div>
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div ref={progressRefs[side]} className="h-full w-full origin-left rounded-full" style={{ transform: 'scaleX(0)', background: SWATCH_CSS[side] }} />
        </div>
      </div>
    </div>
  );

  const pad = (foot: Foot) => (
    <div
      ref={padRefs[foot]}
      className={`pointer-events-none absolute bottom-2 flex ${compact ? 'h-11 w-[26%] text-sm' : 'h-14 w-[42%] text-base sm:h-20 sm:text-lg'} max-w-[15rem] items-center justify-center gap-2 rounded-2xl border-2 border-white/60 bg-black/30 font-extrabold uppercase tracking-wider text-white shadow-lg transition-transform duration-75 data-[pressed]:scale-95 data-[pressed]:bg-white/35 ${foot === 'L' ? 'left-2' : 'right-2'}`}
      aria-hidden
      data-testid={`egrang-pad-${foot}`}
    >
      {foot === 'L' ? <span aria-hidden>←</span> : null}
      {foot === 'L' ? UI.left : UI.right}
      {foot === 'R' ? <span aria-hidden>→</span> : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="egrang-race" data-stage={stage} data-variant={variant} data-level={settings.level} data-overlay={overlay} data-input={inputMode} data-winner={result ? String(result.winner) : ''}>
      <div className="relative mt-1 min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div
          ref={wrapRef}
          className="absolute inset-0 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          role="application"
          aria-roledescription={UI.canvasLabel}
          aria-label={`${UI.canvasLabel}. ${UI.tapHint} ${UI.keyboardHint}`}
          onPointerDown={onPointerDown}
          onContextMenu={(e) => e.preventDefault()}
          data-testid="egrang-canvas-wrap"
        >
          <canvas ref={bgRef} className="absolute inset-0 block h-full w-full" aria-hidden />
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />
          {pad('L')}
          {pad('R')}
        </div>

        {/* HUD over the sky: both racers' progress and the race clock. */}
        <div className="pointer-events-none absolute inset-x-1.5 top-1.5 flex items-center gap-1.5" data-testid="egrang-hud">
          {chip(0)}
          <div className="flex shrink-0 flex-col items-center rounded-xl border border-border/70 bg-card/90 px-2 py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{UI.timer}</span>
            <span ref={clockTextRef} className="text-sm font-extrabold tabular-nums" data-testid="egrang-clock">
              0,0
            </span>
          </div>
          {chip(1)}
        </div>

        <AnimatePresence>
          {count && overlay === 'none' && !tutorialOpen && (
            <motion.div
              key={count}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
              data-testid="egrang-countdown"
            >
              <span className="rounded-3xl bg-black/35 px-6 py-2 text-5xl font-black text-white drop-shadow-lg sm:text-7xl">{count}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {flash && overlay === 'none' && (
            <motion.div
              key={flash.key}
              className={`pointer-events-none absolute inset-x-0 flex justify-center ${compact ? 'top-[34%]' : 'top-[22%]'}`}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.8, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
              onAnimationComplete={() => window.setTimeout(() => setFlash((f) => (f?.key === flash.key ? null : f)), 650)}
              data-testid="egrang-flash"
            >
              <span className={`rounded-full px-4 py-1.5 text-base font-extrabold shadow-lg ${flash.tone === 'good' ? 'bg-[#ffd24a] text-[#4a2c12]' : 'bg-[#e0412f] text-white'}`}>{flash.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {debug && <span ref={fpsRef} className="pointer-events-none absolute left-2 top-14 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white" data-testid="egrang-fps" />}

        {compact && (
          <p className="pointer-events-none absolute inset-x-[28%] bottom-3 text-center text-xs font-semibold leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" aria-live="polite" data-testid="egrang-message">
            {message}
          </p>
        )}

        {overlay === 'end' && result && (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-background/40 p-2 sm:p-4" data-testid="egrang-end">
            <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-center text-card-foreground shadow-xl sm:p-5" aria-labelledby="egrang-result">
              <h2 id="egrang-result" ref={endHeadingRef} tabIndex={-1} className="text-2xl font-extrabold text-primary outline-none">
                {raceHeading(result.winner)}
              </h2>
              <p className="mt-1 text-sm font-semibold tabular-nums">{raceSummary(result, worldRef.current?.track.length ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{statsLine(variant, playerStats)}</p>
              <div className="mt-3 flex flex-col gap-2 landscape:max-[500px]:mt-2 landscape:max-[500px]:flex-row landscape:max-[500px]:[&>*]:flex-1">
                <button type="button" onClick={onRestart} data-testid="egrang-main-lagi" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring">
                  {UI.playAgain}
                </button>
                <button type="button" onClick={onSettings} className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {UI.changeSettings}
                </button>
                {backLink && (
                  <Link href={backLink.href} prefetch={false} className="rounded-xl px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="egrang-end-back">
                    {backLink.label}
                  </Link>
                )}
              </div>
            </section>
          </div>
        )}

        {tutorialOpen && (
          <Tutorial
            variant={variant}
            onClose={() => {
              markTutorialSeen(variant);
              setTutorialOpen(false);
              wrapRef.current?.focus({ preventScroll: true });
            }}
          />
        )}
      </div>

      {!compact && (
        <>
          <div className="mt-1 flex min-h-[2.25rem] flex-col justify-center">
            <p className="text-center text-xs font-semibold leading-snug sm:text-sm" aria-live="polite" data-testid="egrang-message">
              {message}
            </p>
            <p className="text-center text-[11px] leading-snug text-muted-foreground">
              {RACE_HINT[variant]} {inputMode === 'keyboard' ? UI.keyboardHint : ''}
            </p>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">{NO_DATA_NOTE}</p>
        </>
      )}
      {/* The result in words for screen readers, with the times. */}
      {result && (
        <p className="sr-only" aria-live="polite">
          {raceHeading(result.winner)} {raceSummary(result, worldRef.current?.track.length ?? 0)} {result.times[0] !== null ? `${formatSeconds(result.times[0])} ${UI.seconds}` : ''}
        </p>
      )}
    </div>
  );
}
