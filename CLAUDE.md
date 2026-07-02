# CEO AI Thailand — Project Memory

## Overview
Thai SaaS app "บริษัท AI อัตโนมัติ" — Vite + React SPA, no router (navigation = React state).
Sidebar `button.nav-item` switches pages. Deployed on Cloudflare Workers + Supabase backend.

## Stack
- **Frontend**: Vite + React + TypeScript, CSS variables (dark theme `#0f172a`)
- **Backend**: Supabase (Auth, Postgres RLS, Edge Functions)
- **Deploy**: Cloudflare Workers (worker `ceo-ai-thailand`, `npx wrangler deploy` — production ยืนยันโดย Board ก.ค. 2569); `deploy.yml` → GitHub Pages ยังรันอยู่แต่เป็น legacy; Vercel = PR preview
- **Email**: Resend API (via Edge Functions) — ส่งจาก `noreply@ceoaithailand.org`
- **Search**: Serper.dev (Google Search API) — ใช้ใน agent-run Edge Function
- **Billing**: pg_cron + billing-cron Edge Function (daily 02:00 UTC)

## Production Credentials
```
Supabase Project ID : rsjbqmnvocvtveelselj
Supabase URL        : https://rsjbqmnvocvtveelselj.supabase.co
Anon Key            : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzamJxbW52b2N2dHZlZWxzZWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDUyODEsImV4cCI6MjA5ODQyMTI4MX0.a0AkDAxtDMuit-xv5dk7wsp9l_uEKCwiysVuGlXbT4I
Custom Domain       : ceoaithailand.org
Admin Email         : support@b-tctraining.com
GA4                 : G-CHJ99RY1Q1 (ใส่ใน index.html แล้ว)
```

## Local Dev vs Production
- **Local mode** (ไม่มี `.env`): ข้อมูลเก็บใน `localStorage`, ไม่ต้อง login, plan = Scale (full access)
- **Production mode** (มี `VITE_SUPABASE_URL`): ต้อง login, sync ขึ้น Supabase, plan บังคับใช้
- **ห้ามสร้าง `.env` ใน repo** — ตั้งผ่าน GitHub Secrets เท่านั้น

## Key Source Files
```
src/App.tsx                    — root component, routing state, auto-trial logic
src/types.ts                   — TypeScript interfaces (AppData, Task, Agent, etc.)
src/data.ts                    — default data / task templates
src/lib/access.ts              — plan access control (canAccess, effectiveRank, PAGE_MIN_PLAN)
src/components/Sidebar.tsx     — navigation + plan badge + lock icons
src/components/UpgradeWall.tsx — locked page overlay
src/components/Billing.tsx     — subscription management UI
src/pages/AICompany.tsx        — บริษัท AI page (factory, agent tasks)
src/pages/CaseStudies.tsx      — case studies + integration guides
src/index.css                  — all styles (dark theme, CSS vars)
supabase/functions/            — 6 Edge Functions
supabase/migrations/           — 0001–0012 (ทั้งหมด applied แล้ว)
public/CNAME                   — custom domain (ceoaithailand.org)
.github/workflows/deploy.yml   — GitHub Pages auto-deploy (legacy — production = Cloudflare Workers)
wrangler.jsonc                 — Cloudflare Workers config (production)
```

## Plan / Access Control
```typescript
// src/lib/access.ts
PAGE_MIN_PLAN = {
  trade: 'starter',
  aisearch: 'growth', market: 'growth', team: 'growth',
  iso9001: 'growth', analytics: 'growth', sipoc: 'growth',
  admin: 'scale',
  // factory = FREE (part of AI Company feature)
}
Plans: free(0) → starter(1) ฿390/mo → growth(2) ฿1,490/mo → scale(3) ฿5,900/mo
Trial: 15 วัน auto-start เมื่อ login ครั้งแรก
```

## Sidebar Pages (nav labels)
`Dashboard`, `บริษัท AI`, `Marketplace`, `หน้าร้านของฉัน`, `ซื้อขาย B2B (RFQ)`,
`ทีม / สมาชิก`, `โรงงานอัจฉริยะ`, `แพ็กเกจ & ชำระเงิน`, `SaaS Analytics`,
`ผู้ดูแลระบบ` (admin email เท่านั้น), `ISO 9001:2015 QMS`, `AI Research`, `Case Studies`

เครื่องมือ (sub-menu ใต้ `บริษัท AI`): `Journey Map`, `Conversion Funnel`, `ROI Calculator`,
`Personas`, `Content Plan`, `Priority Actions`, `Business Model · MIT24`, `Product Roadmap`,
`กลยุทธ์การตลาด`, `VRIO Analysis`, `SIPOC Process`

