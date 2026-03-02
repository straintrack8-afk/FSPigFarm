import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcssPlugin from '@tailwindcss/postcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/FSPigFarm/',
  css: {
    postcss: {
      plugins: [
        tailwindcssPlugin,
      ],
    },
  },
})
