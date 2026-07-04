# Supabase Backend — CEO AI Thailand

ระบบรองรับ Supabase เป็น backend (Auth + ฐานข้อมูล + ซิงก์ข้ามอุปกรณ์) แบบ **เปิด/ปิดได้ด้วย env**:

- **ไม่ใส่คีย์** → แอปรันโหมด local เก็บข้อมูลใน `localStorage` (เหมือนเดิม ใช้ได้ทันที)
- **ใส่คีย์** → ต้องล็อกอินก่อนใช้ และข้อมูลถูกซิงก์ขึ้นคลาวด์อัตโนมัติ (multi-tenant แยกตามผู้ใช้)

## วิธีตั้งค่า (5 ขั้น)

1. สร้างโปรเจกต์ที่ https://supabase.com (ฟรี)
2. ไปที่ **SQL Editor** → วางเนื้อหา `supabase/migrations/0001_init.sql` ทั้งไฟล์ → **Run**
   (สร้างตาราง `app_state` + เปิด Row Level Security ให้ผู้ใช้เห็นเฉพาะข้อมูลตัวเอง)
3. ไปที่ **Project Settings → API** คัดลอก `Project URL` และ `anon public key`
4. ที่โปรเจกต์นี้ คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
5. `npm run dev` — จะเจอหน้า **เข้าสู่ระบบ/สมัครสมาชิก** แล้วข้อมูลจะซิงก์ขึ้นคลาวด์

> Auth ใช้ email/password และ Magic Link (เปิดได้ที่ **Authentication → Providers**)
> ถ้าต้องการปิดการยืนยันอีเมลตอนทดสอบ ตั้งค่าที่ **Authentication → Sign In / Providers → Email**

## โครงสร้างข้อมูล

ทั้ง `AppData` (stages, personas, aiCompany, marketplace, subscription, ฯลฯ) ถูกเก็บเป็น JSONB
ก้อนเดียวในแถวของผู้ใช้ — sync ขึ้นคลาวด์แบบ debounce ทุกครั้งที่แก้ไข และมี `localStorage` เป็น cache

## แชร์เวิร์กสเปซแบบทีม / หลายบริษัท (migration 0002)

รัน `supabase/migrations/0002_workspaces.sql` เพิ่ม:
- ตาราง `workspaces`, `workspace_members`, `workspace_state` (เก็บ AppData ต่อเวิร์กสเปซ)
- RLS อิงสมาชิก (ฟังก์ชัน `is_member` แบบ SECURITY DEFINER กัน recursion)
- RPC: `ensure_default_workspace()`, `create_workspace(name)`, `invite_member(workspace, email)`

ฝั่งแอป: หัว sidebar จะมีตัวสลับเวิร์กสเปซ + ปุ่ม ＋ สร้างใหม่ ข้อมูลแยกตามเวิร์กสเปซ
และสมาชิกในเวิร์กสเปซเดียวกันเห็น/แก้ข้อมูลร่วมกัน

## Edge Functions

> **สถานะ production (`rsjbqmnvocvtveelselj`): ทุกฟังก์ชันด้านล่าง ACTIVE แล้ว และ `ANTHROPIC_API_KEY` /
> `SERPER_API_KEY` ตั้งใน Supabase secrets เรียบร้อย — AI Agent ทำงานได้ทันทีในโหมด production**
> (โหมด local ไม่มีคีย์ = ปุ่ม AI ซ่อนไว้ ใช้ localStorage อย่างเดียว)
> deploy ใหม่ต้องใช้ Supabase CLI/PowerShell (MCP deploy ถูกบล็อกในแซนด์บ็อกซ์นี้)

