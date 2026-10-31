import React, { useState } from 'react';
import type { VoiceAssistantApi } from '../../hooks/useVoiceAssistant';
import { VoiceVisualizer } from './VoiceVisualizer';
import { InterviewControls } from './InterviewControls';
import { SendIcon, VolumeIcon } from '../Icons';

/* ==========================================================================
   VoiceAssistant — reusable voice panel: the orb, the state-aware control
   bar, an always-available TEXT fallback, and inline error/retry. Both the
   AI Interviewer and the AI Coach render this so behaviour stays consistent.
   Voice is never mandatory — if the mic is unavailable the user is told and
   can keep going with text.
   ========================================================================== */

interface VoiceAssistantProps {
  va: VoiceAssistantApi;
  visualizerSize?: number;
  hint?: string;
  textPlaceholder?: string;
  showText?: boolean;
  showEnd?: boolean;
  endLabel?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  va,
  visualizerSize = 176,
  hint,
  textPlaceholder = 'Or type your response…',
  showText = true,
  showEnd = false,
  endLabel = 'End',
}) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void va.submitText(text);
  };

  const busy = va.state === 'processing' || va.state === 'speaking';

  return (
    <div className="va-panel">
      <VoiceVisualizer state={va.state} size={visualizerSize} />

      {hint && va.state === 'idle' && <p className="va-hint">{hint}</p>}

      {!va.micSupported && (
        <p className="va-note">Voice isn't available right now. You can continue using text.</p>
      )}

      {va.error && (
        <div className="va-error" role="alert">
          <span>{va.error}</span>
        </div>
      )}

      <InterviewControls
        state={va.state}
        isMuted={va.isMuted}
        canReplay={va.canReplay}
        micSupported={va.micSupported}
        voiceSupported={va.voiceSupported}
        onStart={va.startListening}
        onStop={va.stopListening}
        onInterrupt={va.interrupt}
        onToggleMute={va.toggleMute}
        onReplay={va.replay}
        onRetry={va.retry}
        onEnd={showEnd ? va.end : undefined}
        endLabel={endLabel}
      />

      {va.voiceSupported && (
        <div className="va-diagnostics">
          <button
            type="button"
            className="va-testvoice"
            onClick={() => void va.testVoice()}
            disabled={va.state === 'listening' || va.state === 'processing'}
            title="Play a short test phrase to check your audio"
          >
            <VolumeIcon size={14} /> Test voice
          </button>
          {va.usedVoiceFallback && (
            <span className="va-note va-note-inline">Using your browser's built-in voice.</span>
          )}
        </div>
      )}

      {showText && (
        <div className="va-text-fallback">
          <input
            type="text"
            className="form-input"
            value={draft}
            placeholder={textPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) submit();
            }}
            aria-label="Type your response"
          />
          <button className="btn btn-primary va-send-btn" onClick={submit} disabled={busy || !draft.trim()}>
            <SendIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
