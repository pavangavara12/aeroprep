import { postJson } from './apiClient';

/* ==========================================================================
   liveDiag.ts — TEMPORARY raw-WebSocket diagnostic for the Gemini Live
   handshake. Remove once the connection is confirmed working.

   Why this exists: @google/genai's ai.live.connect() hides the socket. Reading
   the installed SDK (2.26.0) shows connect() sends ONE BidiGenerateContentSetup
   frame and then AWAITS setupComplete before resolving — so if the server never
   replies, connect() hangs with the socket OPEN and the SDK forwards NO messages
   to our callbacks (it queues them until setupComplete). That is exactly why the
   app logs "websocket OPENED" then total silence. To see what the server really
   does, we open the socket OURSELVES here and log every frame.

   Run from the browser console (with the app open, on the voice screen):
       await window.aeroLiveDiag()

   SAFETY: never logs the token/access_token (URLs are redacted), the API key,
   audio bytes, or transcript/system-prompt text — only message shapes/keys,
   setupComplete presence, and any error/status/close code.
   ========================================================================== */

const WS_BASE = 'wss://generativelanguage.googleapis.com';
const MODEL = 'gemini-3.8-live';
const PER_TRIAL_MS = 8000;

interface DiagToken {
  token: string;
  model: string;
  apiVersion: string;
}

interface Trial {
  label: string;
  mintVersion: 'v1alpha' | 'v1beta';
  connectVersion: 'v1alpha' | 'v1beta';
  method: 'BidiGenerateContentConstrained' | 'BidiGenerateContent';
  note: string;
}

interface DiagResult {
  trial: string;
  minted: boolean;
  setupFrameSent: boolean;
  firstMessageKeys: string | null;
  gotSetupComplete: boolean;
  errorText: string | null;
  closeCode: number | null;
  closeReason: string | null;
  outcome: string;
}

// A small matrix that isolates the two unknowns the user flagged: the connect
// API version (SDK warns v1alpha; Google docs show v1beta) and whether a
// v1beta token mint even works. All use the Constrained method (ephemeral).
const TRIALS: Trial[] = [
  { label: 'A', mintVersion: 'v1alpha', connectVersion: 'v1alpha', method: 'BidiGenerateContentConstrained', note: 'SDK default' },
  { label: 'B', mintVersion: 'v1alpha', connectVersion: 'v1beta', method: 'BidiGenerateContentConstrained', note: 'docs: v1beta connect, v1alpha-minted token' },
  { label: 'C', mintVersion: 'v1beta', connectVersion: 'v1beta', method: 'BidiGenerateContentConstrained', note: 'all v1beta' },
];

function redact(url: string): string {
  return url.replace(/access_token=[^&]+/i, 'access_token=<redacted>').replace(/([?&]key=)[^&]+/i, '$1<redacted>');
}

function keysOf(o: unknown): string {
  if (!o || typeof o !== 'object') return `(non-object: ${typeof o})`;
  const k = Object.keys(o as Record<string, unknown>);
  return k.length ? k.join(', ') : '(empty object)';
}

async function decode(data: unknown): Promise<Record<string, unknown>> {
  let text = '';
  if (typeof data === 'string') text = data;
  else if (typeof Blob !== 'undefined' && data instanceof Blob) text = await data.text();
  else if (data instanceof ArrayBuffer) text = new TextDecoder().decode(data);
  else return { _type: Object.prototype.toString.call(data) };
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : { _value: typeof parsed };
  } catch {
    return { _unparsed: text.slice(0, 120) };
  }
}

/** Safe one-line summary of a server frame — shapes only, never content. */
function summarize(msg: Record<string, unknown>): string {
  const parts: string[] = [`keys=[${keysOf(msg)}]`];
  if ('setupComplete' in msg) parts.push('setupComplete=YES');
  const err = msg['error'];
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    parts.push(`error={code:${String(e['code'])}, status:${String(e['status'])}, message:${String(e['message'])}}`);
  }
  if ('serverContent' in msg) {
    const sc = (msg['serverContent'] || {}) as Record<string, unknown>;
    const sub: string[] = [];
    for (const k of ['modelTurn', 'inputTranscription', 'outputTranscription', 'interrupted', 'turnComplete']) {
      if (sc[k]) sub.push(k);
    }
    parts.push(`serverContent=[${sub.join(', ') || 'empty'}]`);
  }
  if ('goAway' in msg) parts.push('goAway');
  return parts.join(' ');
}

