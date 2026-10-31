import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage, Session } from '@google/genai';
import { postJson } from './apiClient';
import { parseRateFromMime } from '../audio/pcm';
import type { LiveTokenResponse } from '../types';
// Side-effect import: registers window.aeroLiveDiag() (raw-WebSocket probe) so
// it is bundled and available in the browser console whenever the Live path is
// loaded. TEMPORARY diagnostic — remove together with ./liveDiag once the Live
// handshake is confirmed. It attaches to window on import; it does not run.
import './liveDiag';

/* ==========================================================================
   liveClient.ts — the browser side of the Gemini Live connection.

   The client NEVER sees the real Gemini API key. Instead it:
     1. POSTs /api/live-token → server mints a short-lived EPHEMERAL token
        (created with the same @google/genai SDK, locked to model + AUDIO).
     2. opens the Live session with the OFFICIAL SDK, passing the ephemeral
        token as the apiKey:
          const ai = new GoogleGenAI({ apiKey: <ephemeral>,
                                       httpOptions: { apiVersion } });
          await ai.live.connect({ model, config, callbacks });
        The SDK owns the correct v1alpha WebSocket endpoint, the ephemeral-token
        auth handshake, the setup frame and message framing — so we no longer
        hand-roll a raw socket / URL / API version (the old cause of the drop).
     3. streams mic PCM up via session.sendRealtimeInput({ audio }) and typed
        text via session.sendClientContent(...).
     4. routes serverContent frames back out: native-audio chunks, live
        YOU:/AI: transcription, interruption and turn-complete signals.

   Diagnostics: each step logs a `[Live]` line. We log the token LENGTH only —
   NEVER the token itself or the API key (see redact()).
   ========================================================================== */

const DEFAULT_OUTPUT_RATE = 24000;
const INPUT_MIME = 'audio/pcm;rate=16000';

export type LiveCloseInfo = { code: number; reason: string; wasClean: boolean };

export interface LiveClientCallbacks {
  onOpen?: () => void;
  onSetupComplete?: () => void;
  /** A native-audio PCM chunk from the model (base64 Int16 LE). */
  onAudioChunk?: (base64: string, sampleRate: number, mimeType: string) => void;
  /** Incremental transcript of what the USER said (input transcription). */
  onInputTranscript?: (text: string) => void;
  /** Incremental transcript of what the COACH said (output transcription). */
  onOutputTranscript?: (text: string) => void;
  /** The model was interrupted (barge-in) — drop any queued playback now. */
  onInterrupted?: () => void;
  /** The model finished its turn. */
  onTurnComplete?: () => void;
  /** Server warns the connection will close soon (session limit / rotation). */
  onGoAway?: (timeLeftMs: number | null) => void;
  onClose?: (info: LiveCloseInfo) => void;
  onError?: (message: string) => void;
}
export interface LiveConnectConfig {
  /** Full coach system instruction (base + selected mode). */
  systemInstruction: string;
  /** Override the server's default prebuilt voice (e.g. "Kore", "Puck"). */
  voice?: string;
}

export class LiveClient {
  private session: Session | null = null;
  private cb: LiveClientCallbacks;
  private token: LiveTokenResponse | null = null;
  private setupDone = false;
  private open = false;

  lastMimeType = '';

  constructor(cb: LiveClientCallbacks = {}) {
    this.cb = cb;
  }

  get connected(): boolean {
    return this.open && !!this.session;
  }

  /** Model/voice/token metadata from the last successful token mint. */
  get info(): LiveTokenResponse | null {
    return this.token;
  }

  /** True once the server has acknowledged our setup frame. */
  get isSetupComplete(): boolean {
    return this.setupDone;
  }

