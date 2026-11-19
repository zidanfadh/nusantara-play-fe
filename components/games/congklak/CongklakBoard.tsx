'use client';

/**
 * The congklak board (Phase 17): a warm wooden board drawn in SVG (no images), seeds as small round shapes
 * clustered in each pit, the count always written next to it. Holes are buttons (tap, click, or arrow keys
 * + Enter); illegal holes are dimmed and disabled. The hand marker follows the sowing; with reduced motion
 * it is not shown and nothing moves (only the counts change, with a short highlight).
 *
 * Every pit is a memoized component, so one sowing step re-renders only the pits that changed (cheap on
 * mid-range phones even in long relay chains).
 */
import { memo, useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { SEED_RADIUS, seedOffsets, type BoardGeometry, type PitGeometry } from '@/lib/games/congklak/layout';
import type { Player } from '@/lib/games/congklak/state';
import { STORE_LABEL_FONT_SIZE, storeLabelPlacement } from './store-label';

export interface HandView {
  pit: number;
  count: number;
}

interface CongklakBoardProps {
  geometry: BoardGeometry;
  pits: readonly number[];
  /** Ring indices the current human player may play now (empty while animating or on the computer's turn). */
  playable: ReadonlySet<number>;
  /** Keyboard selection (ring index), shown with a ring. */
  selected: number | null;
  onSelect: (pit: number) => void;
  onPlay: (pit: number) => void;
  /** Whose side is highlighted. */
  activePlayer: Player | null;
  names: [string, string];
  hand: HandView | null;
  /** Pits to highlight briefly; `flashKey` restarts the highlight. */
  flash: readonly number[];
  flashKey: number;
  /** Pits of the latest capture (held highlight). */
  captureFlash: readonly number[];
  reducedMotion: boolean;
}

const SEED_FILLS = ['#F6E7C8', '#EBD3A6', '#DCC08F'];
const KEYFRAMES =
  '@keyframes congklak-flash{0%{opacity:1}100%{opacity:0}}' +
  '@keyframes congklak-pulse{0%,100%{opacity:.55}50%{opacity:1}}';

function Seeds({ g, count }: { g: PitGeometry; count: number }) {
  const offsets = useMemo(() => seedOffsets(count, g.kind), [count, g.kind]);
  return (
    <g aria-hidden>
      {offsets.map((o, k) => (
        <circle
          key={k}
          cx={g.x + o.dx}
          cy={g.y + o.dy}
          r={SEED_RADIUS}
          fill={SEED_FILLS[k % 3]}
          stroke="#7A5634"
          strokeWidth={0.9}
        />
      ))}
    </g>
  );
}

function CountLabel({ g, count, strong }: { g: PitGeometry; count: number; strong?: boolean }) {
  const w = count >= 10 ? 34 : 26;
  return (
    <g aria-hidden>
      <rect
        x={g.labelX - w / 2}
        y={g.labelY - 13}
        width={w}
        height={26}
        rx={13}
        fill={strong ? '#FFF4DF' : 'rgba(255,244,223,0.88)'}
        stroke={strong ? '#D4A017' : 'none'}
        strokeWidth={2}
      />
      <text x={g.labelX} y={g.labelY + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#3B2412">
        {count}
      </text>
    </g>
  );
}

interface PitProps {
  g: PitGeometry;
  count: number;
  ownerName: string;
  orientation: BoardGeometry['orientation'];
  playable: boolean;
  /** Focusable (roving tabindex). */
  tabStop: boolean;
  selected: boolean;
  dimmed: boolean;
  /** 0 = no highlight; otherwise a key that restarts the highlight animation. */
  flashKey: number;
  captured: boolean;
  reducedMotion: boolean;
  onPlay: (pit: number) => void;
  onSelect: (pit: number) => void;
  registerRef: (pit: number, el: SVGGElement | null) => void;
}

const Pit = memo(function Pit({
  g,
  count,
  ownerName,
  orientation,
  playable,
  tabStop,
  selected,
  dimmed,
  flashKey,
  captured,
  reducedMotion,
  onPlay,
  onSelect,
  registerRef,
}: PitProps) {
  const pulse = reducedMotion ? undefined : { animation: 'congklak-pulse 0.9s ease-in-out infinite' };
  const flashStyle = { animation: 'congklak-flash 0.7s ease-out forwards' };
  if (g.kind === 'store') {
    // Phase 18: the total sits on a solid pill at one end of the store, never on the seeds (store-label.ts).
    const place = storeLabelPlacement(g, orientation, count);
    const pill = place.count;
    return (
      <g role="img" aria-label={`Lumbung ${ownerName}: ${count} biji`} data-pit={g.pit}>
        <ellipse cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill="url(#ck-hole)" stroke="#5B321A" strokeWidth={3} />
        <Seeds g={g} count={count} />
        {captured && <ellipse cx={g.x} cy={g.y} rx={g.rx + 6} ry={g.ry + 6} fill="none" stroke="#FFD86B" strokeWidth={5} style={pulse} aria-hidden />}
        {flashKey > 0 && (
          <ellipse key={`f${flashKey}`} cx={g.x} cy={g.y} rx={g.rx + 4} ry={g.ry + 4} fill="none" stroke="#FFF1C2" strokeWidth={4} style={flashStyle} aria-hidden />
        )}
        <g aria-hidden data-store-label={g.owner}>
          <rect
            x={pill.x - pill.width / 2}
            y={pill.y - pill.height / 2}
            width={pill.width}
            height={pill.height}
            rx={pill.height / 2}
            fill="#FFF4DF"
            stroke="#3B2412"
            strokeWidth={3}
          />
          <text
            x={pill.x}
            y={pill.y + STORE_LABEL_FONT_SIZE * 0.35}
            textAnchor="middle"
            fontSize={STORE_LABEL_FONT_SIZE}
            fontWeight={800}
            fill="#3B2412"
          >
            {count}
          </text>
        </g>
        <text
          x={place.name.x}
          y={place.name.y}
          textAnchor="middle"
          fontSize={15}
          fontWeight={700}
          fill="#FFF1D6"
          stroke="#3B2412"
          strokeWidth={4}
          paintOrder="stroke"
          aria-hidden
        >
          {ownerName}
        </text>
      </g>
    );
  }
  return (
    <g
      ref={(el) => registerRef(g.pit, el)}
      role="button"
      data-pit={g.pit}
      tabIndex={playable ? (tabStop ? 0 : -1) : undefined}
      aria-disabled={!playable}
      aria-label={`Lubang ${g.hole + 1} milik ${ownerName}: ${count} biji${playable ? '' : ', tidak bisa dipilih'}`}
      onClick={() => playable && onPlay(g.pit)}
      onFocus={() => playable && onSelect(g.pit)}
      className={playable ? 'cursor-pointer outline-none' : 'outline-none'}
      style={{ opacity: dimmed ? 0.55 : 1 }}
    >
      <circle cx={g.x} cy={g.y} r={g.rx} fill="url(#ck-hole)" stroke="#5B321A" strokeWidth={3} />
      {playable && <circle cx={g.x} cy={g.y} r={g.rx + 5} fill="none" stroke="#FFE7A3" strokeWidth={2.5} strokeDasharray="6 5" aria-hidden />}
      {selected && <circle cx={g.x} cy={g.y} r={g.rx + 8} fill="none" stroke="#FFFFFF" strokeWidth={4} aria-hidden />}
      <Seeds g={g} count={count} />
      {captured && <circle cx={g.x} cy={g.y} r={g.rx + 5} fill="none" stroke="#FFD86B" strokeWidth={5} style={pulse} aria-hidden />}
      {flashKey > 0 && (
        <circle key={`f${flashKey}`} cx={g.x} cy={g.y} r={g.rx + 3} fill="#FFF1C2" fillOpacity={0.35} stroke="#FFF1C2" strokeWidth={4} style={flashStyle} aria-hidden />
      )}
      <CountLabel g={g} count={count} strong={selected} />
      {/* A larger invisible tap area. */}
      <circle cx={g.x} cy={g.y} r={g.rx + 6} fill="transparent" aria-hidden />
    </g>
  );
});

function CongklakBoardInner({
  geometry,
  pits,
  playable,
  selected,
  onSelect,
  onPlay,
  activePlayer,
  names,
  hand,
  flash,
  flashKey,
  captureFlash,
  reducedMotion,
}: CongklakBoardProps) {
  const { width, height, orientation } = geometry;
  const holeRefs = useRef(new Map<number, SVGGElement>());
  const registerRef = useCallback((pit: number, el: SVGGElement | null) => {
    if (el) holeRefs.current.set(pit, el);
    else holeRefs.current.delete(pit);
  }, []);

  // Arrow keys move between the playable holes along the board's long axis; Enter or Space plays.
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const list = [...playable].map((p) => geometry.pits[p]);
    if (list.length === 0) return;
    const axis = orientation === 'horizontal' ? 'x' : 'y';
    list.sort((a, b) => a[axis] - b[axis]);
    const current = list.findIndex((g) => g.pit === selected);
    let target: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = list[(current + 1 + list.length) % list.length].pit;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      target = list[(current <= 0 ? list.length : current) - 1].pit;
    else if ((e.key === 'Enter' || e.key === ' ') && selected !== null && playable.has(selected)) {
      e.preventDefault();
      onPlay(selected);
      return;
    }
    if (target !== null) {
      e.preventDefault();
      onSelect(target);
      holeRefs.current.get(target)?.focus();
    }
  };

  const activeBand = useMemo(() => {
    if (activePlayer === null) return null;
    const holes = geometry.pits.filter((g) => g.kind === 'hole' && g.owner === activePlayer);
    const xs = holes.map((g) => g.x);
    const ys = holes.map((g) => g.y);
    const r = holes[0].rx + 10;
    return {
      x: Math.min(...xs) - r,
      y: Math.min(...ys) - r,
      w: Math.max(...xs) - Math.min(...xs) + 2 * r,
      h: Math.max(...ys) - Math.min(...ys) + 2 * r,
    };
  }, [activePlayer, geometry]);

  const handG = hand ? geometry.pits[hand.pit] : null;
  // The hand floats towards the board's centre line, so it never hides the count label.
  const handPos = handG
    ? orientation === 'horizontal'
      ? { x: handG.x, y: handG.kind === 'store' ? handG.y - 70 : handG.owner === 0 ? handG.y - 52 : handG.y + 52 }
      : { x: handG.kind === 'store' ? handG.x + 70 : handG.owner === 0 ? handG.x - 58 : handG.x + 58, y: handG.y }
    : null;

  const flashSet = new Set(flash);
  const captureSet = new Set(captureFlash);
  // Roving tabindex: the selected playable hole, otherwise the first playable hole of the side.
  let tabStop = selected !== null && playable.has(selected) ? selected : null;
  if (tabStop === null) {
    let bestHole = Number.POSITIVE_INFINITY;
    for (const p of playable) {
      if (geometry.pits[p].hole < bestHole) {
        bestHole = geometry.pits[p].hole;
        tabStop = p;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full select-none"
      role="group"
      aria-label="Papan congklak"
      onKeyDown={onKeyDown}
      style={{ touchAction: 'manipulation' }}
    >
      <style>{KEYFRAMES}</style>
      <defs>
        <linearGradient id="ck-wood" x1="0" y1="0" x2={orientation === 'horizontal' ? '0' : '1'} y2={orientation === 'horizontal' ? '1' : '0'}>
          <stop offset="0" stopColor="#C2814A" />
          <stop offset="0.5" stopColor="#A9693A" />
          <stop offset="1" stopColor="#8B522A" />
        </linearGradient>
        <radialGradient id="ck-hole" cx="0.45" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#4A2812" />
          <stop offset="0.8" stopColor="#6B3B1C" />
          <stop offset="1" stopColor="#8A5129" />
        </radialGradient>
      </defs>

      {/* Board body with a soft rim and a little grain. */}
      <rect x={8} y={8} width={width - 16} height={height - 16} rx={Math.min(width, height) / 2 - 12} fill="#6E3F1F" />
      <rect x={14} y={14} width={width - 28} height={height - 28} rx={Math.min(width, height) / 2 - 18} fill="url(#ck-wood)" />
      <g stroke="#7A4521" strokeOpacity={0.18} strokeWidth={2} fill="none" aria-hidden>
        {[0.22, 0.38, 0.61, 0.79].map((t) =>
          orientation === 'horizontal' ? (
            <path key={t} d={`M ${width * 0.08} ${height * t} C ${width * 0.35} ${height * t - 10}, ${width * 0.65} ${height * t + 12}, ${width * 0.92} ${height * t}`} />
          ) : (
            <path key={t} d={`M ${width * t} ${height * 0.08} C ${width * t - 10} ${height * 0.35}, ${width * t + 12} ${height * 0.65}, ${width * t} ${height * 0.92}`} />
          ),
        )}
      </g>

      {activeBand && (
        <rect
          x={activeBand.x}
          y={activeBand.y}
          width={activeBand.w}
          height={activeBand.h}
          rx={Math.min(activeBand.w, activeBand.h) / 2}
          fill="#FFE8A8"
          fillOpacity={0.16}
          stroke="#FFD86B"
          strokeWidth={3}
          strokeOpacity={0.85}
          aria-hidden
        />
      )}

      {geometry.pits.map((g) => {
        const isPlayable = playable.has(g.pit);
        return (
          <Pit
            key={g.pit}
            g={g}
            count={pits[g.pit]}
            ownerName={names[g.owner]}
            orientation={orientation}
            playable={isPlayable}
            tabStop={tabStop === g.pit}
            selected={selected === g.pit && isPlayable}
            dimmed={g.kind === 'hole' && playable.size > 0 && !isPlayable && g.owner === activePlayer}
            flashKey={flashSet.has(g.pit) ? flashKey : 0}
            captured={captureSet.has(g.pit)}
            reducedMotion={reducedMotion}
            onPlay={onPlay}
            onSelect={onSelect}
            registerRef={registerRef}
          />
        );
      })}

      {hand && handPos && !reducedMotion && (
        <g
          aria-hidden
          style={{ transform: `translate(${handPos.x}px, ${handPos.y}px)`, transition: 'transform 120ms ease-out' }}
          data-testid="congklak-hand"
        >
          <circle r={22} fill="#FFF7E8" stroke="#3B2412" strokeWidth={3} />
          <text y={7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#3B2412">
            {hand.count}
          </text>
        </g>
      )}
    </svg>
  );
}

export const CongklakBoard = memo(CongklakBoardInner);
