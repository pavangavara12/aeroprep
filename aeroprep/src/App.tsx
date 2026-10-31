import { useState, useEffect } from 'react';
import type { UserProgress, StarResponse, AuthUser, AppModule } from './types';
import { Dashboard } from './components/Dashboard';
import { TechnicalPrep } from './components/TechnicalPrep';
import { CodingPractice } from './components/CodingPractice';
import { Aptitude } from './components/Aptitude';
import { MockInterview } from './components/MockInterview';
import { AICareerAssistant } from './components/AICareerAssistant';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { PlacementTracker } from './components/PlacementTracker';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfile } from './components/UserProfile';
import { Communication } from './components/Communication';
import { SoftSkills } from './components/SoftSkills';
import { Auth } from './components/Auth';
import { AICoach } from './components/voice/AICoach';
import { CommunicationCoach } from './components/coach/CommunicationCoach';
import { getSession, clearSession, saveSession } from './utils/auth';
import { useTabTransition } from './hooks/useScrollReveal';
import { useTheme } from './hooks/useTheme';
import { FloatingShapes } from './components/graphics/FloatingShapes';
import { getJson, postJson } from './services/apiClient';
import {
  DashboardIcon,
  SpeechIcon,
  HeartIcon,
  MindIcon,
  BriefcaseIcon,
  FlameIcon,
  AwardIcon,
  UserIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MicIcon,
  CodeIcon,
  PlayIcon,
  SparklesIcon,
  FileTextIcon,
  CompassIcon,
  ShieldIcon,
  MenuIcon,
  XIcon,
} from './components/Icons';

const LOCAL_STORAGE_KEY = 'aeroprep_user_progress';
const GUEST_KEY = 'aeroprep_guest_mode';

