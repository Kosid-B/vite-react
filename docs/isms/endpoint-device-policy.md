# นโยบายอุปกรณ์ปลายทาง (User Endpoint Devices)
**CEO AI Thailand — ISO/IEC 27001:2022 control 8.1**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-05 |
| แก้ปัญหา | control 8.1 (SoA), เชื่อมโยง [[R17]] อุปกรณ์เดียวถือ source code/key จริง |

## บริบทองค์กร (single-device setup)
ธุรกิจนี้มีขนาดเล็ก — ผู้ปฏิบัติงานใช้ **โน้ตบุ๊กเครื่องเดียว** เป็นอุปกรณ์หลักในการพัฒนา/ดูแลระบบ
(เก็บ source code, secrets ในเครื่อง เช่น `C:\Users\Kosid\Documents\CEO-Ai-Thailand-secrets\`, credential CLI ของ Supabase/Cloudflare/git)
งานอื่นที่**อยู่นอกขอบข่ายระบบ** (เอกสารทั่วไป, ไฟล์บัญชี ฯลฯ) จัดเก็บแยกใน **OneDrive**

จุดที่ต้องระวังเป็นพิเศษเพราะมีอุปกรณ์เดียว: **single point of failure** — เครื่องหาย/เสีย/ถูกขโมย = เสี่ยงทั้งข้อมูลรั่วไหลและธุรกิจหยุดชะงักพร้อมกัน
(ดู [[R15]] เรื่องไม่มี dev/staging แยก และ [[R1]] เรื่อง key rotation — ทั้งสองขยายผลกระทบถ้าเครื่องนี้หลุดมือ)

## ข้อกำหนดสำหรับอุปกรณ์นี้ (บังคับ)

| หัวข้อ | ข้อกำหนด | สถานะปัจจุบัน |
|---|---|---|
| **Full-disk encryption** | ต้องเปิดใช้เสมอ (BitLocker บน Windows) — ป้องกันข้อมูลกรณีเครื่องหาย/ถูกขโมย | ✅ เปิดอยู่แล้ว (ยืนยัน 2026-07-05) |
| **หน้าจอล็อกอัตโนมัติ** | ตั้ง auto-lock ไม่เกิน 5-10 นาทีเมื่อไม่ใช้งาน (เชื่อมโยง control 7.7 clear screen) | ต้องตรวจสอบ/ตั้งค่า |
| **บัญชีผู้ใช้ Windows** | ใช้บัญชีส่วนตัว (ไม่ใช้ local admin ตลอดเวลา) ตั้งรหัสผ่านแยกจากรหัสผ่านระบบอื่น | ต้องยืนยัน |
| **แยกพื้นที่เก็บข้อมูลตามความอ่อนไหว** | secrets/source code ของระบบ → โฟลเดอร์เฉพาะนอก repo (ตามที่ทำอยู่แล้วหลัง R1) ; งานทั่วไปที่ไม่เกี่ยวระบบ → OneDrive เท่านั้น **ห้าม sync โฟลเดอร์ secrets เข้า OneDrive** เพราะ OneDrive sync ขึ้น cloud นอก scope ISMS นี้ | ต้องตรวจสอบว่า OneDrive sync scope ไม่ครอบคลุมโฟลเดอร์ secrets/repo |
| **Endpoint protection** | เปิดใช้ Windows Defender (หรือเทียบเท่า) real-time protection + อัปเดตอัตโนมัติ | ต้องยืนยัน |
| **OS/software patching** | เปิด Windows Update อัตโนมัติ, อัปเดต browser/git/node เป็นระยะ | ต้องยืนยัน |
| **Backup ของข้อมูลในเครื่อง** | source code sync ผ่าน git remote (GitHub) อยู่แล้ว — แต่ secrets folder (`CEO-Ai-Thailand-secrets`) **ไม่มี backup แยก** หากเครื่องเสีย/หาย = กู้คืนไม่ได้ | 🔴 ช่องว่างใหม่ — แนะนำ backup secrets folder แยกต่างหาก (เช่น password manager หรือ encrypted backup — **ห้าม sync plaintext ขึ้น OneDrive**) |
| **การกำจัด/ขายเครื่อง** | ทำตาม [device-disposal-policy.md](device-disposal-policy.md) (control 7.14) ก่อนจำหน่าย/คืน/ทิ้งเครื่องนี้เสมอ | มีนโยบายแล้ว รอบังคับใช้จริงเมื่อถึงเวลา |

## OneDrive — ขอบเขตการใช้งาน
- OneDrive ใช้สำหรับงาน**นอกขอบข่าย ISMS นี้เท่านั้น** (เอกสารทั่วไป ไม่ใช่ source code/credential ของระบบ CEO AI Thailand)
- ถ้าในอนาคตต้องการใช้ OneDrive เก็บ backup ของโฟลเดอร์ที่เกี่ยวกับระบบ ต้องประเมินก่อนว่า:
  - ไฟล์นั้นมี secret/credential หรือไม่ (ถ้ามี ห้ามเก็บเป็น plaintext)
  - บัญชี OneDrive เปิด MFA หรือไม่
- ปัจจุบันยังไม่มีการยืนยันว่าโฟลเดอร์ secrets ถูกกันออกจาก OneDrive sync scope โดยชัดเจน — ควรตรวจสอบ (ดูตารางข้างบน)

## ความเชื่อมโยงกับ SoA control อื่น
- **7.7** (Clear desk/clear screen) — auto-lock หน้าจอ เป็นส่วนหนึ่งของ control นี้ด้วย
- **7.9** (Security of assets off-premises) — โน้ตบุ๊กเครื่องนี้คือ "off-premises asset" หลักของธุรกิจ นโยบายนี้ครอบคลุมส่วนนั้นไปด้วย
- **8.24** (Cryptography / key management) — full-disk encryption เป็นชั้นป้องกันเสริม ไม่ทดแทนการเก็บ key แยกที่ปลอดภัย (ดู [[R1]])
- **5.9** (Inventory of assets) — ควรบันทึกเครื่องนี้เป็นรายการสินทรัพย์อย่างเป็นทางการ (serial/asset tag) แทนที่จะอ้างอิงลอยๆ ใน CLAUDE.md
