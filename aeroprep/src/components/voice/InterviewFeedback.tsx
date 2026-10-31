import React from 'react';
import type { InterviewSummary } from '../../types';
import { ProgressRing, Meter, StatTile } from '../Shared';
import { RefreshIcon, ClockIcon, SpeechIcon, CheckCircleIcon, LightbulbIcon, BookOpenIcon } from '../Icons';

/* ==========================================================================
   InterviewFeedback — end-of-interview summary. Scores from the model are
   shown alongside HONEST, locally-measured delivery metrics (pace, fillers).
   Reuses the app's ProgressRing / Meter / StatTile primitives so it matches
   the rest of AeroPrep.
   ========================================================================== */

interface InterviewFeedbackProps {
  summary: InterviewSummary;
  onRestart: () => void;
  onNewInterview: () => void;
}

const band = (v: number): string =>
  v >= 80 ? 'var(--accent-emerald)' : v >= 60 ? 'var(--accent-blue)' : v >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';

export const InterviewFeedback: React.FC<InterviewFeedbackProps> = ({ summary, onRestart, onNewInterview }) => {
  const answered = summary.perQuestion.length;
  return (
    <div className="va-summary animate-slide-up">
      <div className="va-summary-head">
        <div>
          <div className="badge badge-accent">Interview complete</div>
          <h3 className="va-summary-title">Your performance summary</h3>
          <p className="va-summary-remark">{summary.closingRemark}</p>
        </div>
        <ProgressRing percentage={summary.overallScore} size={128} stroke={10} color={band(summary.overallScore)} sublabel="Overall" />
      </div>

      <div className="va-summary-stats">
        <StatTile
          icon={<SpeechIcon size={18} />}
          value={summary.paceWpm === null ? '—' : `${summary.paceWpm}`}
          label="Words / min"
          color="var(--accent-cyan)"
        />
        <StatTile
          icon={<LightbulbIcon size={18} />}
          value={summary.totalFillerCount}
          label="Filler words"
          color="var(--accent-amber)"
        />
        <StatTile
          icon={<CheckCircleIcon size={18} />}
          value={answered}
          label="Answers given"
          color="var(--accent-emerald)"
        />
        <StatTile
          icon={<ClockIcon size={18} />}
          value={summary.paceWpm === null ? 'Text' : 'Voice'}
          label="Mode used"
          color="var(--accent-violet)"
        />
      </div>

      <div className="va-summary-meters">
        <Meter label="Communication" value={summary.communicationScore} color={band(summary.communicationScore)} />
        <Meter label="Technical understanding" value={summary.technicalScore} color={band(summary.technicalScore)} />
        <Meter label="Answer relevance" value={summary.relevanceScore} color={band(summary.relevanceScore)} />
        <Meter label="Confidence (wording)" value={summary.confidenceScore} color={band(summary.confidenceScore)} />
      </div>

      {/* SUMMARY_APPEND */}
      <div className="va-summary-cols">
        {summary.strengths.length > 0 && (
          <div className="va-summary-list">
            <h4>
              <CheckCircleIcon size={16} /> Strengths
            </h4>
            <ul>
              {summary.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.improvements.length > 0 && (
          <div className="va-summary-list">
            <h4>
              <LightbulbIcon size={16} /> Areas to improve
            </h4>
            <ul>
              {summary.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {summary.recommendedTopics.length > 0 && (
        <div className="va-summary-topics">
          <h4>
            <BookOpenIcon size={16} /> Recommended practice
          </h4>
          <div className="va-topic-tags">
            {summary.recommendedTopics.map((t, i) => (
              <span key={i} className="badge badge-blue">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {answered > 0 && (
        <div className="va-summary-review">
          <h4>Question review</h4>
          {summary.perQuestion.map((q, i) => (
            <details key={i} className="va-review-item">
              <summary>
                <span className="va-review-q">Q{i + 1}. {q.question}</span>
                {q.evaluation && (
                  <span className="va-review-score" style={{ color: band(q.evaluation.overall) }}>
                    {q.evaluation.overall}
                  </span>
                )}
              </summary>
              <p className="va-review-answer">{q.answer || '(no answer captured)'}</p>
              {q.evaluation?.feedback && <p className="va-review-fb">{q.evaluation.feedback}</p>}
            </details>
          ))}
        </div>
      )}

      <div className="va-summary-actions">
        <button className="btn btn-primary" onClick={onRestart}>
          <RefreshIcon size={16} /> Run it again
        </button>
        <button className="btn btn-secondary" onClick={onNewInterview}>
          New interview setup
        </button>
      </div>
    </div>
  );
};
