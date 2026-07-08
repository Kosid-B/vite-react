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
- prod (`waigsnxhrlwtiotspaim`) migration history reconcile แล้ว 2026-07-07: applied 0001–0015, 0018–0024 (0016/0017 ว่าง = ถูกต้อง)
  - หมายเหตุ: 0018 ถูก mark applied บน prod จาก history เดิม แต่จริง ๆ เป็น TIS — ให้ถือว่า no-op บน prod
- **แผนถาวร:** แยก TIS (โฟลเดอร์ `tis-automate/` + 0016/0017/0018) ออกไป repo ของ TIS เอง เพื่อลบ landmine นี้

## หมายเหตุ config drift (แก้ 2026-07-07)
- `0024` เดิมอ้างฟังก์ชัน `update_updated_at()` + `delete_workspace()` ที่ **ไม่มี migration ไหนสร้าง** (prod มีของนอก repo)
  → แก้แล้ว: `0024` เพิ่มนิยาม 2 ฟังก์ชันนี้แบบ idempotent ที่ต้นไฟล์ ให้ repo reproduce prod ได้

## ลำดับ main-app (apply กับ prod/dev)
`0001–0015`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`
(cron: `0004`, `0008` ตั้ง pg_cron — ข้ามได้บน dev)
