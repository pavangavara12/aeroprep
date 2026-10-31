import type { ReactNode } from 'react';
import type { LiveCoachState } from '../../types';

/* ==========================================================================
   LiveOrbVisual — the animated centrepiece for the live conversation. It is
   PURELY presentational: it reflects the session `state` but owns no audio,
   socket or mic logic (the parent keeps the real controls). No cartoon face,
   no robot — just layered energy: a breathing core, reactive rings, and a
   ring of orbiting particles for the "thinking" moment.

   All motion is CSS-driven (transform/opacity only → GPU-friendly) and keyed
   off `data-state`, so the global prefers-reduced-motion rule neutralises it
   with no extra JS. `children` renders in the core (e.g. the mic / stop icon).
   ========================================================================== */

interface LiveOrbVisualProps {
  state: LiveCoachState;
  size?: number;
  children?: ReactNode;
}

const PARTICLES = 6;

export function LiveOrbVisual({ state, size = 220, children }: LiveOrbVisualProps) {
  const radius = size * 0.46;
  return (
    <span className="orb-visual" data-state={state} style={{ width: size, height: size }}>
      <span className="orb-glow" aria-hidden="true" />
      <span className="orb-ring orb-ring-1" aria-hidden="true" />
      <span className="orb-ring orb-ring-2" aria-hidden="true" />
      <span className="orb-ring orb-ring-3" aria-hidden="true" />
      <span className="orb-orbit" aria-hidden="true">
        {Array.from({ length: PARTICLES }).map((_, i) => {
          const angle = (360 / PARTICLES) * i;
          return (
            <span
              key={i}
              className="orb-dot"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px)`,
              }}
            />
          );
        })}
      </span>
      <span className="orb-core" aria-hidden="true">
        <span className="orb-core-sheen" />
        <span className="orb-core-icon">{children}</span>
      </span>
    </span>
  );
}
