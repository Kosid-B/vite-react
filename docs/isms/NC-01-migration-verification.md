# NC-01 — Migration "applied" overclaim: verification & corrective action

> ISO/IEC 27001:2022 · 7.5 (documented information), 8.9 (configuration management), 10.1/10.2 (nonconformity & corrective action)
> วันที่ปิด: 2026-07-10 · แหล่งหลักฐาน: Supabase MCP (live query) · เครื่องมือ: `list_migrations`, `list_tables`, `execute_sql` (has_function_privilege), `get_advisors`

## 1. Nonconformity (สิ่งที่พบ)

เอกสารระบุว่า migration ถูก apply แล้ว **โดยไม่มีหลักฐานยืนยันสด** และตัวเลขล้าสมัย:

- `CLAUDE.md`: "supabase/migrations/ — **0001–0012 (ทั้งหมด applied แล้ว)**" — ทั้งที่ repo มี **0001–0028** และไม่มีหลักฐานว่า apply จริง
- `CLAUDE.md` (TIS): "0016 + 0017 (**applied แล้วทั้งคู่**)" — ไม่ระบุ 0018 และไม่ยืนยันสถานะ project

= overclaim (อ้างเกินหลักฐาน) ขัดกับหลัก evidence-based ของ ISMS

## 2. หลักฐานสด (verify — 2026-07-10)

โปรเจกต์ที่เข้าถึงได้ผ่าน MCP:

| Project | ref | สถานะ | หมายเหตุ |
|---|---|---|---|
| ceo-ai-thailand-**dev** | `oudykxmtrnjeskglaluh` | ACTIVE | เป้าหมาย apply/verify |
| tis-automate | `galtbbkcddugnsfkgyqm` | **INACTIVE** | ตรวจสถานะไม่ได้จนกว่าจะ resume |
| **production** | `waigsnxhrlwtiotspaim` | **ไม่อยู่ใน MCP** | **ตรวจจากที่นี่ไม่ได้ — ต้องใช้สิทธิ์ prod แยก** |

**สถานะ dev ก่อนแก้:** migration ledger มีแค่ **4 รายการ** (0001, 0002+0003, 0005, 0023) · **5 ตาราง** → พิสูจน์ว่า "0001–0012 applied แล้ว" **ไม่จริงบน dev**

## 3. Corrective action (สิ่งที่ทำ)

apply migration ที่ขาดผ่าน MCP `apply_migration` ไปยัง **dev เท่านั้น** (ไม่แตะ prod/TIS):

- **apply สำเร็จ 16 รายการ:** 0006, 0007, 0009–0015, 0019, 0020, 0024, 0025, 0026, 0028 + 0027 (subset)
- **dev หลังแก้:** ledger **20 รายการ** · **16 ตาราง** (RLS enabled ทุกตาราง)

### ขอบเขต (scoping) — สิ่งที่ตั้งใจไม่ apply บน dev
- **TIS 0016/0017/0018** — apply เฉพาะ project TIS (ยืนยันไม่มี migration อื่นอ้างตาราง TIS จึงแยกได้สะอาด)
- **cron 0004/0008/0021/0022** — ไม่มี schema (มีแค่ `pg_cron` + `cron.schedule` ของ prod) → dev ไม่ต้องมี cron job ของ prod
- **0027 apply แบบ subset** (`0027_reconcile_rpc_grants_dev_subset`) — ตัด 2 บรรทัดที่อ้าง `delete_workspace(uuid)` / `update_updated_at()` ออก (ดู §5)

## 4. Verification of effectiveness (พิสูจน์ว่าได้ผล)

`has_function_privilege` หลังแก้ — sensitive RPC ทั้งหมด **anon=false, authenticated=true** · `lead_count` เปิด anon (ตั้งใจ, social proof):

> **จับ leak ได้จริง:** ก่อน apply 0027 subset พบ `admin_skill_adoption` / `is_app_admin` / `is_member` ยัง **anon=true** เพราะ 0024 ทำแค่ `revoke from public` แต่ role `anon` มี **direct grant** ที่ต้อง `revoke from anon` ตรง ๆ (บทเรียน R13) — 0027 subset ปิดช่องนี้สำเร็จ

`get_advisors(security)` — เหลือเฉพาะ warning **by-design**: `handoff_nonces` (service_role only), `lead_count` (anon ตั้งใจ), SECURITY DEFINER functions (มี owner/member guard ภายใน) — ไม่มี defect ใหม่

## 5. Residual findings (NC ต่อเนื่อง — ต้องแก้ที่ repo)

- **NC-02 (repo defect):** `0027_reconcile_prod_rpc_grants.sql` อ้าง `delete_workspace(uuid)` และ `update_updated_at()` ที่ **ไม่มี migration ไหนใน repo สร้างเลย** → ฐานข้อมูลใหม่ที่ build จาก repo migrations ล้วน ๆ จะ **fail ที่ 0027**
  → **แก้:** เพิ่ม migration สร้าง 2 ฟังก์ชันนี้ หรือใส่ guard (`DO $$ ... IF to_regprocedure(...) IS NOT NULL ...`)
- **NC-03 (drift):** ฟังก์ชัน 2 ตัวข้างต้นมีบน production (out-of-band) แต่ไม่มีใน repo → config drift ระหว่าง prod กับ migration history
- **prod ยังไม่ verified:** MCP นี้ไม่มีสิทธิ์ production → สถานะ apply จริงของ `waigsnxhrlwtiotspaim` **ยังตรวจไม่ได้จากที่นี่** ต้องรันตรวจแยกด้วยสิทธิ์ prod (has_function_privilege + list ตาราง เทียบ 0001–0028)

## 6. เอกสารที่แก้ (ปิด overclaim)

- `CLAUDE.md` — แก้บรรทัด migrations "0001–0012 applied แล้ว" → อ้างเอกสารนี้ + ระบุ dev verified / prod ตรวจแยก
- `CLAUDE.md` (TIS) — เพิ่ม 0018, ระบุ project INACTIVE, ห้าม apply กับ dev ด้วย

## 7. สถานะ NC-01

**ปิด (dev)** — dev verified + hardened + เอกสารแก้แล้ว
**เปิดค้าง:** NC-02, NC-03 (repo) + prod verification (ต้องสิทธิ์ prod)
