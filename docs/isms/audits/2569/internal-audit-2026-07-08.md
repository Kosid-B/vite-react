# รายงานผลการตรวจประเมินภายใน ISMS — ครั้งที่ 1/2569
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 9.2** · หลักฐานผลการตรวจ (9.2 g)

| | |
|---|---|
| รอบการตรวจ | ครั้งที่ 1 / ปี 2569 |
| วันที่ตรวจ | 2026-07-08 |
| ขอบเขต | ข้อ 4–10 + Annex A (สุ่มตามความเสี่ยง: 8.2/8.3, 8.5, 8.9, 8.13, 8.24, 8.31, 5.19–5.28) |
| เกณฑ์ | ISO/IEC 27001:2022 + เอกสาร ISMS ภายใน (`docs/isms/`) |
| ผู้ตรวจ (auditor) | ผู้ช่วย AI (Claude) — **§ ความเที่ยงธรรม ดูด้านล่าง** |
| วิธี | document review + **technical evidence (MCP live query, has_function_privilege, get_advisors, git)** + config review |

---

## 0. ⚠️ ประกาศข้อจำกัดความเที่ยงธรรม (9.2.2 c) — ต้องอ่านก่อน

1. **ผู้ตรวจไม่เป็นอิสระเต็มที่:** ผู้ช่วย AI นี้มีส่วนช่วย **สร้าง** เอกสาร/โค้ด ISMS จำนวนมาก → การตรวจงานตัวเองขัดหลักความเที่ยงธรรม (ตัวเลือก C ตาม audit programme §2). **ก่อนยื่น Certification Body ต้องยกระดับเป็นผู้ตรวจภายนอกอิสระ (ตัวเลือก A/B)**
2. **ยึดหลักฐานที่ตรวจสอบได้ ไม่ยึดคำกล่าวอ้าง (verify ไม่ใช่เดา — R11/R19):** ทุกผลอ้างหลักฐานเชิงเทคนิค/ไฟล์จริง
3. **production เข้าถึงผ่าน MCP ไม่ได้:** โปรเจกต์ที่ MCP เข้าถึงได้ = `oudykxmtrnjeskglaluh` (dev), `galtbbkcddugnsfkgyqm` (tis, inactive), `kqukfntsyoaaujgkzzba` (sck-crm) — **production `waigsnxhrlwtiotspaim` ไม่อยู่ในรายการ** → audit นี้ **re-verify production สดไม่ได้** หลักฐาน prod อ้างบันทึก 2026-07-07 เท่านั้น (= ข้อจำกัดสำคัญ, ดู OFI-4)
4. **หมายเหตุความสอดคล้อง:** มีการส่ง "ผลตรวจสรุป" (report saved, R15 falsely-closed, commit adf2a41) เข้ามาก่อนหน้า — ผู้ตรวจ **ตรวจสอบเองแล้วไม่พบหลักฐานยืนยัน** (risk-register แสดง R15 = 🔴 เปิด อยู่แล้ว ไม่ได้ถูกปิดเท็จ; ไม่พบไฟล์ report ดังกล่าว) → รายงานฉบับนี้ยึด **ผลที่ผู้ตรวจ verify เองสด** เท่านั้น

---

## 1. สรุปผู้บริหาร

| ผล | จำนวน |
|---|---|
| Conform (C) | 11 |
| **NC-Major** | **1** |
| NC-Minor | 7 |
| OFI | 4 |

**คำตัดสิน: ISMS อยู่ในสถานะ *maturing* — ยังไม่พร้อมยื่นตรวจรับรอง** · ฐานเชิงเทคนิค (RLS/RPC hardening) **แข็งแรงและพิสูจน์ได้สด** แต่ยังขาด documented information บังคับหลายชิ้น + ต้องมี Management Review + ผู้ตรวจอิสระ

---

## 2. หลักฐานเชิงเทคนิคสด (highlight) — Annex A 8.2/8.3 Access Control

ตรวจบน dev `oudykxmtrnjeskglaluh` (ซึ่ง audit นี้ **นำ schema จริงมา apply เพื่อ verify** — ดู CAPA-1):

