import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/voting': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/daily-set': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/players': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/game': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
