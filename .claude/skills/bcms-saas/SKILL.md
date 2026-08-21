---
name: bcms-saas
description: "ชุดมาตรฐานเสริมของ BCMS 5 ฉบับ (ISO 22313 · ISO/TS 22317 BIA · 22318 ห่วงโซ่อุปทาน · 22330 บุคลากร · 22331 กลยุทธ์) — ใช้เมื่อต้องลงรายละเอียดวิธีทำ BIA แบบ Top-Down จัดลำดับกิจกรรมสำคัญ ประเมินความเสี่ยงซัพพลายเออร์ หรือวางแผนดูแลคนระหว่างเหตุการณ์"
---

# 🛡️ BCMS SaaS — ISO Standards Master Skill
## ครอบคลุม: ISO 22313 · ISO/TS 22317 · ISO/TS 22318 · ISO/TS 22330 · ISO/TS 22331

---

## 1. 🎯 Role & Objective

คุณคือ **"BCMS Platform Architect"** ที่ผสาน 5 มาตรฐาน ISO เข้ากับการออกแบบซอฟต์แวร์ SaaS  
เมื่อสร้างฟีเจอร์ใดก็ตาม ให้เชื่อมโยงกับข้อกำหนดมาตรฐานที่เกี่ยวข้องเสมอ และอธิบายเหตุผลเป็นภาษาไทย

---

## 2. 📚 มาตรฐาน 5 ฉบับ — สรุปแก่นสำคัญ

---

### 2.1 ISO 22313:2020 — Guidance on ISO 22301 (BCMS Implementation)

**วัตถุประสงค์:** คู่มือการนำ ISO 22301 ไปใช้งานจริง อธิบายความหมายและวิธีปฏิบัติของแต่ละข้อกำหนด

#### Clause 4 — Context of the Organization
- ระบุผู้มีส่วนได้ส่วนเสีย (Interested Parties) ทั้งภายในและภายนอก
- กำหนดขอบเขต BCMS (Scope) ให้สอดคล้องกับเป้าหมายองค์กร
- **Software implication:** `organizations` table ควรมี `scope`, `interested_parties` (JSONB) และ `bcms_policy_url`

#### Clause 5 — Leadership
- Top Management ต้องแสดง commitment ชัดเจน ผ่าน BC Policy ที่เป็นลายลักษณ์อักษร
- กำหนด Roles, Responsibilities, Authorities อย่างชัดเจน
- **Software implication:** `profiles.bcm_role` (owner/coordinator/team_member) — พิจารณาเพิ่ม `bc_policy_documents` table

#### Clause 6 — Planning
- Risk Assessment ตาม ISO 31000 — ประเมินทั้ง Likelihood × Impact
- ตั้ง BCMS Objectives ที่วัดผลได้ (Measurable Objectives)
- **Software implication:** `risk_items` ต้องมี `likelihood`, `impact`, `risk_score`, `treatment_plan`

#### Clause 7 — Support
Resources ที่ BCMS ต้องการ:
| ประเภท | ตัวอย่าง | Field ในระบบ |
|--------|----------|-------------|
| People | BCM Coordinator, Team Members | `profiles.bcm_role` |
| ICT | Backup Systems, DR Site | `resources` table |
| Facilities | Alternate Worksite, Hot Site | `resources.type = 'facility'` |
| Finance | Emergency Fund | `bc_plans.metadata.budget` |
| Documentation | BCP, BIA Reports | `bc_plans`, `bia_processes` |

- Competence Management: บันทึก training records ของ BCM team
- Awareness: ทุกคนต้องรู้ BC Policy และบทบาทตัวเอง
- Communication Plan: กำหนดช่องทางสื่อสาร ทั้งภายในและภายนอก

#### Clause 8.2 — Business Impact Analysis & Risk Assessment
กระบวนการ BIA ตาม ISO 22313 ประกอบด้วย:
1. **ระบุกิจกรรมสำคัญ** (Critical Activities) — กิจกรรมที่ถ้าหยุดจะกระทบ Objectives
2. **ประเมินผลกระทบตามเวลา** (Impact over Time) — ผลกระทบจะเพิ่มขึ้นเมื่อเวลาผ่านไป
3. **กำหนด MTPD** — Maximum Tolerable Period of Disruption
4. **กำหนด RTO** — Recovery Time Objective (< MTPD เสมอ)
5. **กำหนด RPO** — Recovery Point Objective (ข้อมูลเสียหายได้ไม่เกินกี่นาที/ชั่วโมง)
6. **กำหนด MBCO** — Minimum Business Continuity Objective (% ความสามารถขั้นต่ำ)
7. **ระบุ Resource Requirements** — คน, ICT, สถานที่, อุปกรณ์, ซัพพลายเออร์
8. **Interdependency Mapping** — กิจกรรมนี้พึ่งพาอะไรบ้าง

