# SOP: Access Control & SSO Policy
**B. Training Consultant (M.E.A) Co., Ltd. — เอกสารควบคุมการเข้าถึงระบบ**
เวอร์ชัน 1.0 · บังคับใช้ ก.ค. 2569 · ผู้อนุมัติ: Managing Director

ครอบคลุม: CEO AI Thailand (ceoaithailand.org), TIS Automate และระบบภายในทั้งหมด

---

## 1. นโยบายการใช้ Single Sign-On (SSO)

1. **Centralized Identity** — ทุกบัญชีที่เกี่ยวข้องกับ TIS Automate และระบบภายในต้องผูกกับ
   Identity Provider (IdP) กลาง (เช่น Google Workspace สำหรับธุรกิจ หรือ Okta)
2. **Mandatory SSO** — ห้ามใช้ Login ด้วยรหัสผ่านแยกของแต่ละแพลตฟอร์ม หากระบบนั้นรองรับ SSO
3. **Enforced MFA** — แม้ใช้ SSO แล้ว ต้องเปิด MFA บนบัญชีหลัก (IdP) เสมอ เป็นปราการด่านแรก
   (สอดคล้องรายการความเสี่ยง R3)

## 2. ขั้นตอนการตั้งค่า SSO ต่อแพลตฟอร์ม

| แพลตฟอร์ม | วิธีการรองรับ SSO | หมายเหตุตามจริง (แผนที่ใช้อยู่) |
|---|---|---|
| **GitHub** (Kosid-B) | SAML SSO ผ่าน Google Workspace | ต้อง GitHub Enterprise — ระยะแรก: เปิด 2FA บังคับใน Organization + จำกัด collaborator แทน |
| **Cloudflare** | Cloudflare Zero Trust (Access) คุม Dashboard ผ่าน SSO | Zero Trust Free plan ใช้ได้ถึง 50 ผู้ใช้ — ทำได้เลย |
| **Supabase** (rsjbqmnvocvtveelselj + galtbbkcddugnsfkgyqm) | SSO ผ่าน Auth Providers (SAML/OIDC) เชื่อม IdP | SAML SSO ระดับ dashboard ต้อง Team plan — ระยะแรก: MFA บนบัญชี owner |
| **Resend** | SAML SSO | ต้องแผน Business/Enterprise — ระยะแรก: MFA + จำกัดผู้ถือบัญชี |

> **หลักปฏิบัติระยะเริ่มต้น (ก่อนมีงบ Enterprise)**: MFA ทุกบัญชี + least-privilege +
> แบบฟอร์มขอสิทธิ์ (ข้อ 3) + ทบทวนสิทธิ์รายไตรมาส — ยกระดับเป็น SSO เต็มรูปแบบเมื่อทีมโต

## 3. แบบฟอร์มการขอสิทธิ์เข้าถึงระบบ (Access Request Form — Template)

นำโครงสร้างนี้ไปทำ Google Form/Google Doc ให้พนักงานกรอกเมื่อขอเข้าใช้งานระบบ:

- **ชื่อ-นามสกุล:** ______________________
- **ตำแหน่ง/หน้าที่:** ______________________
- **ระบบที่ต้องการเข้าถึง:** ☐ GitHub ☐ Cloudflare ☐ Supabase (ระบุ project) ☐ Resend ☐ อื่นๆ ______
- **ระดับสิทธิ์ที่ขอ:** ☐ อ่านอย่างเดียว ☐ แก้ไข ☐ ผู้ดูแล
- **เหตุผลความจำเป็นในการเข้าถึง:** ______________________ (เพื่อรองรับการตรวจสอบ ISO)
- **ระยะเวลาที่ต้องการใช้งาน:** ☐ ถาวร ☐ ชั่วคราวถึงวันที่ ______
- **การอนุมัติโดย:** ______________________ (ลงชื่อผู้บริหาร/CEO) วันที่ ______

## 4. แนวทางการ Implement

1. **ตั้งค่า Identity Hub** — ใช้บัญชี Google Workspace ของบริษัทเป็น
   "แหล่งความจริงเพียงแหล่งเดียว" (Single Source of Truth)
2. **กำหนดกลุ่มผู้ใช้งาน (Group-based Access)**
   - *Developers* — เข้าถึง GitHub / Supabase ได้
   - *Admins* — เข้าถึงทุกอย่างรวมถึงตั้งค่าความปลอดภัย (ปัจจุบัน: support@b-tctraining.com)
   - *Auditors* — อ่านอย่างเดียว เพื่อตรวจเอกสาร ISO
3. **Audit Logs** — ส่ง Log การเข้าใช้งาน (Login Logs) จากทุกระบบเข้าช่องทางที่ตรวจสอบได้ง่าย
   ตามข้อกำหนด ISO ด้านการควบคุมและติดตามผล
   (Supabase: Auth Logs ใน dashboard · Cloudflare: Audit Log · GitHub: Security log)

## 5. การถอนสิทธิ์ (Revocation)

เมื่อพนักงานลาออก/ย้ายแผนก: ปิดบัญชีเดียวใน IdP → ทุกระบบถูกตัดการเข้าถึงทันที
(**Automatic Revocation**) — ระหว่างที่ยังไม่มี SSO เต็มรูปแบบ ให้ใช้ checklist ถอนสิทธิ์รายระบบ
ภายใน 24 ชม.: GitHub collaborator → Cloudflare member → Supabase org member → Resend team
→ workspace_members ในแอป (ผ่านหน้า ทีม / สมาชิก)

## เอกสารที่เกี่ยวข้อง
- `POLICY-ISO27001-DATA-CONTROL.md` — นโยบายการควบคุมข้อมูลตาม ISO/IEC 27001
- `CLAUDE.md` § Secrets / Environment Map (R11)
