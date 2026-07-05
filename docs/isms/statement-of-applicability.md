# Statement of Applicability (SoA)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.3 d)**

| | |
|---|---|
| เวอร์ชัน | 1.0 (ร่าง — controls ที่ประเมินแล้ว) |
| วันที่ | 2026-07-03 |
| หมายเหตุ | SoA ฉบับสมบูรณ์ต้องครอบคลุม Annex A ทั้ง 93 controls — ตารางนี้คือชุดที่ประเมินแล้วในรอบแรก ที่เหลือระบุเป็น "รอประเมิน" |

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

## หมวด 8 — Technological

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 8.2 | สิทธิ์การเข้าถึงระดับสูง | ใช่ | 🟢 | RPC เป็น SECURITY DEFINER + owner-check; `0020` revoke anon (applied prod); `0021` แก้ `admin_skill_adoption()` เพิ่มเติม | R2, R12 |
| 8.3 | การจำกัดการเข้าถึงข้อมูล | ใช่ | 🟡 | RLS ทุกตาราง (workspaces/members/state); `ws_delete` policy คุม owner-only delete; `lead_count()` ตรวจแล้วว่าตั้งใจเปิด anon (social-proof, คืนแค่ count) | R2, R10 |
| 8.5 | Secure authentication | ใช่ | 🟡 | Supabase auth; **ยังไม่เปิด MFA แอดมิน** | R3 |
| 8.8 | การจัดการช่องโหว่ทางเทคนิค | ใช่ | 🟡 | `npm audit` ใน CI (`security-scan.yml`) | R6 |
| 8.9 | Configuration management | ใช่ | 🟡 | `wrangler.jsonc`/`tsconfig`/CI ใน git | — |
| 8.13 | Backup | ใช่ | 🔴 | รอยืนยัน Supabase PITR + ทดสอบ restore | R5 |
| 8.15 | Logging | ใช่ | 🟡 | Cloudflare/Supabase มี log แต่ไม่มี review เป็นรอบ | — |
| 8.16 | Monitoring activities | ใช่ | 🔴 | ยังไม่มี alerting | — |
| 8.24 | Cryptography / key mgmt | ใช่ | 🟡 | คีย์เป็น secret (wrangler/.env), ย้ายออก repo แล้ว **แต่ยังไม่ rotate** | R1 |
| 8.25 | Secure development lifecycle | ใช่ | 🟡 | TS strict, ESLint, Vitest, code review | — |
| 8.28 | Secure coding | ใช่ | ✅ | gitleaks secret scanning + audit ใน CI (`security-scan.yml`) | R7 |
| 8.12 | Data leakage prevention | ใช่ | 🔴 | ยังไม่ประเมิน | — |

## Controls ที่เหลือ (Annex A)
Controls อื่นใน Annex A ที่ยังไม่อยู่ในตารางนี้ = **"รอประเมิน"** ต้องเติมให้ครบ 93 ก่อนยื่นรับรอง
โดยพิจารณา "นำไปใช้/ไม่นำไปใช้" จากผลประเมินความเสี่ยง ([risk-register.md](risk-register.md)) พร้อมเหตุผลทุกข้อ (ข้อกำหนด 6.1.3 d–e)
