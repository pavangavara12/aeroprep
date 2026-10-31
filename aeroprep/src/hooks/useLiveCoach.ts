import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachModeId, LiveCoachState, LiveDebugStats, LiveTurn } from '../types';
import { LiveClient } from '../services/liveClient';
import type { LiveCloseInfo } from '../services/liveClient';
import { MicCapture } from '../audio/micCapture';
import { PcmPlaybackEngine } from '../audio/playbackEngine';
import { buildCoachInstruction } from '../components/coach/coachModes';

/* ==========================================================================
   useLiveCoach — the ORCHESTRATOR for the real-time Gemini Live coach.

   Wires three pieces into one state machine:
     • MicCapture         mic → 16 kHz Int16 PCM chunks → client.sendAudio
     • LiveClient         raw WebSocket to Gemini Live (via ephemeral token)
     • PcmPlaybackEngine  model's 24 kHz native-audio chunks → speaker (gapless)

   Responsibilities:
     • token → connect → setup → mic on → playback ready
     • live YOU:/AI: transcript + finalized turn history
     • interruption (barge-in): clear playback queue the instant the server says
       `interrupted`, so the coach never talks over the user
     • unexpected-drop reconnection (bounded)
     • session timer + dev debug stats
     • a LOCAL Test Voice tone (no Gemini) to isolate the speaker pipeline

   Nothing here can be runtime-tested in a headless sandbox (no mic / audio /
   WebSocket); it is verified by static typecheck and exercised in a browser.
   ========================================================================== */

const RECONNECT_MAX = 2;
const RECONNECT_DELAY_MS = 600;
const THINK_DELAY_MS = 550; // silence after the user speaks before "thinking"
// Max time from "start" to the server's setupComplete before we fail LOUDLY.
// Without this, a WebSocket that opens but never acks the setup frame leaves the
// UI stuck on "Connecting…" forever (no error, no close). A healthy Live setup
// completes in well under 3s, so 15s is a safe ceiling.
const CONNECT_TIMEOUT_MS = 15000;

export interface UseLiveCoachOptions {
  initialMode?: CoachModeId;
  onError?: (message: string) => void;
}

export interface LiveCoachApi {
  state: LiveCoachState;
  error: string | null;
  history: LiveTurn[];
  liveYou: string; // in-progress user transcript
  liveCoach: string; // in-progress coach transcript
  elapsedSec: number;
  modeId: CoachModeId;
  setModeId: (id: CoachModeId) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendText: (text: string) => void;
  testVoice: () => Promise<boolean>;
  debug: LiveDebugStats;
  supported: boolean;
}

function detectSupport(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const hasAudio = !!(w.AudioContext || w.webkitAudioContext);
  const hasWs = typeof WebSocket !== 'undefined';
  const hasMic = !!navigator?.mediaDevices?.getUserMedia;
  return hasAudio && hasWs && hasMic;
}

let turnSeq = 0;
const turnId = () => `lt${Date.now().toString(36)}_${(turnSeq++).toString(36)}`;

