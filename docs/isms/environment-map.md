# Environment Map — CEO AI Thailand
**แก้ปัญหา R11 (Config Drift) — ISO/IEC 27001:2022 control 8.9 (Configuration Management)**

| | |
|---|---|
| เวอร์ชัน | 2.0 (แก้ไขจากเวอร์ชัน 1.0 ที่สรุปผิด — ดู § 0) |
| วันที่ | 2026-07-05 |
| ผู้จัดทำ | IT Security |
| สถานะ | 🟢 R11 ปิดแล้ว — production ยืนยันด้วยหลักฐานระดับ API + แก้ incident ที่พบระหว่างตรวจแล้ว |

## 0. ⚠️ Postmortem: เวอร์ชัน 1.0 ของเอกสารนี้สรุปผิด
เวอร์ชันแรก (2026-07-03) สรุปว่า production = `waigsnxhrlwtiotspaim` โดยอิงหลักฐาน 3 อย่าง:
คำยืนยันด้วยวาจาจากผู้ใช้, ค่าใน `.env` ตอนนั้น, และ Supabase CLI link บนเครื่อง — **ทั้ง 3 อย่างนี้ล้วนเป็นอาการ
ของปัญหาเดียวกัน ไม่ใช่ความจริง** — เครื่องนี้ถูกตั้งค่าผิดไปเชื่อม `waigsnxhrlwtiotspaim` (โปรเจกต์ที่เข้าถึงไม่ได้
จากบัญชีเจ้าของจริง) ซึ่งเคยทำให้ **หน้าจอแชตค้างจริงในโปรดักชัน** (แอปยิง request ไปยัง project ที่ไม่มี
Edge Function ใดๆ deploy อยู่เลย)

**บทเรียน:** คำยืนยันจากคน + ไฟล์ config ในเครื่อง ไม่ใช่หลักฐานเพียงพอสำหรับ "production คือตัวไหน"
ต้องยืนยันด้วย **หลักฐานจากระบบจริงที่ตรวจสอบได้ (API)** เท่านั้น — ดู § 1

## 1. หลักฐานยืนยัน Production ตัวจริง (แก้ไขแล้ว)

| แหล่งหลักฐาน | ผล | น้ำหนัก |
|---|---|---|
| **Supabase Edge Functions API** — `list_edge_functions` บน `rsjbqmnvocvtveelselj` | **8 functions ทั้งหมด `status: ACTIVE`**: `ai-assist`, `ai-plan`, `agent-run`, `generate-badge`, `billing-cron`, `promptpay-webhook`, `weekly-report`, `delete-account` | **สูงสุด** — API ตรงจากระบบจริง ปลอมไม่ได้ |
| `.env` ปัจจุบัน (แก้ไขแล้ว 2026-07-05) | `VITE_SUPABASE_URL=https://rsjbqmnvocvtveelselj.supabase.co` | สูง |
| ไฟล์สำรอง `.env.bak-waigsnxhrlwtiotspaim` | ยืนยันว่า `waigsnxhrlwtiotspaim` ถูกเลิกใช้แล้วโดยตั้งใจ | สูง — หลักฐานการแก้ไข incident |
| Supabase CLI link (`supabase link --project-ref rsjbqmnvocvtveelselj`) | รันสำเร็จ, `supabase/.temp/linked-project.json` ชี้ `rsjbqmnvocvtveelselj` แล้ว | สูง |

**สรุป: Production Supabase project ตัวจริง = `rsjbqmnvocvtveelselj`** (org: `vercel_icfg_iAC8mla8cQ9VTLI4j31OKxwh`)
`CLAUDE.md`/`COMMAND.md` ถูกแก้ให้ตรงแล้ว (โดยเจ้าของระบบ, 2026-07-05)

## 2. Production Incident ที่พบระหว่างตรวจ R11 (แก้ไขแล้วในเซสชันนี้ 2026-07-05)

