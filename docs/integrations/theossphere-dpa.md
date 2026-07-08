# ข้อตกลงการประมวลผลและแบ่งปันข้อมูลส่วนบุคคล (DPA / Data Sharing Agreement)
**theossphere ↔ CEO AI Thailand — Context Handoff**
**PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562) · ISO/IEC 27001:2022 controls 5.19/5.20/5.34**

| | |
|---|---|
| เวอร์ชัน | 1.0 (ร่าง — รอลงนาม 2 ฝ่าย) |
| วันที่ร่าง | 2026-07-08 |
| มีผลเมื่อ | ทั้งสองฝ่ายลงนาม **และ** ก่อนเปิด `INTEGRATIONS.theossphereLive=true` |
| ทบทวน | ทุก 12 เดือน หรือเมื่อขอบเขตข้อมูล/วัตถุประสงค์เปลี่ยน |

> **การจำแนกความสัมพันธ์ (สำคัญ):** สำหรับ Context Handoff ทั้งสองฝ่ายเป็น **ผู้ควบคุมข้อมูลอิสระ
> (independent controllers)** — ไม่ใช่ผู้ควบคุม↔ผู้ประมวลผล theossphere = ผู้เปิดเผยข้อมูล (disclosing),
> CEO AI Thailand = ผู้รับข้อมูล (receiving) เพื่อวัตถุประสงค์ของตนเอง เอกสารนี้จึงเป็น
> **ข้อตกลงแบ่งปันข้อมูลระหว่างผู้ควบคุม (controller-to-controller data sharing)** ที่มี*ความยินยอมของเจ้าของข้อมูล*
> เป็นฐาน ครอบคลุมภายใต้ชื่อ "DPA" ตามที่คู่สัญญาเรียก

---

## 1. คู่สัญญา (Parties)
| ฝ่าย | บทบาทในการ handoff | ข้อมูลติดต่อ (กรอกตอนลงนาม) |
|---|---|---|
| **theossphere** | ผู้ควบคุมต้นทาง · ผู้เปิดเผยข้อมูล | ⬜ ชื่อนิติบุคคล / ผู้แทน / อีเมล DPO |
| **CEO AI Thailand** (บริษัท AI อัตโนมัติ) | ผู้ควบคุมปลายทาง · ผู้รับข้อมูล | support@b-tctraining.com · โทร 081-781-7773 |

## 2. คำนิยาม
- **ข้อมูลส่วนบุคคล / เจ้าของข้อมูล / ความยินยอม / ผู้ควบคุม / ผู้ประมวลผล** — ตามความหมายใน PDPA
- **Handoff** — การที่เจ้าของข้อมูล (สมาชิก theossphere) *กดส่งแผนธุรกิจของตนเอง* ไปยัง CEO AI Thailand
  ผ่าน signed token เพื่อนำไป pre-fill "บริษัท AI"
- **Token** — ข้อความที่ลงนาม HMAC-SHA256 บรรจุ payload แผน + consent (ดู `_shared/handoff.ts`)

## 3. วัตถุประสงค์และขอบเขตของการแบ่งปัน
- **วัตถุประสงค์เดียว:** ส่งแผนธุรกิจที่ผู้ใช้จัดทำใน theossphere ไปให้ CEO AI Thailand เพื่อ pre-fill
  และให้ทีม AI ทำงานต่อ (execution) — *ห้าม*ใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากนี้โดยไม่มีความยินยอมเพิ่มเติม
- **การแบ่งปันเกิดต่อเมื่อ**เจ้าของข้อมูลกดยินยอมเอง (`consent.given=true`) — ไม่มีการส่งอัตโนมัติเบื้องหลัง

## 4. ฐานการประมวลผล (Lawful basis)
- **ความยินยอม (PDPA ม.19)** เป็นฐานหลัก — token ที่ไม่มี `consent.given=true` ถูกปฏิเสธโดย verifier
- ผู้ใช้เห็นข้อความยินยอม (ไทย+อังกฤษ ตาม runbook) **ก่อน** redirect และเลือกเอง (checkbox default ไม่ติ๊ก)

## 5. ประเภทข้อมูลที่แบ่งปัน (data minimization)
| ข้อมูล | จำเป็น? | หมายเหตุ |
|---|---|---|
| ชื่อธุรกิจ / หมวดหมู่ / valueProp / mvbp / เป้าหมาย (แผนธุรกิจ) | ✅ | ไม่ใช่ข้อมูลอ่อนไหว (ม.26) |
| `refId` (opaque member reference) | ✅ | ใช้แทน raw member id |
| อีเมล | ⚠️ เฉพาะเมื่อมี consent scope `plan+contact` | มิฉะนั้นไม่ส่ง |
| ข้อมูลอ่อนไหว (ม.26) / เลขบัตรประชาชน / การเงิน | ❌ **ห้ามส่งเด็ดขาด** | |

## 6. หน้าที่ของ **theossphere** (ผู้เปิดเผย)
1. ขอความยินยอมที่ชัดแจ้ง เฉพาะเจาะจง และเก็บ **หลักฐาน consent** (timestamp `consent.at`) เป็นบันทึก
2. ลงนาม token ด้วย shared secret ตามสเปก (§A/§B ใน runbook) · ตั้ง `exp ≤ 10 นาที`
3. ส่งเฉพาะข้อมูลใน §5 (data minimization) · ไม่แนบข้อมูลอ่อนไหว
4. จัดทำ **RoPA** (ฝั่งส่งออก) + **Privacy Notice** ระบุปลายทาง CEO AI Thailand
5. เก็บ shared secret เป็นความลับ (secret store) · แจ้ง CEO AI ทันทีหากสงสัยว่ารั่ว → หมุน secret

