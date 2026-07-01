# CEO AI Thailand — Project Memory

## Overview
Thai SaaS app "บริษัท AI อัตโนมัติ" — Vite + React SPA, no router (navigation = React state).
Sidebar `button.nav-item` switches pages. Deployed on GitHub Pages + Supabase backend.

## Stack
- **Frontend**: Vite + React + TypeScript, CSS variables (dark theme `#0f172a`)
- **Backend**: Supabase (Auth, Postgres RLS, Edge Functions)
- **Deploy**: GitHub Actions → GitHub Pages (`main` branch auto-deploy)
- **Email**: Resend API (via Edge Functions)
- **Billing**: pg_cron + billing-cron Edge Function (daily 02:00 UTC)

## Production Credentials
```
Supabase Project ID : rsjbqmnvocvtveelselj
Supabase URL        : https://rsjbqmnvocvtveelselj.supabase.co
Anon Key            : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzamJxbW52b2N2dHZlZWxzZWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDUyODEsImV4cCI6MjA5ODQyMTI4MX0.a0AkDAxtDMuit-xv5dk7wsp9l_uEKCwiysVuGlXbT4I
Custom Domain       : ceoaithailand.org (DNS in progress)
Admin Email         : support@b-tctraining.com
```

## Local Dev vs Production
- **Local mode** (no `.env`): ข้อมูลเก็บใน `localStorage`, ไม่ต้อง login, plan = Scale (full access)
- **Production mode** (มี `VITE_SUPABASE_URL`): ต้อง login, sync ขึ้น Supabase, plan บังคับใช้
- ห้ามสร้าง `.env` ใน repo — ตั้งผ่าน GitHub Secrets เท่านั้น

## Key Source Files
```
src/App.tsx                    — root component, routing state, auto-trial logic
src/lib/access.ts              — plan access control (canAccess, effectiveRank, PAGE_MIN_PLAN)
src/components/Sidebar.tsx     — navigation + plan badge + lock icons
src/components/UpgradeWall.tsx — locked page overlay
src/components/Billing.tsx     — subscription management UI
src/index.css                  — all styles (dark theme, CSS vars)
supabase/functions/            — 6 Edge Functions
supabase/migrations/           — 0001–0005 (ทั้งหมด applied แล้ว)
public/CNAME                   — custom domain (ceoaithailand.org)
.github/workflows/deploy.yml   — GitHub Pages auto-deploy
```

## Plan / Access Control
```typescript
// src/lib/access.ts
PAGE_MIN_PLAN = {
  aisearch: 'growth', market: 'growth', team: 'growth',
  iso9001: 'growth', analytics: 'growth', admin: 'scale',
  // factory = FREE (part of AI Company feature)
}
Plans: free(0) → growth(1) ฿1,490/mo → scale(2) ฿5,900/mo
Trial: 15 วัน auto-start เมื่อ login ครั้งแรก
```

## Sidebar Pages (nav labels)
`Dashboard`, `Journey Map`, `Conversion Funnel`, `ROI Calculator`, `Personas`,
`Content Plan`, `Priority Actions`, `Business Model · MIT24`, `VRIO Analysis`,
`บริษัท AI`, `Marketplace`, `ทีม / สมาชิก`, `แพ็กเกจ`, `SaaS Analytics`,
`ISO 9001:2015 QMS`, `AI Research`, `Case Studies`

## Supabase Schema
```
public.app_state          — user data (legacy, 1 row per user)
public.workspaces         — workspace per company
public.workspace_members  — members + roles (owner/admin/member)
public.workspace_state    — AppData JSON per workspace (main store)
public.app_admins         — system admins (support@b-tctraining.com)
```

## Edge Functions
| Function | JWT | Purpose |
|---|---|---|
| ai-assist | ✅ | AI แนะนำทุกหน้า (Claude API) |
| ai-plan | ✅ | CEO วางแผน + มอบงาน |
| agent-run | ✅ | รันเอเจนต์ + Serper.dev (Google Search) |
| generate-badge | ❌ | ISO badge PNG (public GET) |
| billing-cron | ❌ | ต่ออายุ/downgrade อัตโนมัติ |
| promptpay-webhook | ❌ | รับ webhook จาก payment gateway |

## Secrets Required
```
GitHub Actions : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
Supabase Fn   : ANTHROPIC_API_KEY ✅, CRON_SECRET ✅, SERPER_API_KEY ✅, RESEND_API_KEY (pending)
Pending        : WEBHOOK_SECRET (ตั้งพร้อม payment gateway)
```

## Dev Commands
```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview dist/ locally

# Screenshot (requires dev server running)
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --nav "บริษัท AI"
```

## Deploy Flow
```
push to main → GitHub Actions → npm run build (BASE_PATH=/) → deploy to GitHub Pages
Custom domain: ceoaithailand.org (CNAME file in public/)
```

## Email DNS Records (ceoaithailand.org)
ต้องเพิ่มที่ domain registrar:
```
# MX — Zoho Mail (free)
@   MX 10  mx.zoho.com
@   MX 20  mx2.zoho.com
@   MX 50  mx3.zoho.com

# SPF — Resend (noreply) + Zoho (mailbox)
@   TXT "v=spf1 include:_spf.resend.com include:zoho.com ~all"

# DKIM — Resend (TXT, จาก Resend Dashboard > Domains)
resend._domainkey   TXT     <value from Resend — starts with p=MIGf...>
# SPF bounce subdomain — Resend (จาก Resend Dashboard)
send                MX  10  feedback-smtp.us-east-1.amazonses.com
send                TXT     "v=spf1 include:amazonses.com ~all"

# DKIM — Zoho (TXT, จาก Zoho Admin > Domains)
zoho._domainkey     TXT     <value from Zoho>

# DMARC — quarantine spoofed email, รายงานมาที่ admin
_dmarc  TXT "v=DMARC1; p=quarantine; rua=mailto:support@b-tctraining.com; pct=100"
```
FROM_EMAIL ใน Edge Functions: `CEO AI Thailand <noreply@ceoaithailand.org>`

## Pending Items
- [ ] DNS propagation สำหรับ ceoaithailand.org (A/MX/SPF/DKIM/DMARC records)
- [ ] ตั้ง Supabase Auth redirect URL: https://ceoaithailand.org
- [x] Analytics — Google Analytics 4 (G-CHJ99RY1Q1) ใส่ใน index.html แล้ว
- [ ] Payment Gateway (Omise / GB Prime Pay) + ตั้ง WEBHOOK_SECRET
- [ ] RESEND_API_KEY สำหรับ email notifications (verify domain ใน Resend ก่อน)
- [ ] Zoho Mail setup — Add domain ceoaithailand.org (รับอีเมล)
- [x] ตั้ง SERPER_API_KEY ใน Supabase Edge Function secrets (serper.dev)
