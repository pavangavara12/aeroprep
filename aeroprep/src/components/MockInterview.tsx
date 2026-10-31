import React, { useState } from 'react';
import type { UserProgress, StarResponse, ChatMessage } from '../types';
import { BriefcaseIcon, CheckIcon, TrashIcon, SendIcon, SaveIcon, EditIcon, SpeechIcon, CheckCircleIcon, MicIcon } from './Icons';
import { SectionHero, SideNav, ProgressRing } from './Shared';
import type { SideNavItem } from './Shared';
import { SkillIllustration } from './graphics/SkillIllustration';
import { Achievement } from './graphics/Achievement';
import { BotAvatar } from './graphics/BotAvatar';
import { AIInterviewer } from './voice/AIInterviewer';

interface MockInterviewProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onSaveStarResponse: (key: string, response: StarResponse) => void;
  onDeleteStarResponse: (key: string) => void;
}

export const MockInterview: React.FC<MockInterviewProps> = ({ progress, onAddScore, onSaveStarResponse, onDeleteStarResponse }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'star' | 'chat' | 'checklist'>('ai');
  const [showStarAchievement, setShowStarAchievement] = useState(false);

  // STAR METHOD STATE
  const [starPrompt, setStarPrompt] = useState("Handling a Team Conflict");
  const [situation, setSituation] = useState("");
  const [task, setTask] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");

  const starPrompts = [
    "Handling a Team Conflict",
    "Overcoming a Technical Blocker",
    "Delivering Under Tight Deadlines",
    "Responding to a Failed Deployment",
    "Advocating for a Refactoring Project"
  ];

  const handleSaveStar = () => {
    if (!situation.trim() || !task.trim() || !action.trim() || !result.trim()) {
      alert("Please fill out all STAR segments before saving!");
      return;
    }

    const savedItem: StarResponse = {
      situation: situation.trim(),
      task: task.trim(),
      action: action.trim(),
      result: result.trim(),
      savedAt: new Date().toLocaleDateString()
    };

    onSaveStarResponse(starPrompt, savedItem);
    onAddScore(40); // +40 XP

    // Reset
    setSituation("");
    setTask("");
    setAction("");
    setResult("");
    setShowStarAchievement(true);
  };

  // CHAT INTERVIEW STATE
  const [interviewRole, setInterviewRole] = useState<'HR' | 'Tech' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);

  const hrQuestions = [
    "Tell me about yourself and why you're interested in joining our company.",
    "Describe a time when you had to coordinate with a cross-functional teammate who held a completely different opinion than yours. How did you align?",
    "Tell me about a project that failed or missed its key milestones. What did you learn and how did you communicate that to stakeholders?",
    "Where do you see yourself professionally in three years, and how does this role fit into that trajectory?",
    "Great. That wraps up my questions. Do you have any questions for me?"
  ];

  const techQuestions = [
    "Can you explain your experience with React rendering optimization and when you would choose to use useMemo or useCallback?",
    "How do you approach managing global state in a large TypeScript application, and what are the security implications of storing user JWTs client-side?",
    "Describe how you would design and test a payment verification system to ensure it handles race conditions or network dropouts securely.",
    "If a production database query slows down by 10x, what is your systematic debugging protocol to diagnose the bottleneck?",
    "Excellent. That completes the technical evaluation. Do you have any architectural questions for us?"
  ];

  const handleStartInterview = (role: 'HR' | 'Tech') => {
    setInterviewRole(role);
    setCurrentQuestionIdx(0);
    setIsInterviewFinished(false);
    
    const initialQuestion = role === 'HR' ? hrQuestions[0] : techQuestions[0];
    setChatMessages([
      {
        id: "chat-bot-init",
        sender: 'interviewer',
        text: `Hello! Thanks for meeting with me today. I will be conducting your ${role === 'HR' ? 'HR Behavioral' : 'Technical Frontend'} round. Let's start with the first question:\n\n"${initialQuestion}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !interviewRole) return;

    const userMsg: ChatMessage = {
      id: `chat-user-${Date.now()}`,
      sender: 'candidate',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    // Simulate thinking and answer transition
    setTimeout(() => {
      const questions = interviewRole === 'HR' ? hrQuestions : techQuestions;
      const nextIdx = currentQuestionIdx + 1;

      if (nextIdx < questions.length) {
        setCurrentQuestionIdx(nextIdx);
        setChatMessages(prev => [...prev, {
          id: `chat-bot-${Date.now()}`,
          sender: 'interviewer',
          text: questions[nextIdx],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setIsInterviewFinished(true);
        onAddScore(100); // +100 XP for completing a mock round
      }
    }, 1000);
  };

  const getInterviewFeedback = () => {
    if (interviewRole === 'HR') {
      return {
        score: 88,
        positives: [
          "Strong situational structure: clear Situation and Results shared.",
          "Portrayed healthy collaboration and empathy when dealing with peer disputes.",
          "Authentic alignment of personal goals with our job profile."
        ],
        improvements: [
          "Try incorporating more concrete metrics in your results (e.g., 'saved 5 hours per week' instead of 'saved time').",
          "Ensure your self-introduction is limited to 90 seconds to hold engagement."
        ]
      };
    } else {
      return {
        score: 84,
        positives: [
          "Good understanding of useMemo/useCallback performance boundaries.",
          "Identified security issues with JWT client-storage correctly.",
          "Structured database query debugging steps logically (Index auditing -> Explain plans -> Cache)."
        ],
        improvements: [
          "Add details about database transaction locking when discussing double payment race conditions.",
          "Focus on architectural modularity when outlining state structures."
        ]
      };
    }
  };

  const handleResetChat = () => {
    setInterviewRole(null);
    setChatMessages([]);
    setIsInterviewFinished(false);
  };

  // CHECKLIST STATE
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'check-1': false,
    'check-2': false,
    'check-3': false,
    'check-4': false,
    'check-5': false,
    'check-6': false,
  });

  const toggleChecklist = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
    onAddScore(5); // Small reward for ticking off preparation tasks
  };

  const checklistTotal = Object.keys(checklist).length;
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const savedCount = Object.keys(progress.savedStarResponses).length;

  const navItems: SideNavItem[] = [
    { id: 'ai', label: 'AI Interviewer (Voice)', icon: <MicIcon size={18} /> },
    { id: 'star', label: 'STAR Story Builder', icon: <EditIcon size={18} />, count: savedCount },
    { id: 'chat', label: 'Chat Interviewer', icon: <SpeechIcon size={18} /> },
    { id: 'checklist', label: 'Readiness Checklist', icon: <CheckCircleIcon size={18} />, count: `${checklistDone}/${checklistTotal}` },
  ];

  const heroByTab: Record<string, { title: string; subtitle: string; color: string; tint: string }> = {
    ai: { title: 'AI Voice Interviewer', subtitle: 'Sit a realistic spoken interview with Aero — dynamic follow-ups from your answers, live delivery metrics, and an honest scorecard.', color: 'var(--accent)', tint: 'rgba(99,102,241,0.14)' },
    star: { title: 'STAR Story Builder', subtitle: 'Scaffold behavioral answers into Situation, Task, Action and Result — then save them to your library.', color: 'var(--accent-cyan)', tint: 'rgba(37,99,235,0.12)' },
    chat: { title: 'Simulated Chat Interviewer', subtitle: 'Hold a live text interview with a simulated HR or technical lead and get a scorecard.', color: 'var(--accent-violet)', tint: 'rgba(124,58,237,0.12)' },
    checklist: { title: 'Interview Readiness Checklist', subtitle: 'Tick off your preparation milestones before the big day.', color: 'var(--accent-emerald)', tint: 'rgba(5,150,105,0.12)' },
  };

  const currentHero = heroByTab[activeTab];

  return (
    <div className="animate-slide-up">
      <Achievement
        show={showStarAchievement}
        title="Story saved!"
        message="STAR response drafted · +40 XP"
        icon={<CheckCircleIcon size={30} />}
        onDone={() => setShowStarAchievement(false)}
      />
      <SectionHero
        icon={<BriefcaseIcon size={26} />}
        title={currentHero.title}
        subtitle={currentHero.subtitle}
        color={currentHero.color}
        tint={currentHero.tint}
        right={
          <span className="hero-skill-ill hero-skill-ill-solo" style={{ color: currentHero.color }}>
            <SkillIllustration kind="mock" size={84} />
          </span>
        }
      />

      <div className="section-shell">
        <SideNav items={navItems} active={activeTab} onSelect={(id) => setActiveTab(id as typeof activeTab)} />

        <div className="panel-swap" key={activeTab}>

      {/* AI VOICE INTERVIEWER */}
      {activeTab === 'ai' && <AIInterviewer onAddScore={onAddScore} />}

      {/* STAR STORY BUILDER */}
      {activeTab === 'star' && (
        <div className="grid-dashboard">
          
          {/* Form */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Response Scaffolder</span>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Draft a Story</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                The STAR method organizes behavioral questions into a cohesive story. Select a focus and fill out each stage below.
              </p>
            </div>

            {/* Prompt Selector */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Interview prompt:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {starPrompts.map(p => (
                  <button
                    key={p}
                    onClick={() => setStarPrompt(p)}
                    className={`btn btn-secondary ${starPrompt === p ? 'btn-primary' : ''}`}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* STAR blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-cyan)' }}>S - Situation (Setting the scene):</label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="e.g., During my last role at WebCorp, our client database module frequently locked up during high-traffic checkout cycles..."
                  className="form-input form-textarea"
                  style={{ minHeight: '60px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-violet)' }}>T - Task (Identify the specific objective):</label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g., I was tasked with diagnosing the connection pool timeout rates and restructuring the lock acquisition schedule..."
                  className="form-input form-textarea"
                  style={{ minHeight: '60px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-blue)' }}>A - Action (Describe what you did):</label>
                <textarea
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="e.g., I initiated database profiling scripts, rewrote nested query blocks to prevent execution escalations, and established a cache layer..."
                  className="form-input form-textarea"
                  style={{ minHeight: '60px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--accent-emerald)' }}>R - Result (The positive business outcome):</label>
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g., Database lock rate fell by 80%, average checkout latency dropped from 4s to 0.4s, and client checkout errors fell to zero..."
                  className="form-input form-textarea"
                  style={{ minHeight: '60px' }}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSaveStar} style={{ alignSelf: 'flex-start' }}>
              <SaveIcon size={18} />
              Save Response to Library
            </button>
          </div>

          {/* Saved Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '1.1rem' }}>Your Response Library</h4>
              
              {Object.keys(progress.savedStarResponses).length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No STAR responses saved yet. Draft your first story to populate your interview library.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                  {Object.entries(progress.savedStarResponses).map(([key, item]) => (
                    <div key={key} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>{key}</span>
                        <button
                          onClick={() => onDeleteStarResponse(key)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                        <p><strong>S:</strong> {item.situation}</p>
                        <p><strong>T:</strong> {item.task}</p>
                        <p><strong>A:</strong> {item.action}</p>
                        <p><strong>R:</strong> {item.result}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Saved: {item.savedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* INTERACTIVE MOCK CHAT */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {interviewRole === null ? (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <span className="badge badge-violet">Live Chat Simulator</span>
              <h3 style={{ fontSize: '1.5rem' }}>Select Interview Session</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.95rem' }}>
                Engage in a text dialogue simulating a standard tech recruitment pipeline. The interviewer will present questions, accept your answers, and display a technical score report upon completion.
              </p>

              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <button className="btn btn-primary" onClick={() => handleStartInterview('HR')}>
                  HR Behavioral Round
                </button>
                <button className="btn btn-accent" onClick={() => handleStartInterview('Tech')}>
                  Technical Frontend Round
                </button>
              </div>
            </div>
          ) : (
            <div className="grid-dashboard">
              
              {/* Chat board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="chat-container">
                  <div className="chat-messages">
                    {(() => {
                      const lastBotMsgId = [...chatMessages].reverse().find((m) => m.sender === 'interviewer')?.id;
                      return chatMessages.map((msg) => {
                        const isBot = msg.sender === 'interviewer';
                        const botState =
                          isBot && msg.id === lastBotMsgId && !isInterviewFinished ? 'speaking' : 'idle';
                        return (
                          <div key={msg.id} className={`chat-message ${isBot ? 'chat-message-bot' : 'chat-message-user'}`}>
                            <span
                              className="message-sender"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                            >
                              {isBot && <BotAvatar type="nova" state={botState} size={26} />}
                              {isBot ? 'Interviewer (Aero)' : 'You (Candidate)'}
                            </span>
                            <div className="message-content">
                              {msg.text.split('\n').map((para, pidx) => (
                                <p key={pidx} style={{ marginBottom: pidx < msg.text.split('\n').length - 1 ? '8px' : 0 }}>{para}</p>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {!isInterviewFinished ? (
                    <div className="chat-input-bar">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        placeholder="Type your response here..."
                        className="form-input"
                        style={{ flexGrow: 1 }}
                      />
                      <button className="btn btn-primary" onClick={handleSendChatMessage} style={{ padding: '12px' }}>
                        <SendIcon size={18} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: 'rgba(5, 150, 105, 0.1)', borderTop: '1px solid var(--accent-emerald)', textAlign: 'center' }}>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Session Complete! Scorecard unlocked.</span>
                    </div>
                  )}
                </div>

                {isInterviewFinished && (
                  <button className="btn btn-secondary" onClick={handleResetChat} style={{ alignSelf: 'flex-start' }}>
                    Reset & Try Another Round
                  </button>
                )}
              </div>

              {/* Scorecard Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {isInterviewFinished ? (
                  <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <span className="badge badge-emerald">Performance Scorecard</span>
                      <ProgressRing
                        percentage={getInterviewFeedback().score}
                        size={120}
                        stroke={9}
                        color={getInterviewFeedback().score >= 60 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}
                        label={`${getInterviewFeedback().score}`}
                        sublabel="/ 100"
                      />
                    </div>

                    <div>
                      <h5 style={{ color: 'var(--accent-emerald)', marginBottom: '8px', fontSize: '0.9rem' }}>✓ Key Strengths</h5>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {getInterviewFeedback().positives.map((p, idx) => <li key={idx}>{p}</li>)}
                      </ul>
                    </div>

                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                      <h5 style={{ color: 'var(--accent-amber)', marginBottom: '8px', fontSize: '0.9rem' }}>⚠ Areas for Improvement</h5>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {getInterviewFeedback().improvements.map((imp, idx) => <li key={idx}>{imp}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <BotAvatar type="nova" state="listening" size={72} />
                    <h4 style={{ fontSize: '1.1rem' }}>Aero is listening</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Complete answering all sequential questions from the interviewer to release your score feedback dashboard.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* INTERVIEW CHECKLISTS */}
      {activeTab === 'checklist' && (() => {
        const checklistItems: { id: string; text: string }[] = [
          { id: 'check-1', text: "Research the company's product lines, core mission statement, and latest engineering/finance news." },
          { id: 'check-2', text: 'Draft at least 3 STAR response outlines for behavioral prompts in your Response Library.' },
          { id: 'check-3', text: 'Verify interview configuration: high-speed network check, professional camera placement, quiet room.' },
          { id: 'check-4', text: 'Review core algorithms, data structure runtimes, and system architecture structures.' },
          { id: 'check-5', text: 'Draft 3 high-impact architectural questions to ask your interviewers during the wrap-up section.' },
          { id: 'check-6', text: 'Prepare your professional wardrobe and print backup copies of your resume and portfolio.' },
        ];
        const pct = Math.round((checklistDone / checklistTotal) * 100);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Progress summary */}
            <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <ProgressRing percentage={pct} size={92} stroke={7} color="var(--accent-emerald)" sublabel="ready" />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Readiness Roadmap</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {checklistDone} of {checklistTotal} milestones complete. Each tick awards +5 XP.
                </p>
              </div>
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {checklistItems.map(item => {
                const done = checklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: done ? 'rgba(5, 150, 105, 0.06)' : 'var(--bg-secondary)', border: `1px solid ${done ? 'rgba(5, 150, 105, 0.25)' : 'var(--card-border)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${done ? 'var(--accent-emerald)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--accent-emerald)' : 'transparent', color: '#fff', flexShrink: 0 }}>
                      {done && <CheckIcon size={13} />}
                    </div>
                    <span style={{ fontSize: '0.9rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

        </div>
      </div>
    </div>
  );
};
