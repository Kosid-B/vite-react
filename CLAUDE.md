# CEO AI Thailand — Project Memory

## Overview
Thai SaaS app "บริษัท AI อัตโนมัติ" — Vite + React SPA, no router (navigation = React state).
Sidebar `button.nav-item` switches pages. Deployed on Cloudflare Workers + Supabase backend.

🛑 **กฎสูงสุด — ความถูกต้องมาก่อนเสมอ** (เจ้าของยืนยัน 19 ส.ค. 2569 · เหนือกว่าทุกข้อด้านล่าง)
**ห้ามพูดสิ่งที่ยังไม่ได้ตรวจ** · ตรวจไม่ได้ ให้บอกว่าตรวจไม่ได้ **เพราะอะไร** — ห้ามเดาแล้วเล่าเหมือนรู้
ทุกคำกล่าวอ้างต้องติดป้ายได้: 🟢 ตรวจแล้ว (บอกได้ว่าตรวจยังไง) · 🟡 ยังไม่ได้ตรวจ · 🔴 ตรวจไม่ได้เพราะ X
**ความเร็วต้องยอมแพ้ความถูกต้องเสมอ** — ตอบช้าแต่ถูก ดีกว่าตอบไวแล้วผู้ใช้เสียเวลาไปกับของที่ไม่จริง
⚠️ วันที่ 17–19 ส.ค. 2569 ผิดกฎนี้ 5 ครั้งใน 2 วัน (ledger ข้อ 10–17) — ทุกครั้งรูปแบบเดียวกัน:
   **รายงานว่าจริง/เสร็จ ก่อนไปดูของจริง** ทั้งที่หลักฐานอยู่ในมือแล้ว (ไฟล์ · config · CI · ข้อมูลใน DB)

🔧 **วิธีทำงานที่บังคับใช้ — skill `growth-mindset`** (อ่านก่อนส่งมอบทุกครั้ง)
ผิดแล้วต้องเหลือ **กลไก** ไม่ใช่คำขอโทษ · พยายามพิสูจน์ว่าตัวเองผิดก่อนส่ง โดยเฉพาะตอนกำลังจะเห็นด้วย
ตรวจว่าเครื่องมือทำงานจริงก่อนเชื่อผล (เช่น `tsc --noEmit` ที่รากเป็น no-op — ต้องใช้ `tsc -p tsconfig.app.json`)
เช็คกับหลักการโปรเจกต์ก่อนสามัญสำนึกตลาด · พูด "ยังทำไม่ได้เพราะขาด X" ไม่ใช่ "ทำไม่ได้"
บันทึกความผิดพลาด→กลไก: [docs/LESSONS-LEDGER.md](docs/LESSONS-LEDGER.md) — **เพิ่มแถวทุกครั้งที่พลาด พร้อมกลไกจริง**

🚢 **ก่อนบอกว่า "เสร็จ" ทุกครั้ง — skill `shipped-not-written`** (บทเรียนรวม 17–18 ส.ค. 2569)
"เขียนถูก" ≠ "ทำงานจริง" · เครื่องมือทุกตัว (tsc/vitest/eslint/wrangler --dry-run) ตรวจแค่ว่าโค้ดถูก **ไม่มีตัวไหนตรวจว่าโค้ดถูกเรียกใช้**
พิสูจน์ 4 ชั้น: ①โค้ดถูกเรียกจริงไหม ②ข้อมูลหน้าตาตรงกับที่ประกาศไหม (`as Partial<>` = ประกาศ ไม่ใช่ตรวจ) ③เครื่องมือที่ตรวจ = ตัวที่ใช้จริงไหม ④CI ขึ้น success แล้วไหม
⚠️ **"push แล้ว" ≠ "อยู่บน production แล้ว"** — เช็ค GitHub Actions ก่อนบอกผู้ใช้ให้ไปทดสอบเสมอ
กลไก: `rpcContract.test.ts` (SQL↔TS) · `workerRouting.test.ts` (server.ts↔wrangler.jsonc) · `deployToolchain.test.ts` (เวอร์ชันเครื่องมือ dev↔CI)

📣 **ก่อนปล่อยคอนเทนต์ทุกชิ้น — skill `content-link-contract`** (ยกเป็นกฎบังคับ 19 ส.ค. 2569)
ส่งมอบคอนเทนต์ = **คอนเทนต์ + ลิงก์ติดตัวย่อ + บทความปลายทางที่มีของจริง** ขาดข้อใดข้อหนึ่ง = ยังไม่เสร็จ
⚠️ **ปลายทางที่ไม่มีเนื้อหาจริง แย่กว่าไม่มีลิงก์เลย** — ไม่มีลิงก์คือไม่ได้อะไรเพิ่ม แต่กดแล้วหาไม่เจอ = เขาเรียนรู้ว่าเราหลอกให้กด
🎬 **ตอนจบคลิปต้อง "ค้าง" ไม่ใช่ "อิ่ม"** — ปิดด้วยคำถามที่เขาตอบเองไม่ได้ถ้าไม่รู้ตัวเลขของตัวเอง · **คำถามมาก่อนลิงก์เสมอ** (ลิงก์ก่อน = โฆษณา)
เส้นแบ่งระหว่าง "เปิดช่องว่าง" กับ "หลอกให้กด" = ปลายทางมีของจริงไหม เท่านั้น
กลไก: `contentLinkContract.test.ts` (ทุก offer/คลิป → `provenBy`/`answeredBy` ต้องเป็นหัวข้อจริงในบทความ + ถ้าสัญญาว่ามี "ตาราง/เครื่องคำนวณ/เช็คลิสต์" บทความต้องมีจริง) · `videoEndingContract.test.ts`

🔁 **การวางระบบทุกอย่างต้องเป็นวงจร PDCA** (ยืนยันโดยเจ้าของ 19 ส.ค. 2569)
ห้ามส่งมอบ "สิ่งที่ทำ" เดี่ยว ๆ — ต้องบอกได้ว่ามันอยู่ตรงไหนของวงจร และวงจรปิดยังไง
**① Plan** ตั้งใจปล่อยอะไร กี่ชิ้น · **② Do** หลักฐานคือ **มีคนเข้ามาจากชิ้นนั้นจริง** ไม่ใช่คำว่า "โพสต์แล้ว"
**③ Check** ต้องพิสูจน์ว่า *เครื่องมือวัดทำงานอยู่* **ก่อน** อ่านตัวเลข · **④ Act** ห้ามตัดสินใจถ้า ③ ยังตาบอด
⚠️ **ลำดับนี้ห้ามข้าม** — ที่ผ่านมาเรากระโดดไป Act (แก้พาดหัว/เพิ่มฟีเจอร์) ตอน Check ยังตาบอด
   ผลคือ "แก้แล้วดีขึ้นไหม" ตอบไม่ได้สักครั้ง แล้ววนแก้ใหม่ไปเรื่อย ๆ
⚠️ **เครื่องมือที่ "ตั้งไว้แต่ไม่ได้ต่อ" ทำให้ทุกตัวเลขกลายเป็นคำโกหกโดยการละเว้น** (Amplitude ได้ 0 event 
   มาตลอด — ledger ข้อ 18) · `receiving: null` = **ตรวจไม่ได้** ต้องประกาศเป็นจุดบอด ห้ามเดาว่า "มีคีย์ = ใช้ได้"
กลไก: `src/lib/growthPdca.ts` (pure/tested · `stuckAt` = เฟสแรกที่ยังไม่ผ่าน · `canAct` ล็อกเมื่อ Check ไม่ผ่าน)
   · แผง `components/GrowthPdcaPanel.tsx` **อยู่บนสุด** ของแท็บการเติบโต (อ่านตัวเลขก่อนรู้ว่าวงจรค้างตรงไหน = มั่นใจแต่ผิด)
   · PDCA ฝั่งคุณภาพ/ISO เป็นคนละวงจร ใช้หลักเดียวกัน: `src/lib/eqms.ts`
   · `envContract.test.ts` = ชั้น Check ของ "โค้ดถูกเรียกใช้จริงไหม" (env ทุกตัวต้องถูกส่งเข้า build)

⚙️ **กฎบังคับการพัฒนา — skill `dynamic-plg`** (ยืนยันโดยเจ้าของ 16 ส.ค. 2569)
ทุกการแก้ไข/พัฒนาต้องเป็น **PLG** (ผู้ใช้ได้คุณค่าเองโดยไม่ต้องผ่านคน) และ **Dynamic PLG** (สิ่งที่เห็นเปลี่ยนตามสิ่งที่ระบบรู้เกี่ยวกับเขา)
รวมถึง **Landing Page ต้อง dynamic ตามผู้ใช้** — ระบบรู้อะไรแล้วยังแสดงเหมือนไม่รู้ = ผิดกฎ
⚠️ ต้องตรวจ **ทั้งสาย**: ต้นทางส่งบริบท → ไม่ตกหล่นระหว่างหน้า → **ปลายทางใช้จริง**
(เคยพลาด: เติม `?seg=` ให้ CTA แล้ว แต่ `/start` ไม่ได้อ่านค่านั้นเลย)
กลไกบังคับ: `src/lib/__tests__/dynamicPlg.test.ts` · แผนที่สัญญาณ: `src/lib/ctaContext.ts` + `src/lib/startHero.ts`

👥 **กลุ่มเป้าหมายค่าตั้งต้น = เจ้าของธุรกิจที่ขายอยู่แล้ว (35–65)** — แก้ 16 ส.ค. 2569 จากข้อมูลที่วัดได้
YouTube คลิป 942 วิว: **อายุ 18–24 = 0.0% · 45 ปีขึ้นไป = 58.1%** · คงผู้ชม 89% แต่ผู้ติดตาม 0 และแทบไม่มีใครกดออกไปเว็บ
ของเดิม `/start` พูดกับ "คนจบใหม่ · คนหางาน" = กลุ่มที่ไม่มีอยู่ในผู้ชมเราเลยแม้แต่คนเดียว
⚠️ **ไม่ได้ตัดมือใหม่ทิ้ง** — `seg=newbie` ยังมีพาดหัวของตัวเอง (มาจากคอนเทนต์เรื่องทุน)
`src/lib/startHero.ts` (default = seller-style) · `ctaContext.FALLBACK_SEG = 'seller'`

