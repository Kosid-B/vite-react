# โปรแกรมการตรวจประเมินภายใน + รายการตรวจ (Internal Audit Programme & Checklist)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อกำหนด 9.2**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-08 |
| ผู้จัดทำ | IT Security |
| อนุมัติโดย | ผู้บริหารสูงสุด (ดู [management-commitment.pdf](management-commitment.pdf)) |
| ทบทวน | ทุก 12 เดือน หรือเมื่อ ISMS/ขอบเขตเปลี่ยนอย่างมีนัยสำคัญ |
| เอกสารที่เกี่ยวข้อง | [statement-of-applicability.md](statement-of-applicability.md) · [risk-register.md](risk-register.md) · [security-objectives.md](security-objectives.md) · [isms-context-and-scope.md](isms-context-and-scope.md) |

> เอกสารนี้เป็น **documented information บังคับ** ตามข้อ 9.2.2 (โปรแกรมการตรวจประเมิน) และเป็นกรอบสร้าง **หลักฐานผลการตรวจประเมิน** (9.2 g) ที่ต้องเก็บไว้
> ข้อกำหนด 9.2: องค์กรต้องตรวจประเมินภายในตามรอบที่วางแผน เพื่อยืนยันว่า ISMS **(ก)** สอดคล้องข้อกำหนดขององค์กรเอง + ข้อกำหนดมาตรฐาน และ **(ข)** ถูกนำไปปฏิบัติและคงไว้อย่างมีประสิทธิผล

---

## 1. วัตถุประสงค์และขอบเขต

**วัตถุประสงค์:** ตรวจสอบอย่างเป็นระบบ (planned, objective) ว่า ISMS ของธุรกิจ **มีอยู่จริง ทำตามจริง และได้ผลจริง** ไม่ใช่แค่มีเอกสาร — และค้นหาข้อบกพร่อง (nonconformity) + โอกาสปรับปรุง (OFI) ป้อนเข้า Management Review (9.3) และ CAPA (10.2)

**ขอบเขตการตรวจ (audit scope):** เท่ากับขอบเขต ISMS ตาม [isms-context-and-scope.md](isms-context-and-scope.md) §4.3 —
ครอบคลุมข้อกำหนดข้อ **4–10** และ **Annex A controls ที่ระบุ "ใช่" ใน SoA** (โดยสุ่มตามความเสี่ยง)

**เกณฑ์การตรวจ (audit criteria):**
- ISO/IEC 27001:2022 ข้อ 4–10
- เอกสาร ISMS ภายใน (นโยบาย, SoA, risk register, procedures ในโฟลเดอร์นี้)
- กฎหมายที่เกี่ยวข้อง ([legal-compliance-register.md](legal-compliance-register.md) — PDPA, พ.ร.บ.คอมพิวเตอร์)

---

## 2. ความเป็นอิสระและความเที่ยงธรรม (9.2.2 c) — ข้อจำกัดที่ต้องประกาศตรง ๆ

> ข้อกำหนด 9.2.2 (c): "ผู้ตรวจประเมินต้อง**ไม่ตรวจงานของตนเอง** (objectivity & impartiality)"

**ปัญหาจริง:** ธุรกิจเป็นทีมเล็ก — ผู้ปฏิบัติงานหลักคนเดียว (โฆษิต แก้วเต่า ทำทั้ง IT Security + พัฒนา) ตาม [[R18]]/context 4.1 → ผู้ที่ **ออกแบบ/ปฏิบัติ** control กับผู้ที่ **ตรวจ** control เป็นคนเดียวกัน = ขัดหลักความเที่ยงธรรมโดยธรรมชาติ

**มาตรการชดเชย (compensating — เลือกอย่างน้อย 1 ตามความพร้อม):**