ระหว่างยืนยัน ground truth ผมตรวจสิทธิ์ฟังก์ชันจริงบน `rsjbqmnvocvtveelselj` (read-only) และพบว่ามีคน
เคยพยายาม harden สิทธิ์ (คล้าย migration `0020`/`0021` ที่ผมเตรียมไว้ — แต่รันบนโปรเจกต์ที่ตอนนั้นเข้าใจผิดว่า
เป็น prod) แล้วเกิดผลข้างเคียงจริงบนโปรเจกต์นี้:

| ฟังก์ชัน | ก่อนแก้ | ผลกระทบ | สาเหตุ |
|---|---|---|---|
| `ensure_default_workspace()` | `authenticated` เรียกไม่ได้ | ผู้ใช้ใหม่หลัง login อาจสร้าง workspace เริ่มต้นไม่ได้ | revoke จาก public แต่ไม่ grant กลับให้ authenticated |
| `invite_member()` | `authenticated` เรียกไม่ได้ | หน้า "ทีม/สมาชิก" เชิญสมาชิกไม่ได้ | เช่นเดียวกัน |
| `list_members()` | `authenticated` เรียกไม่ได้ | ดูรายชื่อสมาชิกไม่ได้ | เช่นเดียวกัน |
| `set_member_role()` | `authenticated` เรียกไม่ได้ | เปลี่ยนบทบาทสมาชิกไม่ได้ | เช่นเดียวกัน |
| `remove_member()` | `anon` เรียกได้ (grant ตรงเจาะจง ไม่ใช่ผ่าน public) | ช่องโหว่ least-privilege (8.2/8.3) — ผลกระทบจริงต่ำ (มี owner-check guard ภายใน) | ไม่เคยถูก revoke เลย |

**แก้ไขแล้วผ่าน MCP `execute_sql` ตรงบน production (2026-07-05):**
```sql
grant execute on function public.ensure_default_workspace()        to authenticated;
grant execute on function public.invite_member(uuid, text)         to authenticated;
grant execute on function public.list_members(uuid)                to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
revoke execute on function public.remove_member(uuid, uuid) from anon;   -- grant ตรง ต้อง revoke จาก anon ไม่ใช่ public
revoke execute on function public.remove_member(uuid, uuid) from public;
grant  execute on function public.remove_member(uuid, uuid) to authenticated;
```
**Verify หลังแก้ (ผ่าน `has_function_privilege`):** ทั้ง 8 ฟังก์ชันที่เกี่ยวข้อง (`create_workspace`,
`ensure_default_workspace`, `invite_member`, `list_members`, `set_member_role`, `remove_member`,
`admin_list_workspaces`, `admin_skill_adoption`) ✅ `anon=false, authenticated=true` ครบทุกตัว

## 3. โปรเจกต์อื่นที่เกี่ยวข้อง (ไม่ใช่ prod)

| Project ref | คืออะไร | สถานะ |
|---|---|---|
| `waigsnxhrlwtiotspaim` | ค่าที่เข้าใจผิดว่าเป็น prod — ทำให้เกิด incident จริง | ❌ เลิกใช้แล้ว, สำรองไว้ที่ `.env.bak-waigsnxhrlwtiotspaim` |
| `galtbbkcddugnsfkgyqm` | TIS Automate (แยกผลิตภัณฑ์ถูกต้องแล้ว) | ✅ ใช้งานตามปกติ |

## 4. แผนที่ environment ปัจจุบัน (ยึดตามนี้เป็นความจริง)

