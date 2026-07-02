import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  build: {
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        spectator:  resolve(__dirname, 'spectator.html'),
      },
    },
  },
})
