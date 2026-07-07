# Backup & Restore — ป้องกันข้อมูลหาย (Disaster Recovery)

> เกิดหลังบทเรียน ก.ค. 2569: ลบ Supabase project = ข้อมูล prod หายทั้งหมด (migration ไม่เคยเสร็จ)
> หลักการ: backup ต้อง **ออฟไซต์** (ไม่ใช่เก็บในโปรเจกต์เดียวกันที่อาจถูกลบพร้อมกัน)

## กลไก (3 ชั้น)

### ชั้น 1 — Supabase native (ตั้งใน Dashboard · ทำครั้งเดียว)
- **Free tier**: มี daily backup ~7 วัน (แต่หายถ้าลบ project) — เปิดใช้อัตโนมัติ
- **Pro tier** (แนะนำเมื่อมีผู้ใช้จริง): เปิด **PITR** (Point-in-Time Recovery) ที่ Dashboard → Database → Backups
- ⚠️ ทั้งคู่ **หายถ้า project ถูกลบ** → จึงต้องมีชั้น 2–3

### ชั้น 2 — On-site snapshot (อัตโนมัติ · Edge Function)
`backup-export` (รันโดย pg_cron ทุกวัน 01:00 ไทย) → JSON snapshot ทุกตารางสำคัญ → เก็บใน Storage bucket `backups`
เก็บ 14 วันล่าสุด (prune อัตโนมัติ) · กู้เร็วเมื่อข้อมูลเสียบางส่วน

### ชั้น 3 — Off-site (อัตโนมัติ · อีเมล) 🔑
`backup-export` อีเมล JSON snapshot แนบไปหา **admin (support@b-tctraining.com)** ทุกวันผ่าน Resend
→ **รอดแม้ทั้ง project ถูกลบ** (backup อยู่ในกล่องอีเมล) — นี่คือชั้นที่กันเหตุ ก.ค. 2569 ซ้ำ

## ติดตั้ง (ครั้งเดียว)
```bash
# 1) deploy edge function
supabase functions deploy backup-export --project-ref waigsnxhrlwtiotspaim --no-verify-jwt
# 2) secrets (ถ้ายังไม่ได้ตั้ง)
supabase secrets set --project-ref waigsnxhrlwtiotspaim CRON_SECRET=... RESEND_API_KEY=...
# 3) รัน migration 0022 (สร้าง bucket + pg_cron) — แก้ <PROJECT_REF>/<CRON_SECRET> ก่อน
#    Dashboard → SQL Editor → วาง supabase/migrations/0022_backup_cron.sql → Run
# 4) ทดสอบทันที: เรียกฟังก์ชันด้วย x-cron-secret → เช็คว่ามีไฟล์ใน bucket + อีเมลเข้า
```

## Restore (กู้ข้อมูล)
1. หาไฟล์ backup ล่าสุด: จากอีเมล admin (off-site) หรือ Storage bucket `backups`
2. snapshot เป็น JSON: `{ "_meta":..., "workspace_state":[...], "storefronts":[...], ... }`
3. โหลด SQL หรือใช้สคริปต์ upsert เข้าตารางตามลำดับใน `_meta.tables` (parent ก่อน child)
   - ตัวอย่าง (workspace_state): `insert into workspace_state (workspace_id, data) values (...) on conflict (workspace_id) do update set data = excluded.data;`
4. `_auth_users` เก็บ id/email ไว้อ้างอิง (สร้าง user ใหม่ผ่าน Auth admin API ถ้าต้อง)

## หมายเหตุ
- snapshot ไม่รวม secret (workspace_integrations เก็บ credential — พิจารณา encrypt ถ้า sensitive)
- ขนาด snapshot โตตามผู้ใช้ — ถ้าเกิน ~40MB ให้เปลี่ยน off-site เป็น upload ไป GitHub/Google Drive แทนอีเมล
