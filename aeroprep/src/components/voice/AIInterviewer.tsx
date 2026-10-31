import React, { useCallback, useRef, useState } from 'react';
import type {
  InterviewConfig,
  InterviewDifficulty,
  InterviewSummary,
  InterviewTurn,
  InterviewType,
  SpeechMetrics,
} from '../../types';
import type { ChatTurn } from '../../services/aiService';
import { interviewerRespond, evaluateAnswer, summarizeInterview } from '../../services/aiService';
import { useVoiceAssistant, type VoiceReply } from '../../hooks/useVoiceAssistant';
import { VoiceAssistant } from './VoiceAssistant';
import { InterviewConversation } from './InterviewConversation';
import { InterviewFeedback } from './InterviewFeedback';
import { PlayIcon, BriefcaseIcon } from '../Icons';
import { postJson } from '../../services/apiClient';

/* ==========================================================================
   AIInterviewer — the full AI Interviewer experience: setup → live voice
   interview with dynamic follow-ups and per-answer evaluation → summary.
   Wires the generic useVoiceAssistant orchestrator to the Gemini-backed
   aiService. All AI parsing is defensive in the service layer, so a bad
   response degrades gracefully instead of crashing.
   ========================================================================== */

const TYPES: { value: InterviewType; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'communication', label: 'Communication' },
  { value: 'mixed', label: 'Mixed' },
];
const DIFFICULTIES: InterviewDifficulty[] = ['easy', 'medium', 'hard'];
const QUESTION_CHOICES = [3, 5, 8, 10];

let seq = 0;
const uid = () => `t${Date.now().toString(36)}_${(seq++).toString(36)}`;

function buildGreeting(c: InterviewConfig): string {
  const kind =
    c.type === 'hr' ? 'HR' : c.type.charAt(0).toUpperCase() + c.type.slice(1);
  const role = c.jobRole ? ` for the ${c.jobRole} role` : '';
  return `Hello! Welcome to your AeroPrep ${kind} mock interview${role}. I'll ask one question at a time — answer naturally with your microphone, or type if you prefer. Let's begin.`;
}

function toHistory(turns: InterviewTurn[]): ChatTurn[] {
  return turns.map((t) => ({
    role: t.role === 'interviewer' ? 'model' : 'user',
    text: t.text,
  }));
}

function lastInterviewerText(turns: InterviewTurn[]): string {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === 'interviewer') return turns[i].text;
  }
  return '';
}

function fallbackFirstQuestion(c: InterviewConfig): string {
  if (c.type === 'technical')
    return 'To start, tell me about a technical project you’re proud of and the part you personally built.';
  if (c.type === 'behavioral')
    return 'Let’s begin — tell me about a time you faced a real challenge at work and how you handled it.';
  if (c.type === 'communication')
    return 'To warm up: how would you explain what you do to someone with no background in your field?';
  if (c.type === 'hr')
    return 'Thanks for joining. To start, could you tell me a bit about yourself and why this role interests you?';
  return 'To get started, tell me a little about yourself and what brings you here today.';
}

function buildPairs(turns: InterviewTurn[]): InterviewSummary['perQuestion'] {
  const pairs: InterviewSummary['perQuestion'] = [];
  let q = '';
  for (const t of turns) {
    if (t.role === 'interviewer') q = t.text;
    else pairs.push({ question: q, answer: t.text, evaluation: t.evaluation });
  }
  return pairs;
}

/** If the summary model call fails, assemble an honest summary from the
 *  per-answer evaluations and locally-measured metrics we already have. */
function fallbackSummary(turns: InterviewTurn[]): InterviewSummary {
  const answers = turns.filter((t) => t.role === 'candidate');
  const evals = answers
    .map((a) => a.evaluation)
    .filter((e): e is NonNullable<InterviewTurn['evaluation']> => !!e);
  const avg = (pick: (e: NonNullable<InterviewTurn['evaluation']>) => number): number =>
    evals.length ? Math.round(evals.reduce((s, e) => s + pick(e), 0) / evals.length) : 0;
  const voiced = answers.filter((a) => a.metrics);
  const paceWpm = voiced.length
    ? Math.round(voiced.reduce((s, a) => s + (a.metrics?.wordsPerMinute ?? 0), 0) / voiced.length)
    : null;
  const totalFillerCount = answers.reduce((s, a) => s + (a.metrics?.fillerCount ?? 0), 0);
  return {
    overallScore: avg((e) => e.overall),
    communicationScore: avg((e) => e.clarity),
    technicalScore: avg((e) => e.completeness),
    relevanceScore: avg((e) => e.relevance),
    confidenceScore: avg((e) => e.confidence),
    paceWpm,
    totalFillerCount,
    strengths: [],
    improvements: [],
    recommendedTopics: [],
    perQuestion: buildPairs(turns),
    closingRemark: 'Here’s a summary based on your answers — nice work completing the session!',
  };
}

interface AIInterviewerProps {
  /** Award XP into the app's progress system on completion (optional). */
  onAddScore?: (score: number) => void;
}

type Phase = 'setup' | 'live' | 'summary';

