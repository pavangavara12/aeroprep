/* ==========================================================================
   pcm.ts — small, dependency-free helpers for the raw PCM audio that flows
   both ways over the Gemini Live WebSocket.

     • Gemini sends native audio DOWN as base64 signed-16-bit little-endian PCM
       (mono, 24 kHz)  →  we decode it to Float32 for the Web Audio API.
     • We send mic audio UP as base64 signed-16-bit little-endian PCM
       (mono, 16 kHz) →  so we encode Float32 → Int16 and resample to 16 kHz.

   Everything here is pure/synchronous and safe to unit-test.
   ========================================================================== */

/** base64 → raw bytes (buffer starts at offset 0, so it's 2-byte aligned). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** raw bytes → base64 (chunked to avoid arg-count limits on big buffers). */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode.apply(null, sub as unknown as number[]);
  }
  return btoa(bin);
}

/**
 * Decode signed 16-bit little-endian PCM bytes into Float32 samples in [-1, 1).
 * Uses a DataView so it is correct regardless of byte alignment or platform
 * endianness (we always read little-endian, which is what Gemini sends).
 */
export function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const sampleCount = bytes.byteLength >> 1; // 2 bytes per sample
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

/** Encode Float32 samples in [-1, 1] into signed 16-bit little-endian PCM bytes. */
export function float32ToPcm16(input: Float32Array): Uint8Array {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    let s = input[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    view.setInt16(i * 2, Math.round(s * 32767), true);
  }
  return out;
}

/**
 * Resample mono Float32 audio from `inRate` to `outRate` via linear
 * interpolation. Good enough for speech (Gemini wants 16 kHz mono up).
 * Returns the input unchanged when the rates already match.
 */
export function resampleFloat32(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate || input.length === 0) return input;
  const ratio = inRate / outRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

/** Parse "audio/pcm;rate=24000" (or "audio/L16;…;rate=24000") → sample rate. */
export function parseRateFromMime(mimeType: string | undefined, fallback: number): number {
  if (!mimeType) return fallback;
  const m = /rate=(\d+)/i.exec(mimeType);
  return m ? parseInt(m[1], 10) : fallback;
}
