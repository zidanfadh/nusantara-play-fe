'use client';

/**
 * 2D hub map (tier 2d): the same shapes, states and interactions as the 3D view, as an SVG. Never imports three.js.
 * Drag to pan, wheel or pinch to zoom (within limits). Clickable provinces are keyboard-focusable buttons.
 *
 * Phase 28, the paper look in SVG: cream (or brown) paper with grain as a static CSS layer (never re-rasterised while
 * panning), every island as a slab = a soft shadow, a darker brown edge offset downwards and the green top; low-poly
 * mountains and volcanoes (the lite set); the same state cues as the 3D map (`provinceCues`): provinces that open a
 * card stand taller, hover / selected lift the top (more edge shows) with an amber rim, enterable provinces carry a
 * terracotta ★ flag. The whole archipelago is framed on load.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { shapesBounds, svgPath } from '@/lib/jelajah/geo';
import { maxProtCount, provinceCues, shapeFill, type MapViewProps } from '@/lib/jelajah/map-model';
import { NATURE_LITE, placeNature, type PlacedMountain } from '@/lib/jelajah/map-nature';
import { mixHex, rgba, type MapPalette } from '@/lib/jelajah/palette';
import { lowPolyShapes } from '@/lib/jelajah/paper-map';
import { ENTERABLE_PROVINCES, markerLabel } from '@/lib/jelajah/provinces';

const MAX_ZOOM = 8;
const PAD = 1;
/** Slab edge (drop) in map units: like the 3D slab heights seen at the 3D map's tilt. */
const EDGE_RAISED = 0.28;
const EDGE_MUTED = 0.17;
/** The 2D lift is a little larger than the 3D one (no perspective to help). */
const LIFT_SCALE = 1.2;

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Paper grain tile (inline SVG noise), drawn once by the browser as a CSS background. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")";

/** A low-poly mountain as SVG: a lit and a shaded half (two-tone faces), a crater on volcanoes. */
function Mountain({ m, palette }: { m: PlacedMountain; palette: MapPalette }) {
  const x = m.x;
  const y = -m.y;
  const r = m.radius;
  const h = m.height * 0.75;
  const top = m.volcano ? r * 0.3 : 0;
  return (
    <g>
      <path d={`M${x - r} ${y}L${x - top} ${y - h}L${x + (m.volcano ? 0 : r * 0.12)} ${y - h}L${x + r * 0.1} ${y + r * 0.2}Z`} fill={palette.rockLight} />
      <path d={`M${x + r * 0.1} ${y + r * 0.2}L${x + (m.volcano ? 0 : r * 0.12)} ${y - h}L${x + top} ${y - h}L${x + r} ${y}Z`} fill={palette.rockDark} />
      {m.volcano && <path d={`M${x - top} ${y - h}L${x + top} ${y - h}L${x} ${y - h + r * 0.12}Z`} fill={palette.crater} />}
    </g>
  );
}

