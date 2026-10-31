import React, { useState, useEffect } from 'react';
import type { UserProgress, AuthUser } from '../types';
import {
  AwardIcon,
  FlameIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckCircleIcon,
  MindIcon,
  BriefcaseIcon,
  RocketIcon,
  CodeIcon,
  FileTextIcon,
  CompassIcon,
} from './Icons';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { ProgressRing, StatTile, MiniBarChart, DividerLabel } from './Shared';
import { FlightPath } from './graphics/FlightPath';
import { JourneyMap } from './graphics/JourneyMap';
import type { JourneyStep } from './graphics/JourneyMap';
import { Achievement } from './graphics/Achievement';
import { getJson } from '../services/apiClient';

interface DashboardProps {
  progress: UserProgress;
  user?: AuthUser | null;
  onNavigate: (tab: string) => void;
  onAddScore: (score: number) => void;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  xpEarned: number;
  timestamp: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ progress, user, onNavigate, onAddScore }) => {
  const [dailyAnswered, setDailyAnswered] = useState(false);
  const [selectedDailyOption, setSelectedDailyOption] = useState<number | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const statsRef = useScrollReveal<HTMLDivElement>({ start: 'top 95%' });
  const tracksRef = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await getJson<{ activities: ActivityItem[] }>('/api/progress');
        if (res?.activities) setActivities(res.activities);
      } catch {
        // Fallback
      }
    }
    fetchActivities();
  }, []);

  // Daily challenge data
  const dailyChallenge = {
    question: "During a technical interview, you realize you made a major mistake in a coding solution you explained 5 minutes ago. What is the best course of action?",
    options: [
      "Ignore it and hope the interviewer doesn't notice.",
      "Politely interrupt your current explanation, point out the error, explain why it happened, and present the corrected logic.",
      "Wait until the end of the interview to send a follow-up email with the fix.",
      "Argue that the error is actually a valid alternative approach."
    ],
    correctIndex: 1,
    explanation: "Acknowledging mistakes proactively shows integrity, strong communication skills, and emotional intelligence. Interviewers respect candidates who can audit and correct their own work under pressure."
  };

  const handleDailySubmit = (index: number) => {
    if (dailyAnswered) return;
    setSelectedDailyOption(index);
    setDailyAnswered(true);
    if (index === dailyChallenge.correctIndex) {
      onAddScore(25);
      setShowAchievement(true);
    }
  };

  // Helper to calculate progress percentage across modules
  const getProgressPercent = (track: 'tech' | 'code' | 'apt' | 'mock' | 'resume' | 'tracker') => {
    let completed = 0;
    let total = 4;
    if (track === 'tech') {
      completed = progress.completedLessons.filter(l => l.startsWith('c-') || l.startsWith('python-') || l.startsWith('java-') || l.startsWith('dsa-') || l.startsWith('dbms-') || l.startsWith('os-')).length;
      total = 6;
    } else if (track === 'code') {
      completed = progress.completedLessons.filter(l => l.startsWith('sub_') || l === 'two-sum').length + 1;
      total = 5;
    } else if (track === 'apt') {
      completed = progress.completedLessons.filter(l => l.startsWith('apt-')).length + 1;
      total = 4;
    } else if (track === 'mock') {
      completed = progress.completedLessons.filter(l => l.startsWith('mock-')).length + 1;
      total = 3;
    } else if (track === 'resume') {
      completed = 1;
      total = 1;
    } else if (track === 'tracker') {
      completed = 3;
      total = 4;
    }
    return Math.min(100, Math.round((completed / total) * 100));
  };

  const tracks = [
    {
      id: 'technical',
      badge: 'Technical Prep',
      badgeClass: 'badge-cyan',
      color: 'var(--accent-cyan)',
      tint: 'rgba(37, 99, 235, 0.1)',
      icon: <CodeIcon size={20} />,
      title: 'Core Computer Science Curriculum',
      desc: 'C, Python, Java, DSA, DBMS ACID, OS Scheduling, Networks & System Design.',
      pct: getProgressPercent('tech'),
    },
    {
      id: 'coding',
      badge: 'Coding Practice',
      badgeClass: 'badge-indigo',
      color: 'var(--accent-blue)',
      tint: 'rgba(67, 56, 202, 0.1)',
      icon: <PlayIcon size={20} />,
      title: 'Algorithmic Problem Sandbox',
      desc: 'Multi-language code execution across Arrays, DP, Trees, and Two-Pointers.',
      pct: getProgressPercent('code'),
    },
    {
      id: 'aptitude',
      badge: 'Aptitude Prep',
      badgeClass: 'badge-amber',
      color: 'var(--accent-warm)',
      tint: 'rgba(226, 98, 42, 0.1)',
      icon: <MindIcon size={20} />,
      title: 'Quantitative & Logical Ability',
      desc: 'Master arithmetic ratios, work & time, and full timed placement mock test simulations.',
      pct: getProgressPercent('apt'),
    },
    {
      id: 'mock',
      badge: 'AI Mock Interview',
      badgeClass: 'badge-emerald',
      color: 'var(--accent-emerald)',
      tint: 'rgba(5, 150, 105, 0.1)',
      icon: <BriefcaseIcon size={20} />,
      title: 'STAR Responses & AI Interviewer',
      desc: 'Real-time speech & text mock interviews with rubric evaluations and model answers.',
      pct: getProgressPercent('mock'),
    },
    {
      id: 'resume',
      badge: 'Resume Analyser',
      badgeClass: 'badge-violet',
      color: 'var(--accent-violet)',
      tint: 'rgba(124, 58, 237, 0.1)',
      icon: <FileTextIcon size={20} />,
      title: 'ATS Audit & Skill Matching',
      desc: 'Upload PDF resumes to extract keywords, calculate score breakdowns, and fix gaps.',
      pct: 82,
    },
    {
      id: 'placement',
      badge: 'Placement Tracker',
      badgeClass: 'badge-rose',
      color: '#e11d48',
      tint: 'rgba(225, 29, 72, 0.1)',
      icon: <CompassIcon size={20} />,
      title: 'Company Recruitment Matrix',
      desc: 'Track target company rounds, weekly problem targets, and placement readiness.',
      pct: 78,
    },
  ];

  const overallReadiness = Math.round(tracks.reduce((sum, t) => sum + t.pct, 0) / tracks.length);
  const modulesDone = progress.completedLessons.length;

  const journeySteps: JourneyStep[] = [
    { label: 'Foundation', caption: 'CS Core Topics', icon: <CodeIcon size={20} />, status: 'done' },
    { label: 'Coding Lab', caption: 'Problem Solving', icon: <PlayIcon size={20} />, status: 'done' },
    { label: 'Aptitude', caption: 'Timed Drills', icon: <MindIcon size={20} />, status: 'current' },
    { label: 'Interviews', caption: 'Mock Simulations', icon: <BriefcaseIcon size={20} />, status: 'todo' },
    { label: 'Placement', caption: 'Target Offer', icon: <RocketIcon size={20} />, status: 'todo' },
  ];

  const chartData = tracks.slice(0, 5).map((t) => ({
    label: t.badge.split(' ')[0],
    value: t.pct,
    color: t.color,
  }));

  const studentName = user?.name ? user.name.split(' ')[0] : 'Engineer';
  const targetJob = user?.targetRole || 'Software Development Engineer';

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <Achievement
        show={showAchievement}
        title="Great job!"
        message="Daily placement challenge solved · +25 XP"
        icon={<AwardIcon size={30} />}
        onDone={() => setShowAchievement(false)}
      />

      {/* Hero Banner */}
      <div className="section-hero dashboard-hero" style={{ '--hero-wash': 'var(--accent-soft)' } as React.CSSProperties}>
        <FlightPath className="dashboard-hero-path" />
        <div className="section-hero-inner">
          <div className="section-hero-icon" style={{ fontSize: '1.6rem' }}>
            {user?.avatar || '🚀'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.85rem', marginBottom: '6px' }}>
              Welcome back, <span className="gradient-text-cyan-violet">{studentName}</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '640px' }}>
              Preparing for <strong>{targetJob}</strong>. Practice core CS concepts, algorithmic sandboxes, aptitude tests, and AI mock interviews.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('coding')}>
              <CodeIcon size={16} /> Coding Sandbox
            </button>
            <button className="btn btn-primary" onClick={() => onNavigate('mock')}>
              <PlayIcon size={16} /> Start Mock Interview
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="reveal-item">
          <StatTile
            icon={<AwardIcon size={22} />}
            value={<>{progress.totalScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>XP</span></>}
            label="Cumulative Score"
            color="var(--accent)"
            tint="var(--accent-soft)"
          />
        </div>
        <div className="reveal-item">
          <StatTile
            icon={<FlameIcon size={22} />}
            value={<>{progress.streak} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Days</span></>}
            label="Practice Streak"
            color="var(--accent-warm)"
            tint="var(--accent-warm-soft)"
          />
        </div>
        <div className="reveal-item">
          <StatTile
            icon={<CheckCircleIcon size={22} />}
            value={`${modulesDone} Lessons`}
            label="Curriculum Completed"
            color="var(--accent-emerald)"
            tint="rgba(5, 150, 105, 0.12)"
          />
        </div>
        <div className="reveal-item">
          <StatTile
            icon={<MindIcon size={22} />}
            value={<>{overallReadiness}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>%</span></>}
            label="Placement Readiness"
            color="var(--accent-violet)"
            tint="rgba(124, 58, 237, 0.12)"
          />
        </div>
      </div>

      {/* Your Preparation Journey */}
      <div className="panel dashboard-journey">
        <DividerLabel>Your Placement Preparation Pathway</DividerLabel>
        <JourneyMap steps={journeySteps} />
      </div>

      {/* Readiness Overview & Performance Chart */}
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '240px' }}>
            <ProgressRing percentage={overallReadiness} size={110} stroke={9} color="var(--accent)" sublabel="ready" />
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Placement Readiness</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '280px' }}>
                Composite index across Core CS, Coding, Aptitude, Mock Interviews, and Resume ATS alignment.
              </p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <DividerLabel>Competency Progress by Track</DividerLabel>
            <MiniBarChart data={chartData} max={100} suffix="%" />
          </div>
        </div>
      </div>

      {/* Learning Tracks Grid & Daily Challenge / Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.7fr) minmax(300px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left: 6 Modules Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Integrated Career Modules</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click any module to practice</span>
          </div>

          <div ref={tracksRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                className="card"
                onClick={() => onNavigate(track.id)}
                style={{
                  padding: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: track.tint, color: track.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {track.icon}
                    </div>
                    <span className={`badge ${track.badgeClass}`} style={{ fontSize: '0.72rem' }}>{track.badge}</span>
                  </div>
                  <ProgressRing percentage={track.pct} size={46} stroke={4} color={track.color} />
                </div>

                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                    {track.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {track.desc}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--card-border)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                  <span>Launch Module</span>
                  <ChevronRightIcon size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Daily Scenario Challenge & Live Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Daily Challenge Card */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-amber">Daily Placement Challenge</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+25 XP</span>
            </div>
            <h4 style={{ fontSize: '0.96rem', lineHeight: 1.5, margin: 0 }}>{dailyChallenge.question}</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dailyChallenge.options.map((option, idx) => {
                let styleClass = 'quiz-option';
                if (dailyAnswered) {
                  if (idx === dailyChallenge.correctIndex) styleClass += ' quiz-option-correct';
                  else if (idx === selectedDailyOption) styleClass += ' quiz-option-incorrect';
                } else if (idx === selectedDailyOption) {
                  styleClass += ' quiz-option-selected';
                }

                return (
                  <button
                    key={idx}
                    className={styleClass}
                    onClick={() => handleDailySubmit(idx)}
                    disabled={dailyAnswered}
                    style={{ margin: 0, padding: '8px 12px', fontSize: '0.82rem' }}
                  >
                    <div className="option-indicator" style={{ width: '22px', height: '22px', fontSize: '0.75rem' }}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {dailyAnswered && (
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: selectedDailyOption === dailyChallenge.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {selectedDailyOption === dailyChallenge.correctIndex ? '✓ Correct! ' : '✕ Incorrect. '}
                </strong>
                {dailyChallenge.explanation}
              </div>
            )}
          </div>

          {/* Recent Platform Activities */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Recent Activities</h4>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activities.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-primary)',
                      borderRadius: '6px',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{act.title}</span>
                    <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>+{act.xpEarned} XP</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No recent activity recorded yet. Start practicing!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
