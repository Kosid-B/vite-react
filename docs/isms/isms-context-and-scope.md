# บริบทองค์กรและขอบเขตระบบ ISMS
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อกำหนด 4 (Context of the Organization)**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ผู้จัดทำ | IT Security |
| อนุมัติโดย | ผู้บริหารสูงสุด (ดู [management-commitment.pdf](management-commitment.pdf)) |
| ทบทวน | ทุก 12 เดือน หรือเมื่อบริบท/ขอบเขตเปลี่ยน |

> เอกสารนี้เป็น **documented information บังคับ** ตามข้อ 4.3 และเป็นฐานของการประเมินความเสี่ยง (6.1) และ SoA (6.1.3)

## 4.1 การเข้าใจองค์กรและบริบท

**องค์กร:** ธุรกิจ SaaS สัญชาติไทย "บริษัท AI อัตโนมัติ" (CEO AI Thailand) — แพลตฟอร์มช่วยธุรกิจใช้ AI/agent อัตโนมัติ
สถาปัตยกรรม cloud-first (Vite+React frontend บน Cloudflare Workers + Supabase backend + Anthropic Claude API)

**ประเด็นภายใน (Internal issues):**
| ประเด็น | ผลต่อความมั่นคงสารสนเทศ |
|---|---|
| ทีมขนาดเล็ก (ผู้ปฏิบัติงานหลักคนเดียว) | single point of failure, ข้อจำกัด segregation of duties (5.3) — ดู [[R18]] |
| ทรัพยากร/งบจำกัด | ต้องเลือก control ที่คุ้มค่า, พึ่ง managed cloud |
| พัฒนาเร็ว (rapid iteration) | เสี่ยง config drift (ดู [[R11]]/[[R19]]) → ต้องมี change/config management |
| ผลิตภัณฑ์แยก TIS Automate | ต้องกันข้อมูล/สิทธิ์ข้ามผลิตภัณฑ์ (นอกขอบเขตนี้) |

**ประเด็นภายนอก (External issues):**
| ประเด็น | ผลต่อความมั่นคงสารสนเทศ |
|---|---|
| กฎหมายไทย: PDPA, พ.ร.บ.คอมพิวเตอร์ | ต้องคุ้มครอง PII + เก็บ log (ดู [legal-compliance-register.md](legal-compliance-register.md)) |
| พึ่งพา cloud provider หลายราย | ความเสี่ยง supplier/supply chain (ดู [[R4]], [supplier-register.md](supplier-register.md)) |
| ตลาด SaaS/AI แข่งขันสูง + เป็นแบรนด์ใหม่ | ความเชื่อมั่นลูกค้า (trust) เป็นปัจจัยความอยู่รอด — เหตุการณ์ข้อมูลรั่ว = กระทบธุรกิจรุนแรง |
| ภัยคุกคามไซเบอร์ต่อ SaaS/API | credential theft, API abuse (เจอจริง — [[R20]] open proxy), RLS bypass |

## 4.2 ความต้องการและความคาดหวังของผู้มีส่วนได้เสีย (Interested Parties)

| ผู้มีส่วนได้เสีย | ความคาดหวังหลัก | มาตรการที่ตอบสนอง |
|---|---|---|
| **ลูกค้า/ผู้ใช้** | ข้อมูลปลอดภัย, ระบบพร้อมใช้, ความเป็นส่วนตัว (PDPA) | RLS แยกผู้เช่า, backup (8.13), เข้ารหัส in-transit, สิทธิ์ลบข้อมูล (8.10) |
| **ผู้บริหาร/เจ้าของ (โฆษิต แก้วเต่า)** | ความต่อเนื่องธุรกิจ, ชื่อเสียง, ต้นทุนเหมาะสม | ISMS, risk management, DR/backup |
| **หน่วยงานกำกับ** (สคส./PDPA) | ปฏิบัติตามกฎหมายคุ้มครองข้อมูล | privacy policy (กำลังทำ), RoPA, DPA (R4) |
| **ผู้ให้บริการ cloud** (Cloudflare/Supabase/Anthropic/Resend) | ปฏิบัติตาม ToS/usage terms | ไม่ใช้ผิดเงื่อนไข, จัดการ secret ปลอดภัย |
| **พนักงาน/ผู้รับเหมาในอนาคต** | สภาพแวดล้อมทำงานปลอดภัย, ความชัดเจนหน้าที่ | HR security terms + NDA (6.2/6.6) |
| **พันธมิตร/ผู้ลงทุน (ถ้ามี)** | ความน่าเชื่อถือด้านความมั่นคง | เตรียมความพร้อมสู่ ISO 27001 |

