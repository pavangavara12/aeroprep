import React, { useEffect, useRef, useState } from 'react';
import type { AiCoachReport, LiveCoachState, LocalCommMetrics } from '../../types';
import { useLiveCoach } from '../../hooks/useLiveCoach';
import { useCoachProgress } from '../../hooks/useCoachProgress';
import { computeLocalMetrics, hasEnoughToAnalyze } from '../../services/communicationAnalysis';
import { requestCoachReport } from '../../services/coachAnalysis';
import { COACH_MODES, getCoachMode } from './coachModes';
import { DebugPanel } from './DebugPanel';
import { SessionReport } from './SessionReport';
import { ProgressPanel } from './ProgressPanel';
import { MicIcon, MicOffIcon, StopIcon, VolumeIcon, SendIcon, XIcon, ClockIcon } from '../Icons';
import { AeroVoiceOrb } from '../graphics/AeroVoiceOrb';
import { AudioWaveform } from '../graphics/AudioWaveform';

/* ==========================================================================
   CommunicationCoach — the full-screen real-time voice coach experience.

   A single big orb starts/stops the live session; the user simply talks. Live
   YOU:/AI: transcription streams into a conversation log, a session timer runs,
   and a 🔊 Test Voice button plays a LOCAL tone to prove the speaker pipeline
   independently of Gemini. A text box is always available as a fallback. In
   dev builds a diagnostics panel is shown; it is compiled out of production.
   ========================================================================== */

const STATE_LABEL: Record<LiveCoachState, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening',
  thinking: 'Thinking…',
  speaking: 'Speaking',
  interrupted: 'Go ahead…',
  reconnecting: 'Reconnecting…',
  error: 'Error',
  ended: 'Session ended',
};

const STATE_HINT: Record<LiveCoachState, string> = {
  idle: 'Press start, allow your mic, and just talk.',
  connecting: 'Setting up a secure live session…',
  listening: "I'm listening — speak naturally.",
  thinking: 'Working out a helpful reply…',
  speaking: 'You can interrupt me any time — just start talking.',
  interrupted: "I'll stop — the floor is yours.",
  reconnecting: 'Connection hiccup — trying to restore it…',
  error: 'Something went wrong. You can try again.',
  ended: 'Nice work. Start again whenever you like.',
};

