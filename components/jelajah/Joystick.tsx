'use client';

import { useRef, useState, type MutableRefObject, type PointerEvent } from 'react';
import { clampKnob, joystickVector, ZERO_INPUT, type InputVector } from '@/lib/jelajah/engine/input';

const RADIUS = 52; // px, knob travel

/**
 * On-screen joystick for touch devices (Phase 11). Writes the input vector into `outputRef` (read every
 * frame by the 3D scene) instead of React state, so moving the thumb never re-renders the page.
 */
export function Joystick({ outputRef, disabled }: { outputRef: MutableRefObject<InputVector>; disabled?: boolean }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState<[number, number]>([0, 0]);

  const update = (e: PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    outputRef.current = joystickVector(dx, dy, RADIUS);
    setKnob(clampKnob(dx, dy, RADIUS) as [number, number]);
  };

  const release = () => {
    pointer.current = null;
    outputRef.current = ZERO_INPUT;
    setKnob([0, 0]);
  };

  return (
    <div
      ref={baseRef}
      role="presentation"
      aria-hidden
      className={`absolute bottom-6 left-6 z-20 h-32 w-32 touch-none select-none rounded-full border-2 border-white/60 bg-black/20 backdrop-blur-sm ${disabled ? 'pointer-events-none opacity-40' : ''}`}
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointer.current) update(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-white/80 bg-white/70 shadow-md"
        style={{ transform: `translate(calc(-50% + ${knob[0]}px), calc(-50% + ${knob[1]}px))` }}
      />
    </div>
  );
}
