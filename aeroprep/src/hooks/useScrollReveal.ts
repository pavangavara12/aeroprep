import { useEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealOptions {
  /** CSS selector (relative to the container) for items to animate in. */
  selector?: string;
  /** Starting vertical offset in px. */
  y?: number;
  duration?: number;
  /** Stagger delay between each matched item, in seconds. */
  stagger?: number;
  delay?: number;
  /** ScrollTrigger "start" position, e.g. 'top 85%'. */
  start?: string;
  /** Re-run the animation whenever these values change (e.g. active tab, question count). */
  deps?: unknown[];
}

/**
 * Attaches a GSAP + ScrollTrigger fade/slide-up reveal to every element
 * matching `selector` inside the returned container ref.
 *
 * Usage:
 *   const ref = useScrollReveal<HTMLDivElement>({ selector: '.reveal-item' });
 *   <div ref={ref}> ... elements with className="reveal-item" ... </div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const {
    selector = '.reveal-item',
    y = 32,
    duration = 0.7,
    stagger = 0.08,
    delay = 0,
    start = 'top 88%',
    deps = [],
  } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll(selector);
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: container,
            start,
            toggleActions: 'play none none none',
          },
        }
      );
    }, container);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, y, duration, stagger, delay, start, ...deps]);

  return containerRef;
}

/**
 * Plays a quick fade/slide transition on a container every time `trigger`
 * changes (e.g. switching between tabs). Useful for non-scroll transitions.
 */
export function useTabTransition<T extends HTMLElement = HTMLDivElement>(
  trigger: unknown
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [trigger]);

  return ref;
}
