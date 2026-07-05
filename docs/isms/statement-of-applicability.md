# Statement of Applicability (SoA)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.3 d)**

| | |
|---|---|
| เวอร์ชัน | 1.3 (ร่าง — หมวด 5, 6, 8 ประเมินครบแล้ว) |
| วันที่ | 2026-07-05 |
| หมายเหตุ | SoA ฉบับสมบูรณ์ต้องครอบคลุม Annex A ทั้ง 93 controls — หมวด 5 (37/37), หมวด 6 (8/8), หมวด 8 (34/34) ครบแล้ว รวม 79/93; เหลือแค่หมวด 7 (ประเมินแบบกลุ่ม 1/14) |

**คำอธิบายสถานะ:** ✅ นำไปใช้แล้ว · 🟡 นำไปใช้บางส่วน/ต้องปรับปรุง · 🔴 นำไปใช้ (จำเป็น) แต่ยังไม่ดำเนินการ · ⚪ ไม่นำไปใช้ (พร้อมเหตุผล)

## หมวด 5 — Organizational (ครบ 37/37 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 5.1 | Policies for information security | ใช่ | 🟡 | ร่าง [information-security-policy.md](information-security-policy.md) รออนุมัติผู้บริหาร | — |
| 5.2 | Information security roles and responsibilities | ใช่ | 🟡 | นโยบาย § 4 กำหนดบทบาทไว้ (IT Security/ผู้บริหาร/ผู้พัฒนา) แต่ยังไม่สื่อสารทั้งองค์กรอย่างเป็นทางการ | — |
| 5.3 | Segregation of duties | ใช่ | 🔴 | ทีมเล็ก — คนเดียวมักทำได้ทั้งเขียนโค้ด/deploy/ดูแล DB ไม่มีการแบ่งแยกหน้าที่ | — |
| 5.4 | Management responsibilities | ใช่ | 🔴 | ยังไม่มีความมุ่งมั่นที่เป็นลายลักษณ์อักษรจากผู้บริหาร (นโยบายยังรออนุมัติ) | — |
| 5.5 | Contact with authorities | ใช่ | 🔴 | ไม่มีรายชื่อ/ช่องทางติดต่อหน่วยงานกำกับ (เช่น สคส./PDPA) ที่เตรียมไว้ | — |
| 5.6 | Contact with special interest groups | ใช่ | 🔴 | ไม่มีการติดตามกลุ่ม/ชุมชนความมั่นคงปลอดภัยอย่างเป็นทางการ | — |
| 5.7 | Threat intelligence | ใช่ | 🔴 | ยังไม่สมัครรับ advisory ของผู้ให้บริการ | — |
| 5.8 | Information security in project management | ใช่ | 🔴 | ไม่มี security requirement ผนวกเข้ากระบวนการวางแผนฟีเจอร์ใหม่ (ดู 8.26) | — |
| 5.9 | Inventory of information and other associated assets | ใช่ | 🟡 | inventory เชิงเทคนิคใน `CLAUDE.md`/`config.ts` ยังไม่เป็นทะเบียนทางการ | — |
| 5.10 | Acceptable use of assets | ใช่ | 🟡 | เกี่ยวกับการจัดการคีย์ (ดู 8.24) | R1 |
| 5.11 | Return of assets | ใช่ | 🔴 | ไม่มีกระบวนการคืนทรัพย์สิน/เพิกถอนสิทธิ์เมื่อพ้นสภาพ (ทีมเล็ก แต่ควรมีไว้ก่อนขยายทีม) | — |
| 5.12 | Classification of information | ใช่ | 🔴 | ไม่มีการจัดชั้นความลับข้อมูล (public/internal/confidential) | — |
| 5.13 | Labelling of information | ใช่ | 🔴 | ขึ้นกับ 5.12 ที่ยังไม่มี — จึงยังไม่มีการติดป้ายชั้นความลับ | — |
| 5.14 | Information transfer | ใช่ | 🟡 | ส่งผ่าน HTTPS/WSS ทุกช่องทาง (ทางเทคนิคทำแล้ว) แต่ไม่มีนโยบายการส่งข้อมูลเป็นลายลักษณ์อักษร | — |
| 5.15 | Access control | ใช่ | 🟡 | RLS กันข้ามผู้เช่า + admin gate ด้วยอีเมล | R3 |
| 5.16 | Identity management | ใช่ | 🟡 | Supabase Auth จัดการ identity + `workspace_members` แต่ไม่มีนโยบาย lifecycle เป็นทางการ | — |
| 5.17 | Authentication information | ใช่ | 🟡 | รหัสผ่านจัดการโดย Supabase Auth (hashed) + magic link; **ไม่มี MFA** | R3 |
| 5.18 | Access rights | ใช่ | ✅ | สิทธิ์ผ่าน RLS/role; migration `0020`–`0022` ตัดสิทธิ์ anon จาก RPC หลักครบ + แก้ incident สิทธิ์หาย (R13), verified บน production | R2, R12, R13 |
| 5.19 | Information security in supplier relationships | ใช่ | 🔴 | ไม่มีการประเมินความมั่นคงของผู้ส่งมอบ (Cloudflare/Supabase/Anthropic/Resend) อย่างเป็นทางการ | R4 |
| 5.20 | Addressing security within supplier agreements | ใช่ | 🔴 | ไม่มี DPA/ข้อตกลงความมั่นคงที่ทบทวนแล้วกับผู้ส่งมอบ | R4 |
| 5.21 | Managing security in the ICT supply chain | ใช่ | 🔴 | ไม่มีการประเมินความเสี่ยง supply chain (เช่น dependency ของบุคคลที่สาม) อย่างเป็นทางการ นอกเหนือ `npm audit` (8.8 เชิงเทคนิค) | — |
| 5.22 | Monitoring, review and change management of supplier services | ใช่ | 🔴 | ยังไม่มีการประเมิน/ทบทวนบริการ cloud 4 รายเป็นรอบ | R4 |
| 5.23 | Information security for use of cloud services | ใช่ | 🔴 | พึ่ง Cloudflare/Supabase/Anthropic โดยไม่มีเกณฑ์การประเมินที่เป็นทางการ | R4 |
| 5.24 | Incident management planning and preparation | ใช่ | 🔴 | ไม่มี incident response playbook — [SECURITY.md](../../SECURITY.md) มีแค่ช่องทางรายงาน ไม่มีขั้นตอนตอบสนอง | R16 |
| 5.25 | Assessment and decision on security events | ใช่ | 🔴 | ไม่มีเกณฑ์ประเมินความรุนแรง/triage เหตุการณ์ที่เป็นทางการ | R16 |
| 5.26 | Response to information security incidents | ใช่ | 🟡 | เหตุการณ์จริง (R13) ถูกแก้ได้ผลดีในทางปฏิบัติ แต่ไม่มีขั้นตอนที่เขียนไว้ล่วงหน้า/ทำซ้ำได้ | R16 |
| 5.27 | Learning from information security incidents | ใช่ | 🟡 | มีการบันทึก postmortem ไม่เป็นทางการใน [environment-map.md](environment-map.md) §0 แต่ไม่มีกระบวนการ lessons-learned อย่างเป็นทางการ | R16 |
| 5.28 | Collection of evidence | ใช่ | 🔴 | ไม่มีขั้นตอนเก็บหลักฐานเหตุการณ์ที่เป็นทางการ (ทำแบบ ad-hoc ผ่าน query ตรวจสอบ) | R16 |
| 5.29 | Information security during disruption | ใช่ | 🔴 | ไม่มีแผนรักษาความมั่นคงระหว่างเหตุขัดข้อง/ภัยพิบัติ | — |
| 5.30 | ICT readiness for business continuity | ใช่ | 🟡 | ยืนยันแล้วว่า production ไม่มี backup (Free plan) — ตัดสินใจอัปเกรด Pro แล้ว (2026-07-05) รอดำเนินการจริง + ยังไม่มีแผน DR ที่เป็นทางการ | R5 |
| 5.31 | Legal, statutory, regulatory and contractual requirements | ใช่ | 🔴 | ไม่มีทะเบียนข้อกำหนดกฎหมาย/สัญญาที่ต้องปฏิบัติตาม (เช่น PDPA) อย่างเป็นทางการ | — |
| 5.32 | Intellectual property rights | ใช่ | 🔴 | ไม่มีนโยบายทรัพย์สินทางปัญญา (เช่น การใช้ output จาก Anthropic API, license ของ dependency) | — |
| 5.33 | Protection of records | ใช่ | 🟡 | Supabase managed service ให้ durability ระดับหนึ่ง แต่ไม่มีนโยบาย retention/protection ของบันทึกที่เป็นทางการ | — |
| 5.34 | Privacy and protection of PII | ใช่ | 🟡 | RLS ป้องกันข้อมูลข้ามผู้เช่า แต่ไม่มี privacy policy/PDPA records ที่เป็นทางการ | R4 |
| 5.35 | Independent review of information security | ใช่ | 🔴 | ยังไม่เคยมีการตรวจประเมิน ISMS โดยอิสระ/บุคคลที่สาม | — |
| 5.36 | Compliance with policies and standards | ใช่ | 🔴 | ไม่มีกระบวนการตรวจสอบว่าปฏิบัติตามนโยบายที่ตั้งไว้จริงเป็นรอบ | — |
| 5.37 | Documented operating procedures | ใช่ | 🟡 | มีเอกสารทางเทคนิค (`CLAUDE.md`, `COMMAND.md`, `DEPLOY.md`) ทำหน้าที่เป็น procedure โดยพฤตินัย แต่ไม่ได้จัดทำในรูปแบบ ISMS operating procedure อย่างเป็นทางการ | — |

