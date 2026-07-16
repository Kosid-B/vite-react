# Base44 Build Prompt — CEO AI Thailand (ครอบคลุมทั้งระบบ)

> ชุด prompt สำหรับสร้างแอป **CEO AI Thailand** ("บริษัท AI อัตโนมัติ") บน **Base44**
> วิธีใช้: วาง **§1 Master Prompt** ก่อนเพื่อสร้างโครง แล้วค่อยวาง **§4 Prompt รายโมดูล** ทีละอัน
> (Base44 สร้างแบบ iterative — เพิ่มทีละฟีเจอร์ได้ผลดีและแม่นกว่ายัดทุกอย่างในครั้งเดียว)
>
> อ้างอิงจากระบบจริง (CLAUDE.md). ปรับ/ตัดได้ตามต้องการ.

---

## §1. MASTER PROMPT (วางอันนี้เป็นอันแรก)

```
สร้างเว็บแอป SaaS ภาษาไทยชื่อ "CEO AI Thailand" (แบรนด์: บริษัท AI อัตโนมัติ)
แนวคิด: ให้ SME/ธุรกิจไทย "จ้างทีม AI ทั้งบริษัท" มาช่วยวางแผนกลยุทธ์ การตลาด ทำเอกสารมาตรฐาน
ISO วิเคราะห์ธุรกิจ และมี marketplace ให้เปิดหน้าร้าน + ซื้อขาย B2B

กลุ่มผู้ใช้: เจ้าของ SME, โรงงานอุตสาหกรรม, คนเริ่มธุรกิจ/ตกงาน, แม่ค้าออนไลน์

ธีมดีไซน์: โหมดมืด (dark) พื้นหลังกรมท่าเข้ม #0f172a, สีเน้น cyan #22d3ee และส้ม #f59e0b,
ตัวอักษรขาว, การ์ดมุมโค้ง, ทันสมัยแบบ tech startup, รองรับมือถือเต็มรูปแบบ (mobile-first)

โครงสร้างหลัก:
- มี Sidebar ซ้าย เป็นเมนูนำทางหลัก + แสดง badge แพ็กเกจของผู้ใช้ + ไอคอนล็อกหน้าที่ยังไม่ปลดล็อก
- ระบบล็อกอิน (อีเมล + รหัสผ่าน และ magic link ทางอีเมล)
- ผู้ใช้แต่ละคนอยู่ใน "Workspace" (บริษัท) ของตัวเอง เชิญสมาชิกได้ มี role: owner / admin / member
- ข้อมูลทั้งหมดของ workspace เก็บแยกกัน (คนอื่นเห็นไม่ได้) — บังคับสิทธิ์ตาม workspace

ระบบแพ็กเกจ (Plan) 4 ระดับ:
- Free (฿0) → Starter (฿390/เดือน) → Growth (฿1,490/เดือน) → Scale (฿5,900/เดือน)
- ผู้ใช้ใหม่ได้ทดลอง (trial) แพ็ก Scale ฟรี 15 วันอัตโนมัติเมื่อล็อกอินครั้งแรก
- บางหน้าปลดล็อกตามแพ็กเกจ: หน้าที่ต้องจ่ายจะแสดง "กำแพงอัปเกรด" (upgrade wall) พร้อมปุ่มไปหน้าแพ็กเกจ
- อีเมลแอดมิน support@b-tctraining.com = ได้ใช้ทุกอย่างฟรีเสมอ (Scale) + เห็นเมนูผู้ดูแลระบบ

หน้าแรก (Dashboard): แสดงภาพรวม KPI ธุรกิจ, ระดับบริษัท (Company Level แบบเกม), ภารกิจตั้งค่าเริ่มต้น
(Setup Quest), และทางลัดไปฟีเจอร์หลัก

เมนู Sidebar (สร้างเป็นหน้าเปล่ารอไว้ก่อน เดี๋ยวเพิ่มรายละเอียดทีหลัง):
Dashboard, บริษัท AI, ห้องบอร์ด, ทรัพยากร, เมืองบริษัท, Pulse & A/B, Marketplace,
หน้าร้านของฉัน, ซื้อขาย B2B (RFQ), ทีม/สมาชิก, แพ็กเกจ & ชำระเงิน, SaaS Analytics,
ISO 9001 QMS, AI Research, Case Studies, ผู้ดูแลระบบ (เฉพาะแอดมิน)

ภาษา: ไทยทั้งหมด. สร้างโครงหน้าและระบบล็อกอิน/workspace/แพ็กเกจก่อน แล้วรอคำสั่งเพิ่มฟีเจอร์รายหน้า
```

---

## §2. DATA MODEL (Entities) — วางต่อจาก Master