## 4.3 ขอบเขตระบบ ISMS (Scope) — **บังคับ**

### อยู่ในขอบเขต (In scope)
- **แพลตฟอร์ม CEO AI Thailand** (production): frontend (Cloudflare Workers, โดเมน `ceoaithailand.org`) + backend
- **Supabase production project `waigsnxhrlwtiotspaim`** (Pro plan, org `bgvyelbcbxhzzfrzuqnh`) — ฐานข้อมูล, Auth, Edge Functions, Storage
- **บริการ cloud สนับสนุน** ที่ประมวลผล/เก็บข้อมูลของระบบ: Cloudflare (Workers/DNS/CDN), Anthropic (Claude API), Resend (email), Serper (search)
- **ข้อมูลที่ประมวลผล:** ข้อมูลผู้ใช้/บัญชี (email, auth), ข้อมูลธุรกิจในแอป, หน้าร้าน/RFQ/ออเดอร์, ข้อมูลการชำระเงิน (ผ่าน gateway), AI chat history
- **อุปกรณ์ปลายทางหลัก:** โน้ตบุ๊กของผู้ปฏิบัติงานที่เก็บ source code/credential (ดู [endpoint-device-policy.md](endpoint-device-policy.md))
- **กระบวนการ:** พัฒนา/deploy, จัดการสิทธิ์เข้าถึง, จัดการ credential, รับมือเหตุการณ์, backup/กู้คืน

### นอกขอบเขต (Out of scope) พร้อมเหตุผล
| รายการ | เหตุผล |
|---|---|
| **TIS Automate** (project `galtbbkcddugnsfkgyqm`) | ผลิตภัณฑ์แยกสมบูรณ์ คนละ Supabase project — จะมี ISMS scope ของตัวเองเมื่อพัฒนาจริง |
| **โปรเจกต์ `rsjbqmnvocvtveelselj`** (Vercel-free) | ไม่ใช่ production จริง (มี edge functions ค้าง — ดู [environment-map.md](environment-map.md)) |
| **งานทั่วไปบน OneDrive** | เอกสารนอกระบบ ไม่เกี่ยวข้องกับบริการ/ข้อมูลลูกค้า |
| **โครงสร้างพื้นฐานทางกายภาพของ data center** | ผู้ให้บริการ cloud รับผิดชอบ (inherited controls — อ้าง 5.23) |

### ขอบเขต/รอยต่อ (Boundaries & Interfaces)
- ระบบเป็น **cloud-hosted, remote-operated** ทั้งหมด — ไม่มี on-prem server/network ของตัวเอง
- รอยต่อสำคัญ: frontend ↔ Supabase (HTTPS/anon key + RLS), Edge Functions ↔ Anthropic/Resend/Serper (secret ผ่าน env), CF Worker (Durable Object) ↔ Anthropic
- ความมั่นคงบางส่วนเป็น **shared responsibility** กับ cloud provider (ต้องประเมินผู้ส่งมอบ — R4)

## 4.4 ระบบบริหารความมั่นคงปลอดภัยสารสนเทศ (ISMS)

ธุรกิจจัดตั้งและธำรงรักษา ISMS ตาม ISO/IEC 27001:2022 โดยมีเอกสารหลัก:
- นโยบาย + ความมุ่งมั่นผู้บริหาร → [management-commitment.pdf](management-commitment.pdf) (5.1/5.2)
- กระบวนการ + ผลประเมินความเสี่ยง → [risk-register.md](risk-register.md) (6.1)
- Statement of Applicability → [statement-of-applicability.md](statement-of-applicability.md) (6.1.3)
- แผนที่ environment/config → [environment-map.md](environment-map.md) (8.9)
- procedure/policy เฉพาะด้าน → endpoint, clear-desk, incident-response, device-disposal, storage-security, legal-compliance, hr-security, secrets-backup

**ยังต้องเพิ่มเพื่อให้ครบข้อกำหนด:** Security Objectives (6.2), บันทึก competence/training (7.2/7.3), Internal Audit (9.2), Management Review (9.3)

---
**หมายเหตุ:** เอกสารนี้ปิดช่องว่างข้อ 4.3 (ISMS scope statement) ที่ระบุในผลประเมินสมรรถนะ 2026-07-07 — Clause 4 ขยับจาก 🟡 (มีแต่ scope เชิงเทคนิค) → มีเอกสารขอบเขตทางการแล้ว (เหลืออนุมัติพร้อมลายเซ็นผู้บริหารรอบเดียวกับ management-commitment)
