'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBumperTimeline, type BumperEndReason, type BumperTimeline } from './timeline';

/**
 * React wrapper of `createBumperTimeline` (Phase 16): scene index, pause while the tab is hidden, manual
 * mode when `autoAdvance` is false (reduced motion). `onEnd` may change between renders.
 */
export function useBumperTimeline(
  durations: readonly number[],
  autoAdvance: boolean,
  onEnd: (reason: BumperEndReason) => void,
) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timelineRef = useRef<BumperTimeline | null>(null);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  // One timeline per mounted bumper; `durations` is a module constant.
  useEffect(() => {
    const timeline = createBumperTimeline({
      durations,
      autoAdvance,
      onScene: setIndex,
      onEnd: (reason) => onEndRef.current(reason),
    });
    timelineRef.current = timeline;
    const onVisibility = () => {
      timeline.setHidden(document.visibilityState === 'hidden');
      setPaused(timeline.paused);
    };
    document.addEventListener('visibilitychange', onVisibility);
    // A bumper opened in a background tab waits; `paused` only drives the progress bar, which no one sees then.
    timeline.setHidden(document.visibilityState === 'hidden');
    timeline.start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      timeline.dispose();
      timelineRef.current = null;
    };
    // autoAdvance changes are applied below without restarting the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setAutoAdvance(autoAdvance);
  }, [autoAdvance]);

  const next = useCallback(() => timelineRef.current?.next(), []);
  const skip = useCallback(() => timelineRef.current?.skip(), []);

  return { index, paused, next, skip };
}
