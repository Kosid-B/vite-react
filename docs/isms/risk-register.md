# ทะเบียนความเสี่ยง (Risk Register)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.2 / อ้าง ISO 27005**

| | |
|---|---|
| เวอร์ชัน | 1.0 (ร่าง) |
| วันที่ | 2026-07-03 |
| เจ้าของความเสี่ยง | _(ผู้บริหาร / IT Security)_ |

> **หมายเหตุสถานะเทียบ main:** R8 (DO tenant isolation), R9 (localStorage clear), R10 (ลบ workspace/บัญชี)
> มีการ implement บน `main` แล้วผ่าน PR #52 — PR นี้เพิ่ม **governance layer** (เอกสาร ISMS/27040, gitleaks CI,
> SECURITY.md) + **migration hardening `0020`** (revoke anon EXECUTE ซึ่ง main ยังไม่มี) ช่องความเสี่ยงด้านล่าง
> บางส่วนอ้างการ implement จากสายงานคู่ขนาน — ให้ยึดโค้ดบน main เป็นจริง สถานะที่นี่ใช้ติดตามเชิงบริหาร

## เกณฑ์ความเสี่ยง (Risk Criteria)
ระดับความเสี่ยง = **โอกาส (Likelihood 1–3) × ผลกระทบ (Impact 1–3)** → ต่ำ (1–2) / กลาง (3–4) / สูง (6–9)
การจัดการ: **Modify** (ใช้ control) · **Retain** (ยอมรับ) · **Avoid** (เลี่ยง) · **Share** (โอน/ประกัน)

## ทะเบียนความเสี่ยง

| ID | ความเสี่ยง (asset / threat / vulnerability) | CIA | L | I | ระดับ | การจัดการ | Control (Annex A) | เจ้าของ | สถานะ |
|---|---|---|---|---|---|---|---|---|---|
| **R1** | คีย์ API (Anthropic/Cloudflare/Resend) เคยเป็น plaintext ในโฟลเดอร์ repo และ **ยังไม่ rotate** → หากรั่วถูกนำไปใช้/คิดเงิน | C | 2 | 3 | 🔴 6 สูง | Modify | 8.24, 5.10 | IT Security | 🟡 ย้ายออก repo แล้ว, รอ rotate |
| **R2** | ฟังก์ชัน RPC ของ Supabase เปิด EXECUTE ให้ `anon` (PUBLIC) — ครอบคลุมฟังก์ชันจาก 0002/0003/0005 | C/I | 2 | 3 | 🔴 6 สูง | Modify | 8.2, 8.3 | IT Security | 🟢 **ปิดแล้ว** — migration `0020` apply prod (`waigsnxhrlwtiotspaim`) 2026-07-03 |
| **R3** | บัญชีแอดมินเดี่ยว (`support@b-tctraining.com`) **ไม่มี MFA** → ถูกยึดบัญชีเข้าถึงทุก workspace | C/I/A | 2 | 3 | 🔴 6 สูง | Modify | 8.5, 5.15 | ผู้บริหาร | 🔴 เปิด |
| **R4** | พึ่งพา cloud 4 ราย โดยไม่มีการประเมินผู้ส่งมอบ/DPA (Cloudflare, Supabase, Anthropic, Resend) | C/A | 2 | 2 | 🟡 4 กลาง | Modify/Share | 5.19, 5.22, 5.23 | IT Security | 🔴 เปิด |
| **R5** | ไม่ยืนยันการเปิด backup/PITR ของ Supabase และไม่มีแผน DR → ข้อมูลลูกค้าสูญ | A | 2 | 3 | 🔴 6 สูง | Modify | 8.13, 5.30 | IT Security | 🔴 เปิด |
| **R6** | dependency มีช่องโหว่ (npm audit: js-yaml DoS, low/moderate) และไม่มีรอบตรวจ | I/A | 2 | 1 | 🟡 2 ต่ำ | Modify | 8.8 | ผู้พัฒนา | 🟢 CI audit เพิ่มแล้ว |
| **R7** | คีย์ลับใหม่หลุดเข้า git ในอนาคต (ไม่มี guard อัตโนมัติ) | C | 2 | 3 | 🔴 6 สูง | Modify | 8.28 | ผู้พัฒนา | 🟢 gitleaks CI เพิ่มแล้ว |
| **R8** | AI chat history ไม่แยกผู้เช่า — Durable Object instance `default` ร่วมกันทุกผู้ใช้ → `this.history` ปนข้าม workspace | C | 2 | 3 | 🔴 6 สูง | Modify | 8.3 / 27040 §8 multi-tenancy | ผู้พัฒนา | 🟢 แก้แล้ว (agentId ต่อ workspace — รอ verify บน Cloudflare deploy) |
| **R9** | Data remanence — `localStorage['cjux2']` (แผนธุรกิจ) ไม่ถูกล้างตอน logout บนเครื่องที่ใช้ร่วม | C | 2 | 2 | 🟡 4 กลาง | Modify | 8.10 / 27040 sanitization | ผู้พัฒนา | 🟢 แก้แล้ว (signOut ล้าง + reset) |
| **R10** | ไม่มี flow ลบ workspace/account จากฝั่งผู้ใช้ และ DO chat history ไม่ถูก cascade ลบ → PDPA right-to-erasure | C | 1 | 3 | 🟡 3 กลาง | Modify | 8.10, 7.14, 5.34 | IT Security | 🟢 **ปิดแล้วบน main** — ลบ workspace ผ่าน RLS policy `ws_delete` (owner-only) + FK cascade, wired ใน [Team.tsx](../../src/pages/Team.tsx); ลบบัญชีผ่าน Edge Function `delete-account` (service role, cascade ครบ) — verified จากโค้ดจริง 2026-07-03 |
| **R11** | **Config drift** — `.env` prod ชี้ `waigsnxhrlwtiotspaim` แต่ MCP/งานพัฒนาอยู่คนละ ref (`rsjbqmnvocvtveelselj`) + local repo ไม่ sync migration | I/A | 2 | 2 | 🟡 4 กลาง | Modify | 8.9, 8.32 | IT Security | 🔴 เปิด — ยืนยันว่า prod = waigsnxhrlwtiotspaim, ต้องจัด environment map ให้ชัด |
| **R12** | ฟังก์ชัน `admin_skill_adoption()` (0007_skill_stats.sql) grant execute ให้ `authenticated` แต่ไม่เคย revoke จาก `public` — เจอจากการตรวจ migration ทั้งหมด (0001–0019) บน main | C | 1 | 2 | 🟡 2 ต่ำ | Modify | 8.2, 8.3 | IT Security | 🟢 แก้แล้ว — migration `0021` (ผลกระทบจริงต่ำ: ฟังก์ชันมี `is_app_admin()` guard ภายในอยู่แล้ว, anon ได้แค่ `forbidden`) |

## ความเสี่ยงคงเหลือ (Residual Risk)
หลังดำเนินมาตรการ ระดับความเสี่ยงคงเหลือต้องได้รับการยอมรับและอนุมัติโดย **เจ้าของความเสี่ยง** (ข้อ 8.3)
R6, R7 ลดระดับแล้วจาก control ใหม่ในรอบนี้ · R1–R5 รอปิดตามแผนปฏิบัติระยะ 1
