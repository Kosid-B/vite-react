---
name: market-validation
description: "Market Validation Skill (Data-Driven Discovery) — คัดกรองไอเดียก่อนเริ่มลงมือสร้าง (Build) เพื่อลดความเสี่ยงทำของที่ไม่มีคนจ่ายเงิน — ใช้เมื่อได้ไอเดียสินค้า/บริการ/โมดูลใหม่ ก่อนอนุมัติพัฒนา"
allowed-tools: Read
metadata:
  author: b-training-consultant
  version: "1.0"
---

# Market Validation Skill (Data-Driven Discovery)

**เป้าหมาย**: คัดกรองไอเดียก่อนเริ่มลงมือเขียนโค้ด (Build) เพื่อลดความเสี่ยงในการทำของที่ไม่มีคนจ่ายเงิน

## A. Validation Frameworks (กรอบแนวคิด)

- **Customer Discovery**: การจำลองการสัมภาษณ์ลูกค้า (Customer Interview) เพื่อหา Pain Point ที่แท้จริง แทนการสรุปความต้องการเอง
- **Willingness-to-Pay Analysis**: วิเคราะห์ราคาและมูลค่า (Value Proposition) โดยใช้ข้อมูล RFM (Recency, Frequency, Monetary) หรือแบบจำลองราคา SaaS
- **VRIO Analysis**: ตรวจสอบความได้เปรียบทางการแข่งขันก่อนพัฒนา ว่าไอเดียนั้นมีค่า (Value), หายาก (Rarity), ลอกเลียนแบบยาก (Inimitability) หรือไม่

## B. Validation Workflow (ขั้นตอนการตรวจสอบ)

| ขั้นตอน | เครื่องมือ AI Agent | ผลลัพธ์ที่คาดหวัง |
|---|---|---|
| Problem Hypotheses | Jobs-to-be-Done (JTBD) | ระบุว่าลูกค้า "จ้างงาน" อะไรเราทำ |
| Market Sizing | TAM/SAM/SOM Analysis | ขนาดของตลาดและกลุ่มเป้าหมายที่พร้อมจ่าย |
| MVP Feasibility | Feature Prioritization | ระบุฟีเจอร์ "ขั้นต่ำ" ที่ใช้ปิดการขายได้ทันที |
| Pre-Sale Test | Landing Page Concept | การทดสอบว่ามีใครคลิก "สนใจ/ลงทะเบียน" หรือไม่ |

## C. Decision Gate (เงื่อนไขการตัดสินใจ)

- **Kill Switch**: หากวิเคราะห์แล้วพบว่าไอเดียไม่มี Pain Point ที่ชัดเจน หรือตลาดเล็กเกินไป Agent ต้อง **รายงานความเสี่ยงและเสนอ "Pivot Idea" ทันที** แทนที่จะเริ่มสร้างระบบ
- **Evidence-Based**: ทุกข้อเสนอแนะเรื่องสินค้าต้องอ้างอิงจากข้อมูลพฤติกรรมลูกค้า (เช่น สถิติความสำเร็จในโปรเจกต์ก่อนหน้าของบริษัท B. Training Consultant)

## วิธีการนำไปใช้ (Agent Prompt Strategy)

เมื่อได้รับไอเดียใหม่ๆ ให้เรียกใช้ Agent ด้วยคำสั่งนี้:

> "ทำหน้าที่เป็น Validator: ช่วยวิเคราะห์ไอเดีย [ชื่อโปรเจกต์] โดยใช้ VRIO Analysis
> และช่วยร่างบทสัมภาษณ์ลูกค้าเป้าหมาย 5 ข้อ เพื่อตรวจสอบว่า Pain Point นี้รุนแรงพอ
> ที่ลูกค้ากลุ่ม [กลุ่มเป้าหมาย] จะยอมจ่ายเงินซื้อ TIS Automate module นี้หรือไม่"

## การเชื่อมกับเครื่องมือในระบบ CEO AI Thailand

- **Pre-Sale Test ทำได้จริงในระบบ**: เปิดหน้าร้าน (เมนู "หน้าร้านของฉัน") พร้อมสินค้า pre-order
  → แชร์ลิงก์ `/b/<slug>` → วัดจากแผง 🧪 พิสูจน์ไอเดีย (เป้า 10 คนที่ทิ้งช่องทางติดต่อจริง)
- **VRIO Analysis**: ใช้หน้า VRIO Analysis ในเมนูเครื่องมือ
- **Market Sizing**: ใช้คู่กับ Skill "Market Insight & Strategy (Thailand)" สำหรับข้อมูลประชากร/กำลังซื้อรายจังหวัด
