# Supabase Backend — CJ Planner

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
