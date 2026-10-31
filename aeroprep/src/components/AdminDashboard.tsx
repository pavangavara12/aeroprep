import React, { useState, useEffect } from 'react';
import type { AuthUser, AdminStats } from '../types';
import {
  ShieldIcon,
  UserIcon,
  CodeIcon,
  CheckCircleIcon,
  AwardIcon,
  LockIcon,
} from './Icons';
import { SectionHero, StatTile } from './Shared';
import { getJson, postJson } from '../services/apiClient';

interface AdminDashboardProps {
  currentUser: AuthUser | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'topics' | 'problems' | 'audit'>('users');

  // New topic form
  const [newTopicCategory, setNewTopicCategory] = useState('dsa');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicSummary, setNewTopicSummary] = useState('');
  const [newTopicDifficulty, setNewTopicDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // New problem form
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemCategory, setNewProblemCategory] = useState('Arrays');
  const [newProblemDifficulty, setNewProblemDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [newProblemDesc, setNewProblemDesc] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@aeroprep.edu';

  const fetchStats = async () => {
    try {
      const res = await getJson<{ stats: AdminStats }>('/api/admin/stats');
      if (res?.stats) setStats(res.stats);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    try {
      await postJson('/api/admin/questions', {
        category: newTopicCategory,
        categoryLabel: newTopicCategory.toUpperCase(),
        title: newTopicTitle.trim(),
        difficulty: newTopicDifficulty,
        summary: newTopicSummary.trim(),
        readTimeMin: 10,
        keyConcepts: ['Key fundamental principle', 'Standard interview question pattern'],
        codeSnippet: '// Code example implementation',
      });
      alert('Technical topic added to curriculum successfully!');
      setNewTopicTitle('');
      setNewTopicSummary('');
      fetchStats();
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to add topic.');
    }
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProblemTitle.trim()) return;
    try {
      await postJson('/api/admin/problems', {
        title: newProblemTitle.trim(),
        category: newProblemCategory,
        difficulty: newProblemDifficulty,
        description: newProblemDesc.trim(),
        inputFormat: 'Standard Input',
        outputFormat: 'Standard Output',
        constraints: '1 <= N <= 10^5',
        examples: [{ input: 'Example Input', output: 'Example Output' }],
        starterCode: {
          python: 'def solution():\n    pass',
          java: 'class Solution {\n    public void solve() {}\n}',
          cpp: 'class Solution {\npublic:\n    void solve() {}\n};',
          c: 'void solve() {}',
        },
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
      });
      alert('Coding problem added successfully!');
      setNewProblemTitle('');
      setNewProblemDesc('');
      fetchStats();
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to add problem.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '600px', margin: '40px auto' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(225, 29, 72, 0.12)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <LockIcon size={28} />
        </div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Administrator Access Required</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          This administrative control center is restricted to authorized faculty and platform administrators.
          Normal student accounts cannot modify curriculum or view user statistics.
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          To test admin capabilities, sign in with: <br />
          <strong>Email:</strong> admin@aeroprep.edu | <strong>Password:</strong> Admin@12345
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionHero
        icon={<ShieldIcon size={26} />}
        title="Admin Control Center & Curriculum Manager"
        subtitle="Manage student enrollment, monitor coding submission metrics, and publish new technical prep questions."
      />

      {/* Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <StatTile
          icon={<UserIcon size={22} />}
          value={stats?.usersCount ?? 2}
          label="Registered Students"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
        <StatTile
          icon={<CodeIcon size={22} />}
          value={stats?.problemsCount ?? 5}
          label="Coding Challenges"
          color="var(--accent-violet)"
          tint="rgba(124, 58, 237, 0.1)"
        />
        <StatTile
          icon={<CheckCircleIcon size={22} />}
          value={stats?.submissionsCount ?? 1}
          label="Code Submissions"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
        <StatTile
          icon={<AwardIcon size={22} />}
          value={`${stats?.acceptanceRate ?? 100}%`}
          label="Overall Pass Rate"
          color="var(--accent-amber)"
          tint="rgba(217, 119, 6, 0.1)"
        />
      </div>

      {/* Tab controls */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('users')}
          className={`tab-btn ${activeTab === 'users' ? 'tab-btn-active' : ''}`}
          style={{ fontSize: '0.88rem' }}
        >
          Registered Users
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`tab-btn ${activeTab === 'topics' ? 'tab-btn-active' : ''}`}
          style={{ fontSize: '0.88rem' }}
        >
          Technical Topics
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`tab-btn ${activeTab === 'problems' ? 'tab-btn-active' : ''}`}
          style={{ fontSize: '0.88rem' }}
        >
          Coding Problems
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`tab-btn ${activeTab === 'audit' ? 'tab-btn-active' : ''}`}
          style={{ fontSize: '0.88rem' }}
        >
          Recent Audit Log
        </button>
      </div>

      {/* Tab 1: Registered Users */}
      {activeTab === 'users' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '14px' }}>Registered Students & Faculty</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Email</th>
                  <th style={{ padding: '10px 14px' }}>Role</th>
                  <th style={{ padding: '10px 14px' }}>College / Department</th>
                  <th style={{ padding: '10px 14px' }}>Target Role</th>
                  <th style={{ padding: '10px 14px' }}>Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentUsers?.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={u.role === 'admin' ? 'badge badge-violet' : 'badge badge-cyan'}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.college || 'Engineering'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{u.targetRole || 'SDE'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Technical Topics Management */}
      {activeTab === 'topics' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '14px' }}>Publish New Technical Module</h3>
          <form onSubmit={handleAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '680px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Category:</label>
                <select
                  value={newTopicCategory}
                  onChange={(e) => setNewTopicCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
                >
                  <option value="c">C Programming</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="dsa">Data Structures</option>
                  <option value="dbms">DBMS</option>
                  <option value="os">Operating Systems</option>
                  <option value="networks">Computer Networks</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Difficulty:</label>
                <select
                  value={newTopicDifficulty}
                  onChange={(e) => setNewTopicDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Topic Title:</label>
              <input
                type="text"
                placeholder="e.g., Virtual Memory & Page Replacement Algorithms"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Summary / Explanation:</label>
              <textarea
                rows={4}
                placeholder="Brief summary of the core concept for placement candidates..."
                value={newTopicSummary}
                onChange={(e) => setNewTopicSummary(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '9px 18px' }}>
              Publish Topic to Curriculum
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Coding Problems Management */}
      {activeTab === 'problems' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '14px' }}>Add Coding Challenge</h3>
          <form onSubmit={handleAddProblem} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '680px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Category:</label>
                <input
                  type="text"
                  placeholder="e.g. Dynamic Programming"
                  value={newProblemCategory}
                  onChange={(e) => setNewProblemCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Difficulty:</label>
                <select
                  value={newProblemDifficulty}
                  onChange={(e) => setNewProblemDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Problem Title:</label>
              <input
                type="text"
                placeholder="e.g. Container With Most Water"
                value={newProblemTitle}
                onChange={(e) => setNewProblemTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Problem Statement:</label>
              <textarea
                rows={4}
                placeholder="Full problem description, input/output constraints..."
                value={newProblemDesc}
                onChange={(e) => setNewProblemDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--card-border)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '9px 18px' }}>
              Save Problem to Sandbox
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Audit Log */}
      {activeTab === 'audit' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '14px' }}>Live Platform Submissions & Mock Sessions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats?.recentSubmissions?.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <strong>{s.userName}</strong> submitted code for <strong>{s.problemTitle}</strong> ({s.language})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={s.status === 'Accepted' ? 'badge badge-emerald' : 'badge badge-rose'}>
                    {s.status}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
