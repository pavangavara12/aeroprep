import React from 'react';
import type { AssistantState } from '../../types';
import {
  MicIcon,
  StopIcon,
  RefreshIcon,
  VolumeIcon,
  VolumeMuteIcon,
  PlayIcon,
  XIcon,
} from '../Icons';

/* ==========================================================================
   InterviewControls — the control bar. Purely presentational: every action
   is a prop, so the same bar drives both the interviewer and the coach.
   The primary button changes with STATE so the user always knows what a tap
   will do, and nothing ever gets stuck (error → Retry).
   ========================================================================== */

interface InterviewControlsProps {
  state: AssistantState;
  isMuted: boolean;
  canReplay: boolean;
  micSupported: boolean;
  voiceSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
  onToggleMute: () => void;
  onReplay: () => void;
  onRetry: () => void;
  onEnd?: () => void;
  endLabel?: string;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({
  state,
  isMuted,
  canReplay,
  micSupported,
  voiceSupported,
  onStart,
  onStop,
  onInterrupt,
  onToggleMute,
  onReplay,
  onRetry,
  onEnd,
  endLabel = 'End',
}) => {
  const renderPrimary = () => {
    if (state === 'error') {
      return (
        <button className="btn btn-primary va-primary-btn" onClick={onRetry}>
          <RefreshIcon size={18} /> Retry
        </button>
      );
    }
    if (state === 'listening') {
      return (
        <button className="btn btn-primary va-primary-btn va-primary-listening" onClick={onStop}>
          <StopIcon size={16} /> Stop &amp; send
        </button>
      );
    }
    if (state === 'processing') {
      return (
        <button className="btn btn-primary va-primary-btn" disabled>
          <span className="va-spinner" /> Thinking…
        </button>
      );
    }
    if (state === 'speaking') {
      return (
        <button className="btn btn-secondary va-primary-btn" onClick={onInterrupt}>
          <StopIcon size={16} /> Interrupt
        </button>
      );
    }
    // idle / paused / completed
    return (
      <button className="btn btn-primary va-primary-btn" onClick={onStart} disabled={!micSupported}>
        <MicIcon size={18} /> {state === 'completed' ? 'Answer again' : 'Answer'}
      </button>
    );
  };

  return (
    <div className="va-controls">
      {renderPrimary()}
      <div className="va-controls-secondary">
        {voiceSupported && (
          <button
            className={`va-icon-btn ${isMuted ? 'va-icon-btn-on' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute assistant voice' : 'Mute assistant voice'}
            aria-pressed={isMuted}
          >
            {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
        )}
        <button
          className="va-icon-btn"
          onClick={onReplay}
          disabled={!canReplay || state === 'listening' || state === 'processing'}
          title="Replay last response"
        >
          <PlayIcon size={16} />
        </button>
        {onEnd && (
          <button className="va-icon-btn va-icon-btn-danger" onClick={onEnd} title={endLabel}>
            <XIcon size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
