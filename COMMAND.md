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

```bash
# deploy Edge Function ทีละตัว
npx supabase functions deploy ai-assist      --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy ai-plan        --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy agent-run      --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy generate-badge --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy billing-cron   --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy promptpay-webhook --project-ref rsjbqmnvocvtveelselj
npx supabase functions deploy delete-account  --project-ref rsjbqmnvocvtveelselj

# ── Payment Gateway: Xendit (SaaS subscription) ──
npx supabase functions deploy create-invoice  --project-ref waigsnxhrlwtiotspaim      # verify_jwt=true
npx supabase functions deploy xendit-webhook  --no-verify-jwt --project-ref waigsnxhrlwtiotspaim

# secrets Xendit (ตั้งครั้งเดียว — จาก dashboard.xendit.co/settings/developers)
npx supabase secrets set XENDIT_SECRET_KEY=xnd_...        --project-ref waigsnxhrlwtiotspaim
npx supabase secrets set XENDIT_CALLBACK_TOKEN=<token>    --project-ref waigsnxhrlwtiotspaim
# แล้วตั้ง Webhook (Xendit → Settings → Webhooks → Invoices paid):
#   https://waigsnxhrlwtiotspaim.supabase.co/functions/v1/xendit-webhook
# copy Callback Verification Token จากหน้านั้นมาใส่ XENDIT_CALLBACK_TOKEN
#
# ── Auto-renew: Xendit Recurring API (ตัดเงินอัตโนมัติทุกงวด) ──
npx supabase functions deploy create-recurring-plan --project-ref waigsnxhrlwtiotspaim   # verify_jwt=true
npx supabase functions deploy recurring-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
# ตั้ง Webhook เพิ่ม (Xendit → Webhooks → Recurring: cycle.succeeded/failed, plan.activated/inactivated):
#   https://waigsnxhrlwtiotspaim.supabase.co/functions/v1/recurring-webhook   (ใช้ XENDIT_CALLBACK_TOKEN เดิม)
#
# ── Refund (คืนเงิน — Admin) ──
npx supabase functions deploy refund-invoice --project-ref waigsnxhrlwtiotspaim         # verify_jwt=true (ตรวจ admin)
# หน้า ผู้ดูแลระบบ → การ์ด "💸 คืนเงิน (Refund)": ก่อน KYC = record-only (คืนเองแล้วบันทึก) · หลัง = ยิง Xendit จริง
#
# ✅ Checklist เปิดใช้ปุ่มจ่ายออนไลน์ (หลัง Xendit อนุมัติบัญชี/ผ่าน KYC):
#   1. deploy create-invoice + xendit-webhook (2 คำสั่งด้านบน)
#   2. set XENDIT_SECRET_KEY + XENDIT_CALLBACK_TOKEN + ตั้ง webhook URL
#   3. แก้ src/config.ts → PAYMENT.xenditLive = true → commit + merge (Cloudflare deploy อัตโนมัติ)
#      → ปุ่ม "จ่ายผ่าน Xendit" จะปรากฏบนหน้าแพ็กเกจ
#   * ระหว่างรอ KYC: xenditLive=false → ลูกค้าโอน/QR + ส่งสลิป แอดมินเปิดใช้งานให้
#   * Auto-renew: หลัง xenditLive แล้ว → deploy create-recurring-plan + recurring-webhook
#     + ตั้ง PAYMENT.recurringLive = true → ปุ่ม "สมัครตัดเงินอัตโนมัติ" ปรากฏ

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

---

## Marketing & Growth (หาลูกค้า)

**Skills การตลาด (`.claude/skills/`)** — ใช้วางแผน/สร้างเอกสารกลยุทธ์:
```
marketplace-seo       — SEO ตลาด (implement ในโค้ดแล้ว — ดู docs/marketing/MARKETPLACE-SEO.md)
market-research       — TAM/SAM/SOM + segment + คู่แข่ง + หาลูกค้าอยู่ช่องไหน
facebook-group-plan   — กลุ่ม FB ชุมชน + lead gen
linkedin-strategy     — personal brand ที่ปรึกษา 20 ปี → inbound B2B
networking-strategy   — พันธมิตร/referral + seed ร้านเข้าตลาด /b
```

**เอกสารแผน (`docs/marketing/`)** — ปรับให้ CEO AI Thailand จริง (ราคา/segment/ช่องทางไทย):
`README.md` (index + 90 วันแรก) · `MARKET-RESEARCH.md` · `MARKETPLACE-SEO.md` ·
`FACEBOOK-GROUP-PLAN.md` · `LINKEDIN-STRATEGY.md` · `NETWORKING-STRATEGY.md`

### Marketplace SEO — server-side (Cloudflare Worker)
```
src/server.ts intercept GET /b/<slug>, /b, /sitemap.xml → อ่าน storefronts (Supabase REST, anon key)
→ HTMLRewriter inject title/meta/canonical/OG + JSON-LD (LocalBusiness/Breadcrumb/ItemList).
src/lib/seoData.ts = builders (pure, escape XSS) · src/lib/seo.ts = client applySeo().
wrangler.jsonc vars: SUPABASE_URL / SUPABASE_ANON_KEY / SITE_ORIGIN (public — commit ได้).
Deploy: merge → Cloudflare auto-deploy (ไม่ต้อง manual/PowerShell).
```
**งานคนหลัง merge:** ยืนยัน `/sitemap.xml` คืนหลาย URL → ส่งเข้า **Google Search Console** →
Rich Results Test 1 หน้าร้าน → seed liquidity (ชวนธุรกิจ 10–20 รายเปิดร้านจริง).