📊 **ก่อนเชื่อผลการทดลอง — skill `experiment-reality-check`**
นับ **คนที่เห็นความต่างจริง** ไม่ใช่ผู้เข้าชมทั้งหมด (ของใต้ครึ่งหน้า = คนที่เลื่อนถึง — เคยหลอกตา: 60 คน แต่เห็นจริง 1)
ตัวชี้วัดต้องเกิดบ่อยพอ (สมัคร 1 ครั้งใน 60 คน = วัดความบังเอิญ → ใช้ CTA แทน) · คนน้อยให้รันทีละชุด
"หยุด" ≠ "ฟีเจอร์แย่" — ต้องมีค่าตั้งต้น + เหตุผลในโค้ด · "ปรับตามสถานะ" ≠ "การทดลอง" (กลุ่มไม่ได้สุ่มมา เทียบไม่ได้)
แผนต้องอยู่ในโค้ดและมีเทสต์ยืนยันว่าถูกเรียกใช้จริง: `src/lib/experimentPlan.ts`

🔑 **หลักการก่อตั้งที่ห้ามลืม — ISO ทำได้ตั้งแต่ปีแรก** (skill `iso-from-day-one`)
ISO ไม่ใช่ใบเซอร์ของบริษัทใหญ่ แต่คือวิธีสร้างธุรกิจให้ทำซ้ำได้+ขยายได้ → ธุรกิจปีแรกคือจังหวะที่ถูกที่สุด
ด่านคือ **"ความไว้ใจของเจ้าของ" ไม่ใช่ "ความพร้อมของธุรกิจ"** · ยิ่งรอยิ่งแพงเพราะต้อง retrofit
⚠️ ห้ามเขียนกลยุทธ์/คอนเทนต์ว่า "รอให้ธุรกิจโตก่อนค่อยทำ ISO" — ขัดจุดยืนโปรเจกต์ (พลาดมาแล้ว 16 ส.ค. 2569)
⚠️ ห้ามขึ้นต้นคอนเทนต์ด้วยคำว่า ISO กับคนเพิ่งเริ่มธุรกิจ — ใช้บันไดความไว้ใจ 5 ขั้นก่อน

**Positioning (ยืนยัน ก.ค. 2569): "AI Business Operating System"** — ระบบสร้างธุรกิจด้วย AI ตั้งแต่ต้นน้ำ ให้โตอย่างเป็นระบบ+พร้อมขยาย
ผสาน 2 เสา: **MIT 24 Steps** (หา PMF/ลูกค้า/คุณค่า) × **ระบบบริหาร/ISO 20+ ปี B.TC** (SOP/KPI/Risk/scalability).
สารหลัก **ไม่ใช่** "จ้างทีม AI ทั้งบริษัท" — "ทีม AI" = กลไกสนับสนุน · คุณค่าหลัก = ลดความเสี่ยงเริ่มธุรกิจ + ฐานลูกค้าแข็งแรง + scale.
compliance (PDPA/ISO) = ฟีเจอร์เสริม (ไม่ใช่บริการทำใบเซอร์ — งานที่ปรึกษาส่งต่อ B.Training). แหล่ง canonical: `src/lib/seoData.ts` + `/start` + [BRAND-ARCHITECTURE.md](docs/marketing/BRAND-ARCHITECTURE.md) §8

## Stack
- **Frontend**: Vite + React + TypeScript, CSS variables (dark theme `#0f172a`)
- **Backend**: Supabase (Auth, Postgres RLS, Edge Functions)
- **Deploy**: Cloudflare Workers (worker `ceo-ai-thailand`, `npx wrangler deploy` — production ยืนยันโดย Board ก.ค. 2569); `deploy.yml` → GitHub Pages ยังรันอยู่แต่เป็น legacy; Vercel = PR preview
- **Email**: Resend API (via Edge Functions) — ส่งจาก `noreply@ceoaithailand.org`
- **Search**: Serper.dev (Google Search API) — ใช้ใน agent-run Edge Function
- **Billing**: pg_cron + billing-cron Edge Function (daily 02:00 UTC)

## TIS Automate (ผลิตภัณฑ์แยก)
```
Supabase Project ID : galtbbkcddugnsfkgyqm  (แยกจากระบบหลักโดยสมบูรณ์ — ทางเลือก B โดย Board)
Supabase URL        : https://galtbbkcddugnsfkgyqm.supabase.co
Region              : ap-southeast-1 (สิงคโปร์) · Free tier ฿0/เดือน
Schema              : migrations/0016_tis_automate + 0017_tis_rls_fixes + 0018_tis_write_policies_and_seed
                      13 ตาราง (organizations/standards/clauses/projects/requirements/kanban/
                      documents/validations/marketing_events/…) + 5 enums + RLS ครบ
                      ⚠️ project galtbbkcddugnsfkgyqm = INACTIVE (ยืนยันผ่าน MCP 10 ก.ค. 2569) — สถานะ apply ต้องตรวจเมื่อ resume
หมายเหตุ            : 0016–0018 อยู่ใน repo นี้เพื่อเก็บประวัติ แต่ apply กับ project TIS เท่านั้น
                      (ห้าม apply กับ production หลัก waigsnxhrlwtiotspaim หรือ dev oudykxmtrnjeskglaluh) · frontend/subdomain ยังไม่สร้าง
```

## Production Credentials
```
Supabase Project ID : waigsnxhrlwtiotspaim  (org bgvyelbcbxhzzfrzuqnh, Pro — production จริง ยืนยัน 2026-07-07)
Supabase URL        : https://waigsnxhrlwtiotspaim.supabase.co
Public Key          : sb_publishable_Tf6Q7Mq6I2OLtfXot-EWJA_FESohA9E  (publishable = public โดยดีไซน์ ตรงกับ wrangler.jsonc)
Custom Domain       : ceoaithailand.org
Admin Email         : support@b-tctraining.com
GA4                 : G-CHJ99RY1Q1 (ใส่ใน index.html แล้ว)
```
> ⚠️ Production identity แก้ 2 รอบ (config drift R11/R19). ตัวจริง = `waigsnxhrlwtiotspaim` — ยืนยันด้วย JS bundle
> เว็บจริง + deploy scripts + wrangler.jsonc. project เดิม `rsjbqmnvocvtveelselj` (Vercel org, Free) **ไม่ใช่ prod**
> (เก็บเป็น backup รอตัดสินใจลบ). แหล่งความจริง: [docs/isms/environment-map.md](docs/isms/environment-map.md) v3.0

## Local Dev vs Production
- **Local mode** (ไม่มี `.env`): ข้อมูลเก็บใน `localStorage`, ไม่ต้อง login, plan = Scale (full access)
- **Production mode** (มี `VITE_SUPABASE_URL`): ต้อง login, sync ขึ้น Supabase, plan บังคับใช้
- **ห้ามสร้าง `.env` ใน repo** — ตั้งผ่าน GitHub Secrets เท่านั้น

