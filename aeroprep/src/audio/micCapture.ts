import { float32ToPcm16, bytesToBase64, resampleFloat32 } from './pcm';

/* ==========================================================================
   micCapture.ts — capture the microphone and stream it to Gemini Live in the
   exact format the API expects: mono, signed-16-bit little-endian PCM at
   16 kHz, in small ~30 ms realtime chunks (NOT one big buffer at the end).

     getUserMedia → AudioWorklet (off-thread) → resample HW rate → 16 kHz
                  → Int16 LE → base64 → onChunk(...)  (~every 30 ms)

   An AudioWorklet is used when available (modern, low-latency, off the main
   thread); a ScriptProcessorNode is the universal fallback. The mic graph is
   routed through a MUTED gain node so it never feeds back to the speakers.
   ========================================================================== */

const TARGET_RATE = 16000;
const CHUNK_MS = 30; // 20–40 ms realtime chunks

export type MicStartResult = { ok: true } | { ok: false; error: string };

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

// Inline AudioWorklet: forwards each 128-sample render quantum to the main
// thread. Kept as a string + Blob URL so there's no separate build entry.
const WORKLET_SRC = `
class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) this.port.postMessage(input[0].slice(0));
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

function micErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone permission was denied. Allow mic access in your browser and try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No microphone was found. Connect a mic and try again.';
  if (name === 'NotReadableError')
    return 'Your microphone is in use by another app. Close it and try again.';
  return 'Could not start the microphone. Check your browser permissions and try again.';
}

/**
 * Captures the mic and emits base64 Int16-LE PCM chunks at 16 kHz.
 * One instance per live session; call start() once, stop() to tear down.
 */
export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null; // muted, keeps the graph pulling
  private blobUrl: string | null = null;

  private onChunk: ((base64: string) => void) | null = null;
  private buffer: Float32Array = new Float32Array(0);
  private inRate = 0;
  private samplesPerChunk = 0; // at the HARDWARE rate; we slice then resample

  private started = false;

  /** True once audio is actually flowing. */
  get active(): boolean {
    return this.started;
  }

  /** Hardware capture rate (44100/48000…) — null until start() succeeds. */
  get inputSampleRate(): number | null {
    return this.inRate || null;
  }

  /**
   * Request the mic and begin streaming ~30 ms base64 PCM chunks to onChunk.
   * Resolves ok:false with a user-facing message on any failure.
   */
  async start(onChunk: (base64: string) => void): Promise<MicStartResult> {
    if (this.started) return { ok: true };
    this.onChunk = onChunk;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, error: 'This browser does not support microphone capture.' };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      return { ok: false, error: micErrorMessage(err) };
    }

    const w = window as WebkitWindow;
    const Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) {
      this.releaseStream();
      return { ok: false, error: 'Web Audio is not available in this browser.' };
    }

    try {
      this.ctx = new Ctor();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      this.releaseStream();
      return { ok: false, error: 'Could not start the audio system for the microphone.' };
    }

    this.inRate = this.ctx.sampleRate;
    this.samplesPerChunk = Math.max(1, Math.round((this.inRate * CHUNK_MS) / 1000));
    this.source = this.ctx.createMediaStreamSource(this.stream);

    // Muted sink so the capture node keeps pulling without audible feedback.
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.sink.connect(this.ctx.destination);

    const usedWorklet = await this.tryWorklet();
    if (!usedWorklet) this.useScriptProcessor();

    this.started = true;
    return { ok: true };
  }

  /** Modern path: off-main-thread AudioWorklet fed by an inline Blob module. */
  private async tryWorklet(): Promise<boolean> {
    if (!this.ctx || !this.source || !this.sink) return false;
    if (!this.ctx.audioWorklet) return false;
    try {
      this.blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
      await this.ctx.audioWorklet.addModule(this.blobUrl);
      this.worklet = new AudioWorkletNode(this.ctx, 'pcm-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      this.worklet.port.onmessage = (ev: MessageEvent) => this.ingest(ev.data as Float32Array);
      this.source.connect(this.worklet);
      this.worklet.connect(this.sink);
      return true;
    } catch {
      // Clean up a half-wired worklet before falling back.
      try {
        this.worklet?.disconnect();
      } catch {
        /* ignore */
      }
      this.worklet = null;
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }
      return false;
    }
  }

  /** Universal fallback: ScriptProcessorNode on the main thread. */
  private useScriptProcessor(): void {
    if (!this.ctx || !this.source || !this.sink) return;
    // 4096 frames ≈ 85 ms at 48 kHz; we re-chunk to 30 ms downstream anyway.
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (ev: AudioProcessingEvent) => {
      const input = ev.inputBuffer.getChannelData(0);
      // Copy — the underlying buffer is reused by the browser after this call.
      this.ingest(input.slice(0));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
  }

  /**
   * Accumulate incoming HW-rate frames, then peel off fixed 30 ms blocks,
   * resample each to 16 kHz, encode Int16 LE, base64, and emit.
   */
  private ingest(frame: Float32Array): void {
    if (!frame || frame.length === 0) return;

    // Append the new frame to whatever partial block we're holding.
    const merged = new Float32Array(this.buffer.length + frame.length);
    merged.set(this.buffer, 0);
    merged.set(frame, this.buffer.length);

    let offset = 0;
    while (merged.length - offset >= this.samplesPerChunk) {
      const block = merged.subarray(offset, offset + this.samplesPerChunk);
      offset += this.samplesPerChunk;
      const resampled = resampleFloat32(block, this.inRate, TARGET_RATE);
      const pcm = float32ToPcm16(resampled);
      const b64 = bytesToBase64(pcm);
      this.onChunk?.(b64);
    }

    // Keep the remainder for next time.
    this.buffer = merged.slice(offset);
  }

  private releaseStream(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
      this.stream = null;
    }
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        /* ignore */
      }
      this.ctx = null;
    }
  }

  /** Stop capture and release the mic, audio nodes, and context. */
  async stop(): Promise<void> {
    this.started = false;
    this.onChunk = null;
    this.buffer = new Float32Array(0);

    if (this.worklet) {
      try {
        this.worklet.port.onmessage = null;
        this.worklet.disconnect();
      } catch {
        /* ignore */
      }
      this.worklet = null;
    }
    if (this.processor) {
      try {
        this.processor.onaudioprocess = null;
        this.processor.disconnect();
      } catch {
        /* ignore */
      }
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    if (this.sink) {
      try {
        this.sink.disconnect();
      } catch {
        /* ignore */
      }
      this.sink = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
      this.stream = null;
    }
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* ignore */
      }
      this.ctx = null;
    }
    this.inRate = 0;
  }
}