```
ลำดับความสำคัญ: MTPD → กำหนด RTO → กำหนด RPO → กำหนด MBCO → วางกลยุทธ์
```

**ข้อควรระวัง (ISO 22313 §8.2):**
- BIA ≠ Risk Assessment (แตกต่างกัน: BIA วิเคราะห์ผลกระทบ, Risk Assessment วิเคราะห์ความเสี่ยง)
- BIA ต้องทำก่อน Risk Assessment (ต้องรู้ว่าอะไรสำคัญก่อนจึงจะประเมินความเสี่ยงได้)
- ทบทวน BIA สม่ำเสมอ — อย่างน้อย 1 ครั้ง/ปี หรือเมื่อธุรกิจเปลี่ยนแปลงสำคัญ

#### Clause 8.3 — BC Strategies & Solutions
กลยุทธ์ความต่อเนื่องทางธุรกิจมี 5 ประเภทหลัก:
| กลยุทธ์ | คำอธิบาย | ตัวอย่าง |
|--------|----------|----------|
| **Prevent** | ป้องกันไม่ให้เกิดการหยุดชะงัก | UPS, Redundant Systems |
| **Avoid** | หลีกเลี่ยงกิจกรรมที่เสี่ยง | Geographic Diversification |
| **Reduce** | ลดโอกาสหรือผลกระทบ | Backup Data Center |
| **Transfer** | โอนความเสี่ยงไปยังบุคคลอื่น | Insurance, Outsourcing |
| **Accept** | ยอมรับความเสี่ยง (Residual Risk) | Low-priority activities |

Resource Requirements ตาม §8.3.4:
1. **People** — จำนวนคน, ทักษะ, กะทำงาน
2. **Information & Data** — ข้อมูลสำรอง, เวอร์ชัน, สิทธิ์เข้าถึง
3. **Buildings & Infrastructure** — สถานที่หลัก, สถานที่สำรอง
4. **Equipment & Consumables** — อุปกรณ์ IT, อุปกรณ์สำนักงาน
5. **ICT Systems** — Application, Network, Security
6. **Transportation** — การเดินทางของพนักงาน
7. **Finance** — งบฉุกเฉิน, Cash Flow
8. **Partners & Suppliers** — ซัพพลายเออร์สำรอง, SLA

#### Clause 8.4 — BC Plans & Procedures
โครงสร้าง BC Plan ที่ดีต้องประกอบด้วย:
```
BC Plan Structure (ISO 22313 §8.4.2):
├── 1. Purpose & Scope
├── 2. Activation Criteria (เงื่อนไขการ Invoke Plan)
├── 3. Roles & Responsibilities
├── 4. Communication Plan
│   ├── Internal (พนักงาน, Management)
│   └── External (ลูกค้า, สื่อ, หน่วยงานกำกับ)
├── 5. Incident Response Procedures
│   ├── Life Safety (ความปลอดภัยชีวิตเป็นอันดับ 1 เสมอ)
│   ├── Damage Assessment
│   ├── Notification Cascade
│   └── Decision Authority
├── 6. Recovery Procedures (per Critical Activity)
├── 7. Resources Required
└── 8. Post-Incident Review
```

#### Clause 8.4.3 — Warning & Communication (ISO 22313)
ระบบแจ้งเตือนและสื่อสารในภาวะฉุกเฉิน **ต้องมี**:
- Pre-prepared message templates (เตรียมข้อความไว้ล่วงหน้า)
- Multi-channel delivery (Email + SMS + LINE + Phone cascade)
- Priority levels: Life Safety → Operations → Stakeholders → Media
- Confirmation mechanism (ยืนยันว่าได้รับสาร)
- Two-way communication capability
- Escalation chain เมื่อไม่สามารถติดต่อได้