## ⚠️ Lessons Learned — Layout/UX gotchas (กันพลาดซ้ำ)
```
GOTCHA #1 — .guest-bar กลายเป็น "แถบฟ้าเต็มความสูง" ดันเนื้อหาไปขวา (บั๊กเสียเวลา debug นาน ก.ค. 2569)
  • .app { display:flex } (row) · .guest-bar เป็นลูกตรงของ .app (App.tsx ~623) พื้นหลัง gradient teal
    ถ้าไม่กำหนดความกว้าง → กลายเป็น flex column เต็มความสูง (align-items:stretch) ดัน .main ไปขวา
  • แก้: .app { flex-wrap:wrap } + .guest-bar { flex:0 0 100%; width:100% }  (index.css)
  • ⚠️ .guest-bar โผล่ "เฉพาะ production guest mode" (isSupabaseEnabled && !session && guestMode)
    → LOCAL DEV ไม่ render (ไม่มี Supabase) = reproduce ตรง ๆ ไม่ได้!
    วิธี debug: Playwright inject <div class="guest-bar"> เข้า .app แล้ววัด box (ดู scratchpad/verify.mjs)

บทเรียนกระบวนการ (สำคัญกว่าตัวบั๊ก):
  1. UI ที่เป็น "prod/guest-only" reproduce ใน local ไม่ได้ — ต้อง inject element จำลอง ก่อนสรุปสาเหตุ
  2. อย่าโทษ "การแก้ล่าสุดของตัวเอง" โดยไม่ reproduce ให้เห็นก่อน — ครั้งนี้เดาผิดว่าเป็น max-width
     ของตัวเอง (revert ไปก็ไม่หาย) ทั้งที่ตัวจริงคือ .guest-bar flex column
  3. เจอบั๊ก layout: ตรวจ "ลูกตรงของ flex container" ทุกตัวว่ามีความกว้างชัดเจนไหม (โดยเฉพาะ banner/overlay
     ที่ควรเต็มแถวแต่ไม่ได้กำหนด flex-basis) — align-items:stretch ทำให้มันสูงเต็ม container
  4. ผู้ใช้บอก "มือถือปกติ + เมื่อวานปกติ" = เบาะแสทองว่าเป็น state-specific (guest vs login) ไม่ใช่ทุกคน

GOTCHA #2 — ข้อความ header sidebar "ซ้อนทับกัน" (collapsed:hover peek / จอเตี้ย)
  • .sidebar = flex column, position:fixed height 100vh · .sidebar-brand เดิม flex-shrink:1 (default)
    เมื่อเนื้อหา sidebar สูงเกินจอ → flex บีบ .sidebar-brand (มี min-height:52px ของ state ยุบ)
    เหลือ 52px แต่ content (sub/badge) ล้นออกมาทับ .nav-section ด้านล่าง
  • แก้: .sidebar-brand { flex-shrink:0 } → brand ไม่ถูกบีบ · sidebar เลื่อน (overflow-y:auto) แทน
  • บทเรียน: flex item ที่ "ต้องคงความสูงตาม content" (header/brand) ให้ flex-shrink:0 เสมอ
    โดยเฉพาะใน flex-column ที่ parent สูงจำกัด — ไม่งั้นถูกบีบจน content ล้นทับตัวถัดไป
  • reproduce: force .sidebar.collapsed + page.hover (ต้องลบ .onb-overlay/.goal-overlay ก่อน hover) — scratchpad/sb2.mjs

GOTCHA #3 — แก้ index.css แล้ว "ไม่ขยับ" เพราะ inline <style> ในคอมโพเนนต์ทับอยู่ (20 ส.ค. 2569)
  • LandingPage.tsx มี <style> ฝังในคอมโพเนนต์ → อยู่ "หลัง" index.css ใน DOM
    specificity เท่ากัน + !important ทั้งคู่ ⇒ ตัวหลังชนะเสมอ = index.css แพ้
  • ของจริงที่เจอ: padding-bottom:200px !important ที่กันที่ไว้ให้แถบคุกกี้ตัวเก่า (สูง 130px)
    แต่แถบคุกกี้ถูกย่อเหลือ 86px ไปแล้ว → กันที่เกินจริง 114px ค้างอยู่โดยไม่มีใครรู้
    ⇒ แก้ index.css รอบแรกได้คืนแค่ 21px ทั้งที่ค่าที่เขียนถูกต้อง
  • บทเรียน: ค่าที่ "กันที่ไว้ให้ของอีกชิ้น" (ความสูงแถบ/แถบล่าง/header) เป็นหนี้ที่ลืมง่ายที่สุด
    เปลี่ยนความสูงของชิ้นไหน ให้ไล่หาว่าใครกันที่ไว้ให้มันบ้าง (grep ค่าตัวเลขนั้น)
  • วิธีตรวจว่าโดนทับไหม: getComputedStyle ในเบราว์เซอร์จริง ไม่ใช่อ่านไฟล์ CSS
    (อ่านไฟล์ = เห็น "สิ่งที่เราเขียน" · getComputedStyle = เห็น "สิ่งที่เบราว์เซอร์ใช้จริง")
  • ⚠️ ขอบจอแรกบนมือถือคือทรัพยากรที่แพงที่สุดของเว็บนี้ — ข้อมูลจริง: ผู้เข้าชม 75 คน
    เลื่อนหน้าเฉลี่ย 5.2% · 85% ไม่เลื่อนเลย ⇒ อะไรอยู่ใต้ขอบจอ = แทบไม่มีใครเห็น

GOTCHA #4 — "ขอบจอ" ของ iPhone **ไม่ใช่ 844px** (พลาดจริง 20 ส.ค. 2569 · ledger #23)
  • 390x844 = ขนาดจอเครื่อง · Safari กินแถบที่อยู่+แถบล่างไป ~180px ⇒ ที่ให้เว็บใช้จริง = **664px**
    Playwright `devices['iPhone 13'].viewport` = 390x664 ตรงกับของจริง — ใช้ค่านี้ ไม่ใช่สเปกเครื่อง
  • ห้ามตัดสินว่า "อยู่ในจอแรกไหม" ด้วยเลขที่จำมา — อ่าน `window.innerHeight` จากเบราว์เซอร์เสมอ
  • ตรวจหลายขนาดเสมอ: iPhone 13 =664 · iPhone SE =568 · iPhone 14 Pro Max =740 · Pixel 7 =839
  • ⚠️ **ความกว้างสำคัญกว่าความสูง** — จอแคบลง ตัวอักษรตกบรรทัดมากขึ้น hero จึง**สูงขึ้น**ทั้งที่จอเตี้ยลง
    ต้องตรวจครบทั้ง 4 ชั้น: **320 (SE) · 360 (Android) · 375 (iPhone 8) · 390+** (ledger #27 — เคยตรวจแค่ 4 เครื่อง
    แล้วประกาศว่าเหลือแค่ SE ที่ไม่ผ่าน ทั้งที่ 360 และ 375 ก็ไม่ผ่าน)
  • บังคับวัดด้วย **worst case** เสมอ: `?seg=food` (h1 ยาวสุด) + `localStorage.ceo_ai_ab='ab-B'` (subLead ยาวสุด)
    ไม่งั้นผลเปลี่ยนไปมาทุกครั้งที่รัน เพราะพาดหัวเป็น A/B
  • 🔴 ของที่ `position:fixed` (แถบคุกกี้/แถบล่าง) บัง **ก้นจอ** ไม่ใช่ก้นของ section ไหน
    ⇒ ห้ามเว้น padding ใน section เพื่อกันมัน (เคยเว้น 200→104px แล้ววัดจริงปุ่มยังถูกบัง 34px)
    ที่ถูก = กันที่ท้าย `<body>` โดยวัดความสูงจริงของแถบ (CookieConsent.tsx + ResizeObserver)
  • กลไก: `src/lib/__tests__/mobileFoldContract.test.ts` (เพดาน padding + ลำดับ section + วิธีกันที่ของ fixed)
    · `onboardingOverlay.test.ts` ล็อกว่า quickcheck ต้องเป็น section ที่ 2 ต่อจาก hero

GOTCHA #5 — ตัวเลข "เลื่อนไปกี่ %" บนหน้า Landing **ไม่ได้แปลว่าอ่านไปเท่านั้น** (วัดจริง 20 ส.ค. 2569)
  • หน้า Landing สูง **38,894px** บน iPhone 13 (จอ 664px) = 58 หน้าจอ
    ⇒ คนที่อ่าน hero + เครื่องคำนวณ + positioning + roadmap ครบ (2,400px) ได้ `max_scroll` = **6%**
    ⇒ `engaged` ที่นิยามว่า "เลื่อน ≥ 50%" = ต้องเลื่อนผ่าน 19,000px ≈ ไม่มีวันมีใครถึง
  • ⚠️ ห้ามอ่าน `avg_scroll` ว่า "อ่านเนื้อหาไปกี่ %" — ให้ดู `sections` (วินาทีต่อบล็อก) แทน
    ซึ่งเพิ่งเริ่มเก็บได้จริงหลังแก้ GOTCHA ของ IntersectionObserver (ledger #25)
  • `max_scroll = 0` แปลว่า "ขยับน้อยกว่า ~190px" ไม่ใช่ "ไม่ขยับเลย"

GOTCHA #6 — แท็ก utm ตายกลางทาง ระหว่างลิงก์สั้น → บทความ → /start (ledger #24)
  • ลิงก์สั้นทุกตัวชี้ไป `/blog/<slug>` หรือ `/calc` = HTML ที่ Worker เรนเดอร์ **ไม่มี React**
    ⇒ ไม่มีแถวใน `landing_funnel` เลย · funnel เห็นคนก็ต่อเมื่อเขาเดินมาถึงหน้า Landing แล้ว
  • ปุ่มในบทความเคยเขียน `utm_source=blog` **ทับ** ที่มาจริง ⇒ เครดิตของ Facebook/TikTok หายที่ hop นั้น
  • ⚠️ คนที่มาจากบทความของเราเอง จะถูกจำแนกเป็น `ref_kind='direct'` เสมอ (referrer = โดเมนตัวเอง)
    ⇒ ตัวเลข "direct" ในรายงาน **ไม่ใช่** "พิมพ์ URL เข้ามาเอง"
  • กลไก: `src/lib/utmForward.ts` (`mergeUtm` — ที่มาแรกชนะสำหรับ source/medium · หน้าปัจจุบันชนะสำหรับ
    campaign/content) + `utmForwardScript()` ฝังท้ายทุกหน้า server-rendered (ต้องทำฝั่ง browser
    เพราะหน้าพวกนี้ cache 1 ชม. — ฝังฝั่ง server = คนถัดไปได้เครดิตของคนก่อน)
    · `attributionContract.test.ts` รันสคริปต์ตัวจริงใน jsdom + บังคับว่า JS กับ TS ใช้ชื่อคีย์เดียวกัน
  • 🟡 `landing_funnel` ยังไม่มีคอลัมน์ `utm_medium` ⇒ ตอบไม่ได้ว่า "คอมเมนต์ปักหมุด vs ไบโอ" อันไหนดีกว่า
```

