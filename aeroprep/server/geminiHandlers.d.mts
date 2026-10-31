// Type declarations for the zero-dependency Gemini proxy (implemented in
// geminiHandlers.mjs). Lets vite.config.ts import it without type errors.
import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export interface GeminiConfig {
  apiKey: string;
  apiBase: string;
  textModel: string;
  sttModel: string;
  ttsModel: string;
  ttsVoice: string;
  configured: boolean;
  publicModels: { text: string; stt: string; tts: string; voice: string };
}

export function loadConfig(env?: Record<string, string | undefined>): GeminiConfig;

export function createApiHandler(env?: Record<string, string | undefined>): ApiHandler;

export function listModels(
  env?: Record<string, string | undefined>,
): Promise<Array<{ name?: string; methods?: string[] }>>;
