# Runbook — ย้าย Production Supabase (ข้อมูลจริงทั้งหมด)

> **จาก** `rsjbqmnvocvtveelselj` (prod เดิม) → **ไป** `waigsnxhrlwtiotspaim` (prod ใหม่)
> ประเภท: **Full migration** (schema + data + auth users + storage files)
> ⚠️ เป็น production จริง — ทำตามลำดับเป๊ะ ๆ · เก็บ project เดิมไว้จนกว่าจะ verify ครบ (rollback ได้)

---

## 0) เตรียมของ (ครั้งเดียว)
- ติดตั้ง **Supabase CLI** + **Postgres client v15+** (`pg_dump`, `psql`)
- Connection string (URI) ทั้งสอง project: Dashboard → **Settings → Database → Connection string → URI**
  (ใช้ **Session pooler / direct** พอร์ต `5432` — อย่าใช้ transaction pooler 6543 ตอน dump)
- เก็บ **service_role key** ของทั้งสอง project ไว้ (ใช้ตอนย้ายไฟล์ Storage) — เป็นความลับ อย่า commit

```bash
# ⚠️ อย่า commit connection string จริงลงไฟล์ — วางเป็น env ตอนรันเท่านั้น
# คัดลอก URI จาก Dashboard → Settings → Database → Connection string → URI (พอร์ต 5432)
export OLD_URL='<วาง OLD connection string URI ที่นี่>'
export NEW_URL='<วาง NEW connection string URI ที่นี่>'
```

## 1) (แนะนำ) ตรึงข้อมูลเดิมกันเปลี่ยนระหว่างย้าย
เพื่อไม่ให้ข้อมูลเลื่อนระหว่าง dump — ตั้งเว็บเป็นโหมดบำรุงรักษาชั่วคราว หรือแจ้งผู้ใช้งดใช้ช่วงย้าย
(ถ้าข้อมูลไม่มาก ข้ามได้ แต่ทำ dump ตอน traffic ต่ำ)

## 2) เปิด extension ที่จำเป็นบน project ใหม่ (ก่อน restore)
Dashboard (ใหม่) → **Database → Extensions** เปิด: `pg_cron`, `pgcrypto`, `pg_net` (ถ้าใช้), `uuid-ossp`
> `pg_cron` ต้องเปิดจาก dashboard — restore เฉย ๆ ไม่พอ

## 3) Dump จาก project เดิม (วิธีทางการของ Supabase)
```bash
supabase db dump --db-url "$OLD_URL" -f roles.sql  --role-only
supabase db dump --db-url "$OLD_URL" -f schema.sql
supabase db dump --db-url "$OLD_URL" -f data.sql   --use-copy --data-only
```
เพื่อความชัวร์ ให้ dump ข้อมูล **auth** และ **storage (metadata)** แยกไว้ด้วย:
```bash
supabase db dump --db-url "$OLD_URL" -f data_auth.sql    --use-copy --data-only --schema auth
supabase db dump --db-url "$OLD_URL" -f data_storage.sql --use-copy --data-only --schema storage
```
> **หมายเหตุ schema:** dump นี้พก schema จริงของ prod เดิม (ไม่เคย apply migration 0016–0018 ซึ่งเป็นของ TIS)
> จึง **ไม่ต้อง** re-run migrations 0001–0021 ที่ project ใหม่ — schema มาจากไฟล์ dump แล้ว

## 4) Restore เข้า project ใหม่
```bash
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file roles.sql \
  --file schema.sql \
  --file data.sql \
  --dbname "$NEW_URL"
# ถ้า auth/storage ไม่เข้าจากขั้นบน ให้ตามด้วย:
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file data_auth.sql --file data_storage.sql --dbname "$NEW_URL"
```
> `session_replication_role = replica` ปิด trigger/FK ชั่วคราวตอนโหลด กัน error ลำดับ FK

## 5) ย้ายไฟล์ Storage (bucket `shop-images`) — สำคัญ ไม่งั้นรูปสินค้าหาย
`pg_dump` ย้ายแค่ **แถว** ใน `storage.objects` ไม่ย้าย **ไฟล์จริง** — ต้อง copy ไฟล์เอง
สคริปต์ Node (ใช้ service_role ทั้งสอง project):
```js
// migrate-storage.mjs — node migrate-storage.mjs
import { createClient } from '@supabase/supabase-js'
const OLD = createClient('https://rsjbqmnvocvtveelselj.supabase.co', process.env.OLD_SERVICE_ROLE)
const NEW = createClient('https://waigsnxhrlwtiotspaim.supabase.co', process.env.NEW_SERVICE_ROLE)
const BUCKET = 'shop-images'
async function walk(prefix = '') {
  const { data, error } = await OLD.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw error
  for (const it of data) {
    const path = prefix ? `${prefix}/${it.name}` : it.name
    if (it.id === null) { await walk(path); continue }         // โฟลเดอร์
    const { data: blob, error: dErr } = await OLD.storage.from(BUCKET).download(path)
    if (dErr) { console.error('skip', path, dErr.message); continue }
    const { error: uErr } = await NEW.storage.from(BUCKET)
      .upload(path, blob, { contentType: it.metadata?.mimetype || 'image/jpeg', upsert: true })
    console.log(uErr ? `FAIL ${path}: ${uErr.message}` : `ok ${path}`)
  }
}
walk().then(() => console.log('done'))
```
> ต้องสร้าง bucket `shop-images` (public) ที่ใหม่ก่อน — schema.sql มี `insert into storage.buckets` ให้แล้ว
> ถ้ามี bucket อื่น (เช่น avatars) ทำซ้ำวิธีเดียวกัน

