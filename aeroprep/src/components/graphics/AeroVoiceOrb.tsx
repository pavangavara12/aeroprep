import type { CSSProperties, ReactNode } from 'react';
import type { LiveCoachState } from '../../types';

/* ==========================================================================
   AeroVoiceOrb — the signature live-conversation centrepiece.

   A layered, fully presentational "voice energy" orb. It is deliberately NOT
   a robot face, human avatar, or generic sparkle: it reads as *sound* — a
   radial equalizer ring around a breathing core, with expanding wave rings,
   orbiting "thinking" particles, and a sweeping scan line.

   It owns no audio / socket / mic logic — it only reflects `state` (and an
   optional `audioLevel`, 0..1, that scales the reactive layers if a real
   amplitude ever becomes available WITHOUT touching the protected transport).

   All motion is CSS transform/opacity only (GPU-friendly) and keyed off
   `data-state`, so the global prefers-reduced-motion rule freezes it with no
   extra JS. `children` renders as the core icon (e.g. mic / stop).

   Signature:  <AeroVoiceOrb state="listening" audioLevel={0.6}>{icon}</AeroVoiceOrb>
   ========================================================================== */

interface AeroVoiceOrbProps {
  state: LiveCoachState;
  /** Optional external amplitude 0..1 — scales reactive layers when provided. */
  audioLevel?: number;
  size?: number;
  children?: ReactNode;
}

const EQ_BARS = 44;
const ORBIT_DOTS = 8;

export function AeroVoiceOrb({ state, audioLevel, size = 240, children }: AeroVoiceOrbProps) {
  const level =
    typeof audioLevel === 'number' ? Math.max(0, Math.min(1, audioLevel)) : null;

  // Geometry the equalizer bars read (kept in px so it scales with `size`).
  const rootStyle = {
    width: size,
    height: size,
    '--orb-eq-r': `${(size * 0.355).toFixed(1)}px`,
    '--orb-eq-h': `${(size * 0.15).toFixed(1)}px`,
    ...(level != null ? { '--orb-level': level.toFixed(3) } : {}),
  } as CSSProperties;

  return (
    <span className="aero-orb" data-state={state} style={rootStyle}>
      <span className="aero-orb-glow" aria-hidden="true" />

      {/* Expanding wave rings — dominant while the coach is speaking. */}
      <span className="aero-orb-waves" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      {/* Faint navigation ring with tick marks — the "instrument" feel. */}
      <span className="aero-orb-dial" aria-hidden="true" />

      {/* Radial equalizer — the core "voice" signal. */}
      <span className="aero-orb-eq" aria-hidden="true">
        {Array.from({ length: EQ_BARS }).map((_, i) => (
          <span
            key={i}
            className="aero-eq-bar"
            style={
              {
                transform: `rotate(${((360 / EQ_BARS) * i).toFixed(2)}deg) translateY(calc(var(--orb-eq-r) * -1))`,
                '--d': `${((i % 11) * 0.07).toFixed(2)}s`,
              } as CSSProperties
            }
          >
            <span className="aero-eq-fill" />
          </span>
        ))}
      </span>

      {/* Orbiting particles — the "thinking" moment. */}
      <span className="aero-orb-orbit" aria-hidden="true">
        {Array.from({ length: ORBIT_DOTS }).map((_, i) => (
          <span
            key={i}
            className="aero-orb-dot"
            style={{ '--a': `${(360 / ORBIT_DOTS) * i}deg` } as CSSProperties}
          />
        ))}
      </span>

      <span className="aero-orb-ring aero-orb-ring-outer" aria-hidden="true" />
      <span className="aero-orb-ring aero-orb-ring-inner" aria-hidden="true" />

      <span className="aero-orb-core" aria-hidden="true">
        <span className="aero-orb-core-sheen" />
        <span className="aero-orb-scan" />
      </span>

      {children != null && <span className="aero-orb-icon">{children}</span>}
    </span>
  );
}
