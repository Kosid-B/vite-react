# TIS Automate

ระบบจัดการ Compliance มาตรฐาน TIS/ISO สำหรับ "ธุรกิจ" (SaaS)
โดย B. Training Consultant (M.E.A) Co., Ltd. — โทร 081-7817-7773

## สถาปัตยกรรม

- **Backend**: Supabase project แยกของตัวเอง — `galtbbkcddugnsfkgyqm` (ap-southeast-1)
  ไม่ปนกับฐานข้อมูล CEO AI Thailand
- **Schema**: 13 ตาราง + RLS ครบ (ดู `../supabase/migrations/0016–0017` + write policies + seed มาตรฐาน)
  — applied บน production แล้วทั้งหมด
- **Frontend**: Vite + React + TypeScript (โฟลเดอร์นี้) — standalone ไม่เกี่ยวกับแอปหลัก
- **Design rules** (ตาม Data-Driven Agent skill): ใช้คำว่า "ธุรกิจ" · TIS-first · Kanban + JIT (WIP limit) · Supabase-first

## 📦 ติดตั้งลงเครื่องคุณ (D:\tis-automate)

เปิด PowerShell แล้วรัน:

```powershell
# 1. clone repo หลัก (ถ้ายังไม่มี) แล้วคัดลอกเฉพาะโฟลเดอร์นี้ไป D:\
git clone https://github.com/Kosid-B/vite-react.git $env:TEMP\vite-react-tmp
Copy-Item -Recurse $env:TEMP\vite-react-tmp\tis-automate D:\tis-automate

# 2. ติดตั้งและรัน
cd D:\tis-automate
npm install
npm run dev     # → http://localhost:5173
```

> ค่าเชื่อมต่อ Supabase (URL + anon key) ฝังเป็น default ใน `src/lib/supabase.ts` แล้ว — รันได้ทันที
> ถ้าต้องการ override สร้างไฟล์ `.env`: `VITE_SUPABASE_URL=...` และ `VITE_SUPABASE_ANON_KEY=...`

## ฟีเจอร์ใน MVP นี้

1. สมัคร/เข้าสู่ระบบ (อีเมล + รหัสผ่าน — Supabase Auth)
2. สร้าง **ธุรกิจ** (organizations) พร้อม subdomain ตามกฎ Transparency
3. สร้าง **โครงการ Compliance** เลือกมาตรฐาน (seed แล้ว: TIS 50-2565, มอก. 9001-2559, ISO 9001/14001/22301 — เรียง TIS-first)
4. **Kanban board** อัตโนมัติ 4 คอลัมน์ต่อโครงการ + เพิ่ม/ย้ายการ์ด พร้อม **WIP limit ตามหลัก JIT** (คอลัมน์ Doing จำกัด 5 งาน)

## ถัดไป (backlog)

- ใส่ standard_clauses (ข้อกำหนดย่อย) + auto-check ผ่าน logic_rule jsonb
- อัปโหลดเอกสารหลักฐาน (documents → Supabase Storage)
- validations + รายงาน gap analysis
- subdomain จริง (เช่น tis.ceoaithailand.org) + deploy Cloudflare Workers/Pages
