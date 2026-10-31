import type { SpeechMetrics } from '../types';
import { postJson } from './apiClient';

/* ==========================================================================
   speechService — microphone capture (browser-native) + speech-to-text via
   the backend + honest, transcript-based speech metrics.
   We measure only what the browser can provide reliably: recording duration
   (timed), word count and filler count (from the transcript), and WPM
   (derived). We do NOT fabricate pause/prosody numbers.
   ========================================================================== */

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const t of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationSec: number;
}

// SPEECH_APPEND

/**
 * Push-to-talk recorder. The caller starts and stops it explicitly (robust for
 * users who pause or speak slowly). A safety cap auto-stops very long takes.
 */
export class MicRecorder {
  private recorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private mime = '';
  private capTimer: ReturnType<typeof setTimeout> | null = null;

  get stream(): MediaStream | null {
    return this.mediaStream;
  }

  async start(maxDurationMs = 120000, onCap?: () => void): Promise<void> {
    if (!isRecordingSupported()) throw new Error('Recording is not supported in this browser.');
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mime = pickMimeType();
    this.chunks = [];
    this.recorder = this.mime
      ? new MediaRecorder(this.mediaStream, { mimeType: this.mime })
      : new MediaRecorder(this.mediaStream);
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
    this.startTime = performance.now();
    this.capTimer = setTimeout(() => onCap?.(), maxDurationMs);
  }

  /** Stop and resolve with the recorded audio + measured duration. */
  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec) {
        reject(new Error('Recorder is not running.'));
        return;
      }
      rec.onstop = () => {
        const durationSec = Math.max(0.1, (performance.now() - this.startTime) / 1000);
        const type = this.mime || rec.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type });
        this.cleanup();
        resolve({ blob, mimeType: type.split(';')[0], durationSec });
      };
      try {
        rec.stop();
      } catch (e) {
        this.cleanup();
        reject(e instanceof Error ? e : new Error('Failed to stop recording.'));
      }
    });
  }

  /** Abort without producing a result (e.g. on cancel/unmount). */
  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.capTimer) clearTimeout(this.capTimer);
    this.capTimer = null;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.recorder = null;
  }
}

// SPEECH_APPEND2

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

/** Send recorded audio to the backend and get a transcript back. */
export async function transcribe(blob: Blob, mimeType: string): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const data = await postJson<{ transcript: string }>('/api/transcribe', { audioBase64, mimeType });
  return (data.transcript || '').trim();
}

// Common disfluencies. These are transcript-based approximations (the STT model
// may clean some of these up), which we surface honestly in the UI.
const FILLER_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'um', re: /\bum+\b/gi },
  { label: 'uh', re: /\buh+\b/gi },
  { label: 'erm', re: /\berm+\b/gi },
  { label: 'er', re: /\ber\b/gi },
  { label: 'ah', re: /\bah+\b/gi },
  { label: 'hmm', re: /\bhm+\b/gi },
  { label: 'like', re: /\blike\b/gi },
  { label: 'you know', re: /\byou know\b/gi },
  { label: 'i mean', re: /\bi mean\b/gi },
  { label: 'basically', re: /\bbasically\b/gi },
  { label: 'actually', re: /\bactually\b/gi },
  { label: 'literally', re: /\bliterally\b/gi },
  { label: 'kind of', re: /\bkind of\b/gi },
  { label: 'sort of', re: /\bsort of\b/gi },
];

/** Reliable, transcript-derived metrics: word count, WPM, and fillers. */
export function computeSpeechMetrics(transcript: string, durationSec: number): SpeechMetrics {
  const clean = transcript.trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const wordsPerMinute = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  const found: string[] = [];
  let fillerCount = 0;
  for (const { label, re } of FILLER_PATTERNS) {
    const matches = clean.match(re);
    if (matches && matches.length) {
      fillerCount += matches.length;
      found.push(label);
    }
  }
  return {
    wordCount,
    durationSec: Math.round(durationSec * 10) / 10,
    wordsPerMinute,
    fillerCount,
    fillerWords: found,
  };
}

