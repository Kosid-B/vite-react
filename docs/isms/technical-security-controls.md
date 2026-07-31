# มาตรการความมั่นคงทางเทคนิค (Technical Controls)
**CEO AI Thailand — ISO/IEC 27001:2022 controls 8.6, 8.11, 8.16, 8.26, 8.29, 8.34**

| | |
|---|---|
| เวอร์ชัน | 1.0 |
| วันที่ | 2026-07-07 |
| ทบทวน | ทุก 12 เดือน + เมื่อเปลี่ยนสถาปัตยกรรม |

## 8.6 การจัดการขีดความสามารถ (Capacity management)
เฝ้าติดตามการใช้ทรัพยากรเทียบขีดจำกัด plan:
| ระบบ | สิ่งที่ต้องดู | แหล่ง |
|---|---|---|
| Supabase | DB size, connections, egress, function invocations, storage | Dashboard → Reports/Usage |
| Cloudflare Workers | requests, CPU time, sub-requests, Durable Object usage | CF Dashboard → Analytics |
- **การดำเนินการ:** ทบทวนรายไตรมาส · ตั้ง alert เมื่อใกล้ขีดจำกัด plan · วางแผน scale ก่อนถึงเพดาน
- เชื่อม O (security-objectives) — เพิ่มเป็นตัวชี้วัดได้เมื่อมีลูกค้าจริง

## 8.11 การปกปิดข้อมูล (Data masking)
- **สถานะ:** สแกนโค้ด (2026-07-07) **ไม่พบการ log ค่าอ่อนไหวตรงๆ** (email/key/token/password) ✅
- **นโยบาย:** ห้าม log ค่าเต็มของ PII/secret · error message ห้ามเผยข้อมูลภายใน (stack/query/ค่า) เกินจำเป็น · service_role key ห้ามปรากฏใน log/response
- **anon key** = public by design (log ได้) แต่ **service_role/secret** ห้ามเด็ดขาด
- **ต่อเนื่อง:** ตรวจ log ใหม่เมื่อเพิ่มฟีเจอร์ (เชื่อม checklist 5.8)

## 8.16 กิจกรรมการเฝ้าติดตาม (Monitoring activities)
- **มีแล้ว:** Cloudflare/Supabase logs (8.15), Supabase security advisor, gitleaks + npm audit ใน CI (`security-scan.yml`)
- **ช่องว่าง:** ยังไม่มี **proactive alerting** เมื่อผิดปกติ
- **ต้องตั้ง:**
  - Supabase: log-based alert (auth ล้มเหลวถี่ผิดปกติ, error rate สูง)
  - Cloudflare: notification (error rate, traffic spike, Worker exception)
  - รัน [security_checks.sql](../../supabase/tests/security_checks.sql) ตามรอบ (ตรวจสิทธิ์ผิดปกติ — บทเรียน R13/R19)
- เชื่อม incident response (5.24) + threat intel (5.7)

## 8.26 ข้อกำหนดความมั่นคงของแอปพลิเคชัน (Application security requirements)
ฟีเจอร์ที่แตะข้อมูล Confidential/Restricted ต้องระบุ requirement ก่อนพัฒนา:
- การพิสูจน์ตัวตน + สิทธิ์ (RLS + owner-check + least-privilege grant)
- การจัดการ secret (env เท่านั้น)
- data flow + การจัดชั้น (ดู [information-classification-policy.md](information-classification-policy.md))
- PDPA/consent ถ้าเก็บ PII ใหม่
- ใช้ร่วมกับ checklist [isms-supporting-procedures.md](isms-supporting-procedures.md) §5.8 + secure development (8.25)

## 8.29 การทดสอบความมั่นคง (Security testing)
- **มีแล้ว:** [security_checks.sql](../../supabase/tests/security_checks.sql) — ชุดทดสอบ RLS/สิทธิ์ที่**รันซ้ำได้** (5 checks: anon ไม่เรียก sensitive RPC, RLS ครบ, authenticated เรียกได้, storage policy, lead_count public)
- **วิธีใช้:** รันก่อนทุก release หรือเมื่อสงสัยสิทธิ์เปลี่ยน — คืนแถว = FAIL
- **ต่อยอด:** เพิ่มเข้า CI/CD, เพิ่ม test RLS bypass เชิงลึก (พยายาม query ข้ามผู้เช่า), ทดสอบ input validation
- แยกจาก unit test ปกติ (TS strict + ESLint + Vitest = 8.25)

## 8.34 การป้องกันระหว่างการตรวจประเมิน (Protection during audit testing)
เมื่อทำ security audit/pentest บนระบบจริง ต้อง:
- **ตกลงขอบเขต (scope)** ก่อนเสมอ + ได้รับอนุมัติจากเจ้าของระบบ
- **read-only ก่อน** (บทเรียน incident playbook §2) — query ตรวจสอบก่อนแตะข้อมูล
- **backup ก่อน**ทดสอบที่อาจกระทบข้อมูล
- เลือกช่วงเวลา off-peak · จำกัดผลกระทบต่อ production
- บันทึกกิจกรรม audit เป็นหลักฐาน
- เชื่อม 5.35 (independent review), ข้อ 9.2 (internal audit)

## ความเชื่อมโยง
- 8.8 (vulnerabilities), 8.15 (logging), 8.25/8.28 (secure dev/coding), 5.8 (security in project) · [security-objectives.md](security-objectives.md)
