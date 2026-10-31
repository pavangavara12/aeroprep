import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantState, SpeechMetrics } from '../types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';

/* ==========================================================================
   useVoiceAssistant — the conversation ORCHESTRATOR and explicit state
   machine that ties the mic (useSpeechRecognition), the brain (a caller-
   supplied `respond` fn), and the voice (useTextToSpeech) together.

   States: idle · listening · processing · speaking · paused · error · completed

   Race-safety (all called out in the spec) is enforced with refs:
     • busyRef      → never process two answers at once / never double-submit
     • turnRef      → a monotonic turn id; stale AI replies & audio are dropped
                      so an old response can't speak over a newer one
     • stateRef     → synchronous mirror of state for guards inside callbacks
   The hook is generic: the AI Interviewer and the AI Coach both use it, each
   supplying its own `respond` (which also records the transcript turns).
   ========================================================================== */

export interface VoiceReply {
  text: string; // what the assistant should say / the caller shows
  end?: boolean; // when true → COMPLETED after this line is spoken
  speak?: boolean; // default true; false → skip TTS (caller still displays it)
}

export interface UseVoiceAssistantOptions {
  /** Produce the assistant's reply for a finalized user utterance. */
  respond: (userText: string, metrics: SpeechMetrics | null) => Promise<VoiceReply>;
  /** After the assistant finishes speaking, auto-open the mic (interview feel). */
  autoListen?: boolean;
  /** Answers shorter than this (chars) are treated as "didn't catch that". */
  minAnswerChars?: number;
  /** Optional named cloud voice override. */
  voice?: string;
  /** Notified as soon as a user utterance is finalized (to append to a transcript). */
  onUserTranscript?: (text: string, metrics: SpeechMetrics | null) => void;
  /** Notified on every state transition. */
  onStateChange?: (state: AssistantState) => void;
}

