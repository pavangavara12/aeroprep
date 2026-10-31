import type { CSSProperties } from 'react';

/* ==========================================================================
   BotAvatar — a small, friendly "guide" mascot used as a chat identity (e.g.
   the simulated interviewer in the Mock Interview chat). It mirrors the API of
   the `bot-avatars` package the project wanted — <BotAvatar type="clover"
   state="speaking" /> — but is implemented as an original, dependency-free SVG
   so the build stays green even though that npm package can't be installed /
   verified in this environment.

   NOTE: This is intentionally NOT used for the live-voice visualiser (that is
   the AeroVoiceOrb, deliberately a "sound" shape, not a face). A friendly bot
   face is appropriate here, in a text chat, as a sender identity.

   To use the real package instead, run `npm install bot-avatars` and swap:
       import { BotAvatar } from 'bot-avatars';
   for the import of this file — the props (`type`, `state`) line up.
   ========================================================================== */

export type BotState = 'idle' | 'thinking' | 'speaking' | 'listening';

interface BotAvatarProps {
  /** Named look — maps to a colour theme (clover/nova/pixel/astro). */
  type?: string;
  state?: BotState;
  size?: number;
  className?: string;
}

const PALETTE: Record<string, { c1: string; c2: string; screen: string; glow: string }> = {
  clover: { c1: '#34d399', c2: '#059669', screen: '#06281f', glow: 'rgba(52,211,153,0.55)' },
  nova: { c1: '#60a5fa', c2: '#3b82f6', screen: '#071a33', glow: 'rgba(96,165,250,0.55)' },
  pixel: { c1: '#a78bfa', c2: '#7c3aed', screen: '#1b1038', glow: 'rgba(167,139,250,0.55)' },
  astro: { c1: '#fbbf24', c2: '#f59e0b', screen: '#2b1c02', glow: 'rgba(251,191,36,0.5)' },
};

export function BotAvatar({ type = 'clover', state = 'idle', size = 40, className = '' }: BotAvatarProps) {
  const p = PALETTE[type] ?? PALETTE.clover;
  const style = {
    '--bot-c1': p.c1,
    '--bot-c2': p.c2,
    '--bot-screen': p.screen,
    '--bot-glow': p.glow,
  } as CSSProperties;

  return (
    <span
      className={`bot-av ${className}`}
      data-state={state}
      data-type={type}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
        {/* antenna */}
        <line x1="24" y1="7" x2="24" y2="13" className="bot-antenna" />
        <circle cx="24" cy="5" r="2.4" className="bot-antenna-dot" />
        {/* head */}
        <rect x="8" y="13" width="32" height="27" rx="9" className="bot-head" />
        {/* face screen */}
        <rect x="12.5" y="17.5" width="23" height="18" rx="6" className="bot-screen" />
        {/* eyes */}
        <circle cx="20" cy="25.5" r="2.6" className="bot-eye bot-eye-l" />
        <circle cx="28" cy="25.5" r="2.6" className="bot-eye bot-eye-r" />
        {/* mouth / sound bars */}
        <g className="bot-mouth">
          <rect x="19" y="30" width="2.4" height="3.4" rx="1.2" className="bot-bar bot-bar-1" />
          <rect x="22.8" y="30" width="2.4" height="3.4" rx="1.2" className="bot-bar bot-bar-2" />
          <rect x="26.6" y="30" width="2.4" height="3.4" rx="1.2" className="bot-bar bot-bar-3" />
        </g>
        {/* ears */}
        <rect x="5" y="22" width="3.4" height="9" rx="1.7" className="bot-ear" />
        <rect x="39.6" y="22" width="3.4" height="9" rx="1.7" className="bot-ear" />
      </svg>
    </span>
  );
}
