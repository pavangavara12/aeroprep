import type { AuthUser } from '../types';
import { postJson, setAuthToken } from '../services/apiClient';

const SESSION_KEY = 'aeroprep_auth_session';
const USERS_KEY = 'aeroprep_users';

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const getPasswordStrength = (password: string): { score: number; label: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak' };
  if (score <= 3) return { score, label: 'Fair' };
  if (score === 4) return { score, label: 'Good' };
  return { score, label: 'Strong' };
};

async function hashPassword(password: string, email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email.trim().toLowerCase()}::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function saveSession(user: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function startSession(user: { name: string; email: string; role?: 'student' | 'admin'; id?: string; avatar?: string }): AuthUser {
  const session: AuthUser = {
    id: user.id || `usr_${Date.now()}`,
    name: user.name,
    email: user.email,
    role: user.role || (user.email.includes('admin') ? 'admin' : 'student'),
    avatar: user.avatar || '🎓',
    signedInAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  extra?: { college?: string; branch?: string; gradYear?: string; targetRole?: string }
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName) return { success: false, error: 'Please enter your name.' };
  if (!isValidEmail(normalizedEmail)) return { success: false, error: 'Please enter a valid email address.' };
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };

  // Attempt backend API registration first
  try {
    const resp = await postJson<{ token: string; user: AuthUser }>('/api/auth/register', {
      name: trimmedName,
      email: normalizedEmail,
      password,
      ...extra,
    });
    if (resp?.user && resp?.token) {
      setAuthToken(resp.token);
      saveSession(resp.user);
      return { success: true, user: resp.user };
    }
  } catch (err: unknown) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('already exists')) {
      return { success: false, error: 'An account with this email already exists. Try signing in instead.' };
    }
    // Network or server down: fallback to local demo persistence
  }

  const users = getUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    return { success: false, error: 'An account with this email already exists. Try signing in instead.' };
  }

  const passwordHash = await hashPassword(password, normalizedEmail);
  const newUser: StoredUser = {
    name: trimmedName,
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);

  const user = startSession({ name: trimmedName, email: normalizedEmail });
  return { success: true, user };
}

export async function logIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return { success: false, error: 'Please enter a valid email address.' };
  if (!password) return { success: false, error: 'Please enter your password.' };

  // Attempt backend API login first
  try {
    const resp = await postJson<{ token: string; user: AuthUser }>('/api/auth/login', {
      email: normalizedEmail,
      password,
    });
    if (resp?.user && resp?.token) {
      setAuthToken(resp.token);
      saveSession(resp.user);
      return { success: true, user: resp.user };
    }
  } catch (err: unknown) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('Invalid email or password')) {
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }
    // Network or server down: fallback to local credentials check
  }

  // Pre-configured default demo users for offline mode
  if (normalizedEmail === 'admin@aeroprep.edu' && password === 'Admin@12345') {
    const adminUser = startSession({
      name: 'Prof. Rajesh Sharma',
      email: 'admin@aeroprep.edu',
      role: 'admin',
      avatar: '👨‍🏫',
    });
    return { success: true, user: adminUser };
  }

  if (normalizedEmail === 'alex.student@aeroprep.edu' && password === 'Student@12345') {
    const alexUser = startSession({
      name: 'Alex Johnson',
      email: 'alex.student@aeroprep.edu',
      role: 'student',
      avatar: '🚀',
    });
    return { success: true, user: alexUser };
  }

  const users = getUsers();
  const existing = users.find((u) => u.email === normalizedEmail);
  if (!existing) {
    return { success: false, error: 'No account found with this email. Try signing up instead.' };
  }

  const passwordHash = await hashPassword(password, normalizedEmail);
  if (passwordHash !== existing.passwordHash) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const user = startSession({ name: existing.name, email: existing.email });
  return { success: true, user };
}

export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  setAuthToken(null);
}
