// ==========================================================================
// server/liveHandlers.mjs
// --------------------------------------------------------------------------
// Mints short-lived EPHEMERAL TOKENS for the Gemini Live API so the browser
// can open the Live WebSocket DIRECTLY to Google WITHOUT ever seeing the
// long-lived GEMINI_API_KEY.
//
//   browser  --POST /api/live-token-->  this server (holds the real key)
//   this server --authTokens.create-->  Google  --ephemeral token-->  browser
//   browser  --@google/genai ai.live.connect({ apiKey: <ephemeral> })-->  Gemini Live
//
// Ephemeral-token Live connections use the v1alpha surface in the installed
// @google/genai SDK (ephemeral-token support is v1alpha only; see liveConfig).
// Both the token mint below and the browser's ai.live.connect() must use the
// SAME apiVersion, which is why it is returned to the client in the token
// response.
//
// The @google/genai SDK is imported LAZILY (dynamic import) inside the mint
// function, so the rest of the zero-dependency proxy keeps working even if the
// package hasn't been installed yet — the token route just returns a clear
// "run npm install" error in that case.
// ==========================================================================

/** Read Live-specific config from the environment (no secrets in the result). */
export function liveConfig(env = process.env) {
  const model = (env.GEMINI_LIVE_MODEL || 'gemini-3.8-live').trim();
  const voice = (env.GEMINI_LIVE_VOICE || env.GEMINI_TTS_VOICE || 'Kore').trim();
  // Ephemeral-token Live connections are served on v1alpha ONLY in the installed
  // @google/genai SDK: live.connect() detects an ephemeral token and uses the
  // BidiGenerateContentConstrained method, which exists on the v1alpha surface
  // (the SDK warns and the handshake never returns setupComplete on v1beta). The
  // token mint and the browser connect MUST use the same apiVersion, so default
  // to v1alpha here. An explicit GEMINI_LIVE_API_VERSION override still wins.
  const apiVersion = (env.GEMINI_LIVE_API_VERSION || 'v1alpha').trim();
  const wsBase = (env.GEMINI_LIVE_WS_BASE || 'wss://generativelanguage.googleapis.com')
    .trim()
    .replace(/\/$/, '');
  return { model, voice, apiVersion, wsBase };
}

/** Build the BidiGenerateContent WebSocket URL for the configured API version. */
export function liveWsUrl(live) {
  return `${live.wsBase}/ws/google.ai.generativelanguage.${live.apiVersion}.GenerativeService.BidiGenerateContent`;
}

/**
 * Create an ephemeral auth token scoped to a single Live session.
 * Returns everything the browser needs to connect — but NOT the API key.
 *
 * The FULL Live setup (model, response modality, voice, system instruction,
 * transcription, session resumption) is LOCKED into the token via
 * liveConnectConstraints. The browser then opens the session with only the
 * minimal documented config ({ responseModalities: [AUDIO], sessionResumption })
 * — a strict subset of what is locked here. This matters: gemini-3.8-live over
 * an ephemeral-token connection expects the connect-time setup to be consistent
 * with the token's constraints; sending extra, unlocked fields at connect time
 * is what left the handshake hanging with no setupComplete.
 *
 * @param {object} args
 * @param {string} args.apiKey  The real Gemini API key (server-side only).
 * @param {ReturnType<typeof liveConfig>} args.live  Live config.
 * @param {{ systemInstruction?: string }} [args.session]  Per-session setup to lock.
 */