| ตัวเลือก | วิธี | ความเที่ยงธรรม | ต้นทุน | สถานะ |
|---|---|---|---|---|
| **A (แนะนำก่อนยื่นตรวจรับรอง)** | จ้าง **ผู้ตรวจภายนอก** (freelance ISO 27001 Lead Auditor) ทำ internal audit ให้ | สูงสุด | มีค่าใช้จ่าย | ⬜ พิจารณา |
| **B** | ให้บุคคลที่ **ไม่ได้ทำ** control นั้น ๆ เป็นผู้ตรวจ (เช่น ที่ปรึกษา/กรรมการอีกท่าน) | สูง | ต่ำ | ⬜ |
| **C (ชั่วคราว)** | เจ้าของทำ self-audit โดยยึด **หลักฐานเชิงระบบ** (query/log/config จริง) ไม่ใช่ความจำ + **ประกาศข้อจำกัดนี้ในรายงาน** ให้ Management Review รับทราบเป็นความเสี่ยงคงเหลือ | จำกัด | ฟรี | 🟡 ใช้สำหรับ audit ครั้งที่ 1 |

> **หลักสำคัญ:** ยึด "verify ไม่ใช่เดา" ([[R19]]) — audit ต้องอ้าง **หลักฐานที่ตรวจสอบได้** (has_function_privilege, CI log, migration list, bundle check, security advisor) ลดอคติของผู้ตรวจที่เป็นเจ้าของงานเอง
> **ก่อนยื่น Certification Body:** ควรยกระดับเป็นตัวเลือก A หรือ B อย่างน้อย 1 รอบ (CB จะตรวจว่า internal audit มีความเที่ยงธรรมเพียงพอ)

---

## 3. โปรแกรมการตรวจประเมิน (Audit Programme — 9.2.2 a)

| หัวข้อ | กำหนด |
|---|---|
| **ความถี่** | อย่างน้อย **ปีละ 1 ครั้ง** (เต็มขอบเขต) + ตรวจเฉพาะจุดเมื่อมีการเปลี่ยนแปลงสำคัญ (เช่น เปิดฟีเจอร์ใหม่, ย้าย infra, หลังเกิด incident ระดับ Critical) |
| **รอบแรก** | ภายใน **Q4/2569** (สอดคล้องวัตถุประสงค์ [security-objectives.md](security-objectives.md) **O8**) — ก่อนยื่นตรวจรับรอง |
| **วิธีการ (method)** | (1) ทบทวนเอกสาร (document review) → (2) ตรวจหลักฐานเชิงเทคนิค (technical evidence: SQL query สิทธิ์จริง, CI/CD log, config, security advisor, git history) → (3) สัมภาษณ์/สังเกต (interview & observation) กระบวนการปฏิบัติ |
| **การเลือกสิ่งที่ตรวจ** | ข้อ 4–10 **ตรวจทุกครั้ง** · Annex A **สุ่มตามความเสี่ยง** — ให้น้ำหนัก control ที่ผูกกับความเสี่ยงสูง/เคยมี incident (R2,R12,R13,R14,R19,R20) และ control ที่เพิ่งเปลี่ยนสถานะใน SoA |
| **ผู้รับผิดชอบโปรแกรม** | IT Security (วางแผน/ประสานงาน) · **ผู้ตรวจ (auditor)** = ตาม §2 |
| **การรายงาน** | สรุปผลเป็น **Audit Report** (§6) → ส่งเข้า **Management Review (9.3)** · NC ทุกรายการเปิด **CAPA** ตาม [risk-register.md](risk-register.md) / ข้อ 10.2 |
| **การเก็บหลักฐาน** | เก็บ audit plan, checklist ที่กรอกแล้ว, รายงาน, และหลักฐานประกอบ เป็น documented information (9.2 g) ในโฟลเดอร์ `docs/isms/audits/<ปี>/` |

---

## 4. กระบวนการตรวจ (Audit Process)

```
1. วางแผน (Plan)     → ยืนยันขอบเขต/เกณฑ์/ผู้ตรวจ + ส่ง audit plan ล่วงหน้า
2. ดำเนินการ (Do)     → เก็บหลักฐานตาม checklist §5 (ตรวจ 3 วิธี: doc / technical / interview)
3. ตัดสิน (Judge)     → จัดหมวดผล: Conform (C) / Nonconformity (NC: Major/Minor) / OFI
4. รายงาน (Report)   → เขียน Audit Report (§6) พร้อมหลักฐานอ้างอิง
5. ติดตาม (Follow-up) → เปิด CAPA ทุก NC, กำหนดผู้รับผิดชอบ+due date, ปิดเมื่อ verify แล้ว (10.2)
```