### 0) `ai-assist` — AI Agent ช่วยงานทุกหน้า (หัวใจของฟีเจอร์ AI Agent)
```bash
supabase functions deploy ai-assist
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx
# (ออปชัน) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```
รับ `{ page, pageLabel, instruction, context }` → เรียก Claude → คืน `{ summary, suggestions[] }`
(ภาษาไทย) แสดงเป็นคำแนะนำที่ลงมือทำได้จริงในแต่ละหน้า **ต้องเปิด Supabase + ตั้งคีย์นี้ก่อน**
ปุ่ม AI จึงจะโผล่ (ในโหมด local จะซ่อน)

### 0b) `agent-run` — รันเอเจนต์ + ค้นข้อมูลจริง (Serper / Google Search)
```bash
supabase functions deploy agent-run
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx
supabase secrets set SERPER_API_KEY=xxxx      # https://serper.dev
```
ให้เอเจนต์ค้นข้อมูลตลาด/คู่แข่งแบบเรียลไทม์ (`POST https://google.serper.dev/search`, `gl=th, hl=th`)
แล้วสรุปด้วย Claude — ใช้ในงานวิจัย/หาลูกค้าของ AI Company

### 1) `ai-plan` — CEO เรียก Claude API วางแผนจริง
```bash
supabase functions deploy ai-plan
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx
# (ออปชัน) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```
ในหน้า "บริษัท AI" จะมีปุ่ม **✦ ให้ CEO วางแผนด้วย Claude** (โผล่เมื่อเปิด Supabase)
→ ส่ง goal/agents ไปให้ Claude → ได้ tasks + approvals กลับมาเติมลงกระดานงานอัตโนมัติ

### 2) `promptpay-webhook` — ยืนยันยอด PromptPay อัตโนมัติ
```bash
supabase functions deploy promptpay-webhook --no-verify-jwt
supabase secrets set WEBHOOK_SECRET=your-shared-secret
```
ตั้ง URL ฟังก์ชันเป็น webhook endpoint ใน Omise/GB Prime Pay และตอนสร้าง charge
ให้ส่ง `metadata.workspace_id` + `metadata.plan_id` มาด้วย เมื่อจ่ายสำเร็จระบบจะตั้ง
`subscription.status = active` ให้เวิร์กสเปซนั้นทันที (อัปเดตด้วย service role)

> หมายเหตุ: การสร้าง charge/QR ฝั่ง gateway ต้องมีบัญชีร้านค้า + secret key ของผู้ให้บริการจริง
> ฟังก์ชันนี้พร้อม "รับ" การยืนยันแล้ว เหลือเชื่อมขั้นสร้างรายการชำระเงินตามผู้ให้บริการที่เลือก

### 3) `billing-cron` — Automate billing (ต่ออายุ/ออกใบแจ้งหนี้อัตโนมัติ)
```bash
supabase functions deploy billing-cron --no-verify-jwt
supabase secrets set CRON_SECRET=your-cron-secret
```
รัน `supabase/migrations/0003_members.sql` (RPC จัดการสมาชิกทีม) และ
`supabase/migrations/0004_billing_cron.sql` (ตั้ง pg_cron เรียก billing-cron รายวัน — แก้
`<PROJECT_REF>` และ `<CRON_SECRET>` ในไฟล์ก่อนรัน)

ฟังก์ชันจะสแกนทุกเวิร์กสเปซ: ถ้า `autoRenew` และถึงรอบบิล → ออกใบแจ้งหนี้ + ต่อรอบบิล 1 เดือน
(สถานะ pending รอ `promptpay-webhook` ยืนยันเป็น paid); ถ้าไม่ต่ออายุและเกินกำหนด → ตั้ง `past_due`

### 3b) `sheets-oauth` + `sheets-sync` — Google Sheets ที่ User เชื่อมบัญชีตัวเอง (Phase 2b)
เขียนรายงาน/สรุปผลงานลง Google Sheets **ของ User** (เขาเชื่อมบัญชี Google ตัวเองผ่าน OAuth)
token เก็บใน `public.workspace_integrations` (provider `sheets`) — ไม่อยู่ใน AppData ที่ sync ไป client

