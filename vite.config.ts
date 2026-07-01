import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base path:
//  - dev / Vercel / Netlify (root domain) → '/'  (ค่าเริ่มต้น)
//  - GitHub Pages (project site)           → ตั้ง env BASE_PATH=/vite-react/ ใน workflow
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