**ข้อความที่ต้องเตรียมล่วงหน้า:**
| ประเภท | ผู้รับ | เนื้อหา |
|--------|--------|---------|
| Evacuation Alert | พนักงานทุกคน | ให้ออกจากอาคารทันที |
| BC Plan Invocation | BC Team | แผนถูก Invoke, รายงาน EOC |
| Customer Notification | ลูกค้าที่ได้รับผลกระทบ | บริการหยุดชะงัก + กำหนดเวลาแก้ไข |
| Media Statement | สื่อมวลชน | ข้อเท็จจริง + ไม่ Speculate |
| Regulatory Report | หน่วยงานกำกับ | รายงานตาม Compliance requirement |

#### Clause 8.5 — Exercise Programme
ประเภท Exercise ตาม ISO 22313 §8.5:

| ประเภท | ความเข้มข้น | คำอธิบาย | ความถี่แนะนำ |
|--------|------------|----------|-------------|
| **Discussion-based** | ต่ำ | Tabletop Exercise — ประชุมจำลอง | ทุก 6 เดือน |
| **Walkthrough** | ต่ำ-กลาง | อ่านแผนพร้อมกัน ทบทวนบทบาท | ทุก 6 เดือน |
| **Simulation** | กลาง | จำลองสถานการณ์ บางส่วน | ทุก 1 ปี |
| **Functional Drill** | กลาง-สูง | ทดสอบระบบเฉพาะ (เช่น IT DR) | ทุก 6 เดือน |
| **Full-scale** | สูง | ทดสอบเสมือนจริง ครบทุกด้าน | ทุก 2-3 ปี |

After-Action Report (AAR) ต้องมี:
- Objectives achieved / not achieved
- Strengths (what worked well)
- Gaps / Areas for improvement
- Corrective Actions (CAPA)
- ISO 22301 Readiness assessment
- Lessons Learned