## 7. หน้าที่ของ **CEO AI Thailand** (ผู้รับ)
1. ยืนยัน token ทุกครั้ง (ลายเซ็น HMAC + `exp` + `consent.given`) — ปฏิเสธถ้าไม่ผ่าน
2. ใช้ข้อมูลเพื่อ pre-fill เท่านั้น · เก็บชั่วคราวใน localStorage → ล้างทันทีหลังใช้ (one-shot)
3. จัดทำ **RoPA** (รายการ P7 — [../isms/ropa.md](../isms/ropa.md)) + **Privacy Notice** ([`LegalPage.tsx §2`](../../src/pages/LegalPage.tsx))
4. รองรับสิทธิเจ้าของข้อมูลสำหรับข้อมูลที่ตนถือ (เข้าถึง/ลบ/ถอนความยินยอม) — ผ่านการลบเวิร์กสเปซ หรือ support@b-tctraining.com
5. ใช้ RLS แยกผู้เช่า + เข้ารหัส in-transit (HTTPS/WSS) · ไม่แชร์ต่อบุคคลที่สามนอกผู้ประมวลผลย่อยที่ประกาศไว้

## 8. ความปลอดภัยทางเทคนิค (สรุปมาตรการ)
- Token ลงนาม HMAC-SHA256 (ปลอมไม่ได้ถ้าไม่มี secret) · `exp ≤ 10 นาที` จำกัด replay window
- ส่งผ่าน HTTPS เท่านั้น · ยืนยันฝั่ง server (Edge Function `handoff-import`) ไม่เชื่อ client
- **ก่อน scale:** เพิ่ม nonce dedup (ตาราง `handoff_nonces`) กัน replay ซ้ำ (ดู CAPA ใน theossphere-handoff.md)

## 9. สิทธิของเจ้าของข้อมูล
แต่ละฝ่ายรับผิดชอบคำขอใช้สิทธิสำหรับข้อมูลที่*ตนควบคุม* หากคำขอเกี่ยวกับการแบ่งปันนี้
ทั้งสองฝ่ายจะประสานงานกันภายในกรอบเวลาที่ PDPA กำหนด (โดยทั่วไป 30 วัน)

## 10. การเก็บรักษาและการลบ
- theossphere: เก็บหลักฐาน consent ตามนโยบายของตน
- CEO AI: แผนที่ pre-fill แล้ว **ล้างทันที** (one-shot) · ข้อมูลที่ผู้ใช้บันทึกต่อในเวิร์กสเปซอยู่ภายใต้ retention ปกติ + สิทธิลบ (R10)

## 11. การโอนข้อมูลข้ามประเทศ
ผู้ประมวลผลย่อยของ CEO AI (Supabase สิงคโปร์/สหรัฐฯ, Cloudflare) — ภายใต้มาตรการคุ้มครองที่เหมาะสม
(ดู [supplier-register.md](../isms/supplier-register.md)) · ทั้งสองฝ่ายต้องมั่นใจว่าสอดคล้อง PDPA หมวดการโอนต่างประเทศ

## 12. การแจ้งเหตุละเมิด (Breach notification)
ฝ่ายที่พบเหตุละเมิดข้อมูลที่เกี่ยวกับการแบ่งปันนี้ ต้องแจ้งอีกฝ่าย **ภายใน 72 ชั่วโมง** หลังทราบเหตุ
พร้อมข้อมูลเท่าที่มี เพื่อประเมินหน้าที่แจ้ง สคส. (PDPC) ตาม PDPA ม.37(4) · ดู [incident-response-playbook.md](../isms/incident-response-playbook.md)

## 13. ระยะเวลา ยกเลิก และตรวจสอบ
- มีผลจนกว่าฝ่ายใดฝ่ายหนึ่งบอกเลิกเป็นลายลักษณ์อักษร หรือปิด integration (`theossphereLive=false`)
- เมื่อยกเลิก: หยุดแบ่งปันทันที · หมุน/เพิกถอน shared secret
- แต่ละฝ่ายให้ความร่วมมือในการตรวจสอบการปฏิบัติตาม (compliance review) ตามสมควร

## 14. กฎหมายที่ใช้บังคับ
กฎหมายไทย · ข้อพิพาทอยู่ในเขตอำนาจศาลไทย · ยึด PDPA เป็นกรอบหลัก

## 15. การลงนาม
| ฝ่าย | ชื่อผู้มีอำนาจ | ตำแหน่ง | วันที่ | ลายเซ็น |
|---|---|---|---|---|
| theossphere | ⬜ | ⬜ | ⬜ | ⬜ |
| CEO AI Thailand | ⬜ | ⬜ | ⬜ | ⬜ |

---

## ความเชื่อมโยง
- [theossphere-activation-runbook.md](theossphere-activation-runbook.md) — เงื่อนไข 2 product (ครบ 4/4) + consent copy + go-live
- [theossphere-handoff.md](theossphere-handoff.md) — สถาปัตยกรรม handoff + CAPA (nonce dedup)
- [../isms/ropa.md](../isms/ropa.md) — RoPA รายการ P7 (handoff processing)
- [../isms/supplier-register.md](../isms/supplier-register.md) — R4 (DPA ผู้ประมวลผลย่อย · แยกจากข้อตกลงฉบับนี้)
- [../isms/legal-compliance-register.md](../isms/legal-compliance-register.md) — ข้อกำหนด PDPA (5.31/5.34)