export async function mintLiveToken({ apiKey, live, session }) {
  if (!apiKey) {
    const e = new Error('AI is not configured on the server. Add GEMINI_API_KEY to your .env file.');
    e.status = 503;
    throw e;
  }

  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import('@google/genai'));
  } catch {
    const e = new Error(
      'The Live voice feature needs the @google/genai package. Run "npm install" in the aeroprep folder and restart.',
    );
    e.status = 501;
    throw e;
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: live.apiVersion } });

  const now = Date.now();
  // Token is usable to START a session for a short window, and the session it
  // opens may then run for the longer expiry. Single-use (uses: 1) start.
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString(); // 2 min to connect
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString(); // 30 min max session

  // The complete Live setup, locked server-side into the ephemeral token.
  const lockedConfig = {
    responseModalities: ['AUDIO'],
    sessionResumption: {},
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: live.voice } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  // Coach persona is chosen in the browser; lock whatever it sent (length-capped
  // so the token endpoint can't be abused as an open relay).
  const sys = typeof session?.systemInstruction === 'string' ? session.systemInstruction.trim() : '';
  if (sys) lockedConfig.systemInstruction = sys.slice(0, 16000);

  let created;
  try {
    created = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: live.apiVersion },
        // Lock the model + full setup so a leaked token can't be repurposed and
        // so the browser's minimal connect config matches the token exactly.
        liveConnectConstraints: {
          model: live.model,
          config: lockedConfig,
        },
      },
    });
  } catch (err) {
    const msg = err?.message || 'Could not create a Live token.';
    const e = new Error(
      /404|not found|unsupported|invalid/i.test(msg)
        ? `Live token request rejected by Google (${msg}). Check GEMINI_LIVE_MODEL — run "npm run models" to see available models.`
        : msg,
    );
    e.status = 502;
    throw e;
  }

  // The SDK returns the token in `.name` (newer) — accept a couple of shapes.
  const token = created?.name || created?.token || created?.tokenString || '';
  if (!token) {
    const e = new Error('The token service returned an empty token.');
    e.status = 502;
    throw e;
  }

  return {
    token,
    wsUrl: liveWsUrl(live),
    model: live.model,
    voice: live.voice,
    apiVersion: live.apiVersion,
    expiresAt: expireTime,
    connectBy: newSessionExpireTime,
  };
}

// ==========================================================================
// TEMPORARY DIAGNOSTIC — remove once the Live handshake is confirmed working.
// --------------------------------------------------------------------------
// Mints an ephemeral token locked to the ABSOLUTE MINIMUM the Live constrained
// API needs — model + responseModalities:['AUDIO'] + sessionResumption:{} — and
// NOTHING else (no voice, systemInstruction, or transcription). The browser's
// raw-WebSocket probe (src/services/liveDiag.ts) uses this to test which
// endpoint/version actually returns a setupComplete, without the production
// path's extra locked fields as a confound. apiVersion is a parameter so the
// probe can try v1alpha and v1beta against the same minimal lock.
// ==========================================================================
export async function mintMinimalLiveToken({ apiKey, model, apiVersion }) {
  if (!apiKey) {
    const e = new Error('AI is not configured on the server. Add GEMINI_API_KEY to your .env file.');
    e.status = 503;
    throw e;
  }

  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import('@google/genai'));
  } catch {
    const e = new Error('The Live voice feature needs the @google/genai package. Run "npm install".');
    e.status = 501;
    throw e;
  }

  const ver = (apiVersion || 'v1alpha').trim();
  const mdl = (model || 'gemini-3.8-live').trim();
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: ver } });

  const now = Date.now();
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();
  const expireTime = new Date(now + 10 * 60 * 1000).toISOString();

  // The minimal locked config — exactly what the user asked to isolate.
  const lockedConfig = { responseModalities: ['AUDIO'], sessionResumption: {} };

  let created;
  try {
    created = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: ver },
        liveConnectConstraints: { model: mdl, config: lockedConfig },
      },
    });
  } catch (err) {
    const e = new Error(`[diag] authTokens.create failed on ${ver}: ${err?.message || 'unknown error'}`);
    e.status = 502;
    throw e;
  }

  const token = created?.name || created?.token || created?.tokenString || '';
  if (!token) {
    const e = new Error(`[diag] token service returned an empty token on ${ver}.`);
    e.status = 502;
    throw e;
  }
  return { token, model: mdl, apiVersion: ver };
}