export default function Map2D({
  shapes: sourceShapes,
  summaryByKode,
  hoveredKode,
  selectedKode,
  palette,
  onHover,
  onSelect,
}: MapViewProps) {
  // The same low-poly outline as the 3D map (Phase 28); also lighter for weak devices.
  const shapes = useMemo(() => lowPolyShapes(sourceShapes), [sourceShapes]);
  const nature = useMemo(() => placeNature(shapes, NATURE_LITE), [shapes]);
  const bounds = useMemo(() => shapesBounds(shapes), [shapes]);
  const full: View = useMemo(
    () => ({
      x: bounds.minX - PAD,
      y: -bounds.maxY - PAD,
      w: bounds.maxX - bounds.minX + 2 * PAD,
      h: bounds.maxY - bounds.minY + 2 * PAD,
    }),
    [bounds],
  );
  // First view: the whole archipelago on every screen (Phase 28; before: the western part on portrait phones).
  const [view, setView] = useState<View | null>(null);
  /** Keyboard focus (the lifted copy drawn on top must show the focus ring too). */
  const [focusedKode, setFocusedKode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const v = view ?? full;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; multi: boolean }>({ moved: 0, multi: false });

  const paths = useMemo(() => shapes.map((s) => svgPath(s)), [shapes]);
  const maxCount = maxProtCount(summaryByKode);
  // Phase 22: a marker for every enterable province (before: the pilot only).
  const markers = ENTERABLE_PROVINCES.flatMap((p) => {
    const shape = shapes.find((s) => s.kode === p.kode);
    return shape ? [{ kode: p.kode, shape }] : [];
  });
  const zoom = v.w / full.w;
  const strokeWidth = 0.05 * zoom;

  /** Keeps the view inside the map and the zoom within [1, MAX_ZOOM]. */
  const clampView = (next: View): View => {
    const w = Math.min(full.w, Math.max(full.w / MAX_ZOOM, next.w));
    const h = (w / full.w) * full.h;
    const x = Math.min(full.x + full.w - w, Math.max(full.x, next.x));
    const y = Math.min(full.y + full.h - h, Math.max(full.y, next.y));
    return { x, y, w, h };
  };

  /** Scale between screen pixels and SVG units (preserveAspectRatio = meet). */
  const unitsPerPixel = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(v.w / rect.width, v.h / rect.height);
  };

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const upp = unitsPerPixel();
    const ox = v.x + (v.w - rect.width * upp) / 2;
    const oy = v.y + (v.h - rect.height * upp) / 2;
    const px = ox + (clientX - rect.left) * upp;
    const py = oy + (clientY - rect.top) * upp;
    const w = v.w / factor;
    const h = v.h / factor;
    setView(clampView({ x: px - (px - v.x) / factor, y: py - (py - v.y) / factor, w, h }));
  };

  // Native non-passive listener: React's onWheel is passive, so the page would scroll while zooming.
  const zoomRef = useRef(zoomAt);
  useEffect(() => {
    zoomRef.current = zoomAt;
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      zoomRef.current(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { moved: 0, multi: false };
    else gesture.current.multi = true;
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = [...pointers.current.values()];
    if (pointers.current.size === 2) {
      const other = pts.find((p) => p !== prev)!;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0) zoomAt(after / before, (e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
    } else {
      const upp = unitsPerPixel();
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      gesture.current.moved += Math.hypot(dx, dy);
      if (gesture.current.moved > 6) {
        if (!svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current?.setPointerCapture(e.pointerId);
        setView(clampView({ ...v, x: v.x - dx * upp, y: v.y - dy * upp }));
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerEnd = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
  };

  /** A tap selects; a drag or pinch does not. */
  const isTap = () => !gesture.current.multi && gesture.current.moved <= 6;

  const onKey = (kode: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(kode);
    }
  };

  // Per province: its cues (height, lift, rim) and fill.
  const items = shapes.map((shape, i) => {
    const cues = provinceCues(shape.kode, summaryByKode, hoveredKode, selectedKode);
    const fill = shapeFill(shape, summaryByKode, maxCount, palette, hoveredKode, selectedKode);
    return { shape, i, cues, fill, edge: cues.raised ? EDGE_RAISED : EDGE_MUTED, lift: cues.lift * LIFT_SCALE };
  });
  const edgeColour = mixHex(palette.earthBottom, palette.earthTop, 0.35);

  /** One slab top (with its mountains); a lifted one also shows more of its edge. */
  const slab = ({ shape, i, cues, fill, edge, lift }: (typeof items)[number], copy = false) => (
    <>
      {lift > 0 && <path d={paths[i]} fill={edgeColour} transform={`translate(0 ${edge})`} />}
      {lift > 0 && <path d={paths[i]} fill={palette.earthTop} transform={`translate(0 ${edge * 0.4 - lift})`} />}
      <g transform={lift ? `translate(0 ${-lift})` : undefined}>
        <path
          d={paths[i]}
          fill={fill}
          stroke={copy && shape.kode === focusedKode ? 'var(--color-focus-ring)' : cues.rim ? palette.rim : palette.outline}
          strokeOpacity={cues.rim ? 1 : 0.55}
          strokeWidth={cues.rim ? strokeWidth * 2.6 : strokeWidth}
          strokeLinejoin="round"
          className={cues.raised ? 'group-focus-visible:stroke-[var(--color-focus-ring)]' : undefined}
        />
        {nature[i].mountains.map((m, n) => (
          <Mountain key={n} m={m} palette={palette} />
        ))}
      </g>
    </>
  );

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: palette.paperEdge,
        backgroundImage: `${GRAIN}, radial-gradient(ellipse at 50% 50%, ${palette.paper} 35%, ${palette.paperEdge} 100%)`,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
        className="h-full w-full touch-none select-none"
        role="group"
        aria-label="Peta 2D provinsi Indonesia"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={(e) => {
          if (e.target === svgRef.current && isTap()) onSelect(null);
        }}
      >
        {/* Soft drop shadow (light from the upper left, as in 3D), then every slab's earth edge. */}
        <g fill={rgba(palette.shadow, 0.22)} aria-hidden className="pointer-events-none">
          {items.map(({ shape, i, edge }) => (
            <path key={shape.name} d={paths[i]} transform={`translate(${edge * 0.9} ${edge * 1.6})`} />
          ))}
        </g>
        {/* All earth edges first, so no edge covers a neighbour's top. */}
        <g fill={edgeColour} aria-hidden className="pointer-events-none">
          {items.map(({ shape, i, edge }) => (
            <path key={shape.name} d={paths[i]} transform={`translate(0 ${edge})`} />
          ))}
        </g>
        {/* The provinces in a STABLE order (reordering DOM nodes on hover would retarget a click to the <svg>). */}
        {items.map((item) => {
          const { shape, cues } = item;
          const kode = shape.kode;
          const summary = kode ? summaryByKode.get(kode) : undefined;
          if (!cues.raised || !kode) {
            return (
              <g key={shape.name} aria-hidden className="pointer-events-none">
                {slab(item)}
              </g>
            );
          }
          return (
            <g
              key={shape.name}
              role="button"
              tabIndex={0}
              aria-label={`${summary?.nama ?? shape.name}: ${summary?.protCount ?? 0} PROT`}
              aria-pressed={selectedKode === kode}
              className="group cursor-pointer outline-none"
              onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(kode)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
              onClick={() => isTap() && onSelect(kode)}
              onKeyDown={onKey(kode)}
              onFocus={(e) => {
                if (e.currentTarget.matches(':focus-visible')) setFocusedKode(kode);
                onHover(kode);
              }}
              onBlur={() => {
                setFocusedKode(null);
                onHover(null);
              }}
            >
              {slab(item)}
            </g>
          );
        })}
        {/* Lifted provinces drawn again on top of their neighbours (decorative copy; the button above stays). */}
        {items
          .filter((item) => item.lift > 0)
          .map((item) => (
            <g key={`lifted-${item.shape.name}`} aria-hidden className="pointer-events-none">
              {slab(item, true)}
            </g>
          ))}
        {markers.map(({ kode, shape }) => {
          const lift = items.find((it) => it.shape === shape)?.lift ?? 0;
          // A terracotta flag on a pole (as on the 3D map): #B4500F with cream text, cream border.
          return (
            <g
              key={kode}
              transform={`translate(${shape.anchor[0]} ${-shape.anchor[1] - lift}) scale(${zoom * 0.8})`}
              className="pointer-events-none"
              aria-hidden
              data-marker2d={kode}
            >
              <rect x={-0.04} y={-1.75} width={0.08} height={1.75} fill={palette.earthTop} />
              <circle r={0.14} fill={palette.earthTop} />
              <rect x={0} y={-2.65} width={3.7} height={1.05} rx={0.22} fill="#B4500F" stroke="#FEF3E2" strokeWidth={0.1} />
              <text x={1.85} y={-1.84} textAnchor="middle" fontSize={0.66} fontWeight={700} fill="#FEF3E2">
                {markerLabel(kode)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
