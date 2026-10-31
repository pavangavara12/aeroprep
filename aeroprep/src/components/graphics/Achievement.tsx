import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CheckIcon } from '../Icons';

/* ==========================================================================
   Achievement — a restrained celebratory overlay shown when the user finishes
   an interview, challenge, test, or milestone. A soft ring of rays expands
   once behind a badge, then a short message ("Great job!") reads out. It
   auto-dismisses and is announced politely to screen readers. Deliberately NOT
   game-like: one gentle burst, no confetti storms, no sound.
   ========================================================================== */

interface AchievementProps {
  show: boolean;
  title: string;
  message?: string;
  icon?: ReactNode;
  duration?: number;
  onDone?: () => void;
}

const RAYS = 10;

export function Achievement({ show, title, message, icon, duration = 2600, onDone }: AchievementProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      doneRef.current?.();
    }, duration);
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div className="achievement-overlay" role="status" aria-live="polite">
      <div className="achievement-card">
        <span className="ach-burst" aria-hidden="true">
          {Array.from({ length: RAYS }).map((_, i) => (
            <span
              key={i}
              className="ach-ray"
              style={{ '--r': `${(360 / RAYS) * i}deg` } as CSSProperties}
            />
          ))}
        </span>
        <span className="ach-badge" aria-hidden="true">
          {icon ?? <CheckIcon size={30} />}
        </span>
        <span className="ach-title">{title}</span>
        {message && <span className="ach-message">{message}</span>}
      </div>
    </div>
  );
}
