# การติดต่อหน่วยงานภายนอกและข่าวกรองภัยคุกคาม
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.5, 5.6, 5.7**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ทบทวน | ทุก 12 เดือน หรือเมื่อข้อมูลติดต่อเปลี่ยน |

## 5.5 การติดต่อหน่วยงานกำกับ (Contact with authorities)
รายชื่อ/ช่องทางที่ต้องติดต่อเมื่อเกิดเหตุ (เตรียมไว้ล่วงหน้าตามข้อกำหนด):

| หน่วยงาน | บทบาท | เมื่อไรต้องติดต่อ | ช่องทาง |
|---|---|---|---|
| **สคส.** (สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล / PDPC) | กำกับ PDPA | ข้อมูลส่วนบุคคลรั่วที่เข้าเกณฑ์แจ้งเหตุ (ภายใน 72 ชม.) | เว็บ PDPC / pdpc.or.th |
| **บก.ปอท.** (กองบังคับการปราบปรามการกระทำผิดเกี่ยวกับอาชญากรรมทางเทคโนโลยี) | อาชญากรรมไซเบอร์ | ถูกโจมตี/แฮก/ฉ้อโกงที่ต้องแจ้งความ | สายด่วน / สภ.ในพื้นที่ |
| **NCSA / ThaiCERT** | ประสานภัยไซเบอร์ระดับชาติ | เหตุการณ์ไซเบอร์รุนแรง/ต้องการความช่วยเหลือ | ncsa.or.th / thaicert |

> เมื่อเกิดเหตุกระทบ PII → ประเมินภาระแจ้งเหตุตาม PDPA ทันที (เชื่อม [incident-response-playbook.md](incident-response-playbook.md) §5)

## 5.6 การติดต่อกลุ่มผู้เชี่ยวชาญ (Special interest groups)
ช่องทางติดตามความรู้/แนวโน้มความมั่นคง (สมัคร/ติดตามอย่างน้อยตามรายการ):
- **OWASP** — แนวปฏิบัติ web/API security (owasp.org), OWASP Top 10
- **ThaiCERT / ชุมชนความมั่นคงไทย** — ข่าว/เตือนภัยในบริบทไทย
- **Security mailing list ของ stack ที่ใช้** — Supabase, Cloudflare, Deno, Node.js security announcements

## 5.7 ข่าวกรองภัยคุกคาม (Threat intelligence)
รับ advisory/แจ้งเตือนช่องโหว่ที่เกี่ยวกับ stack โดยตรง:

| แหล่ง | ครอบคลุม | การดำเนินการ |
|---|---|---|
| **GitHub Dependabot / Security advisories** | ช่องโหว่ dependency (npm) | เปิดใน repo (ทำงานคู่ `npm audit` CI ใน `security-scan.yml`) |
| **Supabase / Cloudflare status + security bulletins** | ช่องโหว่/เหตุขัดข้องของ platform | subscribe status page + เปิดแจ้งเตือน |
| **Anthropic changelog/status** | การเปลี่ยนแปลง API/ความปลอดภัย | ติดตาม |
| **CVE feed (Postgres/Deno/Node)** | ช่องโหว่ระดับ runtime | ทบทวนรายไตรมาส |

**การใช้ประโยชน์:** ข่าวกรองที่เกี่ยวข้อง → ประเมินเข้ากับ [risk-register.md](risk-register.md) → ถ้าเสี่ยงสูงเปิดเป็น action ทันที (เชื่อมวัตถุประสงค์ O4 ใน [security-objectives.md](security-objectives.md))

## ความเชื่อมโยง
- 8.8 (Technical vulnerabilities), 5.24 (Incident preparation), 8.16 (Monitoring)
