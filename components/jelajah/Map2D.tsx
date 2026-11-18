'use client';

/**
 * 2D hub map (tier 2d): the same shapes, colours and interactions as the 3D view, as an SVG.
 * Never imports three.js. Drag to pan, wheel or pinch to zoom (within limits). Clickable provinces
 * are keyboard-focusable buttons.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { initialFrame, shapesBounds, svgPath } from '@/lib/jelajah/geo';
import { isClickable, maxProtCount, shapeFill, type MapViewProps } from '@/lib/jelajah/map-model';
import { PILOT_PROVINCE } from '@/lib/jelajah/provinces';

const MAX_ZOOM = 8;
const PAD = 1;

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function Map2D({
  shapes,
  summaryByKode,
  hoveredKode,
  selectedKode,
  palette,
  onHover,
  onSelect,
}: MapViewProps) {
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
  const [view, setView] = useState<View | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // First view: on portrait screens zoom to the western part (same rule as the 3D view).
  useEffect(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || view) return;
    const frame = initialFrame(bounds, rect.width / rect.height);
    if (frame === bounds) return;
    const w = frame.maxX - frame.minX + 2 * PAD;
    // Reading the element size is only possible after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({ x: frame.minX - PAD, y: -(bounds.minY + bounds.maxY) / 2 - ((w / full.w) * full.h) / 2, w, h: (w / full.w) * full.h });
  }, [bounds, full, view]);
  const v = view ?? full;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; multi: boolean }>({ moved: 0, multi: false });

  const paths = useMemo(() => shapes.map((s) => svgPath(s)), [shapes]);
  const maxCount = maxProtCount(summaryByKode);
  const pilot = shapes.find((s) => s.kode === PILOT_PROVINCE.kode);
  const strokeWidth = 0.06 * (v.w / full.w);

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

  const onKey = (kode: string) => (e: KeyboardEvent<SVGPathElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(kode);
    }
  };

  return (
    <div className="absolute inset-0" style={{ background: palette.seaDeep }}>
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
        <rect x={full.x - 50} y={full.y - 50} width={full.w + 100} height={full.h + 100} fill={palette.sea} />
        {shapes.map((shape, i) => {
          const clickable = isClickable(shape.kode, summaryByKode);
          const summary = shape.kode ? summaryByKode.get(shape.kode) : undefined;
          const fill = shapeFill(shape, summaryByKode, maxCount, palette, hoveredKode, selectedKode);
          if (!clickable) {
            return (
              <path key={shape.name} d={paths[i]} fill={fill} stroke={palette.outline} strokeWidth={strokeWidth} aria-hidden />
            );
          }
          const kode = shape.kode as string;
          return (
            <path
              key={shape.name}
              d={paths[i]}
              fill={fill}
              stroke={palette.outline}
              strokeWidth={strokeWidth}
              role="button"
              tabIndex={0}
              aria-label={`${summary?.nama ?? shape.name}: ${summary?.protCount ?? 0} PROT`}
              aria-pressed={selectedKode === kode}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--color-ring)]"
              onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(kode)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
              onClick={() => isTap() && onSelect(kode)}
              onKeyDown={onKey(kode)}
              onFocus={() => onHover(kode)}
              onBlur={() => onHover(null)}
            />
          );
        })}
        {pilot && (
          <g
            transform={`translate(${pilot.anchor[0]} ${-pilot.anchor[1]}) scale(${v.w / full.w})`}
            className="pointer-events-none"
            aria-hidden
          >
            <rect x={-2.1} y={-2.6} width={4.2} height={1.6} rx={0.8} fill="var(--color-primary)" />
            <text
              x={0}
              y={-1.45}
              textAnchor="middle"
              fontSize={1}
              fontWeight={700}
              fill="var(--color-primary-foreground)"
            >
              ★ Pilot
            </text>
            <circle r={0.35} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={0.12} />
          </g>
        )}
      </svg>
    </div>
  );
}