export function useVoiceAssistant(opts: UseVoiceAssistantOptions) {
  const { autoListen = false, minAnswerChars = 2, voice } = opts;

  const [state, setStateRaw] = useState<AssistantState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const stateRef = useRef<AssistantState>('idle');
  const turnRef = useRef(0);
  const busyRef = useRef(false);
  const mutedRef = useRef(false);
  const respondRef = useRef(opts.respond);
  const onUserTranscriptRef = useRef(opts.onUserTranscript);
  const onStateChangeRef = useRef(opts.onStateChange);
  // Forward ref so onMaxDuration (created before stopListening) can reach it.
  const stopListeningRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    respondRef.current = opts.respond;
    onUserTranscriptRef.current = opts.onUserTranscript;
    onStateChangeRef.current = opts.onStateChange;
  });

  const setState = useCallback((s: AssistantState) => {
    stateRef.current = s;
    setStateRaw(s);
    onStateChangeRef.current?.(s);
  }, []);

  // Auto-stop the mic if the safety cap is hit, so we never hang on "Listening".
  const onMaxDuration = useCallback(() => {
    if (stateRef.current === 'listening') void stopListeningRef.current?.();
  }, []);

  const sr = useSpeechRecognition({ onMaxDuration });
  const tts = useTextToSpeech();

  const micSupported = sr.supported;
  const voiceSupported = tts.supported;

  /** Open the mic and move to LISTENING (with guards against double sessions). */
  const beginListening = useCallback(async (): Promise<void> => {
    if (stateRef.current === 'listening' || busyRef.current) return;
    if (!micSupported) {
      setState('idle');
      return;
    }
    // Runs from a user gesture (tap "Answer") → unlock audio playback now so the
    // assistant's spoken reply isn't blocked by the browser autoplay policy.
    void tts.unlock();
    setError(null);
    setState('listening');
    const outcome = await sr.start();
    if (!outcome.ok) {
      setError(outcome.error);
      setState('error');
    }
  }, [micSupported, sr, tts, setState]);

  /** Speak an assistant line, then decide the next state. `turn` gates staleness. */
  const speakReply = useCallback(
    async (
      text: string,
      turn: number,
      o: { end?: boolean; speak?: boolean; allowListen?: boolean },
    ): Promise<void> => {
      setState('speaking');
      const shouldSpeak = !mutedRef.current && voiceSupported && o.speak !== false && !!text.trim();
      if (shouldSpeak) {
        try {
          await tts.speak(text, { voice });
        } catch {
          /* playback errors are non-fatal — treat as finished */
        }
      }
      if (turn !== turnRef.current) return; // a newer turn began — drop this tail
      if (o.end) {
        setState('completed');
        return;
      }
      if (o.allowListen && autoListen && micSupported && !mutedRef.current) {
        void beginListening();
      } else {
        setState('idle');
      }
    },
    [voiceSupported, tts, voice, autoListen, micSupported, beginListening, setState],
  );

  /** Run one user→assistant turn: show transcript, get reply, speak it. */
  const processTurn = useCallback(
    async (text: string, metrics: SpeechMetrics | null, turn: number): Promise<void> => {
      busyRef.current = true;
      setState('processing');
      onUserTranscriptRef.current?.(text, metrics);
      let reply: VoiceReply | null = null;
      try {
        reply = await respondRef.current(text, metrics);
      } catch {
        busyRef.current = false;
        if (turn !== turnRef.current) return;
        setError('The AI service had trouble responding. Please retry.');
        setState('error');
        return;
      }
      busyRef.current = false;
      if (turn !== turnRef.current) return; // ended / paused / superseded mid-flight
      const safeText = reply && typeof reply.text === 'string' && reply.text.trim() ? reply.text.trim() : 'Let’s continue.';
      await speakReply(safeText, turn, { end: reply?.end, speak: reply?.speak, allowListen: true });
    },
    [setState, speakReply],
  );

  /** Stop the mic → transcribe → process. Owns the turn for the whole sequence. */
  const stopListening = useCallback(async (): Promise<void> => {
    if (stateRef.current !== 'listening') return;
    const turn = ++turnRef.current;
    setState('processing');
    const outcome = await sr.stop();
    if (turn !== turnRef.current) return; // ended/paused during transcription
    if (!outcome.ok) {
      setError(outcome.error);
      setState('error');
      return;
    }
    const text = outcome.transcript.trim();
    if (text.length < minAnswerChars) {
      setError("I didn't catch that. Please try answering again, or type your response.");
      setState('error');
      return;
    }
    await processTurn(text, outcome.metrics, turn);
  }, [sr, minAnswerChars, processTurn, setState]);

  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  /** Assistant-initiated line (greeting, first question, transitions). */
  const say = useCallback(
    async (text: string, o?: { end?: boolean; autoListenAfter?: boolean }): Promise<void> => {
      const clean = (text || '').trim();
      if (!clean) return;
      const turn = ++turnRef.current;
      await speakReply(clean, turn, {
        end: o?.end,
        speak: true,
        allowListen: o?.autoListenAfter ?? autoListen,
      });
    },
    [speakReply, autoListen],
  );

  /** Text fallback — submit a typed answer (no mic needed). */
  const submitText = useCallback(
    async (raw: string): Promise<void> => {
      const text = (raw || '').trim();
      if (!text || busyRef.current) return;
      if (stateRef.current === 'listening') sr.cancel();
      void tts.unlock(); // user gesture (tap Send) → unlock audio for the reply
      setError(null);
      const turn = ++turnRef.current;
      await processTurn(text, null, turn);
    },
    [sr, tts, processTurn],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (next) {
        tts.stop();
        if (stateRef.current === 'speaking') setState('idle');
      }
      return next;
    });
  }, [tts, setState]);

  const pause = useCallback(() => {
    turnRef.current++; // invalidate any in-flight sequence
    busyRef.current = false;
    if (stateRef.current === 'listening') sr.cancel();
    tts.stop();
    setState('paused');
  }, [sr, tts, setState]);

  const resume = useCallback(() => {
    if (stateRef.current === 'paused') setState('idle');
  }, [setState]);

  const end = useCallback(() => {
    turnRef.current++;
    busyRef.current = false;
    sr.cancel();
    tts.stop();
    setState('completed');
  }, [sr, tts, setState]);

  const retry = useCallback(() => {
    setError(null);
    sr.reset();
    if (micSupported && !mutedRef.current) void beginListening();
    else setState('idle');
  }, [sr, micSupported, beginListening, setState]);

  const reset = useCallback(() => {
    turnRef.current++;
    busyRef.current = false;
    sr.cancel();
    tts.stop();
    setError(null);
    setState('idle');
  }, [sr, tts, setState]);

  const replay = useCallback(async (): Promise<void> => {
    const prev = stateRef.current;
    if (prev !== 'idle' && prev !== 'completed') return;
    const turn = ++turnRef.current;
    if (prev === 'idle') setState('speaking');
    await tts.replay();
    if (turn !== turnRef.current) return;
    if (prev === 'idle') setState('idle');
  }, [tts, setState]);

  /** Barge-in: cut off the assistant mid-sentence and (in interview mode) listen. */
  const interrupt = useCallback(() => {
    if (stateRef.current !== 'speaking') return;
    tts.stop();
    turnRef.current++; // drop the tail of the interrupted reply
    if (autoListen && micSupported && !mutedRef.current) void beginListening();
    else setState('idle');
  }, [tts, autoListen, micSupported, beginListening, setState]);

  /** Resume the AudioContext from a user gesture (for the Test Voice button). */
  const unlock = useCallback(async (): Promise<boolean> => tts.unlock(), [tts]);

  /**
   * Diagnostic: play a known phrase through the whole TTS pipeline. Runs
   * independently of a turn but shows "Speaking…" so the user gets feedback,
   * and is race-safe (a newer turn cancels the restore-to-idle).
   */
  const testVoice = useCallback(async (): Promise<void> => {
    await tts.unlock();
    const turn = ++turnRef.current;
    busyRef.current = false;
    if (stateRef.current === 'listening') sr.cancel();
    tts.stop();
    setError(null);
    setState('speaking');
    await tts.testVoice();
    if (turn !== turnRef.current) return;
    setState('idle');
  }, [tts, sr, setState]);

  return {
    state,
    error: error || sr.error,
    liveTranscript: sr.liveTranscript,
    isRecording: sr.isRecording,
    isMuted,
    micSupported,
    voiceSupported,
    liveSupported: sr.liveSupported,
    canReplay: tts.canReplay,
    usedVoiceFallback: tts.usedFallback,
    // controls
    startListening: beginListening,
    stopListening,
    submitText,
    say,
    toggleMute,
    pause,
    resume,
    end,
    replay,
    interrupt,
    retry,
    reset,
    unlock,
    testVoice,
  };
}

/** The full API surface returned by useVoiceAssistant (for prop typing). */
export type VoiceAssistantApi = ReturnType<typeof useVoiceAssistant>;




