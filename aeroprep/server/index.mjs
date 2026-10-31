// ==========================================================================
// server/index.mjs
// --------------------------------------------------------------------------
// Optional standalone server. You do NOT need this for development —
// `npm run dev` mounts the same API as Vite middleware on the Vite port.
//
// Use this to:
//   * serve the production build:  npm run build && npm run server
//   * run the API next to `vite dev` on its own port (CORS is enabled)
//   * list available models:       npm run models
//
// Zero dependencies: Node 18+ built-ins only. Loads .env itself.
// ==========================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler, listModels } from './geminiHandlers.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

/** Minimal .env loader (no dependency). Existing process.env wins. */
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(join(projectRoot, '.env'));

// `npm run models` — quick way to see which models your key can access.
if (process.argv.includes('--models')) {
  try {
    const models = await listModels(process.env);
    console.log('Models available to your key:\n');
    for (const m of models) {
      console.log(`  ${m.name}`);
      if (m.methods?.length) console.log(`      methods: ${m.methods.join(', ')}`);
    }
  } catch (err) {
    console.error('Could not list models:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

const apiHandler = createApiHandler(process.env);
const distDir = join(projectRoot, 'dist');
const PORT = Number(process.env.AEROPREP_API_PORT || 8787);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStatic(req, res) {
  if (!existsSync(distDir)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('No production build found. Run `npm run build` first, or use `npm run dev`.');
    return;
  }
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = join(distDir, urlPath === '/' ? 'index.html' : urlPath);
  // Prevent path traversal outside dist.
  if (!filePath.startsWith(distDir)) filePath = join(distDir, 'index.html');
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(distDir, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  // Enable CORS for the API so it can also run next to `vite dev` on another
  // port. No credentials/cookies are used, so a permissive origin is safe —
  // the secret key never leaves the server regardless of who calls.
  if ((req.url || '').startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
  }

  try {
    const handled = await apiHandler(req, res);
    if (handled) return;
    await serveStatic(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  const cfg = process.env.GEMINI_API_KEY ? 'configured' : 'NOT configured (set GEMINI_API_KEY in .env)';
  console.log(`AeroPrep server listening on http://localhost:${PORT}`);
  console.log(`Gemini API: ${cfg}`);
  if (existsSync(distDir)) console.log('Serving production build from ./dist');
});

