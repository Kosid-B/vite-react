# CEO AI Thailand — Command Reference

## Local Development

```bash
npm install          # ติดตั้ง dependencies ครั้งแรก
npm run dev          # dev server → http://localhost:5173  (local mode, ไม่ต้อง login)
npm run build        # build production → dist/
npm run preview      # preview dist/ ที่ localhost:4173
npm run lint         # ตรวจ ESLint
```

> **Local mode**: ไม่ต้องมี `.env` — แอปทำงานได้เลย (localStorage, plan = Scale)  
> **Production mode**: ต้องตั้ง `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` ผ่าน GitHub Secrets

---

## Screenshot / UI Testing

```bash
# เริ่ม dev server ก่อน
(npm run dev -- --port 5173 >/tmp/dev.log 2>&1 &)
sleep 4

# screenshot หน้า Dashboard
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/dash.png

# screenshot หน้าใดก็ได้ (ระบุ nav label)
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --nav "บริษัท AI"
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --nav "แพ็กเกจ"
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --full   # full-page

# หยุด dev server
pkill -f "vite"
```

**Nav labels ที่ใช้ได้**: `Dashboard`, `Journey Map`, `Conversion Funnel`, `ROI Calculator`,
`Personas`, `Content Plan`, `Priority Actions`, `Business Model · MIT24`, `VRIO Analysis`,
`บริษัท AI`, `Marketplace`, `ทีม / สมาชิก`, `แพ็กเกจ`, `SaaS Analytics`,
`ISO 9001:2015 QMS`, `AI Research`, `Case Studies`

---

## Git Workflow

```bash
# สร้าง feature branch
git checkout -b feature/ชื่อ-feature

# commit + push
git add src/path/to/file.tsx
git commit -m "feat: คำอธิบาย"
git push -u origin feature/ชื่อ-feature

# sync กับ main
git fetch origin main
git rebase origin/main
```

**Auto-deploy**: push ไป `main` → GitHub Actions build → Cloudflare Workers deploy อัตโนมัติ

---

## Cloudflare Workers

```bash
# deploy manual (ปกติ auto จาก GitHub Actions)
npx wrangler deploy

# ดู logs real-time
npx wrangler tail ceo-ai-thailand

# ดู deployment list
npx wrangler deployments list

# ตั้ง secret
npx wrangler secret put ANTHROPIC_API_KEY
```

---

## Supabase Edge Functions

```bash
# deploy Edge Function ทีละตัว
npx supabase functions deploy ai-assist      --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy ai-plan        --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy agent-run      --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy generate-badge --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy billing-cron   --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy promptpay-webhook --project-ref rsjbqmnvocvtveelselj

# deploy ทุกตัวพร้อมกัน
npx supabase functions deploy --project-ref rsjbqmnvocvtveelselj

# ตั้ง secret ใน Edge Functions
npx supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref rsjbqmnvocvtveelselj
npx supabase secrets set RESEND_API_KEY=<key>    --project-ref rsjbqmnvocvtveelselj
npx supabase secrets set SERPER_API_KEY=<key>    --project-ref rsjbqmnvocvtveelselj
npx supabase secrets set CRON_SECRET=<key>       --project-ref rsjbqmnvocvtveelselj

# รัน migration
npx supabase db push --project-ref rsjbqmnvocvtveelselj
```

---

## Supabase SQL (ตรวจสอบ / debug)

```sql
-- ดู users ทั้งหมด
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- ดู workspace ทั้งหมด
SELECT * FROM public.workspaces;

-- ดู plan ของ user
SELECT u.email, w.plan, w.trial_ends_at
FROM public.workspaces w
JOIN auth.users u ON u.id = w.owner_id;

-- reset trial (สำหรับ test)
UPDATE public.workspaces SET trial_ends_at = NOW() + INTERVAL '15 days' WHERE owner_id = '<user-id>';
```

---

## Key URLs

| รายการ | URL |
|---|---|
| Production | https://ceoaithailand.org |
| Supabase Dashboard | https://supabase.com/dashboard/project/rsjbqmnvocvtveelselj |
| Supabase Auth Config | https://supabase.com/dashboard/project/rsjbqmnvocvtveelselj/auth/url-configuration |
| Cloudflare Workers | https://dash.cloudflare.com → Workers → ceo-ai-thailand |
| Resend Domains | https://resend.com/domains/7fc8565a-f891-45ae-b6e8-5e50a39fcd63 |
| GitHub Repo | https://github.com/Kosid-B/vite-react |
| GitHub Actions | https://github.com/Kosid-B/vite-react/actions |

---

## Secrets & Credentials

| ชื่อ | เก็บที่ |
|---|---|
| `VITE_SUPABASE_URL` | GitHub → Settings → Secrets → Actions |
| `VITE_SUPABASE_ANON_KEY` | GitHub → Settings → Secrets → Actions |
| `ANTHROPIC_API_KEY` | Supabase Edge Function Secrets |
| `RESEND_API_KEY` | Supabase Edge Function Secrets |
| `SERPER_API_KEY` | Supabase Edge Function Secrets |
| `CRON_SECRET` | Supabase Edge Function Secrets |
| `WEBHOOK_SECRET` | Supabase Edge Function Secrets (ตั้งพร้อม payment gateway) |

> ห้ามสร้าง `.env` ใน repo — ตั้งผ่าน GitHub Secrets / Supabase Secrets เท่านั้น

---

## Edge Function Endpoints

```
POST /ai-assist          — AI แนะนำทุกหน้า (ต้อง JWT)
POST /ai-plan            — CEO วางแผน + มอบงาน (ต้อง JWT)
POST /agent-run          — รัน AI agent + Google Search (ต้อง JWT)
GET  /generate-badge     — ISO badge PNG (public, ไม่ต้อง JWT)
POST /billing-cron       — ต่ออายุ/downgrade อัตโนมัติ (cron secret)
POST /promptpay-webhook  — รับ payment webhook (public)
```
