import { useEffect, useState } from 'react';

/* ==========================================================================
   useReducedMotion — subscribes to the user's OS "reduce motion" preference
   so JS-driven animations (canvas loops, GSAP, particle timers) can opt out,
   matching the global CSS `@media (prefers-reduced-motion: reduce)` rule.
   Returns true when the user prefers reduced motion.
   ========================================================================== */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // addEventListener is the modern API; older Safari used addListener.
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return reduced;
}
