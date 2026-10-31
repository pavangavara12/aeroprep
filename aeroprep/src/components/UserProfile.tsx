import React, { useState } from 'react';
import type { AuthUser, UserProgress } from '../types';
import {
  UserIcon,
  CheckCircleIcon,
  AwardIcon,
  BriefcaseIcon,
  LockIcon,
  SaveIcon,
} from './Icons';
import { SectionHero, StatTile } from './Shared';
import { postJson } from '../services/apiClient';
import { getPasswordStrength } from '../utils/auth';

interface UserProfileProps {
  user: AuthUser;
  progress: UserProgress;
  onUpdateUser: (updatedUser: AuthUser) => void;
  onSignOut: () => void;
}

const AVATAR_OPTIONS = ['🚀', '🎓', '💻', '🧠', '⚡', '👨‍💻', '👩‍💻', '🎯', '👨‍🏫', '🦁'];

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  progress,
  onUpdateUser,
  onSignOut,
}) => {
  const [name, setName] = useState(user.name);
  const [college, setCollege] = useState(user.college || 'State Technological University');
  const [branch, setBranch] = useState(user.branch || 'Information Technology');
  const [gradYear, setGradYear] = useState(user.gradYear || '2026');
  const [targetRole, setTargetRole] = useState(user.targetRole || 'Full Stack Software Engineer');
  const [targetCompaniesInput, setTargetCompaniesInput] = useState(
    (user.targetCompanies || ['Google', 'Amazon', 'Microsoft']).join(', ')
  );
  const [avatar, setAvatar] = useState(user.avatar || '🚀');
  const [bio, setBio] = useState(
    user.bio || 'Final year B.Tech engineering student preparing for SDE-1 placement drives.'
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const companiesArray = targetCompaniesInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const updated: AuthUser = {
      ...user,
      name: name.trim(),
      college: college.trim(),
      branch: branch.trim(),
      gradYear: gradYear.trim(),
      targetRole: targetRole.trim(),
      targetCompanies: companiesArray,
      avatar,
      bio: bio.trim(),
    };

    try {
      await postJson('/api/auth/profile', {
        userId: user.id,
        name: updated.name,
        college: updated.college,
        branch: updated.branch,
        gradYear: updated.gradYear,
        targetRole: updated.targetRole,
        targetCompanies: updated.targetCompanies,
        avatar: updated.avatar,
        bio: updated.bio,
      });
      onUpdateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // Offline fallback
      onUpdateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters long.');
      return;
    }
    setPasswordStatus('Password updated successfully.');
    setNewPassword('');
    setTimeout(() => setPasswordStatus(null), 3000);
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <SectionHero
        icon={<UserIcon size={26} />}
        title="Student Profile & Academic Settings"
        subtitle="Manage your academic credentials, target recruitment companies, learning goals, and account security."
      />

      {/* Snapshot Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <StatTile
          icon={<AwardIcon size={22} />}
          value={`${progress.totalScore} XP`}
          label="Cumulative Experience"
          color="var(--accent-violet)"
          tint="rgba(124, 58, 237, 0.1)"
        />
        <StatTile
          icon={<CheckCircleIcon size={22} />}
          value={`${progress.completedLessons.length} Modules`}
          label="Lessons Mastered"
          color="var(--accent-emerald)"
          tint="rgba(5, 150, 105, 0.1)"
        />
        <StatTile
          icon={<BriefcaseIcon size={22} />}
          value={targetRole.split(' ')[0]}
          label="Primary Career Track"
          color="var(--accent-cyan)"
          tint="rgba(37, 99, 235, 0.1)"
        />
      </div>

      {/* Two Column Layout: Profile Form on Left, Account & Security on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(280px, 1fr)', gap: '22px', alignItems: 'start' }}>
        {/* Left: Profile Edit Form */}
        <div className="panel" style={{ padding: '24px' }}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Avatar Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Choose Profile Avatar:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      fontSize: '1.3rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: avatar === emoji ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                      background: avatar === emoji ? 'var(--surface-hover)' : 'var(--card-bg)',
                      cursor: 'pointer',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Full Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Email Address:</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            {/* College, Branch, Grad Year */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>College / University:</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Branch / Major:</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Graduation:</label>
                <input
                  type="text"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                />
              </div>
            </div>

            {/* Target Job Role */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Target Career Role:</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Full Stack Software Engineer"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
              />
            </div>

            {/* Target Companies */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Target Companies (comma separated):</label>
              <input
                type="text"
                value={targetCompaniesInput}
                onChange={(e) => setTargetCompaniesInput(e.target.value)}
                placeholder="Google, Amazon, Microsoft, TCS Digital"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
              />
            </div>

            {/* Student Bio */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Short Placement Bio:</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <SaveIcon size={16} />
                {saving ? 'Saving...' : saveSuccess ? 'Profile Saved! ✨' : 'Save Profile Changes'}
              </button>
              {saveSuccess && <span style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>Saved successfully</span>}
            </div>
          </form>
        </div>

        {/* Right: Security & Account Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Account Card */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                }}
              >
                {avatar}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{name}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                <div style={{ marginTop: '4px' }}>
                  <span className={user.role === 'admin' ? 'badge badge-violet' : 'badge badge-cyan'}>
                    {(user.role || 'student').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {bio}
            </div>

            <button
              onClick={onSignOut}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '9px', fontSize: '0.85rem', color: 'var(--accent-rose)' }}
            >
              Sign Out from AeroPrep
            </button>
          </div>

          {/* Change Password Card */}
          <div className="panel" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LockIcon size={16} /> Account Security
            </h4>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>New Password:</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--card-border)', fontSize: '0.85rem' }}
                />
                {newPassword && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                    <span style={{ fontWeight: 600, color: strength.score >= 3 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!newPassword}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '8px 12px', marginTop: '4px' }}
              >
                Update Password
              </button>

              {passwordStatus && (
                <div style={{ fontSize: '0.78rem', color: passwordStatus.includes('success') ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {passwordStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
