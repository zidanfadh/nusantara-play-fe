'use client';

/**
 * The gasing play view (Phase 20): the canvas with its fixed-step loop (1/120 s simulation, interpolated
 * drawing, device pixel ratio capped at 2, paused while the tab is hidden or a dialog / the tutorial is
 * open), the slingshot and keyboard controls, the HUD (round dots, spin meters with timers, turn banner),
 * the round and end overlays. The match itself is lib/games/gasing/match.ts; nothing is recorded or sent.
 */
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';
import { predictLanding, throwOrigin, STEP_HZ } from '@/lib/games/gasing/physics';
import {
  createMatch,
  currentThrow,
  lastResult,
  matchStep,
  nextRound,
  playerRole,
  playerThrow,
  type MatchState,
  type Stage,
} from '@/lib/games/gasing/match';
import type { GasingSettings } from '@/lib/games/gasing/settings';
import { markTutorialSeen, tutorialSeen } from '@/lib/games/gasing/settings';
import { cueSound } from '@/lib/games/gasing/sound';
import {
  NAMES,
  NO_DATA_NOTE,
  UI,
  endText,
  formatSeconds,
  matchHeading,
  matchSummary,
  roundHeading,
  roundResultText,
} from '@/lib/games/gasing/texts';
import {
  beginDrag,
  deadZonePx,
  dragAim,
  keyAimAdjust,
  keyAimAngle,
  keyAimStart,
  keyCharge,
  keyHeldMs,
  keyRelease,
  moveDrag,
  releaseDrag,
  windState,
  type DragState,
  type DragView,
  type KeyAim,
} from '@/lib/games/gasing/throw';
import type { RoundResult, Side, Throw, TopState, WorldEvent } from '@/lib/games/gasing/types';
import {
  HELD_DISTANCE,
  SWATCH_CSS,
  TOP_STYLES,
  computeView,
  createEffects,
  drawAim,
  drawArena,
  drawEffects,
  drawTag,
  drawTop,
  dustPuff,
  shakeOffset,
  sparks,
  toScreen,
  updateEffects,
  type View,
} from './render';
import { Tutorial } from './Tutorial';

const STEP_MS = 1000 / STEP_HZ;

