# การประเมินความมั่นคงของผู้ส่งมอบและ Cloud
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.19, 5.20, 5.21, 5.22, 5.23, 8.12**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| แก้ปัญหา | [[R4]] (ทะเบียนความเสี่ยง) |
| ทบทวน | ทุก 12 เดือน + เมื่อเพิ่ม/เปลี่ยนผู้ส่งมอบ |

> ต่อยอดจาก [supplier-register.md](supplier-register.md) (ทะเบียนพื้นฐาน) — เอกสารนี้เพิ่ม**เกณฑ์ประเมิน + checklist DPA + การทบทวน + DLP**

## 5.19 เกณฑ์ประเมินความมั่นคงของผู้ส่งมอบ
ก่อนใช้/ต่อสัญญาผู้ส่งมอบที่ประมวลผลข้อมูล ประเมินอย่างน้อย:
- มีการรับรอง/มาตรฐาน (SOC 2, ISO 27001, ISO 27017/27018) หรือไม่
- นโยบายความมั่นคง + การเข้ารหัส (at-rest/in-transit)
- ประวัติเหตุการณ์ข้อมูลรั่ว + การแจ้งเหตุ
- ที่ตั้งข้อมูล (data residency) + การโอนข้ามพรมแดน (PDPA)
- SLA ความพร้อมใช้ + backup/DR

## 5.23 เกณฑ์เฉพาะ Cloud
- shared responsibility model ชัดเจน (อะไรเราดูแล/อะไร provider ดูแล)
- การควบคุมการเข้าถึง (IAM, MFA, least privilege)
- การแยกข้อมูลระหว่างลูกค้า (multi-tenancy isolation)
- ความสามารถ export/ลบข้อมูล (PDPA right-to-erasure + exit strategy)

## 5.20 Checklist ข้อตกลง/DPA (Addressing security in agreements)
สำหรับผู้ส่งมอบที่ประมวลผล PII ต้องมี/ตรวจ:
- [ ] **DPA (Data Processing Agreement)** ลงนาม/ยอมรับแล้ว
- [ ] ระบุ sub-processors + การแจ้งการเปลี่ยนแปลง
- [ ] ภาระการแจ้งเหตุข้อมูลรั่ว (breach notification) + กรอบเวลา
- [ ] สิทธิ์ audit / หลักฐานการรับรอง
- [ ] การคืน/ลบข้อมูลเมื่อสิ้นสุดสัญญา

## 5.21 ความเสี่ยง ICT Supply Chain
- **Dependency (npm):** `npm audit` ใน CI (`security-scan.yml`) + Dependabot (ดู [external-contacts-and-threat-intel.md](external-contacts-and-threat-intel.md) 5.7)
- ประเมิน license ของ dependency (ดู [legal-compliance-register.md](legal-compliance-register.md) 5.32)
- ระวัง supply-chain attack (typosquatting, compromised package) — pin version + review

## 8.12 การป้องกันข้อมูลรั่ว (Data Leakage Prevention) — data flow ไปผู้ส่งมอบ
| ข้อมูลที่ส่งออก | ไปที่ไหน | ชั้นความลับ | มาตรการกันรั่ว |
|---|---|---|---|
| Prompt/เนื้อหา AI (อาจมีข้อมูลธุรกิจผู้ใช้) | Anthropic (Claude API) | Confidential | ส่งผ่าน HTTPS + key เป็น secret · ทบทวน Anthropic data usage terms (ไม่ train บนข้อมูลลูกค้า) |
| อีเมลผู้ใช้ | Resend | Confidential/PII | ส่งเท่าที่จำเป็น · DPA |
| คำค้นหา | Serper (Google) | Internal | ไม่ส่ง PII ในคำค้น |
| ข้อมูลทั้งหมด | Supabase (storage/DB) | Confidential/Restricted | RLS + เข้ารหัส + DPA |

**หลักการ:** ส่งข้อมูลออกนอกระบบ**เท่าที่จำเป็น** · ไม่ log ค่า secret/PII เต็ม (เชื่อม 8.11 data masking) · ทบทวน data flow เมื่อเพิ่มฟีเจอร์ (5.8)

## 5.22 การทบทวนบริการผู้ส่งมอบตามรอบ
ทบทวนผู้ส่งมอบสำคัญ 4 ราย **ทุก 12 เดือน** หรือเมื่อ: เกิดเหตุการณ์, เปลี่ยน plan/ราคา, เปลี่ยน sub-processor
- ตรวจ SLA จริง vs สัญญา · สถานะ certification ล่าสุด · เหตุการณ์ในรอบ

## ตารางประเมินผู้ส่งมอบ (กรอกเมื่อดำเนินการจริง — ปิด R4)
| ผู้ส่งมอบ | บริการ | ข้อมูลที่ประมวลผล | DPA? | certification | สถานะประเมิน |
|---|---|---|---|---|---|
| **Supabase** | DB/Auth/Storage/Functions | ทั้งหมด (Restricted) | 🔴 ยืนยัน | SOC 2 (ตรวจ) | รอ |
| **Cloudflare** | Workers/DNS/CDN | traffic, static | 🔴 ยืนยัน | ISO 27001/SOC 2 (ตรวจ) | รอ |
| **Anthropic** | Claude API | prompt/AI content | 🔴 ยืนยัน usage terms | (ตรวจ) | รอ |
| **Resend** | Email | email/PII | 🔴 ยืนยัน | (ตรวจ) | รอ |

## ความเชื่อมโยง
- [[R4]] · [supplier-register.md](supplier-register.md) · 5.34 (PII) · 8.11 (masking) · [legal-compliance-register.md](legal-compliance-register.md) (PDPA)
