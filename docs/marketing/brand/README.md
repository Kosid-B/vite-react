# Brand Assets — โปรไฟล์ + ไอคอน (2 แบรนด์)

รูปโปรไฟล์ FB/social + ไอคอน สร้างเป็น SVG แล้ว render เป็น PNG 1000×1000 (FB ครอปเป็นวงกลม)

| ไฟล์ | แบรนด์ | ใช้ตอนไหน |
|---|---|---|
| `ceo-ai-thailand-fb-profile.png` | CEO AI Thailand | โปรไฟล์เต็ม (มีข้อความ) — โพสต์/สื่อจอใหญ่ |
| `ceo-ai-thailand-icon.png` | CEO AI Thailand | ไอคอนล้วน — โปรไฟล์ FB/LINE (ย่อเล็กยังชัด) |
| `btctraining-fb-profile.png` | B. Training Consultant | โปรไฟล์เต็ม (โล่ + 20+ ปี) |
| `btctraining-icon.png` | B. Training Consultant | ไอคอนล้วน |

## แก้/สร้างใหม่
ไฟล์ `.html` คือ source (SVG + CSS) — แก้ข้อความ/สีในนั้นแล้ว render ใหม่:
```bash
node render.mjs <file.html> <out.png>
# ต้องมี playwright (เช่น global: /opt/node22/lib/node_modules/playwright)
```
- ธีม CEO AI: กรมท่า #0a0f1c + cyan #22d3ee + amber #f59e0b (หุ่นยนต์)
- ธีม B.TC: navy #0f2039 + ทอง #e6b84f (โล่คุณภาพ ISO/มอก. + badge 20+ ปี)

> หมายเหตุ: assets เหล่านี้เป็นไฟล์อ้างอิง/แหล่งต้นฉบับ ไม่ได้ถูก build เข้าแอป (อยู่ใน docs/)