// Landscape phones: the HUD moves into a side column so the arena gets the full height.
const COMPACT = '(orientation: landscape) and (max-height: 500px)';
function subscribeCompact(onChange: () => void) {
  const mq = window.matchMedia(COMPACT);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isCompact = () => window.matchMedia(COMPACT).matches;
const MAX_STEPS_PER_FRAME = 12;
const DPR_CAP = 2;
/** The round / end overlay appears this long after the decision, so the last moment is visible. */
const ROUND_OVERLAY_MS = 900;
const END_OVERLAY_MS = 1300;
/** Spin that fills the HUD meter (rad/s). */
const METER_FULL = 165;

interface UiSnapshot {
  stage: Stage;
  round: number;
  wins: [number, number];
  results: RoundResult[];
  next: Side | null;
  role: 'uri' | 'target' | 'striker';
  winner: MatchState['winner'];
}

interface Snap {
  x: number;
  y: number;
  angle: number;
  tilt: number;
  precession: number;
  flightT: number;
}

function snapOf(t: TopState): Snap {
  return { x: t.x, y: t.y, angle: t.angle, tilt: t.tilt, precession: t.precession, flightT: t.flightT };
}

function uiOf(m: MatchState): UiSnapshot {
  return {
    stage: m.stage,
    round: m.round,
    wins: [m.wins[0], m.wins[1]],
    results: [...m.results],
    next: currentThrow(m)?.side ?? null,
    role: playerRole(m),
    winner: m.winner,
  };
}

/** The top in hand: just outside the ring on its side; pulled back a little while aiming. */
function heldPosition(side: Side, pull: number, angle: number): { x: number; y: number } {
  const y = (side === 0 ? 1 : -1) * HELD_DISTANCE;
  return { x: -Math.cos(angle) * pull, y: y - Math.sin(angle) * pull };
}

interface Props {
  settings: GasingSettings;
  seed: number;
  reducedMotion: boolean;
  debug: boolean;
  dialogOpen: boolean;
  backLink: { href: string; label: string } | null;
  onRestart: () => void;
  onSettings: () => void;
}

export function GasingArena({ settings, seed, reducedMotion, debug, dialogOpen, backLink, onRestart, onSettings }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The static arena (drawn on resize only) and the layer both canvases sit in (shaken with CSS). */
  const bgRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<MatchState | null>(null);
  const viewRef = useRef<View | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const keyRef = useRef<KeyAim | null>(null);
  const keysHeld = useRef({ left: false, right: false, up: false, down: false });
  const pausedRef = useRef(false);
  const eventsRef = useRef<WorldEvent[]>([]);
  const meterRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)] as const;
  const timeRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
  const fpsRef = useRef<HTMLSpanElement>(null);
  const overlayTimer = useRef<number | null>(null);
  const roundButtonRef = useRef<HTMLButtonElement>(null);
  const endHeadingRef = useRef<HTMLHeadingElement>(null);

  const [ui, setUi] = useState<UiSnapshot | null>(null);
  const [overlay, setOverlay] = useState<'none' | 'round' | 'end'>('none');
  const [message, setMessage] = useState('');
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !tutorialSeen());
  const [inputMode, setInputMode] = useState<'pointer' | 'keyboard'>('pointer');
  const compact = useSyncExternalStore(subscribeCompact, isCompact, () => false);

  const reducedRef = useRef(reducedMotion);
  useEffect(() => {
    pausedRef.current = tutorialOpen || dialogOpen;
    reducedRef.current = reducedMotion;
  }, [tutorialOpen, dialogOpen, reducedMotion]);

  const showFlash = useCallback((text: string) => {
    setFlash((f) => ({ text, key: (f?.key ?? 0) + 1 }));
  }, []);

  const throwNow = useCallback(
    (t: Throw) => {
      const m = matchRef.current;
      if (!m || pausedRef.current) return false;
      const ok = playerThrow(m, t, eventsRef.current);
      if (ok) {
        cueSound('throw');
        setMessage(UI.playerThrows);
        if (t.perfect) {
          cueSound('perfect');
          showFlash(UI.perfect);
        }
      }
      return ok;
    },
    [showFlash],
  );

  // The match and the frame loop. A new seed (restart) starts a new match.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    // The browser's default (GPU-backed) 2D canvas. `?debug=1&canvas=cpu` switches to a CPU-backed canvas for
    // comparison on real devices (Phase 20, headless software rendering, Pangkah collision: GPU-backed phone
    // 41 / 40 fps at 1x / 4x CPU, desktop 22 / 26; CPU-backed phone 53 / 35, desktop 36 / 36).
    // No `desynchronized`: it bypassed the compositor and the tops were missing from screenshots.
    const backend = debug ? new URLSearchParams(window.location.search).get('canvas') : null;
    const ctx = canvas.getContext('2d', { willReadFrequently: backend === 'cpu' });
    if (!ctx) return;
    const m = createMatch(settings.mode, settings.level, seed);
    matchRef.current = m;
    dragRef.current = null;
    keyRef.current = null;
    const arena = bgRef.current;
    const layer = layerRef.current;
    if (!arena || !layer) return;
    let shaking = false;
    const fx = createEffects(reducedRef.current);
    let dpr = 1;
    let view: View = computeView(1, 1);
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      view = computeView(Math.max(1, r.width), Math.max(1, r.height));
      viewRef.current = view;
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      drawArena(arena, view, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const prev: [Snap, Snap] = [snapOf(m.world.tops[0]), snapOf(m.world.tops[1])];
    let lastStage: Stage | null = null;
    let lastRound = -1;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const hudText: [string, string] = ['', ''];
    const hudWidth: [string, string] = ['', ''];
    const fpsTimes: number[] = [];
    let fpsShown = 0;

    const handleEvents = (events: WorldEvent[]) => {
      for (const e of events) {
        if (e.type === 'land') {
          cueSound('land');
          dustPuff(fx, view, e.x, e.y, e.strength);
          if (e.direct && e.side === 0 && m.mode === 'pangkah') showFlash(UI.directHit);
        } else if (e.type === 'hit') {
          cueSound('hit');
          sparks(fx, view, e.x, e.y, e.strength);
          if (!fx.reduced && e.strength > 0.4 && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(Math.round(Math.min(60, 12 + e.strength * 18)));
            } catch {
              // vibration blocked: ignore
            }
          }
        } else if (e.type === 'stop' || e.type === 'out') {
          cueSound(e.type);
          if (e.type === 'stop') dustPuff(fx, view, e.x, e.y, 0.3);
          // After the decision the round result stays the message.
          if (m.stage !== 'round-over' && m.stage !== 'match-over') setMessage(endText(e.side, e.type === 'out' ? 'keluar' : 'jatuh'));
        } else if (e.type === 'throw' && e.side === 1) {
          setMessage(UI.computerThrows);
        }
      }
    };

    const checkStage = () => {
      if (m.stage === lastStage && m.round === lastRound) return;
      const was = lastStage;
      lastStage = m.stage;
      lastRound = m.round;
      setUi(uiOf(m));
      if (m.stage === 'aim') {
        setMessage(`${UI.yourTurn}. ${m.mode === 'uri' ? UI.roleUri : playerRole(m) === 'striker' ? UI.roleStriker : UI.roleTarget}`);
      } else if ((m.stage === 'round-over' || m.stage === 'match-over') && was !== m.stage) {
        const r = lastResult(m);
        if (r) setMessage(roundResultText(m.round, r.winner, r.reason, r.times));
        cueSound(m.stage === 'match-over' ? 'match' : 'round');
        if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
        overlayTimer.current = window.setTimeout(
          () => setOverlay(m.stage === 'match-over' ? 'end' : 'round'),
          m.stage === 'match-over' ? END_OVERLAY_MS : ROUND_OVERLAY_MS,
        );
      }
    };

    const updateHud = () => {
      for (const side of [0, 1] as const) {
        const t = m.world.tops[side];
        const time = `${formatSeconds(t.spinTime)} ${UI.seconds}`;
        if (time !== hudText[side] && timeRefs[side].current) {
          hudText[side] = time;
          timeRefs[side].current!.textContent = time;
        }
        // scaleX, not width: no layout per frame.
        const width = `scaleX(${(Math.round(Math.min(1, Math.abs(t.spin) / METER_FULL) * 100) / 100).toFixed(2)})`;
        if (width !== hudWidth[side] && meterRefs[side].current) {
          hudWidth[side] = width;
          meterRefs[side].current!.style.transform = width;
        }
      }
    };

    const draw = (alpha: number, frameDt: number, now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      // The arena is its own canvas underneath (never repainted per frame); the shake moves the whole layer
      // with a compositor-only transform.
      const [sx, sy] = shakeOffset(fx);
      if (sx || sy) {
        layer.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        shaking = true;
      } else if (shaking) {
        layer.style.transform = '';
        shaking = false;
      }

      // The player's live aim (pointer or keyboard).
      const aiming = m.stage === 'aim' && !pausedRef.current;
      const drag = aiming ? dragRef.current : null;
      const key = aiming && !drag ? keyRef.current : null;
      const dview: DragView = { maxDragPx: maxDrag(view), ySquash: view.squash };
      let aim: { angle: number; power: number; cancel: boolean } | null = null;
      let heldMs = 0;
      if (drag) {
        aim = dragAim(drag, dview);
        heldMs = now - drag.steadySince;
      } else if (key) {
        aim = { angle: keyAimAngle(key), power: key.power, cancel: false };
        heldMs = keyHeldMs(key, now);
      }

      const order = [0, 1].sort((a, b) => m.world.tops[a].y - m.world.tops[b].y) as Side[];
      for (const side of order) {
        const t = m.world.tops[side];
        const p = prev[side];
        const lerp = (a: number, b: number) => a + (b - a) * alpha;
        const shown = {
          ...t,
          x: lerp(p.x, t.x),
          y: lerp(p.y, t.y),
          tilt: lerp(p.tilt, t.tilt),
          flightT: t.phase === 'flying' ? lerp(p.flightT, t.flightT) : t.flightT,
          angle: t.angle + t.spin * alpha * (1 / STEP_HZ),
        };
        if (t.phase === 'held') {
          const mine = side === 0 && aim && !aim.cancel;
          const w = mine && (drag || key?.chargingSince != null) ? windState(heldMs) : null;
          const pos = heldPosition(side, mine ? aim!.power * 0.07 : 0, mine ? aim!.angle : side === 0 ? -Math.PI / 2 : Math.PI / 2);
          drawTop(ctx, view, shown, TOP_STYLES[side], 0, { ...pos, winding: w?.winding ?? 0, inWindow: w?.inWindow ?? false });
          const [tx, ty] = toScreen(view, pos.x, pos.y);
          drawTag(ctx, NAMES[side], tx + view.R * 0.32, ty - t.radius * view.R);
        } else {
          drawTop(ctx, view, shown, TOP_STYLES[side], t.spin * frameDt, null);
        }
      }
      if (aim && aiming) {
        const o = throwOrigin(0);
        const landing = predictLanding(0, { angle: aim.angle, power: aim.power, quality: 1, perfect: false });
        drawAim(ctx, view, {
          origin: o,
          landing,
          power: aim.power,
          cancel: aim.cancel,
          drag: drag ? { sx: drag.startX, sy: drag.startY, ex: drag.lastX, ey: drag.lastY, dead: deadZonePx(dview) } : null,
          topRadius: m.world.tops[0].radius,
        });
      }
      drawEffects(ctx, fx);

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

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, now - last);
      last = now;
      if (!pausedRef.current) {
        fx.reduced = reducedRef.current;
        const k = keyRef.current;
        if (k && m.stage === 'aim') keyRef.current = keyAimAdjust(k, keysHeld.current, dt, now);
        acc += dt;
        let n = 0;
        while (acc >= STEP_MS && n < MAX_STEPS_PER_FRAME) {
          prev[0] = snapOf(m.world.tops[0]);
          prev[1] = snapOf(m.world.tops[1]);
          matchStep(m, eventsRef.current);
          acc -= STEP_MS;
          n += 1;
        }
        if (n === MAX_STEPS_PER_FRAME) acc = 0;
        if (eventsRef.current.length) {
          handleEvents(eventsRef.current);
          eventsRef.current.length = 0;
        }
      }
      updateEffects(fx, dt / 1000);
      draw(pausedRef.current ? 1 : acc / STEP_MS, dt / 1000, now);
      updateHud();
      checkStage();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = performance.now();
        acc = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    const hook = debug
      ? {
          stage: () => m.stage,
          round: () => m.round,
          wins: () => [...m.wins],
          results: () => m.results.map((r) => ({ ...r })),
          world: () => JSON.parse(JSON.stringify(m.world)),
          throw: (t: Throw) => throwNow(t),
          fps: () => (fpsTimes.length > 1 ? ((fpsTimes.length - 1) * 1000) / (fpsTimes[fpsTimes.length - 1] - fpsTimes[0]) : 0),
        }
      : null;
    if (hook) (window as unknown as { __nlGasing?: unknown }).__nlGasing = hook;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
      if (hook) delete (window as unknown as { __nlGasing?: unknown }).__nlGasing;
      matchRef.current = null;
    };
    // timeRefs / meterRefs are stable refs; settings and seed define the match.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, settings.mode, settings.level, debug, showFlash, throwNow]);

  // Focus the round button / end heading when they appear.
  useEffect(() => {
    if (overlay === 'round') roundButtonRef.current?.focus();
    if (overlay === 'end') endHeadingRef.current?.focus();
  }, [overlay]);

  const goNextRound = () => {
    const m = matchRef.current;
    if (!m) return;
    nextRound(m);
    setOverlay('none');
    setMessage(UI.roundOf(m.round));
  };

  // ---- Pointer --------------------------------------------------------------------------------------------
  const localPoint = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const m = matchRef.current;
    if (!m || m.stage !== 'aim' || pausedRef.current || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = localPoint(e);
    dragRef.current = beginDrag(0, x, y, performance.now());
    keyRef.current = null;
    setInputMode('pointer');
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const v = viewRef.current;
    if (!d || !v) return;
    const [x, y] = localPoint(e);
    dragRef.current = moveDrag(d, x, y, performance.now(), { maxDragPx: maxDrag(v), ySquash: v.squash });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const v = viewRef.current;
    dragRef.current = null;
    if (!d || !v) return;
    const [x, y] = localPoint(e);
    const view: DragView = { maxDragPx: maxDrag(v), ySquash: v.squash };
    const t = releaseDrag(moveDrag(d, x, y, performance.now(), view), performance.now(), view);
    if (!t) setMessage(UI.cancelled);
    else throwNow(t);
  };

  // ---- Keyboard -------------------------------------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const m = matchRef.current;
    const map: Record<string, keyof typeof keysHeld.current> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) {
      e.preventDefault();
      keysHeld.current[map[e.key]] = true;
      if (m?.stage === 'aim') {
        keyRef.current ??= keyAimStart(0);
        setInputMode('keyboard');
      }
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (e.repeat || m?.stage !== 'aim' || pausedRef.current) return;
      dragRef.current = null;
      keyRef.current = keyCharge(keyRef.current ?? keyAimStart(0), performance.now());
      setInputMode('keyboard');
    } else if (e.key === 'Escape' && keyRef.current?.chargingSince != null) {
      keyRef.current = { ...keyRef.current, chargingSince: null };
      setMessage(UI.cancelled);
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, keyof typeof keysHeld.current> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) keysHeld.current[map[e.key]] = false;
    else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const k = keyRef.current;
      if (!k || k.chargingSince === null) return;
      const t = keyRelease(k, performance.now());
      keyRef.current = { ...k, chargingSince: null };
      throwNow(t);
    }
  };

  // ---- HUD ------------------------------------------------------------------------------------------------
  const stage = ui?.stage ?? 'wait';
  const banner =
    stage === 'aim' ? UI.yourTurn : stage === 'wait' && ui?.next === 1 ? UI.computerTurn : stage === 'wait' || stage === 'running' ? UI.spinning : null;
  const bannerSide: Side | null = stage === 'aim' ? 0 : stage === 'wait' && ui?.next === 1 ? 1 : null;
  const roleLine = !ui ? '' : settings.mode === 'uri' ? UI.roleUri : ui.role === 'striker' ? UI.roleStriker : UI.roleTarget;
  const result = ui?.results[ui.results.length - 1] ?? null;

  const chip = (side: Side) => (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5" data-testid={`gasing-chip-${side}`}>
      <span className="h-5 w-5 shrink-0 rounded-full border border-black/20" style={{ background: SWATCH_CSS[side] }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-xs font-semibold sm:text-sm">{NAMES[side]}</span>
          <span ref={timeRefs[side]} className="ml-auto whitespace-nowrap text-xs font-bold tabular-nums sm:text-sm" aria-label={`${UI.spinMeter} ${NAMES[side]}`}>
            0,0 {UI.seconds}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div ref={meterRefs[side]} className="h-full w-full origin-left rounded-full" style={{ transform: 'scaleX(0)', background: side === 0 ? TOP_STYLES[0].band1 : TOP_STYLES[1].band1 }} />
        </div>
      </div>
    </div>
  );

  const dots = (
    <div className="flex items-center justify-center gap-1.5" aria-label={ui ? `${UI.roundOf(ui.round)}. ${matchSummary(ui.wins)}` : undefined} data-testid="gasing-round-dots">
      {Array.from({ length: 3 }, (_, i) => {
        const r = ui?.results.filter((x) => x.winner !== 'draw')[i];
        const bg = r ? (r.winner === 0 ? SWATCH_CSS[0] : SWATCH_CSS[1]) : undefined;
        return <span key={i} className={`h-3.5 w-3.5 rounded-full border ${r ? 'border-black/30' : 'border-muted-foreground/50'}`} style={bg ? { background: bg } : undefined} aria-hidden />;
      })}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="gasing-arena" data-stage={stage} data-round={ui?.round ?? 1} data-wins={ui ? `${ui.wins[0]},${ui.wins[1]}` : '0,0'} data-mode={settings.mode} data-level={settings.level} data-overlay={overlay} data-input={inputMode}>
      <div className={compact ? 'flex min-h-0 flex-1 gap-2' : 'contents'}>
      <div className={compact ? 'flex w-40 shrink-0 flex-col justify-center gap-2' : 'grid grid-cols-[1fr_auto_1fr] items-center gap-2'}>
        {chip(1)}
        <div className={`flex flex-col items-center gap-0.5 px-1 ${compact ? 'order-first' : ''}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{ui ? UI.roundOf(ui.round) : ''}</span>
          {dots}
        </div>
        {chip(0)}
      </div>

      <div className={`relative min-h-0 flex-1 ${compact ? '' : 'mt-1.5'}`}>
        <div
          ref={wrapRef}
          className="absolute inset-0 touch-none select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          role="application"
          aria-roledescription={UI.canvasLabel}
          aria-label={`${UI.canvasLabel}. ${UI.keyboardHint}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => {
            keysHeld.current = { left: false, right: false, up: false, down: false };
          }}
          data-testid="gasing-canvas-wrap"
        >
          <div ref={layerRef} className="absolute inset-0">
            <canvas ref={bgRef} className="absolute inset-0 block h-full w-full" aria-hidden />
            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />
          </div>
        </div>

        {banner && overlay === 'none' && (
          <div className="pointer-events-none absolute left-2 top-2" data-testid="gasing-banner">
            <span
              className="rounded-full px-3 py-1 text-sm font-bold text-white shadow"
              style={{ background: bannerSide === 0 ? TOP_STYLES[0].band1 : bannerSide === 1 ? TOP_STYLES[1].band1 : 'rgba(30,20,10,0.7)' }}
            >
              {banner}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {flash && overlay === 'none' && (
            <motion.div
              key={flash.key}
              className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.8, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.25 }}
              onAnimationComplete={() => window.setTimeout(() => setFlash((f) => (f?.key === flash.key ? null : f)), 900)}
              data-testid="gasing-flash"
            >
              <span className="rounded-full bg-[#ffd24a] px-4 py-1.5 text-base font-extrabold text-[#4a2c12] shadow-lg">{flash.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {debug && (
          <span ref={fpsRef} className="pointer-events-none absolute bottom-1 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white" data-testid="gasing-fps" />
        )}

        {overlay === 'round' && result && ui && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/25 p-4" data-testid="gasing-round-result">
            <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center text-card-foreground shadow-xl" aria-labelledby="gasing-round-title">
              <h2 id="gasing-round-title" className="text-xl font-extrabold text-primary">
                {roundHeading(result.winner)}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{roundResultText(ui.round, result.winner, result.reason, result.times)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {([0, 1] as const).map((s) => (
                  <div key={s} className="flex items-center justify-center gap-2 rounded-xl bg-muted px-2 py-1.5">
                    <span className="h-4 w-4 rounded-full" style={{ background: SWATCH_CSS[s] }} aria-hidden />
                    <span className="font-semibold">{NAMES[s]}</span>
                    <span className="whitespace-nowrap tabular-nums">{result.ends[s] === 'keluar' ? UI.outShort : `${formatSeconds(result.times[s])} ${UI.seconds}`}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{matchSummary(ui.wins)}</p>
              <button
                ref={roundButtonRef}
                type="button"
                onClick={goNextRound}
                data-testid="gasing-next-round"
                className="mt-4 w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
              >
                {UI.nextRound}
              </button>
            </section>
          </div>
        )}

        {overlay === 'end' && ui && ui.winner !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 p-4" data-testid="gasing-end">
            <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center text-card-foreground shadow-xl" aria-labelledby="gasing-result">
              <h2 id="gasing-result" ref={endHeadingRef} tabIndex={-1} className="text-2xl font-extrabold text-primary outline-none">
                {matchHeading(ui.winner)}
              </h2>
              <p className="mt-1 text-sm font-semibold">{matchSummary(ui.wins)}</p>
              <ol className="mt-3 space-y-1 text-left text-xs text-muted-foreground">
                {ui.results.map((r, i) => (
                  <li key={i}>{roundResultText(i + 1, r.winner, r.reason, r.times)}</li>
                ))}
              </ol>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={onRestart} data-testid="gasing-main-lagi" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring">
                  {UI.playAgain}
                </button>
                <button type="button" onClick={onSettings} className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {UI.changeSettings}
                </button>
                {backLink && (
                  <Link href={backLink.href} prefetch={false} className="rounded-xl px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {backLink.label}
                  </Link>
                )}
              </div>
            </section>
          </div>
        )}

        {tutorialOpen && (
          <Tutorial
            onClose={() => {
              markTutorialSeen();
              setTutorialOpen(false);
              wrapRef.current?.focus({ preventScroll: true });
            }}
          />
        )}
      </div>

      </div>

      <div className="mt-1 flex min-h-[2.5rem] flex-col justify-center">
        <p className="text-center text-xs font-semibold leading-snug sm:text-sm" aria-live="polite" data-testid="gasing-message">
          {message}
        </p>
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          {stage === 'aim' ? (inputMode === 'keyboard' ? UI.keyboardHint : UI.aimHint) : stage === 'wait' && ui?.next === 1 ? roleLine : ' '}
        </p>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{NO_DATA_NOTE}</p>
    </div>
  );
}

/** Full-power drag length for this canvas size. */
function maxDrag(v: View): number {
  return Math.max(100, Math.min(240, Math.min(v.w, v.h) * 0.55));
}
