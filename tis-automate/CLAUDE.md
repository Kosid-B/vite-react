# TIS Automate — Project Memory

## Overview
SaaS จัดการ Compliance มาตรฐาน **TIS/ISO** สำหรับ "ธุรกิจ" ไทย — ผลิตภัณฑ์แยกของ
B. Training Consultant (M.E.A) Co., Ltd. (ที่ปรึกษาในไทยมากว่า 20 ปี · โทร 081-7817-7773)
**แยกโดยสมบูรณ์**จากระบบหลัก CEO AI Thailand (คนละ Supabase project คนละแอป)

Flow หลัก: สมัคร/ล็อกอิน → สร้าง "ธุรกิจ" (organization + subdomain) →
สร้างโครงการ Compliance เลือกมาตรฐาน (TIS-first) → Kanban board ทำงานตามหลัก JIT

## Stack
- **Frontend**: Vite + React + TypeScript (โฟลเดอร์นี้ standalone — ไม่ใช้ router, state ล้วน)
- **Backend**: Supabase (Auth email+password, Postgres + RLS) — **Supabase-first เสมอ**
- **Font/Theme**: Kanit, dark `#020617`, accent cyan `#22d3ee` (ธีมเดียวกับ CEO AI Thailand)
- **Deploy**: ยังไม่ deploy — เป้าหมาย subdomain เช่น `tis.ceoaithailand.org`

## Supabase (production ของ TIS Automate)
```
Project ID      : galtbbkcddugnsfkgyqm
URL             : https://galtbbkcddugnsfkgyqm.supabase.co
Publishable Key : sb_publishable__FxwCTv8Cij9FnS6fxCUig_RczqazCT  (ฝังใน src/lib/supabase.ts แล้ว)
Region          : ap-southeast-1 (สิงคโปร์) · Free tier ฿0/เดือน
Org             : kosid-btc's projects
```
⚠️ **ห้ามสับสนกับ project หลัก** `rsjbqmnvocvtveelselj` (CEO AI Thailand) — ทุก migration/query
ของ TIS ต้องยิงที่ `galtbbkcddugnsfkgyqm` เท่านั้น

## Database Schema (applied ครบแล้ว)
Migrations เก็บใน repo แม่ `../supabase/migrations/` (apply เฉพาะ project TIS):
- `0016_tis_automate.sql` — 13 ตาราง + 5 enums + `is_org_member()` + RLS:
  `profiles, organizations, organization_members, standards, standard_clauses,
   standard_updates, projects, project_requirements, kanban_columns, kanban_cards,
   documents, validations, marketing_events`
- `0017_tis_rls_fixes.sql` — เปิด RLS standard_updates/marketing_events + ตัด anon จาก is_org_member
- `0018_tis_write_policies_and_seed.sql` — policies สร้างธุรกิจ/owner + seed มาตรฐาน 5 ตัว
  (TIS 50-2565, มอก. 9001-2559, ISO 9001, ISO 14001, ISO 22301)

จุดสำคัญของ schema:
- `standards.priority_rank` — **TIS สูงกว่า ISO เสมอ** (นโยบาย TIS-first)
- `standard_clauses.logic_rule` (jsonb) — แปลงข้อกำหนดเป็น Logic สำหรับ auto-check (ยังไม่มี UI)
- `kanban_columns.wip_limit` — JIT: จำกัดงานค้าง (Doing = 5 ใน MVP)
- `standards`/`standard_clauses` เขียนได้เฉพาะ service_role (seed ผ่าน migration เท่านั้น)

