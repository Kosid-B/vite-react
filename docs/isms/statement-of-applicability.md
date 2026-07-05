# Statement of Applicability (SoA)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.3 d)**

| | |
|---|---|
| เวอร์ชัน | 1.1 (ร่าง — หมวด 8 ประเมินครบ 34/34 แล้ว) |
| วันที่ | 2026-07-05 |
| หมายเหตุ | SoA ฉบับสมบูรณ์ต้องครอบคลุม Annex A ทั้ง 93 controls — หมวด 8 (Technological) ครบแล้วทั้ง 34 ตัว หมวด 5/6/7 ยังเหลือบางส่วน |

**คำอธิบายสถานะ:** ✅ นำไปใช้แล้ว · 🟡 นำไปใช้บางส่วน/ต้องปรับปรุง · 🔴 นำไปใช้ (จำเป็น) แต่ยังไม่ดำเนินการ · ⚪ ไม่นำไปใช้ (พร้อมเหตุผล)

## หมวด 5 — Organizational

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 5.1 | นโยบายความมั่นคง | ใช่ | 🟡 | ร่าง [information-security-policy.md](information-security-policy.md) รออนุมัติ | — |
| 5.7 | Threat intelligence | ใช่ | 🔴 | ยังไม่สมัครรับ advisory ของผู้ให้บริการ | — |
| 5.9 | บัญชีสินทรัพย์สารสนเทศ | ใช่ | 🟡 | inventory เชิงเทคนิคใน `CLAUDE.md`/`config.ts` ยังไม่เป็นทะเบียนทางการ | — |
| 5.10 | การใช้สินทรัพย์อย่างเหมาะสม | ใช่ | 🟡 | เกี่ยวกับการจัดการคีย์ (ดู 8.24) | R1 |
| 5.15 | การควบคุมการเข้าถึง | ใช่ | 🟡 | RLS กันข้ามผู้เช่า + admin gate ด้วยอีเมล | R3 |
| 5.18 | สิทธิ์การเข้าถึง | ใช่ | 🟢 | สิทธิ์ผ่าน RLS/role; migration `0020` ตัดสิทธิ์ anon จาก RPC หลัก (applied prod) | R2 |
| 5.22 | การเฝ้าติดตามบริการผู้ส่งมอบ | ใช่ | 🔴 | ยังไม่มีการประเมิน/DPA กับ cloud 4 ราย | R4 |
| 5.23 | ความมั่นคงบริการ cloud | ใช่ | 🔴 | พึ่ง Cloudflare/Supabase/Anthropic โดยไม่มีเกณฑ์ | R4 |
| 5.30 | ICT readiness for BC | ใช่ | 🔴 | ไม่มี BC/DR plan | R5 |
| 5.34 | ความเป็นส่วนตัว/PII | ใช่ | 🟡 | RLS ป้องกันข้อมูลข้ามผู้เช่า แต่ไม่มี privacy policy/PDPA records | R4 |

## หมวด 6 — People

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน |
|---|---|---|---|---|
| 6.3 | ความตระหนัก/อบรม | ใช่ | 🔴 | ยังไม่มีการอบรม |
| 6.4 | กระบวนการทางวินัย | ใช่ | 🟡 | ระบุในนโยบาย ข้อ 5 |
| 6.7 | การทำงานระยะไกล | ใช่ | 🔴 | ยังไม่มีแนวปฏิบัติ remote working |
| 6.8 | การรายงานเหตุการณ์ | ใช่ | ✅ | [SECURITY.md](../../SECURITY.md) |

## หมวด 7 — Physical

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล |
|---|---|---|---|---|
| 7.x | มาตรการทางกายภาพ (14 controls) | บางส่วน | ⚪/🟡 | โครงสร้างพื้นฐานอยู่บน cloud → หลาย control โอนไปยังผู้ให้บริการ (อ้าง 5.23); พื้นที่สำนักงานประเมินแยก | — |

