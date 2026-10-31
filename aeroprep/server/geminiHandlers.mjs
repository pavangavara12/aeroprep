// ==========================================================================
// server/geminiHandlers.mjs
// --------------------------------------------------------------------------
// Secure, zero-dependency Gemini proxy. Runs ONLY on the server (Vite dev/
// preview middleware or the standalone Node server). The GEMINI_API_KEY is
// read from the environment here and is never sent to the browser.
//
// Exposes createApiHandler(env) -> async (req, res) => boolean
//   returns true if it handled the request (an /api/* route), false otherwise.
// Framework-agnostic: works with Node's http server and Vite's connect-style
// middleware alike.
// ==========================================================================

import { liveConfig, mintLiveToken, mintMinimalLiveToken } from './liveHandlers.mjs';
import { handleAppApi } from './apiRouter.mjs';

/** Read config from the environment, applying sensible current defaults. */
export function loadConfig(env = process.env) {
  const apiKey = (env.GEMINI_API_KEY || '').trim();
  const apiBase = (env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta')
    .trim()
    .replace(/\/$/, '');
  const textModel = (env.GEMINI_TEXT_MODEL || 'gemini-flash-latest').trim();
  const sttModel = (env.GEMINI_STT_MODEL || 'gemini-flash-latest').trim();
  const ttsModel = (env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts').trim();
  const ttsVoice = (env.GEMINI_TTS_VOICE || 'Kore').trim();
  return {
    apiKey,
    apiBase,
    textModel,
    sttModel,
    ttsModel,
    ttsVoice,
    configured: Boolean(apiKey),
    // Safe to expose to the client (no secrets): which model names are in use.
    publicModels: { text: textModel, stt: sttModel, tts: ttsModel, voice: ttsVoice },
  };
}

function buildUrl(cfg, model, method) {
  return `${cfg.apiBase}/models/${model}:${method}?key=${encodeURIComponent(cfg.apiKey)}`;
}

/** POST JSON to Gemini with a hard timeout. Never logs the URL (contains key). */
async function geminiFetch(url, body, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await resp.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!resp.ok) {
      const message = data?.error?.message || `Gemini API error (HTTP ${resp.status})`;
      const err = new Error(message);
      err.status = resp.status === 404 ? 502 : resp.status;
      throw err;
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error('The AI request timed out. Please try again.');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull all text parts out of a generateContent response, guarding for safety blocks. */
function extractText(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('').trim()
    : '';
  if (!text) {
    const block = data?.promptFeedback?.blockReason || candidate?.finishReason;
    if (block && block !== 'STOP') {
      const e = new Error(`The AI could not answer (reason: ${block}). Try rephrasing.`);
      e.status = 422;
      throw e;
    }
  }
  return text;
}

/**
 * Parse the PCM parameters out of a Gemini audio mimeType such as
 * "audio/L16;codec=pcm;rate=24000". Gemini's TTS output is raw signed 16-bit
 * little-endian PCM (mono). We return the metadata so the browser can decode
 * and play the samples correctly via the Web Audio API — we deliberately do
 * NOT re-container it here, so nothing is guessed or lost in translation.
 */
function parsePcmParams(mimeType = '') {
  const rateMatch = /rate=(\d+)/i.exec(mimeType);
  const bitsMatch = /l(\d+)/i.exec(mimeType); // e.g. "L16" → 16-bit
  return {
    sampleRate: rateMatch ? parseInt(rateMatch[1], 10) : 24000,
    bitsPerSample: bitsMatch ? parseInt(bitsMatch[1], 10) : 16,
    channels: 1,
  };
}

/** Reasoning / chat / structured generation. */
async function generateText({ cfg, system, contents, generationConfig, timeoutMs }) {
  const body = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (generationConfig) body.generationConfig = generationConfig;
  const data = await geminiFetch(buildUrl(cfg, cfg.textModel, 'generateContent'), body, { timeoutMs });
  return extractText(data);
}

/** Speech-to-text via multimodal audio understanding. */
async function transcribeAudio({ cfg, audioBase64, mimeType, timeoutMs }) {
  const prompt =
    'You are a precise speech-to-text engine. Transcribe the spoken audio into plain text, ' +
    'verbatim and in the language spoken. Preserve natural wording. Do not add commentary, ' +
    'labels, timestamps, or quotation marks. If the audio contains no discernible speech, return an empty string.';
  const body = {
    contents: [
      { role: 'user', parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompt }] },
    ],
    generationConfig: { temperature: 0 },
  };
  const data = await geminiFetch(buildUrl(cfg, cfg.sttModel, 'generateContent'), body, { timeoutMs });
  return extractText(data);
}

/**
 * Text-to-speech. Gemini returns raw signed 16-bit little-endian PCM (24 kHz
 * mono) as base64 in inlineData. We pass that through UNCHANGED, along with the
 * decoded parameters, so the browser can decode + play it via the Web Audio API.
 */
async function synthesizeSpeech({ cfg, text, voice, timeoutMs }) {
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || cfg.ttsVoice } } },
    },
  };
  const data = await geminiFetch(buildUrl(cfg, cfg.ttsModel, 'generateContent'), body, { timeoutMs });
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data);
  if (!part) {
    // Surface the real reason (safety block / empty) instead of a generic 502.
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    const e = new Error(
      reason && reason !== 'STOP'
        ? `The TTS model returned no audio (reason: ${reason}).`
        : 'The TTS model returned no audio.',
    );
    e.status = 502;
    throw e;
  }
  const mimeType = part.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
  const { sampleRate, bitsPerSample, channels } = parsePcmParams(mimeType);
  const byteLength = Buffer.from(part.inlineData.data, 'base64').length;
  // Server-side diagnostic (never logs the key/URL): confirms Gemini produced audio.
  console.log(
    `[tts] Gemini audio ok — mime="${mimeType}" rate=${sampleRate} bits=${bitsPerSample} ` +
      `ch=${channels} bytes=${byteLength} (~${(byteLength / (sampleRate * 2)).toFixed(1)}s)`,
  );
  return {
    audioBase64: part.inlineData.data, // RAW PCM, exactly as Gemini returned it
    mimeType,
    encoding: 'pcm_s16le',
    sampleRate,
    channels,
    bitsPerSample,
    byteLength,
  };
}