## Design Rules (จาก Data-Driven Agent skill — บังคับใช้ทุกงาน)
1. ใช้คำว่า **"ธุรกิจ"** เสมอ ห้ามใช้ "โรงงาน"
2. **TIS Automate / มอก. มาก่อน ISO** ในทุกการเรียงลำดับและการสื่อสาร
3. UI เรียบง่าย ยึดผู้ใช้เป็นศูนย์กลาง (Law of UX) — แสดงผลแบบ **Kanban View** เมื่อเหมาะสม
4. **Supabase เป็นแหล่งข้อมูลหลักเสมอ** — ระบุ schema (ตาราง/ความสัมพันธ์/RLS) ชัดเจนเมื่อออกแบบ
5. Transparency: ระบุ Database + Subdomain ที่ใช้ให้ชัดทุกครั้ง
6. ถ้าข้อมูลมาตรฐานอัปเดต (ตาราง standard_updates) ต้องแจ้งผู้ใช้ก่อนเริ่มออกแบบ

## Key Source Files
```
src/App.tsx            — ทั้งแอป (auth / ธุรกิจ / โครงการ / kanban) ~300 บรรทัด
src/lib/supabase.ts    — client + publishable key (override ได้ผ่าน .env)
src/index.css          — สไตล์ทั้งหมด (dark theme)
README.md              — คู่มือติดตั้งลง D:\tis-automate
```

## Dev Commands
```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # tsc -b && vite build → dist/
```
Local = production backend เดียวกัน (ไม่มี local mode — ยิง Supabase จริงเสมอ)

## MVP ที่มีแล้ว
- Auth email+password (ระวัง: ถ้า Supabase เปิด email confirmation ต้องยืนยันก่อนล็อกอิน)
- สร้าง/เลือกธุรกิจ (จำกัดสิทธิ์ด้วย RLS — เห็นเฉพาะธุรกิจที่เป็นสมาชิก)
- สร้างโครงการ + เลือกมาตรฐาน → บอร์ด Kanban 4 คอลัมน์อัตโนมัติ
- เพิ่ม/ย้ายการ์ด พร้อมเตือนเมื่อชน WIP limit

## Backlog (เรียงตามคุณค่า)
- [ ] standard_clauses UI: รายการข้อกำหนดต่อโครงการ + สถานะ gap/compliant (project_requirements)
- [ ] auto-check ด้วย logic_rule jsonb + สร้างการ์ด Kanban จากข้อกำหนดอัตโนมัติ
- [ ] อัปโหลดเอกสารหลักฐาน (documents → Supabase Storage — ยังไม่สร้าง bucket)
- [ ] validations + รายงาน Gap Analysis (ผู้ตรวจ role auditor)
- [ ] เชิญสมาชิกเข้าธุรกิจ (ตอนนี้มี policy เฉพาะ owner เพิ่มตัวเอง — ต้องเพิ่ม policy เชิญ member)
- [ ] Deploy production + subdomain `tis.ceoaithailand.org` (Cloudflare)
- [ ] Marketing events → funnel dashboard (ตาราง marketing_events พร้อมแล้ว)
- [ ] Billing/แพ็กเกจ — รอ Payment Gateway ของระบบหลัก

## เอกสารประกอบการขาย/ตรวจ ISO (ใน repo แม่)
- `../docs/SOP-ACCESS-CONTROL-SSO.md` — SOP ควบคุมการเข้าถึง + นโยบาย SSO/MFA + แบบฟอร์มขอสิทธิ์
- `../docs/POLICY-ISO27001-DATA-CONTROL.md` — นโยบายควบคุมข้อมูลตาม ISO/IEC 27001 (เอกสารแนบส่งลูกค้า)

## Workflow / กติกา
- ห้ามสร้าง `.env` ที่มี secret ใน repo (publishable key ฝังได้ — เป็น public key)
- Migration ใหม่ของ TIS: สร้างไฟล์ใน `../supabase/migrations/` ชื่อขึ้นต้น `00XX_tis_*`
  ระบุหัวไฟล์ว่า "applied บน galtbbkcddugnsfkgyqm — ห้าม apply กับ project หลัก"
  และ**ขอ Board ยืนยันก่อน apply ทุกครั้ง**
- อ้างอิงข้อมูลบริษัท/ตลาด: skill `data-driven-agent`, `market-insight-thailand`,
  `market-validation` ใน `../.claude/skills/`
