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
| **production** | `waigsnxhrlwtiotspaim` | ACTIVE_HEALTHY | **verified สด 2026-07-10** (org `bgvyelbcbxhzzfrzuqnh` เชื่อม MCP แล้ว — ดู §5b) |

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

## 5. Residual findings (NC ต่อเนื่อง)

- **NC-02 (repo defect) — ✅ ปิดแล้ว 2026-07-10:** `0027_reconcile_prod_rpc_grants.sql` เคยอ้าง `delete_workspace(uuid)` และ `update_updated_at()` ที่ **ไม่มี migration ไหนใน repo สร้างเลย** → ฐานข้อมูลใหม่ที่ build จาก repo migrations ล้วน ๆ จะ **fail ที่ 0027**
  → **แก้ (guard):** ห่อ 2 บรรทัดนั้นด้วย `do $$ begin if to_regprocedure('public.delete_workspace(uuid)') is not null then ... end if; end $$;` (และแบบเดียวกันสำหรับ `update_updated_at()`) — บน repo/dev/CI ที่ไม่มีฟังก์ชัน → ข้ามสะอาด, บน prod ที่มีฟังก์ชัน → grant/revoke ทำงานเหมือนเดิม (พฤติกรรมไม่เปลี่ยน)
  → **verify บน dev (oudykxmtrnjeskglaluh) 2026-07-10:** ยืนยัน `to_regprocedure(...) is null` ทั้งคู่ (ฟังก์ชันไม่มีบน dev) → รัน guarded blocks ผ่าน `execute_sql` **สำเร็จไม่มี error** (ข้ามทั้ง 2 บล็อก) = พิสูจน์ว่า repo-only rebuild ผ่าน 0027 แล้ว
- **NC-03 (drift) — ✅ ปิด repo-side แล้ว 2026-07-10:** ฟังก์ชัน 2 ตัวข้างต้นมีบน production (out-of-band) แต่ไม่มีใน repo → config drift
  → **แก้:** `0029_reconcile_drift_functions.sql` — reverse-engineer นิยามจริงจาก prod (`pg_get_functiondef`) มาไว้ใน repo (CREATE OR REPLACE + grants ตรงกับ 0027) → repo สร้างฟังก์ชันเองแล้ว = repo ตรงกับ prod · บน prod เป็น idempotent no-op (body เดิม/grant เดิม)
  → **verify:** compile 0029 บน prod ใน transaction แล้ว `rollback` (prod ไม่เปลี่ยน) — ผ่านสะอาด · **ยังไม่ได้บันทึกลง ledger prod** (รออนุมัติ apply — prod มีฟังก์ชันอยู่แล้วจึงไม่จำเป็นเชิงพฤติกรรม เป็นแค่ bookkeeping)

## 5b. Production verification (สด 2026-07-10 — หลังได้สิทธิ์ prod org `bgvyelbcbxhzzfrzuqnh`)

ตรวจ `waigsnxhrlwtiotspaim` ผ่าน MCP โดยตรง (read-only):

| รายการ | ผล |
|---|---|
| **Grant matrix** (13 RPC) | ✅ ถูกต้องครบ — sensitive RPC ทั้งหมด anon=false/auth=true · `lead_count` anon=true (ตั้งใจ) · `update_updated_at` anon=false/auth=false (ล็อก) · `delete_workspace` auth=true |
| **get_advisors(security)** | ✅ **0 lints** (ไม่มี defect) |
| **TIS tables** (organizations/standards) | ✅ **ไม่มีบน prod** (แยกสะอาด ไม่ปนเปื้อน) |
| **core tables** | ✅ `workspace_integrations`, `storefront_leads` มีครบ |

**Findings (drift ที่ต้องติดตาม — ไม่ใช่ incident สด):**
- **`handoff_nonces` ไม่มีบน prod** (repo `0028`) — latent · gate ด้วย `INTEGRATIONS.theossphereLive` (ยังไม่ live) → ต้อง apply `0028` **ก่อน** เปิด theossphere handoff
- **migration ledger เลขเพี้ยน:** prod บันทึก migration ตาม **ชื่อ** ตรง แต่ **เลข version ต่างจากไฟล์ repo** (เช่น `reconcile_prod_rpc_grants` = prod `0024` แต่ repo `0027`; ชุด 0018→ เป็นต้นไป offset ~3) → `supabase db push` ในอนาคตอาจชน ต้อง reconcile ledger แยก
- **prod มีตารางนอก repo:** trigger ที่เรียก `update_updated_at` อยู่บน `cj_*` + `storage.objects` (ไม่ใช่ schema ของแอปนี้) — คนละแอป/legacy ในโปรเจกต์เดียวกัน · นอกขอบเขต repo นี้

## 6. เอกสารที่แก้ (ปิด overclaim)

- `CLAUDE.md` — แก้บรรทัด migrations "0001–0012 applied แล้ว" → อ้างเอกสารนี้ + ระบุ dev verified / prod ตรวจแยก
- `CLAUDE.md` (TIS) — เพิ่ม 0018, ระบุ project INACTIVE, ห้าม apply กับ dev ด้วย

## 7. สถานะ NC-01

**ปิด (dev + prod)** — dev verified + hardened · **prod verified สด 2026-07-10** (grant matrix ถูกครบ, advisors 0 lints, TIS แยกสะอาด)
**NC-02 ปิดแล้ว** — 0027 guarded (repo-only rebuild ผ่าน 0027)
**NC-03 ปิด repo-side แล้ว** — `0029` reverse-engineer ฟังก์ชันจาก prod (repo = prod) · compile ผ่านบน prod (rollback)
**เปิดค้าง (ติดตาม ไม่ใช่ incident):** apply `0028` handoff_nonces ก่อนเปิด theossphere · reconcile ledger เลข version prod↔repo · (option) บันทึก 0029 ลง ledger prod
