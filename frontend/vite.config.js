import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  // Activer avec: npm run dev:tunnel (fonctionne sur Windows, macOS et Linux)
  // ou: VITE_TUNNEL=1 npm run dev / $env:VITE_TUNNEL='1'; npm run dev (PowerShell)
  // (requis pour Dev Tunnels / Cloudflare — HMR en wss:443)
  // NB: la syntaxe « VITE_TUNNEL=1 vite » du script npm ne fonctionne pas sous
  // Windows (cmd.exe), on accepte donc aussi le flag CLI --tunnel.
  const tunnel =
    env.VITE_TUNNEL === '1' ||
    process.env.VITE_TUNNEL === '1' ||
    process.argv.includes('--tunnel')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Découpe du bundle par famille de vendors : évite un chunk unique
      // > 500 kB et améliore la mise en cache navigateur (vendors stables).
      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
              { name: 'vendor-charts', test: /[\\/]node_modules[\\/](recharts|d3-|victory-|internmap|decimal.js)[\\/]/ },
              { name: 'vendor-motion', test: /[\\/]node_modules[\\/](gsap|motion|framer-motion|ogl|@gsap)[\\/]/ },
              { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
            ],
          },
        },
      },
      // Le bundle est volontairement mono-chunk (dashboard interne). Au-delà
      // de 500 kB, Vite écrit un avertissement sur stderr que Windows
      // PowerShell affiche comme une erreur rouge « NativeCommandError ».
      // On relève la limite pour garder une sortie console propre.
      chunkSizeWarningLimit: 1600,
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      // Accepte les hôtes ngrok / tunnels (sinon page blanche « Blocked request »)
      allowedHosts: true,
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
      // Obligatoire derrière ngrok HTTPS : le WS HMR doit passer en wss:443
      // (lance avec: npm run dev:tunnel)
      ...(tunnel
        ? {
            hmr: {
              protocol: 'wss',
              clientPort: 443,
            },
          }
        : {}),
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        '/docs': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        '/schema': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        '/redoc': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
    },
  }
})