## Key Source Files
```
src/App.tsx                    — root component, routing state, auto-trial logic
src/types.ts                   — TypeScript interfaces (AppData, Task, Agent, etc.)
src/data.ts                    — default data / task templates
src/lib/access.ts              — plan access control (canAccess, effectiveRank, PAGE_MIN_PLAN)
src/components/Sidebar.tsx     — navigation + plan badge + lock icons
src/components/UpgradeWall.tsx — locked page overlay
src/components/Billing.tsx     — subscription management UI
src/pages/AICompany.tsx        — บริษัท AI page (factory, agent tasks) · ชื่อ/เป้าหมาย = controlled draft (แก้บั๊กพิมพ์แล้วหาย)
src/lib/companyIdentity.ts     — CEO เสนอชื่อบริษัท (หลัก Corporate Identity) + โลโก้ SVG monogram โปรซีเจอรัล (pure/tested) · components/CompanyNamer.tsx (AI ออนไลน์ / rule-based ออฟไลน์) → บอร์ดเลือก → aiCompany.name+logoSvg
src/lib/opsMetrics.ts          — ออกแบบตัวชี้วัดผลการดำเนินงานจาก BMC + ประเภทธุรกิจ (รายวัน/สัปดาห์) + evaluatePerformance + CSV template/parse (pure/tested) · components/OpsDataPanel.tsx ในหน้า Factory → AppData.opsData.entries → ประเมินสมรรถนะ
src/lib/marketSizing.ts        — วิจัยตลาด + ประเมินขนาดตลาด TAM/SAM/SOM (top-down + ช่วง) + opportunityScore 5 ปัจจัย + cmoResearchPrompt (pure/tested) · components/MarketSizingPanel.tsx ในหน้า 'marketing' — CMO (a-cmo มณี) นำเสนอ · AI ผ่าน agent-run + Serper (useWebSearch) / rule-based fallback
src/pages/CaseStudies.tsx      — case studies (built-in CASES + data.caseStudies ที่แอดมินนำเข้า)
src/pages/AdminTabs/CaseStudyTab.tsx — Content Studio: นำเข้า Case (ฟอร์ม/JSON/AI สรุป) + ปุ่ม "💰 เสนอเป็น Skill" แปลงเคส→สินค้า Marketplace พร้อมประเมินราคาอัตโนมัติ
src/lib/skillValuation.ts      — suggestSkillFromCase() ประเมินหมวด/tier/ราคา/valueNote จากเคส (pure, tested)
src/pages/BoardRoom.tsx        — หน้า 'boardroom' ห้องบอร์ด: CEO เสนอวาระ → User อนุมัติ + สะสมทักษะบริหาร/การตลาด (lib/boardRoom.ts: AGENDA 5 DE gates + feature, skillLevels)
src/pages/Resources.tsx        — หน้า 'resources' บริหารทรัพยากร: รายการ+จำนวน · C-Level ดูแล/ขอเพิ่ม-ลด · CEO/บอร์ดอนุมัติ · AI จัดสรร (agent-run จริง + fallback heuristic)
src/lib/cfoAnalysis.ts         — CFO AI วิเคราะห์การเงิน "ธุรกิจตัวเอง" ของ SME จากตัวเลขจริง (d.finance): cfoMetrics(recurring/breakEvenGap/topExpense) + cfoFlags(ธงสุขภาพ) + cfoLocalAdvice(fallback offline) + cfoPrompt(ai-assist · ห้ามแต่งตัวเลข) · pure/tested · แสดงใน components/CfoAnalysis.tsx ใต้คลังเมือง (CompanyCity) — ต่อยอด cfoReport.ts (KPI report) เป็นชั้นให้คำแนะนำเชิงลงมือ
src/lib/resources.ts           — Resource/Request types + templates + applyApproval + parseAiAllocations (pure, tested)
src/lib/commentReply.ts        — ตอบคอมเมนต์เฟซบุ๊กด้วยตัวเลขจริงของผู้คอมเมนต์ (กลไก "จบในแพลตฟอร์ม")
                                 parseNumbers (รับ "50/30" · "ขาย 1,500 ทุน 900" · เลขไทย ๕๐/๓๐) → buildReply
                                 ⚠️ ช่อง 'comment' ห้ามมีลิงก์ (FB กดการมองเห็น) · ลิงก์อยู่ในช่อง 'dm' เท่านั้น
                                 คำนวณจาก pricingAnalysis ตัวเดียวกับหน้าเว็บ → ตัวเลขตรงกันเสมอ
                                 KEYWORD_OFFERS = โพสต์แบบ "คอมเมนต์คำเดียว" (ราคา/ทุน/ลูกค้า/ระบบ) ผูก SHORT_LINKS จริง
                                 UI: pages/AdminTabs/CommentReplyTab.tsx (แท็บ 💬 ตอบคอมเมนต์)
                                 ชุดโพสต์พร้อมใช้: docs/marketing/social/FB-LEAD-MAGNET-PACK.md
src/lib/productQuickCheck.ts   — "ตรวจสินค้าเร็ว" ประตูหน้าบน Landing: กรอกราคา/ต้นทุน → กำไร/จุดคุ้มทุนทันที
                                 ⚠️ ไม่เรียก AI โดยตั้งใจ (เร็ว ฟรี และแต่งตัวเลขไม่ได้) · AI = เฟส 2
                                 กันตัวเลขไม่มีแหล่งด้วย type: Insight มีแค่ calc(ต้องมี from)/question(ต้องมี why)/action
                                 — ไม่มีชนิด 'fact' ให้ใส่สถิติตลาดได้เลย · เทสต์มี banned-words guard
                                 verdictOf: กำไรสุทธิมาก่อนกำไรต่อหน่วยเสมอ (netLoss) กัน "ป้ายเขียวทั้งที่ขาดทุน"
                                 saveQuickDraft/readQuickDraft → App.migrate ยกเข้า finance = "ไม่ต้องกรอกซ้ำ"
                                 (ต่อยอด bizHint.ts · ร่างเก่า >30 วันทิ้ง · ชื่อสินค้าอยู่ localStorage ไม่ขึ้น DB)
                                 components/ProductQuickCheck.tsx วางสูงสุดบน Landing (นอก A/B holdout)
                                 GA4: quickcheck_submitted / quickcheck_topic_opened (← รู้ว่าคนกังวลเรื่องอะไร) / quickcheck_signup_click
src/lib/pricingAnalysis.ts     — วิเคราะห์ราคา (ติดตั้งจาก skill `pricing-analysis` เข้าเป็นโค้ดจริง)
                                 แกน: จุดคุ้มทุนเมื่อเปลี่ยนราคา y = 1 − m/m′ (m = กำไรต่อหน่วย)
                                 ⇒ "ขึ้นราคา 10% เสียลูกค้าได้กี่ %" และ "ลดราคา 10% ต้องขายเพิ่มกี่ %"
                                 เป็นเลขคณิตแน่นอน ไม่ต้องมีข้อมูลตลาด · + costPlusSignal (จับ anti-pattern
                                 ตั้งราคาจากต้นทุน) + positionOf (ต้องมีราคาคู่แข่ง ≥2 เจ้าที่ผู้ใช้กรอกเอง)
                                 ใช้ Insight type เดียวกับ productQuickCheck → พ่นราคาตลาดที่ไม่มีแหล่งไม่ได้
                                 หัวข้อ "ตั้งราคา" บน Landing เรียกโมดูลนี้ทั้งก้อน (pure/tested 19 เทสต์)
src/lib/trialRoadmap.ts        — แผน 15 วันที่ผู้ใช้ได้ของจริงกลับไป (ใช้ทั้งบน Landing เป็นคำสัญญา
                                 และในแอปเป็นความคืบหน้า: nextStep/roadmapProgress) · เทสต์บังคับว่าทุกขั้น
                                 ชี้หน้าที่มีอยู่จริง ห้ามสัญญาสิ่งที่ยังไม่ได้สร้าง · components/TrialRoadmap.tsx
src/lib/processRegister.ts     — ทะเบียนกระบวนการ+ตัววัด (ขั้นที่ 1 ของ "SaaS แทนเอกสาร ISO" — docs/product/SAAS-AS-THE-SYSTEM.md)
                                 registerIssues/registerHealth บังคับสายโซ่: ตัววัดทุกตัวต้องมี whyFrom (มาจากความเสี่ยง/คุณค่าอะไร)
                                 ไม่งั้น blocker ที่ข้อ 9.1 · PROCESS_TEMPLATES + seedProcesses() วางโครงครอบคลุมข้อกำหนดครบทุกข้อ
                                 แต่ "ไม่เติมตัววัดให้โดยตั้งใจ" (KPI สำเร็จรูป = ตอบผู้ตรวจไม่ได้) · CSV/JSON export (ลูกค้าถือข้อมูลเอง)
                                 pure/tested (30 เทสต์ · มีเทสต์ยืนยันว่าโครงตั้งต้นครอบคลุมทุกข้อและไม่ซ้ำ ทั้ง 4 มาตรฐาน)
src/pages/ProcessRegister.tsx  — หน้า 'process' ทะเบียนกระบวนการ (free · nav ใต้ มาตรฐาน ISO) — แก้ inline + ชิปเลือกข้อกำหนด
                                 (ข้อที่กระบวนการอื่นถือแล้วจะจาง) + แถบสุขภาพ + รายการ "สิ่งที่ผู้ตรวจจะเจอ"
                                 · demoRegister() = "อาฮ่า 10 วินาที" โหมดพรีวิว (ไม่บันทึกลง AppData · save() ปิดตายตอน demo)
                                   จงใจใส่ตัววัดที่ไม่มี whyFrom 1 ตัว ให้เห็นระบบจับได้สด ๆ
src/lib/growthPdca.ts          — วงจร PDCA ของ "การเติบโต" (คนละวงจรกับ eqms.ts ที่เป็น PDCA ของคุณภาพ/ISO)
                                 growthPdca() คืน stuckAt = เฟสแรกที่ยังไม่ผ่าน · canAct = false เมื่อ Check ยังไม่ ok
                                 shippedPieces() นับ Do จาก "คนเข้าจริงต่อแคมเปญ" ไม่ใช่จำนวนโพสต์ที่เราบอกว่าโพสต์แล้ว
                                 bottleneckOf() ตอบ 'unknown' อย่างซื่อสัตย์เมื่อคนน้อยเกินฟันธง (MIN_FOR_RATE=100)
                                 REACH_FLOOR_PER_WEEK=100 — ต่ำกว่านี้คอขวดคือ "ไม่มีคนมา" ห้ามไปแก้หน้าเว็บ
                                 Tracker.receiving: true/false/**null(=ตรวจไม่ได้)** → blindSpots 🔴/🟡 (pure/tested 16 เทสต์)
src/lib/amplitude.ts           — sink ที่ 2 คู่กับ GA (funnel/retention/cohort + session replay)
                                 ⚠️ ต้องมี VITE_AMPLITUDE_KEY ใน GitHub Secrets **และ** ใน build step ของ
                                 cloudflare-deploy.yml ไม่งั้นเงียบสนิทโดยไม่มีใครรู้ (ledger #18) — `envContract.test.ts` เฝ้าอยู่
src/lib/resourceBridge.ts      — คำขอก้อนใหญ่→ห้องบอร์ด(+XP) + ทรัพยากรอนุมัติ→รายจ่าย finance อัตโนมัติ (pure, tested)
src/pages/CityLevelUp.tsx      — หน้า 'citylevelup' เมือง 3 มิติ Level Up (ใช้ lib/cityScape.ts)
src/lib/cityScape.ts           — เอนจินวาดเมืองไอโซเมตริก SVG + auto-detect เวลา/ฤดู (framework-agnostic)
src/pages/Pulse.tsx            — หน้า 'pulse' Pulse & A/B (opt-in, โปร่งใส) ใช้ lib/experiments.ts
src/lib/experiments.ts         — registry A/B + assign แบบ deterministic + pulse + aggregate/export
src/lib/tokenEconomics.ts      — เศรษฐศาสตร์ Token (source of truth): เพดาน token/แพ็ก + trial 15 วัน + free รายวันตาม engagement (คนดูนาน=มากกว่า) + ราคา top-up token · คิดต้นทุน worst-case (Sonnet 4.6 $3/$15) ให้กำไร ≥30% ทุกแพ็ก (pure, tested) · ใช้ร่วม client+DO
src/index.css                  — all styles (dark theme, CSS vars)
supabase/functions/            — 6 Edge Functions
supabase/migrations/           — 0001–0028 (สถานะ apply จริงยืนยันสดที่ docs/isms/NC-01-migration-verification.md — dev ตรวจแล้ว, prod ตรวจแยกด้วยสิทธิ์ prod)
public/CNAME                   — custom domain (ceoaithailand.org)
.github/workflows/deploy.yml   — GitHub Pages auto-deploy (legacy — production = Cloudflare Workers)
wrangler.jsonc                 — Cloudflare Workers config (production) + vars SEO (SUPABASE_URL/ANON_KEY/SITE_ORIGIN — public)
src/server.ts                  — Worker: /api/agent DO + /api/guest-ask (guest ลอง AI จริงไม่ต้องสมัคร) + SEO ฝั่ง server (/b/<slug>, /b, /blog, /sitemap.xml)
src/agent/CeoAiAgent.ts        — DO: AI ที่ปรึกษา (haiku) · guestAsk() = แก้ pain "คิดว่าต้องสมัครถึงใช้ AI" ให้ guest ลอง AI จริงก่อน cap 3/IP/วัน + เพดานรวม 400/วัน (fail-closed กันงบบาน · จองโควตาก่อนเรียก · ไม่เก็บประวัติข้าม guest) · client: lib/guestAi.ts + components/GuestAiTry.tsx บน Landing
src/lib/seoData.ts             — pure SEO builders (title/meta/canonical/JSON-LD/sitemap) ใช้ร่วม worker+client
src/lib/seo.ts                 — client applySeo() (idempotent) เรียกในหน้า public
src/lib/ambientAudio.ts        — เพลงบรรเลงโปรซีเจอรัล (Web Audio API ไม่มีไฟล์/ลิขสิทธิ์) ปรับโทนตามเวลาจริง (reuse detectTime) · opt-in ปิดเป็นค่าเริ่มต้น · ปุ่ม components/AmbientMusic.tsx ใน sidebar footer
docs/marketing/                — แผนการตลาด/หาลูกค้า (SEO, FB group, LinkedIn, networking, market research)
```

