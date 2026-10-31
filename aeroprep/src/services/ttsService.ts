import { postJson } from './apiClient';

/* ==========================================================================
   ttsService — natural speech playback for the assistant.

   Gemini's TTS models return RAW signed 16-bit little-endian PCM (mono, 24 kHz)
   as base64 — NOT a WAV/MP3 container. The correct way to play that in a browser
   is the Web Audio API: decode the base64, convert the 16-bit samples to
   Float32, build an AudioBuffer at the reported sample rate, and play it through
   an AudioBufferSourceNode after RESUMING the AudioContext (browsers keep it
   "suspended" until a user gesture — the #1 cause of "the AI replies but I hear
   nothing"). Three layers keep the assistant from ever being silently mute:
     1) Web Audio API                         (primary — correct for raw PCM)
     2) <audio> + a client-built WAV container (object URL)
     3) window.speechSynthesis                (browser voice, last resort)
   A single active source + monotonic token guarantees a new reply cancels the
   previous one (no overlap, clean barge-in / interruption). Every step logs a
   diagnostic so the exact failure point is visible in the browser console.
   ========================================================================== */

const TAG = '[AeroPrep TTS]';
function log(...args: unknown[]): void {
  try { console.log(TAG, ...args); } catch { /* ignore */ }
}
function warn(...args: unknown[]): void {
  try { console.warn(TAG, ...args); } catch { /* ignore */ }
}

export interface SpeakOptions {
  signal?: AbortSignal;
  voice?: string;
  onStart?: () => void; // fired when audio actually begins playing
  onEnd?: () => void; // fired once when playback finishes or is stopped
  onError?: (err: Error) => void; // hard failure (no audio produced at all)
  onFallback?: () => void; // fired when we degrade to the browser voice
}

/** Shape returned by POST /api/tts (raw PCM + metadata; see geminiHandlers.mjs). */
interface TtsResponse {
  audioBase64: string;
  mimeType?: string;
  encoding?: string;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  byteLength?: number;
}

/** Decoded PCM ready to play (cached for instant replay without a re-fetch). */
interface CachedPcm {
  bytes: Uint8Array;
  sampleRate: number;
  channels: number;
  bits: number;
}

// ----- shared, module-level state → only one utterance is ever active -------
let audioCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let audioEl: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let activeToken = 0; // bumped on every stop/new speak → invalidates stale callbacks
let lastText = ''; // for replay / speechSynthesis fallback
let lastPcm: CachedPcm | null = null; // cached decoded audio for instant replay

// ----------------------------- capabilities ---------------------------------

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/** Lazily create (once) the shared AudioContext. */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const w = window as WebkitWindow;
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

export function isWebAudioSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as WebkitWindow;
  return Boolean(w.AudioContext || w.webkitAudioContext);
}

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** True if we have at least one way to speak. */
export function isAnyTtsSupported(): boolean {
  return isWebAudioSupported() || typeof Audio !== 'undefined' || isBrowserSpeechSupported();
}

/** Whether something is currently being spoken (any path). */
export function isSpeaking(): boolean {
  const webAudioBusy = !!activeSource;
  const elBusy = !!audioEl && !audioEl.paused && !audioEl.ended;
  const synthBusy = isBrowserSpeechSupported() && window.speechSynthesis.speaking;
  return webAudioBusy || elBusy || synthBusy;
}

/**
 * Resume/create the AudioContext. MUST be called from within a user gesture
 * (e.g. a button click) at least once, or browsers keep the context "suspended"
 * and no Web Audio sound is produced. Safe to call repeatedly / idempotent.
 */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) {
    log('unlockAudio: Web Audio API not available in this browser.');
    return false;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      warn('unlockAudio: resume() failed', e);
    }
  }
  log('unlockAudio: AudioContext state =', ctx.state);
  return ctx.state === 'running';
}

// ------------------------------- decoding -----------------------------------

/** Decode a base64 string into raw bytes (starts at offset 0 → 2-byte aligned). */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Convert raw signed 16-bit little-endian PCM into a Web Audio AudioBuffer.
 * Int16 → Float32 in [-1, 1) via ÷32768. De-interleaves if channels > 1.
 */
function pcmToAudioBuffer(ctx: AudioContext, pcm: Uint8Array, sampleRate: number, channels: number): AudioBuffer {
  const totalSamples = Math.floor(pcm.byteLength / 2); // 16-bit → 2 bytes/sample
  const frameCount = Math.max(1, Math.floor(totalSamples / channels));
  // pcm came from base64ToBytes → its ArrayBuffer starts at offset 0 (2-byte safe).
  const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, totalSamples);
  const buffer = ctx.createBuffer(channels, frameCount, sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const out = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      out[i] = int16[i * channels + ch] / 32768; // → [-1, 1)
    }
  }
  return buffer;
}

