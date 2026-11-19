'use client';

import { useMotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { createConceptClock, type ConceptClock } from '@/lib/jelajah/concept/clock';
import type { ConceptEndReason } from '@/lib/jelajah/concept/types';

/**
 * React wrapper of the concept clock (Phase 19): the film time is a framer-motion MotionValue (scenes
 * subscribe to it; React does not re-render per frame), the tab's visibility pauses it, and the controls
 * are stable. `onEnd` may change between renders.
 */
export function useConceptClock(endMs: number, holdAtMs: number, onEnd: (reason: ConceptEndReason) => void) {
  const time = useMotionValue(0);
  const clockRef = useRef<ConceptClock | null>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    const clock = createConceptClock({
      endMs,
      holdAtMs,
      onTime: (t) => time.set(t),
      onEnd: (reason) => onEndRef.current(reason),
    });
    clockRef.current = clock;
    const onVisibility = () => clock.setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    clock.setHidden(document.visibilityState === 'hidden');
    clock.start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clock.dispose();
      clockRef.current = null;
    };
  }, [endMs, holdAtMs, time]);

  const controls = useMemo(
    () => ({
      seek: (ms: number) => clockRef.current?.seek(ms),
      pause: () => clockRef.current?.pause(),
      resume: () => clockRef.current?.resume(),
      hold: () => clockRef.current?.hold(),
      skip: () => clockRef.current?.skip(),
      finish: () => clockRef.current?.finish(),
      now: () => clockRef.current?.time ?? 0,
      /** Frames are being scheduled (not paused, hidden, held or ended). */
      running: () => clockRef.current?.running ?? false,
    }),
    [],
  );
  return { time, controls };
}
