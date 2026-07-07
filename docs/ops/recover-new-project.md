# Recovery — กู้เว็บให้ทำงานบน project ใหม่ (waigsnxhrlwtiotspaim)

> ใช้เมื่อ project เดิม `rsjbqmnvocvtveelselj` ถูกลบและกู้ข้อมูลไม่ได้
> ผลลัพธ์: เว็บกลับมาทำงาน **แต่เริ่มฐานข้อมูลใหม่** (ข้อมูลเดิมไม่กลับ)
> ⚠️ ทำ Track A (ติดต่อ Supabase support ขอ restore project เดิม) คู่ขนานไปด้วยเสมอ

---

## STEP 1 — เปิด Extensions (project ใหม่)
Dashboard (waigsnxhrlwtiotspaim) → **Database → Extensions** เปิด:
- `pgcrypto`, `uuid-ossp` (จำเป็นสำหรับ core schema)
- `pg_cron`, `pg_net` (ไว้ทำ STEP 6 cron — เปิดตอนนี้เลยก็ได้)

## STEP 2 — สร้าง schema (ตาราง + RLS + storage bucket)
Dashboard → **SQL Editor → New query** → วางทั้งไฟล์ **`recover-new-project.sql`** → **Run**
- รวม migrations 0001–0015, 0019, 0020 (ตาราง app_state, workspaces, storefronts, rfqs, orders,
  marketplace_skills, skill_auctions, storefront ads/leads/images, workspace_integrations + RLS ครบ)
- สร้าง storage bucket `shop-images` (public) + policies ให้แล้ว
- ถ้ามี error ให้ส่ง error กลับมา — ปกติควรรันผ่านทั้งไฟล์ (ใช้ `if not exists` เกือบทั้งหมด)

## STEP 3 — ตั้งค่า Auth
Dashboard → **Authentication → URL Configuration**:
- **Site URL / Redirect URLs** = `https://ceoaithailand.org`

## STEP 4 — Cutover ให้เว็บชี้ project ใหม่
1. **GitHub Secrets** (คุณตั้งเอง — Settings → Secrets and variables → Actions):
   - `VITE_SUPABASE_URL` = `https://waigsnxhrlwtiotspaim.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = publishable key ใหม่ (Dashboard → Settings → API → `sb_publishable_…`)
2. **merge PR #86** (แก้ `wrangler.jsonc` ให้ worker ชี้ project ใหม่ — เตรียมไว้แล้ว)
   → Cloudflare auto-deploy จาก main
   > ⚠️ PR #86 ตอนนี้รวมงาน UX ด้วย — merge แล้วได้ทั้ง cutover + UX พร้อมกัน (ยอมรับได้ในสถานการณ์กู้ระบบ)

## STEP 5 — Verify เว็บกลับมา
- เปิด https://ceoaithailand.org → สมัคร/ล็อกอินใหม่ได้ (ผู้ใช้เดิมต้องสมัครใหม่ — JWT คนละตัว)
- เปิดหน้าร้าน `/b` (ยังว่างจนกว่าจะมีคนสร้างร้าน)
- ยิง edge function 1 ตัว (เช่น ai-assist) ดูว่าไม่ error

## STEP 6 — Edge Functions + Cron (ทำให้ระบบครบ)
```bash
supabase functions deploy --project-ref waigsnxhrlwtiotspaim
supabase secrets set --project-ref waigsnxhrlwtiotspaim \
  ANTHROPIC_API_KEY=... SERPER_API_KEY=... RESEND_API_KEY=... CRON_SECRET=...
```
แล้วรัน **`recover-new-project-cron.sql`** ใน SQL Editor (billing / weekly / daily CEO report cron)
> ต้องเปิด pg_cron/pg_net (STEP 1) + deploy functions + ตั้ง CRON_SECRET ก่อน

---

## หมายเหตุความปลอดภัย
- อย่ารัน 0016–0018 (TIS Automate) ที่ project นี้ — เป็นของอีกระบบ
- publishable key = public โดยดีไซน์ (ใส่ใน wrangler/GitHub Secrets ได้) · อย่า commit service_role/secret
- ผู้ใช้เดิมทุกคนต้องล็อกอินใหม่ (JWT ของ project ใหม่คนละตัว)
