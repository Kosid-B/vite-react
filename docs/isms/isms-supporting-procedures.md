# กระบวนการสนับสนุน ISMS
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.8, 5.35**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ทบทวน | ทุก 12 เดือน |

## 5.8 ความมั่นคงในการบริหารโครงการ (Security in project management)
เมื่อวางแผนฟีเจอร์/โปรเจกต์ใหม่ ต้องพิจารณาความมั่นคงตั้งแต่ต้น — ใช้ checklist นี้ก่อน merge/deploy:

- [ ] **ข้อมูลที่เกี่ยวข้องจัดชั้นอะไร** (Public/Internal/Confidential/Restricted) — ดู [information-classification-policy.md](information-classification-policy.md)
- [ ] **การเข้าถึง:** มี RLS + owner-check ครบไหม (ไม่เปิด anon เกินจำเป็น — บทเรียน [[R2]]/[[R20]])
- [ ] **Secret/credential:** อ่านจาก env เท่านั้น ไม่ hardcode/commit (gitleaks CI)
- [ ] **PII:** ถ้าเก็บข้อมูลส่วนบุคคลใหม่ → กระทบ RoPA/consent (PDPA) ไหม
- [ ] **RPC/function ใหม่:** grant เฉพาะ role ที่จำเป็น (least privilege) + verify ด้วย `has_function_privilege`
- [ ] **Migration:** ทำผ่านระบบ migration tracking (ไม่ apply SQL ตรงแบบไม่บันทึก — บทเรียน [[R19]])
- [ ] **ทดสอบความมั่นคง:** พิจารณา RLS bypass / access-control test (8.29)

> เชื่อมกับ 8.26 (Application security requirements) — ฟีเจอร์ที่แตะข้อมูล Confidential/Restricted ควรมี requirement เขียนไว้

## 5.35 การตรวจประเมินอิสระ (Independent review of information security)
ISMS ต้องได้รับการทบทวนโดยผู้ที่**เป็นอิสระจากผู้ปฏิบัติงาน** ตามรอบหรือเมื่อมีการเปลี่ยนแปลงสำคัญ:

| ประเด็น | แนวทาง (small team) |
|---|---|
| **ความถี่** | อย่างน้อยปีละ 1 ครั้ง (สอดคล้อง Internal Audit 9.2) |
| **ผู้ทบทวน** | ปัจจุบันทีมเดียว = ข้อจำกัด → ทางเลือก: (ก) จ้างผู้ตรวจภายนอก/ที่ปรึกษา (ข) เมื่อมีทีม ให้คนที่ไม่ได้ทำ operation เป็นผู้ตรวจ (ค) ใช้ certification body เป็น independent review เมื่อยื่นรับรอง |
| **ขอบเขต** | นโยบาย, การจัดการความเสี่ยง, SoA, การปฏิบัติตาม, ประสิทธิผลของ control |
| **ผลลัพธ์** | บันทึกข้อสังเกต + nonconformity → corrective action (10.2) → input ของ Management Review (9.3) |

> **หมายเหตุ small-team:** ในช่วงทีมเดียว การทบทวนอิสระเต็มรูปแบบทำได้จำกัด — บันทึกเป็นข้อจำกัดที่ยอมรับ และวางแผนใช้ผู้ตรวจภายนอก/CB เป็นตัวเติมความเป็นอิสระ

## ความเชื่อมโยง
- 5.8 → 8.25/8.26/8.29 (secure development) · 5.35 → ข้อ 9.2 (internal audit), 9.3 (management review), 10.2 (CAPA)