/** Build a minimal 44-byte-header WAV around raw PCM (for the <audio> fallback). */
function pcmToWavBuffer(pcm: Uint8Array, sampleRate: number, channels: number, bits: number): ArrayBuffer {
  const blockAlign = (channels * bits) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  dv.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  dv.setUint32(16, 16, true); // fmt chunk size
  dv.setUint16(20, 1, true); // audioFormat = PCM
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bits, true);
  writeStr(36, 'data');
  dv.setUint32(40, dataSize, true);
  new Uint8Array(out, 44).set(pcm);
  return out;
}

// ------------------------------- playback -----------------------------------

/**
 * PRIMARY path: play raw PCM through the Web Audio API. Resolves true if it
 * actually started/finished (so callers know NOT to fall back), false if the
 * context couldn't run or decoding failed (so callers try the next layer).
 */
function playPcmViaWebAudio(pcm: CachedPcm, token: number, opts: SpeakOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    void (async () => {
      const ctx = getAudioContext();
      if (!ctx) {
        warn('Web Audio API unavailable.');
        resolve(false);
        return;
      }
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* ignore */ }
      }
      if (token !== activeToken) { resolve(true); return; } // superseded — treat as handled
      if (ctx.state !== 'running') {
        warn('AudioContext not running (autoplay likely blocked). state =', ctx.state);
        resolve(false);
        return;
      }

      let buffer: AudioBuffer;
      try {
        buffer = pcmToAudioBuffer(ctx, pcm.bytes, pcm.sampleRate, pcm.channels);
      } catch (e) {
        warn('PCM → AudioBuffer decode failed', e);
        resolve(false);
        return;
      }
      if (!buffer.length) {
        warn('decoded audio buffer is empty.');
        resolve(false);
        return;
      }

      let source: AudioBufferSourceNode;
      try {
        source = ctx.createBufferSource();
      } catch (e) {
        warn('createBufferSource failed', e);
        resolve(false);
        return;
      }
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeSource = source;

      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (activeSource === source) activeSource = null;
        resolve(ok);
      };

      source.onended = () => {
        log('playback ended.');
        if (token === activeToken) opts.onEnd?.();
        done(true);
      };
      // Safety net: if 'ended' never fires, resolve after the clip's length.
      const guardMs = Math.ceil(buffer.duration * 1000) + 2000;
      setTimeout(() => {
        if (settled) return;
        log('playback guard timeout reached.');
        if (token === activeToken) opts.onEnd?.();
        done(true);
      }, guardMs);

      try {
        source.start();
        log(`playback started — ${buffer.duration.toFixed(2)}s @ ${buffer.sampleRate}Hz, ctx=${ctx.state}`);
        if (token === activeToken) opts.onStart?.();
      } catch (e) {
        warn('source.start() failed', e);
        done(false);
      }
    })();
  });
}

/** FALLBACK path: wrap PCM in a WAV container and play via <audio> (object URL). */
function playPcmViaAudioElement(pcm: CachedPcm, token: number, opts: SpeakOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let el: HTMLAudioElement;
    try {
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.preload = 'auto';
      }
      el = audioEl;
    } catch {
      resolve(false);
      return;
    }

    let url: string;
    try {
      const wav = pcmToWavBuffer(pcm.bytes, pcm.sampleRate, pcm.channels, pcm.bits);
      url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    } catch (e) {
      warn('WAV build failed', e);
      resolve(false);
      return;
    }
    if (currentObjectUrl) { try { URL.revokeObjectURL(currentObjectUrl); } catch { /* ignore */ } }
    currentObjectUrl = url;

    let settled = false;
    const cleanup = () => {
      el.onended = null;
      el.onerror = null;
      if (currentObjectUrl === url) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        currentObjectUrl = null;
      }
    };
    el.onended = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (token === activeToken) opts.onEnd?.();
      resolve(true);
    };
    el.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      warn('<audio> playback error.');
      resolve(false);
    };
    el.src = url;
    const started = el.play();
    if (started && typeof started.then === 'function') {
      started
        .then(() => {
          log('<audio> WAV fallback playing.');
          if (token === activeToken) opts.onStart?.();
        })
        .catch((e) => {
          if (settled) return;
          settled = true;
          cleanup();
          warn('<audio> play() rejected (autoplay?)', e);
          resolve(false);
        });
    } else if (token === activeToken) {
      opts.onStart?.();
    }
  });
}

function pickBrowserVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices?.() || [];
  if (!voices.length) return null;
  // Prefer known natural-sounding English voices, then any English voice.
  const preferred = [
    'Google UK English Female',
    'Google US English',
    'Samantha',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Zira - English (United States)',
  ];
  for (const name of preferred) {
    const hit = voices.find((v) => v.name === name);
    if (hit) return hit;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith('en')) || voices[0];
}

