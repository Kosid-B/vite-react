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

**Nav labels ที่ใช้ได้** (ตาม `src/components/Sidebar.tsx` ปัจจุบัน):
`Dashboard`, `บริษัท AI`, `Marketplace`, `หน้าร้านของฉัน`, `ซื้อขาย B2B (RFQ)`,
`ทีม / สมาชิก`, `โรงงานอัจฉริยะ`, `แพ็กเกจ & ชำระเงิน`, `SaaS Analytics`,
`ISO 9001:2015 QMS`, `AI Research`, `Case Studies`

**เครื่องมือ (sub-menu ใต้ "บริษัท AI"** — ต้องกด caret เปิดก่อนถึงคลิกได้**)**:
`Journey Map`, `Conversion Funnel`, `ROI Calculator`, `Personas`, `Content Plan`,
`Priority Actions`, `Business Model · MIT24`, `Product Roadmap`, `กลยุทธ์การตลาด`,
`VRIO Analysis`, `SIPOC Process`

> `ผู้ดูแลระบบ` แสดงเฉพาะ admin email (support@b-tctraining.com) — ไม่เห็นใน local mode

**Public routes (ไม่ต้อง login)**:
```
/start        — viral landing "เริ่มธุรกิจหลังตกงาน" (กลุ่ม Gen Z / เสมือนว่างงาน)
/b            — รวมหน้าร้านสาธารณะ
/b/<slug>     — หน้าร้านสาธารณะของแต่ละธุรกิจ
```

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

**Production**: `ceoaithailand.org` เสิร์ฟจาก **Cloudflare Workers** (worker `ceo-ai-thailand` — ยืนยันโดย Board ก.ค. 2569)
deploy ด้วย `npx wrangler deploy` (ดู section ถัดไป)

**Vercel**: เชื่อม repo ไว้สำหรับ **PR preview** — ทุก PR ได้ URL preview อัตโนมัติ (ไม่ใช่ production)

> **หมายเหตุ**: workflow `deploy.yml` (GitHub Pages) ยังรันอยู่เมื่อ push `main` แต่เป็น **legacy** —
> production ตัวจริงคือ Cloudflare Workers (workflow `static.yml` / `hostinger-deploy.yml` ปิดใช้งานแล้ว)

---

## Cloudflare Workers

> **Production ตัวจริง** — worker `ceo-ai-thailand` (config ใน `wrangler.jsonc`, entry `src/server.ts` + Durable Object `CeoAiAgent`)
> deploy ผ่าน wrangler (ไม่มี GitHub Actions workflow สำหรับ Cloudflare ใน repo — ถ้าเปิด Workers Builds ใน
> Cloudflare dashboard จะ auto-deploy เมื่อ push `main` ได้)

```bash
# deploy manual
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

> ⚠️ **แก้ไข 2026-07-03**: project ref เดิมของ section นี้ (`rsjbqmnvocvtveelselj`) ผิด — ไม่ใช่ production
> แก้เป็น `waigsnxhrlwtiotspaim` (ยืนยันแล้ว ดู [docs/isms/environment-map.md](docs/isms/environment-map.md))
> **ยังไม่ยืนยัน** ว่า Edge Function ทั้ง 6 ตัวด้านล่าง deploy อยู่จริงบน `waigsnxhrlwtiotspaim` — เช็ค
> dashboard ก่อนรันจริง (`supabase functions list --project-ref waigsnxhrlwtiotspaim`)

```bash
# deploy Edge Function ทีละตัว
npx supabase functions deploy ai-assist      --project-ref waigsnxhrlwtiotspaim
npx supabase functions deploy ai-plan        --project-ref waigsnxhrlwtiotspaim
npx supabase functions deploy agent-run      --project-ref waigsnxhrlwtiotspaim
npx supabase functions deploy generate-badge --project-ref waigsnxhrlwtiotspaim
npx supabase functions deploy billing-cron   --project-ref waigsnxhrlwtiotspaim
npx supabase functions deploy promptpay-webhook --project-ref waigsnxhrlwtiotspaim

# deploy ทุกตัวพร้อมกัน
npx supabase functions deploy --project-ref waigsnxhrlwtiotspaim

# ตั้ง secret ใน Edge Functions
npx supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref waigsnxhrlwtiotspaim
npx supabase secrets set RESEND_API_KEY=<key>    --project-ref waigsnxhrlwtiotspaim
npx supabase secrets set SERPER_API_KEY=<key>    --project-ref waigsnxhrlwtiotspaim
npx supabase secrets set CRON_SECRET=<key>       --project-ref waigsnxhrlwtiotspaim

# รัน migration
npx supabase db push --project-ref waigsnxhrlwtiotspaim
```

### Migrations (applied บน production ครบแล้วทั้ง 0001–0012)

| ไฟล์ | เนื้อหา |
|---|---|
| 0001_init.sql | app_state (legacy) |
| 0002_workspaces.sql | workspaces + workspace_state |
| 0003_members.sql | workspace_members + roles |
| 0004_billing_cron.sql | pg_cron ต่ออายุ/downgrade |
| 0005_admin.sql | app_admins + is_app_admin() |
| 0006_marketplace_skills.sql | ตลาด skill + skill_purchases |
| 0007_skill_stats.sql | สถิติซื้อ skill |
| 0008_weekly_report_cron.sql | รายงานรายสัปดาห์ |
| 0009_storefronts.sql | หน้าร้านสาธารณะ (slug) |
| 0010_rfq_orders.sql | RFQ + orders (ค่าธรรมเนียม 3%) |
| 0011_open_rfq_vp.sql | ประกาศงานกลาง (open RFQ) + storefronts.vp |
| 0012_skill_auctions.sql | ประมูล skill (English Auction) |

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

-- หน้าร้านที่เผยแพร่แล้ว
SELECT slug, name, published, vp FROM public.storefronts ORDER BY updated_at DESC;

-- RFQ ล่าสุด (seller_slug IS NULL = ประกาศงานกลาง)
SELECT id, buyer_name, seller_slug, sector, status, budget, quote_amount, created_at
FROM public.rfqs ORDER BY created_at DESC LIMIT 20;

-- ออเดอร์ + GMV + ค่าธรรมเนียม 3%
SELECT status, COUNT(*), SUM(amount) AS gmv, SUM(fee) AS fees
FROM public.orders GROUP BY status;

-- ประมูล skill ที่เปิดอยู่ + บิดสูงสุด
SELECT a.skill_name, a.status, a.ends_at,
       (SELECT MAX(b.amount) FROM public.skill_bids b WHERE b.auction_id = a.id) AS top_bid
FROM public.skill_auctions a ORDER BY a.created_at DESC;

-- ยอดขาย skill (รวมที่มาจากประมูล — pay_method ขึ้นต้น 'auction:')
SELECT skill_id, pay_method, COUNT(*), SUM(price) FROM public.skill_purchases
GROUP BY skill_id, pay_method ORDER BY SUM(price) DESC;
```

---

## Key URLs

| รายการ | URL |
|---|---|
| Production | https://ceoaithailand.org |
| Viral Landing | https://ceoaithailand.org/start |
| หน้าร้านสาธารณะ | https://ceoaithailand.org/b/<slug> |
| Supabase Dashboard | https://supabase.com/dashboard/project/waigsnxhrlwtiotspaim |
| Supabase Auth Config | https://supabase.com/dashboard/project/waigsnxhrlwtiotspaim/auth/url-configuration |
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
