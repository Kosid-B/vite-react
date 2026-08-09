---
name: business-story-content
description: Turn a raw Thai business-story transcript (or topic) into a full content kit — a cleaned narration script, a branded lesson carousel (HTML → PNG cards via Playwright), and A/B captions/titles/thumbnails. Use for "คุณบอม"-style business-storytelling videos, repurposing a voice transcript into shareable content, or making a lesson carousel from any business case. Follows the T.R.U.S.T. honesty rule (no fabricated numbers/reviews).
---

# Business Story → Content Kit

แปลง "ถอดเสียง/หัวข้อเรื่องเล่าธุรกิจ" เป็นชุดคอนเทนต์พร้อมใช้ในคำสั่งเดียว:
1) สคริปต์คลิปเกลาแล้ว 2) การ์ด carousel (HTML → PNG) 3) แคปชัน/title/thumbnail A/B 4) รวมเป็น Content Kit .md

ไฟล์ประกอบ (โฟลเดอร์นี้):
- `carousel-template.html` — เทมเพลตการ์ด (dark navy + cyan · แบรนด์ CEO AI Thailand) รองรับภาษาไทย + export สวย
- `export-cards.mjs` — สคริปต์ Playwright ตัดการ์ดเป็น PNG ทีละใบ (@2x)

## กติกาสำคัญ (T.R.U.S.T. honesty)
- **ห้ามแต่งตัวเลข/สถิติ/รีวิว/ดีล** ที่ไม่ยืนยัน — ตัวเลขที่ยังไม่ชัวร์ ให้มาร์ก `🔴` แล้วบอกผู้ใช้ว่า "ตรวจแหล่งก่อนเผยแพร่"
- แก้คำถอดเสียงที่เพี้ยน (ชื่อคน/บริษัท/ศัพท์) ให้ถูก แต่ **คงข้อเท็จจริง/พรีมิสของผู้ใช้ไว้** ไม่เติมข้อมูลใหม่ที่ไม่มีในต้นฉบับ
- โฟกัส "บทเรียนเชิงกลยุทธ์ที่ป้องกันได้" มากกว่าตัวเลขหวือหวา

## ขั้นตอน

### 1) อ่าน + จับแก่น
อ่านถอดเสียง → ระบุ: (ก) hook/ดราม่า (ข) 4–6 บทเรียนหลัก (ค) ชื่อ/ศัพท์ที่ต้องแก้ (ง) ตัวเลขที่ต้องมาร์ก 🔴 (จ) CTA/ช่อง

### 2) สคริปต์คลิป (เกลา)
เขียนใหม่เป็น narration ลื่น ๆ แบ่งเป็นบีตพร้อม timecode (HOOK → จุดพลิก → why → บทเรียน → CTA) · คงน้ำเสียงผู้เล่า · มาร์ก 🔴 จุดที่ต้องตรวจ

### 3) การ์ด carousel
- คัด `carousel-template.html` มาแก้ enเนื้อหา: `.intro` (ปกบน), การ์ด `.cover`, การ์ดบทเรียน `01..05` (แก้ `.step`/`.num`/`h3`/`p`/`.tag`), การ์ด `.cta`
- **อย่าฝังตัวเลข 🔴 ที่ยังไม่ยืนยันลงบนการ์ด** (การ์ดถูกแชร์ต่อ) — ใส่ในแคปชันแทนแล้วให้ผู้ใช้เติมเลขที่ตรวจแล้ว
- Export: `node <skill-dir>/export-cards.mjs <carousel.html> <out-dir> "00-cover,01-xxx,02-xxx,03-xxx,04-xxx,05-xxx,06-cta"`
- ตรวจ 1–2 ใบด้วย Read (ดู Thai render/เลย์เอาต์) ก่อนส่ง · Chromium มีฟอนต์ไทย (TLWG) แล้ว
- Publish เป็น Artifact (favicon อีโมจิให้เข้าธีมเรื่อง) + SendUserFile รูป PNG

### 4) แคปชัน A/B
YouTube titles ×4 · thumbnail hooks ×3 · Reels/Shorts hooks · Facebook caption · YouTube description + timestamps · โน้ต A/B (หัวคลิป ดราม่า vs ตัวเลข · วัด retention 30 วิ + subscribe)

### 5) รวมเป็น Content Kit
เขียน `<topic>-content-kit.md` (checklist 🔴 ด้านบน + สคริปต์ + ตารางการ์ด + แคปชันครบ) แล้ว SendUserFile

## (ตัวเลือก) ทำเป็น Case Study + Skill ในแอป
ถ้าผู้ใช้ต้องการให้เรื่องนี้เข้าระบบด้วย:
- เพิ่มลง `src/data/caseStudies.ts` (`CASES`) ตาม interface `CaseStudy` (id/tag/company/title/industry/origin/result/color/lessons[]/keyLesson/applyTo[]) — โฟกัสบทเรียน เลี่ยงตัวเลขที่ยังไม่ยืนยัน
- เคสจะโผล่หน้า Case Studies + แปลงเป็น marketplace skill ได้ผ่านปุ่ม "💰 เสนอเป็น Skill" (`suggestSkillFromCase`)
- Gate: `npx tsc -b && npx eslint <file> && npx vitest run && npm run build` แล้ว commit/PR ตาม flow ของ repo

## Reference
สไตล์คอนเทนต์อิงหลัก /ai-dark-marketing (อารมณ์/curiosity/social proof เชิงจริยธรรม) + T.R.U.S.T. Framework (หน้า `/trust`)