const ACTIVE_STATES: LiveCoachState[] = [
  'connecting',
  'listening',
  'thinking',
  'speaking',
  'interrupted',
  'reconnecting',
];

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const CommunicationCoach: React.FC = () => {
  const coach = useLiveCoach({ initialMode: 'free' });
  const progress = useCoachProgress();
  const [draft, setDraft] = useState('');
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // End-of-session communication report.
  const [metrics, setMetrics] = useState<LocalCommMetrics | null>(null);
  const [report, setReport] = useState<AiCoachReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMeta, setReportMeta] = useState<{ modeLabel: string; durationSec: number } | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const analyzedRef = useRef(false); // guard: analyze each ended session only once

  const isDev = Boolean(import.meta.env.DEV);
  const active = ACTIVE_STATES.includes(coach.state);
  const mode = getCoachMode(coach.modeId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [coach.history, coach.liveYou, coach.liveCoach, coach.state]);

  const clearReport = () => {
    analyzeAbortRef.current?.abort();
    setMetrics(null);
    setReport(null);
    setReportLoading(false);
    setReportMeta(null);
  };

  // A new session is beginning → clear any previous report so it can't linger.
  useEffect(() => {
    if (coach.state === 'connecting') {
      analyzedRef.current = false;
      clearReport();
    }
  }, [coach.state]);

  // Session ended → measure locally, then request the AI-generated report and
  // persist an honest record of what actually happened.
  useEffect(() => {
    if (coach.state !== 'ended' || analyzedRef.current) return;
    analyzedRef.current = true;

    const turns = coach.history;
    const durationSec = coach.elapsedSec;
    const m = computeLocalMetrics(turns, durationSec);
    if (!hasEnoughToAnalyze(m)) return; // nothing meaningful to report

    const modeId = coach.modeId;
    const modeLabel = getCoachMode(modeId).label;
    setMetrics(m);
    setReportMeta({ modeLabel, durationSec });
    setReport(null);
    setReportLoading(true);

    const ac = new AbortController();
    analyzeAbortRef.current = ac;

    void (async () => {
      let r: AiCoachReport | null = null;
      try {
        r = await requestCoachReport(turns, modeId, modeLabel, m, ac.signal);
      } catch {
        r = null;
      }
      if (ac.signal.aborted) return;
      setReport(r);
      setReportLoading(false);
      progress.addSession({
        id: `cs_${Date.now().toString(36)}`,
        dateISO: new Date().toISOString(),
        mode: modeId,
        modeLabel,
        durationSec,
        metrics: m,
        scores: r ? r.scores : null,
        overall: r ? r.overall : null,
      });
    })();
  }, [coach.state, coach.history, coach.elapsedSec, coach.modeId, progress.addSession]);

  const onOrbClick = () => {
    if (active) void coach.stop();
    else void coach.start();
  };

  const onTest = async () => {
    setTestMsg(null);
    const ok = await coach.testVoice();
    setTestMsg(
      ok
        ? 'Test tone played. If you heard it, your speakers and audio pipeline work.'
        : 'Could not play the test tone. Check your device volume and that the tab is allowed to play sound.',
    );
  };

  const sendDraft = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    coach.sendText(t);
  };

  return (
    <div className="coach-screen aero-interview-room">
      {/* Command bar — the "interview room" header */}
      <header className="room-bar">
        <div className="room-bar-id">
          <span className={`room-live-dot room-live-${coach.state}`} aria-hidden="true" />
          <span className="room-bar-text">
            <span className="room-title">
              {active ? 'Live Interview Room' : 'AeroPrep Interview Room'}
            </span>
            <span className="room-sub">
              {active ? STATE_LABEL[coach.state] : 'Real-time voice practice'} · {mode.label}
            </span>
          </span>
        </div>
        <div className="room-bar-meta">
          <span className="room-chip room-chip-time" title="Session length">
            <ClockIcon size={14} /> {fmtTime(coach.elapsedSec)}
          </span>
          <span className={`room-chip room-mic ${coach.debug.micActive ? 'room-mic-on' : ''}`}>
            {coach.debug.micActive ? <MicIcon size={14} /> : <MicOffIcon size={14} />}
            {coach.debug.micActive ? 'Mic live' : 'Mic off'}
          </span>
          {active && (
            <button type="button" className="btn room-end-btn" onClick={() => void coach.stop()}>
              <StopIcon size={15} /> End Interview
            </button>
          )}
        </div>
      </header>

      {!coach.supported && (
        <div className="coach-note coach-note-warn" role="alert">
          This browser can’t run the live voice coach. It needs microphone access, WebSockets, and
          Web Audio — try the latest Chrome, Edge, or Safari on a device with a mic.
        </div>
      )}

      {/* Practice mode selector — locked while a session is running. */}
      <section className="coach-modes room-focus" aria-label="Practice modes">
        <span className="room-focus-label">Choose your focus</span>
        <div className="coach-modes-row">
          {COACH_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`coach-mode-chip ${coach.modeId === m.id ? 'coach-mode-chip-on' : ''}`}
              onClick={() => coach.setModeId(m.id)}
              disabled={active}
              aria-pressed={coach.modeId === m.id}
              title={active ? 'Stop the session to switch modes' : m.blurb}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="coach-mode-blurb">{mode.blurb}</p>
      </section>

      {/* Main room: orb stage + live context panel */}
      <div className="room-main">
        <div className="room-stage glass-panel">
          <div className="room-stage-tag">
            <span className={`room-live-dot room-live-${coach.state}`} aria-hidden="true" />
            {active ? STATE_LABEL[coach.state] : 'Standing by'}
          </div>

          {/* Big control orb: start when idle, stop when live. */}
          <div className="coach-orb-wrap room-orb-wrap">
            <button
              type="button"
              className="coach-orb-btn"
              onClick={onOrbClick}
              disabled={!coach.supported || coach.state === 'connecting'}
              aria-label={active ? 'Stop the session' : 'Start the session'}
            >
              <AeroVoiceOrb state={coach.state} size={264}>
                {active ? <StopIcon size={34} /> : <MicIcon size={34} />}
              </AeroVoiceOrb>
            </button>
          </div>

          <div className="coach-status room-status" aria-live="polite">
            <span className={`coach-status-label coach-status-${coach.state}`}>
              {STATE_LABEL[coach.state]}
            </span>
            <span className="coach-status-hint">{STATE_HINT[coach.state]}</span>
          </div>

          {/* Live audio waveform — state-driven; distinct motion per state. */}
          <div className="coach-waveform room-waveform">
            <AudioWaveform state={coach.state} height={84} />
          </div>

          <div className="coach-controls room-controls">
            <button type="button" className="btn btn-ghost coach-test-btn" onClick={() => void onTest()}>
              <VolumeIcon size={16} /> Test Voice
            </button>
            {active ? (
              <button type="button" className="btn coach-stop-btn" onClick={() => void coach.stop()}>
                <StopIcon size={16} /> End session
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void coach.start()}
                disabled={!coach.supported}
              >
                <MicIcon size={16} /> Start talking
              </button>
            )}
          </div>

          {coach.error && (
            <div className="coach-note coach-note-error" role="alert">
              {coach.error}
            </div>
          )}
          {testMsg && (
            <div className="coach-note coach-note-info">
              {testMsg}
              <button className="coach-note-x" onClick={() => setTestMsg(null)} aria-label="Dismiss">
                <XIcon size={14} />
              </button>
            </div>
          )}
        </div>
        {/* Side context panel — honest session depth + focus briefing. */}
        <aside className="room-context glass-panel" aria-label="Session details">
          <div className="room-context-block">
            <span className="room-context-h">Session depth</span>
            <div className="room-dots" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className={`room-dot ${i < Math.min(coach.history.filter((t) => t.role === 'you').length, 8) ? 'room-dot-on' : ''}`}
                />
              ))}
            </div>
            <span className="room-context-meta">
              {coach.history.filter((t) => t.role === 'you').length} exchange
              {coach.history.filter((t) => t.role === 'you').length === 1 ? '' : 's'} so far
            </span>
          </div>

          <div className="room-context-block">
            <span className="room-context-h">Focus</span>
            <p className="room-context-p">{mode.blurb}</p>
          </div>

          <div className="room-context-block">
            <span className="room-context-h">Coach opens with</span>
            <p className="room-context-quote">“{mode.opener}”</p>
          </div>

          <ul className="room-tips">
            <li>Speak naturally — you can interrupt any time.</li>
            <li>Your mic and audio stay on this device.</li>
            <li>End the session to get a written report.</li>
          </ul>
        </aside>
      </div>

      {/* End-of-session communication report (measured facts + AI feedback). */}
      {metrics && reportMeta && (
        <SessionReport
          metrics={metrics}
          report={report}
          loading={reportLoading}
          modeLabel={reportMeta.modeLabel}
          durationSec={reportMeta.durationSec}
          onPracticeAgain={coach.supported ? () => void coach.start() : undefined}
          onDismiss={clearReport}
        />
      )}

      {/* Live conversation log (YOU / COACH) */}
      <section className="coach-log glass-panel" aria-label="Conversation transcript" aria-live="polite">
        <div className="coach-log-head">
          <span className="coach-log-title">Live transcript</span>
          {active && (
            <span className="coach-log-live">
              <span className="room-live-dot room-live-listening" aria-hidden="true" /> LIVE
            </span>
          )}
        </div>
        {coach.history.length === 0 && !coach.liveYou && !coach.liveCoach ? (
          <p className="coach-log-empty">
            Your conversation transcript will appear here as you talk. Everything stays in this
            session.
          </p>
        ) : (
          <>
            {coach.history.map((turn) => (
              <div key={turn.id} className={`coach-turn coach-turn-${turn.role}`}>
                <span className="coach-turn-who">{turn.role === 'you' ? 'You' : 'Coach'}</span>
                <span className="coach-turn-text">{turn.text}</span>
              </div>
            ))}
            {coach.liveYou && (
              <div className="coach-turn coach-turn-you coach-turn-live">
                <span className="coach-turn-who">You</span>
                <span className="coach-turn-text">
                  {coach.liveYou}
                  <span className="coach-caret" />
                </span>
              </div>
            )}
            {coach.liveCoach && (
              <div className="coach-turn coach-turn-coach coach-turn-live">
                <span className="coach-turn-who">Coach</span>
                <span className="coach-turn-text">
                  {coach.liveCoach}
                  <span className="coach-caret" />
                </span>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </section>

      {/* Text fallback — always available, sends into the same live session. */}
      <div className="coach-textbar">
        <input
          className="form-input"
          value={draft}
          placeholder={active ? 'Or type a message to the coach…' : 'Start a session to chat by voice or text'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendDraft();
          }}
          disabled={!active || !coach.supported}
          aria-label="Type a message to the coach"
        />
        <button
          type="button"
          className="btn btn-primary coach-send-btn"
          onClick={sendDraft}
          disabled={!active || !draft.trim()}
          aria-label="Send message"
        >
          <SendIcon size={16} />
        </button>
      </div>

      {/* Local progress across recorded sessions (this device only). */}
      <ProgressPanel sessions={progress.sessions} onClear={progress.clearSessions} />

      {isDev && <DebugPanel stats={coach.debug} tokenInfo={null} />}
    </div>
  );
};



