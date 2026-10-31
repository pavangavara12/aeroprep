import React, { useState, useEffect } from 'react';
import type { UserProgress, PlacementTrackerData, TargetCompany, ChecklistItem } from '../types';
import {
  CompassIcon,
  TargetIcon,
  CheckSquareIcon,
  SaveIcon,
} from './Icons';
import { SectionHero, StatTile } from './Shared';
import { getJson, postJson } from '../services/apiClient';

interface PlacementTrackerProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
}

const DEFAULT_COMPANY_PRESETS: TargetCompany[] = [
  { id: 'google', name: 'Google', role: 'Software Engineer (L3)', status: 'Preparing', rounds: 'Online Assessment, 2x Technical Coding, Googlyness Behavioral' },
  { id: 'amazon', name: 'Amazon', role: 'SDE-1', status: 'Applied', rounds: 'Online Assessment (Debug + 2 Coding), 3x Onsite Technical, Leadership Principles' },
  { id: 'microsoft', name: 'Microsoft', role: 'Software Engineer', status: 'Preparing', rounds: 'Codility OA, 3x Technical (DSA + System Design Basics), AA Round' },
  { id: 'tcs', name: 'TCS Digital', role: 'Digital Cadre Engineer', status: 'Offer Received', rounds: 'Advanced Aptitude, 2 Coding Problems, Technical + HR' },
];

