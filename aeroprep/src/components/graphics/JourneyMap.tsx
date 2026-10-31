import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/* ==========================================================================
   JourneyMap — "Your Preparation Journey": a milestone path
   (Start → Skills → Practice → Interview). The progress line animates in on
   load, completed milestones glow, the current one gently breathes, and
   future ones stay muted. Presentational only — the parent decides statuses.
   ========================================================================== */

export type JourneyStatus = 'done' | 'current' | 'todo';

export interface JourneyStep {
  label: string;
  caption?: string;
  status: JourneyStatus;
  icon?: ReactNode;
}

interface JourneyMapProps {
  steps: JourneyStep[];
  className?: string;
}

export function JourneyMap({ steps, className = '' }: JourneyMapProps) {
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  // How far along the line to fill: reach the current step, or the end if all done.
  const n = Math.max(steps.length - 1, 1);
  let reached = steps.filter((s) => s.status === 'done').length;
  const hasCurrent = steps.some((s) => s.status === 'current');
  if (hasCurrent) reached = steps.findIndex((s) => s.status === 'current');
  const pct = Math.max(0, Math.min(1, reached / n));

  useEffect(() => {
    // Defer one frame so the CSS transition animates from 0 → pct on mount.
    rafRef.current = requestAnimationFrame(() => setReady(true));
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={`journey ${className}`} role="list" aria-label="Your preparation journey">
      <div className="journey-rail" aria-hidden="true">
        <span className="journey-rail-base" />
        <span
          className="journey-rail-fill"
          style={{ transform: `scaleX(${ready ? pct : 0})` } as CSSProperties}
        />
      </div>
      <ol className="journey-steps">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`journey-step journey-step-${s.status}`}
            role="listitem"
            style={{ '--step-delay': `${0.15 + i * 0.12}s` } as CSSProperties}
          >
            <span className="journey-node">
              <span className="journey-node-inner">{s.icon ?? i + 1}</span>
              <span className="journey-node-halo" aria-hidden="true" />
            </span>
            <span className="journey-text">
              <span className="journey-label">{s.label}</span>
              {s.caption && <span className="journey-caption">{s.caption}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