```
┌─ CEO AI Thailand — Production ──────────────────────────────────
│ Supabase project  : rsjbqmnvocvtveelselj  (org: vercel_icfg_iAC8mla8cQ9VTLI4j31OKxwh)
│ ยืนยันด้วย        : Edge Functions API — 8 functions ACTIVE (ai-assist, ai-plan, agent-run,
│                      generate-badge, billing-cron, promptpay-webhook, weekly-report, delete-account)
│ Custom domain     : ceoaithailand.org
│ Deploy            : Cloudflare Workers (wrangler deploy)
│ Migrations        : 0001–0019 + workspace_integrations ผ่านระบบ tracking;
│                      function grants (เทียบเท่า 0020/0021) แก้ตรงผ่าน SQL 2026-07-05
│ เข้าถึงผ่าน MCP    : ✅ ได้ (execute_sql, list_edge_functions, get_advisors)
│ CLI link          : ✅ ผูกถูกต้องแล้ว (`supabase link --project-ref rsjbqmnvocvtveelselj`)
├─ TIS Automate (แยกผลิตภัณฑ์) ────────────────────────────────────
│ Supabase project  : galtbbkcddugnsfkgyqm (org เดียวกับ prod)
│ Region            : ap-southeast-1 · Free tier
│ กติกา             : ห้าม apply migration ข้ามไปที่ rsjbqmnvocvtveelselj
├─ Cloudflare Worker ──────────────────────────────────────────────
│ Worker name       : ceo-ai-thailand
│ Secret            : ANTHROPIC_API_KEY (ตั้งผ่าน `wrangler secret put`)
├─ GitHub Actions (deploy.yml) ────────────────────────────────────
│ Secrets ที่ใช้    : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
│ ⚠️ ยังไม่ยืนยันด้วยตา — ต้องเช็คว่าค่าจริงชี้ rsjbqmnvocvtveelselj (ดู action items)
├─ Dev/local ──────────────────────────────────────────────────────
│ ไม่มี .env         : local mode ใช้ localStorage, ไม่ login
│ มี .env            : ต่อ rsjbqmnvocvtveelselj ตรง (ระวังแก้ข้อมูล prod จริง)
└──────────────────────────────────────────────────────────────────
```

## 5. Action Items ที่เหลือ

| # | งาน | เจ้าของ | สถานะ |
|---|---|---|---|
| 1 | ยืนยัน GitHub Actions secret `VITE_SUPABASE_URL` ชี้ `rsjbqmnvocvtveelselj` | เจ้าของ repo | 🔴 เปิด |
| 2 | แก้ `CLAUDE.md` + `COMMAND.md` ให้ตรง | เจ้าของระบบ | 🟢 **แก้แล้ว** (2026-07-05) |
| 3 | Relink Supabase CLI local | IT Security | 🟢 **แก้แล้ว** (`supabase link --project-ref rsjbqmnvocvtveelselj`) |
| 4 | แก้สิทธิ์ฟังก์ชันที่พังจาก incident (§2) | IT Security | 🟢 **แก้แล้ว** ผ่าน MCP — verify แล้วครบ 8 ฟังก์ชัน; บันทึกเป็น migration `0022` |
| 5 | `shop-images` storage bucket เปิด list ไฟล์ได้แบบสาธารณะ (R14) | IT Security | 🟢 **แก้แล้ว** — migration `0023` จำกัด SELECT ให้ owner-only; advisor **0 findings** หลังแก้ |
| 6 | Migration 0006–0021 ในเครื่อง (branch นี้) รันบน `waigsnxhrlwtiotspaim` (ผิดโปรเจกต์) — ควรลบ/archive project นั้นทิ้ง หรือคง `.env.bak` ไว้เป็นหลักฐานเท่านั้น | เจ้าของระบบ | 🟡 ยังไม่ตัดสินใจ |

## 6. หลักการป้องกันในอนาคต (control 8.9)
- **ยึด API ของระบบจริงเป็นหลักฐานสูงสุด** เสมอ (เช่น `list_edge_functions`, `execute_sql` ตรวจ ACL จริง)
  ไม่ใช่คำบอกเล่า/ไฟล์ config ในเครื่องเพียงอย่างเดียว — ไฟล์เหล่านั้น**อาจเป็นอาการของปัญหาเอง**
- หลัง GRANT/REVOKE บน production **ต้อง verify ด้วย query ตรวจ ACL จริงทันที** (`has_function_privilege`
  หรือดู `pg_proc.proacl`) — อย่าเชื่อว่า SQL รันแล้ว = ผลลัพธ์ตรงตามที่ตั้งใจเสมอไป (พบว่า `remove_member`
  ต้อง revoke จาก `anon` ตรงๆ เพราะมี direct grant ที่ไม่ได้มาจาก `public`)
- ก่อนแก้ไข production ตรง ให้ใช้ read-only query ยืนยันปัญหาก่อนเสมอ แล้วขอ confirm จากเจ้าของระบบก่อนรันจริง