## 6) Deploy Edge Functions + secrets ไป project ใหม่
Functions ทั้งหมด: `agent-run · ai-assist · ai-plan · billing-cron · create-invoice · daily-ceo-report · delete-account · generate-badge · promptpay-webhook · sheets-oauth · sheets-sync · weekly-report · xendit-webhook`
```bash
supabase functions deploy --project-ref waigsnxhrlwtiotspaim   # deploy ทั้งหมด (หรือระบุทีละตัว)
supabase secrets set --project-ref waigsnxhrlwtiotspaim \
  ANTHROPIC_API_KEY=... SERPER_API_KEY=... RESEND_API_KEY=... CRON_SECRET=...
# ถ้าใช้: XENDIT_*, WEBHOOK_SECRET, GOOGLE_CLIENT_ID/SECRET
```

## 7) ตั้ง pg_cron ใหม่ (billing / weekly / daily CEO)
Cron jobs ถูกสร้างใน migrations 0004 / 0008 / 0021 ผ่าน `cron.schedule(...)`
หลัง restore ให้เช็ก `select * from cron.job;` — ถ้าไม่มา ให้รัน `cron.schedule(...)` ซ้ำจากไฟล์ migration เหล่านั้น
(ต้องเปิด `pg_cron` จากขั้น 2 แล้ว + ตั้ง `CRON_SECRET` ให้ตรง)

## 8) ตั้งค่า Auth (ไม่ได้อยู่ใน DB dump)
Dashboard (ใหม่) → **Authentication**:
- **URL Configuration → Site URL / Redirect URLs** = `https://ceoaithailand.org`
- SMTP / providers ถ้ามี (magic link ใช้ built-in ได้)
> ⚠️ **JWT secret ของ project ใหม่คนละตัว** → เซสชันเดิมของผู้ใช้ทุกคนจะหลุด ต้องล็อกอินใหม่ (ปกติของการย้าย)

## 9) Cutover — สลับ production ให้ชี้ project ใหม่
1. **ตั้ง GitHub Secrets** (คุณ): `VITE_SUPABASE_URL=https://waigsnxhrlwtiotspaim.supabase.co`,
   `VITE_SUPABASE_ANON_KEY=<anon/publishable key ใหม่>` → trigger redeploy (deploy.yml / Cloudflare build)
2. **แก้ `wrangler.jsonc` vars** (ผมทำให้ผ่าน PR): `SUPABASE_URL` + `SUPABASE_ANON_KEY` เป็นของใหม่ → merge → Cloudflare auto-deploy
3. ทำ 2 ขั้นนี้ **ใกล้กัน** เพื่อลด window ที่ frontend กับ worker ชี้คนละ project

## 10) Verify (ผมช่วยผ่าน MCP ได้เมื่อเชื่อม token แล้ว)
- นับแถวเทียบเก่า/ใหม่ทุกตารางหลัก (`workspace_state, workspaces, workspace_members, storefronts, rfqs, orders, skill_purchases, app_admins, …`)
- `select count(*) from auth.users;` เก่า = ใหม่
- `select count(*) from storage.objects where bucket_id='shop-images';` เก่า = ใหม่
- เช็ก RLS เปิดครบ + `cron.job` มีงานครบ
- Smoke test เว็บจริง: ล็อกอิน → เปิด workspace → หน้า `/b` + รูปสินค้า → ยิง edge function 1 ตัว

## 11) Rollback
ถ้าพัง: กลับ GitHub Secrets + wrangler.jsonc เป็น `rsjbqmnvocvtveelselj` → redeploy
**อย่าเพิ่งลบ/หยุด project เดิม** จนกว่าจะ verify ครบ ~1–7 วัน

---

### สิ่งที่ Claude ทำให้ได้ (เมื่อเชื่อม Supabase MCP กับบัญชีที่เป็นเจ้าของ project ใหม่)
- ตรวจ/verify ข้อ 10 (นับแถว, RLS, cron, auth count) ผ่าน `execute_sql`
- ช่วยไล่ debug ถ้า restore ติด error
- เตรียม/แก้ `wrangler.jsonc` (ข้อ 9.2) → PR

### สิ่งที่ต้องเป็นคุณทำเอง (Claude เข้าไม่ถึงจาก sandbox)
- Dump/restore (ข้อ 3–4), ย้ายไฟล์ Storage (ข้อ 5), deploy functions + secrets (ข้อ 6),
  ตั้ง Auth (ข้อ 8), GitHub Secrets (ข้อ 9.1)