// --------------------------- request plumbing ---------------------------

function readJsonBody(req, limitBytes = 26_214_400 /* 25 MB */) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        const e = new Error('Request payload too large.');
        e.status = 413;
        reject(e);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const e = new Error('Invalid JSON body.');
        e.status = 400;
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

/** Accept either {contents:[...]}, {messages:[{role,text}]}, or {prompt}. */
function normalizeContents(body) {
  if (Array.isArray(body.contents)) return body.contents;
  if (Array.isArray(body.messages)) {
    return body.messages
      .filter((m) => m && typeof m.text === 'string')
      .map((m) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));
  }
  if (typeof body.prompt === 'string') return [{ role: 'user', parts: [{ text: body.prompt }] }];
  return [];
}

function buildGenConfig(body) {
  const gc = {};
  if (typeof body.temperature === 'number') gc.temperature = body.temperature;
  if (typeof body.maxOutputTokens === 'number') gc.maxOutputTokens = body.maxOutputTokens;
  if (body.json === true) gc.responseMimeType = 'application/json';
  return Object.keys(gc).length ? gc : undefined;
}

/** Optional helper for `npm run models` — lists models the key can access. */
export async function listModels(env = process.env) {
  const cfg = loadConfig(env);
  if (!cfg.configured) throw new Error('GEMINI_API_KEY is not set.');
  const resp = await fetch(`${cfg.apiBase}/models?key=${encodeURIComponent(cfg.apiKey)}`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
  return (data.models || []).map((m) => ({
    name: m.name?.replace(/^models\//, ''),
    methods: m.supportedGenerationMethods,
  }));
}

// ------------------------------ dispatcher ------------------------------

/**
 * Build the /api/* request handler. Returns true when it handled the request.
 * Routes: GET /api/health, POST /api/chat, POST /api/transcribe, POST /api/tts
 */
export function createApiHandler(env = process.env) {
  const cfg = loadConfig(env);

  return async function apiHandler(req, res) {
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api/')) return false;
    const route = rawUrl.split('?')[0];

    // Health check works without a key so the client can degrade gracefully.
    if (route === '/api/health') {
      const live = liveConfig(env);
      sendJson(res, 200, {
        ok: true,
        configured: cfg.configured,
        models: cfg.publicModels,
        live: { model: live.model, voice: live.voice, apiVersion: live.apiVersion },
      });
      return true;
    }

    // AeroPrep Database, Auth, Coding, Aptitude, Resume, & Career API
    let body = {};
    if (req.method === 'POST') {
      try {
        body = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err?.message || 'Invalid JSON body.' });
        return true;
      }
    }

    try {
      const handled = await handleAppApi(req, res, body);
      if (handled) return true;
    } catch (err) {
      console.error('[API Router Error]', err);
      sendJson(res, 500, { error: err?.message || 'Internal server error.' });
      return true;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return true;
    }

    if (!cfg.configured) {
      sendJson(res, 503, {
        error: 'AI is not configured on the server. Add GEMINI_API_KEY to your .env file and restart.',
      });
      return true;
    }

    try {

      if (route === '/api/live-token') {
        // TEMPORARY DIAGNOSTIC branch: mint a MINIMAL token (model + AUDIO +
        // sessionResumption only) on a requested apiVersion so the browser's
        // raw-WS probe can test which endpoint returns setupComplete. The real
        // GEMINI_API_KEY still never leaves this server.
        if (body.diag === true) {
          const live = liveConfig(env);
          const result = await mintMinimalLiveToken({
            apiKey: cfg.apiKey,
            model: live.model,
            apiVersion: typeof body.apiVersion === 'string' ? body.apiVersion : live.apiVersion,
          });
          console.log(
            `[live] DIAG minimal token minted — model=${result.model} api=${result.apiVersion} (minimal lock: AUDIO+sessionResumption only)`,
          );
          sendJson(res, 200, result);
          return true;
        }

        // Mint a short-lived ephemeral token so the browser can open the Live
        // WebSocket directly. The real GEMINI_API_KEY never leaves this server.
        // The browser sends the chosen coach persona so it can be LOCKED into
        // the token (keeping the browser's connect-time config minimal).
        const systemInstruction =
          typeof body.systemInstruction === 'string' ? body.systemInstruction : undefined;
        const result = await mintLiveToken({
          apiKey: cfg.apiKey,
          live: liveConfig(env),
          session: { systemInstruction },
        });
        console.log(
          `[live] minted ephemeral token — model=${result.model} voice=${result.voice} api=${result.apiVersion} sysLocked=${systemInstruction ? 'yes' : 'no'}`,
        );
        sendJson(res, 200, result);
        return true;
      }

      if (route === '/api/chat') {
        const contents = normalizeContents(body);
        if (!contents.length) {
          sendJson(res, 400, { error: 'No prompt or messages provided.' });
          return true;
        }
        const text = await generateText({
          cfg,
          system: typeof body.system === 'string' ? body.system : undefined,
          contents,
          generationConfig: buildGenConfig(body),
          timeoutMs: 45000,
        });
        sendJson(res, 200, { text });
        return true;
      }

      if (route === '/api/transcribe') {
        if (!body.audioBase64 || !body.mimeType) {
          sendJson(res, 400, { error: 'Missing audio data.' });
          return true;
        }
        const transcript = await transcribeAudio({
          cfg,
          audioBase64: String(body.audioBase64),
          mimeType: String(body.mimeType),
          timeoutMs: 60000,
        });
        sendJson(res, 200, { transcript });
        return true;
      }

      if (route === '/api/tts') {
        const text = String(body.text || '').trim();
        if (!text) {
          sendJson(res, 400, { error: 'Missing text to speak.' });
          return true;
        }
        const audio = await synthesizeSpeech({
          cfg,
          text: text.slice(0, 5000),
          voice: typeof body.voice === 'string' ? body.voice : undefined,
          timeoutMs: 60000,
        });
        sendJson(res, 200, audio);
        return true;
      }

      sendJson(res, 404, { error: 'Unknown API endpoint.' });
      return true;
    } catch (err) {
      const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 502;
      sendJson(res, status, { error: err?.message || 'The AI request failed.' });
      return true;
    }
  };
}

