import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Force resolution to local node_modules only
    alias: {
      'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
      '@tailwindcss/vite': path.resolve(__dirname, 'node_modules/@tailwindcss/vite'),
    }
  },
  server: {
    port: 5174,
    strictPort: true
  }
})