**สรุปหมวด 5:** ✅ 1 · 🟡 14 · 🔴 22 (ครบ 37/37 controls)

## หมวด 6 — People (ครบ 8/8 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 6.1 | Screening | ใช่ | 🔴 | ไม่มีกระบวนการคัดกรองก่อนจ้างที่เป็นทางการ (ทีมเล็ก จ้างแบบไม่มีเอกสาร) | — |
| 6.2 | Terms and conditions of employment | ใช่ | 🔴 | สัญญาจ้าง/ข้อตกลงยังไม่ระบุความรับผิดชอบด้านความมั่นคงสารสนเทศชัดเจน | — |
| 6.3 | Information security awareness, education and training | ใช่ | 🔴 | ยังไม่มีการอบรม | — |
| 6.4 | Disciplinary process | ใช่ | 🟡 | ระบุในนโยบาย [information-security-policy.md](information-security-policy.md) § 5 แต่ยังไม่เคยบังคับใช้จริง | — |
| 6.5 | Responsibilities after termination or change of employment | ใช่ | 🔴 | ไม่มีกระบวนการเพิกถอนสิทธิ์/คืนทรัพย์สินหลังพ้นสภาพ (เชื่อมโยง 5.11 ที่ก็ยังไม่มีเช่นกัน) | — |
| 6.6 | Confidentiality or non-disclosure agreements | ใช่ | 🔴 | ไม่มี NDA เป็นทางการกับทีมงาน/ผู้รับเหมา | — |
| 6.7 | Remote working | ใช่ | 🔴 | ยังไม่มีแนวปฏิบัติ remote working | — |
| 6.8 | Information security event reporting | ใช่ | ✅ | ช่องทางรายงานชัดเจนใน [SECURITY.md](../../SECURITY.md) | — |

**สรุปหมวด 6:** ✅ 1 · 🟡 1 · 🔴 6 (ครบ 8/8 controls)

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
เหลือแค่หมวด 7 (Physical — ประเมินแบบกลุ่ม 1/14) ที่ยังไม่ได้แยกประเมินรายตัว — ต้องเติมให้ครบ 93 ก่อนยื่นรับรอง
โดยพิจารณา "นำไปใช้/ไม่นำไปใช้" จากผลประเมินความเสี่ยง ([risk-register.md](risk-register.md)) พร้อมเหตุผลทุกข้อ (ข้อกำหนด 6.1.3 d–e)
