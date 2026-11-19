'use client';

/**
 * Shared pieces of the concept video scenes (Phase 19): the scene props, motion helpers that write SVG
 * attributes straight from a MotionValue (no React render per frame), the batik/kawung texture defs and
 * the full-bleed stage.
 *
 * Every scene is a pure function of its local time `lt` (ms from the scene's start; negative during its
 * fade-in): the player's one clock drives it, so pause, skip, seeking and the reduced-motion stills are
 * deterministic. Only transform and opacity are animated.
 */
import { useTransform, type MotionValue } from 'framer-motion';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { STAGE, type ConceptLayout } from '@/lib/jelajah/concept/layout';

export interface SceneProps {
  /** Scene-local time, ms. */
  lt: MotionValue<number>;
  layout: ConceptLayout;
  /** Reduced-motion still: loops are frozen (lt is constant anyway). */
  still: boolean;
  /** The particle canvas draws the dust; otherwise the scene draws its light SVG fallback. */
  canvas: boolean;
}

/** A MotionValue derived from `mv` (thin alias that reads better in the scenes). */
export function useDerived<T>(mv: MotionValue<number>, fn: (v: number) => T): MotionValue<T> {
  return useTransform(mv, fn);
}

/**
 * Writes `fmt(mv)` into an attribute of the referenced element on every change (and once on mount).
 * Used for SVG `transform` / `opacity`, so moving parts never re-render React.
 */
export function useAttr<E extends Element = SVGGElement>(
  mv: MotionValue<number>,
  fmt: (v: number) => string,
  attr: string = 'transform',
) {
  const ref = useRef<E>(null);
  const fmtRef = useRef(fmt);
  useLayoutEffect(() => {
    fmtRef.current = fmt;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => el.setAttribute(attr, fmtRef.current(v));
    write(mv.get());
    return mv.on('change', write);
  }, [mv, attr]);
  return ref;
}

/** Like useAttr, for several attributes of one element (for example `transform` and `opacity`). */
export function useAttrs<E extends Element = SVGGElement>(mv: MotionValue<number>, fmt: (v: number) => Record<string, string>) {
  const ref = useRef<E>(null);
  const fmtRef = useRef(fmt);
  useLayoutEffect(() => {
    fmtRef.current = fmt;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => {
      const attrs = fmtRef.current(v);
      for (const name in attrs) el.setAttribute(name, attrs[name]);
    };
    write(mv.get());
    return mv.on('change', write);
  }, [mv]);
  return ref;
}

/** Same as useAttr for an HTML element's CSS transform/opacity. */
export function useStyle<E extends HTMLElement = HTMLDivElement>(
  mv: MotionValue<number>,
  fmt: (v: number) => { transform?: string; opacity?: number; transformOrigin?: string },
) {
  const ref = useRef<E>(null);
  const fmtRef = useRef(fmt);
  useLayoutEffect(() => {
    fmtRef.current = fmt;
  });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => {
      const s = fmtRef.current(v);
      if (s.transformOrigin !== undefined) el.style.transformOrigin = s.transformOrigin;
      if (s.transform !== undefined) el.style.transform = s.transform;
      if (s.opacity !== undefined) el.style.opacity = String(s.opacity);
    };
    write(mv.get());
    return mv.on('change', write);
  }, [mv]);
  return ref;
}

/**
 * Full-screen SVG art board of the layout; `meet` keeps the composition, backgrounds bleed past it.
 * Performance (Phase 19 measurement): a static board and a `live` board (its own compositor layer) are kept
 * apart, so a moving element repaints only its own transparent layer, never the full-screen backgrounds.
 */
export function Stage({ layout, children, live = false }: { layout: ConceptLayout; children: ReactNode; live?: boolean }) {
  const { w, h } = STAGE[layout];
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      aria-hidden
      style={live ? LIVE : undefined}
    >
      {children}
    </svg>
  );
}

/** Own compositor layer for an element that moves every frame (transform / opacity only). */
export const LIVE = { willChange: 'transform' } as const;
export const LIVE_OPACITY = { willChange: 'opacity' } as const;

