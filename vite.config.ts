import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// base path:
//  - dev / Vercel / Netlify (root domain) → '/'  (ค่าเริ่มต้น)
//  - GitHub Pages (project site)           → ตั้ง env BASE_PATH=/vite-react/ ใน workflow
export default defineConfig({
  plugins: [react(), cloudflare()],
  base: process.env.BASE_PATH || '/',
})