```
สร้าง entity/ตารางข้อมูลดังนี้ (ผูกกับ workspace ทุกตาราง ยกเว้นที่ระบุ):

1. Workspace: name, owner_email, plan (free/starter/growth/scale), trial_ends_at, created_at
2. WorkspaceMember: workspace_id, user_email, role (owner/admin/member)
3. Agent (พนักงาน AI): workspace_id, name, role_title, department, status, avatar
4. Task (งาน): workspace_id, title, description, assigned_agent_id, status (todo/doing/done),
   priority, due_date, result
5. Skill (ทักษะ/สินค้า): workspace_id, name, category, tier, price, description, is_official
6. FinanceEntry (การเงิน): workspace_id, type (income/expense), amount, note, date
7. Storefront (หน้าร้านสาธารณะ): workspace_id, slug (unique), name, description, value_prop,
   sector (หมวด DBD), phone, line_id, images[], published (bool)
8. RFQ (ใบขอเสนอราคา B2B): workspace_id, title, detail, budget, category, seller_slug (nullable),
   status (open/quoted/accepted/closed), created_by
9. Quote (ใบเสนอราคา): rfq_id, seller_workspace_id, price, note, status
10. Order (ออเดอร์): buyer_id, seller_id, amount, fee (3%), status
11. MarketplaceSkill (skill ที่วางขายกลาง): seller_workspace_id, name, category, tier, price, published
12. SkillAuction (ประมูล): skill_name, start_price, current_bid, end_at, status, winner_id
13. SkillBid: auction_id, bidder_workspace_id, amount, created_at
14. PaymentSubmission (สลิปโอนเงิน): workspace_id, plan, amount, slip_image, status
    (pending/approved/rejected), reviewed_by
15. ISOAssessment (ประเมิน ISO): workspace_id, standard (iso9001/14001/45001/22301),
    clauses[] (ข้อ 4-10 พร้อมสถานะ red/yellow/green), readiness_score
16. CaseStudy: workspace_id, title, summary, industry, lesson, is_builtin
17. Experiment (Pulse & A/B): workspace_id, enabled, uid, pulses[], assignments[]

กติกาสิทธิ์: ผู้ใช้เห็น/แก้เฉพาะข้อมูล workspace ตัวเอง. แอดมินระบบเห็นทุก workspace.
Storefront ที่ published=true และ RFQ ที่ status=open = สาธารณะ (คนอื่นเห็นได้)
```

---

## §3. ACCESS CONTROL & แพ็กเกจ (วางต่อ)

```
ตั้งค่าการปลดล็อกหน้าตามแพ็กเกจ (ถ้าแพ็กต่ำกว่าที่กำหนด ให้แสดงกำแพงอัปเกรด):
- ซื้อขาย B2B (RFQ): ต้องแพ็ก Starter ขึ้นไป
- AI Research, ทีม/สมาชิก, ISO 9001, SaaS Analytics: ต้องแพ็ก Growth ขึ้นไป
- ผู้ดูแลระบบ: เฉพาะอีเมลแอดมิน
- บริษัท AI (factory): ฟรีทุกแพ็ก

Trial: เมื่อผู้ใช้ล็อกอินครั้งแรก ตั้ง trial_ends_at = 15 วันถัดไป และให้สิทธิ์เท่าแพ็ก Scale
เมื่อ trial หมด: ลดเหลือ Free จนกว่าจะอัปเกรด
แสดงตัวนับวัน trial ที่เหลือใน Sidebar หรือ Dashboard
```

---

## §4. PROMPT รายโมดูล (วางทีละอันหลังโครงเสร็จ)

### 4.1 บริษัท AI (AI Company / Factory)
```
หน้า "บริษัท AI": ผู้ใช้สร้างและจัดการ "พนักงาน AI" (Agent) แต่ละตัวมีตำแหน่ง/แผนก
มอบหมายงาน (Task) ให้ agent ทำ, ติดตามสถานะ todo/doing/done แบบ Kanban
มีปุ่ม "ให้ AI ช่วย" ที่เรียก AI (LLM) มาแนะนำงาน/วางแผน/สรุปผลให้ (ใช้ integration AI)
แสดงผลงานที่ agent ทำเสร็จเป็นบันทึก
```

### 4.2 ห้องบอร์ด (BoardRoom)
```
หน้า "ห้องบอร์ด": CEO (AI) เสนอวาระประชุม (agenda) ให้ผู้ใช้อนุมัติ/ปฏิเสธ
แต่ละวาระที่อนุมัติจะเพิ่มค่าทักษะบริหาร/การตลาด (skill level) และปลดฟีเจอร์
มี 5 ระดับความคืบหน้า (gate) แสดงเป็นแถบความก้าวหน้า
```

