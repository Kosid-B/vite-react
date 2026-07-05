# ทะเบียนความเสี่ยง (Risk Register)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.2 / อ้าง ISO 27005**

| | |
|---|---|
| เวอร์ชัน | 1.0 (ร่าง) |
| วันที่ | 2026-07-03 |
| เจ้าของความเสี่ยง | _(ผู้บริหาร / IT Security)_ |

> **อัปเดต 2026-07-05:** production Supabase project ยืนยันแล้วด้วยหลักฐานระดับ API คือ `rsjbqmnvocvtveelselj`
> (ดูรายละเอียด/postmortem เต็มใน [environment-map.md](environment-map.md)) — สถานะ R2/R11/R12 ด้านล่างอ้างอิง
> การยืนยัน+แก้ไขบน production ตัวนี้โดยตรงแล้ว (ของเดิมที่เคย apply บน `waigsnxhrlwtiotspaim` ใช้ไม่ได้จริง)

## เกณฑ์ความเสี่ยง (Risk Criteria)
ระดับความเสี่ยง = **โอกาส (Likelihood 1–3) × ผลกระทบ (Impact 1–3)** → ต่ำ (1–2) / กลาง (3–4) / สูง (6–9)
การจัดการ: **Modify** (ใช้ control) · **Retain** (ยอมรับ) · **Avoid** (เลี่ยง) · **Share** (โอน/ประกัน)

## ทะเบียนความเสี่ยง