/** LAST RESORT: browser speechSynthesis so the assistant always has a voice. */
function speakWithBrowser(text: string, token: number, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!text || !isBrowserSpeechSupported()) {
      if (token === activeToken) opts.onError?.(new Error('Text-to-speech is not available in this browser.'));
      resolve();
      return;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      const voice = pickBrowserVoice(synth);
      if (voice) utter.voice = voice;
      utter.onend = () => {
        if (token === activeToken) opts.onEnd?.();
        resolve();
      };
      utter.onerror = () => {
        if (token === activeToken) {
          opts.onError?.(new Error('Speech playback failed.'));
          opts.onEnd?.();
        }
        resolve();
      };
      log('using browser speechSynthesis fallback.');
      if (token === activeToken) opts.onStart?.();
      synth.speak(utter);
    } catch {
      if (token === activeToken) opts.onError?.(new Error('Speech playback failed.'));
      resolve();
    }
  });
}

/** Stop any active playback immediately (interrupt / mute / end / new turn). */
export function stopSpeaking(): void {
  activeToken += 1; // invalidate any in-flight callbacks
  if (activeSource) {
    try {
      activeSource.stop(); // fires 'ended' → its promise resolves; token guard drops callbacks
      activeSource.disconnect();
    } catch { /* already stopped */ }
    activeSource = null;
  }
  if (audioEl) {
    try { audioEl.pause(); } catch { /* ignore */ }
    audioEl.onended = null;
    audioEl.onerror = null;
  }
  if (currentObjectUrl) {
    try { URL.revokeObjectURL(currentObjectUrl); } catch { /* ignore */ }
    currentObjectUrl = null;
  }
  if (isBrowserSpeechSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

/** Play decoded PCM through the fallback chain (shared by speak + replay). */
async function playCachedPcm(pcm: CachedPcm, token: number, opts: SpeakOptions): Promise<void> {
  const viaWebAudio = await playPcmViaWebAudio(pcm, token, opts);
  if (viaWebAudio || token !== activeToken) return;
  warn('Web Audio path failed — trying <audio> WAV fallback.');
  const viaEl = await playPcmViaAudioElement(pcm, token, opts);
  if (viaEl || token !== activeToken) return;
  warn('WAV <audio> fallback failed — using browser speech synthesis.');
  opts.onFallback?.();
  await speakWithBrowser(lastText, token, opts);
}

/**
 * Speak text naturally. Requests cloud TTS (Gemini) through the secure proxy,
 * then plays the raw PCM via the Web Audio API (with graceful fallbacks).
 * Only one utterance is ever active — calling speak() cancels the previous one.
 */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const clean = (text || '').trim();
  if (!clean) return;

  stopSpeaking(); // enforce single active playback (also bumps activeToken)
  const token = activeToken; // "our" turn
  lastText = clean;
  lastPcm = null;

  let data: TtsResponse;
  try {
    log('requesting speech from /api/tts …');
    data = await postJson<TtsResponse>('/api/tts', { text: clean, voice: opts.voice }, opts.signal);
  } catch (e) {
    if (opts.signal?.aborted || token !== activeToken) return; // aborted/superseded, not an error
    warn('cloud TTS request failed — using browser voice.', e);
    opts.onFallback?.();
    await speakWithBrowser(clean, token, opts);
    return;
  }
  if (opts.signal?.aborted || token !== activeToken) return;

  if (!data || !data.audioBase64) {
    warn('cloud TTS returned no audio — using browser voice.');
    opts.onFallback?.();
    await speakWithBrowser(clean, token, opts);
    return;
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(data.audioBase64);
  } catch (e) {
    warn('base64 audio decode failed — using browser voice.', e);
    opts.onFallback?.();
    await speakWithBrowser(clean, token, opts);
    return;
  }

  const pcm: CachedPcm = {
    bytes,
    sampleRate: data.sampleRate || 24000,
    channels: data.channels || 1,
    bits: data.bitsPerSample || 16,
  };
  lastPcm = pcm;
  log(
    `received audio — ${bytes.byteLength} bytes, encoding=${data.encoding || '?'}, ` +
      `mime="${data.mimeType || '?'}", rate=${pcm.sampleRate}Hz, ch=${pcm.channels}, bits=${pcm.bits}`,
  );

  await playCachedPcm(pcm, token, opts);
}

/** Replay the most recent utterance (reuses cached PCM; no extra API call). */
export async function replayLast(opts: SpeakOptions = {}): Promise<void> {
  if (lastPcm) {
    stopSpeaking();
    const token = activeToken;
    await playCachedPcm(lastPcm, token, opts);
    return;
  }
  if (lastText) await speak(lastText, opts);
}

/** Whether there is anything to replay. */
export function hasReplayable(): boolean {
  return Boolean(lastPcm || lastText);
}

/**
 * Play a known test phrase through the ENTIRE pipeline to isolate the problem.
 * Watch the console: "playback started" but no sound → output device/volume;
 * request failed → Gemini/config; AudioContext won't run → autoplay (click the
 * page first, which unlockAudio() handles when wired to a button).
 */
export async function testVoice(opts: SpeakOptions = {}): Promise<void> {
  await unlockAudio();
  log('Test Voice: requesting a known phrase…');
  await speak(
    'This is a test of the AeroPrep interviewer voice. If you can hear this clearly, audio playback is working.',
    opts,
  );
}

