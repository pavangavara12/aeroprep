import React, { useState, useEffect } from 'react';
import type { UserProgress, TechnicalTopic } from '../types';
import {
  CodeIcon,
  CheckCircleIcon,
  BookOpenIcon,
  AwardIcon,
  ChevronRightIcon,
  CheckIcon,
  CopyIcon,
  SearchIcon,
  MindIcon,
  SparklesIcon,
} from './Icons';
import { SectionHero, StatTile, DividerLabel } from './Shared';
import { getJson, postJson } from '../services/apiClient';

interface TechnicalPrepProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onCompleteLesson: (lessonId: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Topics', count: 10 },
  { id: 'c', label: 'C Programming', count: 1 },
  { id: 'python', label: 'Python', count: 1 },
  { id: 'java', label: 'Java', count: 1 },
  { id: 'dsa', label: 'DSA', count: 1 },
  { id: 'dbms', label: 'DBMS', count: 1 },
  { id: 'os', label: 'Operating Systems', count: 1 },
  { id: 'networks', label: 'Computer Networks', count: 1 },
  { id: 'oop', label: 'OOP & System Design', count: 1 },
  { id: 'sql', label: 'SQL & Database', count: 1 },
  { id: 'webdev', label: 'Web Development', count: 1 },
];

export const TechnicalPrep: React.FC<TechnicalPrepProps> = ({
  progress,
  onAddScore,
  onCompleteLesson,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState<TechnicalTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<TechnicalTopic | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopics() {
      setLoading(true);
      try {
        const query = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`;
        const res = await getJson<{ topics: TechnicalTopic[] }>(`/api/tech/topics${query}`);
        if (res?.topics) {
          setTopics(res.topics);
          if (!activeTopic && res.topics.length > 0) {
            setActiveTopic(res.topics[0]);
          }
        }
      } catch {
        // Fallback or offline data handled gracefully
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, [selectedCategory]);

  const filteredTopics = topics.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const isCompleted = (topicId: string) => progress.completedLessons.includes(topicId);

  const handleCompleteTopic = async (topic: TechnicalTopic) => {
    if (isCompleted(topic.id)) return;
    onCompleteLesson(topic.id);
    onAddScore(35);
    try {
      await postJson('/api/tech/complete', { topicId: topic.id });
    } catch {
      // offline handled
    }
  };

  const handleSelectOption = (qIdx: number, optIdx: number, correctIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    setRevealedExplanations((prev) => ({ ...prev, [qIdx]: true }));
    if (optIdx === correctIdx) {
      onAddScore(15);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const completedCount = topics.filter((t) => isCompleted(t.id)).length;
  const overallTechPct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHero
        icon={<CodeIcon size={26} />}
        title="Technical Preparation & Core CS Fundamentals"
        subtitle="Master essential computer science concepts required for technical placement interviews across Tier-1 tech and service enterprises."
      />

      {/* Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatTile
          icon={<BookOpenIcon size={22} />}
          value={`${completedCount} / ${topics.length}`}
          label="Topics Mastered"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
        <StatTile
          icon={<MindIcon size={22} />}
          value={<>{overallTechPct}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>%</span></>}
          label="Syllabus Completion"
          color="var(--accent-violet)"
          tint="rgba(124, 58, 237, 0.1)"
        />
        <StatTile
          icon={<AwardIcon size={22} />}
          value={`${completedCount * 35} XP`}
          label="Technical Prep XP"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`tab-btn ${selectedCategory === cat.id ? 'tab-btn-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '20px' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <SearchIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search topics (e.g. Pointers, ACID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              width: '100%',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Main Grid: Topic Master List on Left, Detailed Concept Viewer on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: '24px' }}>
        {/* Left Column: Topics List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Curated Modules</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filteredTopics.length} topics</span>
          </div>

          {loading ? (
            <div className="panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading technical curriculum...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No topics found matching your query.
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const active = activeTopic?.id === topic.id;
              const done = isCompleted(topic.id);

              return (
                <div
                  key={topic.id}
                  onClick={() => {
                    setActiveTopic(topic);
                    setSelectedAnswers({});
                    setRevealedExplanations({});
                  }}
                  className="card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    border: active ? '1.5px solid var(--accent)' : '1px solid var(--card-border)',
                    background: active ? 'var(--surface-hover)' : 'var(--card-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      {topic.categoryLabel}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: topic.difficulty === 'Easy' ? 'var(--accent-emerald)' : topic.difficulty === 'Hard' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                        }}
                      >
                        {topic.difficulty}
                      </span>
                      {done && <CheckCircleIcon size={16} style={{ color: 'var(--accent-emerald)' }} />}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.98rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    {topic.title}
                  </h4>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {topic.summary}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--card-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>⏳ {topic.readTimeMin} min read</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: active ? 'var(--accent)' : 'inherit' }}>
                      View lesson <ChevronRightIcon size={14} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Deep Explanation & Interactive Questions */}
        <div>
          {activeTopic ? (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-cyan">{activeTopic.categoryLabel}</span>
                    <span className="badge badge-violet">{activeTopic.difficulty}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeTopic.readTimeMin} mins</span>
                  </div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0 }}>{activeTopic.title}</h2>
                </div>

                <button
                  onClick={() => handleCompleteTopic(activeTopic)}
                  className={`btn ${isCompleted(activeTopic.id) ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isCompleted(activeTopic.id) ? (
                    <>
                      <CheckIcon size={16} /> Completed (+35 XP)
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon size={16} /> Mark as Completed
                    </>
                  )}
                </button>
              </div>

              {/* Summary overview */}
              <div style={{ padding: '14px 18px', background: 'var(--bg-primary)', borderRadius: '10px', borderLeft: '4px solid var(--accent)' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {activeTopic.summary}
                </p>
              </div>

              {/* Core takeaways / Key Concepts */}
              <div>
                <DividerLabel>Key Technical Concepts & Interview Takeaways</DividerLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {activeTopic.keyConcepts.map((concept, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <SparklesIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.86rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                        {concept}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              {activeTopic.codeSnippet && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <DividerLabel>Production Code Implementation</DividerLabel>
                    <button
                      onClick={() => handleCopyCode(activeTopic.codeSnippet)}
                      className="icon-btn"
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 8px' }}
                      title="Copy code snippet"
                    >
                      <CopyIcon size={14} />
                      {copiedSnippet ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '16px',
                      borderRadius: '10px',
                      overflowX: 'auto',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      border: '1px solid var(--card-border)',
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <code>{activeTopic.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Practice Questions */}
              {activeTopic.practiceQuestions && activeTopic.practiceQuestions.length > 0 && (
                <div>
                  <DividerLabel>Concept Check MCQs (Instant Feedback)</DividerLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
                    {activeTopic.practiceQuestions.map((q, qIdx) => {
                      const selected = selectedAnswers[qIdx];
                      const isRevealed = revealedExplanations[qIdx];

                      return (
                        <div
                          key={qIdx}
                          style={{
                            padding: '16px',
                            background: 'var(--bg-primary)',
                            borderRadius: '10px',
                            border: '1px solid var(--card-border)',
                          }}
                        >
                          <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '12px' }}>
                            Q{qIdx + 1}. {q.question}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options.map((opt, optIdx) => {
                              const isThisSelected = selected === optIdx;
                              const isCorrectOpt = optIdx === q.correctIndex;
                              let btnBg = 'var(--card-bg)';
                              let borderColor = 'var(--card-border)';

                              if (isRevealed) {
                                if (isCorrectOpt) {
                                  btnBg = 'rgba(5, 150, 105, 0.12)';
                                  borderColor = 'var(--accent-emerald)';
                                } else if (isThisSelected && !isCorrectOpt) {
                                  btnBg = 'rgba(225, 29, 72, 0.12)';
                                  borderColor = 'var(--accent-rose)';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleSelectOption(qIdx, optIdx, q.correctIndex)}
                                  disabled={isRevealed}
                                  style={{
                                    textAlign: 'left',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: `1px solid ${borderColor}`,
                                    background: btnBg,
                                    cursor: isRevealed ? 'default' : 'pointer',
                                    fontSize: '0.86rem',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.12s ease',
                                  }}
                                >
                                  <span>{opt}</span>
                                  {isRevealed && isCorrectOpt && <CheckIcon size={16} style={{ color: 'var(--accent-emerald)' }} />}
                                </button>
                              );
                            })}
                          </div>

                          {isRevealed && (
                            <div
                              style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                background: selected === q.correctIndex ? 'rgba(5, 150, 105, 0.08)' : 'rgba(225, 29, 72, 0.08)',
                                borderRadius: '8px',
                                fontSize: '0.83rem',
                                lineHeight: 1.5,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <strong>{selected === q.correctIndex ? '✅ Correct! ' : '❌ Incorrect. '}</strong>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a technical module on the left to start learning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
