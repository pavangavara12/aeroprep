import React from 'react';
import type { CoachSessionRecord, CommScores } from '../../types';
import { TrendingUpIcon, TrashIcon } from '../Icons';

/* ==========================================================================
   ProgressPanel — local "Communication Progress" over recorded sessions.

   Shows ONLY real recorded sessions (from useCoachProgress / localStorage).
   No fabricated trends: the one comparison shown is the factual delta between
   the two most recent sessions' overall scores.
   ========================================================================== */

const METRIC_COLS: Array<{ key: keyof CommScores; label: string }> = [
  { key: 'clarity', label: 'Clar' },
  { key: 'fluency', label: 'Flu' },
  { key: 'grammar', label: 'Gram' },
  { key: 'vocabulary', label: 'Voc' },
  { key: 'structure', label: 'Struct' },
];

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface ProgressPanelProps {
  sessions: CoachSessionRecord[];
  onClear?: () => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({ sessions, onClear }) => {
  if (!sessions.length) return null;

  // Newest first for display.
  const rows = [...sessions].reverse();

  // Factual delta between the two most recent sessions that have an overall.
  const scored = sessions.filter((s) => typeof s.overall === 'number');
  let delta: number | null = null;
  if (scored.length >= 2) {
    const last = scored[scored.length - 1].overall as number;
    const prev = scored[scored.length - 2].overall as number;
    delta = last - prev;
  }

  return (
    <section className="coach-progress glass-panel" aria-label="Communication progress">
      <header className="coach-progress-head">
        <h3 className="coach-progress-title">
          <TrendingUpIcon size={16} /> Communication Progress
        </h3>
        <div className="coach-progress-tools">
          <span className="coach-progress-count">
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </span>
          {onClear && (
            <button
              type="button"
              className="btn btn-ghost coach-progress-clear"
              onClick={onClear}
              title="Clear saved progress"
            >
              <TrashIcon size={14} /> Clear
            </button>
          )}
        </div>
      </header>

      {delta !== null && (
        <p className="coach-progress-delta">
          Latest overall{' '}
          <b className={delta > 0 ? 'coach-delta-up' : delta < 0 ? 'coach-delta-down' : ''}>
            {delta > 0 ? `+${delta}` : delta}
          </b>{' '}
          vs your previous session.
        </p>
      )}

      <div className="coach-progress-scroll">
        <table className="coach-progress-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th className="coach-col-num">Overall</th>
              {METRIC_COLS.map((c) => (
                <th key={c.key} className="coach-col-num">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.dateISO)}</td>
                <td className="coach-col-mode">{s.modeLabel}</td>
                <td className="coach-col-num coach-col-overall">
                  {typeof s.overall === 'number' ? s.overall : '—'}
                </td>
                {METRIC_COLS.map((c) => (
                  <td key={c.key} className="coach-col-num">
                    {s.scores ? s.scores[c.key] : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="coach-progress-note">
        Saved on this device only. Scores are AI-generated estimates; “—” means feedback wasn’t
        available for that session.
      </p>
    </section>
  );
};