#### Clause 9 — Performance Evaluation
KPI/Metrics ที่ต้องติดตาม:
- BCMS Audit findings (# nonconformities, # observations)
- Exercise results (# exercises completed, % objectives met)
- BIA review cycle (% processes reviewed on schedule)
- BC Plan currency (% plans updated within 12 months)
- Training completion rate (% BCM team trained)
- RTO/RPO achievement rate (ผ่าน IT DR Test ได้กี่ %)

Management Review Input (§9.3.2):
- Results of audits and evaluations
- Stakeholder feedback
- Performance metrics
- Risk assessment updates
- Changes to context/scope
- Recommendations for improvement

---

### 2.2 ISO/TS 22317 — Business Impact Analysis Guidelines

**วัตถุประสงค์:** กำหนดวิธีการทำ BIA อย่างละเอียดตามลำดับขั้น Top-Down

#### ลำดับขั้น BIA (ISO/TS 22317 Clause 5)

```
Level 1: Products & Services
    ↓ (ระบุว่า Product/Service ใดสำคัญที่สุด)
Level 2: Processes
    ↓ (แต่ละ Product/Service ต้องการ Process ใด)
Level 3: Activities
    ↓ (แต่ละ Process ประกอบด้วย Activity อะไร)
Level 4: Resources
    ↓ (แต่ละ Activity ต้องการ Resource อะไร)
Level 5: Dependencies
    (Resource เหล่านั้นพึ่งพาอะไรอีก)
```

#### Impact Categories (ISO/TS 22317 Table 1)
| หมวด | คำอธิบาย | วิธีวัด |
|------|----------|---------|
| **Financial** | ผลกระทบต่อรายได้/ค่าใช้จ่าย | บาท/ชั่วโมงที่สูญเสีย |
| **Regulatory/Legal** | ผลกระทบต่อการปฏิบัติตามกฎหมาย | ระดับ 1-5, ค่าปรับ |
| **Reputational** | ผลกระทบต่อภาพลักษณ์ | ระดับ 1-5, การรับรู้ลูกค้า |
| **Operational** | ผลกระทบต่อการดำเนินงาน | % ความสามารถที่หายไป |
| **Health & Safety** | ผลกระทบต่อสุขภาพและความปลอดภัย | จำนวนคนที่ได้รับผลกระทบ |
| **Environmental** | ผลกระทบต่อสิ่งแวดล้อม | ระดับ 1-5 |

**กฎ scoring ที่ ISO/TS 22317 กำหนด:**
- Impact เพิ่มขึ้นตามเวลา (ไม่ใช่ fixed value)
- MTPD = จุดที่ Impact เกิน "Maximum Tolerable" threshold
- RTO ต้อง < MTPD เสมอ (RTO คือเป้าหมาย MTPD คือ deadline สูงสุด)
- MBCO = ระดับ service ขั้นต่ำที่ยอมรับได้ระหว่าง Recovery period

#### Resource Mapping (ISO/TS 22317 §5.5.3)
แต่ละ Activity ต้องระบุ Resource ดังนี้:
```json
{
  "people": { "normal": 5, "minimum": 2, "skills": ["BCM", "Finance"] },
  "ict": ["ERP System", "Email", "VPN"],
  "facilities": { "primary": "HQ Floor 3", "alternate": "Backup Site A" },
  "equipment": ["Laptop x5", "Printer"],
  "suppliers": ["Vendor A (critical)", "Vendor B (alternate)"],
  "information": ["Customer DB", "Financial Records"],
  "finance": { "emergency_fund_thb": 500000 }
}
```

#### Information Collection Methods (Annex C)
- **Interviews:** สัมภาษณ์ Process Owners โดยตรง
- **Questionnaires:** ส่ง Survey ดิจิทัล (เหมาะกับองค์กรใหญ่)
- **Workshops:** ประชุมกลุ่ม (ดีสำหรับ Interdependency)
- **Document Review:** ดึงจาก ERP, HR System อัตโนมัติ
- **Observation:** สังเกตการณ์ Process จริง

**AI Opportunity:** ใช้ LLM ดึงข้อมูลจาก Document Review มา Pre-fill BIA form อัตโนมัติ → ลด Time-to-Value

---

### 2.3 ISO/TS 22318 — Supply Chain Continuity

**วัตถุประสงค์:** แนวทางบริหารความต่อเนื่องของ Supply Chain เพื่อลด Single Point of Failure

#### กรอบการวิเคราะห์ Supply Chain

```
Supply Chain Risk Framework:
├── Tier 1 Suppliers (Direct Suppliers)
│   ├── Critical suppliers → BCP/BC Plan ของ Supplier
│   └── Non-critical → Alternate Supplier
├── Tier 2 Suppliers (Suppliers ของ Supplier)
│   └── ความเสี่ยงซ่อนอยู่ที่นี่มากที่สุด
└── Supporting Infrastructure
    ├── Logistics providers
    ├── Technology providers
    └── Utilities (ไฟฟ้า, น้ำ, อินเทอร์เน็ต)
```

#### Supplier Criticality Assessment
| เกณฑ์ | คะแนน 1-5 |
|-------|-----------|
| **Substitutability** — หา Supplier อื่นได้ง่ายแค่ไหน | 5=หาไม่ได้เลย |
| **Financial Impact** — ถ้า Supplier หยุดกระทบรายได้เท่าไร | 5=ธุรกิจหยุด |
| **Lead Time** — ต้องใช้เวลาเท่าไรในการเปลี่ยน Supplier | 5=>6 เดือน |
| **Single Source** — มีแค่ Supplier เดียวหรือไม่ | 5=ใช่ |

**Criticality Score = เฉลี่ย 4 เกณฑ์ → ≥4.0 = Critical Supplier**

#### BC Strategies for Supply Chain
1. **Dual/Multi-Sourcing** — มี Supplier 2+ รายสำหรับวัตถุดิบสำคัญ
2. **Safety Stock** — สต็อกวัตถุดิบสำคัญเพิ่มเติม (ตาม RTO)
3. **Supplier BC Audit** — ตรวจสอบว่า Supplier มี BCP หรือไม่
4. **Contractual Protection** — SLA กำหนด RTO ของ Supplier
5. **Geographic Diversification** — Supplier อยู่หลายภูมิภาค
6. **Supply Chain Mapping** — แผนผัง Supply Chain ครบถ้วน

#### ข้อกำหนด Software สำหรับ Supply Chain Module
```
supply_chain_items table ควรมี:
- supplier_name, supplier_tier (1/2/3)
- criticality_score (computed)
- substitutability, financial_impact, lead_time, is_single_source
- has_bcp (boolean)
- alternate_suppliers (JSONB array)
- last_audit_date
- contract_rto_days
- risk_notes
```

---

### 2.4 ISO/TS 22330 — People Aspects of Business Continuity

**วัตถุประสงค์:** จัดการมิติ "คน" ในภาวะวิกฤต ซึ่งมักถูกมองข้ามในการวางแผน BC

#### 3 ช่วงเวลาสำคัญ (Before / During / After)

**Before Disruption (การเตรียมความพร้อมคน):**
- Training & Awareness programs
- Role clarity — ทุกคนรู้ว่าตัวเองต้องทำอะไร
- Contact information ที่อัปเดตแล้ว (ทั้ง personal และ emergency)
- Dependency needs — สมาชิกในครอบครัว, ผู้พิการ, ผู้สูงอายุ
- Cross-training — ฝึก Backup คนสำหรับตำแหน่งสำคัญ

**During Disruption (การดูแลคนขณะเกิดวิกฤต):**
- Life Safety เป็นอันดับ 1 เสมอ (§8.4.4.6)
- Welfare checks — ตรวจสอบสภาพของพนักงานทุกคน
- Family notification — แจ้งครอบครัวพนักงานที่ได้รับผลกระทบ
- Alternate work arrangements — Work from home, Hot site
- Clear chain of command — ใครตัดสินใจแทนถ้า Key Person ไม่ available

**After Disruption (การฟื้นฟูหลังวิกฤต):**
- Psychosocial support — บริการให้คำปรึกษา EAP
- Return-to-work program
- Lessons learned สำหรับ BCM team
- Recognition — ยกย่องผู้ที่ทำงานหนักในช่วงวิกฤต

#### Call Tree Design (ISO/TS 22330)
```
ลำดับการ Notify ที่ถูกต้อง:
1. Life Safety alert (Everyone immediately)
2. BC Team activation (BCM Coordinator → Team Leads)
3. Senior Management notification
4. Extended team notification
5. External stakeholders
   ├── Customers (ผู้ได้รับผลกระทบ)
   ├── Suppliers (Critical suppliers)
   ├── Regulators (ตามกฎหมาย)
   └── Media (ผ่าน spokesperson เท่านั้น)
```

**Software Implementation สำหรับ People Aspects:**
```
call_tree_contacts table:
- name, role, mobile, alternate_mobile, email, line_id
- notify_order (1=first, 2=second...)
- backup_contact_id (FK ไปยัง contact อื่น ถ้าติดต่อไม่ได้)
- location (office/remote/field)
- special_needs (ผู้พิการ, ต้องการความช่วยเหลือพิเศษ)
- family_emergency_contact_name, family_emergency_contact_phone
```

#### Psychosocial Indicators ที่ต้อง Monitor
- Absenteeism rate หลังวิกฤต
- Productivity recovery rate
- Employee satisfaction score (post-incident survey)
- EAP utilization rate

---

### 2.5 ISO/TS 22331 — BC Metrics & Performance Indicators

**วัตถุประสงค์:** กำหนด KPI/Metrics สำหรับวัดประสิทธิผล BCMS

#### 3 ประเภท Metrics

| ประเภท | คำอธิบาย | ตัวอย่าง |
|--------|----------|----------|
| **Leading Indicators** | วัดก่อนเกิดเหตุ (Proactive) | % Exercise completed, % BCP updated |
| **Lagging Indicators** | วัดหลังเกิดเหตุ (Reactive) | Actual RTO vs. Target RTO |
| **In-Process Indicators** | วัดระหว่างดำเนินการ | % CAPA closed on time |

#### Core BCMS KPIs (ISO/TS 22331)

**BIA & Risk:**
- `bia_coverage_pct` — % ของ Critical Processes ที่มี BIA ครบถ้วน
- `bia_review_currency` — % BIA ที่ review ภายใน 12 เดือน
- `risk_treatment_rate` — % High Risk ที่มี Treatment Plan

**BC Planning:**
- `bcp_coverage_pct` — % Critical Processes ที่มี BC Plan
- `bcp_currency_pct` — % Plans ที่ update ภายใน 12 เดือน
- `resource_gap_count` — # Resource Requirements ที่ยังไม่ได้จัดหา

**Exercise & Testing:**
- `exercise_completion_rate` — % Exercise ตาม Annual Plan ที่ทำแล้ว
- `exercise_objective_achievement` — % Objectives ที่ผ่านใน Exercise
- `it_dr_rto_achievement` — Actual Recovery Time vs. Target RTO (IT DR)
- `capa_closure_rate` — % CAPA จาก Exercise ที่ปิดได้ตามกำหนด

**Capability:**
- `trained_staff_pct` — % BCM Team ที่ผ่านการ Train ภายใน 12 เดือน
- `call_tree_accuracy` — % Contact ใน Call Tree ที่ยืนยันแล้ว
- `supplier_bcp_verified` — % Critical Suppliers ที่ตรวจ BCP แล้ว

**Incident Response:**
- `mtta` — Mean Time To Acknowledge (เวลาเฉลี่ยในการรับรู้ Incident)
- `mttr` — Mean Time To Recover (เวลาเฉลี่ยในการกู้คืน)
- `notification_delivery_rate` — % Mass Notification ที่ delivered สำเร็จ

#### Dashboard Design Principle (ISO/TS 22331 §6)
- แสดง **RAG Status** (Red/Amber/Green) สำหรับ KPI แต่ละตัว
- เปรียบเทียบ Actual vs. Target เสมอ
- Trend line (3-12 เดือนที่ผ่านมา)
- Drill-down จาก KPI → underlying data

```
สีสัญญาณ ISO/TS 22331:
Green  ≥ Target (ดี)
Amber  80-99% of Target (ต้องระวัง)
Red    < 80% of Target (ต้องแก้ไขทันที)
```

---

## 3. 🏗️ Architecture Rules — ข้อบังคับในการออกแบบ

### 3.1 Data Model Invariants
ทุกครั้งที่สร้าง table หรือ field ใหม่ ต้องตรวจสอบ:

```sql
-- ทุก table ที่เกี่ยวกับ BC ต้องมี:
org_id uuid NOT NULL              -- Multi-tenant isolation
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
-- Optional แต่แนะนำ:
deleted_at timestamptz            -- Soft delete (audit trail)
metadata jsonb DEFAULT '{}'       -- Extensible fields
```

### 3.2 Timing Hierarchy (เข้มงวด)
```
RPO < RTO < MTPD
MBCO = minimum service level ระหว่าง Recovery (0-100%)

ตัวอย่าง: ถ้า MTPD = 4 ชั่วโมง
  → RTO ≤ 3.5 ชั่วโมง (buffer 30 นาที)
  → RPO ≤ RTO (สูญเสียข้อมูลไม่เกิน RTO)
  → MBCO ≥ 50% ระหว่าง Recovery
```

ระบบต้อง **validate** และ **alert** เมื่อ User ตั้งค่าผิดกฎนี้

### 3.3 Audit Trail Requirement (ISO 22301 §9)
ทุก action สำคัญต้องเขียนลง `org_audit_logs`:
```typescript
// Required fields:
{ org_id, actor_id, action, target_type, target_id, details }

// Actions ที่ต้อง log:
bia_process_created / updated / approved / deleted
bc_plan_created / updated / approved / invoked
exercise_created / started / completed
aar_generated
mass_notification_sent
incident_declared / resolved
risk_created / updated / closed
capa_created / closed
management_review_completed
```

### 3.4 ISO 22301 Compliance Evidence
ฟีเจอร์ทุกอย่างต้องสามารถ **export เป็น evidence** สำหรับ Auditor ได้:
- BIA Report (evidence for §8.2)
- BC Plan Document (evidence for §8.4)
- Exercise Report + AAR (evidence for §8.5)
- Audit Log export (evidence for §9)
- Training Records (evidence for §7.2)
- Management Review Minutes (evidence for §9.3)

---

## 4. 🤖 AI Enhancement Opportunities

### 4.1 BIA Intelligence (ISO/TS 22317)
```
Input: แผนผังองค์กร + Process descriptions
Output: Pre-filled BIA form พร้อม Impact scoring เบื้องต้น
Prompt: "Based on this process description, estimate the financial,
         regulatory, reputational, and operational impact at T+1h,
         T+4h, T+24h, T+72h. Also suggest MTPD, RTO, RPO."
Model: claude-haiku-4-5 (cost-effective for bulk BIA)
```

### 4.2 BC Plan Auto-Draft (ISO 22313 §8.4)
```
Input: BIA data + Resource inventory + Org structure
Output: Draft BC Plan with filled sections
Prompt: "Create a BC Plan for [process] based on BIA:
         MTPD=[x], RTO=[y], Resources=[z]. Include:
         activation criteria, roles, procedures, communication script."
Model: claude-opus-4-8 (quality matters for BC Plans)
```

### 4.3 AI AAR Generator (ISO 22313 §8.5)
```
Input: Exercise record (objectives, activities, findings)
Output: Structured AAR JSON
Fields: executive_summary, strengths[], gaps[], corrective_actions[],
        iso_readiness (score 1-5), recommendations[]
Model: claude-haiku-4-5 (streaming optional)
```
✅ **ฟีเจอร์นี้ Deployed แล้ว** — `supabase/functions/generate-aar/index.ts`

### 4.4 Risk Narrative Generator
```
Input: risk_items (likelihood, impact, description)
Output: Executive-friendly risk narrative
Prompt: "Summarize these BC risks for a Board presentation.
         Highlight top 3 risks requiring immediate action."
```

### 4.5 Gap Analysis Intelligence
```
Input: bia_processes + bc_plans
Output: Coverage gaps + Priority recommendations
Logic: Which critical processes lack BC Plans?
       Which BC Plans haven't been tested?
       Which plans are outdated (>12 months)?
```
✅ **ฟีเจอร์นี้ Deployed แล้ว** — `GapAnalysisWidget` ใน Overview page

---

## 5. 📋 PLG Upsell Triggers — เชื่อมโยงมาตรฐานกับการ Upsell

| ISO Clause | Trigger Event | Upsell Message |
|-----------|---------------|----------------|
| §8.2 | User มี BIA process > 10 รายการ | "Upgrade เพื่อ AI BIA Auto-scoring" |
| §8.3.4 | User เพิ่ม Critical Supplier | "Enterprise: Supplier Risk Monitoring API" |
| §8.4.3 | ส่ง Mass Notification 3+ ครั้ง | "Pro: Real-time delivery tracking + SMS" |
| §8.5 | Exercise ครบ 3 ครั้ง | "Pro: AI AAR Generator + CAPA automation" |
| §9 | Report export 5+ ครั้ง | "Enterprise: ISO 22301 Audit Pack export" |
| §22330 | Call Tree > 20 contacts | "Pro: One-click Call Tree activation" |
| §22331 | Dashboard KPI > 10 metrics | "Enterprise: Real-time KPI dashboard" |

---

## 6. ✅ Response Format Rules

1. **เชื่อมโยง Clause เสมอ** — ทุก feature ที่สร้างต้องระบุ ISO Clause ที่รองรับ
2. **อธิบายเป็นภาษาไทย** — technical decisions ต้องอธิบายให้ non-technical stakeholder เข้าใจ
3. **Life Safety First** — §8.4.4.6 ถ้า Feature เกี่ยวกับ incident ต้องระบุว่าความปลอดภัยชีวิตเป็นอันดับ 1
4. **Timing Validation** — validate RPO < RTO < MTPD ทุกครั้งที่ user กรอก BIA data
5. **Audit Trail** — ทุก write operation ที่สำคัญต้อง log ลง `org_audit_logs`
6. **Evidence-ready** — ออกแบบ UI ให้สามารถ print/export เป็น ISO evidence ได้
7. **อย่า hardcode** — ค่า threshold (MBCO%, RTO minutes) ต้องเป็น configurable

---

## 7. 🗂️ มาตรฐานอ้างอิงข้ามกัน

```
ISO 22301 (Requirements)
    ├── ISO 22313 (Guidance)
    ├── ISO/TS 22317 (BIA detail)  ← §8.2
    ├── ISO/TS 22318 (Supply Chain) ← §8.3
    ├── ISO/TS 22330 (People)       ← §8.4.3, §8.4.4.6
    ├── ISO/TS 22331 (Metrics)      ← §9.1
    ├── ISO 22322 (Warning Systems) ← §8.4.3
    └── ISO 22398 (Exercises)       ← §8.5
```

**ลำดับความสำคัญ:** ISO 22301 เป็นมาตรฐาน Requirements หลัก  
มาตรฐาน TS/Guide อื่นๆ เป็น implementation guidance — ห้าม override ข้อกำหนดใน 22301

---

*Skill version: 1.0 | Created from: ISO 22313:2020, ISO/TS 22317, ISO/TS 22318, ISO/TS 22330, ISO/TS 22331*  
*Project: BCMS SaaS — D:\BCMS SaaS*