**ก่อน hardening** (สร้าง function ตาม 0002/0003/0005 — Postgres grant EXECUTE ให้ PUBLIC เป็น default):
```
has_function_privilege(anon, is_app_admin())        = true   ← เสี่ยง
has_function_privilege(anon, admin_list_workspaces())= true   ← เสี่ยง (R12)
has_function_privilege(anon, create_workspace(text)) = true   ← เสี่ยง (R13)
```
**หลัง apply 0023 (harden — revoke from public + anon):**
```
has_function_privilege(anon, admin_list_workspaces())= false  ✅ ปิดแล้ว
has_function_privilege(anon, create_workspace(text)) = false  ✅
has_function_privilege(anon, remove_member(uuid,uuid))= false ✅
has_function_privilege(authenticated, admin_list_workspaces())= true ✅ (แอปยังใช้ได้)
has_function_privilege(authenticated, create_workspace(text)) = true ✅
has_function_privilege(anon, is_app_admin())        = true   (เปิดโดยตั้งใจ — RLS helper, คืน false ให้ anon; ดู 0023 §3)
```
**get_advisors(security):** ไม่มี ERROR/RLS-disabled · มีแต่ WARN ที่คาดไว้ (is_app_admin/is_member anon-executable = intentional + authenticated-callable definer functions = by design มี owner/member guard ภายใน)

> **ข้อสรุป control 8.2/8.3 = Conform (พิสูจน์สด)** — การ revoke ทำงานจริง, authenticated ยังใช้งานได้, RLS ครบทุกตารางที่ apply

---

## 3. ผลตาม Checklist (§5 ของ audit programme)

### ข้อ 4 — บริบท
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 4.1 บริบทภายใน/ภายนอก | **NC-Minor** | ไม่พบ `isms-context-and-scope.md` (checklist อ้างถึง แต่ไฟล์ไม่มี) — บริบทกระจายใน README/environment-map แต่ไม่มีเอกสารบริบทเฉพาะ |
| 4.2 ผู้มีส่วนได้เสีย+กฎหมาย | **C** | `legal-compliance-register.md` มีจริง (PDPA/พ.ร.บ.คอมพิวเตอร์) |
| 4.3 ขอบเขต ISMS | **NC-Minor** | ไม่มีเอกสารขอบเขตเฉพาะ (`isms-context-and-scope.md` §4.3 ที่อ้าง ไม่มี); ขอบเขต TIS-out ระบุใน CLAUDE.md/SoA เท่านั้น |

### ข้อ 5 — ภาวะผู้นำ
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 5.1 ความมุ่งมั่นผู้บริหาร | **NC-Minor** | `management-commitment.md` มีจริง แต่สถานะ = "🟡 รอผู้บริหารลงนาม" + ช่องลายเซ็น **ว่าง** → ยังไม่นับเป็นหลักฐานตาม 5.1 (เอกสารระบุเองว่าต้องมีลายเซ็นจริง) |
| 5.2 นโยบายความมั่นคง | **NC-Minor** | `information-security-policy.md` มีจริง แต่ README ระบุสถานะ "ร่าง — รออนุมัติผู้บริหาร" → ยังไม่อนุมัติ |
| 5.3 บทบาท/ความรับผิดชอบ | **C (มีข้อจำกัด)** | ระบุใน commitment §3 + SoA 5.3 = 🔴 (segregation ทำไม่ได้ ทีมคนเดียว) — **ประกาศข้อจำกัด+compensating อย่างซื่อสัตย์** |

### ข้อ 6 — การวางแผน
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 6.1.2 กระบวนการประเมินความเสี่ยง | **C** | `risk-register.md` มีเกณฑ์ likelihood×impact + R1–R19 |
| 6.1.3 SoA | **C (+OFI)** | SoA ครบ **93 controls** + เหตุผล + สถานะ (✅/🟡/🔴/⚪) · **แต่ 🔴 = 45 ตัว** (applicable-not-implemented) = backlog ปรับปรุง (OFI-1) — ไม่ใช่ NC เพราะ SoA เองสมบูรณ์+ซื่อสัตย์ |
| 6.2 วัตถุประสงค์ความมั่นคง | **NC-Minor** | ไม่พบ `security-objectives.md` (checklist อ้าง O1–O9 แต่ไฟล์ไม่มี) → ไม่มี documented measurable objectives |

### ข้อ 7 — การสนับสนุน
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 7.2 ความสามารถ | **NC-Minor** | ไม่พบหลักฐาน competence เป็นเอกสาร |
| 7.3 ความตระหนัก | **NC-Minor** | ไม่พบ `personnel-security-lifecycle.md`; ไม่มีบันทึก awareness |
| 7.5 การควบคุมเอกสาร | **C** | เอกสาร ISMS มี header เวอร์ชัน/วันที่ + git history |

