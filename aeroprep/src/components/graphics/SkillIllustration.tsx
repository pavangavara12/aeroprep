/* ==========================================================================
   SkillIllustration — bespoke, lightweight SVG illustrations for each track,
   with restrained motion (waves pulse, the aptitude graph draws itself, chat
   bubbles drift, a checkmark ticks in). One <svg> each, currentColor-driven so
   they inherit the track hue, and the global reduced-motion rule calms them.
   ========================================================================== */

export type SkillKind = 'communication' | 'softskills' | 'aptitude' | 'mock';

interface SkillIllustrationProps {
  kind: SkillKind;
  size?: number;
  className?: string;
}

export function SkillIllustration({ kind, size = 72, className = '' }: SkillIllustrationProps) {
  return (
    <svg
      className={`skill-ill skill-ill-${kind} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      {kind === 'communication' && (
        <g>
          <rect x="46" y="30" width="28" height="46" rx="14" className="si-solid" />
          <path d="M36 60 a24 24 0 0 0 48 0" className="si-stroke" />
          <line x1="60" y1="84" x2="60" y2="96" className="si-stroke" />
          <line x1="48" y1="96" x2="72" y2="96" className="si-stroke" />
          <path d="M88 46 a16 16 0 0 1 0 28" className="si-wave si-wave-1" />
          <path d="M96 38 a26 26 0 0 1 0 44" className="si-wave si-wave-2" />
        </g>
      )}

      {kind === 'softskills' && (
        <g>
          <circle cx="42" cy="52" r="11" className="si-solid si-float si-f1" />
          <path d="M26 82 a16 16 0 0 1 32 0" className="si-solid si-float si-f1" />
          <circle cx="82" cy="46" r="9" className="si-stroke si-float si-f2" />
          <path d="M69 72 a13 13 0 0 1 26 0" className="si-stroke si-float si-f2" />
          <line x1="53" y1="50" x2="73" y2="46" className="si-link" />
          <rect x="70" y="20" width="30" height="20" rx="7" className="si-bubble si-float si-f3" />
        </g>
      )}

      {kind === 'aptitude' && (
        <g>
          <line x1="30" y1="26" x2="30" y2="92" className="si-axis" />
          <line x1="30" y1="92" x2="98" y2="92" className="si-axis" />
          <polyline points="34,80 50,64 66,72 84,40" className="si-graph" />
          <circle cx="84" cy="40" r="4" className="si-solid si-pulse" />
          <text x="70" y="30" className="si-glyph">+</text>
          <text x="44" y="46" className="si-glyph si-glyph-sm">×</text>
        </g>
      )}

      {kind === 'mock' && (
        <g>
          <rect x="26" y="30" width="68" height="46" rx="8" className="si-stroke" />
          <circle cx="60" cy="50" r="9" className="si-solid" />
          <path d="M46 70 a14 14 0 0 1 28 0" className="si-solid" />
          <line x1="40" y1="88" x2="80" y2="88" className="si-stroke" />
          <g className="si-check">
            <circle cx="90" cy="82" r="13" className="si-check-badge" />
            <path d="M84 82 l4 4 l8 -9" className="si-check-mark" />
          </g>
        </g>
      )}
    </svg>
  );
}
