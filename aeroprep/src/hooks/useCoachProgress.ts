import { useCallback, useEffect, useState } from 'react';
import type { CoachSessionRecord } from '../types';

/* ==========================================================================
   useCoachProgress — local, honest progress tracking for the Live coach.

   Completed sessions are stored in localStorage (no server, no account needed)
   so the user can see their ACTUAL recorded results over time. We never
   fabricate or interpolate improvement — the UI only ever shows real recorded
   sessions. Capped so storage can't grow without bound.
   ========================================================================== */

const STORAGE_KEY = 'aeroprep_coach_progress';
const MAX_SESSIONS = 50;

function loadSessions(): CoachSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CoachSessionRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(list: CoachSessionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / privacy mode — progress just won't persist this session */
  }
}

export interface CoachProgressApi {
  sessions: CoachSessionRecord[];
  addSession: (record: CoachSessionRecord) => void;
  clearSessions: () => void;
}

export function useCoachProgress(): CoachProgressApi {
  const [sessions, setSessions] = useState<CoachSessionRecord[]>(() => loadSessions());

  // Keep multiple mounts / tabs roughly in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSessions(loadSessions());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addSession = useCallback((record: CoachSessionRecord) => {
    setSessions((prev) => {
      const next = [...prev, record].slice(-MAX_SESSIONS);
      persist(next);
      return next;
    });
  }, []);

  const clearSessions = useCallback(() => {
    persist([]);
    setSessions([]);
  }, []);

  return { sessions, addSession, clearSessions };
}