function runTrial(trial: Trial): Promise<DiagResult> {
  const tag = `[Diag ${trial.label}]`;
  const endpoint = `${WS_BASE}/ws/google.ai.generativelanguage.${trial.connectVersion}.GenerativeService.${trial.method}`;
  const result: DiagResult = {
    trial: `${trial.label}: mint ${trial.mintVersion} → connect ${trial.connectVersion}/${trial.method} (${trial.note})`,
    minted: false,
    setupFrameSent: false,
    firstMessageKeys: null,
    gotSetupComplete: false,
    errorText: null,
    closeCode: null,
    closeReason: null,
    outcome: 'pending',
  };

  return new Promise<DiagResult>((resolve) => {
    void (async () => {
      console.log(`${tag} ===== ${result.trial} =====`);
      let tok: DiagToken;
      try {
        tok = await postJson<DiagToken>('/api/live-token', { diag: true, apiVersion: trial.mintVersion });
        result.minted = true;
        console.log(`${tag} minimal token minted (model=${tok.model} mintApi=${tok.apiVersion} tokenLen=${tok.token.length})`);
      } catch (err) {
        result.errorText = (err as Error)?.message || 'mint failed';
        result.outcome = 'token mint FAILED';
        console.log(`${tag} token mint FAILED — ${result.errorText}`);
        resolve(result);
        return;
      }
      const url = `${endpoint}?access_token=${tok.token}`;
      console.log(`${tag} WS endpoint: ${redact(url)}`);

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        result.errorText = (err as Error)?.message || 'ctor threw';
        result.outcome = 'WebSocket constructor threw';
        console.log(`${tag} WebSocket constructor threw — ${result.errorText}`);
        resolve(result);
        return;
      }

      let settled = false;
      let msgCount = 0;
      const finish = (outcome: string): void => {
        if (settled) return;
        settled = true;
        result.outcome = outcome;
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        console.log(`${tag} RESULT: ${outcome}`);
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish(result.setupFrameSent ? 'SILENT — setup sent, NO reply, NO close' : 'SILENT — socket never opened');
      }, PER_TRIAL_MS);

      ws.onopen = (): void => {
        console.log(`${tag} websocket OPENED`);
        const setupFrame = {
          setup: { model: `models/${MODEL}`, generationConfig: { responseModalities: ['AUDIO'] }, sessionResumption: {} },
        };
        try {
          ws.send(JSON.stringify(setupFrame));
          result.setupFrameSent = true;
          console.log(`${tag} setup frame SENT: ${JSON.stringify(setupFrame)}`);
        } catch (err) {
          console.log(`${tag} setup frame send FAILED — ${(err as Error)?.message}`);
        }
      };

      ws.onmessage = (ev: MessageEvent): void => {
        void (async () => {
          msgCount += 1;
          const msg = await decode(ev.data);
          if (result.firstMessageKeys === null) result.firstMessageKeys = keysOf(msg);
          console.log(`${tag} server message #${msgCount}: ${summarize(msg)}`);
          if ('setupComplete' in msg) {
            result.gotSetupComplete = true;
            finish('SUCCESS — setupComplete received');
          } else if (msg['error']) {
            result.errorText = summarize(msg);
            finish('ERROR frame received');
          }
        })();
      };

      ws.onerror = (): void => {
        console.log(`${tag} onerror (browsers hide WS error detail; see onclose code)`);
      };

      ws.onclose = (ev: CloseEvent): void => {
        result.closeCode = ev.code;
        result.closeReason = ev.reason || '(none)';
        console.log(`${tag} onclose: code=${ev.code} reason=${ev.reason || '(none)'} clean=${ev.wasClean}`);
        finish(result.gotSetupComplete ? 'SUCCESS' : `CLOSED code=${ev.code} reason=${ev.reason || '(none)'}`);
      };

    })();
  });
}

export async function runLiveDiagnostics(): Promise<DiagResult[]> {
  console.log('[Diag] ===== Gemini Live raw-WebSocket diagnostic =====');
  console.log('[Diag] Goal: find which version/method actually returns setupComplete for the installed SDK + current service.');
  const results: DiagResult[] = [];
  for (const trial of TRIALS) {
    results.push(await runTrial(trial));
  }
  console.log('[Diag] ===== SUMMARY =====');
  for (const r of results) {
    console.log(
      `[Diag] ${r.trial}\n        → ${r.outcome}` +
        (r.firstMessageKeys ? ` | 1st-msg keys=[${r.firstMessageKeys}]` : '') +
        (r.closeCode !== null ? ` | close=${r.closeCode}/${r.closeReason}` : '') +
        (r.errorText ? ` | err=${r.errorText}` : ''),
    );
  }
  const win = results.find((r) => r.gotSetupComplete);
  console.log(
    win
      ? `[Diag] ✅ WINNER: "${win.trial}" returned setupComplete — switch production to this version/method.`
      : '[Diag] ❌ No endpoint returned setupComplete. Read the close codes above: ' +
          '1007/1011 = bad setup/model; 1008 = auth/token; 403/404 = wrong path or version not served; ' +
          '"SILENT" = the method was accepted at the edge but never routed to a Live handler (wrong method/version for this service).',
  );
  return results;
}

declare global {
  interface Window {
    aeroLiveDiag?: () => Promise<DiagResult[]>;
  }
}

if (typeof window !== 'undefined') {
  window.aeroLiveDiag = runLiveDiagnostics;
}
