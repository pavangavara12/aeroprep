import React, { useState } from 'react';
import type { AuthUser } from '../types';
import { isValidEmail, getPasswordStrength, signUp, logIn } from '../utils/auth';
import { MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, BriefcaseIcon } from './Icons';
import { FlightPath } from './graphics/FlightPath';

interface AuthProps {
  onAuthenticated: (user: AuthUser) => void;
  onSkip: () => void;
}

type Mode = 'login' | 'signup';

export const Auth: React.FC<AuthProps> = ({ onAuthenticated, onSkip }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError('');
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (mode === 'signup' && !name.trim()) errors.name = 'Enter your full name';
    if (!email.trim()) errors.email = 'Enter your email';
    else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Enter your password';
    else if (mode === 'signup' && password.length < 8) errors.password = 'At least 8 characters';
    if (mode === 'signup' && confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = mode === 'signup'
        ? await signUp(name, email, password)
        : await logIn(email, password);

      if (!result.success || !result.user) {
        setFormError(result.error ?? 'Something went wrong. Please try again.');
        return;
      }
      onAuthenticated(result.user);
    } finally {
      setLoading(false);
    }
  };

  const strength = mode === 'signup' && password ? getPasswordStrength(password) : null;
  const strengthColor = strength
    ? strength.score <= 1
      ? 'var(--accent-rose)'
      : strength.score <= 3
      ? 'var(--accent-amber)'
      : 'var(--accent-emerald)'
    : 'var(--card-border)';

  return (
    <div className="auth-shell">
      {/* Brand panel */}
      <div className="auth-brand-panel">
        <FlightPath className="auth-flight-path" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            className="flex-center"
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent)', color: '#fff' }}
          >
            <BriefcaseIcon size={18} />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>AeroPrep</span>
        </div>

        <div>
          <h1 style={{ fontSize: '1.9rem', lineHeight: 1.3, marginBottom: '16px', maxWidth: '380px' }}>
            Prepare for interviews with structured, guided practice.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '380px', marginBottom: '8px' }}>
            Track your progress across communication, soft skills, and aptitude — all in one place.
          </p>

          <div style={{ marginTop: '28px' }}>
            <div className="auth-brand-feature">
              <CheckCircleIcon size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '1px' }} />
              <span>Save your XP and streaks across sessions</span>
            </div>
            <div className="auth-brand-feature">
              <CheckCircleIcon size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '1px' }} />
              <span>Timed aptitude simulators with detailed breakdowns</span>
            </div>
            <div className="auth-brand-feature">
              <CheckCircleIcon size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '1px' }} />
              <span>Realistic mock interview and negotiation scenarios</span>
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>© {new Date().getFullYear()} AeroPrep</p>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          {/* Mobile-only brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }} className="show-mobile-brand">
            <div
              className="flex-center"
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent)', color: '#fff' }}
            >
              <BriefcaseIcon size={16} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>AeroPrep</span>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {mode === 'login' ? 'Sign in to continue your progress.' : 'Start tracking your interview prep.'}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full name</label>
                <div className="auth-field-icon-wrap">
                  <span className="auth-field-icon"><UserIcon size={16} /></span>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Gavara Pavan Sai Manikanta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                {fieldErrors.name && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '6px' }}>{fieldErrors.name}</p>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="auth-field-icon-wrap">
                <span className="auth-field-icon"><MailIcon size={16} /></span>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={mode === 'login'}
                />
              </div>
              {fieldErrors.email && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '6px' }}>{fieldErrors.email}</p>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>Password</label>
                {mode === 'login' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', cursor: 'default' }}>Forgot password?</span>
                )}
              </div>
              <div className="auth-field-icon-wrap">
                <span className="auth-field-icon"><LockIcon size={16} /></span>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-field-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '6px' }}>{fieldErrors.password}</p>}

              {strength && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: '3px',
                          flex: 1,
                          borderRadius: '2px',
                          background: i <= strength.score ? strengthColor : 'var(--card-border)',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{strength.label}</span>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <div className="auth-field-icon-wrap">
                  <span className="auth-field-icon"><LockIcon size={16} /></span>
                  <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {fieldErrors.confirmPassword && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '6px' }}>{fieldErrors.confirmPassword}</p>}
              </div>
            )}

            {formError && (
              <div className="badge badge-rose" style={{ display: 'flex', width: '100%', marginBottom: '16px', fontWeight: 500 }}>
                {formError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <button type="button" onClick={onSkip} className="btn btn-secondary" style={{ width: '100%' }}>
            Continue as guest
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '20px' }}>
            {mode === 'login' ? (
              <>Don't have an account? <span onClick={() => switchMode('signup')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Sign up</span></>
            ) : (
              <>Already have an account? <span onClick={() => switchMode('login')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Log in</span></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