## เมืองบริษัท (Company City) — เกมส์ SIM การเติบโต
```
หน้า 'city' (nav ใต้ องค์กร AI) — เมืองโตตามงานจริง (gamification สำหรับ Gen Z/มือใหม่)
src/lib/companyCity.ts  — cityStats(): อาคาร 13 หลังจากข้อมูลจริง (agents/tasks/skills/…+การเงิน)
src/lib/finance.ts      — รายรับ/รายจ่าย (กรอกเอง d.finance + ดึงค่าแพ็กเกจ auto) → financeSummary()
src/lib/rewards.ts      — REWARDS ปลดตามการเงิน+ระดับ → discount(คูปอง)/featured/unlock (claimReward)
src/lib/streak.ts       — bumpStreak() ต่อเนื่องรายวัน (เรียกใน updateData ของ App.tsx)
components/CityTreasury.tsx (คลังเมือง+ledger) · CityRewards.tsx (รับรางวัล)
AppData: finance, claimedRewards, coupon{pct}, featuredVoucherDays, cityUnlocks, streak, proMode
รางวัลใช้จริง: คูปอง→หน้า Billing · featured→ปุ่มใน MyStorefront (setFeatured) · proMode ซ่อนเกมบน Dashboard
GA4 events: city_viewed, finance_entry_added, reward_claimed, streak_extended, featured_voucher_redeemed
หน้า 'citytrade' — การค้าระหว่างเมือง: src/lib/interCityTrade.ts (CEO จับคู่/CMO ให้คะแนน rule-based
จาก marketplace.partners) → tradeReport() บอร์ดดู · closeTrade() = Deal(closed)+finance entry
(ขาย→รายได้หักฟี 3% / ซื้อ→รายจ่าย) ป้อนคลังเมือง · รับจ่ายจริง gate PAYMENT.xenditLive (รอ KYC)
หน้า 'citylevelup' — เมืองบริษัทแบบไอโซเมตริก 3 มิติ (Level Up):
  src/lib/cityScape.ts renderCityscape(svg,time,season) วาด SVG โปรซีเจอรัล (deterministic seed)
  โหมดอัตโนมัติตามเวลาจริง: detectTime(นาฬิกาเครื่อง เช็คทุก 1 นาที) + detectSeason(เดือน ภูมิอากาศไทย
  มี.ค.–พ.ค.ร้อน/มิ.ย.–ต.ค.ฝน/ก.พ.ใบไม้ผลิ/พ.ย.–ม.ค.หนาว) · เงาตามทิศแดด + อากาศ (ฝน/หิมะ/กลีบ/เมฆ)
  กดปุ่มเอง=ปิดออโต้ · แถบ XP+การ์ดระดับ ผูกข้อมูลจริง (cityStats + COMPANY_LEVELS) ไม่ hardcode
```

## Pulse & A/B — วัด "อะไรทำให้อยากใช้งานต่อ" แบบโปร่งใส (opt-in)
```
หน้า 'pulse' (nav ใต้ องค์กร AI) — จริยธรรมมาก่อน (ตรงข้าม dark pattern):
  ยินยอมก่อน (default ปิด) · ไม่ระบุตัวตน (uid สุ่ม) · ผู้ใช้เห็นกลุ่ม A/B ตัวเอง + ข้อมูลตัวเอง · ปิด/ลบได้
src/lib/experiments.ts:
  EXPERIMENTS[] (แต่ละอันมี ≥2 variant ซื่อสัตย์ ไม่ scarcity ปลอม) · variantFor() assign แบบ djb2 hash
  recordPulse()/pulseSummary() (😕1/🙂2/😄3 รายวัน) · aggregateExperiments() รวมข้ามผู้ใช้ (ฝั่ง Admin)
  expReportCsv()/expReportTsv() export ผล A/B · Experiment.goto = หน้าปลายทางปุ่ม "อยากทำต่อ"
  recordActiveDay() (เรียกใน updateData เมื่อ enabled) เก็บ activeDays[] → retentionCohorts():
    แบ่ง cohort ตาม pulse เฉลี่ย (สูง≥2.5/กลาง/ต่ำ<2) เทียบ retention 7/14 วัน + เส้น W0–W3 รายสัปดาห์
    (สัปดาห์ยังมาไม่ถึง=null ไม่นับ churn) → ตอบ "pulse สูงกลับมาใช้ต่อจริงไหม"
src/pages/Pulse.tsx: consent gate + pulse รายวัน + การ์ดทุกการทดลอง + สถิติตัวเอง (streak/เฉลี่ย/7วัน)
AppData.experiments: {enabled,seenConsent,uid,assignments,pulses[],activations[]} (migrate default ใน App.tsx)
Admin (แท็บเวิร์กสเปซ): loadOps → aggregateExperiments → เทียบ activationRate + pulseAvg ต่อ variant + ผู้ชนะ
GA4 events: pulse_consent, experiment_exposed, pulse_submitted, pulse_activation, pulse_data_cleared
เทสต์: src/lib/__tests__/experiments.test.ts
```

## Marketplace SEO (server-side)
```
Worker (src/server.ts) intercept GET /b/<slug>, /b, /sitemap.xml ก่อน fallback ASSETS →
อ่าน public.storefronts ผ่าน Supabase REST (anon key = public) → HTMLRewriter inject
title/meta/canonical/OG + JSON-LD (LocalBusiness/BreadcrumbList/ItemList) ลง index.html
= Google index ได้โดยไม่รอ JS. client (src/lib/seo.ts applySeo) inject ซ้ำฝั่ง browser ให้ parity.
seoData.ts = source of truth เดียว (escape กัน XSS). Deploy: merge → Cloudflare auto-deploy (ไม่ต้อง manual).
⚠️ กัน thin page: MIN_STOREFRONTS_TO_INDEX=5 — ร้านน้อยกว่านี้ /b จะ noindex,follow + ไม่ถูกลิสต์ใน sitemap
   (ทั้ง server + client applySeo ต้องพูดตรงกัน · ตรวจ 16 ส.ค. 2569: ร้านจริง = 0)
🔴 งานคนที่ยังค้าง (สาเหตุอันดับ 1 ที่ search traffic = 0): ยืนยัน Google Search Console + ส่ง sitemap.xml
   ตั้งค่า GOOGLE_SITE_VERIFICATION ใน Cloudflare vars → ขั้นตอนเต็มที่ docs/marketing/SEARCH-CONSOLE-SETUP.md
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
Plans: free(0) → starter(1) ฿590/mo → growth(2) ฿1,490/mo → scale(3) ฿5,900/mo
Trial: 15 วัน auto-start เมื่อ login ครั้งแรก
Admin (support@b-tctraining.com): ใช้ Scale ฟรีเสมอ — App.tsx เรียก setAdminFullAccess(isAdminEmail(email))
  → effectiveRank/isExpired/planLabel bypass (access.ts). ระบบ admin = app_admins table + is_app_admin() (0005)
```