### 4.3 ทรัพยากร (Resources)
```
หน้า "ทรัพยากร": จัดการรายการทรัพยากรของบริษัท (คน/เครื่องมือ/งบ) พร้อมจำนวน
C-Level (AI) ดูแลและขอเพิ่ม/ลด → CEO หรือบอร์ดอนุมัติ → AI จัดสรรอัตโนมัติ
คำขอก้อนใหญ่ส่งเข้าห้องบอร์ด, ทรัพยากรที่อนุมัติแล้วบันทึกเป็นรายจ่ายใน FinanceEntry อัตโนมัติ
```

### 4.4 เมืองบริษัท (Company City — Gamification)
```
หน้า "เมืองบริษัท": เกมจำลองเมืองที่เติบโตตามข้อมูลจริง (จำนวน agent/task/skill/การเงิน)
วาดเมืองเป็นภาพ (อาคารเพิ่มตามความก้าวหน้า), มีระบบรางวัลปลดล็อกตามการเงิน+ระดับ
(คูปองส่วนลด, ตำแหน่งแนะนำ), streak รายวัน (เข้าใช้ต่อเนื่อง)
```

### 4.5 Marketplace + หน้าร้านของฉัน (Storefront)
```
หน้า "หน้าร้านของฉัน": ผู้ใช้สร้างหน้าร้านสาธารณะ (Storefront) — ตั้งชื่อร้าน, slug, คำโปรย,
หมวดสินค้า, เบอร์โทร, LINE, อัปโหลดรูปสินค้า, กดเผยแพร่ (published)
มีการ์ดแนะนำให้ตั้งค่าร้านเสร็จใน 5 นาที (onboarding)
หน้า "Marketplace" (/b): แสดงร้านที่ published ทั้งหมด กรองตามหมวด ค้นหา
คลิกดูหน้าร้านรายร้าน (/b/<slug>) — สาธารณะ ไม่ต้องล็อกอิน
ทำ SEO: แต่ละหน้าร้านมี title/description/OG เฉพาะร้าน
```

### 4.6 ซื้อขาย B2B (RFQ / Trade)
```
หน้า "ซื้อขาย B2B (RFQ)": ผู้ซื้อโพสต์คำขอเสนอราคา (RFQ) — หัวข้อ, รายละเอียด, งบ, หมวด
ผู้ขายเห็น RFQ ที่เปิดอยู่ แล้วส่งใบเสนอราคา (Quote)
มีปุ่ม "AI ร่าง RFQ" และ "AI ร่างใบเสนอราคา" (เรียก AI ช่วยเขียนให้)
เมื่อตกลง → สร้าง Order + คิดค่าธรรมเนียม 3%
ปุ่มแชร์ RFQ ออกนอกแอป (คัดลอกข้อความ)
```

### 4.7 ISO Advisor (9001/14001/45001/22301)
```
หน้า "ISO 9001 QMS": ที่ปรึกษา ISO แบบ active
- เลือกมาตรฐาน (9001/14001/45001/22301)
- ประเมินความพร้อมทีละข้อ (ข้อ 4-10 ตามโครง Annex SL) ตั้งสถานะ red/yellow/green
- คำนวณคะแนนความพร้อม (readiness) + แสดง "สิ่งที่ต้องทำก่อน audit" + เอกสารบังคับที่ยังขาด
- ปุ่ม "จ้างที่ปรึกษา" → สร้าง RFQ อัตโนมัติส่งไปหน้าตลาด (เชื่อมกับโมดูล RFQ)
```

### 4.8 แพ็กเกจ & ชำระเงิน (Billing)
```
หน้า "แพ็กเกจ & ชำระเงิน": แสดง 4 แพ็ก (Free/Starter ฿390/Growth ฿1,490/Scale ฿5,900)
ปุ่มอัปเกรด → แสดง QR PromptPay (เบอร์ 081-781-7773 / บัญชีกสิกร 009-8-92560-0
ชื่อ บจก. บี. เทรนนิ่ง คอนซัลแทนท์) + อัปโหลดสลิป
สลิปเข้าคิวรออนุมัติ (PaymentSubmission status=pending) → แอดมินอนุมัติ → อัปเกรดแพ็กอัตโนมัติ
```

### 4.9 ผู้ดูแลระบบ (Admin)
```
หน้า "ผู้ดูแลระบบ" (เฉพาะอีเมลแอดมิน): 
- แท็บคิวชำระเงิน: อนุมัติ/ปฏิเสธสลิป
- แท็บสรุปผลการดำเนินงาน: รวม revenue/expense/task/deal ของทุก workspace + export CSV
- แท็บ marketplace: จัดการ skill ที่วางขาย + เปิดประมูล
- แท็บ A/B: ดูผลการทดลอง Pulse รวมข้ามผู้ใช้
```