| ID | ความเสี่ยง (asset / threat / vulnerability) | CIA | L | I | ระดับ | การจัดการ | Control (Annex A) | เจ้าของ | สถานะ |
|---|---|---|---|---|---|---|---|---|---|
| **R1** | คีย์ API (Anthropic/Cloudflare/Resend) เคยเป็น plaintext ในโฟลเดอร์ repo และ **ยังไม่ rotate** → หากรั่วถูกนำไปใช้/คิดเงิน | C | 2 | 3 | 🔴 6 สูง | Modify | 8.24, 5.10 | IT Security | 🟡 ย้ายออก repo แล้ว, รอ rotate |
| **R2** | ฟังก์ชัน RPC ของ Supabase เปิด EXECUTE ให้ `anon` (PUBLIC) — ครอบคลุมฟังก์ชันจาก 0002/0003/0005 | C/I | 2 | 3 | 🔴 6 สูง | Modify | 8.2, 8.3 | IT Security | 🟢 **ปิดแล้วบน production จริง** (`rsjbqmnvocvtveelselj`) — ยืนยันด้วย `has_function_privilege` 2026-07-05 (⚠️ ที่เคย apply บน `waigsnxhrlwtiotspaim` ก่อนหน้านี้ใช้ไม่ได้จริง เพราะไม่ใช่ prod — ดู [environment-map.md](environment-map.md) §0) |
| **R3** | บัญชีแอดมินเดี่ยว (`support@b-tctraining.com`) **ไม่มี MFA** → ถูกยึดบัญชีเข้าถึงทุก workspace | C/I/A | 2 | 3 | 🔴 6 สูง | Modify | 8.5, 5.15 | ผู้บริหาร | 🔴 เปิด |
| **R4** | พึ่งพา cloud 4 ราย โดยไม่มีการประเมินผู้ส่งมอบ/DPA (Cloudflare, Supabase, Anthropic, Resend) | C/A | 2 | 2 | 🟡 4 กลาง | Modify/Share | 5.19, 5.22, 5.23 | IT Security | 🔴 เปิด |
| **R5** | ยืนยันแล้วว่า production อยู่บน **Supabase Free plan — ไม่มี backup/PITR ใดๆ เลย** (WAL archiving ที่พบเป็น infra ภายในของ Supabase ไม่ใช่ฟีเจอร์ลูกค้า) → ข้อมูลลูกค้าจริงกู้คืนไม่ได้ถ้าสูญ | A | 2 | 3 | 🔴 6 สูง | Modify | 8.13, 5.30 | เจ้าของระบบ | 🟡 **ตัดสินใจแล้ว** (2026-07-05) — จะอัปเกรด Pro plan ($25/เดือน) เพื่อเปิด daily backup + PITR add-on; รอดำเนินการจริงใน dashboard + ทดสอบ restore |
| **R6** | dependency มีช่องโหว่ (npm audit: js-yaml DoS, low/moderate) และไม่มีรอบตรวจ | I/A | 2 | 1 | 🟡 2 ต่ำ | Modify | 8.8 | ผู้พัฒนา | 🟢 CI audit เพิ่มแล้ว |
| **R7** | คีย์ลับใหม่หลุดเข้า git ในอนาคต (ไม่มี guard อัตโนมัติ) | C | 2 | 3 | 🔴 6 สูง | Modify | 8.28 | ผู้พัฒนา | 🟢 gitleaks CI เพิ่มแล้ว |
| **R8** | AI chat history ไม่แยกผู้เช่า — Durable Object instance `default` ร่วมกันทุกผู้ใช้ → `this.history` ปนข้าม workspace | C | 2 | 3 | 🔴 6 สูง | Modify | 8.3 / 27040 §8 multi-tenancy | ผู้พัฒนา | 🟢 แก้แล้ว (agentId ต่อ workspace — รอ verify บน Cloudflare deploy) |
| **R9** | Data remanence — `localStorage['cjux2']` (แผนธุรกิจ) ไม่ถูกล้างตอน logout บนเครื่องที่ใช้ร่วม | C | 2 | 2 | 🟡 4 กลาง | Modify | 8.10 / 27040 sanitization | ผู้พัฒนา | 🟢 แก้แล้ว (signOut ล้าง + reset) |
| **R10** | ไม่มี flow ลบ workspace/account จากฝั่งผู้ใช้ และ DO chat history ไม่ถูก cascade ลบ → PDPA right-to-erasure | C | 1 | 3 | 🟡 3 กลาง | Modify | 8.10, 7.14, 5.34 | IT Security | 🟢 **ปิดแล้วบน main** — ลบ workspace ผ่าน RLS policy `ws_delete` (owner-only) + FK cascade, wired ใน [Team.tsx](../../src/pages/Team.tsx); ลบบัญชีผ่าน Edge Function `delete-account` (service role, cascade ครบ) — verified จากโค้ดจริง 2026-07-03 |
| **R11** | **Config drift** — เอกสาร/CLI/ผู้ใช้เข้าใจผิดว่า production = `waigsnxhrlwtiotspaim` (จริงคือ `rsjbqmnvocvtveelselj`) → เคยทำให้แอปจริง**แชตค้าง** (ยิง request ผิด project) | I/A | 2 | 3 | 🔴 6 สูง | Modify | 8.9 | IT Security | 🟢 **ปิดแล้ว** — ยืนยัน prod จริงด้วย Edge Functions API (8 functions ACTIVE), แก้ `.env`/CLI link/`CLAUDE.md`/`COMMAND.md` ครบ, เอกสารเต็มใน [environment-map.md](environment-map.md) |
| **R12** | ฟังก์ชัน `admin_skill_adoption()` (0007_skill_stats.sql) grant execute ให้ `authenticated` แต่ไม่เคย revoke จาก `public` — เจอจากการตรวจ migration ทั้งหมด (0001–0019) บน main | C | 1 | 2 | 🟡 2 ต่ำ | Modify | 8.2, 8.3 | IT Security | 🟢 **ปิดแล้วบน production จริง** (`rsjbqmnvocvtveelselj`) — ยืนยัน 2026-07-05 (การ apply ก่อนหน้าบน `waigsnxhrlwtiotspaim` ใช้ไม่ได้จริง) |
| **R13** | Production incident: มีคนพยายาม revoke สิทธิ์ `public` บน `rsjbqmnvocvtveelselj` (คล้าย R2/R12) แต่ลืม grant กลับ `authenticated` → **`ensure_default_workspace`, `invite_member`, `list_members`, `set_member_role` ใช้งานไม่ได้เลยแม้แต่ผู้ใช้จริง** (หน้าทีม/สมาชิกพัง); และ `remove_member` ยังเปิดให้ `anon` เรียกได้ (grant ตรงเจาะจง ไม่ผ่าน public) | I/A | 2 | 3 | 🔴 6 สูง | Modify | 8.2, 8.3 | IT Security | 🟢 **แก้แล้ว 2026-07-05** ผ่าน MCP `execute_sql` ตรง — verify ครบ 8 ฟังก์ชัน `anon=false, authenticated=true` |
| **R14** | Storage bucket `shop-images` เปิด public list ไฟล์ได้ทั้งหมด (broad SELECT policy บน `storage.objects`) — พบจาก Supabase security advisor บน production จริง | C | 2 | 1 | 🟡 2 ต่ำ | Modify | 8.3 / 27040 object storage | ผู้พัฒนา | 🟢 **ปิดแล้ว 2026-07-05** — migration `0023` จำกัด SELECT ให้ owner-only (`is_member`) ตรงรูปแบบ upload/delete เดิม; ยืนยันไม่กระทบฟีเจอร์ (frontend ใช้แค่ `getPublicUrl()` ไม่มี `.list()`); Supabase security advisor **0 findings** หลังแก้ |
| **R15** | ไม่มี Supabase project แยกสำหรับ dev/staging — `.env` local dev ต่อ production ตรง (พบระหว่าง Gap Analysis หมวด 8 — control 8.31) → เพิ่มความเสี่ยงที่การทดสอบ/debug จะกระทบข้อมูลจริงโดยตรง ส่วนหนึ่งอธิบายว่าทำไม R13 เกิดขึ้นได้ | I/A | 2 | 3 | 🔴 6 สูง | Modify | 8.31 | เจ้าของระบบ / ผู้พัฒนา | 🔴 เปิด — ต้องสร้าง Supabase project แยกสำหรับ dev/staging |
| **R16** | ไม่มีกระบวนการรับมือเหตุการณ์ความมั่นคงอย่างเป็นทางการ (incident response) — พบระหว่าง Gap Analysis หมวด 5 (control 5.24–5.28) แม้เพิ่งเกิดเหตุจริง (R13) และแก้ได้ผลดี แต่ทำแบบ ad-hoc ไม่มี playbook/ขั้นตอนที่ทำซ้ำได้ | I/A | 2 | 2 | 🟡 4 กลาง | Modify | 5.24, 5.25, 5.26, 5.28 | IT Security | 🔴 เปิด — ต้องเขียน incident response playbook (แจ้งเหตุ → ประเมิน → ตอบสนอง → เก็บหลักฐาน → เรียนรู้) |

## ความเสี่ยงคงเหลือ (Residual Risk)
หลังดำเนินมาตรการ ระดับความเสี่ยงคงเหลือต้องได้รับการยอมรับและอนุมัติโดย **เจ้าของความเสี่ยง** (ข้อ 8.3)
R6, R7 ลดระดับแล้วจาก control ใหม่ในรอบนี้ · R1, R3, R4, R5 รอปิดตามแผนปฏิบัติระยะ 1 (ต้องทำใน dashboard/นโยบาย ไม่ใช่โค้ด)

**สถานะ ณ 2026-07-05:** ปิดแล้ว 12/16 (R15 จาก Gap Analysis หมวด 8, R16 จาก Gap Analysis หมวด 5) · Supabase security advisor บน production (`rsjbqmnvocvtveelselj`) แสดง **0 findings**
