import React, { useEffect, useRef } from 'react';
import type { AssistantState, InterviewTurn, AnswerEvaluation } from '../../types';

/* ==========================================================================
   InterviewConversation — the running transcript. Shows each interviewer
   question and candidate answer as chat bubbles, an optional live (interim)
   transcript while the user is speaking, and concise per-answer feedback.
   Auto-scrolls to the newest turn.
   ========================================================================== */

const EvalChips: React.FC<{ evaluation: AnswerEvaluation }> = ({ evaluation }) => {
  const chips: Array<[string, number]> = [
    ['Relevance', evaluation.relevance],
    ['Clarity', evaluation.clarity],
    ['Complete', evaluation.completeness],
    ['Confidence', evaluation.confidence],
    ['Structure', evaluation.structure],
  ];
  return (
    <div className="va-eval">
      <div className="va-eval-chips">
        {chips.map(([label, val]) => (
          <span key={label} className="va-eval-chip" data-band={val >= 75 ? 'high' : val >= 50 ? 'mid' : 'low'}>
            {label} <b>{val}</b>
          </span>
        ))}
      </div>
      {evaluation.feedback && <p className="va-eval-note">{evaluation.feedback}</p>}
      {evaluation.improvements.length > 0 && (
        <p className="va-eval-tip">
          <b>Tip:</b> {evaluation.improvements[0]}
        </p>
      )}
    </div>
  );
};

interface InterviewConversationProps {
  turns: InterviewTurn[];
  liveTranscript?: string;
  state: AssistantState;
  showEvaluation?: boolean;
  emptyHint?: string;
}

export const InterviewConversation: React.FC<InterviewConversationProps> = ({
  turns,
  liveTranscript,
  state,
  showEvaluation = true,
  emptyHint,
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, liveTranscript, state]);

  return (
    <div className="va-convo" aria-live="polite">
      {turns.length === 0 && !liveTranscript && emptyHint && <div className="va-convo-empty">{emptyHint}</div>}

      {turns.map((turn) => (
        <div key={turn.id} className={`va-msg va-msg-${turn.role}`}>
          <div className="va-msg-role">{turn.role === 'interviewer' ? 'Interviewer' : 'You'}</div>
          <div className="va-msg-bubble">
            {turn.text}
            {turn.role === 'candidate' && turn.metrics && (
              <div className="va-msg-metrics">
                {turn.metrics.wordCount} words · {turn.metrics.durationSec}s · ~{turn.metrics.wordsPerMinute} wpm
                {turn.metrics.fillerCount > 0 && <> · {turn.metrics.fillerCount} filler{turn.metrics.fillerCount === 1 ? '' : 's'}</>}
              </div>
            )}
          </div>
          {showEvaluation && turn.role === 'candidate' && turn.evaluation && <EvalChips evaluation={turn.evaluation} />}
        </div>
      ))}

      {/* Live interim transcript while listening (best-effort) */}
      {state === 'listening' && liveTranscript && (
        <div className="va-msg va-msg-candidate va-msg-live">
          <div className="va-msg-role">You</div>
          <div className="va-msg-bubble va-msg-bubble-live">
            {liveTranscript}
            <span className="va-caret" />
          </div>
        </div>
      )}

      {/* Thinking placeholder so the UI never looks frozen */}
      {state === 'processing' && (
        <div className="va-msg va-msg-interviewer">
          <div className="va-msg-role">Interviewer</div>
          <div className="va-msg-bubble va-msg-typing" aria-label="Thinking">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};