**นิยามผล:**
- **C (Conform)** — เป็นไปตามเกณฑ์ มีหลักฐานยืนยัน
- **NC-Major** — ไม่มี control/กระบวนการที่ข้อกำหนดบังคับ หรือ control ล้มเหลวเป็นระบบ → ต้องแก้ก่อนรับรอง
- **NC-Minor** — เบี่ยงเบนเฉพาะจุด ไม่กระทบระบบโดยรวม
- **OFI (Opportunity For Improvement)** — ทำได้ตามเกณฑ์แล้วแต่ปรับให้ดีขึ้นได้ (ไม่ใช่ NC)

---

## 5. รายการตรวจ (Audit Checklist)

> วิธีใช้: กรอกคอลัมน์ **ผล** (C/NC/OFI) + **หลักฐาน/บันทึก** (ระบุไฟล์/query/screenshot/commit ที่ตรวจพบ) ทุกแถวขณะตรวจจริง
> คอลัมน์ "หลักฐานที่คาดหวัง" คือสิ่งที่ผู้ตรวจควรร้องขอ/ตรวจสอบ

### 5.1 ข้อ 4 — บริบทองค์กร

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 4.1 | ระบุประเด็นภายใน/ภายนอกที่กระทบ ISMS แล้วหรือไม่ และทันสมัยหรือไม่ | [isms-context-and-scope.md](isms-context-and-scope.md) §4.1 | | |
| 4.2 | ระบุผู้มีส่วนได้เสีย + ความคาดหวัง (รวมข้อกำหนดกฎหมาย) | §4.2 + [legal-compliance-register.md](legal-compliance-register.md) | | |
| 4.3 | ขอบเขต ISMS เป็นเอกสาร ชัดเจน ระบุสิ่งที่อยู่นอกขอบเขต (เช่น TIS Automate) | §4.3 | | |

### 5.2 ข้อ 5 — ภาวะผู้นำ

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 5.1 | ผู้บริหารแสดงความมุ่งมั่นต่อ ISMS (จัดสรรทรัพยากร, สนับสนุน) | [management-commitment.pdf](management-commitment.pdf) — **ตรวจว่ามีลายเซ็นจริง** | | |
| 5.2 | มีนโยบายความมั่นคงสารสนเทศ อนุมัติแล้ว สื่อสารแล้ว | [information-security-policy.md](information-security-policy.md) | | |
| 5.3 | บทบาท/ความรับผิดชอบด้านความมั่นคงถูกกำหนดและมอบหมาย (รวมข้อจำกัด segregation ทีมเล็ก) | policy §บทบาท + [personnel-security-lifecycle.md](personnel-security-lifecycle.md) | | |

### 5.3 ข้อ 6 — การวางแผน (หัวใจของ ISMS)

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 6.1.2 | มีกระบวนการประเมินความเสี่ยงที่ทำซ้ำได้ (เกณฑ์ likelihood×impact ชัดเจน) | [risk-register.md](risk-register.md) หัวตาราง + เกณฑ์ |  | |
| 6.1.3 | มี **SoA** ครบ 93 controls + เหตุผลเลือก/ไม่เลือก + สถานะ | [statement-of-applicability.md](statement-of-applicability.md) — ตรวจ 🔴=0 | | |
| 6.1.3 | ทุก control ที่ "ใช่" ผูกกับความเสี่ยงจริง (risk-based ไม่ใช่หยิบมาลอย ๆ) | cross-ref คอลัมน์ risk ใน SoA ↔ risk-register | | |
| 6.2 | วัตถุประสงค์ความมั่นคง **วัดผลได้** + มีแผนบรรลุ + รอบวัด | [security-objectives.md](security-objectives.md) O1–O9 | | |

### 5.4 ข้อ 7 — การสนับสนุน

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 7.2 | ผู้ปฏิบัติงานมีความสามารถด้านความมั่นคงเพียงพอ (หลักฐาน competence) | ประวัติ/ประกาศนียบัตร/บันทึกอบรม | | |
| 7.3 | มีการสร้างความตระหนัก (awareness) | [personnel-security-lifecycle.md](personnel-security-lifecycle.md) — awareness (ปัจจุบัน O9=0%, คาด NC/OFI) | | |
| 7.5 | เอกสารสารสนเทศถูกควบคุม (เวอร์ชัน, อนุมัติ, เข้าถึงได้) | header เวอร์ชัน/วันที่ในเอกสาร ISMS + git history | | |