Public routes (ไม่ต้อง login): `/start` (viral landing), `/b`, `/b/<slug>` (หน้าร้านสาธารณะ)
Command reference: ดู `COMMAND.md`

## Supabase Schema
```
public.app_state          — user data (legacy, 1 row per user)
public.workspaces         — workspace per company
public.workspace_members  — members + roles (owner/admin/member)
public.workspace_state    — AppData JSON per workspace (main store)
public.app_admins         — system admins (support@b-tctraining.com)
public.marketplace_skills — skill ที่ admin วางขาย (0006)
public.skill_purchases    — บันทึกการซื้อ skill + pay_method (0007)
public.storefronts        — หน้าร้านสาธารณะ slug + vp (0009, 0011)
public.rfqs               — ใบขอเสนอราคา B2B; seller_slug NULL = ประกาศงานกลาง (0010, 0011)
public.orders             — ออเดอร์ + ค่าธรรมเนียม 3% (0010)
public.skill_auctions     — ประมูล skill แบบ English Auction (0012)
public.skill_bids         — บิดประมูล โปร่งใสเห็นกันหมด (0012)
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

### agent-run — Serper.dev Integration
```typescript
// POST https://google.serper.dev/search
// Header: X-API-KEY, Content-Type: application/json
// Body: { q, gl: 'th', hl: 'th', num: 5 }
// Response: data.organic[].{ title, link, snippet }
const SERPER_KEY = Deno.env.get('SERPER_API_KEY') ?? '';
```

## Secrets
```
GitHub Actions : VITE_SUPABASE_URL ✅, VITE_SUPABASE_ANON_KEY ✅
Supabase Fn   : ANTHROPIC_API_KEY ✅, CRON_SECRET ✅, SERPER_API_KEY ✅, RESEND_API_KEY ✅
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
Production = Cloudflare Workers: npm run build → npx wrangler deploy (worker ceo-ai-thailand)
Custom domain: ceoaithailand.org (จัดการ DNS ใน Cloudflare)
Legacy: push to main → GitHub Actions (deploy.yml) → GitHub Pages (ยังรันอยู่ ไม่ใช่ production)
Vercel: PR preview อัตโนมัติ
```

## Email / DNS (ceoaithailand.org)
ไม่ใช้ mailbox @ceoaithailand.org — **รับอีเมลที่ support@b-tctraining.com เท่านั้น**
ส่งอีเมลผ่าน Resend จาก `noreply@ceoaithailand.org`

DNS records ที่ต้องตั้งใน Cloudflare:
```
# GitHub Pages — A records (legacy — production ย้ายไป Cloudflare Workers แล้ว
# ถ้า route worker ผ่าน custom domain ใน Cloudflare ไม่ต้องใช้ A records ชุดนี้)
@       A       185.199.108.153
@       A       185.199.109.153
@       A       185.199.110.153
@       A       185.199.111.153
www     CNAME   kosid-b.github.io

# SPF (ส่งผ่าน Resend เท่านั้น)
@       TXT     "v=spf1 include:_spf.resend.com ~all"

# DKIM — Resend (TXT record จาก Resend Dashboard > Domains)
resend._domainkey   TXT     <value from Resend — starts with p=MIGf...>

# Resend bounce tracking
send    MX  10  feedback-smtp.us-east-1.amazonses.com
send    TXT     "v=spf1 include:amazonses.com ~all"

# DMARC
_dmarc  TXT     "v=DMARC1; p=quarantine; rua=mailto:support@b-tctraining.com; pct=100"
```

**หมายเหตุ Cloudflare**: `www` CNAME ต้องเป็น DNS only (grey cloud) ไม่ใช่ orange cloud
เพราะ GitHub Pages ต้องตรวจสอบ IP ตรงๆ

## Pending Items
- [ ] ตั้ง A records + www CNAME (grey cloud) ใน Cloudflare
- [ ] Verify domain ใน Resend dashboard → ได้ค่า DKIM TXT → ใส่ใน Cloudflare
- [ ] ตั้ง SPF + DMARC records ใน Cloudflare
- [ ] GitHub repo Settings → Pages → Custom domain → `ceoaithailand.org`
- [ ] ตั้ง Supabase Auth redirect URL: `https://ceoaithailand.org`
- [ ] Payment Gateway (Omise / GB Prime Pay) + ตั้ง `WEBHOOK_SECRET`
- [x] Google Analytics 4 (G-CHJ99RY1Q1) ใส่ใน index.html
- [x] RESEND_API_KEY ตั้งใน Supabase secrets
- [x] SERPER_API_KEY ตั้งใน Supabase Edge Function secrets
- [x] agent-run: เปลี่ยนจาก Brave Search → Serper.dev
- [x] ลบ Brave Search references ออกจาก UI ทั้งหมด
