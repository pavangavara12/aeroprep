import type { AiHealth } from '../types';

/*
 * Low-level client for the secure backend proxy. All AI calls go through
 * same-origin /api/* routes (Vite middleware in dev/preview, or the standalone
 * server in production). The Gemini key lives only on the server.
 *
 * VITE_API_BASE is optional and only needed if you run the API on a different
 * origin than the frontend. It is a public URL (not a secret), so the VITE_
 * prefix is fine here.
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export interface ApiError extends Error {
  status?: number;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('aeroprep_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem('aeroprep_auth_token', token);
  else localStorage.removeItem('aeroprep_auth_token');
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let resp: Response;
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    resp = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers,
      signal,
    });
  } catch {
    const err: ApiError = new Error(
      'Could not reach the AeroPrep server. Please verify your connection.',
    );
    throw err;
  }

  const text = await resp.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!resp.ok) {
    const err: ApiError = new Error(
      (data.error as string) || `Request failed (HTTP ${resp.status}).`,
    );
    err.status = resp.status;
    throw err;
  }
  return data as T;
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let resp: Response;
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    const err: ApiError = new Error(
      'Could not reach the AI server. Make sure the app is running via "npm run dev".',
    );
    throw err;
  }

  const text = await resp.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!resp.ok) {
    const err: ApiError = new Error(
      (data.error as string) || `The AI request failed (HTTP ${resp.status}).`,
    );
    err.status = resp.status;
    throw err;
  }
  return data as T;
}

let healthCache: AiHealth | null = null;

/** Cached health probe so components can degrade to text-only gracefully. */
export async function checkHealth(force = false): Promise<AiHealth> {
  if (healthCache && !force) return healthCache;
  try {
    const resp = await fetch(`${API_BASE}/api/health`);
    const data = await resp.json();
    healthCache = {
      ok: Boolean(data.ok),
      configured: Boolean(data.configured),
      models: data.models,
      live: data.live,
    };
  } catch {
    healthCache = { ok: false, configured: false };
  }
  return healthCache;
}