### ข้อ 8 — การดำเนินการ
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 8.1 นำแผนจัดการความเสี่ยงไปปฏิบัติ | **C (มีข้อสังเกต)** | risk-register แสดง R2/R12/R13/R14 ปิดพร้อมหลักฐาน; R15 = เปิด (ตรงจริง) |
| 8.2 ประเมินตามรอบ/เมื่อเปลี่ยน | **C** | risk-register แก้ล่าสุด 2026-07-07 (R19) มี trigger/วันที่ |
| 8.3 residual risk ยอมรับ | **NC-Minor** | commitment ระบุยอมรับ residual แต่ **ยังไม่ลงนาม** → ยังไม่มีหลักฐานการยอมรับอย่างเป็นทางการ |

### ข้อ 9 — ประเมินสมรรถนะ
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 9.1 เฝ้าติดตาม/วัดผล | **NC-Minor** | ไม่พบ `security-objectives.md` → ไม่มีผลวัด O1–O9 รายไตรมาส |
| 9.2 internal audit | **C** | รายงานฉบับนี้ = หลักฐานการทำ internal audit ครั้งที่ 1 (9.2 g) |
| 9.3 Management Review | **NC-Major** | **ไม่พบบันทึก Management Review ใด ๆ** — เป็น documented information บังคับที่ยังขาด |

### ข้อ 10 — การปรับปรุง
| ข้อ | ผล | หลักฐาน/บันทึก |
|---|---|---|
| 10.1 ปรับปรุงต่อเนื่อง | **C** | risk-register/SoA มีร่องรอยยกระดับ (v1→v3) |
| 10.2 CAPA | **C** | risk-register มีรายการปิดพร้อมหลักฐาน + migrations 0023/0025/0027 (grant hardening) |

### Annex A (สุ่มตามความเสี่ยง)
| Control | ผล | หลักฐาน/บันทึก |
|---|---|---|
| **8.2/8.3** สิทธิ์ RPC | **C (พิสูจน์สด)** | has_function_privilege ก่อน/หลัง (ดู §2) — anon ปิด, authenticated เปิด |
| **8.3** RLS แยกผู้เช่า | **C (บางส่วน)** | 5 ตารางที่ apply มี `rls_enabled=true` ครบ + advisor ไม่มี RLS-disabled (dev apply 5/~27 ตาราง) |
| **8.31** แยก dev/prod | **NC-Minor→CAPA** | dev project `oudykxmtrnjeskglaluh` **มีอยู่** (สร้าง 2026-07-07) แต่ **schema ไม่เคยถูก apply** — verify สด 2026-07-08: `public` = 0 tables, 0 migrations. risk-register R15 = เปิด (**ตรงจริง ไม่ได้ปิดเท็จ**). CAPA-1 ดำเนินการแล้วบางส่วน (ดูล่าง) |
| **8.24** secrets scan | **C (+OFI)** | GitGuardian ตรวจทุก PR (ผ่าน ~11 PR ล่าสุด) · แต่ไม่พบ `security-scan.yml`/gitleaks ใน repo (checklist อ้าง) → OFI-2 |
| **8.13** Backup | **NC-Minor** | `0022_backup_cron.sql` มี (backup อัตโนมัติ) แต่ **ไม่มีบันทึกทดสอบ restore** |
| **8.5** MFA admin | **NC-Minor** | `MfaSetup.tsx` มี (capability) แต่ verify การ enroll ของ admin ไม่ได้ |
| **5.24–5.28** Incident | **OFI** | `incident-response-playbook.md` มี · แต่ไม่พบ `incident-drill-2026-07-07.md` (checklist อ้าง) → OFI-3 |
| **5.19–5.23** Supplier | **NC-Minor** | `supplier-register.md` มี · แต่ไม่พบ `supplier-security-assessment.md` + ไม่มีหลักฐาน DPA ครบ |
| **8.9** Config mgmt | **C (มีข้อสังเกต)** | migrations reproduce schema ได้จริง (พิสูจน์โดย apply สด) · แต่ audit programme อ้าง `0024_reconcile_prod_rpc_grants.sql` (จริง = `0027`) + ไม่พบ `supabase/tests/security_checks.sql` → citation drift (รวมใน OFI-2) |

---

## 4. Nonconformity + CAPA