const initialProgress: UserProgress = {
  totalScore: 120,
  streak: 2,
  lastActiveDate: new Date().toLocaleDateString(),
  completedLessons: ['c-pointers', 'two-sum', 'comm-1'],
  quizScores: {},
  savedStarResponses: {},
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [progress, setProgress] = useState<UserProgress>(initialProgress);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth / sign-in state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const contentRef = useTabTransition<HTMLDivElement>(activeTab);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const session = getSession();
    const guestFlag = localStorage.getItem(GUEST_KEY) === 'true';
    if (session) setAuthUser(session);
    if (guestFlag) setIsGuest(true);
    setAuthChecked(true);
  }, []);

  // Fetch server progress if user is signed in
  useEffect(() => {
    async function syncServerProgress() {
      if (!authUser?.id) return;
      try {
        const res = await getJson<{ progress: { totalScore: number; streak: number; completedLessons: string[] } }>(
          `/api/progress?userId=${authUser.id}`
        );
        if (res?.progress) {
          setProgress((prev) => ({
            ...prev,
            totalScore: Math.max(prev.totalScore, res.progress.totalScore || 0),
            streak: Math.max(prev.streak, res.progress.streak || 1),
            completedLessons: Array.from(new Set([...prev.completedLessons, ...(res.progress.completedLessons || [])])),
          }));
        }
      } catch {
        // Fallback
      }
    }
    syncServerProgress();
  }, [authUser]);

  const handleAuthenticated = (user: AuthUser) => {
    setAuthUser(user);
    setIsGuest(false);
    saveSession(user);
  };

  const handleSkipAuth = () => {
    localStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  };

  const handleSignOut = () => {
    clearSession();
    localStorage.removeItem(GUEST_KEY);
    setAuthUser(null);
    setIsGuest(false);
    setActiveTab('dashboard');
  };

  // Load progress from localStorage on initialization
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: UserProgress = JSON.parse(saved);
        const today = new Date().toLocaleDateString();
        let currentStreak = parsed.streak;
        if (parsed.lastActiveDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (parsed.lastActiveDate === yesterday.toLocaleDateString()) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
        }

        setProgress({
          ...parsed,
          streak: currentStreak,
          lastActiveDate: today,
        });
      } catch (e) {
        console.error('Error loading progress, resetting storage.', e);
        setProgress(initialProgress);
      }
    } else {
      setProgress(initialProgress);
    }
  }, []);

  // Sync state changes with localStorage and backend
  const saveProgress = (newProgress: UserProgress) => {
    setProgress(newProgress);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newProgress));
    if (authUser?.id) {
      postJson('/api/progress/save', {
        userId: authUser.id,
        totalScore: newProgress.totalScore,
        streak: newProgress.streak,
        completedLessons: newProgress.completedLessons,
      }).catch(() => {});
    }
  };

  const handleAddScore = (score: number) => {
    const newProgress = {
      ...progress,
      totalScore: progress.totalScore + score,
    };
    saveProgress(newProgress);
  };

  const handleCompleteLesson = (lessonId: string) => {
    if (progress.completedLessons.includes(lessonId)) return;
    const newProgress = {
      ...progress,
      completedLessons: [...progress.completedLessons, lessonId],
    };
    saveProgress(newProgress);
  };

  const handleSaveStarResponse = (key: string, response: StarResponse) => {
    const newProgress = {
      ...progress,
      savedStarResponses: {
        ...progress.savedStarResponses,
        [key]: response,
      },
    };
    saveProgress(newProgress);
  };

  const handleDeleteStarResponse = (key: string) => {
    const updatedResponses = { ...progress.savedStarResponses };
    delete updatedResponses[key];
    const newProgress = {
      ...progress,
      savedStarResponses: updatedResponses,
    };
    saveProgress(newProgress);
  };

  if (!authChecked) {
    return <div style={{ minHeight: '100vh' }} />;
  }

  if (!authUser && !isGuest) {
    return <Auth onAuthenticated={handleAuthenticated} onSkip={handleSkipAuth} />;
  }

  const isAdmin = authUser?.role === 'admin' || authUser?.email === 'admin@aeroprep.edu';

  const NAV_GROUPS = [
    {
      group: 'Placement Preparation',
      items: [
        { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
        { id: 'technical', label: 'Technical Prep', Icon: CodeIcon },
        { id: 'coding', label: 'Coding Practice', Icon: PlayIcon },
        { id: 'aptitude', label: 'Aptitude Prep', Icon: MindIcon },
        { id: 'mock', label: 'AI Mock Interview', Icon: BriefcaseIcon },
        { id: 'assistant', label: 'AI Career Mentor', Icon: SparklesIcon },
        { id: 'placement', label: 'Placement Tracker', Icon: CompassIcon },
        { id: 'resume', label: 'Resume Analyser', Icon: FileTextIcon },
      ],
    },
    {
      group: 'Interactive Labs',
      items: [
        { id: 'coach', label: 'Live Voice Coach', Icon: MicIcon },
        { id: 'communication', label: 'Communication Lab', Icon: SpeechIcon },
        { id: 'softskills', label: 'Soft Skills Quests', Icon: HeartIcon },
      ],
    },
    {
      group: 'Management',
      items: [
        { id: 'profile', label: 'Student Profile', Icon: UserIcon },
        ...(isAdmin ? [{ id: 'admin', label: 'Admin Dashboard', Icon: ShieldIcon }] : []),
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-bg" aria-hidden="true" />
      <div className="app-bg-shapes" aria-hidden="true">
        <FloatingShapes variant="a" />
      </div>

      {/* Top Header Navigation */}
      <header className="app-header">
        <div className="container app-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="icon-btn"
              style={{ display: 'inline-flex' }}
              aria-label="Toggle navigation drawer"
            >
              {sidebarOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
            </button>

            {/* Brand */}
            <button className="brand" onClick={() => setActiveTab('dashboard')} aria-label="AeroPrep home">
              <span className="brand-mark">
                <BriefcaseIcon size={22} />
              </span>
              <span className="brand-word">
                Aero<span className="gradient-text-cyan-violet">Prep</span>
              </span>
            </button>
          </div>

          {/* Quick Access Desktop Pills */}
          <nav className="primary-nav" aria-label="Primary" style={{ overflowX: 'auto', maxWidth: '58vw' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
              { id: 'technical', label: 'Tech Prep', Icon: CodeIcon },
              { id: 'coding', label: 'Coding', Icon: PlayIcon },
              { id: 'aptitude', label: 'Aptitude', Icon: MindIcon },
              { id: 'mock', label: 'Mock Interview', Icon: BriefcaseIcon },
              { id: 'assistant', label: 'AI Mentor', Icon: SparklesIcon },
              { id: 'resume', label: 'Resume', Icon: FileTextIcon },
              { id: 'placement', label: 'Tracker', Icon: CompassIcon },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`tab-btn ${activeTab === id ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '6px 12px' }}
              >
                <Icon size={15} />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Header Action Indicators */}
          <div className="header-actions">
            <div className="badge badge-violet stat-chip">
              <AwardIcon size={14} />
              <span className="stat-chip-text">{progress.totalScore} XP</span>
            </div>

            <div className="badge streak-badge stat-chip">
              <span className="streak-flame">
                <FlameIcon size={14} />
              </span>
              <span className="stat-chip-text">{progress.streak} Day Streak</span>
            </div>

            <button
              onClick={toggleTheme}
              className="icon-btn"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            {authUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="badge stat-chip"
                  style={{ cursor: 'pointer', border: '1px solid var(--card-border)', padding: '5px 10px' }}
                  title="View Profile Settings"
                >
                  <span style={{ fontSize: '1rem', marginRight: '4px' }}>{authUser.avatar || '🎓'}</span>
                  <span className="stat-chip-text">{authUser.name.split(' ')[0]}</span>
                </button>
                <button onClick={handleSignOut} title="Sign out" aria-label="Sign out" className="icon-btn">
                  <LogOutIcon size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  localStorage.removeItem(GUEST_KEY);
                  setIsGuest(false);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              >
                <UserIcon size={15} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer for All Modules */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 998,
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '290px',
          background: 'var(--card-bg)',
          borderRight: '1px solid var(--card-border)',
          zIndex: 999,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="brand" onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}>
            <span className="brand-mark">
              <BriefcaseIcon size={20} />
            </span>
            <span className="brand-word" style={{ fontSize: '1.15rem' }}>
              Aero<span className="gradient-text-cyan-violet">Prep</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="icon-btn" aria-label="Close menu">
            <XIcon size={18} />
          </button>
        </div>

        {/* Navigation Categories */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 12px 6px' }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map(({ id, label, Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setSidebarOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 600 : 500,
                        border: 'none',
                        background: isActive ? 'var(--surface-hover)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer User summary */}
        {authUser && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--card-border)', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>{authUser.avatar || '🎓'}</span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {authUser.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {authUser.targetRole || 'Placement Candidate'}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace Content */}
      <main style={{ flexGrow: 1, padding: '36px 0' }}>
        <div className="container" ref={contentRef}>
          {activeTab === 'dashboard' && (
            <Dashboard
              progress={progress}
              user={authUser}
              onNavigate={setActiveTab}
              onAddScore={handleAddScore}
            />
          )}

          {activeTab === 'technical' && (
            <TechnicalPrep
              progress={progress}
              onAddScore={handleAddScore}
              onCompleteLesson={handleCompleteLesson}
            />
          )}

          {activeTab === 'coding' && (
            <CodingPractice
              progress={progress}
              onAddScore={handleAddScore}
              onCompleteProblem={handleCompleteLesson}
            />
          )}

          {activeTab === 'aptitude' && (
            <Aptitude
              progress={progress}
              onAddScore={handleAddScore}
              onCompleteLesson={handleCompleteLesson}
            />
          )}

          {activeTab === 'mock' && (
            <MockInterview
              progress={progress}
              onAddScore={handleAddScore}
              onSaveStarResponse={handleSaveStarResponse}
              onDeleteStarResponse={handleDeleteStarResponse}
            />
          )}

          {activeTab === 'coach' && <CommunicationCoach />}

          {activeTab === 'assistant' && (
            <AICareerAssistant
              progress={progress}
              onAddScore={handleAddScore}
            />
          )}

          {activeTab === 'resume' && (
            <ResumeAnalyzer
              progress={progress}
              onAddScore={handleAddScore}
            />
          )}

          {activeTab === 'placement' && (
            <PlacementTracker
              progress={progress}
              onAddScore={handleAddScore}
            />
          )}

          {activeTab === 'profile' && authUser && (
            <UserProfile
              user={authUser}
              progress={progress}
              onUpdateUser={(u) => {
                setAuthUser(u);
                saveSession(u);
              }}
              onSignOut={handleSignOut}
            />
          )}

          {activeTab === 'admin' && <AdminDashboard currentUser={authUser} />}

          {activeTab === 'communication' && (
            <Communication
              progress={progress}
              onAddScore={handleAddScore}
              onCompleteLesson={handleCompleteLesson}
            />
          )}

          {activeTab === 'softskills' && (
            <SoftSkills
              progress={progress}
              onAddScore={handleAddScore}
              onCompleteLesson={handleCompleteLesson}
            />
          )}
        </div>
      </main>

      {/* Context-aware floating AI Coach */}
      {activeTab !== 'coach' && activeTab !== 'assistant' && (
        <AICoach
          module={
            (['dashboard', 'communication', 'softskills', 'aptitude', 'mock'].includes(activeTab)
              ? activeTab
              : 'dashboard') as AppModule
          }
          progressNote={`The candidate has ${progress.totalScore} XP, a ${progress.streak}-day streak, and has mastered ${progress.completedLessons.length} syllabus modules.`}
        />
      )}

      {/* SaaS Footer */}
      <footer className="app-footer">
        <div className="container app-footer-inner">
          <p>© {new Date().getFullYear()} AeroPrep EdTech Platform · B.Tech Placement & Career Readiness Suite</p>
          <div className="footer-links">
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('technical')}>Technical Prep</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('coding')}>Coding Sandbox</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('mock')}>AI Interviewer</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('resume')}>ATS Resume</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