### 5.5 ข้อ 8 — การดำเนินการ

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 8.1 | แผนจัดการความเสี่ยงถูกนำไปปฏิบัติจริง (ไม่ใช่แค่วางแผน) | risk-register คอลัมน์สถานะ "ปิดแล้ว" + หลักฐาน verify | | |
| 8.2 | ประเมินความเสี่ยงตามรอบ/เมื่อเปลี่ยนแปลง | บันทึกการทบทวน risk register (วันที่, เหตุการณ์ trigger) | | |
| 8.3 | ทำ risk treatment ตามแผน + residual risk ได้รับการยอมรับ | risk-register + Management Review record | | |

### 5.6 ข้อ 9 — การประเมินสมรรถนะ

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 9.1 | เฝ้าติดตาม/วัดผลตามวัตถุประสงค์ (มีข้อมูลจริงแต่ละรอบ) | ผลวัด O1–O9 รายไตรมาส (documented) | | |
| 9.2 | ทำ internal audit ตามโปรแกรมนี้ + เก็บผล | audit report + checklist ที่กรอกแล้ว | | |
| 9.3 | ทำ Management Review + เก็บผล (input/output ครบ) | บันทึก Management Review | | |

### 5.7 ข้อ 10 — การปรับปรุง

| ข้อ | คำถามตรวจ | หลักฐานที่คาดหวัง | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| 10.1 | ปรับปรุง ISMS ต่อเนื่อง (มีร่องรอยการยกระดับ) | เวอร์ชัน SoA/risk register ที่พัฒนาขึ้น | | |
| 10.2 | ข้อบกพร่อง (NC/incident) นำไปสู่ CAPA + verify การแก้ | incident-drill, risk-register แถวที่ปิดพร้อมหลักฐาน | | |

### 5.8 Annex A — สุ่มตามความเสี่ยง (rotate ทุกปี, ปีแรกเน้น control ที่ผูก incident)

| Control | คำถามตรวจ | หลักฐานที่คาดหวัง (เชิงเทคนิค) | ผล | หลักฐาน/บันทึก |
|---|---|---|---|---|
| **8.2/8.3** สิทธิ์เข้าถึง | `anon` เรียก sensitive RPC ไม่ได้ · `authenticated` เรียกได้ตามจำเป็น | `has_function_privilege(...)` บน prod (anon=false, auth=true); [0024](../../supabase/migrations/0027_reconcile_prod_rpc_grants.sql) · [security_checks.sql](../../supabase/tests/security_checks.sql) | | |
| **8.3** RLS แยกผู้เช่า | ทุกตาราง public เปิด RLS + policy owner/member | Supabase advisor + query `pg_policies`; ตรวจ 26 ตาราง (R14/R19) | | |
| **8.13** Backup | platform backup เปิด + ทดสอบ restore | Supabase Pro backup/PITR setting + restore test log (O3/R5 — คาด NC จนกว่า verify) | | |
| **8.24** Cryptography/secrets | ไม่มี secret ในโค้ด · คีย์ rotate ตามรอบ | gitleaks CI log ([security-scan.yml](../../.github/workflows/security-scan.yml)) + [secrets-backup-procedure.md](secrets-backup-procedure.md) (R1/R7/R20) | | |
| **8.31** แยก dev/prod | dev project แยกจาก prod จริง ทั้ง DB+frontend | dev `oudykxmtrnjeskglaluh` schema ตรง prod (R15) + `.env` local ชี้ dev | | |
| **8.5** Auth (MFA) | บัญชี admin เปิด MFA | Supabase Auth MFA factors (O5/R3 — คาด NC จนกว่า enroll) | | |
| **5.24–5.28** Incident | มี playbook + เคยซ้อม/ใช้จริง | [incident-response-playbook.md](incident-response-playbook.md) + [incident-drill-2026-07-07.md](incident-drill-2026-07-07.md) (R16) | | |
| **5.19–5.23** Supplier | ผู้ส่งมอบสำคัญมี DPA/ToS ยืนยัน | [supplier-register.md](supplier-register.md) + [supplier-security-assessment.md](supplier-security-assessment.md) (O7/R4 — คาด NC 0/4) | | |
| **8.9** Config mgmt | repo migrations reproduce prod ได้ · ไม่มี rogue function | [migrations/README.md](../../supabase/migrations/README.md) + `supabase functions list` (R11/R19/R20) | | |

