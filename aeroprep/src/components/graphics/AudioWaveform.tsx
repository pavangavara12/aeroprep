import { useEffect, useRef } from 'react';
import type { LiveCoachState } from '../../types';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ==========================================================================
   AudioWaveform — a smooth, continuously-evolving audio waveform drawn on a
   single <canvas> (one element, GPU-cheap). Its character is driven by the
   live conversation STATE, so it never looks identical frame-to-frame and
   clearly differs between idle / listening / thinking / speaking / error.

   It reads its colour from the live CSS theme tokens (so it tracks light/dark
   and never hard-codes a hue) and fully stops when the user prefers reduced
   motion. An optional `level` (0..1) scales amplitude, leaving the door open
   to a real mic meter WITHOUT touching the protected audio pipeline.
   ========================================================================== */

interface WaveformProps {
  state: LiveCoachState;
  level?: number; // optional 0..1 external amplitude (e.g. real mic level)
  height?: number;
  className?: string;
}

// Per-state feel: which theme token to draw with, base amplitude, and speed.
const VARIANT: Record<LiveCoachState, { varName: string; amp: number; speed: number }> = {
  idle: { varName: '--text-muted', amp: 0.06, speed: 0.6 },
  connecting: { varName: '--accent-cyan', amp: 0.16, speed: 1.1 },
  reconnecting: { varName: '--accent-amber', amp: 0.16, speed: 1.1 },
  listening: { varName: '--accent-cyan', amp: 0.5, speed: 1.5 },
  thinking: { varName: '--accent-amber', amp: 0.22, speed: 0.9 },
  speaking: { varName: '--accent', amp: 0.82, speed: 2.1 },
  interrupted: { varName: '--accent-warm', amp: 0.34, speed: 1.4 },
  error: { varName: '--accent-rose', amp: 0.05, speed: 0.5 },
  ended: { varName: '--text-muted', amp: 0.06, speed: 0.5 },
};

export function AudioWaveform({ state, level, height = 88, className = '' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const stateRef = useRef(state);
  stateRef.current = state;
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let colorCache = 'rgba(120,130,160,0.9)';
    let colorTick = 0;
    let ampCurrent = 0; // eased amplitude for smooth state transitions

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const readColor = () => {
      const v = VARIANT[stateRef.current] ?? VARIANT.idle;
      const raw = getComputedStyle(canvas).getPropertyValue(v.varName).trim();
      if (raw) colorCache = raw;
    };
    readColor();

    const draw = (time: number) => {
      const v = VARIANT[stateRef.current] ?? VARIANT.idle;
      const mid = height / 2;
      // Refresh theme colour a few times a second (cheap, tracks theme toggle).
      if (time - colorTick > 400) { readColor(); colorTick = time; }
      // Ease amplitude toward the target so state changes glide.
      const target = v.amp * (levelRef.current != null ? 0.35 + levelRef.current : 1);
      ampCurrent += (target - ampCurrent) * 0.08;

      ctx.clearRect(0, 0, width, height);
      const t = time / 1000;
      const points = 96;

      // Faint baseline — the "instrument" reference line.
      ctx.strokeStyle = colorCache;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();

      // Signed vertical offset at normalised x — layered sines read as organic,
      // non-repeating motion; env tapers it toward the edges.
      const offAt = (nx: number, phase: number, ampScale: number) => {
        const env = Math.sin(nx * Math.PI);
        const s =
          Math.sin(nx * 9 + t * v.speed + phase) * 0.6 +
          Math.sin(nx * 17 - t * v.speed * 1.7 + phase) * 0.3 +
          Math.sin(nx * 4 + t * v.speed * 0.6) * 0.4;
        return s * env * mid * ampCurrent * ampScale;
      };

      // Filled symmetric ribbon (mirror band) → a real "audio envelope" look.
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const y = mid + offAt(i / points, 0, 1);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = points; i >= 0; i--) {
        const x = (i / points) * width;
        ctx.lineTo(x, mid - offAt(i / points, 0, 1));
      }
      ctx.closePath();
      ctx.fillStyle = colorCache;
      ctx.globalAlpha = 0.16;
      ctx.fill();

      // Crisp edges + a faint echo for depth.
      const strokeEdge = (sign: number, phase: number, ampScale: number, alpha: number, lw: number) => {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const y = mid + sign * offAt(i / points, phase, ampScale);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colorCache;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lw;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      };
      strokeEdge(1, 0, 1, 0.95, 2.5);
      strokeEdge(-1, 0, 1, 0.5, 1.5);
      strokeEdge(1, 1.9, 0.6, 0.3, 1.5);
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      // Static ribbon, no loop — honours prefers-reduced-motion.
      ampCurrent = (VARIANT[stateRef.current] ?? VARIANT.idle).amp * 0.5;
      readColor();
      const mid = height / 2;
      const off = (nx: number) => Math.sin(nx * 6) * Math.sin(nx * Math.PI) * mid * ampCurrent;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const x = (i / 72) * width;
        const y = mid + off(i / 72);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let i = 72; i >= 0; i--) {
        ctx.lineTo((i / 72) * width, mid - off(i / 72));
      }
      ctx.closePath();
      ctx.fillStyle = colorCache;
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = colorCache;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`audio-waveform ${className}`}
      style={{ width: '100%', height }}
      aria-hidden="true"
    />
  );
}
