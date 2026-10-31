import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ==========================================================================
   FlightPath — a subtle, professional "career flight path" banner graphic.
   A curved route rises across the frame with checkpoint markers, a scatter of
   faint stars, and a small paper-plane that glides along the path leaving a
   trail that draws itself in. Ties into the AEROprep name without turning the
   product into an "airplane website". Decorative only (aria-hidden).

   Motion: the trail uses a CSS stroke-dashoffset draw-in; the plane uses SVG
   <animateMotion> along the SAME path. Both are gated on reduced-motion so the
   graphic renders as a calm static scene when the user opts out.
   ========================================================================== */

// One shared route definition, reused by the visible path and the plane motion.
const PATH_D = 'M 20 210 C 220 210, 300 90, 500 90 S 820 150, 980 70 S 1160 40, 1180 30';
const CHECKPOINTS = [
  { x: 20, y: 210 },
  { x: 500, y: 90 },
  { x: 820, y: 128 },
  { x: 1180, y: 30 },
];
const STARS = [
  { x: 140, y: 70, r: 2.5, d: '3.2s' },
  { x: 360, y: 40, r: 1.8, d: '2.4s' },
  { x: 640, y: 55, r: 2.2, d: '3.8s' },
  { x: 760, y: 30, r: 1.5, d: '2.9s' },
  { x: 900, y: 110, r: 2, d: '3.4s' },
  { x: 1080, y: 90, r: 1.6, d: '2.6s' },
];

interface FlightPathProps {
  className?: string;
}

export function FlightPath({ className = '' }: FlightPathProps) {
  const reduced = useReducedMotion();
  return (
    <svg
      className={`flight-path ${className}`}
      viewBox="0 0 1200 240"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* faint dotted "planned route" */}
      <path d={PATH_D} className="fp-route" strokeDasharray="2 10" />
      {/* solid "progress" trail that draws itself in */}
      <path d={PATH_D} className={`fp-trail ${reduced ? 'fp-trail-static' : ''}`} />

      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          className="fp-star"
          style={reduced ? undefined : { animationDuration: s.d }}
        />
      ))}

      {CHECKPOINTS.map((c, i) => (
        <g key={i} className="fp-checkpoint" style={{ '--cp-delay': `${i * 0.4}s` } as CSSProperties}>
          <circle cx={c.x} cy={c.y} r="9" className="fp-cp-halo" />
          <circle cx={c.x} cy={c.y} r="4.5" className="fp-cp-dot" />
        </g>
      ))}

      {/* paper-plane travelling the route */}
      <g className="fp-plane" transform={reduced ? 'translate(1180 30) rotate(-24)' : undefined}>
        <path d="M -12 -8 L 14 0 L -12 8 L -6 0 Z" className="fp-plane-body" />
        {!reduced && (
          <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#fp-motion" />
          </animateMotion>
        )}
      </g>
      <path id="fp-motion" d={PATH_D} className="fp-hidden" />
    </svg>
  );
}