## หมวด 8 — Technological (ครบ 34/34 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 8.1 | User endpoint devices | ใช่ | 🔴 | ไม่มีนโยบายอุปกรณ์ปลายทางของทีมพัฒนา | — |
| 8.2 | Privileged access rights | ใช่ | ✅ | RPC เป็น SECURITY DEFINER + owner-check; migration `0020`–`0022` revoke anon จาก RPC หลักครบ, verified ผ่าน `has_function_privilege` บน production | R2, R12, R13 |
| 8.3 | Information access restriction | ใช่ | ✅ | RLS ทุกตาราง; storage policy `shop-images` จำกัด owner-only (migration `0023`); `lead_count()` ตรวจแล้วว่าตั้งใจเปิด anon (social-proof, คืนแค่ count) | R2, R10, R14 |
| 8.4 | Access to source code | ใช่ | 🟡 | Repo ส่วนตัวบน GitHub แต่ไม่มี CODEOWNERS/branch protection ยืนยันได้ | — |
| 8.5 | Secure authentication | ใช่ | 🟡 | Supabase Auth (password/magic link); ยังไม่เปิด MFA แอดมิน | R3 |
| 8.6 | Capacity management | ใช่ | 🔴 | ไม่มีการเฝ้าติดตาม capacity ของ Cloudflare Workers/Supabase | — |
| 8.7 | Protection against malware | ไม่ใช่ | ⚪ | สถาปัตยกรรม serverless (Cloudflare Workers/Supabase managed) ไม่มี malware surface แบบดั้งเดิม; endpoint ทีมพัฒนาประเมินแยกใน 8.1 | — |
| 8.8 | Management of technical vulnerabilities | ใช่ | ✅ | `npm audit --audit-level=high` ใน CI ทุก push/PR (`security-scan.yml`) | R6 |
| 8.9 | Configuration management | ใช่ | ✅ | แก้ R11 (config drift) ครบ — ยืนยัน production ด้วย Edge Functions API, บันทึกใน [environment-map.md](environment-map.md) | R11 |
| 8.10 | Information deletion | ใช่ | ✅ | ลบ workspace ผ่าน RLS `ws_delete` + cascade; ลบบัญชีผ่าน Edge Function `delete-account` | R10 |
| 8.11 | Data masking | ใช่ | 🔴 | ไม่มี data masking ใน log/error message | — |
| 8.12 | Data leakage prevention | ใช่ | 🔴 | ยังไม่มีการประเมิน DLP อย่างเป็นทางการ | R4 |
| 8.13 | Information backup | ใช่ | 🟡 | ยืนยันว่า production อยู่บน Free plan — **ไม่มี backup/PITR เลย**; ตัดสินใจอัปเกรด Pro แล้ว (2026-07-05) รอดำเนินการจริง | R5 |
| 8.14 | Redundancy | ใช่ | ✅ | Cloudflare Workers + Supabase managed = redundancy ระดับ platform (inherited) | — |
| 8.15 | Logging | ใช่ | 🟡 | Cloudflare/Supabase มี log แต่ไม่มี review เป็นรอบ | — |
| 8.16 | Monitoring activities | ใช่ | 🔴 | ยังไม่มี alerting เมื่อมีความผิดปกติ | — |
| 8.17 | Clock synchronization | ใช่ | ✅ | Cloudflare Workers/Supabase เป็น managed platform ใช้ NTP มาตรฐาน (inherited) | — |
| 8.18 | Privileged utility programs | ไม่ใช่ | ⚪ | ไม่มี OS-level utility ที่ทีมดูแลเอง (managed service ทั้งหมด) | — |
| 8.19 | Installation of software on operational systems | ใช่ | 🟡 | Deploy ผ่าน `wrangler deploy`/GitHub Actions แต่ไม่มี approval gate ก่อน deploy prod | — |
| 8.20 | Networks security | ไม่ใช่ | ⚪ | ไม่มี on-prem network — Cloudflare edge network จัดการให้ | — |
| 8.21 | Security of network services | ใช่ | ✅ | HTTPS/WSS ทุกช่องทาง (`agentClient.ts`, `src/server.ts`) | — |
| 8.22 | Segregation of networks | ไม่ใช่ | ⚪ | สถาปัตยกรรม serverless ไม่มี network segment แบบดั้งเดิม — แยกที่ RLS/tenant-level แทน (ดู 8.3) | — |
| 8.23 | Web filtering | ไม่ใช่ | ⚪ | ไม่ใช่ corporate network ที่ต้องกรอง web สำหรับพนักงาน | — |
| 8.24 | Cryptography / key mgmt | ใช่ | 🟡 | คีย์เป็น secret (wrangler/.env), ย้ายออก repo แล้ว **แต่ยังไม่ rotate** | R1 |
| 8.25 | Secure development lifecycle | ใช่ | ✅ | TS strict mode, ESLint (แก้ hooks violation แล้ว), Vitest, code review | — |
| 8.26 | Application security requirements | ใช่ | 🔴 | ไม่มีเอกสาร security requirement ต่อฟีเจอร์ใหม่อย่างเป็นทางการ | — |
| 8.27 | Secure system architecture and engineering principles | ใช่ | 🟡 | มี defense-in-depth บางส่วน (RLS + app-level) แต่ไม่มีเอกสารหลักการออกแบบรวม | — |
| 8.28 | Secure coding | ใช่ | ✅ | gitleaks secret scanning + `npm audit` ใน CI (`security-scan.yml`) | R7 |
| 8.29 | Security testing in development and acceptance | ใช่ | 🔴 | ไม่มี security test แยกจาก unit test (เช่น RLS bypass attempt) | — |
| 8.30 | Outsourced development | ไม่ใช่ | ⚪ | ไม่มีการจ้าง dev ภายนอก (เท่าที่ตรวจพบ) | — |
| 8.31 | Separation of dev/test/prod | ใช่ | 🔴 | ไม่มี Supabase project แยกสำหรับ dev/staging — `.env` local dev ต่อ production ตรง | R15 |
| 8.32 | Change management | ใช่ | 🟡 | มี git branch + PR workflow แต่ไม่มี CODEOWNERS/branch protection ยืนยันได้ | — |
| 8.33 | Test information | ไม่ใช่ | ⚪ | Seed data ที่พบ (`0018_tis_write_policies_and_seed.sql`) เป็น catalog data ไม่ใช่ PII จริง; จะเกี่ยวข้องเมื่อมี dev env แยก (8.31) | R15 |
| 8.34 | Protection during audit testing | ใช่ | 🔴 | ยังไม่เคยมี security audit/pentest เป็นทางการ, ไม่มีนโยบายกำหนดขอบเขต | — |

**สรุปหมวด 8:** ✅ 12 · 🟡 7 · 🔴 9 · ⚪ 6 (ครบ 34/34 controls)

## Controls ที่เหลือ (Annex A)
หมวด 5 (10/37), หมวด 6 (4/8), หมวด 7 (ประเมินแบบกลุ่ม 1/14) ยังไม่ครบ — ต้องเติมให้ครบ 93 ก่อนยื่นรับรอง
โดยพิจารณา "นำไปใช้/ไม่นำไปใช้" จากผลประเมินความเสี่ยง ([risk-register.md](risk-register.md)) พร้อมเหตุผลทุกข้อ (ข้อกำหนด 6.1.3 d–e)
