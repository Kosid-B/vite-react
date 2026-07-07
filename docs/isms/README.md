# ISMS — CEO AI Thailand (ISO/IEC 27001:2022)

ชุดเอกสาร Information Security Management System (ISMS) ของธุรกิจ **B. Training Consultant**
สำหรับแพลตฟอร์ม **CEO AI Thailand** — จัดทำเพื่อวางฐานความมั่นคงปลอดภัยสารสนเทศและเตรียมความพร้อมสู่การรับรอง

> ⚠️ การรับรอง ISO/IEC 27001 จริงต้องผ่าน **Certification Body ที่ได้รับ accreditation**
> เอกสารชุดนี้เป็น baseline ภายใน (working documents) ยังต้องผ่านการทบทวน/อนุมัติโดยผู้บริหาร

## เอกสารในชุดนี้

| ไฟล์ | ข้อกำหนด | สถานะ |
|---|---|---|
| [information-security-policy.md](information-security-policy.md) | 5.2 นโยบายความมั่นคงสารสนเทศ | ร่าง — รออนุมัติผู้บริหาร |
| [risk-register.md](risk-register.md) | 6.1.2 การประเมินความเสี่ยง | ร่าง v1 (R1–R5) |
| [statement-of-applicability.md](statement-of-applicability.md) | 6.1.3 d) SoA | ร่าง — controls ที่ประเมินแล้ว |
| [storage-security.md](storage-security.md) | ISO 27040 (เสริม 8.10–8.13, 8.24, 5.9) | ร่าง — ประเมิน storage 5 ชั้น |

## ขอบเขต ISMS (ข้อ 4.3 — Scope)

**รวมอยู่ในขอบเขต:**
- แพลตฟอร์ม SaaS "CEO AI Thailand" (เว็บแอป React + Cloudflare Worker + AI Agent)
- ฐานข้อมูล + auth ของผู้ใช้ (Supabase) — รวมข้อมูล workspace, PII ผู้ใช้, ข้อมูลแผนธุรกิจของลูกค้า
- ท่อ CI/CD และการจัดการคีย์ลับ (GitHub Actions, secret storage)

**ผู้ให้บริการภายนอกที่เกี่ยวข้อง (5.19–5.23):** Cloudflare (โฮสต์/CDN), Supabase (DB/auth), Anthropic (AI API), Resend (อีเมล)

**นอกขอบเขต:** อุปกรณ์ส่วนตัวพนักงานที่ไม่เชื่อมต่อระบบ production, ระบบออฟไลน์ของสำนักงาน

## บริบทและผู้มีส่วนได้เสีย (ข้อ 4.1–4.2)
- **ภายใน:** ทีมพัฒนา/ผู้ดูแลระบบ (ปัจจุบันเป็นทีมขนาดเล็ก), ผู้บริหาร
- **ภายนอก:** ลูกค้าธุรกิจ SME ไทย, ผู้ให้บริการ cloud, หน่วยงานกำกับ (PDPA)
- **ข้อกำหนดที่ต้องปฏิบัติ:** PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล), เงื่อนไขสัญญาผู้ให้บริการ
