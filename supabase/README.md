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

## ขั้นต่อไป (ยังไม่ทำ — ต้องมี secret/ฝั่งเซิร์ฟเวอร์)

- **Edge Function `ai-plan`**: ให้ CEO เรียก Claude API วางแผน/แตกงานจริง (เก็บ `ANTHROPIC_API_KEY`
  เป็น secret ใน Supabase ไม่ใช่ฝั่ง frontend)
- **Edge Function `promptpay-webhook`**: รับ webhook จาก Payment Gateway ไทย (Omise/GB Prime Pay)
  เพื่อยืนยันยอด PromptPay อัตโนมัติ แล้วอัปเดต `subscription.status = active`
- **ตาราง workspaces/members**: แชร์เวิร์กสเปซแบบทีม/หลายบริษัท (ดูคอมเมนต์ท้ายไฟล์ migration)
