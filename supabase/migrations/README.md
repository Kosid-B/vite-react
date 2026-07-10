# Supabase Migrations — คู่มือและกติกา

> อ้างอิง ISO/IEC 27001:2022 control 8.9 (Configuration Management) · [environment-map.md](../../docs/isms/environment-map.md)

## ⚠️ กติกาสำคัญ — TIS migrations ปนอยู่ในโฟลเดอร์นี้
migration ต่อไปนี้เป็นของ **TIS Automate (project `galtbbkcddugnsfkgyqm`) เท่านั้น** — **ห้าม apply กับ production หลัก (`waigsnxhrlwtiotspaim`) หรือ dev (`oudykxmtrnjeskglaluh`)**:

| ไฟล์ | เป็นของ | สร้างตาราง/ของ |
|---|---|---|
| `0016_tis_automate.sql` | TIS เท่านั้น | organizations, standards, clauses, projects, requirements ฯลฯ |
| `0017_tis_rls_fixes.sql` | TIS เท่านั้น | RLS fixes ของ TIS |
| `0018_tis_write_policies_and_seed.sql` | TIS เท่านั้น | write policies + seed มาตรฐาน (อ้างตาราง TIS ใน 0016) |

## 🚫 ห้าม `supabase db push` กับ prod/dev ตรงๆ
เพราะจะลาก 0016/0017/0018 (TIS) ไป apply ผิดโปรเจกต์ → สร้างตาราง TIS ที่ไม่ควรมี
- **แก้ prod/dev** → ใช้ MCP `apply_migration` / SQL Editor เฉพาะไฟล์ที่ต้องการ หรือ `migration repair` (ดูประวัติการ reconcile ใน environment-map)
- dev (`oudykxmtrnjeskglaluh`) — apply แล้ว ยืนยันสด ดู [NC-01-migration-verification.md](../../docs/isms/NC-01-migration-verification.md)
- prod (`waigsnxhrlwtiotspaim`) — **ยังยืนยัน migration history ไม่ได้จากที่นี่** (ไม่อยู่ใน MCP ที่เชื่อมอยู่) → ห้ามอ้างว่า "applied แล้ว" จนกว่าจะตรวจด้วยสิทธิ์ prod (NC-03)
- **แผนถาวร:** แยก TIS (โฟลเดอร์ `tis-automate/` + 0016/0017/0018) ออกไป repo ของ TIS เอง เพื่อลบ landmine นี้

## 🔴 NC-02 — repo ยัง build ใหม่จากศูนย์ไม่ผ่าน (เปิดอยู่)
`0027_reconcile_prod_rpc_grants.sql` **grant/revoke** บนฟังก์ชัน `delete_workspace(uuid)` และ `update_updated_at()`
ซึ่ง **ไม่มี migration ไหนใน repo สร้างเลย** (prod มีอยู่จริงแบบนอก repo = config drift, control 8.9)
→ DB ที่ apply จาก repo ล้วน ๆ จะ **fail ที่ 0027** (`ERROR 42883: function does not exist`)

**ห้ามแก้ด้วยการเขียนนิยามฟังก์ชันขึ้นเอง** — จะเป็นการเดา body ของฟังก์ชันที่ prod ใช้จริง และถ้า `create or replace`
ถูกรันกับ prod จะ **เขียนทับของจริงเงียบ ๆ** · ทางแก้ที่ถูกคือ **export นิยามจริงจาก prod**
(`select pg_get_functiondef(oid) …`) แล้ว commit เป็น migration ที่ลำดับก่อน 0027 — รอสิทธิ์ prod

## ลำดับ main-app (apply กับ prod/dev)
`0001–0015`, `0019`–`0028` (ข้าม `0016`/`0017`/`0018` = TIS)
(cron: `0004`, `0008`, `0021`, `0022` ตั้ง pg_cron — ข้ามได้บน dev)