### รอบบิลรายเดือน + PLG payment (ยืนยันโดย User ก.ค. 2569)
```
นโยบาย "เตือนล่วงหน้า + ผ่อนผัน": จ่ายเอง (PromptPay ไม่มี auto-charge) → autoRenew=false เสมอ (Billing.tsx)
  billing-cron (daily 02:00 UTC) — automate ผ่าน cron ล้วน ไม่พึ่ง payment gateway:
    • ADVANCE_DAYS=3: ก่อนครบกำหนด → อีเมล "🔔 ใกล้ครบกำหนด อีก N วัน" ครั้งเดียว/รอบ (sub.reminderSentFor กันซ้ำ)
    • ครบกำหนด → past_due + อีเมล "ครบกำหนดต่ออายุ" · GRACE_DAYS=7 (access.ts: active/past_due ใช้แพ็กเดิมต่อได้)
    • พ้น grace → downgrade free (ถ้าเตือนล่วงหน้าแล้วไม่ต่อ = คัดกรอง 'benefit ไม่พอ' โดยตรง ไม่ใช่หลุดเพราะลืม)
  ⚠️ billing-cron ต้อง deploy มือ: supabase functions deploy billing-cron
PLG (ไม่มี admin เป็น gate): อัปสลิปในแอป → เปิดแพ็ก 'ทันที' (Billing.activateFromSlip) ไม่รอ admin
  payment_submissions row ยัง 'pending' = คิว 'ตรวจย้อนหลัง' (PaymentsTab) ไม่ใช่คิวอนุมัติ
  admin ✅ยืนยันถูกต้อง=ปิดรายการ / 🚫ตีกลับ=rejected → client เจ้าของ ws ถอนแพ็กเอง (revokedPaymentIds)
  appliedPaymentIds กันเปิดซ้ำ · Stripe webhook (stripe-webhook) = ทาง PLG อัตโนมัติเต็ม (รอ KYC ผ่าน)
```

### ตรวจสลิปกับธนาคารจริง (SlipOK) — ปิดช่องโหว่ "อัปรูปมั่วก็เปิดฟรี" (LIVE ก.ค. 2569)
```
ปัญหาเดิม: activateFromSlip เปิดแพ็กฝั่ง client (เชื่อรูป + เขียน plan เองได้) = ช่องโหว่
แก้: ย้ายการตัดสิน+เปิดแพ็กไป server ผ่าน SlipOK (มาตรฐานตรวจสลิป SME ไทย ตรวจกับ record ธนาคารจริง)
  supabase/functions/verify-slip — verify_jwt=true + membership check + ราคา server-side
    → เรียก SlipOK (POST api.slipok.com/api/line/apikey/<branch>, header x-authorization, files+log:true)
    → ตรวจ: ยอด>=ราคาแพ็ก · บัญชีผู้รับ (SlipOK คุมเองด้วย err 1014 เพราะบัญชีผูกกับสาขา) · กันสลิปซ้ำ (transRef unique + err 1012)
    → ผ่านครบ เขียน plan ด้วย service-role (mirror activateFromSlip) + payment_submissions.approved
  migration 0034: payment_submissions + trans_ref (unique กันซ้ำ), sender, verified_at, verify_method
  config PAYMENT.slipOkLive=true → uploadSlip เรียก verify-slip; ปิด client auto-activate safety-net (Billing.tsx)
    (slipOkLive=false = โหมดเดิม เปิดทันทีเชื่อผู้ใช้) · src/lib/payments.ts: verifySlip()+slipReasonText()
  error map ครบ 16 codes: แยก "ปัญหาลูกค้า" (ยอด/ผู้รับ/ซ้ำ/รูป) จาก "ปัญหาร้าน" (1000-1004/1015=config/quota
    → "การโอนของคุณยังอยู่ ทีมงานจะเปิดแพ็กให้" ไม่โทษลูกค้า + console.error log)
─ ค่าจริง (production waigsnxhrlwtiotspaim) ─
  Supabase secret: SLIPOK_API_KEY, SLIPOK_BRANCH_ID=72189  (ตั้งใน Edge Functions→Secrets ของ prod เท่านั้น)
  บัญชี K BIZ 009-8-92560-0 (0098925600) เชื่อมกับสาขา SlipOK #72189 → SlipOK ตรวจผู้รับให้ในตัว
  โควตา 100 ครั้ง/เดือน (ถึง 27 ส.ค. 2026) — 1 การจ่าย = 1 check · quota endpoint ไม่กินโควตา
⚠️ GOTCHA สำคัญ (เสียเวลา debug เยอะ):
  • API Key จริง = ค่าที่ขึ้นต้น "SLIPOKWL…" (สั้น ~13 ตัว) — หาในหน้า API/การ์ด API ของสาขา
  • ❌ ห้ามใช้ค่าใต้ "เลขอ้างอิงการแจ้งเตือน" (slipok-xxxx-xxxx…43 ตัว) = เลขแจ้งเตือน LINE คนละตัว → ขึ้น 1002
  • branch id + API key ต้องมาจากสาขาเดียวกัน · สร้างสาขาใหม่ = key เปลี่ยนด้วย
  • ตั้ง secret ต้องอยู่ project prod (waigsnxhrlwtiotspaim) ไม่ใช่ dev (oudykxmtrnjeskglaluh)
  • เปลี่ยน secret แล้ว redeploy ฟังก์ชันด้วย (warm instance ถือ env เก่า)
```

## Admin Operating Summary (สรุปผลการดำเนินงานของ User)
```
หน้า admin แท็บ "เวิร์กสเปซ": ปุ่ม "📊 โหลดสรุปผลการดำเนินงาน" → wsLoad ทุก ws (RLS is_app_admin เห็นหมด)
src/lib/adminOps.ts: workspaceOps(d) รวม revenue/expense/net + tasksDone/dealsClosed/agents/cityTier/streak
  (ใช้ financeSummary + cityStats) · opsTotals() KPI รวม · opsCsv()/opsTsv() export (CSV ดาวน์โหลด / TSV วางลง Google Sheets)
Google Sheets ของ User (เชื่อมบัญชีเอง) = Phase 2b — โค้ดเสร็จแล้ว (sheets-oauth + sheets-sync +
  src/lib/sheets.ts + INTEGRATIONS flag ใน config.ts) gate ด้วย INTEGRATIONS.sheetsLive
  รอ Board: สร้าง OAuth Client ใน Google Cloud + ตั้ง GOOGLE_CLIENT_ID/SECRET + deploy 2 ฟังก์ชัน (PowerShell)
  callback = /oauth/google (App.tsx handleSheetsCallback) · ดู supabase/README.md
```

## Sidebar Pages (nav labels)
`Dashboard`, `บริษัท AI`, `ห้องบอร์ด`, `ทรัพยากร`, `เมืองบริษัท`, `เมือง · Level Up`, `Pulse & A/B`, `การค้าระหว่างเมือง`,
`Marketplace`, `หน้าร้านของฉัน`, `ซื้อขาย B2B (RFQ)`,
`ทีม / สมาชิก`, `โรงงานอัจฉริยะ`, `แพ็กเกจ & ชำระเงิน`, `SaaS Analytics`,
`ผู้ดูแลระบบ` (admin email เท่านั้น), `ISO 9001:2015 QMS`, `ทะเบียนกระบวนการ + ตัววัด`, `AI Research`, `Case Studies`
⚠️ กลุ่ม "มาตรฐาน ISO" ซ่อนในโหมดมือใหม่ (Sidebar `ADVANCED_PAGES` มี `iso9001`) — เห็นเมื่อ `ceo_ai_beginner='0'`

เครื่องมือ (sub-menu ใต้ `บริษัท AI`): `Journey Map`, `Conversion Funnel`, `ROI Calculator`,
`Personas`, `Content Plan`, `Priority Actions`, `Business Model · MIT24`, `Product Roadmap`,
`กลยุทธ์การตลาด`, `VRIO Analysis`, `SIPOC Process`