  /**
   * Mint a token and open the Live session via the SDK. Resolves once the
   * underlying WebSocket is OPEN (setupComplete then arrives via onmessage →
   * onSetupComplete). Rejects with a user-facing message on failure.
   */
  async connect(config: LiveConnectConfig, signal?: AbortSignal): Promise<void> {
    this.setupDone = false;
    this.open = false;
    this.session = null;

    // 1) Ephemeral token from our own server (real API key stays server-side).
    //    We send the chosen coach persona so the SERVER can LOCK it into the
    //    token's liveConnectConstraints — the browser then connects with only a
    //    minimal config (a subset of what's locked), which is what the Live
    //    handshake for gemini-3.8-live expects.
    console.log('[Live] requesting ephemeral token…');
    let token: LiveTokenResponse;
    try {
      token = await postJson<LiveTokenResponse>(
        '/api/live-token',
        { systemInstruction: config.systemInstruction },
        signal,
      );
    } catch (err) {
      console.log(`[Live] token received: NO — ${this.safeError(err)}`);
      throw new Error(
        (err as Error)?.message ||
          'Could not start a Live session. Check that the AI server is running.',
      );
    }
    this.token = token;
    // SAFE diagnostics only — model/voice/api/length. NEVER the token value.
    console.log(
      `[Live] token received: YES (model=${token.model || '(default)'} voice=${token.voice || '(default)'} api=${token.apiVersion || '(default)'} tokenLen=${token.token ? token.token.length : 0})`,
    );
    if (signal?.aborted) throw new Error('Live connection was cancelled.');
    // 2) Open the Live session. The ephemeral token is used as the apiKey; the
    //    SDK owns the correct v1alpha WebSocket endpoint, auth and framing.
    const model = token.model || 'gemini-3.8-live';
    const voice = config.voice || token.voice || 'Kore';
    // The installed @google/genai SDK serves ephemeral-token Live sessions on
    // v1alpha ONLY (it uses BidiGenerateContentConstrained, which v1beta does
    // not complete — the WS opens but setupComplete never arrives). The server
    // mints the token under this same version and returns it here; the fallback
    // matches so the browser's GoogleGenAI client always uses v1alpha too.
    const apiVersion = token.apiVersion || 'v1alpha';

    let ai: GoogleGenAI;
    try {
      ai = new GoogleGenAI({ apiKey: token.token, httpOptions: { apiVersion } });
    } catch (err) {
      throw new Error(this.safeError(err) || 'Could not initialize the Gemini Live client.');
    }

    // Compute the EXACT WebSocket endpoint the SDK will open, so it is visible
    // in the console (diagnostic item 3). The installed SDK (2.26.0) detects an
    // ephemeral token (apiKey starts with "auth_tokens/") and switches the Live
    // method to BidiGenerateContentConstrained, passing the token as the
    // access_token query param. We log the endpoint with the token REDACTED.
    const isEphemeral = token.token.startsWith('auth_tokens/');
    const sdkMethod = isEphemeral ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
    const sdkWsEndpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.${sdkMethod}`;
    console.log(`[Live] SDK WS endpoint (computed, token redacted): ${sdkWsEndpoint}?access_token=<redacted>`);
    // The config the SDK folds into the BidiGenerateContentSetup frame it sends
    // right after the socket opens (diagnostic items 4 & 5). Voice / system
    // instruction / transcription are LOCKED in the token, so they are absent
    // here on purpose. The SDK prefixes the model with "models/" in the frame.
    console.log(
      `[Live] expected setup frame → setup={ model:"models/${model}", generationConfig:{ responseModalities:["AUDIO"] }, sessionResumption:{} }`,
    );

    console.log(`[Live] connect() called — model=${model} api=${apiVersion} voice=${voice}`);
    let session: Session;
    try {
      session = await ai.live.connect({
        model,
        // Minimal, documented connect config. Voice, system instruction and
        // transcription are LOCKED in the ephemeral token server-side, so we do
        // NOT resend them here — this subset-of-locked setup is what lets
        // gemini-3.8-live return setupComplete instead of stalling.
        config: {
          responseModalities: [Modality.AUDIO],
          sessionResumption: {},
        },
        callbacks: {
          onopen: () => {
            this.open = true;
            console.log('[Live] websocket OPENED (waiting for setupComplete)…');
            this.cb.onOpen?.();
          },
          onmessage: (msg: LiveServerMessage) => this.route(msg),
          onerror: (e: ErrorEvent) => {
            const m = this.safeError(e);
            console.log(`[Live] onerror: ${m}`);
            this.cb.onError?.(m || 'Gemini Live connection error.');
          },
          onclose: (e: CloseEvent) => {
            this.open = false;
            const info: LiveCloseInfo = {
              code: e?.code ?? 0,
              reason: e?.reason ?? '',
              wasClean: e?.wasClean ?? false,
            };
            console.log(
              `[Live] onclose: code=${info.code} reason=${info.reason || '(none)'} clean=${info.wasClean}`,
            );
            this.cb.onClose?.(info);
          },
        },
      });
    } catch (err) {
      const m = this.safeError(err);
      console.log(`[Live] connect() threw: ${m}`);
      throw new Error(m || 'Gemini Live connection failed.');
    }

    this.session = session;
    if (signal?.aborted) {
      try {
        session.close();
      } catch {
        /* ignore */
      }
      throw new Error('Live connection was cancelled.');
    }
  }

  /** Stream one base64 Int16-LE PCM chunk (16 kHz mono) up to the model. */
  sendAudio(base64: string): void {
    if (!this.connected) return;
    try {
      this.session?.sendRealtimeInput({ audio: { data: base64, mimeType: INPUT_MIME } });
    } catch {
      this.cb.onError?.('Failed to send audio to Gemini Live.');
    }
  }

  /** Signal that the current run of mic audio has ended (optional). */
  sendAudioStreamEnd(): void {
    if (!this.connected) return;
    try {
      this.session?.sendRealtimeInput({ audioStreamEnd: true });
    } catch {
      /* ignore */
    }
  }

  /** Send a typed text turn (fallback when the user prefers not to speak). */
  sendText(text: string): void {
    if (!this.connected) return;
    try {
      this.session?.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    } catch {
      this.cb.onError?.('Failed to send text to Gemini Live.');
    }
  }

  /** Route one decoded server message to the right callback. */
  private route(msg: LiveServerMessage): void {
    // SAFE per-message diagnostic (item 2): top-level keys, setupComplete
    // presence and any error code/status/message only — NEVER audio bytes,
    // transcript text, or the system prompt.
    console.log(`[Live] server message: ${this.summarizeMessage(msg)}`);
    if (msg.setupComplete) {
      this.setupDone = true;
      console.log('[Live] setupComplete RECEIVED — session is live');
      this.cb.onSetupComplete?.();
      return;
    }
    if (msg.goAway) {
      this.cb.onGoAway?.(this.parseDurationMs(msg.goAway.timeLeft));
      return;
    }
    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.interrupted) this.cb.onInterrupted?.();
    if (sc.inputTranscription?.text) this.cb.onInputTranscript?.(sc.inputTranscription.text);
    if (sc.outputTranscription?.text) this.cb.onOutputTranscript?.(sc.outputTranscription.text);

    const parts = sc.modelTurn?.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) {
        const inline = p?.inlineData;
        if (inline?.data) {
          const mime = inline.mimeType || '';
          this.lastMimeType = mime;
          const rate = parseRateFromMime(mime, DEFAULT_OUTPUT_RATE);
          this.cb.onAudioChunk?.(inline.data, rate, mime);
        }
      }
    }
    if (sc.turnComplete) this.cb.onTurnComplete?.();
  }

  /** Parse a protobuf Duration ("10s", "9.5s") or number of seconds → ms. */
  private parseDurationMs(v: string | number | undefined): number | null {
    if (typeof v === 'number') return Math.round(v * 1000);
    if (typeof v === 'string') {
      const m = /^([\d.]+)s?$/.exec(v.trim());
      if (m) return Math.round(parseFloat(m[1]) * 1000);
    }
    return null;
  }

  /** Safe one-line summary of a server frame — shapes only, never content. */
  private summarizeMessage(msg: LiveServerMessage): string {
    const record = msg as unknown as Record<string, unknown>;
    const parts: string[] = [`keys=[${Object.keys(record).join(', ') || '(none)'}]`];
    if (msg.setupComplete) parts.push('setupComplete=YES');
    const err = record['error'];
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      parts.push(
        `error={code:${String(e['code'])}, status:${String(e['status'])}, message:${this.redact(String(e['message'] ?? ''))}}`,
      );
    }
    const sc = msg.serverContent;
    if (sc) {
      const sub: string[] = [];
      if (sc.modelTurn) sub.push('modelTurn');
      if (sc.inputTranscription) sub.push('inputTranscription');
      if (sc.outputTranscription) sub.push('outputTranscription');
      if (sc.interrupted) sub.push('interrupted');
      if (sc.turnComplete) sub.push('turnComplete');
      parts.push(`serverContent=[${sub.join(', ') || 'empty'}]`);
    }
    if (msg.goAway) parts.push('goAway');
    return parts.join(' ');
  }

  /** Extract a human message from any thrown value, with token/key redacted. */
  private safeError(e: unknown): string {
    let msg = '';
    if (e instanceof Error) msg = e.message;
    else if (typeof e === 'string') msg = e;
    else if (e && typeof e === 'object' && 'message' in e)
      msg = String((e as { message?: unknown }).message ?? '');
    return this.redact(msg || 'unknown error');
  }

  /** Never let the ephemeral token or an API key appear in a log or error. */
  private redact(s: string): string {
    let out = s.replace(/(access_token|key|token)=[^&\s"']+/gi, '$1=<redacted>');
    const tok = this.token?.token;
    if (tok && tok.length > 6) out = out.split(tok).join('<redacted>');
    return out;
  }

  /** Close the session so no further callbacks drive the UI. */
  close(): void {
    this.setupDone = false;
    this.open = false;
    const session = this.session;
    this.session = null;
    if (!session) return;
    try {
      session.close();
    } catch {
      /* ignore */
    }
  }
}