### 4.10 SaaS Analytics + Pulse & A/B
```
หน้า "SaaS Analytics": แสดง MRR, churn, จำนวนผู้ใช้, retention cohort
หน้า "Pulse & A/B": ระบบวัดความพึงพอใจรายวัน (opt-in, ยินยอมก่อน, ไม่ระบุตัวตน) 
แบบ 😕🙂😄 + ระบบ A/B test ที่ผู้ใช้เห็นกลุ่มตัวเอง ปิด/ลบข้อมูลได้
```

### 4.11 เครื่องมือธุรกิจ (Tools submenu ใต้ "บริษัท AI")
```
เพิ่มเมนูย่อยเป็นเครื่องมือวิเคราะห์ธุรกิจ (แต่ละอันเป็นหน้า/ฟอร์มที่ AI ช่วยสร้างผลลัพธ์):
Journey Map, Conversion Funnel, ROI Calculator, Personas, Content Plan, Priority Actions,
Business Model Canvas, Product Roadmap, กลยุทธ์การตลาด, VRIO Analysis, SIPOC Process
```

### 4.12 Case Studies + AI Research
```
หน้า "Case Studies": คลังกรณีศึกษาธุรกิจ (built-in + ที่แอดมินนำเข้า) เรียนรู้บทเรียน
+ ปุ่ม "เสนอเป็น Skill" แปลงเคสเป็นสินค้าใน marketplace พร้อมประเมินราคาอัตโนมัติ
หน้า "AI Research": ให้ AI ค้นข้อมูล/วิจัยตลาดจากคำถาม (ใช้ integration ค้นหาเว็บ + LLM)
```

---

## §5. INTEGRATIONS ที่ต้องตั้งใน Base44

```
1. AI / LLM — สำหรับปุ่ม "ให้ AI ช่วย", ร่าง RFQ/ใบเสนอราคา, ประเมิน, วิจัย
   (Base44 มี AI ในตัว หรือเชื่อม Claude/OpenAI API)
2. Email — ส่งอีเมลยืนยัน/แจ้งเตือน (Base44 email หรือ Resend)
3. Web Search — สำหรับ AI Research (เชื่อม Serper.dev หรือ search API)
4. Payment — PromptPay QR (แสดง QR + อัปโหลดสลิป + อนุมัติเอง) เป็น MVP;
   ภายหลังเชื่อม payment gateway จริงได้
5. Analytics — Google Analytics 4 (ใส่ measurement ID)
```

---

## §6. ดีไซน์ (Design System)

```
- โหมดมืด: พื้นหลัง #0f172a (และ #0b1120), การ์ด #111827/#1e293b
- สีเน้น: cyan #22d3ee (ลิงก์/หัวข้อ), ส้ม #f59e0b (ปุ่ม CTA หลัก)
- ตัวอักษร: ขาว #ffffff, สีรอง #94a3b8
- การ์ดมุมโค้ง ~16-20px, เงานุ่ม, spacing โปร่ง
- ปุ่มหลัก = ส้มพื้นเต็ม, ปุ่มรอง = ขอบ cyan
- mobile-first: Sidebar ยุบเป็นเมนูล่าง/แฮมเบอร์เกอร์บนมือถือ
- โทน: มืออาชีพแบบ tech startup ไทย เข้าใจง่าย เป็นมิตรกับมือใหม่
```

---

## §7. หน้าสาธารณะ (ไม่ต้องล็อกอิน)

```
- /start : viral landing "เริ่มธุรกิจกับทีม AI ฟรี 15 วัน" — hero + ประโยชน์ + ปุ่มสมัคร
  (ออกแบบรับคนจากโซเชียล/TikTok โดยเฉพาะ)
- /b และ /b/<slug> : Marketplace + หน้าร้านสาธารณะ (มี SEO ต่อร้าน)
- /pricing : หน้าราคา/สินค้า/นโยบายคืนเงิน/ติดต่อ (สำหรับ KYC + ให้ข้อมูลลูกค้า)
```

---

## หมายเหตุการย้ายจากระบบเดิม (สำหรับผู้ทำ)

- ระบบจริงตอนนี้เป็น Vite+React SPA + Supabase + Cloudflare Workers — Base44 จะสร้างใหม่แบบ
  full-stack ในตัว (DB+auth+hosting) จึง **ไม่ต้อง** จำลอง Cloudflare Worker / edge function
- ฟีเจอร์ SEO ฝั่ง server (HTMLRewriter) ใน Base44 ใช้ meta ต่อหน้าที่แพลตฟอร์มจัดการให้แทน
- เริ่มจาก MVP: Master + Data model + (4.1 บริษัท AI, 4.5 Storefront, 4.6 RFQ, 4.8 Billing, 4.7 ISO)
  ก่อน แล้วค่อยเพิ่มโมดูล gamification/analytics ทีหลัง — จะได้แอปที่ใช้หาเงินได้เร็วสุด
