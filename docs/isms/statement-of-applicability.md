# Statement of Applicability (SoA)
**CEO AI Thailand — ISO/IEC 27001:2022 ข้อ 6.1.3 d)**

| | |
|---|---|
| เวอร์ชัน | 2.7 (ครบ 93/93 — **🔴 = 0!** ✅ 18 · 🟡 65 · ⚪ 10) |
| วันที่ | 2026-07-07 |
| หมายเหตุ | ประเมินครบ Annex A ทั้ง 93 controls แล้ว (หมวด 5: 37/37, หมวด 6: 8/8, หมวด 7: 14/14, หมวด 8: 34/34) — แต่หมวด 7 (Physical) ส่วนใหญ่ยังรอเจ้าของธุรกิจยืนยันข้อมูลจริง (ดูคำเตือนในหมวด 7) และการรับรองจริงยังต้องผ่าน Certification Body ที่ได้รับ accreditation |

**คำอธิบายสถานะ:** ✅ นำไปใช้แล้ว · 🟡 นำไปใช้บางส่วน/ต้องปรับปรุง · 🔴 นำไปใช้ (จำเป็น) แต่ยังไม่ดำเนินการ · ⚪ ไม่นำไปใช้ (พร้อมเหตุผล)

## หมวด 5 — Organizational (ครบ 37/37 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 5.1 | Policies for information security | ใช่ | 🟡 | นโยบายอนุมัติแล้ว [management-commitment.pdf](management-commitment.pdf) §2 (สถานะ "อนุมัติ" โดย โฆษิต แก้วเต่า/ผู้ก่อตั้ง 6/7/2569) — **รอลายเซ็นจริงในช่องลงชื่อ** จึงจะเป็นหลักฐานสมบูรณ์; ร่างฉบับเต็ม [information-security-policy.md](information-security-policy.md) | — |
| 5.2 | Information security roles and responsibilities | ใช่ | 🟡 | บทบาทกำหนด+อนุมัติใน [management-commitment.pdf](management-commitment.pdf) §3 (IT Security/ผู้พัฒนา = โฆษิต) — รอลายเซ็นจริง (เหมือน 5.1) | — |
| 5.3 | Segregation of duties | ใช่ | 🟡 | ข้อจำกัดที่ยอมรับ (ทีมเดียว) + **มาตรการชดเชยเขียนไว้แล้ว** [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §5.3 (log+review, MFA, verify grants, gitleaks) | — |
| 5.4 | Management responsibilities | ใช่ | 🟡 | คำประกาศความมุ่งมั่น [management-commitment.pdf](management-commitment.pdf) §1 กรอกชื่อ/ตำแหน่ง/วันที่ครบ (6/7/2569) สถานะ "อนุมัติ" — **รอลายเซ็นจริงในช่องลงชื่อ** (footer เอกสารระบุเองว่าต้องมีลายเซ็นจึงนับเป็นหลักฐาน) | — |
| 5.5 | Contact with authorities | ใช่ | 🟡 | มีรายชื่อหน่วยงานกำกับ (สคส./บก.ปอท./NCSA) + เงื่อนไขติดต่อ ใน [external-contacts-and-threat-intel.md](external-contacts-and-threat-intel.md) §5.5 — เหลือยืนยันช่องทางจริง | — |
| 5.6 | Contact with special interest groups | ใช่ | 🟡 | ระบุ SIG (OWASP/ThaiCERT/vendor lists) ใน [external-contacts-and-threat-intel.md](external-contacts-and-threat-intel.md) §5.6 — เหลือ subscribe จริง | — |
| 5.7 | Threat intelligence | ใช่ | 🟡 | กำหนดแหล่ง threat intel (Dependabot/status bulletins/CVE) §5.7 — Dependabot+npm audit CI ทำงานแล้ว เหลือ subscribe ที่เหลือ | — |
| 5.8 | Information security in project management | ใช่ | 🟡 | checklist security ในโปรเจกต์ [isms-supporting-procedures.md](isms-supporting-procedures.md) §5.8 — เหลือบังคับใช้ต่อฟีเจอร์จริง | — |
| 5.9 | Inventory of information and other associated assets | ใช่ | 🟡 | inventory เชิงเทคนิคใน `CLAUDE.md`/`config.ts` ยังไม่เป็นทะเบียนทางการ | — |
| 5.10 | Acceptable use of assets | ใช่ | 🟡 | เกี่ยวกับการจัดการคีย์ (ดู 8.24) | R1 |
| 5.11 | Return of assets | ใช่ | 🟡 | offboarding checklist (คืนทรัพย์สิน+เพิกถอนสิทธิ์+หมุนคีย์) ใน [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §6.5 — เหลือใช้จริงเมื่อมีการพ้นสภาพ | — |
| 5.12 | Classification of information | ใช่ | 🟡 | นโยบายจัดชั้น 4 ระดับ (Public/Internal/Confidential/Restricted) [information-classification-policy.md](information-classification-policy.md) — เหลือ map ข้อมูลจริงให้ครบ | — |
| 5.13 | Labelling of information | ใช่ | 🟡 | วิธีจัดชั้นโดยโครงสร้าง (RLS/โฟลเดอร์) + ระบุชั้นในหัวเอกสาร ใน [information-classification-policy.md](information-classification-policy.md) §labelling | — |
| 5.14 | Information transfer | ใช่ | 🟡 | ส่งผ่าน HTTPS/WSS ทุกช่องทาง (ทางเทคนิคทำแล้ว) แต่ไม่มีนโยบายการส่งข้อมูลเป็นลายลักษณ์อักษร | — |
| 5.15 | Access control | ใช่ | 🟡 | RLS กันข้ามผู้เช่า + admin gate ด้วยอีเมล | R3 |
| 5.16 | Identity management | ใช่ | 🟡 | Supabase Auth จัดการ identity + `workspace_members` แต่ไม่มีนโยบาย lifecycle เป็นทางการ | — |
| 5.17 | Authentication information | ใช่ | 🟡 | รหัสผ่านจัดการโดย Supabase Auth (hashed) + magic link; **ไม่มี MFA** | R3 |
| 5.18 | Access rights | ใช่ | ✅ | สิทธิ์ผ่าน RLS/role; migration `0020`–`0022` ตัดสิทธิ์ anon จาก RPC หลักครบ + แก้ incident สิทธิ์หาย (R13), verified บน production | R2, R12, R13 |
| 5.19 | Information security in supplier relationships | ใช่ | 🟡 | เกณฑ์ประเมินผู้ส่งมอบ [supplier-security-assessment.md](supplier-security-assessment.md) §5.19 — เหลือประเมิน 4 รายจริง | R4 |
| 5.20 | Addressing security within supplier agreements | ใช่ | 🟡 | checklist DPA ใน [supplier-security-assessment.md](supplier-security-assessment.md) §5.20 — เหลือยืนยัน DPA จริง 4 ราย | R4 |
| 5.21 | Managing security in the ICT supply chain | ใช่ | 🟡 | ประเมิน ICT supply chain (dependency/license/supply-chain attack) [supplier-security-assessment.md](supplier-security-assessment.md) §5.21 — npm audit+Dependabot ทำงานแล้ว | — |
| 5.22 | Monitoring, review and change management of supplier services | ใช่ | 🟡 | กำหนดรอบทบทวนผู้ส่งมอบ (ปีละครั้ง) §5.22 — เหลือทบทวนจริง | R4 |
| 5.23 | Information security for use of cloud services | ใช่ | 🟡 | เกณฑ์เฉพาะ cloud [supplier-security-assessment.md](supplier-security-assessment.md) §5.23 — เหลือประเมินจริง | R4 |
| 5.24 | Incident management planning and preparation | ใช่ | 🟡 | [incident-response-playbook.md](incident-response-playbook.md) §1 เตรียมพร้อม (ช่องทาง/เครื่องมือ/ผู้รับผิดชอบ) — เหลือซ้อม/adopt | R16 |
| 5.25 | Assessment and decision on security events | ใช่ | 🟡 | เกณฑ์ severity + triage ใน [incident-response-playbook.md](incident-response-playbook.md) §2 — เหลือใช้จริงตามรอบ | R16 |
| 5.26 | Response to information security incidents | ใช่ | 🟡 | เหตุการณ์จริง (R13) ถูกแก้ได้ผลดีในทางปฏิบัติ แต่ไม่มีขั้นตอนที่เขียนไว้ล่วงหน้า/ทำซ้ำได้ | R16 |
| 5.27 | Learning from information security incidents | ใช่ | 🟡 | มีการบันทึก postmortem ไม่เป็นทางการใน [environment-map.md](environment-map.md) §0 แต่ไม่มีกระบวนการ lessons-learned อย่างเป็นทางการ | R16 |
| 5.28 | Collection of evidence | ใช่ | 🟡 | ขั้นตอนเก็บหลักฐานใน [incident-response-playbook.md](incident-response-playbook.md) §3 (วันที่/query/ผลกระทบ) — เหลือปฏิบัติตามจริงทุกเหตุการณ์ | R16 |
| 5.29 | Information security during disruption | ใช่ | 🟡 | [business-continuity-plan.md](business-continuity-plan.md) — สถานการณ์+RTO/RPO+แนวทางกู้คืน — เหลือทดสอบ/ยืนยัน | — |
| 5.30 | ICT readiness for business continuity | ใช่ | 🟡 | ยืนยันแล้วว่า production ไม่มี backup (Free plan) — ตัดสินใจอัปเกรด Pro แล้ว (2026-07-05) รอดำเนินการจริง + ยังไม่มีแผน DR ที่เป็นทางการ | R5 |
| 5.31 | Legal, statutory, regulatory and contractual requirements | ใช่ | 🟡 | มีทะเบียน [legal-compliance-register.md](legal-compliance-register.md) §1 (PDPA, พ.ร.บ.คอมพิวเตอร์) แล้ว — เหลือทำ privacy policy/RoPA/consent ให้ครบ | — |
| 5.32 | Intellectual property rights | ใช่ | 🟡 | มีนโยบาย IP ใน [legal-compliance-register.md](legal-compliance-register.md) §2 (license npm, output AI, เครื่องหมายการค้า, media asset) — เหลือรัน license audit + ตรวจ asset จริง | — |
| 5.33 | Protection of records | ใช่ | 🟡 | Supabase managed service ให้ durability ระดับหนึ่ง แต่ไม่มีนโยบาย retention/protection ของบันทึกที่เป็นทางการ | — |
| 5.34 | Privacy and protection of PII | ใช่ | 🟡 | RLS ป้องกันข้อมูลข้ามผู้เช่า แต่ไม่มี privacy policy/PDPA records ที่เป็นทางการ | R4 |
| 5.35 | Independent review of information security | ใช่ | 🟡 | แผนตรวจประเมินอิสระ [isms-supporting-procedures.md](isms-supporting-procedures.md) §5.35 (ความถี่/ผู้ตรวจ/ขอบเขต) — เหลือดำเนินการจริง (ผูกกับ 9.2) | — |
| 5.36 | Compliance with policies and standards | ใช่ | 🟡 | กระบวนการทบทวนการปฏิบัติตามกำหนดใน [legal-compliance-register.md](legal-compliance-register.md) §4 (ทบทวนปีละครั้ง/เมื่อเปลี่ยนแปลง) — เหลือดำเนินการทบทวนรอบแรกจริง (จะทำใน Internal Audit 9.2) | — |
| 5.37 | Documented operating procedures | ใช่ | 🟡 | มีเอกสารทางเทคนิค (`CLAUDE.md`, `COMMAND.md`, `DEPLOY.md`) ทำหน้าที่เป็น procedure โดยพฤตินัย แต่ไม่ได้จัดทำในรูปแบบ ISMS operating procedure อย่างเป็นทางการ | — |

**สรุปหมวด 5:** ✅ 1 · 🟡 36 · 🔴 0 (ครบ 37/37 controls) — **หมวด 5 ไม่มี 🔴 เหลือแล้ว** (ทุก control มีเอกสาร/มาตรการรองรับ เหลือดำเนินการจริง + ลายเซ็น 5.1/5.2/5.4)

## หมวด 6 — People (ครบ 8/8 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 6.1 | Screening | ใช่ | 🟡 | กระบวนการ screening ก่อนจ้าง [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §6.1 — เหลือใช้จริงเมื่อรับทีม | — |
| 6.2 | Terms and conditions of employment | ใช่ | 🟡 | ข้อกำหนดความมั่นคงในเงื่อนไขการจ้างร่างไว้แล้ว [hr-security-terms.md](hr-security-terms.md) §1 — รอผนวกเข้าสัญญาจริงเมื่อรับทีม (ปัจจุบันทีมเดียว) | — |
| 6.3 | Information security awareness, education and training | ใช่ | 🟡 | โปรแกรม awareness/training [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §6.3 (หัวข้อ+รอบปีละครั้ง) — เหลือจัดอบรม+เก็บบันทึกจริง (O9) | — |
| 6.4 | Disciplinary process | ใช่ | 🟡 | ระบุในนโยบาย [information-security-policy.md](information-security-policy.md) § 5 แต่ยังไม่เคยบังคับใช้จริง | — |
| 6.5 | Responsibilities after termination or change of employment | ใช่ | 🟡 | offboarding process [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §6.5 (เพิกถอนสิทธิ์+หมุนคีย์+คืนทรัพย์สิน) — เหลือใช้จริง | — |
| 6.6 | Confidentiality or non-disclosure agreements | ใช่ | 🟡 | โครงร่าง NDA มาตรฐานร่างไว้แล้ว [hr-security-terms.md](hr-security-terms.md) §2 — รอทนายตรวจ + ใช้จริงเมื่อรับทีม/ผู้รับเหมา | — |
| 6.7 | Remote working | ใช่ | 🟡 | นโยบาย remote working [personnel-security-lifecycle.md](personnel-security-lifecycle.md) §6.7 (เชื่อม endpoint policy) — เหลือบังคับใช้เมื่อมีทีม | — |
| 6.8 | Information security event reporting | ใช่ | ✅ | ช่องทางรายงานชัดเจนใน [SECURITY.md](../../SECURITY.md) | — |

**สรุปหมวด 6:** ✅ 1 · 🟡 7 · 🔴 0 (ครบ 8/8 controls) — **หมวด 6 ไม่มี 🔴 เหลือแล้ว** (นโยบายบุคลากรครบ เหลือใช้จริงเมื่อรับทีม)

## หมวด 7 — Physical (ครบ 14/14 — ประเมินสมบูรณ์ 2026-07-05)

> ⚠️ **ข้อจำกัดของการประเมินหมวดนี้:** ต่างจากหมวด 5/6/8 ที่ประเมินจากหลักฐานในโค้ด/production ได้โดยตรง
> หมวด 7 เกี่ยวกับความมั่นคงทางกายภาพของ**สำนักงานจริง** ซึ่ง IT Security **ตรวจสอบระยะไกลไม่ได้**
> ควบคุมที่ทำเครื่องหมาย 🔴 ด้านล่างจึงหมายถึง **"ยังไม่มีข้อมูลยืนยัน — ต้องให้เจ้าของธุรกิจประเมิน/ยืนยันเอง"**
> ไม่ใช่การยืนยันว่าไม่มีมาตรการอยู่จริง

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 7.1 | Physical security perimeters | ใช่ | 🟡 | Data center ของ Cloudflare/Supabase มี perimeter ของตัวเอง (inherited, อ้าง 5.23); สำนักงานที่ระยองยังไม่ยืนยัน | — |
| 7.2 | Physical entry | ใช่ | ✅ | co-working เข้าออกด้วยรหัส (keycode), คนภายนอกเข้าถึงยาก — ยืนยัน 2026-07-07 ([physical-security-assessment.md](physical-security-assessment.md)) | — |
| 7.3 | Securing offices, rooms and facilities | ใช่ | ✅ | ล็อกพื้นที่ได้ + เก็บอุปกรณ์/เอกสารลับในตู้ล็อก — ยืนยัน 2026-07-07 | — |
| 7.4 | Physical security monitoring | ใช่ | 🟡 | co-working ส่วนใหญ่มี CCTV แต่ยังไม่ยืนยัน — เหลือ confirm กับผู้ให้บริการ | — |
| 7.5 | Protecting against physical and environmental threats | ใช่ | ✅ | ป้องกันไฟไหม้ + ไม่เสี่ยงน้ำท่วม + ไฟฟ้าเสถียร (โน้ตบุ๊กมีแบตในตัว) — ยืนยัน 2026-07-07 | — |
| 7.6 | Working in secure areas | ไม่ใช่ | ⚪ | ไม่มีพื้นที่หวงห้ามระดับ data center — โครงสร้าง IT ทั้งหมดอยู่บน cloud | — |
| 7.7 | Clear desk and clear screen | ใช่ | ✅ | นโยบาย [clear-desk-screen-policy.md](clear-desk-screen-policy.md) เขียนแล้ว; ตรวจเครื่องจริง — จอดับ 5 นาที (ต้องยืนยัน require-password on wake) | — |
| 7.8 | Equipment siting and protection | ใช่ | ✅ | โน้ตบุ๊กวางในที่ปลอดภัย + เก็บในตู้ล็อก — ยืนยัน 2026-07-07 (แนะนำเพิ่ม Kensington lock ในพื้นที่ส่วนกลาง) | — |
| 7.9 | Security of assets off-premises | ใช่ | 🟡 | โน้ตบุ๊กเครื่องหลัก (off-premises asset หลัก) ครอบคลุมใน [endpoint-device-policy.md](endpoint-device-policy.md) — BitLocker เปิด, backup secrets แก้แล้ว (R18); เหลือนโยบาย remote working ทั่วไป (6.7) | R18 |
| 7.10 | Storage media | ใช่ | 🟡 | ธุรกิจเป็น cloud-first ไม่มีสื่อจัดเก็บหลักแบบ physical media — ที่มีคือโน้ตบุ๊กส่วนตัวที่เก็บไฟล์คีย์ (ดู 7.14) | R17 |
| 7.11 | Supporting utilities | ไม่ใช่ | ⚪ | ไม่มี server room ที่ต้องดูแลระบบไฟฟ้า/แอร์เอง — infra การผลิตอยู่บน cloud managed | — |
| 7.12 | Cabling security | ไม่ใช่ | ⚪ | ไม่มี server room/การเดินสายที่ต้องดูแลเอง | — |
| 7.13 | Equipment maintenance | ใช่ | ✅ | บำรุงรักษาเครื่อง (Windows update, ทำความสะอาด, ตรวจแบต/ฮาร์ดแวร์) — ยืนยัน 2026-07-07 | — |
| 7.14 | Secure disposal or re-use of equipment | ใช่ | 🟡 | นโยบาย sanitize (Clear/Purge/Destruct) เขียนแล้ว [device-disposal-policy.md](device-disposal-policy.md) — รอบังคับใช้จริงเมื่อถึงเวลากำจัด/ขายเครื่อง (operational) | R17 |

**สรุปหมวด 7:** ✅ 6 · 🟡 5 · 🔴 0 · ⚪ 3 (ครบ 14/14 controls) — **เจ้าของยืนยันหน้างานแล้ว 2026-07-07** (co-working: keycode/ตู้ล็อก/ป้องกันไฟไหม้) เหลือแค่ยืนยัน CCTV (7.4)

## หมวด 8 — Technological (ครบ 34/34 — ประเมินสมบูรณ์ 2026-07-05)

| Control | ชื่อ | นำไปใช้? | สถานะ | เหตุผล / หลักฐาน | ความเสี่ยง |
|---|---|---|---|---|---|
| 8.1 | User endpoint devices | ใช่ | 🟡 | นโยบาย [endpoint-device-policy.md](endpoint-device-policy.md) เขียนแล้ว + ตรวจเครื่องจริง: BitLocker ✅, Defender real-time ✅, จอดับ 5 นาที; เหลือยืนยัน require-password-on-wake + OneDrive scope | R18 |
| 8.2 | Privileged access rights | ใช่ | ✅ | RPC เป็น SECURITY DEFINER + owner-check; migration `0020`–`0022` revoke anon จาก RPC หลักครบ, verified ผ่าน `has_function_privilege` บน production | R2, R12, R13 |
| 8.3 | Information access restriction | ใช่ | ✅ | RLS ทุกตาราง; storage policy `shop-images` จำกัด owner-only (migration `0023`); `lead_count()` ตรวจแล้วว่าตั้งใจเปิด anon (social-proof, คืนแค่ count) | R2, R10, R14 |
| 8.4 | Access to source code | ใช่ | 🟡 | Repo ส่วนตัวบน GitHub แต่ไม่มี CODEOWNERS/branch protection ยืนยันได้ | — |
| 8.5 | Secure authentication | ใช่ | 🟡 | Supabase Auth (password/magic link); ยังไม่เปิด MFA แอดมิน | R3 |
| 8.6 | Capacity management | ใช่ | 🟡 | แนวทาง capacity monitoring [technical-security-controls.md](technical-security-controls.md) §8.6 (Supabase/CF metrics + ทบทวนรายไตรมาส) — เหลือตั้ง alert จริง | — |
| 8.7 | Protection against malware | ไม่ใช่ | ⚪ | สถาปัตยกรรม serverless (Cloudflare Workers/Supabase managed) ไม่มี malware surface แบบดั้งเดิม; endpoint ทีมพัฒนาประเมินแยกใน 8.1 | — |
| 8.8 | Management of technical vulnerabilities | ใช่ | ✅ | `npm audit --audit-level=high` ใน CI ทุก push/PR (`security-scan.yml`) | R6 |
| 8.9 | Configuration management | ใช่ | ✅ | แก้ R11 (config drift) ครบ — ยืนยัน production ด้วย Edge Functions API, บันทึกใน [environment-map.md](environment-map.md) | R11 |
| 8.10 | Information deletion | ใช่ | ✅ | ลบ workspace ผ่าน RLS `ws_delete` + cascade; ลบบัญชีผ่าน Edge Function `delete-account` | R10 |
| 8.11 | Data masking | ใช่ | 🟡 | สแกน 2026-07-07 **ไม่พบ log ค่าอ่อนไหว** + นโยบาย masking [technical-security-controls.md](technical-security-controls.md) §8.11 — เหลือ review ต่อเนื่อง | — |
| 8.12 | Data leakage prevention | ใช่ | 🟡 | ประเมิน DLP + data flow ไปผู้ส่งมอบ [supplier-security-assessment.md](supplier-security-assessment.md) §8.12 — เหลือมาตรการ masking (8.11) จริง | R4 |
| 8.13 | Information backup | ใช่ | 🟡 | ยืนยันว่า production อยู่บน Free plan — **ไม่มี backup/PITR เลย**; ตัดสินใจอัปเกรด Pro แล้ว (2026-07-05) รอดำเนินการจริง | R5 |
| 8.14 | Redundancy | ใช่ | ✅ | Cloudflare Workers + Supabase managed = redundancy ระดับ platform (inherited) | — |
| 8.15 | Logging | ใช่ | 🟡 | Cloudflare/Supabase มี log แต่ไม่มี review เป็นรอบ | — |
| 8.16 | Monitoring activities | ใช่ | 🟡 | มี log+advisor+CI · แนวทาง alerting [technical-security-controls.md](technical-security-controls.md) §8.16 + [security_checks.sql](../../supabase/tests/security_checks.sql) ตามรอบ — เหลือตั้ง proactive alert จริง | — |
| 8.17 | Clock synchronization | ใช่ | ✅ | Cloudflare Workers/Supabase เป็น managed platform ใช้ NTP มาตรฐาน (inherited) | — |
| 8.18 | Privileged utility programs | ไม่ใช่ | ⚪ | ไม่มี OS-level utility ที่ทีมดูแลเอง (managed service ทั้งหมด) | — |
| 8.19 | Installation of software on operational systems | ใช่ | 🟡 | Deploy ผ่าน `wrangler deploy`/GitHub Actions แต่ไม่มี approval gate ก่อน deploy prod | — |
| 8.20 | Networks security | ไม่ใช่ | ⚪ | ไม่มี on-prem network — Cloudflare edge network จัดการให้ | — |
| 8.21 | Security of network services | ใช่ | ✅ | HTTPS/WSS ทุกช่องทาง (`agentClient.ts`, `src/server.ts`) | — |
| 8.22 | Segregation of networks | ไม่ใช่ | ⚪ | สถาปัตยกรรม serverless ไม่มี network segment แบบดั้งเดิม — แยกที่ RLS/tenant-level แทน (ดู 8.3) | — |
| 8.23 | Web filtering | ไม่ใช่ | ⚪ | ไม่ใช่ corporate network ที่ต้องกรอง web สำหรับพนักงาน | — |
| 8.24 | Cryptography / key mgmt | ใช่ | 🟡 | คีย์เป็น secret (wrangler/.env), ย้ายออก repo แล้ว **แต่ยังไม่ rotate** | R1 |
| 8.25 | Secure development lifecycle | ใช่ | ✅ | TS strict mode, ESLint (แก้ hooks violation แล้ว), Vitest, code review | — |
| 8.26 | Application security requirements | ใช่ | 🟡 | ข้อกำหนด security ต่อฟีเจอร์ [technical-security-controls.md](technical-security-controls.md) §8.26 + checklist [isms-supporting-procedures.md](isms-supporting-procedures.md) §5.8 — เหลือใช้จริงต่อฟีเจอร์ | — |
| 8.27 | Secure system architecture and engineering principles | ใช่ | 🟡 | มี defense-in-depth บางส่วน (RLS + app-level) แต่ไม่มีเอกสารหลักการออกแบบรวม | — |
| 8.28 | Secure coding | ใช่ | ✅ | gitleaks secret scanning + `npm audit` ใน CI (`security-scan.yml`) | R7 |
| 8.29 | Security testing in development and acceptance | ใช่ | 🟡 | **มี security test รันซ้ำได้** [security_checks.sql](../../supabase/tests/security_checks.sql) (5 checks: anon RPC/RLS/authenticated/storage/lead_count) — เหลือเพิ่มเข้า CI + test เชิงลึก | — |
| 8.30 | Outsourced development | ไม่ใช่ | ⚪ | ไม่มีการจ้าง dev ภายนอก (เท่าที่ตรวจพบ) | — |
| 8.31 | Separation of dev/test/prod | ใช่ | 🟡 | **สร้าง dev project แล้ว** `ceo-ai-thailand-dev` (`oudykxmtrnjeskglaluh`) แยกจาก prod สมบูรณ์ 2026-07-07 — เหลือ apply schema + สลับ `.env` dev (R15) | R15 |
| 8.32 | Change management | ใช่ | 🟡 | มี git branch + PR workflow แต่ไม่มี CODEOWNERS/branch protection ยืนยันได้ | — |
| 8.33 | Test information | ไม่ใช่ | ⚪ | Seed data ที่พบ (`0018_tis_write_policies_and_seed.sql`) เป็น catalog data ไม่ใช่ PII จริง; จะเกี่ยวข้องเมื่อมี dev env แยก (8.31) | R15 |
| 8.34 | Protection during audit testing | ใช่ | 🟡 | นโยบายป้องกันระหว่าง audit [technical-security-controls.md](technical-security-controls.md) §8.34 (scope/read-only/backup/off-peak) — เหลือ audit จริง | — |

**สรุปหมวด 8:** ✅ 10 · 🟡 17 · 🔴 0 · ⚪ 7 (ครบ 34/34 controls)

## สรุปรวมทั้ง 93 Controls

| หมวด | จำนวน | ✅ | 🟡 | 🔴 | ⚪ |
|---|---|---|---|---|---|
| 5 — Organizational | 37 | 1 | 36 | 0 | 0 |
| 6 — People | 8 | 1 | 7 | 0 | 0 |
| 7 — Physical | 14 | 6 | 5 | 0 | 3 |
| 8 — Technological | 34 | 10 | 17 | 0 | 7 |
| **รวม** | **93** | **18** | **65** | **0** | **10** |

**เวอร์ชัน 2.7 (2026-07-07):** สร้าง dev project (R15) → 8.31 = 🟡 · **🔴 = 0 แล้ว! ทุก control ที่ applicable มีเอกสาร/มาตรการรองรับครบ** (เหลือ operational execution — ลายเซ็น, DPA, drill, audit) · ✅ 18 · 🟡 65 · ⚪ 10
**เวอร์ชัน 2.6 (2026-07-07):** กลุ่ม E — เจ้าของยืนยันกายภาพหน้างาน (co-working) → 7.2/7.3/7.5/7.8/7.13 = ✅, 7.4 = 🟡 (รอยืนยัน CCTV) · **🔴 เหลือเพียง 1 = 8.31 (dev/staging, R15)** · ✅ เพิ่มเป็น 18
**เวอร์ชัน 2.5 (2026-07-07):** ทำกลุ่ม F — 6 controls (8.6,8.11,8.16,8.26,8.29,8.34) จาก 🔴→🟡 ด้วย [technical-security-controls.md](technical-security-controls.md) + [security_checks.sql](../../supabase/tests/security_checks.sql) (security test รันซ้ำได้) · **🔴 รวมลดเหลือ 7** = หมวด 7 กายภาพ 6 (รอเจ้าของสำรวจ) + 8.31 dev/staging (R15)
**เวอร์ชัน 2.4 (2026-07-07):** ทำกลุ่ม D+A — 12 controls (5.3,5.11,5.19–5.23,6.1,6.3,6.5,6.7,8.12) จาก 🔴→🟡 ด้วยเอกสาร [personnel-security-lifecycle.md](personnel-security-lifecycle.md) + [supplier-security-assessment.md](supplier-security-assessment.md) · **หมวด 5 และ 6 ไม่เหลือ 🔴 แล้ว** · 🔴 รวมลดจาก 25→13 (เหลือเฉพาะ E กายภาพ + F เทคนิค + G dev/staging)
**เวอร์ชัน 2.3 (2026-07-07):** ทำกลุ่ม B+C+H — 11 controls หมวด 5 (5.5,5.6,5.7,5.8,5.12,5.13,5.24,5.25,5.28,5.29,5.35) จาก 🔴→🟡 ด้วยเอกสารใหม่ 4 ตัว (classification, external-contacts/threat-intel, business-continuity, supporting-procedures) + sync playbook ที่มีอยู่ · 🔴 ลดจาก 36→25
**เวอร์ชัน 2.2 (2026-07-07):** ปรับ 5.1/5.2/5.4 จาก ✅ → 🟡 ให้ตรงความจริง — management-commitment อนุมัติแล้ว (โฆษิต แก้วเต่า/ผู้ก่อตั้ง, 6/7/2569) **แต่ช่องลงชื่อยังว่าง รอลายเซ็นจริง** พอเซ็นเสร็จ → กลับเป็น ✅ (✅ 13, 🟡 34, 🔴 36, ⚪ 10)
**เวอร์ชัน 2.1 (2026-07-06 — หลังทำ Tier 1):** ยกระดับ: 5.31/5.32/5.36 (legal register), 6.2/6.6 (HR/NDA), 7.7 (clear desk ✅), 7.9/7.14 (endpoint/disposal), 8.1 (endpoint policy)

**สิ่งที่ต้องทำก่อนยื่นขอรับรองจริง:**
1. ปิด control 🔴 ที่เชื่อมกับความเสี่ยงสูง (R1, R3, R4, R15, R16, R17) ก่อนเป็นอันดับแรก
2. หมวด 7 (Physical) — ให้เจ้าของธุรกิจยืนยัน/ประเมินจริงหน้างาน (IT Security ตรวจระยะไกลไม่ได้)
3. อนุมัตินโยบายความมั่นคง (5.2) โดยผู้บริหารอย่างเป็นทางการ
4. เริ่มข้อกำหนด 9 (Internal Audit 9.2 + Management Review 9.3) ที่ยังไม่เคยทำเลย
5. การรับรองจริงต้องผ่าน **Certification Body ที่ได้รับ accreditation** เท่านั้น — เอกสารชุดนี้เป็น baseline เตรียมความพร้อมภายใน
