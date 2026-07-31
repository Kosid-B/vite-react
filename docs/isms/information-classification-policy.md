# นโยบายการจัดชั้นความลับและการจัดการข้อมูล
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.12, 5.13**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ทบทวน | ทุก 12 เดือน |

## วัตถุประสงค์
จัดชั้นความลับของข้อมูล (5.12) และกำหนดวิธีติดป้าย/จัดการตามชั้น (5.13) เพื่อให้ปกป้องข้อมูลตามระดับความอ่อนไหว

## ระดับชั้นความลับ (4 ระดับ)

| ระดับ | นิยาม | ตัวอย่างข้อมูลในระบบ |
|---|---|---|
| **Public** | เปิดเผยได้ทั่วไป ไม่กระทบถ้ารั่ว | หน้าร้านสาธารณะ (`/b/<slug>`), ISO badge, เนื้อหาการตลาด, anon key (public by design) |
| **Internal** | ใช้ภายใน ไม่ควรเปิดสาธารณะ แต่ผลกระทบต่ำถ้ารั่ว | เอกสารภายใน, config ที่ไม่ใช่ secret, สถิติรวม |
| **Confidential** | ข้อมูลธุรกิจ/ลูกค้า — รั่ว = กระทบธุรกิจ/กฎหมาย | **ข้อมูลผู้ใช้/PII (email, ข้อมูลบัญชี), ข้อมูลธุรกิจในแอป, source code, ข้อมูลออเดอร์/RFQ** |
| **Restricted** | ความลับสูงสุด — รั่ว = เสียหายร้ายแรงทันที | **credential/secret (API keys), auth data (password hash, MFA), ข้อมูลการชำระเงิน, service_role key, DB connection string** |

## กฎการจัดการตามชั้น (Handling rules)

| มิติ | Public | Internal | Confidential | Restricted |
|---|---|---|---|---|
| **จัดเก็บ** | ที่ไหนก็ได้ | ในระบบ/repo | DB (RLS) + เข้ารหัส at-rest | secret manager เท่านั้น (env/Bitwarden) — **ห้ามใน repo/plaintext** |
| **ส่งผ่าน** | เปิดได้ | HTTPS | HTTPS/WSS + RLS | HTTPS + ไม่ log/แสดงค่า |
| **เข้าถึง** | ทุกคน | ทีม | authenticated + owner-check (RLS) | admin/service เท่านั้น + MFA |
| **กำจัด** | — | ลบปกติ | information deletion (8.10) | sanitize (7.14) + revoke |

## การติดป้าย (Labelling — 5.13)
- **ข้อมูลในระบบ (DB/แอป):** จัดชั้นโดย**โครงสร้าง**แทนการติดป้ายด้วยมือ — ตาราง/bucket ที่เก็บ Confidential/Restricted ต้องมี RLS + owner-check (ปัจจุบันบังคับครบ 26 ตาราง)
- **ไฟล์/เอกสาร:** ระบุชั้นในหัวเอกสาร (เช่น เอกสาร ISMS = Internal/Confidential) หรือชื่อโฟลเดอร์ (เช่น `CEO-Ai-Thailand-secrets` = Restricted)
- **Secret files:** อยู่ในโฟลเดอร์ Restricted แยก + BitLocker + backup เข้ารหัส (ดู [secrets-backup-procedure.md](secrets-backup-procedure.md))

## ความเชื่อมโยง
- 8.3 (Access restriction), 8.10 (Information deletion), 7.14 (Disposal), 5.34 (PII) — จัดชั้นเป็นฐานของการเลือก control
- ข้อมูล Confidential/Restricted = PII ต้องสอดคล้อง PDPA (ดู [legal-compliance-register.md](legal-compliance-register.md))