export function useLiveCoach(options: UseLiveCoachOptions = {}): LiveCoachApi {
  const [state, setState] = useState<LiveCoachState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LiveTurn[]>([]);
  const [liveYou, setLiveYou] = useState('');
  const [liveCoach, setLiveCoach] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [modeId, setModeIdState] = useState<CoachModeId>(options.initialMode ?? 'free');
  const [debug, setDebug] = useState<LiveDebugStats>({
    connection: 'disconnected',
    audioContext: 'none',
    micActive: false,
    inputSampleRate: null,
    outputSampleRate: 24000,
    receivedChunks: 0,
    playedChunks: 0,
    queuedChunks: 0,
    lastMimeType: '',
    lastEvent: 'idle',
  });

  const supported = useRef(detectSupport()).current;

  // Long-lived engine instances (created lazily, reused across reconnects).
  const clientRef = useRef<LiveClient | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<PcmPlaybackEngine | null>(null);

  // Synchronous mirrors + control flags used inside socket callbacks.
  const stateRef = useRef<LiveCoachState>('idle');
  const activeRef = useRef(false); // a session is meant to be running
  const manualStopRef = useRef(false); // user asked to stop → do not reconnect
  const reconnectsRef = useRef(0);
  const everConnectedRef = useRef(false); // reached setupComplete at least once this session
  const modeRef = useRef<CoachModeId>(modeId);
  modeRef.current = modeId;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  // Transcript buffers (refs so socket callbacks always see the latest).
  const youBufRef = useRef('');
  const coachBufRef = useRef('');
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const connectAbortRef = useRef<AbortController | null>(null);
  const lastEventRef = useRef('idle');
  // Connection watchdog so a stalled handshake fails loudly instead of hanging.
  const connectWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsOpenedRef = useRef(false); // did the Live WebSocket actually open?
  const lastWsErrorRef = useRef(''); // last ws-level error text, for diagnostics

  const setPhase = useCallback((next: LiveCoachState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const mark = useCallback((event: string) => {
    lastEventRef.current = event;
  }, []);

  const snapshotDebug = useCallback(() => {
    const client = clientRef.current;
    const mic = micRef.current;
    const pb = playbackRef.current;
    const connMap: Record<LiveCoachState, LiveDebugStats['connection']> = {
      idle: 'disconnected',
      connecting: 'connecting',
      listening: 'connected',
      thinking: 'connected',
      speaking: 'connected',
      interrupted: 'connected',
      reconnecting: 'reconnecting',
      error: 'closed',
      ended: 'closed',
    };
    setDebug({
      connection: connMap[stateRef.current] ?? 'disconnected',
      audioContext: pb ? pb.state : 'none',
      micActive: !!mic?.active,
      inputSampleRate: mic?.inputSampleRate ?? null,
      outputSampleRate: pb?.outputSampleRate ?? 24000,
      receivedChunks: pb?.receivedChunks ?? 0,
      playedChunks: pb?.playedChunks ?? 0,
      queuedChunks: pb?.queuedChunks ?? 0,
      lastMimeType: client?.lastMimeType ?? '',
      lastEvent: lastEventRef.current,
    });
  }, []);

  const clearThinkTimer = useCallback(() => {
    if (thinkTimerRef.current) {
      clearTimeout(thinkTimerRef.current);
      thinkTimerRef.current = null;
    }
  }, []);

  // Push whatever the user has said so far as a finalized "you" turn.
  const flushYou = useCallback(() => {
    const text = youBufRef.current.trim();
    youBufRef.current = '';
    setLiveYou('');
    if (text) setHistory((prev) => [...prev, { id: turnId(), role: 'you', text, timestamp: new Date().toISOString() }]);
  }, []);

  // Push whatever the coach has said so far as a finalized "coach" turn.
  const flushCoach = useCallback(() => {
    const text = coachBufRef.current.trim();
    coachBufRef.current = '';
    setLiveCoach('');
    if (text) setHistory((prev) => [...prev, { id: turnId(), role: 'coach', text, timestamp: new Date().toISOString() }]);
  }, []);

  const stopMic = useCallback(async () => {
    const mic = micRef.current;
    if (mic) await mic.stop();
  }, []);

  const clearConnectWatchdog = useCallback(() => {
    if (connectWatchdogRef.current) {
      clearTimeout(connectWatchdogRef.current);
      connectWatchdogRef.current = null;
    }
  }, []);

  const fail = useCallback(
    (msg: string) => {
      if (stateRef.current === 'error') return; // already failed — don't overwrite/loop
      clearThinkTimer();
      clearConnectWatchdog();
      activeRef.current = false;
      manualStopRef.current = true;
      connectAbortRef.current?.abort();
      playbackRef.current?.clear();
      void stopMic();
      try {
        clientRef.current?.close();
      } catch {
        /* ignore */
      }
      setError(msg);
      setPhase('error');
      mark('error');
      onErrorRef.current?.(msg);
      snapshotDebug();
    },
    [clearThinkTimer, clearConnectWatchdog, stopMic, setPhase, mark, snapshotDebug],
  );

  // Arm the connection watchdog. If the session hasn't reached setupComplete by
  // CONNECT_TIMEOUT_MS, fail with a precise, differentiated reason instead of
  // hanging on "Connecting…" indefinitely.
  const armConnectWatchdog = useCallback(() => {
    clearConnectWatchdog();
    connectWatchdogRef.current = setTimeout(() => {
      if (stateRef.current !== 'connecting' && stateRef.current !== 'reconnecting') return;
      if (!activeRef.current || manualStopRef.current) return;
      const secs = Math.round(CONNECT_TIMEOUT_MS / 1000);
      const base = wsOpenedRef.current
        ? `Connected to Gemini Live, but it never confirmed the session (no “setup complete” within ${secs}s). Open the browser console and read the “[Live]” lines: an “onclose code=… reason=…” or “onerror” line names the cause. If there is none, the Live model may be unavailable to your API key — from the aeroprep folder run “npm run models” and confirm GEMINI_LIVE_MODEL in .env is one it lists. Make sure @google/genai is installed (“npm install”) and restart “npm run dev”.`
        : `Couldn’t open a Gemini Live connection within ${secs}s. Check that the AI server is running (npm run dev), that your network allows secure WebSocket connections to Google, and that GEMINI_API_KEY is set on the server.`;
      const wsErr = lastWsErrorRef.current;
      fail(wsErr ? `${base} (last socket error: ${wsErr})` : base);
    }, CONNECT_TIMEOUT_MS);
  }, [clearConnectWatchdog, fail]);

  // ---- Streaming event handlers (all identity-stable) --------------------

  const handleAudioChunk = useCallback((base64: string, rate: number) => {
    mark('audio-chunk');
    playbackRef.current?.enqueue(base64, rate);
  }, [mark]);

  const handleInput = useCallback(
    (t: string) => {
      mark('input-transcript');
      clearThinkTimer();
      youBufRef.current += t;
      setLiveYou(youBufRef.current);
      if (stateRef.current !== 'speaking') setPhase('listening');
      // If the user goes quiet without the model replying yet, show "thinking".
      thinkTimerRef.current = setTimeout(() => {
        if (stateRef.current === 'listening' && (playbackRef.current?.queuedChunks ?? 0) === 0) {
          setPhase('thinking');
        }
      }, THINK_DELAY_MS);
    },
    [mark, clearThinkTimer, setPhase],
  );

  const handleOutput = useCallback(
    (t: string) => {
      mark('output-transcript');
      clearThinkTimer();
      if (youBufRef.current.trim()) flushYou();
      coachBufRef.current += t;
      setLiveCoach(coachBufRef.current);
    },
    [mark, clearThinkTimer, flushYou],
  );

  const handleInterrupted = useCallback(() => {
    mark('interrupted');
    clearThinkTimer();
    playbackRef.current?.clear();
    flushCoach(); // keep whatever the coach managed to say
    setPhase('interrupted');
    // The user is now the active speaker; return to listening promptly.
    setTimeout(() => {
      if (stateRef.current === 'interrupted') setPhase('listening');
    }, 250);
  }, [mark, clearThinkTimer, flushCoach, setPhase]);

  const handleTurnComplete = useCallback(() => {
    mark('turn-complete');
    if (youBufRef.current.trim()) flushYou();
    flushCoach();
    if (stateRef.current !== 'speaking' && (playbackRef.current?.queuedChunks ?? 0) === 0) {
      setPhase('listening');
    }
  }, [mark, flushYou, flushCoach, setPhase]);

  const handleFirstAudio = useCallback(() => {
    clearThinkTimer();
    if (youBufRef.current.trim()) flushYou(); // user's turn is over once the coach speaks
    setPhase('speaking');
    mark('speaking');
    snapshotDebug();
  }, [clearThinkTimer, flushYou, setPhase, mark, snapshotDebug]);

  const handleDrained = useCallback(() => {
    if (stateRef.current === 'speaking' || stateRef.current === 'thinking') setPhase('listening');
    mark('drained');
    snapshotDebug();
  }, [setPhase, mark, snapshotDebug]);

  const handleGoAway = useCallback(
    (ms: number | null) => {
      mark(`go-away${ms != null ? ` (${Math.round(ms / 1000)}s)` : ''}`);
    },
    [mark],
  );

  const handleClientError = useCallback(
    (msg: string) => {
      // ws-level errors are usually followed by onClose (which drives reconnect
      // or fail); record the text so the watchdog / debug panel can surface the
      // exact reason if the connection then stalls or closes.
      lastWsErrorRef.current = msg;
      mark(`ws-error: ${msg}`);
    },
    [mark],
  );

  const startMic = useCallback(async () => {
    let mic = micRef.current;
    if (!mic) {
      mic = new MicCapture();
      micRef.current = mic;
    }
    if (mic.active) return;
    const res = await mic.start((b64) => clientRef.current?.sendAudio(b64));
    if (!res.ok) {
      fail(res.error);
      return;
    }
    snapshotDebug();
  }, [fail, snapshotDebug]);

  const connectOnceRef = useRef<((isReconnect: boolean) => Promise<void>) | null>(null);

  const reconnect = useCallback(() => {
    if (manualStopRef.current || !activeRef.current) return;
    if (reconnectsRef.current >= RECONNECT_MAX) {
      fail('Lost the connection to Gemini Live and could not reconnect. Please start again.');
      return;
    }
    reconnectsRef.current += 1;
    playbackRef.current?.clear();
    setPhase('reconnecting');
    mark(`reconnecting (${reconnectsRef.current}/${RECONNECT_MAX})`);
    snapshotDebug();
    setTimeout(() => {
      if (!activeRef.current || manualStopRef.current) return;
      void connectOnceRef.current?.(true).catch(() => reconnect());
    }, RECONNECT_DELAY_MS);
  }, [fail, setPhase, mark, snapshotDebug]);

  const handleSetupComplete = useCallback(() => {
    mark('setup-complete');
    clearConnectWatchdog(); // session confirmed — stop the stuck-connecting timer
    reconnectsRef.current = 0;
    everConnectedRef.current = true; // a real session is up → reconnects are now allowed
    setPhase('listening');
    void startMic();
    snapshotDebug();
  }, [mark, clearConnectWatchdog, setPhase, startMic, snapshotDebug]);

  const handleClose = useCallback(
    (info?: LiveCloseInfo) => {
      // Only reaches here on an UNEXPECTED drop (manual close detaches handlers).
      if (manualStopRef.current || !activeRef.current) return;
      // If we never reached a working session, do NOT loop: reconnecting would
      // just mint another one-use ephemeral token for a connection that can't
      // succeed. Fail once, cleanly, with a single token spent — and surface the
      // exact close code/reason so the real cause is visible.
      if (!everConnectedRef.current) {
        const detail =
          info && (info.code || info.reason)
            ? ` (code=${info.code}${info.reason ? ` ${info.reason}` : ''})`
            : '';
        fail(
          `Gemini Live closed the connection before the session started${detail}. This usually means the configured Live model is unavailable to your API key — from the aeroprep folder run “npm run models”, set GEMINI_LIVE_MODEL in .env to a model it lists, then restart “npm run dev”.`,
        );
        return;
      }
      reconnect();
    },
    [reconnect, fail],
  );

  const ensureEngines = useCallback(() => {
    if (!playbackRef.current) {
      playbackRef.current = new PcmPlaybackEngine(24000, {
        onStateChange: () => snapshotDebug(),
        onDrained: handleDrained,
        onFirstAudio: handleFirstAudio,
      });
    }
    if (!clientRef.current) {
      clientRef.current = new LiveClient({
        onOpen: () => {
          wsOpenedRef.current = true;
          mark('ws-open');
        },
        onSetupComplete: handleSetupComplete,
        onAudioChunk: (b64, rate) => handleAudioChunk(b64, rate),
        onInputTranscript: handleInput,
        onOutputTranscript: handleOutput,
        onInterrupted: handleInterrupted,
        onTurnComplete: handleTurnComplete,
        onGoAway: handleGoAway,
        onClose: (info) => handleClose(info),
        onError: handleClientError,
      });
    }
  }, [
    snapshotDebug,
    handleDrained,
    handleFirstAudio,
    handleSetupComplete,
    handleAudioChunk,
    handleInput,
    handleOutput,
    handleInterrupted,
    handleTurnComplete,
    handleGoAway,
    handleClose,
    handleClientError,
    mark,
  ]);

  const connectOnce = useCallback(
    async (isReconnect: boolean) => {
      ensureEngines();
      const client = clientRef.current;
      if (!client) throw new Error('Live engine unavailable.');
      const ac = new AbortController();
      connectAbortRef.current = ac;
      // Fresh attempt → reset per-connect diagnostics and arm the watchdog so a
      // token-POST / WS-open / setup stall can never hang on "Connecting…".
      wsOpenedRef.current = false;
      lastWsErrorRef.current = '';
      armConnectWatchdog();
      if (!isReconnect) {
        // First connect must be resumed from the user gesture so audio can play.
        await playbackRef.current?.resume();
      }
      await client.connect({ systemInstruction: buildCoachInstruction(modeRef.current) }, ac.signal);
    },
    [ensureEngines, armConnectWatchdog],
  );
  connectOnceRef.current = connectOnce;

  // ---- Public API --------------------------------------------------------

  const start = useCallback(async () => {
    if (!supported) {
      fail('This browser can’t run the live voice coach — it needs a microphone, WebSocket, and Web Audio support.');
      return;
    }
    if (activeRef.current) return;

    setError(null);
    setHistory([]);
    youBufRef.current = '';
    coachBufRef.current = '';
    setLiveYou('');
    setLiveCoach('');
    playbackRef.current?.resetCounters();
    reconnectsRef.current = 0;
    everConnectedRef.current = false;
    manualStopRef.current = false;
    activeRef.current = true;
    setElapsedSec(0);
    startedAtRef.current = Date.now();
    setPhase('connecting');
    mark('connecting');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      snapshotDebug();
    }, 1000);

    try {
      await connectOnce(false);
    } catch (e) {
      if (!manualStopRef.current) fail((e as Error)?.message || 'Gemini Live connection failed.');
    }
  }, [supported, fail, setPhase, mark, snapshotDebug, connectOnce]);

  const stop = useCallback(async () => {
    manualStopRef.current = true;
    activeRef.current = false;
    clearThinkTimer();
    clearConnectWatchdog();
    connectAbortRef.current?.abort();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    flushCoach();
    flushYou();
    playbackRef.current?.clear();
    await stopMic();
    try {
      clientRef.current?.close();
    } catch {
      /* ignore */
    }
    setPhase('ended');
    mark('ended');
    snapshotDebug();
  }, [clearThinkTimer, clearConnectWatchdog, flushCoach, flushYou, stopMic, setPhase, mark, snapshotDebug]);

  const sendText = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || !clientRef.current?.connected) return;
      if (youBufRef.current.trim()) flushYou();
      setHistory((prev) => [...prev, { id: turnId(), role: 'you', text: t, timestamp: new Date().toISOString() }]);
      clientRef.current.sendText(t);
      mark('text-sent');
    },
    [flushYou, mark],
  );

  const testVoice = useCallback(async () => {
    ensureEngines();
    const ok = (await playbackRef.current?.playTestTone()) ?? false;
    mark(ok ? 'test-tone' : 'test-tone-failed');
    snapshotDebug();
    return ok;
  }, [ensureEngines, mark, snapshotDebug]);

  const setModeId = useCallback((id: CoachModeId) => setModeIdState(id), []);

  // Tear everything down if the component using the hook unmounts.
  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      activeRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      if (connectWatchdogRef.current) clearTimeout(connectWatchdogRef.current);
      connectAbortRef.current?.abort();
      void micRef.current?.stop();
      try {
        clientRef.current?.close();
      } catch {
        /* ignore */
      }
      void playbackRef.current?.close();
    };
  }, []);

  return {
    state,
    error,
    history,
    liveYou,
    liveCoach,
    elapsedSec,
    modeId,
    setModeId,
    start,
    stop,
    sendText,
    testVoice,
    debug,
    supported,
  };
}






