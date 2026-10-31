import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/* ==========================================================================
   useCountUp — animates a number from its previous value up (or down) to the
   target with an ease-out curve, for XP / score / stat tiles. Honours reduced
   motion by snapping straight to the value. Pure presentation: it never
   changes the underlying data, only what's rendered.
   ========================================================================== */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (reduced || from === to) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (to - from) * eased);
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, reduced]);

  return display;
}
