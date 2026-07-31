# Security Policy — CEO AI Thailand

## การรายงานช่องโหว่ (Vulnerability Disclosure)
_ISO/IEC 27001:2022 — control 6.8 (การรายงานเหตุการณ์), 5.5 (การติดต่อหน่วยงาน)_

หากพบช่องโหว่ด้านความมั่นคงปลอดภัยของแพลตฟอร์ม CEO AI Thailand
โปรดแจ้ง **support@b-tctraining.com** โดย **ไม่เปิดเผยสู่สาธารณะ** จนกว่าจะได้รับการแก้ไข

- ระบุ: ขั้นตอนการทำซ้ำ, ผลกระทบที่ประเมิน, ระบบ/หน้าที่เกี่ยวข้อง
- ธุรกิจจะตอบรับภายใน **3 วันทำการ** และแจ้งแผนแก้ไข
- ห้ามเข้าถึง/แก้ไข/ทำลายข้อมูลของผู้ใช้รายอื่นระหว่างการทดสอบ

## เวอร์ชันที่รองรับ
รองรับเฉพาะเวอร์ชัน production ล่าสุดที่ deploy บน Cloudflare Workers

## แนวปฏิบัติภายใน
- คีย์ลับทั้งหมดเก็บนอก repo (`.gitignore` + secret manager) — ห้าม commit
- CI มี secret scanning (gitleaks) + dependency audit — ดู `.github/workflows/security-scan.yml`
- รายละเอียด ISMS: `docs/isms/`