| # | ข้อ/control | ระดับ | สิ่งที่พบ | การแก้ไข (CAPA) | ผู้รับผิด | due |
|---|---|---|---|---|---|---|
| **NC-01** | 9.3 | **Major** | ไม่มีบันทึก Management Review | สร้างบันทึก Management Review ครั้งแรก (นำผล audit นี้เข้า) | ผู้บริหาร | ก่อนยื่นรับรอง |
| NC-02 | 5.1/5.2/8.3 | Minor | management-commitment + policy ยังไม่ลงนาม/อนุมัติ | ผู้บริหารลงนามจริง | ผู้บริหาร | ทันที |
| NC-03 | 6.2/9.1 | Minor | ไม่มี `security-objectives.md` | สร้างเอกสารวัตถุประสงค์ O1–O9 วัดผลได้ + รอบวัด | IT Security | Q3/2569 |
| NC-04 | 4.1/4.3 | Minor | ไม่มี `isms-context-and-scope.md` | สร้างเอกสารบริบท+ขอบเขต | IT Security | Q3/2569 |
| NC-05 | 7.2/7.3 | Minor | ไม่มี competence/awareness record | สร้าง `personnel-security-lifecycle.md` + บันทึก awareness | IT Security | Q3/2569 |
| NC-06 | 8.13 | Minor | ไม่มี restore test | ทดสอบ restore จาก backup + เก็บ log | IT Security | Q3/2569 |
| NC-07 | 8.5 | Minor | admin MFA ยังไม่ยืนยัน enroll | enroll MFA บัญชี admin + เก็บหลักฐาน | ผู้ดูแลระบบ | ทันที |
| NC-08 | 5.19–5.23 | Minor | ไม่มี supplier assessment/DPA | สร้าง `supplier-security-assessment.md` + เก็บ DPA/ToS | IT Security | Q3/2569 |

### CAPA-1 (ดำเนินการแล้วในการตรวจนี้) — 8.31/R15 dev schema
- **ก่อน:** dev `public` = 0 tables, 0 migrations (verify สด 2026-07-08)
- **ระหว่าง audit:** apply schema จริงลง dev ผ่าน MCP: `0001` (app_state) · `0002/0003` (workspaces/members/state) · `0005` (admin/app_admins) · `0023` (harden grants) → **dev = 5 tables, RLS ครบ, grant hardening พิสูจน์สด**
- **หลัง:** ดู §2 (has_function_privilege ยืนยัน anon ปิด/auth เปิด)
- **เหลือ:** apply schema ที่เหลือให้ครบ parity (feature tables 0006–0015, 0019–0020 + cron 0004/0008/0021/0022 ต้องมี edge fn+secret) — แนะนำ **`supabase db push --project-ref oudykxmtrnjeskglaluh`** (ยกเว้น TIS 0016–0018) เพื่อความน่าเชื่อถือ แล้ว re-run advisor → คง R15 = 🟡 (บางส่วน) จนกว่า parity ครบ+verify

---

## 5. OFI (โอกาสปรับปรุง)
- **OFI-1:** SoA มี 45 controls สถานะ 🔴 (applicable-not-implemented) — ทำ roadmap ปิดตามลำดับความเสี่ยง (ผูก security-objectives)
- **OFI-2:** citation drift ใน audit programme — แก้ให้ตรง repo จริง: `0027` (ไม่ใช่ 0024), เพิ่ม `supabase/tests/security_checks.sql`, ชี้ GitGuardian แทน `security-scan.yml` ที่ไม่มี
- **OFI-3:** ทำ incident drill จริง + เก็บ `incident-drill-YYYY-MM-DD.md`
- **OFI-4 (สำคัญ):** production `waigsnxhrlwtiotspaim` เข้าผ่าน MCP ปัจจุบันไม่ได้ → เชื่อมบัญชี/สิทธิ์ให้ตรวจ prod สดได้ ก่อน audit รอบหน้า (ตอนนี้ prod evidence พึ่งบันทึก 2026-07-07 เท่านั้น)

---

## 6. ข้อเสนอต่อ Management Review (9.3)
1. อนุมัติ+ลงนาม management-commitment/policy (ปิด NC-02) เป็นลำดับแรก
2. จัดทำ Management Review ครั้งแรก (ปิด NC-01) นำผล audit นี้ + risk-register + CAPA เข้าพิจารณา
3. จ้าง/จัดหา **ผู้ตรวจอิสระ** สำหรับ audit ก่อนยื่น CB (ยกจากตัวเลือก C → A/B)
4. ยอมรับ residual risk ของ 45🔴 SoA อย่างเป็นทางการ + roadmap

---
ผู้ตรวจ: ผู้ช่วย AI (ความเที่ยงธรรม: ตัวเลือก C + ข้อจำกัด §0) · วันที่ 2026-07-08
> เอกสารนี้เป็นหลักฐานผลการตรวจ (9.2 g) — เก็บใน `docs/isms/audits/2569/`
