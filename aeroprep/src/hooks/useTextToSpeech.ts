import { useCallback, useEffect, useRef, useState } from 'react';
import * as tts from '../services/ttsService';

/* ==========================================================================
   useTextToSpeech — thin React wrapper over ttsService. Tracks a `speaking`
   flag for the UI, exposes speak / stop / replay, and guarantees playback is
   torn down on unmount (StrictMode-safe via a mounted ref). The heavy lifting
   (cloud TTS → WAV, browser fallback, single-active-utterance) lives in the
   service so the state machine stays simple.
   ========================================================================== */

export interface TtsSpeakOptions {
  voice?: string;
  signal?: AbortSignal;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: Error) => void;
  onFallback?: () => void;
}

export function useTextToSpeech() {
  const supported = tts.isAnyTtsSupported();
  const [speaking, setSpeaking] = useState(false);
  const [canReplay, setCanReplay] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tts.stopSpeaking();
    };
  }, []);

  const speak = useCallback(async (text: string, opts?: TtsSpeakOptions): Promise<void> => {
    if (!text || !text.trim()) return;
    await tts.speak(text, {
      voice: opts?.voice,
      signal: opts?.signal,
      onStart: () => {
        if (mountedRef.current) setSpeaking(true);
        opts?.onStart?.();
      },
      onEnd: () => {
        if (mountedRef.current) {
          setSpeaking(false);
          setCanReplay(tts.hasReplayable());
        }
        opts?.onEnd?.();
      },
      onError: (e) => {
        if (mountedRef.current) setSpeaking(false);
        opts?.onError?.(e);
      },
      onFallback: () => {
        if (mountedRef.current) setUsedFallback(true);
        opts?.onFallback?.();
      },
    });
  }, []);

  const replay = useCallback(async (): Promise<void> => {
    if (!tts.hasReplayable()) return;
    await tts.replayLast({
      onStart: () => mountedRef.current && setSpeaking(true),
      onEnd: () => mountedRef.current && setSpeaking(false),
      onError: () => mountedRef.current && setSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    tts.stopSpeaking();
    if (mountedRef.current) setSpeaking(false);
  }, []);

  /** Resume the AudioContext from within a user gesture (autoplay policy). */
  const unlock = useCallback(async (): Promise<boolean> => {
    return tts.unlockAudio();
  }, []);

  /** Play a known phrase through the whole pipeline to isolate playback issues. */
  const testVoice = useCallback(async (): Promise<void> => {
    await tts.testVoice({
      onStart: () => {
        if (mountedRef.current) setSpeaking(true);
      },
      onEnd: () => {
        if (mountedRef.current) {
          setSpeaking(false);
          setCanReplay(tts.hasReplayable());
        }
      },
      onError: () => {
        if (mountedRef.current) setSpeaking(false);
      },
      onFallback: () => {
        if (mountedRef.current) setUsedFallback(true);
      },
    });
  }, []);

  return { supported, speaking, canReplay, usedFallback, speak, replay, stop, unlock, testVoice };
}
