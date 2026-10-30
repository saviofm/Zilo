import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // ziloback CAP server — default: local cds watch port
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:4004'

  const proxy = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/chat':          proxy,
        '/api/conversations': proxy,
        '/api/ledger':        proxy,
        '/userapi':           proxy,
      },
    },
  }
})
