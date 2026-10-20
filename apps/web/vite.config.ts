import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  resolve: {
    alias: {
      '@formlab/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@formlab/react': resolve(__dirname, '../../packages/react/src/index.tsx'),
    },
  },
})
