import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function getBackendPort(): number {
  const currentDir = import.meta.dirname
  const portFile = path.resolve(currentDir, '../backend/.active_port')
  try {
    if (fs.existsSync(portFile)) {
      const val = fs.readFileSync(portFile, 'utf-8').trim()
      const parsed = parseInt(val, 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  } catch {}
  return 8000
}

export default defineConfig(() => {
  const backendPort = getBackendPort()
  const backendUrl = `http://127.0.0.1:${backendPort}`

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/auth': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/conversations': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/chat': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
