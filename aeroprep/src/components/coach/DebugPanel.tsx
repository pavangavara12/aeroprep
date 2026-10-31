import React from 'react';
import type { LiveDebugStats } from '../../types';

/* ==========================================================================
   DebugPanel — dev-only diagnostics for the Live coach. Renders the raw
   connection / audio / chunk counters so the 7-step debugging order can be
   followed by eye. The PARENT decides whether to mount this (hidden in
   production via import.meta.env.DEV), so it carries no secrets and never
   affects the production bundle's UI.
   ========================================================================== */

interface DebugPanelProps {
  stats: LiveDebugStats;
  tokenInfo?: { model: string; voice: string; apiVersion: string } | null;
}

const ROWS: Array<{ key: keyof LiveDebugStats; label: string }> = [
  { key: 'connection', label: 'WebSocket' },
  { key: 'audioContext', label: 'AudioContext' },
  { key: 'micActive', label: 'Mic active' },
  { key: 'inputSampleRate', label: 'Mic rate (Hz)' },
  { key: 'outputSampleRate', label: 'Output rate (Hz)' },
  { key: 'receivedChunks', label: 'Chunks received' },
  { key: 'playedChunks', label: 'Chunks played' },
  { key: 'queuedChunks', label: 'Chunks queued' },
  { key: 'lastMimeType', label: 'Last MIME' },
  { key: 'lastEvent', label: 'Last event' },
];

function render(v: LiveDebugStats[keyof LiveDebugStats]): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return String(v);
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ stats, tokenInfo }) => {
  return (
    <div className="coach-dbg" aria-label="Live debug panel">
      <div className="coach-dbg-head">
        <span className="coach-dbg-dot" data-conn={stats.connection} />
        Live diagnostics <span className="coach-dbg-tag">dev</span>
      </div>
      {tokenInfo && (
        <div className="coach-dbg-model">
          {tokenInfo.model} · {tokenInfo.voice} · {tokenInfo.apiVersion}
        </div>
      )}
      <div className="coach-dbg-grid">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="coach-dbg-row">
            <span className="coach-dbg-k">{label}</span>
            <span className="coach-dbg-v">{render(stats[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
