import React from 'react';
import type { AssistantState } from '../../types';
import { MicIcon, PauseIcon } from '../Icons';

/* ==========================================================================
   VoiceVisualizer — the central orb. It reacts to the conversation STATE
   (listening / processing / speaking) with subtle, honest animation driven
   purely by CSS + the data-state attribute. It does not fake audio levels.
   ========================================================================== */

const CAPTION: Record<AssistantState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Thinking…',
  speaking: 'Speaking…',
  paused: 'Paused',
  error: 'Needs attention',
  completed: 'Complete',
};

interface VoiceVisualizerProps {
  state: AssistantState;
  size?: number;
  caption?: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ state, size = 176, caption = true }) => (
  <div className="va-visualizer" data-state={state} style={{ '--va-size': `${size}px` } as React.CSSProperties}>
    <div className="va-orb" role="img" aria-label={CAPTION[state]}>
      <span className="va-ring va-ring-1" />
      <span className="va-ring va-ring-2" />
      <span className="va-ring va-ring-3" />
      <span className="va-orb-core">
        {state === 'speaking' ? (
          <span className="va-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : state === 'paused' ? (
          <PauseIcon size={Math.round(size * 0.2)} />
        ) : (
          <MicIcon size={Math.round(size * 0.22)} />
        )}
      </span>
    </div>
    {caption && <div className="va-caption">{CAPTION[state]}</div>}
  </div>
);
