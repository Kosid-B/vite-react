# Deploy ขึ้น Production

แอปนี้ deploy อัตโนมัติด้วย **GitHub Actions → GitHub Pages** (ไฟล์ `.github/workflows/deploy.yml`)
ทุกครั้งที่ push เข้า branch `main`

URL ที่ได้: `https://kosid-b.github.io/vite-react/`
(`base: '/vite-react/'` ใน `vite.config.ts` ตั้งไว้ให้ตรง path นี้แล้ว)

## ขั้นตอนเปิดใช้ครั้งเดียว

1. **เปิด GitHub Pages**: repo → **Settings → Pages → Build and deployment → Source = GitHub Actions**
2. **(ถ้าใช้ Supabase) ใส่ secrets**: repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `VITE_SUPABASE_URL` = `https://xxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGci...`
   > anon key เป็น public key ปลอดภัยที่จะฝังใน frontend (ความปลอดภัยจริงอยู่ที่ RLS)
   > ถ้าไม่ใส่ แอปจะ deploy โหมด local (ไม่มี login/cloud) ยังเปิดดูได้ปกติ
3. **Merge เข้า `main`** → Action จะ build + deploy ให้อัตโนมัติ (ดูสถานะที่แท็บ Actions)

## Backend (Supabase) สำหรับ production

1. รัน SQL ทั้งหมดใน `supabase/migrations/` (0001 → 0003) ตามลำดับ
2. Deploy Edge Functions:
   ```bash
   supabase functions deploy ai-plan
   supabase functions deploy promptpay-webhook --no-verify-jwt
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... WEBHOOK_SECRET=...
   ```
3. ที่ **Authentication → URL Configuration** เพิ่ม `https://kosid-b.github.io/vite-react/`
   เข้า Site URL / Redirect URLs (จำเป็นสำหรับ Magic Link / ยืนยันอีเมล)

## ทางเลือกอื่น (custom domain / env UI ที่ง่ายกว่า)

ถ้าต้องการ custom domain หรือจัดการ env ผ่าน dashboard ใช้ **Vercel / Netlify / Cloudflare Pages**
เชื่อม GitHub repo นี้ ตั้ง build command `npm run build`, output `dist`, base `/`
(เปลี่ยน `base` ใน `vite.config.ts` เป็น `/` เมื่อใช้ root domain)
