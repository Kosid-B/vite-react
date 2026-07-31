# นโยบายความมั่นคงด้านบุคลากร (Personnel Security Lifecycle)
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.3, 5.11, 6.1, 6.3, 6.5, 6.7**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ขอบเขต | พนักงาน ผู้รับเหมา ฟรีแลนซ์ทุกคนที่เข้าถึงระบบ/ข้อมูล |
| ทบทวน | ทุก 12 เดือน หรือเมื่อโครงสร้างทีมเปลี่ยน |

> **บริบท small team:** ปัจจุบันผู้ปฏิบัติงานหลักคนเดียว — เอกสารนี้เตรียมกระบวนการให้ครบ**ก่อนขยายทีม** (certification body คาดหวังให้มีพร้อม) + ระบุมาตรการชดเชยช่วงทีมเดียว
> เชื่อมกับ [hr-security-terms.md](hr-security-terms.md) (เงื่อนไขการจ้าง 6.2 + NDA 6.6)

## 5.3 การแบ่งแยกหน้าที่ (Segregation of duties)
- **สถานะจริง:** ทีมเดียว = คนเดียวทำทั้ง dev/deploy/ดูแล DB → **ไม่สามารถแบ่งแยกได้เต็มรูปแบบ** (ข้อจำกัดที่ยอมรับ — อนุมัติใน [management-commitment.pdf](management-commitment.pdf) §3)
- **มาตรการชดเชย (compensating controls)** จนกว่าจะมีทีม:
  - logging + review (Cloudflare/Supabase logs) เพื่อ traceability
  - MFA บัญชี admin (R3) ป้องกันการยึดบัญชี
  - migration tracking + verify ทุก GRANT/REVOKE (บทเรียน [[R19]])
  - แยก secret ออกจากโค้ด + gitleaks CI
- **เมื่อมีทีม:** แยกหน้าที่ deploy-to-prod / approve / dev ให้คนละคน

## 6.1 การคัดกรองก่อนจ้าง (Screening)
ก่อนให้สิทธิ์เข้าถึงระบบ/ข้อมูล ต้อง:
- ยืนยันตัวตน + ประวัติการทำงาน/อ้างอิงตามความเหมาะสมของตำแหน่ง
- สำหรับตำแหน่งเข้าถึงข้อมูล Confidential/Restricted → ตรวจเข้มขึ้น (เช่น ประวัติอาชญากรรมถ้ากฎหมายอนุญาต)
- ทำ**ก่อน**ให้ credential/สิทธิ์ · เก็บบันทึกการคัดกรองเป็นหลักฐาน

## 6.3 การสร้างความตระหนักและอบรม (Awareness & training)
- ผู้เข้าถึงระบบทุกคนต้องผ่าน security awareness **ก่อนเริ่มงาน** และทบทวน**ปีละครั้ง** (วัตถุประสงค์ O9 ใน [security-objectives.md](security-objectives.md))
- หัวข้อขั้นต่ำ: การจัดการรหัสผ่าน/MFA, phishing, การจัดการ secret, clear desk/screen (7.7), การรายงานเหตุการณ์ (6.8), PDPA
- เก็บบันทึกการอบรม (ใคร/เมื่อไร/หัวข้อ) เป็นหลักฐาน competence (ข้อ 7.2/7.3)

## 6.7 การทำงานระยะไกล (Remote working)
ธุรกิจทำงาน remote/cloud-first เป็นหลัก:
- อุปกรณ์ที่ใช้ต้องเป็นไปตาม [endpoint-device-policy.md](endpoint-device-policy.md) (BitLocker, auto-lock, Defender)
- เชื่อมต่อระบบผ่าน HTTPS/WSS เท่านั้น · ระวัง shoulder surfing ในที่สาธารณะ (7.7)
- ห้ามเก็บข้อมูล Confidential/Restricted บนอุปกรณ์/บริการนอกขอบเขต ISMS (เช่น OneDrive สำหรับงานทั่วไปเท่านั้น)
- Wi-Fi สาธารณะ: หลีกเลี่ยงการเข้าถึง production หรือใช้ความระมัดระวังเพิ่ม

## 6.5 + 5.11 การพ้นสภาพ/เปลี่ยนงาน และการคืนทรัพย์สิน (Offboarding)
เมื่อพนักงาน/ผู้รับเหมาพ้นสภาพหรือเปลี่ยนบทบาท ต้องทำ checklist:
- [ ] **เพิกถอนสิทธิ์เข้าถึงทันที** — ลบ/ปิดบัญชี Supabase, GitHub, Cloudflare, บริการที่เกี่ยวข้อง
- [ ] **หมุนคีย์/credential ที่บุคคลนั้นเคยเข้าถึง** (ไม่พึ่งแค่ลบบัญชี — บทเรียน [[R1]])
- [ ] **คืนทรัพย์สิน** (5.11): อุปกรณ์, สื่อบันทึก, เอกสาร
- [ ] **sanitize อุปกรณ์**ที่เคยเก็บข้อมูล ก่อนนำกลับใช้/คืน (ดู [device-disposal-policy.md](device-disposal-policy.md) 7.14)
- [ ] ยืนยันหน้าที่รักษาความลับ**ยังมีผลต่อเนื่อง**หลังพ้นสภาพ (NDA — [hr-security-terms.md](hr-security-terms.md))
- [ ] บันทึกการ offboarding เป็นหลักฐาน

## ความเชื่อมโยง
- 6.2/6.6 → [hr-security-terms.md](hr-security-terms.md) · 6.4 (วินัย) → [information-security-policy.md](information-security-policy.md)
- 7.9 (off-premises), 7.14 (disposal), 8.5 (MFA), 5.18 (access rights)