export const PlacementTracker: React.FC<PlacementTrackerProps> = ({ progress: _progress, onAddScore }) => {
  const [companies, setCompanies] = useState<TargetCompany[]>(DEFAULT_COMPANY_PRESETS);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'chk-1', label: 'Complete top 50 LeetCode patterns (Arrays, DP, Graphs)', completed: true },
    { id: 'chk-2', label: 'Revise Core CS Fundamentals (DBMS, OS, Networks, OOP)', completed: true },
    { id: 'chk-3', label: 'Conduct at least 3 AI Mock Interviews with STAR responses', completed: true },
    { id: 'chk-4', label: 'Audit resume and reach ATS Score >= 80%', completed: true },
    { id: 'chk-5', label: 'Master Quantitative Aptitude timed test series', completed: false },
    { id: 'chk-6', label: 'Prepare 5 personal project stories using STAR framework', completed: false },
    { id: 'chk-7', label: 'Build clean GitHub project portfolio with live demo links', completed: false },
  ]);

  const [weeklyTargetProblems, setWeeklyTargetProblems] = useState<number>(15);
  const [weeklySolvedProblems, setWeeklySolvedProblems] = useState<number>(11);
  const [weeklyTargetMocks, setWeeklyTargetMocks] = useState<number>(2);
  const [weeklyCompletedMocks, setWeeklyCompletedMocks] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New company modal/inputs
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRole, setNewCompanyRole] = useState('Software Engineer');
  const [newCompanyRounds, setNewCompanyRounds] = useState('OA, Technical, HR');

  useEffect(() => {
    async function fetchTracker() {
      try {
        const res = await getJson<{ tracker: PlacementTrackerData }>('/api/readiness');
        if (res?.tracker) {
          if (res.tracker.targetCompanies) setCompanies(res.tracker.targetCompanies);
          if (res.tracker.checklist) setChecklist(res.tracker.checklist);
          if (res.tracker.weeklyGoal) {
            setWeeklyTargetProblems(res.tracker.weeklyGoal.targetProblems || 15);
            setWeeklySolvedProblems(res.tracker.weeklyGoal.solvedProblems || 11);
            setWeeklyTargetMocks(res.tracker.weeklyGoal.targetMocks || 2);
            setWeeklyCompletedMocks(res.tracker.weeklyGoal.completedMocks || 1);
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchTracker();
  }, []);

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleCompanyStatusChange = (id: string, newStatus: TargetCompany['status']) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    const newComp: TargetCompany = {
      id: `comp_${Date.now()}`,
      name: newCompanyName.trim(),
      role: newCompanyRole.trim(),
      status: 'Preparing',
      rounds: newCompanyRounds.trim(),
    };
    setCompanies((prev) => [...prev, newComp]);
    setNewCompanyName('');
  };

  const completedChecklistCount = checklist.filter((c) => c.completed).length;
  const checklistPct = checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;

  // Composite readiness calculation
  const compositeReadiness = Math.round(
    checklistPct * 0.4 +
    Math.min(100, Math.round((weeklySolvedProblems / Math.max(1, weeklyTargetProblems)) * 100)) * 0.3 +
    Math.min(100, Math.round((weeklyCompletedMocks / Math.max(1, weeklyTargetMocks)) * 100)) * 0.3
  );

  const handleSaveTracker = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await postJson('/api/readiness/update', {
        targetCompanies: companies,
        checklist,
        weeklyGoal: {
          targetProblems: weeklyTargetProblems,
          solvedProblems: weeklySolvedProblems,
          targetMocks: weeklyTargetMocks,
          completedMocks: weeklyCompletedMocks,
        },
        readinessScore: compositeReadiness,
      });
      setSaveSuccess(true);
      onAddScore(20);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // Offline fallback
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionHero
        icon={<CompassIcon size={26} />}
        title="Placement Readiness Tracker & Target Company Matrix"
        subtitle="Monitor campus drive milestones, company-specific round formats, weekly problem-solving quotas, and skill gap resolution."
      />

      {/* Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatTile
          icon={<CompassIcon size={22} />}
          value={<>{compositeReadiness}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>%</span></>}
          label="Placement Readiness Index"
          color="var(--accent)"
          tint="var(--accent-soft)"
        />
        <StatTile
          icon={<TargetIcon size={22} />}
          value={`${companies.length} Companies`}
          label="Target Enterprise Pipeline"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
        <StatTile
          icon={<CheckSquareIcon size={22} />}
          value={`${completedChecklistCount} / ${checklist.length}`}
          label="Milestones Verified"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
      </div>

      {/* Main Grid: Weekly Goals & Readiness Radar on top, Company Matrix & Checklist below */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Weekly Targets */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Weekly Sprints & Targets</h3>
            <span className="badge badge-violet">Current Sprint</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500 }}>Coding Problems Solved</span>
                <span style={{ color: 'var(--text-muted)' }}>{weeklySolvedProblems} of {weeklyTargetProblems}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (weeklySolvedProblems / weeklyTargetProblems) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent-cyan)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={() => setWeeklySolvedProblems((p) => p + 1)}
                  className="icon-btn"
                  style={{ fontSize: '0.75rem', padding: '3px 8px', height: 'auto' }}
                >
                  +1 Problem
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500 }}>AI Mock Interviews Conducted</span>
                <span style={{ color: 'var(--text-muted)' }}>{weeklyCompletedMocks} of {weeklyTargetMocks}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (weeklyCompletedMocks / weeklyTargetMocks) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent-emerald)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={() => setWeeklyCompletedMocks((m) => m + 1)}
                  className="icon-btn"
                  style={{ fontSize: '0.75rem', padding: '3px 8px', height: 'auto' }}
                >
                  +1 Mock
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Readiness Breakdown by Subject */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Subject Skill-Gap Audit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { subject: 'Data Structures & Algorithms', score: 82, color: 'var(--accent-cyan)' },
              { subject: 'Core CS (DBMS, OS, Networks)', score: 75, color: 'var(--accent-violet)' },
              { subject: 'Quantitative Aptitude', score: 68, color: 'var(--accent-warm)' },
              { subject: 'Verbal & STAR Communication', score: 85, color: 'var(--accent-emerald)' },
            ].map((skill, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span>{skill.subject}</span>
                  <span style={{ fontWeight: 600, color: skill.color }}>{skill.score}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${skill.score}%`, height: '100%', background: skill.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preparation Checklist */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Placement Readiness Checklist</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Complete essential requirements before appearing in campus placement drives.
            </p>
          </div>
          <span className="badge badge-emerald">{checklistPct}% Done</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleChecklist(item.id)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: item.completed ? 'rgba(5, 150, 105, 0.06)' : 'var(--bg-primary)',
                border: item.completed ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {}}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontSize: '0.88rem',
                  color: item.completed ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Target Companies Matrix */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Target Company Pipeline</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Track interview rounds and application statuses for your target recruiters.
            </p>
          </div>
          <button
            onClick={handleSaveTracker}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
          >
            <SaveIcon size={16} />
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved! (+20 XP)' : 'Save Tracker Updates'}
          </button>
        </div>

        {/* Company Cards List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {companies.map((comp) => (
            <div
              key={comp.id}
              className="card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: 'var(--bg-primary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{comp.name}</h4>
                <select
                  value={comp.status}
                  onChange={(e) => handleCompanyStatusChange(comp.id, e.target.value as TargetCompany['status'])}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: comp.status === 'Offer Received' ? 'var(--accent-emerald)' : 'var(--text-primary)',
                  }}
                >
                  <option value="Researching">Researching</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer Received">Offer Received</option>
                </select>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Role:</strong> {comp.role}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--card-bg)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                <strong>Round Pattern:</strong> {comp.rounds}
              </div>
            </div>
          ))}
        </div>

        {/* Add Company Form */}
        <form onSubmit={handleAddCompany} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--card-border)' }}>
          <input
            type="text"
            placeholder="Company Name (e.g. Adobe)"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            placeholder="Target Role (e.g. Member of Tech Staff)"
            value={newCompanyRole}
            onChange={(e) => setNewCompanyRole(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            placeholder="Interview Rounds (e.g. OA, 3x Tech, HR)"
            value={newCompanyRounds}
            onChange={(e) => setNewCompanyRounds(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
            + Add Company
          </button>
        </form>
      </div>
    </div>
  );
};
