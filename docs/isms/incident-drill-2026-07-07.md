# บันทึกการซ้อมรับมือเหตุการณ์ (Incident Response Drill)
**CEO AI Thailand — ISO/IEC 27001:2022 controls 5.24, 5.25, 5.26, 5.28 / แก้ R16**

| | |
|---|---|
| ประเภท | Tabletop exercise (ซ้อมบนโต๊ะ — จำลองสถานการณ์) |
| วันที่ | 2026-07-07 |
| ผู้เข้าร่วม | IT Security (facilitator), เจ้าของระบบ (review) |
| อ้างอิง playbook | [incident-response-playbook.md](incident-response-playbook.md) |

## วัตถุประสงค์
ทดสอบว่า incident playbook ใช้งานได้จริง (ปิดช่องว่าง "มีเอกสารแต่ไม่เคยซ้อม" — R16) + สร้างหลักฐานการซ้อมสำหรับตรวจประเมิน

## สถานการณ์จำลอง (Scenario)
> **08:00** — Anthropic Console แสดงยอดใช้งาน API พุ่งผิดปกติในช่วงกลางดึก (03:00–05:00) ที่ทีมไม่ได้ใช้งาน — สงสัยว่า `ANTHROPIC_API_KEY` อาจรั่ว/ถูกใช้โดยไม่ได้รับอนุญาต
> (อิงเหตุการณ์จริงคล้าย R20 — open proxy ที่เคยเปิดโล่ง)

## การเดินตาม Playbook (walkthrough)

| ขั้น | Playbook | การตอบสนองในการซ้อม |
|---|---|---|
| 1. รับรู้ | §1 ช่องทาง/เครื่องมือ | พบจาก Anthropic Usage dashboard (monitoring 8.16) |
| 2. ประเมินความรุนแรง | §2 severity | **Critical** — คีย์ที่ยังใช้งานอยู่อาจรั่ว (กระทบเงิน + อาจเข้าถึงข้อมูลผ่าน function) |
| 3. ตรวจ read-only ก่อน | §2 ข้อ 3 | ตรวจ edge functions ทั้งหมด (`list_edge_functions`) หา proxy/ฟังก์ชันแปลก · ตรวจ Anthropic usage log ช่วงเวลาที่พุ่ง |
| 4. เตรียมวิธีแก้ | §2 ข้อ 4 | rotate คีย์ + revoke ตัวเก่า + ลบฟังก์ชันต้องสงสัย (ขั้นตอนมีแล้วจาก R1/R20) |
| 5. ขอ confirm | §2 ข้อ 5 | แจ้งเจ้าของระบบ (Critical → แจ้งทันทีตาม §5) ขออนุมัติ rotate |
| 6. แก้ + verify | §2 ข้อ 6 | `supabase secrets set` คีย์ใหม่ + `wrangler secret put` + verify functions ไม่มีตัวแปลก |
| 7. บันทึก | §2 ข้อ 7 + §3 | บันทึกใน risk-register (รูปแบบ R-number) + เก็บหลักฐาน (§3): เวลา, query, ผลกระทบ |
| 8. เรียนรู้ | §4 | root cause? (ช่องรั่วอะไร) · ทำไมไม่จับเร็วกว่า? (ต้องตั้ง alert — 8.16) · ป้องกันซ้ำ? |

## ผลการซ้อม (Findings)
- ✅ Playbook **ครอบคลุมสถานการณ์จริง** — ทุกขั้นมีคำแนะนำชัดเจน ทำตามได้
- ✅ ทีมมีเครื่องมือ/ขั้นตอน rotate คีย์พร้อม (R1/R20 พิสูจน์แล้วว่าทำจริงได้)
- ⚠️ **ช่องว่างที่เจอจากการซ้อม:** ยังไม่มี **proactive alert** — ในสถานการณ์จริงพึ่งการเปิด dashboard ดูเอง (อาจช้า) → ควรตั้ง alert ตาม [technical-security-controls.md](technical-security-controls.md) §8.16
- ⚠️ ควรกำหนด **ผู้ติดต่อสำรอง** กรณีเจ้าของไม่พร้อม (single-person — เชื่อม business-continuity)

## Action items จากการซ้อม
1. ตั้ง alert Anthropic/Supabase/Cloudflare (8.16) — ปิดช่องว่างการตรวจจับ
2. รัน [security_checks.sql](../../supabase/tests/security_checks.sql) ตามรอบ (ตรวจสิทธิ์ผิดปกติ)
3. ทบทวน playbook หลังซ้อมทุก 12 เดือน

## สรุป
Playbook **ใช้งานได้จริง** — R16 ขยับจาก "มีเอกสาร" → "ซ้อมแล้ว มีหลักฐาน" · ช่องว่างหลักคือ detection (alert) ซึ่งบันทึกเป็น action ต่อไป
