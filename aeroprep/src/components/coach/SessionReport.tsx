import React from 'react';
import type { AiCoachReport, CommScores, LocalCommMetrics } from '../../types';
import { SparklesIcon, XIcon, MicIcon } from '../Icons';

/* ==========================================================================
   SessionReport — the end-of-session "COMMUNICATION REPORT".

   Two clearly separated halves:
     1. MEASURED — deterministic metrics from communicationAnalysis.ts
        (filler counts, word counts, pace). Stated as fact.
     2. AI-GENERATED — qualitative scores + coaching notes from coachAnalysis.ts,
        explicitly badged "AI-generated" and never presented as exact numbers.
   If the AI half is unavailable, the measured half still stands on its own.
   ========================================================================== */

const SCORE_LABELS: Array<{ key: keyof CommScores; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'fluency', label: 'Fluency' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'structure', label: 'Structure' },
  { key: 'confidence', label: 'Confidence' },
];

const tone = (n: number): string => (n >= 75 ? 'high' : n >= 50 ? 'mid' : 'low');

const fmtDur = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="coach-score">
    <div className="coach-score-top">
      <span className="coach-score-label">{label}</span>
      <span className="coach-score-val">{value}</span>
    </div>
    <div className="coach-score-track" role="img" aria-label={`${label}: ${value} out of 100`}>
      <div className={`coach-score-fill coach-score-${tone(value)}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const ReportList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => {
  if (!items.length) return null;
  return (
    <div className="coach-report-block">
      <h4 className="coach-report-h">{title}</h4>
      <ul className="coach-report-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
};

interface SessionReportProps {
  metrics: LocalCommMetrics;
  report: AiCoachReport | null;
  loading: boolean;
  modeLabel: string;
  durationSec: number;
  onPracticeAgain?: () => void;
  onDismiss?: () => void;
}

// SESSION_REPORT_BODY
export const SessionReport: React.FC<SessionReportProps> = ({
  metrics,
  report,
  loading,
  modeLabel,
  durationSec,
  onPracticeAgain,
  onDismiss,
}) => {
  const topFiller = metrics.fillerByWord[0];
  return (
    <section className="coach-report glass-panel" aria-label="Communication report">
      <header className="coach-report-head">
        <div>
          <h2 className="coach-report-title">Communication Report</h2>
          <p className="coach-report-meta">
            {modeLabel} · {fmtDur(durationSec)} · {metrics.userTurns} spoken response
            {metrics.userTurns === 1 ? '' : 's'}
          </p>
        </div>
        {onDismiss && (
          <button className="coach-note-x coach-report-x" onClick={onDismiss} aria-label="Dismiss report">
            <XIcon size={16} />
          </button>
        )}
      </header>

      {/* ---- MEASURED (fact) ------------------------------------------- */}
      <div className="coach-report-section">
        <div className="coach-report-kicker">Measured</div>
        <div className="coach-metric-grid">
          <div className="coach-metric">
            <span className="coach-metric-n">{metrics.totalUserWords}</span>
            <span className="coach-metric-l">words spoken</span>
          </div>
          <div className="coach-metric">
            <span className="coach-metric-n">{metrics.avgWordsPerTurn}</span>
            <span className="coach-metric-l">avg words / response</span>
          </div>
          <div className="coach-metric">
            <span className="coach-metric-n">{metrics.pacePerSessionMinute}</span>
            <span className="coach-metric-l">words / session min</span>
          </div>
          <div className="coach-metric">
            <span className="coach-metric-n">{metrics.fillerTotal}</span>
            <span className="coach-metric-l">filler words</span>
          </div>
        </div>

        <div className="coach-report-block">
          <h4 className="coach-report-h">
            Filler words <span className="coach-report-sub">({metrics.fillerPerHundredWords} per 100 words)</span>
          </h4>
          {metrics.fillerByWord.length ? (
            <>
              <div className="coach-chip-row">
                {metrics.fillerByWord.map((f) => (
                  <span key={f.word} className="coach-count-chip">
                    “{f.word}” <b>{f.count}</b>
                  </span>
                ))}
              </div>
              <p className="coach-report-tip">
                {topFiller && topFiller.count >= 3
                  ? `You leaned on “${topFiller.word}” ${topFiller.count} times — try a short silent pause instead; it reads as more confident.`
                  : 'Nicely controlled — very few fillers. Keep using brief pauses to gather your thoughts.'}
              </p>
            </>
          ) : (
            <p className="coach-report-tip">No common filler words detected. Great control.</p>
          )}
        </div>

        {metrics.repeatedWords.length > 0 && (
          <div className="coach-report-block">
            <h4 className="coach-report-h">Most repeated words</h4>
            <div className="coach-chip-row">
              {metrics.repeatedWords.map((w) => (
                <span key={w.word} className="coach-count-chip">
                  {w.word} <b>{w.count}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ---- AI-GENERATED (judgment) ----------------------------------- */}
      <div className="coach-report-section">
        <div className="coach-report-kicker coach-report-kicker-ai">
          <SparklesIcon size={13} /> AI-generated communication feedback
        </div>

        {loading ? (
          <div className="coach-report-loading">
            <span className="coach-report-spinner" aria-hidden="true" />
            Analyzing your conversation…
          </div>
        ) : report ? (
          <>
            <div className="coach-overall">
              <div className={`coach-overall-num coach-score-${tone(report.overall)}`}>{report.overall}</div>
              <div className="coach-overall-side">
                <span className="coach-overall-label">Overall</span>
                {report.summary && <p className="coach-overall-summary">{report.summary}</p>}
              </div>
            </div>

            <div className="coach-scores">
              {SCORE_LABELS.map(({ key, label }) => (
                <ScoreBar key={key} label={label} value={report.scores[key]} />
              ))}
            </div>

            <ReportList title="Communication strengths" items={report.strengths} />
            <ReportList title="Areas to improve" items={report.areasToImprove} />

            <div className="coach-report-block">
              <h4 className="coach-report-h">
                Answer structure <span className="coach-report-sub">({report.structure.framework})</span>
              </h4>
              <div className="coach-star-row">
                {report.structure.present.map((p) => (
                  <span key={`p-${p}`} className="coach-star-badge coach-star-on">
                    {p}
                  </span>
                ))}
                {report.structure.missing.map((m) => (
                  <span key={`m-${m}`} className="coach-star-badge coach-star-off">
                    {m}
                  </span>
                ))}
              </div>
              {report.structure.note && <p className="coach-report-tip">{report.structure.note}</p>}
            </div>

            <ReportList title="Grammar observations" items={report.grammarObservations} />
            <ReportList title="Vocabulary suggestions" items={report.vocabularySuggestions} />
            <ReportList title="Recommended exercises" items={report.recommendedExercises} />

            <p className="coach-report-disclaimer">
              Scores are AI-generated estimates to guide practice, not exact measurements.
            </p>
          </>
        ) : (
          <div className="coach-note coach-note-info coach-report-inline-note">
            AI-generated feedback couldn’t be generated this time (the AI server may be offline or not
            configured). The measured metrics above are still accurate.
          </div>
        )}
      </div>

      {onPracticeAgain && (
        <div className="coach-report-actions">
          <button type="button" className="btn btn-primary" onClick={onPracticeAgain}>
            <MicIcon size={16} /> Practice again
          </button>
        </div>
      )}
    </section>
  );
};