> **หมายเหตุผู้ตรวจ:** แถวที่มาร์ก "คาด NC" คือช่องว่าง operational ที่ทราบอยู่แล้ว (backup verify, MFA, DPA, awareness) — audit ครั้งแรกน่าจะยืนยันเป็น NC-Minor พร้อม CAPA ที่มี due date ใน [security-objectives.md](security-objectives.md) (Q3–Q4/2569) ไว้แล้ว ถือเป็นเรื่องปกติของ ISMS ที่กำลัง maturing

---

## 6. แม่แบบรายงานผลการตรวจ (Audit Report Template — 9.2 g)

```
รายงานผลการตรวจประเมินภายใน ISMS — CEO AI Thailand
─────────────────────────────────────────────
รอบการตรวจ        : ครั้งที่ __ / ปี ____
วันที่ตรวจ         : ____________
ขอบเขต            : ข้อ 4–10 + Annex A (controls: ________________)
เกณฑ์             : ISO/IEC 27001:2022 + เอกสาร ISMS ภายใน
ผู้ตรวจ (auditor)  : ____________ (ความเที่ยงธรรม: ตัวเลือก __ ตาม §2)
ผู้ถูกตรวจ         : ____________

สรุปผล
  Conform (C)     : ___ รายการ
  NC-Major        : ___ รายการ   → [ต้องแก้ก่อนรับรอง]
  NC-Minor        : ___ รายการ
  OFI             : ___ รายการ

รายการ Nonconformity + CAPA
┌────┬──────────────┬─────────┬──────────────┬────────────┬─────────┬────────┐
│ #  │ ข้อ/control   │ ระดับ    │ สิ่งที่พบ      │ การแก้ไข     │ ผู้รับผิด │ due    │
├────┼──────────────┼─────────┼──────────────┼────────────┼─────────┼────────┤
│    │              │         │              │            │         │        │
└────┴──────────────┴─────────┴──────────────┴────────────┴─────────┴────────┘

ข้อจำกัดของการตรวจ (เช่น ผู้ตรวจเป็นเจ้าของงาน — §2 ตัวเลือก C) : ____________
สรุป/ข้อเสนอต่อ Management Review (9.3) : ____________
ลงชื่อผู้ตรวจ ____________   วันที่ ____________
```

---

## 7. Action Items

| # | งาน | เจ้าของ | กำหนด | สถานะ |
|---|---|---|---|---|
| 1 | ตัดสินใจวิธีสร้างความเที่ยงธรรมผู้ตรวจ (§2 — เลือก A/B/C) | ผู้บริหาร | ก่อน audit รอบแรก | ⬜ |
| 2 | ดำเนินการ **Internal Audit ครั้งที่ 1** ตาม checklist §5 | ผู้ตรวจ | **Q4/2569** | ⬜ (O8) |
| 3 | สร้างโฟลเดอร์ `docs/isms/audits/2569/` เก็บ plan+report+หลักฐาน | IT Security | ก่อนตรวจ | ⬜ |
| 4 | เปิด CAPA ทุก NC + ติดตามจนปิด (verify) | IT Security | ต่อเนื่อง | ⬜ (10.2) |
| 5 | นำผล audit เข้า **Management Review (9.3)** | ผู้บริหาร | หลัง audit | ⬜ |

> **ลำดับก่อนยื่นตรวจรับรอง:** Internal Audit (9.2 — เอกสารนี้) → Management Review (9.3) → ปิด NC-Major ทั้งหมด → เลือก Certification Body ที่ได้รับ accreditation
> ⚠️ การรับรองจริงต้องผ่าน **Certification Body** ที่ได้ accreditation — เอกสารและ audit ภายในนี้เป็นการ**เตรียมความพร้อม** ไม่ใช่การรับรองในตัวเอง