### Onboarding "เข้าง่าย + ลึกได้" (คัดคนตั้งใจด้วยการลงมือ+จ่าย ไม่ใช่ UI ยาก)
```
ผู้ใช้ใหม่ (onboardGoal ยังไม่เลือก + visitedPages ≤ 1) → components/GoalChooser.tsx
  ถาม "วันนี้อยากทำอะไร?" 3 การ์ด (โฟกัสวัตถุประสงค์จริง = สร้าง & ทำธุรกิจ ไม่ใช่ compliance):
    สร้างบริษัท AI→aicompany · เปิดร้าน&ขายของ→storefront · เริ่มจากไอเดีย(validate)→bmc
  (+ skip "ดูภาพรวมก่อน"→onboardGoal='explore') → บันทึก AppData.onboardGoal + พาไปหน้านั้นทันที
  ⚠️ PDPA/ISO = ฟีเจอร์เสริม (หมวด Compliance) ไม่ใช่พระเอก — CEO AI Thailand ≠ เครื่องมือ compliance
     (นั่นเป็น domain ที่ปรึกษาของ B.Training · ดู docs/marketing/BRAND-ARCHITECTURE.md)
Sidebar focus mode: onboardGoal set + !focusDismissed → โชว์เฉพาะหน้าเป้าหมาย + related + Billing/Dashboard
  + ปุ่ม "🔓 ปลดล็อกเมนูทั้งหมด" (→ focusDismissed=true) · FOCUS map ใน Sidebar.tsx
OnboardingTour gate: โชว์เฉพาะ explore หรือผู้ใช้เดิม (ผู้เลือกเป้าหมายไม่เจอทัวร์ = ไม่ชนกัน) — App.tsx showTour
GA4: goal_chooser_shown, goal_chosen{goal}, goal_skip · AppData: onboardGoal, focusDismissed
```

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
public.workspace_integrations — credential ของ integration ที่ User เชื่อมเอง (LINE/Sheets) RLS per-workspace, revoke anon; ไม่อยู่ใน workspace_state (กัน secret รั่ว) (0020)
public.ai_usage           — ตัวนับ AI calls ต่อ (bucket=ws/user/guest-IP, เดือน) บังคับ quota ฝั่ง server (0035) · RLS ปิดหมด เข้าผ่าน rpc bump_ai_usage/get_ai_usage (SECURITY DEFINER) · guest cap 25/เดือน/IP · flag ENFORCE_AI_QUOTA (default off, fail-open) wire ใน ai-assist/ai-plan/agent-run ผ่าน _shared/quota.ts · plan อ่านจาก workspace_plan mirror (trigger sync เฉพาะ role=service_role กัน spoof)
public.client_errors (0058) — error ที่ผู้ใช้เจอจริงบนเบราว์เซอร์ (message/stack/path/ua · ไม่เก็บ IP/user id โดยตั้งใจ)
  ทำไม: GA4 บอกได้แค่ "มี error กี่ครั้ง" · ตัวข้อความอยู่ใน Cloudflare Workers Logs ที่เก็บไม่กี่วัน → ตอบไม่ได้ว่าพังเพราะอะไร
  เส้นทาง: ErrorBoundary/global handler → `errorReport.reportError` → beacon `/api/client-error` → worker `saveClientError`
           → rpc `track_client_error` (anon · กันถล่มด้วยเพดาน 500 แถว/ชม.) · อ่านผ่าน `client_errors_agg` (guard is_app_admin)
  UI: `components/ClientErrorsPanel.tsx` ในแท็บเวิร์กสเปซ (GrowthDashboard) · logic `lib/clientErrors.ts` (pure/tested)
  ⚠️ chunk error ครั้งแรก **ไม่ถูกรายงาน** — ErrorBoundary reload แล้ว `return` ออกก่อน (เทสต์ล็อกไว้แล้ว)
     ⇒ `react.ErrorBoundary` ใน GA/ตารางนี้ = บั๊กจริง ไม่ใช่ผลข้างเคียงของการ deploy (เคยตีความผิด — LESSONS-LEDGER #10)
public.quickcheck_submissions (0056) — เก็บสิ่งที่ผู้เยี่ยมชมกรอกใน "ตรวจสินค้าเร็ว" บน Landing (first-party · ไม่มี PII)
  เก็บ: biz(dropdown)/price/cost/units/fixed_cost/verdict/topics[]/reached_cta · ❌ ไม่เก็บชื่อสินค้าที่ผู้ใช้พิมพ์
  (free text อาจมีชื่อร้าน/เบอร์ — อยู่ localStorage เครื่องผู้ใช้เพื่อยกเข้าแอปตอนสมัครเท่านั้น · มีเทสต์บังคับ)
  RLS ปิด + revoke grant anon/authenticated · เข้าผ่าน rpc track_quickcheck (anon) / quickcheck_agg (admin-guarded)
  session = เดียวกับ landing_funnel (join ได้) · แผงในหน้า admin: GrowthDashboard "ตรวจสินค้าเร็ว"
  ⭐ by_topic = ตอบว่าเจ้าของธุรกิจกังวลเรื่องอะไรจริง (ต้อง >=30 คนกดหัวข้อถึงเชื่ออันดับได้)
public.landing_funnel     — first-party visitor funnel (PDPA-safe · 0051): 1 แถว/ผู้เข้าชม (session uuid สุ่มฝั่ง client) เก็บ seg/ref_kind/max_scroll/max_dwell/reached_cta/reached_signup · RLS ปิด เข้าผ่าน rpc track_landing (anon, upsert monotonic) / landing_funnel_agg (admin-guarded) · ไม่เก็บ PII/cursor path · แสดงในแผง GrowthDashboard "Landing Funnel" (lib/landingFunnel.ts) · A/B holdout (0054): คอลัมน์ ab (show/control) assign deterministic ฝั่ง client จาก session (lib/landingAb.ts) → วัดว่า "2 ส่วนใหม่ (GuestAiTry+WhyTrustAi) ช่วย signup จริงไหม" · agg คืน by_ab (total/signup/cta ต่อกลุ่ม) → landingAbVerdict แสดงใน GrowthDashboard · LandingPage gate 2 ส่วนด้วย showNewSections(currentLandingVariant())
public.ai_token_quota (0052) — โมเดลโควตา AI แบบ "token" (แทน "จำนวน call") ship dark ผ่าน secret ENFORCE_AI_TOKENS=true (คู่ ENFORCE_AI_QUOTA) · ai_usage.tokens + ai_topup.tokens (คอลัมน์เพิ่ม) · rpc check_ai_tokens (gate ก่อนเรียก · authed รายเดือน) + record_ai_tokens (บันทึก in+out จริงหลังตอบ) + get_ai_tokens (มิเตอร์ UI) + grant_ai_topup_tokens (admin/service) · เพดาน ai_token_quota_for: scale 12M/growth 3M/starter 1.5M/free-trial 400K · guest daily-free token = Cloudflare DO (CeoAiAgent) แยก ต่อ IP/วัน tier ตาม engagement (FREE_DAILY_TOKENS cold 20K/warm 40K/hot 70K) · edge functions (ai-assist/ai-plan/agent-run) wire ผ่าน _shared/quota.ts (enforceAiTokens+recordAiTokens · fail-open) · client มิเตอร์/ซื้อ token gate ด้วย config.ts TOKENS.live (ต้องเปิดพร้อม secret ฝั่ง server) · เพดาน/ราคา = src/lib/tokenEconomics.ts (margin ≥30%)
public.ai_topup_request (0053) — คิว top-up รองรับแพ็ก token (คอลัมน์ tokens + credits nullable) · rpc topup_tokens_for_pack (จำนวน server-side จาก pack_id) + approve_token_topup_request (admin เปิด token) · Billing (ซื้อ PromptPay+แจ้งโอน) + PaymentsTab (admin เปิด token)
public.ai_topup           — Top-up packs: credits AI เพิ่มต่อ workspace/เดือน (0036) · rpc grant_ai_topup (admin/service_role เท่านั้น) · bump/get_ai_usage รวม credits เข้า quota · แพ็ก src/lib/topup.ts (+500฿490/+1000฿990/+3000฿2900 · margin>20% แม้ worst-case) · UI: Billing (ซื้อ PromptPay) + PaymentsTab (admin เปิด credits)
```

## Edge Functions
| Function | JWT | Purpose |
|---|---|---|
| ai-assist | ✅ | AI แนะนำทุกหน้า (Claude API) |
| ai-plan | ✅ | CEO วางแผน + มอบงาน |
| agent-run | ✅ | รันเอเจนต์ + Serper.dev (Google Search) |
| generate-badge | ❌ | ISO badge PNG (public GET) |
| billing-cron | ❌ | ต่ออายุ/downgrade อัตโนมัติ (deployed prod v30) |
| verify-slip | ✅ | ตรวจสลิปกับธนาคารจริงผ่าน SlipOK → เปิดแพ็ก server-side (deployed prod · LIVE) |
| promptpay-webhook | ❌ | รับ webhook จาก payment gateway |
| hubspot-sync | ❌ | ซิงก์ platform_leads → HubSpot CRM (contacts upsert by email · cron · code-ready ยังไม่ deploy — รอ HUBSPOT_TOKEN) |

### Marketing connectors / analytics sinks
```
Amplitude (product analytics: funnel/retention/cohort + Session Replay) — src/lib/amplitude.ts
  ส่ง event ชุดเดียวกับ GA ผ่าน track() (analytics.ts) เข้า Amplitude Browser SDK + plugin-session-replay-browser
  (อัดเมาส์/คลิก/สโครล ดูว่าคนค้าง/ลังเลตรงไหน) · SDK โหลดแบบ dynamic import = ไม่บวมบันเดิลหลักเมื่อไม่มีคีย์
  gate ด้วย VITE_AMPLITUDE_KEY (public client key เหมือน GA id — ไม่มี = inert สนิท) · Session Replay mask
  ระดับ 'medium' = ปิดบังทุก input (อีเมล/ชื่อ/เบอร์) อัตโนมัติ (PDPA) · sampleRate ปรับผ่าน VITE_AMPLITUDE_REPLAY_SR
  (default 1) · identifyAmplitudeUser(uid) ผูกตอน login / resetAmplitudeUser() ตอน logout (App.tsx) ·
  tab_open ยิงตอนสลับหน้า (feature funnel) · ควร gate ด้วย consent เหมือน GA/Pixel ที่จุดเรียก track()
  ⚠️ deps เพิ่ม nanoid override ^3.3.17 (rrweb ดึง nanoid <3.3.17 = high vuln → CI dependency-audit fail ถ้าไม่ override)
HubSpot (CRM + marketing automation) — supabase/functions/hubspot-sync (cron pattern เดียวกับ lead-nurture)
  upsert lead อีเมล→contact · standard properties เท่านั้น (custom ceo_ai_* uncomment เมื่อสร้าง property แล้ว)
  Secret: HUBSPOT_TOKEN (Private App · crm.objects.contacts.write) + CRON_SECRET · deploy: supabase functions deploy hubspot-sync --no-verify-jwt
Connectors ที่ org ต่อไว้ (ผ่าน claude.ai) ใช้ผ่าน MCP: Figma/Miro/Stripe/GCal/GDrive/Gmail/Cloudflare (พร้อม)
  · Amplitude/HubSpot/Notion/Slack (ต่อแล้วแต่ต้องเปิด enabledInChat ก่อนผมเรียกได้)
```

### agent-run — Serper.dev Integration
```typescript
// POST https://google.serper.dev/search
// Header: X-API-KEY, Content-Type: application/json
// Body: { q, gl: 'th', hl: 'th', num: 5 }
// Response: data.organic[].{ title, link, snippet }
const SERPER_KEY = Deno.env.get('SERPER_API_KEY') ?? '';
```

## Secrets / Environment Map (R11)
```
┌─ CEO AI Thailand (production หลัก) ──────────────────────────────
│ Supabase project  : waigsnxhrlwtiotspaim (Pro · prod จริง — เดิม rsjbqmnvocvtveelselj = backup ไม่ใช่ prod)
│ GitHub Actions    : VITE_SUPABASE_URL ✅, VITE_SUPABASE_ANON_KEY ✅ (ใช้โดย deploy.yml legacy)
│ Cloudflare Worker : ANTHROPIC_API_KEY (vars ใน wrangler/dashboard — ใช้โดย CeoAiAgent DO)
│ Supabase Fn       : ANTHROPIC_API_KEY ✅, CRON_SECRET ✅, SERPER_API_KEY ✅, RESEND_API_KEY ✅
│                     SLIPOK_API_KEY ✅ (ขึ้นต้น SLIPOKWL…), SLIPOK_BRANCH_ID ✅ =72189 (ตรวจสลิป verify-slip)
│ Pending           : WEBHOOK_SECRET (ตั้งพร้อม payment gateway)
├─ TIS Automate (แยก) ─────────────────────────────────────────────
│ Supabase project  : galtbbkcddugnsfkgyqm — ไม่มี secret ฝั่ง client (publishable key ฝังได้)
├─ Dev/local ──────────────────────────────────────────────────────
│ ไม่มี .env — local mode ใช้ localStorage · Vercel PR preview build โดยไม่มี VITE_SUPABASE_*
└──────────────────────────────────────────────────────────────────
กติกา: ห้ามใช้ secret ข้ามกล่อง · ห้าม commit .env · anon/publishable key = public โดยดีไซน์
```

## Dev Commands
```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run typecheck    # ⚠️ ตรวจ "ทั้งสองฝั่ง": tsc -b (แอป) + tsconfig.worker.json (server.ts/agent)
                     #    tsc --noEmit ที่รากเป็น no-op · และ tsconfig.app.json exclude server.ts ไว้
                     #    → ก่อน 17 ส.ค. 2569 โค้ด worker ไม่ถูกตรวจชนิดข้อมูลเลย (LESSONS-LEDGER #13)
npm run build        # production build → dist/ (รวม typecheck ทั้งสองฝั่งแล้ว)
npm run preview      # preview dist/ locally

# Screenshot (requires dev server running)
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --nav "บริษัท AI"
```

## Deploy Flow
```
Production = Cloudflare Workers (worker ceo-ai-thailand ผูก custom domain ceoaithailand.org)
🔴 GOTCHA ร้ายแรงที่สุดที่เคยเจอ (17 ส.ค. 2569) — `run_worker_first` ใน wrangler.jsonc ห้ามลบ
  Cloudflare เสิร์ฟ static asset ก่อนเสมอ และตั้งแต่ compatibility_date >= 2025-04-01
  flag `assets_navigation_prefers_asset_serving` เปิดเอง → navigation request (Sec-Fetch-Mode: navigate)
  ที่ไม่ตรงไฟล์ไหน จะได้ index.html 200 **โดยไม่เรียก Worker เลย**
  ⇒ ลิงก์สั้น /ราคา /ทุน /ลูกค้า ไม่ redirect · SEO ฝั่ง server ของ /start /sale /shop /legal /b/<slug>
     ไม่ทำงาน · ทั้งที่โค้ด+เทสต์+`wrangler deploy --dry-run` ผ่านหมด (ทั้งสามตรวจแค่ว่าโค้ดถูก
     ไม่มีอันไหนตรวจว่าแพลตฟอร์ม "เรียก" โค้ดนั้นจริงไหม)
  กลไก: `src/lib/__tests__/workerRouting.test.ts` อ่าน wrangler.jsonc จริง + จำลอง matcher ของ Cloudflare
     บังคับว่าทุกเส้นทางของ server.ts (รวมลิงก์สั้นทุกตัวทั้งไทย/percent-encoded) ต้องถึง Worker
  ⚠️ /api/* ไม่โดนผลกระทบ (POST/fetch ไม่ใช่ navigation) — จึงหลอกให้คิดว่า Worker ทำงานปกติ
AUTO-DEPLOY: push/merge เข้า main → .github/workflows/cloudflare-deploy.yml → wrangler deploy
  ต้องมี GitHub secrets: CLOUDFLARE_API_TOKEN (Workers Scripts:Edit + Zone Workers Routes:Edit
    + DNS:Edit + Account Settings:Read + User Details:Read) + CLOUDFLARE_ACCOUNT_ID
  ⚠️ GOTCHA: wrangler-action ต้อง pin wranglerVersion >= 3.91.0 (อ่าน wrangler.jsonc/JSONC)
    — 3.90.0 ล้มด้วย "Missing entry-point" · ดู prerender-seo.mjs รันตอน build (static /llms.txt,/faq,/mit24,/sitemap.xml)
Manual (สำรอง): npm run build → npx wrangler deploy
Legacy: deploy.yml → GitHub Pages (ยังรันอยู่ ไม่ใช่ production host จริง)
Vercel: PR preview อัตโนมัติ (*.vercel.app เท่านั้น — ห้ามผูก custom domain)
```

## Email / DNS (ceoaithailand.org)
- **ส่งออก (sending)**: ผ่าน **Resend** จาก `noreply@ceoaithailand.org` — DNS อยู่บน subdomain `send` + DKIM (ไม่แตะราก `@`)
- **รับเข้า (receiving)**: ใช้ **Cloudflare Email Routing** forward `→ support@b-tctraining.com`
  (⚠️ **ไม่ใช้ Resend Inbound / ไม่ใช้ AWS SES inbound** — ราก `@` รับเมลได้ระบบเดียว, ให้ Cloudflare Routing เป็นเจ้าของ MX ราก)
- Resend **region = `ap-northeast-1` (โตเกียว)** สำหรับโดเมนนี้ · feedback host = `*.amazonses.com` (ยืนยันจาก Resend dashboard 2569)

DNS records ที่ต้องตั้งใน Cloudflare (ทุกตัว **DNS only / grey cloud**):
```
# GitHub Pages — A records (legacy — production ย้ายไป Cloudflare Workers แล้ว
# ถ้า route worker ผ่าน custom domain ใน Cloudflare ไม่ต้องใช้ A records ชุดนี้)
@       A       185.199.108.153
@       A       185.199.109.153
@       A       185.199.110.153
@       A       185.199.111.153
www     CNAME   kosid-b.github.io

# === ส่งออก: Resend (subdomain send + DKIM — ไม่ชนกับราก) ===
# DKIM — Resend (ค่าจริงจาก Resend Dashboard > Domains)
resend._domainkey   TXT   "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxA6v+Vi/vGFPov6GzOE2nA7IQLnqXAw3tORZ8J8GFrSOURgkQVs/OFl+GpohQ1kL2sINPvFQJyrrPoj9oWrFq5UCD08KED5vxvtMCGDB/vSwFy7/O8LUZ0Z4fyQ7fshEO52JI3Xrmaz3MXJJjlibKPhp4VnGIxzhMbA8IGuBNYQIDAQAB"
# Return-path / bounce (region ap-northeast-1, host .amazonses.com)
send    MX  10  feedback-smtp.ap-northeast-1.amazonses.com
send    TXT     "v=spf1 include:amazonses.com ~all"

# === รับเข้า: Cloudflare Email Routing (Cloudflare ใส่ MX ราก 3 ตัวให้เองเมื่อ Enable) ===
# @   MX  route1.mx.cloudflare.net / route2 / route3   ← อย่าตั้งเอง ให้ Email Routing จัดการ
# ❌ ห้ามใส่:  @  MX  inbound-smtp.ap-northeast-1.amazonaws.com  (Resend Inbound — จะชนกับ Routing)

# DMARC
_dmarc  TXT     "v=DMARC1; p=quarantine; rua=mailto:support@b-tctraining.com; pct=100"
```
> หมายเหตุ SPF ราก: Resend ยุคนี้ยึด SPF ที่ subdomain `send` (ด้านบน) — SPF ราก `@ include:_spf.resend.com`
> ไม่จำเป็นแล้ว (legacy) ถ้ามีอยู่ปล่อยไว้ได้ แต่อย่ามี TXT SPF ซ้ำชื่อเดียวกันหลายอัน (กัน SPF conflict)

**หมายเหตุ Cloudflare**: `www` CNAME ต้องเป็น DNS only (grey cloud) ไม่ใช่ orange cloud
เพราะ GitHub Pages ต้องตรวจสอบ IP ตรงๆ · ใน Resend dashboard แถว **"MX (Receiving)"** จะค้าง Pending
ตลอด — **ถือว่าปกติ** (เราตั้งใจไม่ใช้ Resend Inbound) การส่งออกไม่พึ่ง record นั้น

## Pending Items
- [ ] ตั้ง A records + www CNAME (grey cloud) ใน Cloudflare
- [x] Verify domain ใน Resend dashboard → ใส่ DKIM + SPF (send) ใน Cloudflare (region ap-northeast-1) แล้ว
- [x] รับเมล: เปิด Cloudflare Email Routing → catch-all → support@b-tctraining.com (ไม่ใช้ Resend Inbound)
- [ ] ตั้ง DMARC record ใน Cloudflare (ถ้ายังไม่ได้ตั้ง)
- [ ] GitHub repo Settings → Pages → Custom domain → `ceoaithailand.org`
- [ ] ตั้ง Supabase Auth redirect URL: `https://ceoaithailand.org`
- [ ] Payment Gateway (Omise / GB Prime Pay) + ตั้ง `WEBHOOK_SECRET`
- [x] Google Analytics 4 (G-CHJ99RY1Q1) ใส่ใน index.html
- [x] RESEND_API_KEY ตั้งใน Supabase secrets
- [x] SERPER_API_KEY ตั้งใน Supabase Edge Function secrets
- [x] agent-run: เปลี่ยนจาก Brave Search → Serper.dev
- [x] ลบ Brave Search references ออกจาก UI ทั้งหมด
