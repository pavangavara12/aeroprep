import { base64ToBytes, pcm16ToFloat32 } from './pcm';

/* ==========================================================================
   playbackEngine.ts — the Web Audio playback engine for Gemini Live native
   audio. Gemini streams the reply as a SEQUENCE of base64 PCM chunks (24 kHz,
   mono, signed-16-bit LE). Playing each chunk "now" would overlap them into
   garbage, so we keep a single `cursor` (nextPlaybackTime) and schedule every
   chunk to start exactly where the previous one ends — gapless, no overlap.

     enqueue(chunk) → decode → AudioBuffer → source.start(cursor); cursor += dur
     clear()        → stop everything instantly (barge-in / interruption)
     playTestTone() → LOCAL chime, no Gemini (isolates the speaker pipeline)

   A user gesture must call resume() once so the browser's autoplay policy
   lets the AudioContext actually produce sound.
   ========================================================================== */

export type PlaybackState = 'none' | 'suspended' | 'running' | 'closed';

export interface PlaybackCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onDrained?: () => void; // every scheduled chunk has finished playing
  onFirstAudio?: () => void; // first chunk after silence actually started
}

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class PcmPlaybackEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private cursor = 0; // ctx-clock time the next chunk should start at
  private active = new Set<AudioBufferSourceNode>();
  private draining = false;
  private readonly outputRate: number;
  private cb: PlaybackCallbacks;

  receivedChunks = 0;
  playedChunks = 0;

  constructor(outputRate = 24000, cb: PlaybackCallbacks = {}) {
    this.outputRate = outputRate;
    this.cb = cb;
  }

  get outputSampleRate(): number {
    return this.outputRate;
  }

  /** Scheduled-but-not-yet-finished chunks (what the debug panel calls "queued"). */
  get queuedChunks(): number {
    return this.active.size;
  }

  get state(): PlaybackState {
    if (!this.ctx) return 'none';
    return this.ctx.state as PlaybackState;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const w = window as WebkitWindow;
    const Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(this.ctx.destination);
    this.cb.onStateChange?.(this.state);
    return this.ctx;
  }

  /** Resume/create the context from a user gesture. Returns true if running. */
  async resume(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
    this.cb.onStateChange?.(this.state);
    return ctx.state === 'running';
  }

  /** Schedule one base64 PCM chunk to play right after everything already queued. */
  enqueue(base64: string, sampleRate?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.gain) return;
    if (ctx.state === 'suspended') void ctx.resume();

    let buffer: AudioBuffer;
    try {
      const bytes = base64ToBytes(base64);
      if (bytes.byteLength < 2) return;
      const float = pcm16ToFloat32(bytes);
      buffer = ctx.createBuffer(1, float.length, sampleRate ?? this.outputRate);
      buffer.getChannelData(0).set(float);
    } catch {
      return;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);

    const now = ctx.currentTime;
    // Cursor in the future → continue the stream; otherwise (re)start just ahead
    // of "now" so we never schedule in the past (which drops the chunk).
    const startAt = this.cursor > now + 0.005 ? this.cursor : now + 0.03;
    const wasIdle = this.active.size === 0;
    try {
      src.start(startAt);
    } catch {
      return;
    }
    this.cursor = startAt + buffer.duration;
    this.receivedChunks++;
    this.active.add(src);
    this.draining = true;
    if (wasIdle) this.cb.onFirstAudio?.();

    src.onended = () => {
      this.active.delete(src);
      this.playedChunks++;
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
      if (this.active.size === 0 && this.draining) {
        this.draining = false;
        this.cursor = 0;
        this.cb.onDrained?.();
      }
    };
  }

  /** Instantly stop and drop everything scheduled — used on barge-in/interrupt. */
  clear(): void {
    this.draining = false;
    this.cursor = 0;
    for (const src of this.active) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.active.clear();
  }

  /**
   * LOCAL test chime (debug step #1). Proves speaker + AudioContext + buffer
   * scheduling work with ZERO involvement from Gemini. Built as a Float32
   * buffer and played through the exact same graph as real replies.
   */
  async playTestTone(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx || !this.gain) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
    if (ctx.state !== 'running') return false;
    const rate = ctx.sampleRate;
    const dur = 0.7;
    const buffer = ctx.createBuffer(1, Math.floor(rate * dur), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / rate;
      const freq = t < dur / 2 ? 587.33 : 880; // D5 → A5 chime
      const env = Math.min(1, t * 12) * Math.min(1, (dur - t) * 6); // soft fade in/out
      data[i] = Math.sin(2 * Math.PI * freq * t) * 0.22 * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    src.start();
    return true;
  }

  resetCounters(): void {
    this.receivedChunks = 0;
    this.playedChunks = 0;
  }

  /** Tear down completely when the session ends. */
  async close(): Promise<void> {
    this.clear();
    this.resetCounters();
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* ignore */
      }
      this.ctx = null;
      this.gain = null;
      this.cb.onStateChange?.('closed');
    }
  }
}
