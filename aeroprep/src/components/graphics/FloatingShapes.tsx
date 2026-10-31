import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ==========================================================================
   FloatingShapes — a very subtle background layer of line-art shapes (thin
   rings, a paper-plane, a dotted arc, a soft plus, a faint blob). They drift
   with varied durations/delays so the background never feels flat, but the
   count is deliberately tiny (GPU-friendly transform/opacity only). Sits
   behind content (pointer-events:none) and stills under reduced-motion.
   ========================================================================== */

type ShapeType = 'ring' | 'plane' | 'arc' | 'plus' | 'blob' | 'dot';

interface Shape {
  type: ShapeType;
  top: string;
  left: string;
  size: number;
  dur: string;
  delay: string;
  hue: string;
  drift: number; // px of vertical travel
}

// Two arrangements so different pages can look distinct without new markup.
const SETS: Record<string, Shape[]> = {
  a: [
    { type: 'ring', top: '12%', left: '8%', size: 90, dur: '13s', delay: '0s', hue: 'var(--accent)', drift: 18 },
    { type: 'plane', top: '22%', left: '82%', size: 34, dur: '16s', delay: '1.5s', hue: 'var(--accent-secondary)', drift: 22 },
    { type: 'arc', top: '68%', left: '75%', size: 120, dur: '18s', delay: '0.8s', hue: 'var(--accent-warm)', drift: 14 },
    { type: 'plus', top: '74%', left: '14%', size: 26, dur: '11s', delay: '2.2s', hue: 'var(--accent-secondary)', drift: 20 },
    { type: 'blob', top: '46%', left: '90%', size: 150, dur: '22s', delay: '0s', hue: 'var(--accent)', drift: 12 },
    { type: 'dot', top: '40%', left: '20%', size: 12, dur: '9s', delay: '1s', hue: 'var(--accent-warm)', drift: 24 },
  ],
  b: [
    { type: 'arc', top: '10%', left: '68%', size: 130, dur: '19s', delay: '0.4s', hue: 'var(--accent)', drift: 16 },
    { type: 'plus', top: '20%', left: '12%', size: 24, dur: '12s', delay: '1.2s', hue: 'var(--accent-warm)', drift: 22 },
    { type: 'ring', top: '70%', left: '82%', size: 80, dur: '14s', delay: '0.6s', hue: 'var(--accent-secondary)', drift: 18 },
    { type: 'plane', top: '78%', left: '22%', size: 30, dur: '17s', delay: '2s', hue: 'var(--accent)', drift: 20 },
    { type: 'dot', top: '34%', left: '86%', size: 10, dur: '10s', delay: '0.2s', hue: 'var(--accent-secondary)', drift: 26 },
  ],
};

function ShapeGlyph({ type, hue }: { type: ShapeType; hue: string }) {
  const s: CSSProperties = { color: hue };
  switch (type) {
    case 'ring':
      return <svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
    case 'plane':
      return <svg viewBox="0 0 100 100" style={s}><path d="M10 50 L90 20 L60 90 L52 58 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /></svg>;
    case 'arc':
      return <svg viewBox="0 0 100 100" style={s}><path d="M6 84 A80 80 0 0 1 94 30" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" /></svg>;
    case 'plus':
      return <svg viewBox="0 0 100 100" style={s}><path d="M50 18 V82 M18 50 H82" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg>;
    case 'dot':
      return <svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="34" fill="currentColor" /></svg>;
    case 'blob':
      return <svg viewBox="0 0 200 200" style={s}><path fill="currentColor" d="M52 -63 C69 -49 82 -28 83 -6 C84 16 73 39 55 54 C37 69 12 76 -12 74 C-36 72 -60 61 -71 42 C-82 23 -80 -4 -68 -25 C-56 -46 -34 -61 -10 -68 C15 -75 35 -77 52 -63 Z" transform="translate(100 100)" /></svg>;
  }
}

interface FloatingShapesProps {
  variant?: 'a' | 'b';
  className?: string;
}

export function FloatingShapes({ variant = 'a', className = '' }: FloatingShapesProps) {
  const reduced = useReducedMotion();
  const shapes = SETS[variant] ?? SETS.a;
  return (
    <div className={`floating-shapes ${className}`} aria-hidden="true">
      {shapes.map((sh, i) => (
        <span
          key={i}
          className={`float-shape float-shape-${sh.type} ${sh.type === 'blob' ? 'float-shape-blob' : ''}`}
          style={{
            top: sh.top,
            left: sh.left,
            width: sh.size,
            height: sh.size,
            animationDuration: reduced ? '0s' : sh.dur,
            animationDelay: reduced ? '0s' : sh.delay,
            '--drift': `${sh.drift}px`,
          } as CSSProperties}
        >
          <ShapeGlyph type={sh.type} hue={sh.hue} />
        </span>
      ))}
    </div>
  );
}
