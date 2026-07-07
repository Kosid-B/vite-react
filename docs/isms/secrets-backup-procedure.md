# ขั้นตอนสำรอง Secrets เข้า Password Manager (ปิด R18)
**CEO AI Thailand — ISO/IEC 27001:2022 controls 8.1, 8.13, 8.24, 5.30 / อ้าง ISO 27040 backup**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-06 |
| แก้ปัญหา | [[R18]] — secrets โฟลเดอร์เดียวไม่มี backup, single point of failure |

## เป้าหมาย
ทำให้คีย์ลับทั้งหมดใน `C:\Users\Kosid\Documents\CEO-Ai-Thailand-secrets\` มี **สำเนาสำรองที่เข้ารหัส
และ sync อัตโนมัติ** เพื่อไม่ให้สูญถ้าโน้ตบุ๊กเครื่องเดียวเสีย/หาย/ถูกขโมย

## ทำไมต้อง password manager (ไม่ใช่ OneDrive)
- OneDrive เก็บไฟล์เป็น plaintext บน cloud นอกขอบข่าย ISMS + ถ้าบัญชี OneDrive ถูกยึด = คีย์รั่วทันที
- Password manager เข้ารหัสแบบ zero-knowledge (แม้ผู้ให้บริการก็อ่านไม่ได้) + บังคับ master password + MFA ได้
- Sync/backup ให้อัตโนมัติทุกอุปกรณ์ = แก้ single-point-of-failure ตรงจุด

## ไฟล์ที่ต้องสำรอง (ยืนยัน 2026-07-06)
| ไฟล์ | เก็บเป็น |
|---|---|
| `Project key.txt` | Secure Note (คัดลอกข้อความลงไป) หรือแยกเป็นรายการ/คีย์ |
| `RECOVERY-CODES-Kosid Keawtao.txt` | Secure Note ชื่อ "MFA Recovery Codes" |
| `factory_access.png` | File Attachment (Bitwarden รองรับแนบไฟล์) |

## ขั้นตอน (ทำครั้งเดียว ~5 นาที) — Bitwarden

1. **สมัคร Bitwarden** ที่ https://bitwarden.com (แผนฟรีพอสำหรับงานนี้)
   - ⚠️ ตั้ง **master password ที่แข็งแรงและไม่ซ้ำกับที่อื่น** — จำให้ได้/เก็บที่ปลอดภัย (นี่คือกุญแจดอกเดียว)
2. **เปิด MFA ให้บัญชี Bitwarden เอง** (Settings → Security → Two-step login) — ใช้ authenticator app
3. สร้างรายการใหม่ประเภท **Secure Note** ชื่อ `CEO AI Thailand — Project Keys`
   - เปิด `Project key.txt` → คัดลอกเนื้อหา → วางในช่อง Notes → Save
4. สร้าง Secure Note อีกอันชื่อ `CEO AI Thailand — MFA Recovery Codes`
   - คัดลอกเนื้อหา `RECOVERY-CODES-Kosid Keawtao.txt` → วาง → Save
5. แนบ `factory_access.png`: เปิดรายการ Project Keys → Attachments → เลือกไฟล์ → Save
6. **ทดสอบการกู้คืน**: ออกจากระบบ Bitwarden แล้วล็อกอินใหม่ ตรวจว่าเห็นทั้ง 3 รายการครบ
   (การทดสอบ restore = ข้อกำหนดของ control 8.13 backup ต้อง verify ได้จริง)

## สิ่งที่ห้ามทำ
- ❌ ห้าม copy โฟลเดอร์ secrets ขึ้น OneDrive/Google Drive/อีเมลตัวเองเป็น plaintext
- ❌ ห้ามส่งค่าคีย์ผ่านแชต/chat log ใดๆ (รวมถึงแชตกับ AI)
- ❌ ห้ามเก็บ master password ของ Bitwarden ไว้ในเครื่องเดียวกันแบบ plaintext

## หลังทำเสร็จ
- อัปเดต [[R18]] ใน [risk-register.md](risk-register.md) เป็น 🟢 ปิด (backup + verified restore)
- ต้นฉบับใน `CEO-Ai-Thailand-secrets\` **ยังเก็บในเครื่องได้** (BitLocker ป้องกันอยู่) — Bitwarden เป็นสำเนาสำรอง
- ทบทวน/อัปเดตสำเนาใน Bitwarden **ทุกครั้งที่ rotate คีย์** (ดู [[R1]])

## ความเชื่อมโยง
- [[R1]] key rotation — หลัง rotate ต้องอัปเดตสำเนาใน Bitwarden ด้วย
- [endpoint-device-policy.md](endpoint-device-policy.md) — ข้อกำหนด backup ของ endpoint
- control 8.13 (Backup) ต้องมี + ทดสอบ restore ได้ · 5.30 (ICT readiness) · 8.24 (key management)