const DEFAULT_CONFIG: InterviewConfig = { type: 'mixed', difficulty: 'medium', questionCount: 5 };

export const AIInterviewer: React.FC<AIInterviewerProps> = ({ onAddScore }) => {
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_CONFIG);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const turnsRef = useRef<InterviewTurn[]>([]);
  const mainAskedRef = useRef(0);
  const finishedRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const syncTurns = useCallback((updater: (prev: InterviewTurn[]) => InterviewTurn[]) => {
    setTurns((prev) => {
      const next = updater(prev);
      turnsRef.current = next;
      return next;
    });
  }, []);

  const pushTurn = useCallback(
    (role: InterviewTurn['role'], text: string, extra?: Partial<InterviewTurn>) => {
      const turn: InterviewTurn = { id: uid(), role, text, timestamp: new Date().toISOString(), ...extra };
      syncTurns((prev) => [...prev, turn]);
    },
    [syncTurns],
  );

  const handleUserTranscript = useCallback(
    (text: string, metrics: SpeechMetrics | null) => {
      pushTurn('candidate', text, { viaVoice: metrics != null, metrics: metrics ?? undefined });
    },
    [pushTurn],
  );

  /** The brain of a turn: evaluate the just-given answer and decide the next
   *  question/follow-up (both in parallel). Returns the line the assistant
   *  should speak, flagging `end` when the interview is complete. */
  const respond = useCallback(
    async (userText: string, metrics: SpeechMetrics | null): Promise<VoiceReply> => {
      const cfg = configRef.current;
      const question = lastInterviewerText(turnsRef.current);
      const answersSoFar = turnsRef.current.filter((t) => t.role === 'candidate').length;
      const cap = Math.max(cfg.questionCount, 3) + 4; // safety net against endless follow-ups
      const overCap = answersSoFar >= cap;

      const [evaluation, next] = await Promise.all([
        evaluateAnswer(cfg, question, userText, metrics ?? undefined).catch(() => null),
        overCap
          ? Promise.resolve(null)
          : interviewerRespond(cfg, toHistory(turnsRef.current), mainAskedRef.current).catch(() => null),
      ]);

      if (evaluation) {
        syncTurns((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === 'candidate') {
              const copy = prev.slice();
              copy[i] = { ...copy[i], evaluation };
              return copy;
            }
          }
          return prev;
        });
      }

      if (overCap || !next || next.action === 'end') {
        const closing =
          next && next.action === 'end' && next.reply.trim()
            ? next.reply.trim()
            : 'That’s everything I wanted to cover — thank you for a thoughtful conversation. Give me a moment to put together your feedback.';
        pushTurn('interviewer', closing);
        return { text: closing, end: true };
      }

      if (next.action === 'ask') mainAskedRef.current += 1;
      pushTurn('interviewer', next.reply);
      return { text: next.reply, end: false };
    },
    [pushTurn, syncTurns],
  );

  /** Wrap up: summarize the whole conversation (guarded to run once). */
  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSummarizing(true);
    setPhase('summary');
    const cfg = configRef.current;
    const collected = turnsRef.current;
    try {
      const s = await summarizeInterview(cfg, collected);
      setSummary(s);
      onAddScore?.(Math.max(20, Math.round(s.overallScore)));
      postJson('/api/interviews/save', {
        type: cfg.type,
        jobRole: cfg.jobRole || 'Software Engineer',
        difficulty: cfg.difficulty,
        questionCount: cfg.questionCount,
        overallScore: Math.round(s.overallScore),
        summary: s.closingRemark || 'Interview completed successfully.',
        turns: collected,
      }).catch(() => {});
    } catch {
      const fallback = fallbackSummary(collected);
      setSummary(fallback);
      postJson('/api/interviews/save', {
        type: cfg.type,
        jobRole: cfg.jobRole || 'Software Engineer',
        difficulty: cfg.difficulty,
        questionCount: cfg.questionCount,
        overallScore: Math.round(fallback.overallScore),
        summary: fallback.closingRemark || 'Interview completed successfully.',
        turns: collected,
      }).catch(() => {});
    } finally {
      setSummarizing(false);
    }
  }, [onAddScore]);

  const va = useVoiceAssistant({
    respond,
    autoListen: true,
    onUserTranscript: handleUserTranscript,
    onStateChange: (s) => {
      if (s === 'completed') void finish();
    },
  });

  /** Begin (or restart) an interview with the current config. */
  const startInterview = useCallback(async () => {
    const trim = (s?: string) => {
      const v = (s ?? '').trim();
      return v ? v : undefined;
    };
    const cfg: InterviewConfig = {
      type: config.type,
      difficulty: config.difficulty,
      questionCount: config.questionCount,
      jobRole: trim(config.jobRole),
      experienceLevel: trim(config.experienceLevel),
      skills: trim(config.skills),
      company: trim(config.company),
    };
    configRef.current = cfg;
    setConfig(cfg);

    finishedRef.current = false;
    mainAskedRef.current = 0;
    turnsRef.current = [];
    setTurns([]);
    setSummary(null);
    va.reset();
    setPhase('live');

    const greeting = buildGreeting(cfg);
    let firstQuestion = '';
    try {
      const first = await interviewerRespond(cfg, [], 0);
      firstQuestion = first.reply.trim();
    } catch {
      firstQuestion = '';
    }
    if (!firstQuestion) firstQuestion = fallbackFirstQuestion(cfg);
    mainAskedRef.current = 1;

    pushTurn('interviewer', greeting);
    pushTurn('interviewer', firstQuestion);
    await va.say(`${greeting} ${firstQuestion}`, { autoListenAfter: true });
  }, [config, pushTurn, va]);

  const handleNewInterview = useCallback(() => {
    va.reset();
    finishedRef.current = false;
    turnsRef.current = [];
    setTurns([]);
    setSummary(null);
    setPhase('setup');
  }, [va]);

  if (phase === 'summary') {
    return (
      <div className="va-interviewer">
        {summarizing || !summary ? (
          <div className="va-loading glass-panel">
            <span className="va-spinner va-spinner-lg" />
            <p>Analyzing your interview and preparing honest feedback…</p>
          </div>
        ) : (
          <InterviewFeedback
            summary={summary}
            onRestart={() => void startInterview()}
            onNewInterview={handleNewInterview}
          />
        )}
      </div>
    );
  }

  if (phase === 'live') {
    const typeLabel = TYPES.find((t) => t.value === config.type)?.label ?? 'Mixed';
    const answered = turns.filter((t) => t.role === 'candidate').length;
    const total = Math.max(config.questionCount, 1);
    const qNow = Math.min(answered + 1, total);
    return (
      <div className="va-interviewer va-live">
        <div className="interview-room">
          <div className="interview-room-bar">
            <span className="interview-room-live">
              <span className="interview-room-dot" aria-hidden="true" />
              Live interview
            </span>
            <span className="interview-room-meta">
              <span className="interview-room-tag">{typeLabel}</span>
              <span className="interview-room-tag">{config.difficulty}</span>
              <span className="interview-room-progress">
                Question {qNow} of {total}
              </span>
            </span>
          </div>
          <div className="va-live-grid">
            <div className="va-live-stage glass-panel">
              <div className="interview-nameplate">
                <span className="interview-nameplate-avatar" aria-hidden="true">
                  <BriefcaseIcon size={18} />
                </span>
                <span className="interview-nameplate-text">
                  <span className="interview-nameplate-name">Your AI Interviewer</span>
                  <span className="interview-nameplate-role">
                    {typeLabel} · {config.difficulty}
                  </span>
                </span>
              </div>
              <VoiceAssistant
                va={va}
                hint="Tap Answer and speak naturally — or type your reply below."
                showEnd
                endLabel="End interview"
              />
            </div>
            <div className="va-live-convo glass-panel">
              <InterviewConversation
                turns={turns}
                liveTranscript={va.liveTranscript}
                state={va.state}
                emptyHint="Your conversation with the interviewer will appear here."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="va-interviewer va-setup">
      <div className="va-setup-card glass-panel">
        <div className="va-setup-lead">
          <h3 className="va-setup-title">Set up your mock interview</h3>
          <p className="va-setup-sub">
            Pick a focus and I'll run a realistic voice interview — asking follow-ups based on your actual
            answers, then giving you honest feedback.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Interview type</label>
          <div className="va-chip-row">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`va-chip ${config.type === t.value ? 'va-chip-on' : ''}`}
                onClick={() => setConfig((c) => ({ ...c, type: t.value }))}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="va-setup-row">
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <div className="va-chip-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`va-chip ${config.difficulty === d ? 'va-chip-on' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, difficulty: d }))}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Questions</label>
            <div className="va-chip-row">
              {QUESTION_CHOICES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`va-chip ${config.questionCount === n ? 'va-chip-on' : ''}`}
                  onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="va-setup-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="ai-role">
              Target role <span className="va-optional">(optional)</span>
            </label>
            <input
              id="ai-role"
              className="form-input"
              placeholder="e.g. Frontend Engineer"
              value={config.jobRole ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, jobRole: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ai-exp">
              Experience <span className="va-optional">(optional)</span>
            </label>
            <input
              id="ai-exp"
              className="form-input"
              placeholder="e.g. 3 years / Senior"
              value={config.experienceLevel ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, experienceLevel: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ai-skills">
              Key skills <span className="va-optional">(optional)</span>
            </label>
            <input
              id="ai-skills"
              className="form-input"
              placeholder="e.g. React, system design"
              value={config.skills ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, skills: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ai-company">
              Target company <span className="va-optional">(optional)</span>
            </label>
            <input
              id="ai-company"
              className="form-input"
              placeholder="e.g. a fast-growing startup"
              value={config.company ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, company: e.target.value }))}
            />
          </div>
        </div>

        <div className="va-setup-actions">
          <button className="btn btn-primary va-start-btn" onClick={() => void startInterview()}>
            <PlayIcon size={16} /> Start interview
          </button>
          {!va.micSupported && (
            <span className="va-note">Voice isn't available right now. You can continue using text.</span>
          )}
        </div>
      </div>
    </div>
  );
};
