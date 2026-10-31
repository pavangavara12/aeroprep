import React, { useState, useEffect } from 'react';
import type { UserProgress, CodingProblem, CodingSubmission } from '../types';
import {
  CodeIcon,
  PlayIcon,
  CheckCircleIcon,
  RefreshIcon,
  TerminalIcon,
  AwardIcon,
  SearchIcon,
} from './Icons';
import { SectionHero, StatTile } from './Shared';
import { getJson, postJson } from '../services/apiClient';

interface CodingPracticeProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onCompleteProblem?: (problemId: string) => void;
}

type SupportedLanguage = 'python' | 'java' | 'cpp' | 'c';

export const CodingPractice: React.FC<CodingPracticeProps> = ({ progress, onAddScore }) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [activeProblem, setActiveProblem] = useState<CodingProblem | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>('');
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'testcases' | 'output' | 'submissions'>('testcases');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);
  const [customInput] = useState<string>('');
  const [runResult, setRunResult] = useState<{ status: string; output: string; runtimeMs?: number; memoryKb?: number; error?: string } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch problems from server
  useEffect(() => {
    async function fetchProblems() {
      try {
        const res = await getJson<{ problems: CodingProblem[] }>('/api/coding/problems');
        if (res?.problems && res.problems.length > 0) {
          setProblems(res.problems);
          setActiveProblem(res.problems[0]);
          setCode(res.problems[0].starterCode.python);
        }
      } catch {
        // Fallback
      }
    }
    fetchProblems();
  }, []);

  // Update starter code when problem or language changes
  useEffect(() => {
    if (activeProblem && activeProblem.starterCode) {
      setCode(activeProblem.starterCode[selectedLanguage] || '');
      setRunResult(null);
    }
  }, [activeProblem, selectedLanguage]);

  // Load submissions for active problem
  useEffect(() => {
    async function fetchSubmissions() {
      if (!activeProblem) return;
      try {
        const res = await getJson<{ submissions: CodingSubmission[] }>(
          `/api/coding/submissions?problemId=${activeProblem.id}`
        );
        if (res?.submissions) setSubmissions(res.submissions);
      } catch {
        // Offline
      }
    }
    fetchSubmissions();
  }, [activeProblem]);

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setIsRunning(true);
    setActiveBottomTab('output');
    try {
      const res = await postJson<{ result: { status: string; passedCount: number; totalCount: number; runtimeMs: number; memoryKb: number; error?: string }; output: string }>(
        '/api/coding/run',
        {
          problemId: activeProblem.id,
          language: selectedLanguage,
          code,
          customInput,
        }
      );
      if (res) {
        setRunResult({
          status: res.result.status,
          output: res.output,
          runtimeMs: res.result.runtimeMs,
          memoryKb: res.result.memoryKb,
          error: res.result.error,
        });
      }
    } catch (err: unknown) {
      setRunResult({
        status: 'Error',
        output: (err as Error)?.message || 'Failed to execute test cases.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmission = async () => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    setActiveBottomTab('output');
    try {
      const res = await postJson<{
        submission: CodingSubmission;
        evaluation: { status: string; passedCount: number; totalCount: number; runtimeMs: number; memoryKb: number; error?: string };
      }>('/api/coding/submit', {
        problemId: activeProblem.id,
        language: selectedLanguage,
        code,
      });

      if (res?.evaluation) {
        setRunResult({
          status: res.evaluation.status,
          output: res.evaluation.status === 'Accepted'
            ? `All ${res.evaluation.passedCount}/${res.evaluation.totalCount} Test Cases Passed! 🎉 (+50 XP)`
            : res.evaluation.error || 'Some test cases failed.',
          runtimeMs: res.evaluation.runtimeMs,
          memoryKb: res.evaluation.memoryKb,
        });

        if (res.evaluation.status === 'Accepted') {
          onAddScore(50);
        }

        if (res.submission) {
          setSubmissions((prev) => [res.submission, ...prev]);
        }
      }
    } catch (err: unknown) {
      setRunResult({
        status: 'Error',
        output: (err as Error)?.message || 'Submission error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    const matchesDiff = filterDifficulty === 'All' || p.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
    const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiff && matchesQuery;
  });

  const solvedProblemsCount = progress.completedLessons.filter((l) => l.startsWith('sub_') || l === 'two-sum').length;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionHero
        icon={<CodeIcon size={26} />}
        title="Coding Practice & Algorithmic Sandbox"
        subtitle="Solve real placement coding questions in Python, Java, C++, and C with sandbox test validation and runtime profiling."
      />

      {/* Snapshot Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatTile
          icon={<CheckCircleIcon size={22} />}
          value={`${problems.length} Problems`}
          label="Catalog Available"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
        <StatTile
          icon={<AwardIcon size={22} />}
          value={`${Math.max(solvedProblemsCount, submissions.filter((s) => s.status === 'Accepted').length)} Solved`}
          label="Your Solutions Solved"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
        <StatTile
          icon={<TerminalIcon size={22} />}
          value="Sandbox Multi-Lang"
          label="Execution Environment"
          color="var(--accent-violet)"
          tint="rgba(124, 58, 237, 0.1)"
        />
      </div>

      {/* Main Split Layout: Left problem statement & picker, Right Code Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.1fr) minmax(420px, 1.9fr)', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Problem Selector + Problem Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Problem List Selector */}
          <div className="panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Select Challenge</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setFilterDifficulty(diff)}
                    className={`tab-btn ${filterDifficulty === diff ? 'tab-btn-active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px' }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <SearchIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredProblems.map((prob) => {
                const isSelected = activeProblem?.id === prob.id;
                return (
                  <button
                    key={prob.id}
                    onClick={() => setActiveProblem(prob)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      background: isSelected ? 'var(--surface-hover)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{prob.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{prob.category}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: prob.difficulty === 'Easy' ? 'var(--accent-emerald)' : prob.difficulty === 'Hard' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                      }}
                    >
                      {prob.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Problem Detailed Statement */}
          {activeProblem && (
            <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.75rem',
                      background: activeProblem.difficulty === 'Easy' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                      color: activeProblem.difficulty === 'Easy' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                    }}
                  >
                    {activeProblem.difficulty}
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{activeProblem.category}</span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{activeProblem.title}</h2>
              </div>

              <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {activeProblem.description}
              </div>

              {/* Examples */}
              {activeProblem.examples.map((ex, idx) => (
                <div key={idx} style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Example {idx + 1}:
                  </div>
                  <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    <div><strong>Input:</strong> {ex.input}</div>
                    <div><strong>Output:</strong> {ex.output}</div>
                    {ex.explanation && <div><strong>Explanation:</strong> {ex.explanation}</div>}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              {activeProblem.constraints && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Constraints:</div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                    {activeProblem.constraints}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Code Editor & Execution Panel */}
        <div className="panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor Header Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <option value="python">Python 3</option>
                <option value="java">Java (OpenJDK 17)</option>
                <option value="cpp">C++ (g++ 11)</option>
                <option value="c">C (gcc)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  if (activeProblem) setCode(activeProblem.starterCode[selectedLanguage] || '');
                }}
                className="icon-btn"
                title="Reset to template"
                style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshIcon size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Interactive Code Textarea with Line Numbers effect */}
          <div style={{ position: 'relative', height: '380px', background: '#1e1e2e' }}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  setCode(code.substring(0, start) + '    ' + code.substring(end));
                  setTimeout(() => {
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                  }, 0);
                }
              }}
              spellCheck={false}
              style={{
                width: '100%',
                height: '100%',
                padding: '16px',
                fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                background: 'transparent',
                color: '#cdd6f4',
                border: 'none',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Editor Action Controls */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--card-bg)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveBottomTab('testcases')}
                className={`tab-btn ${activeBottomTab === 'testcases' ? 'tab-btn-active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Test Cases
              </button>
              <button
                onClick={() => setActiveBottomTab('output')}
                className={`tab-btn ${activeBottomTab === 'output' ? 'tab-btn-active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Output Console
              </button>
              <button
                onClick={() => setActiveBottomTab('submissions')}
                className={`tab-btn ${activeBottomTab === 'submissions' ? 'tab-btn-active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Submissions ({submissions.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlayIcon size={14} /> {isRunning ? 'Running...' : 'Run Code'}
              </button>
              <button
                onClick={handleSubmission}
                disabled={isRunning || isSubmitting}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '7px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircleIcon size={15} /> {isSubmitting ? 'Evaluating...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Bottom Tabs Content: Test cases / Output / Submissions */}
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--card-border)', minHeight: '160px' }}>
            {activeBottomTab === 'testcases' && activeProblem && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {activeProblem.testCases.map((tc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTestCaseIndex(idx)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border)',
                        background: selectedTestCaseIndex === idx ? 'var(--card-bg)' : 'transparent',
                        fontWeight: selectedTestCaseIndex === idx ? 600 : 400,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Case {idx + 1} {tc.isHidden ? '(Hidden)' : ''}
                    </button>
                  ))}
                </div>

                <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Input:</div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {activeProblem.testCases[selectedTestCaseIndex]?.input}
                  </pre>
                  {!activeProblem.testCases[selectedTestCaseIndex]?.isHidden && (
                    <>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '4px' }}>Expected Output:</div>
                      <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {activeProblem.testCases[selectedTestCaseIndex]?.expectedOutput}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeBottomTab === 'output' && (
              <div>
                {runResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: runResult.status === 'Accepted' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(225, 29, 72, 0.15)',
                          color: runResult.status === 'Accepted' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        }}
                      >
                        {runResult.status}
                      </span>
                      {runResult.runtimeMs !== undefined && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ⏱️ Runtime: {runResult.runtimeMs} ms
                        </span>
                      )}
                      {runResult.memoryKb !== undefined && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          💾 Memory: {(runResult.memoryKb / 1024).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '12px',
                        background: 'var(--card-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: runResult.status === 'Accepted' ? 'var(--accent-emerald)' : 'var(--text-primary)',
                      }}
                    >
                      {runResult.output}
                    </pre>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                    Click "Run Code" or "Submit" to view execution results.
                  </div>
                )}
              </div>
            )}

            {activeBottomTab === 'submissions' && (
              <div>
                {submissions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                    No submissions recorded yet for this challenge.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: sub.status === 'Accepted' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            }}
                          >
                            {sub.status}
                          </span>
                          <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>{sub.language}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{sub.passedCount}/{sub.totalCount} tests</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                          <span>{sub.runtimeMs} ms</span>
                          <span>{new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