/** Art board point → viewport pixels (the `meet` mapping of Stage), for CSS camera moves. */
export function stageToScreen(layout: ConceptLayout, x: number, y: number): [number, number] {
  if (typeof window === 'undefined') return [x, y];
  const { w, h } = STAGE[layout];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const k = Math.min(W / w, H / h);
  return [(W - w * k) / 2 + x * k, (H - h * k) / 2 + y * k];
}

/** CSS transform that scales by `s` about art-board point `about` and moves it to art-board point `to`. */
export function cameraCss(layout: ConceptLayout, about: [number, number], to: [number, number], s: number) {
  const [ax, ay] = stageToScreen(layout, about[0], about[1]);
  const [tx, ty] = stageToScreen(layout, to[0], to[1]);
  return {
    transformOrigin: '0 0',
    transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)}) translate(${(-ax).toFixed(2)}px, ${(-ay).toFixed(2)}px)`,
  };
}

/** A rectangle far larger than any art board (backgrounds that bleed to every screen edge). */
export const BLEED = { x: -4000, y: -4000, width: 10000, height: 10000 } as const;

/**
 * Texture and gradient definitions, rendered once by the player (ids are global in the document).
 * Kawung: four oval petals around a point, the classic Javanese batik lattice, as thin lines.
 */
export function ConceptDefs() {
  const kawung = (id: string, stroke: string, opacity: number) => (
    <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse">
      <g fill="none" stroke={stroke} strokeOpacity={opacity} strokeWidth="1">
        {[
          [9, 9, 45],
          [27, 9, -45],
          [9, 27, -45],
          [27, 27, 45],
        ].map(([x, y, r]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="8.5" ry="4.6" transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <circle cx="18" cy="18" r="1.6" />
        <circle cx="0" cy="0" r="1.6" />
        <circle cx="36" cy="0" r="1.6" />
        <circle cx="0" cy="36" r="1.6" />
        <circle cx="36" cy="36" r="1.6" />
      </g>
    </pattern>
  );
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        {kawung('cv-kawung-cream', '#FBEFD5', 0.5)}
        {kawung('cv-kawung-brown', '#7A3E1D', 0.32)}
        {kawung('cv-kawung-gold', '#F2C14E', 0.55)}
        {/* Parang: diagonal bands (card motif). */}
        <pattern id="cv-parang" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#9E3C24" />
          <path d="M0 4 Q4 0 8 4 T16 4" fill="none" stroke="#F2C14E" strokeWidth="2" />
          <path d="M0 12 Q4 8 8 12 T16 12" fill="none" stroke="#FBEFD5" strokeWidth="1" strokeOpacity="0.7" />
        </pattern>
        {/* Truntum: small flowers of dots (card motif). */}
        <pattern id="cv-truntum" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#1A5F7A" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={10 + 3.6 * Math.cos((a * Math.PI) / 180)}
              cy={10 + 3.6 * Math.sin((a * Math.PI) / 180)}
              r="1.4"
              fill="#FBEFD5"
            />
          ))}
          <circle cx="10" cy="10" r="1.2" fill="#F2C14E" />
        </pattern>
        <pattern id="cv-kawung-tile" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#C99A2E" />
          <rect width="18" height="18" fill="url(#cv-kawung-brown)" />
        </pattern>
        {/* Provinces lighting up: amber batik glow. */}
        <linearGradient id="cv-glow-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7C95C" />
          <stop offset="1" stopColor="#D65C2E" />
        </linearGradient>
        <radialGradient id="cv-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE6A8" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#F7B955" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F28C38" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cv-sun-sepia" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#EADBB8" stopOpacity="0.8" />
          <stop offset="0.4" stopColor="#C9B086" stopOpacity="0.4" />
          <stop offset="1" stopColor="#9C8460" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cv-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#120F2A" stopOpacity="0.85" />
          <stop offset="1" stopColor="#120F2A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cv-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4D6" stopOpacity="1" />
          <stop offset="0.4" stopColor="#F7C95C" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F7C95C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cv-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C7803F" />
          <stop offset="0.55" stopColor="#8A4B22" />
          <stop offset="1" stopColor="#5C2F14" />
        </linearGradient>
        <linearGradient id="cv-wood-sepia" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A08A68" />
          <stop offset="0.55" stopColor="#6E5A42" />
          <stop offset="1" stopColor="#4A3C2C" />
        </linearGradient>
      </defs>
    </svg>
  );
}
