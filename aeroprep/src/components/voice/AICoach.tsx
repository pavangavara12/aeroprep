import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AppModule, CoachMessage } from '../../types';
import { coachReply } from '../../services/aiService';
import { useVoiceAssistant, type VoiceReply } from '../../hooks/useVoiceAssistant';
import { SparklesIcon, XIcon, SendIcon, MicIcon, StopIcon, VolumeIcon, VolumeMuteIcon } from '../Icons';

/* ==========================================================================
   AICoach — an app-wide, context-aware coaching chat. It knows which module
   the user is on (Dashboard / Communication / Soft Skills / Aptitude / Mock)
   and tailors its help accordingly. Text-first, with OPTIONAL voice input and
   optional spoken replies — both routed through the same useVoiceAssistant
   orchestrator so behaviour (states, errors, retry) stays consistent.
   ========================================================================== */

const MODULE_LABEL: Record<AppModule, string> = {
  dashboard: 'your overall prep',
  communication: 'communication practice',
  softskills: 'soft skills',
  aptitude: 'aptitude practice',
  mock: 'mock interviews',
};

let cseq = 0;
const cuid = () => `c${Date.now().toString(36)}_${(cseq++).toString(36)}`;

function welcome(module: AppModule): string {
  return `Hi! I'm your AeroPrep coach. Ask me anything about ${MODULE_LABEL[module]} — tips, feedback, or what to focus on next.`;
}

interface AICoachProps {
  module: AppModule;
  progressNote?: string;
}

export const AICoach: React.FC<AICoachProps> = ({ module, progressNote }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [draft, setDraft] = useState('');

  const messagesRef = useRef<CoachMessage[]>([]);
  const moduleRef = useRef(module);
  moduleRef.current = module;
  const progressRef = useRef(progressNote);
  progressRef.current = progressNote;
  const endRef = useRef<HTMLDivElement | null>(null);

  const sync = useCallback((updater: (prev: CoachMessage[]) => CoachMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const addMessage = useCallback(
    (role: CoachMessage['role'], text: string) => {
      sync((prev) => [...prev, { id: cuid(), role, text, timestamp: new Date().toISOString() }]);
    },
    [sync],
  );

  const respond = useCallback(
    async (): Promise<VoiceReply> => {
      const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));
      let reply = '';
      try {
        reply = await coachReply(moduleRef.current, history, { progressNote: progressRef.current });
      } catch {
        reply = 'Sorry — I had trouble responding just now. Please try again in a moment.';
      }
      addMessage('assistant', reply);
      return { text: reply, speak: voiceReplies };
    },
    [addMessage, voiceReplies],
  );

  const handleUserTranscript = useCallback((text: string) => addMessage('user', text), [addMessage]);

  const va = useVoiceAssistant({ respond, autoListen: false, onUserTranscript: handleUserTranscript });

  // Context-aware welcome the first time the panel opens.
  useEffect(() => {
    if (open && messagesRef.current.length === 0) addMessage('assistant', welcome(moduleRef.current));
  }, [open, addMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, va.state]);

  const busy = va.state === 'processing' || va.state === 'speaking';
  const listening = va.state === 'listening';

  const send = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void va.submitText(text);
  };

  return (
    <>
      {!open && (
        <button className="va-coach-fab" onClick={() => setOpen(true)} aria-label="Open AI Coach">
          <SparklesIcon size={22} />
        </button>
      )}

      {open && (
        <div className="va-coach glass-panel" role="dialog" aria-label="AI Coach">
          <div className="va-coach-head">
            <div className="va-coach-title">
              <SparklesIcon size={16} /> AI Coach
            </div>
            <div className="va-coach-head-actions">
              {va.voiceSupported && (
                <button
                  className={`va-icon-btn ${voiceReplies ? 'va-icon-btn-on' : ''}`}
                  onClick={() => {
                    const nv = !voiceReplies;
                    setVoiceReplies(nv);
                    if (!nv && va.state === 'speaking') va.interrupt();
                  }}
                  title={voiceReplies ? 'Spoken replies on' : 'Spoken replies off'}
                  aria-pressed={voiceReplies}
                >
                  {voiceReplies ? <VolumeIcon size={16} /> : <VolumeMuteIcon size={16} />}
                </button>
              )}
              <button className="va-icon-btn" onClick={() => setOpen(false)} aria-label="Close coach">
                <XIcon size={16} />
              </button>
            </div>
          </div>

          <div className="va-coach-context">Focused on {MODULE_LABEL[module]}</div>

          <div className="va-coach-body" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`va-coach-msg va-coach-msg-${m.role}`}>
                {m.text}
              </div>
            ))}
            {va.state === 'processing' && (
              <div className="va-coach-msg va-coach-msg-assistant va-msg-typing" aria-label="Thinking">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={endRef} />
          </div>

          {va.error && (
            <div className="va-coach-error" role="alert">
              {va.error}
            </div>
          )}
          {!va.micSupported && (
            <div className="va-coach-note">Voice isn't available right now. You can continue using text.</div>
          )}

          <div className="va-coach-input">
            {va.micSupported && (
              <button
                className={`va-icon-btn ${listening ? 'va-icon-btn-danger' : ''}`}
                onClick={() => (listening ? void va.stopListening() : void va.startListening())}
                disabled={busy}
                title={listening ? 'Stop & send' : 'Speak your message'}
              >
                {listening ? <StopIcon size={16} /> : <MicIcon size={16} />}
              </button>
            )}
            <input
              className="form-input"
              value={draft}
              placeholder={listening ? 'Listening…' : 'Ask your coach…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) send();
              }}
              disabled={listening}
              aria-label="Message the coach"
            />
            <button className="btn btn-primary va-send-btn" onClick={send} disabled={busy || !draft.trim()}>
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
