import { defineConfig, loadEnv } from 'vite'
import type { ViteDevServer, PreviewServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { createApiHandler } from './server/geminiHandlers.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env (all keys, no VITE_ prefix filter) on the SERVER only. The key
  // is captured in the middleware closure below and never reaches the client
  // bundle, so `npm run dev` alone is enough to use the AI features securely.
  const env = loadEnv(mode, process.cwd(), '')
  const apiHandler = createApiHandler(env)

  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        apiHandler(req, res)
          .then((handled) => {
            if (!handled) next()
          })
          .catch((err) => next(err))
      },
    )
  }

  return {
    plugins: [
      react(),
      {
        name: 'aeroprep-gemini-api',
        configureServer: attach,
        configurePreviewServer: attach,
      },
    ],
  }
})
