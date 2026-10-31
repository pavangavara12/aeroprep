import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechMetrics } from '../types';
import {
  MicRecorder,
  isRecordingSupported,
  transcribe,
  computeSpeechMetrics,
} from '../services/speechService';

/* ==========================================================================
   useSpeechRecognition — microphone capture + cloud speech-to-text.
   The RELIABLE path is: MediaRecorder capture → backend STT → transcript.
   On top of that we OPTIONALLY run the browser's Web Speech API purely to
   show a live (interim) transcript while the user talks — it never becomes
   the authoritative answer, and if it is unsupported or errors we simply
   don't show live words. StrictMode-safe via refs + explicit guards.
   ========================================================================== */

export type RecognitionStatus = 'idle' | 'recording' | 'transcribing';

export interface RecognitionResult {
  transcript: string; // '' means the round-trip worked but nothing was said
  metrics: SpeechMetrics;
}

export interface SpeechRecognitionOptions {
  maxDurationMs?: number;
  onMaxDuration?: () => void; // safety cap reached — caller should stop()
  liveInterim?: boolean; // default true; set false to disable live words
}

// Minimal typing for the optional Web Speech API (avoids depending on lib.dom
// experimental defs and keeps this best-effort layer fully self-contained).
interface LiveResultAlt {
  transcript: string;
}
interface LiveResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: LiveResultAlt;
}
interface LiveEvent {
  resultIndex: number;
  results: { readonly length: number;[index: number]: LiveResult };
}
interface LiveRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: LiveEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type LiveRecognitionCtor = new () => LiveRecognition;

function getLiveRecognitionCtor(): LiveRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: LiveRecognitionCtor;
    webkitSpeechRecognition?: LiveRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function describeMicError(e: unknown): string {
  const name = (e as { name?: string })?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone permission was denied. You can continue using text.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No microphone was detected. You can continue using text.';
  if (name === 'NotReadableError')
    return 'Your microphone seems to be in use by another app. You can continue using text.';
  return 'The microphone could not be started. You can continue using text.';
}

export type StartOutcome = { ok: true } | { ok: false; error: string };
export type StopOutcome =
  | { ok: true; transcript: string; metrics: SpeechMetrics }
  | { ok: false; error: string };

export function useSpeechRecognition(opts?: SpeechRecognitionOptions) {
  const supported = isRecordingSupported();
  const liveSupported = getLiveRecognitionCtor() !== null;

  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  const recorderRef = useRef<MicRecorder | null>(null);
  const liveRef = useRef<LiveRecognition | null>(null);
  const liveTextRef = useRef('');

  const liveInterim = opts?.liveInterim !== false;
  const maxDurationMs = opts?.maxDurationMs ?? 120000;
  const onMaxDuration = opts?.onMaxDuration;

  const stopLive = useCallback(() => {
    const r = liveRef.current;
    liveRef.current = null;
    if (r) {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startLive = useCallback(() => {
    if (!liveInterim) return;
    const Ctor = getLiveRecognitionCtor();
    if (!Ctor) return;
    try {
      const r = new Ctor();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = (e: LiveEvent) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const txt = res[0]?.transcript || '';
          if (res.isFinal) liveTextRef.current += txt + ' ';
          else interim += txt;
        }
        setLiveTranscript((liveTextRef.current + interim).trim());
      };
      r.onerror = () => {
        /* best-effort only — ignore */
      };
      r.onend = () => {
        /* may end early on silence — ignore, MediaRecorder is authoritative */
      };
      r.start();
      liveRef.current = r;
    } catch {
      liveRef.current = null;
    }
  }, [liveInterim]);

  /** Begin capturing. Idempotent if already recording. */
  const start = useCallback(async (): Promise<StartOutcome> => {
    if (!supported) {
      const error = 'Recording is not supported in this browser. You can continue using text.';
      setError(error);
      return { ok: false, error };
    }
    if (recorderRef.current) return { ok: true }; // already recording — desired state already holds
    setError(null);
    setLiveTranscript('');
    liveTextRef.current = '';
    const rec = new MicRecorder();
    try {
      await rec.start(maxDurationMs, () => onMaxDuration?.());
      recorderRef.current = rec;
      setStatus('recording');
      startLive();
      return { ok: true };
    } catch (e) {
      recorderRef.current = null;
      const error = describeMicError(e);
      setError(error);
      setStatus('idle');
      return { ok: false, error };
    }
  }, [supported, maxDurationMs, onMaxDuration, startLive]);

  /** Stop capturing and resolve with transcript + honest metrics. */
  const stop = useCallback(async (): Promise<StopOutcome> => {
    stopLive();
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (!rec) return { ok: false, error: 'The microphone was not active.' };
    setStatus('transcribing');
    let audio: { blob: Blob; mimeType: string; durationSec: number };
    try {
      audio = await rec.stop();
    } catch {
      const error = 'The recording could not be completed. Please try again.';
      setStatus('idle');
      setError(error);
      return { ok: false, error };
    }
    try {
      const transcript = await transcribe(audio.blob, audio.mimeType);
      const metrics = computeSpeechMetrics(transcript, audio.durationSec);
      setStatus('idle');
      setLiveTranscript('');
      return { ok: true, transcript, metrics };
    } catch {
      const error = 'Could not transcribe your answer. Check your connection and try again.';
      setStatus('idle');
      setError(error);
      return { ok: false, error };
    }
  }, [stopLive]);

  /** Abort without producing a result (cancel / unmount). */
  const cancel = useCallback(() => {
    stopLive();
    const rec = recorderRef.current;
    recorderRef.current = null;
    rec?.cancel();
    setStatus('idle');
    setLiveTranscript('');
  }, [stopLive]);

  const reset = useCallback(() => {
    setError(null);
    setStatus('idle');
    setLiveTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      stopLive();
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, [stopLive]);

  return {
    supported,
    liveSupported,
    status,
    error,
    liveTranscript,
    isRecording: status === 'recording',
    isTranscribing: status === 'transcribing',
    start,
    stop,
    cancel,
    reset,
  };
}