**A. ตั้งค่าใน Google Cloud Console (ทำครั้งเดียว):**
1. สร้าง Project → เปิด **Google Sheets API**
2. **OAuth consent screen**: External · เพิ่ม scope `.../auth/spreadsheets` · เพิ่มอีเมลผู้ทดสอบ (ตอน Testing)
3. **Credentials → OAuth client ID** (Web application):
   - Authorized redirect URI: `https://ceoaithailand.org/oauth/google`
   - (ทดสอบ local เพิ่ม `http://localhost:5173/oauth/google`)
   - ได้ **Client ID** (public) + **Client secret**

**B. ใส่ค่าในระบบ:**
- `src/config.ts` → `INTEGRATIONS.googleClientId = '<Client ID>'` และ `sheetsLive: true`
- Secrets ฝั่ง server:
  ```bash
  supabase secrets set GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
  supabase secrets set GOOGLE_CLIENT_SECRET=<client-secret>
  ```

**C. Deploy (PowerShell — MCP deploy ถูกบล็อก):**
```powershell
supabase functions deploy sheets-oauth --project-ref rsjbqmnvocvtveelselj
supabase functions deploy sheets-sync  --project-ref rsjbqmnvocvtveelselj
```

Flow: User กด "เชื่อม Google" ในหน้า บริษัท AI → ยินยอมที่ Google → กลับมาที่ `/oauth/google?code=…&state=<wsId>`
→ แอปเรียก `sheets-oauth` แลก token → เชื่อมสำเร็จ → ปุ่ม "📊 ส่งสรุปผลงานลงชีต" เรียก `sheets-sync`
(สร้างสเปรดชีตครั้งแรก + append แถวข้อมูล, refresh token อัตโนมัติเมื่อหมดอายุ)

> จนกว่า `sheetsLive` = true ปุ่มจะยังเป็น "เร็วๆ นี้" (gate เหมือน `xenditLive`)

### 3c) `daily-ceo-report` — CEO สรุปรายงานประจำวัน + เสนอ Issue ให้บอร์ด (ทุก 9 โมงเช้า)
```powershell
supabase functions deploy daily-ceo-report --no-verify-jwt
```
ใช้ `CRON_SECRET` + `RESEND_API_KEY` เดียวกับ weekly-report · ตั้งเวลาด้วย migration
`0021_daily_ceo_report_cron.sql` (pg_cron `0 2 * * *` = 09:00 ไทย — แก้ `<PROJECT_REF>` ก่อนรัน)

ทุกวัน 9 โมง: วนทุก workspace → สร้างรายงาน 7 หัวข้อ (การตลาด · ส่งมอบ · การเงิน/Cashflow ·
รายการที่ต้องจ่าย · ข้อผิดพลาด/ข้อบกพร่อง · ประเด็นขออนุมัติ · ขั้นตอนถัดไป) แล้ว
(1) เพิ่ม approval `daily-<วันที่>` ลง workspace_state (บอร์ดเห็นในกล่องอนุมัติ · 1 รายการ/วัน)
(2) ส่งอีเมลถึงเจ้าของผ่าน Resend

### 4) ฟังก์ชันอื่นที่ deploy แล้ว (production)
| ฟังก์ชัน | JWT | หน้าที่ |
|---|---|---|
| `generate-badge` | ❌ | สร้าง ISO badge PNG (public GET) |
| `weekly-report` | ❌ | รายงานสรุปรายสัปดาห์ |
| `delete-account` | ✅ | ลบบัญชี/เวิร์กสเปซครบวงจร (R8 DO isolation) |
| `create-invoice` | ✅ | สร้างใบแจ้งหนี้ Xendit (gate ด้วย `PAYMENT.xenditLive` — รอ KYC) |
| `xendit-webhook` | ❌ | รับยืนยันชำระเงินจาก Xendit |
