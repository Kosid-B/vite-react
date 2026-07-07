# การประเมินความมั่นคงปลอดภัยของระบบจัดเก็บข้อมูล (Storage Security)
**CEO AI Thailand — อ้าง ISO/IEC 27040:2015 (เสริม ISO/IEC 27001:2022)**

| | |
|---|---|
| เวอร์ชัน | 1.0 (ร่าง) |
| วันที่ | 2026-07-03 |
| ผู้จัดทำ | IT Security |
| ขอบเขต | ที่จัดเก็บข้อมูลทุกชั้นในขอบเขต ISMS ([README.md](README.md)) |

ระบบไม่มี storage ทางกายภาพเอง (DAS/SAN/NAS) — เป็น **cloud/object + client storage** ทั้งหมด
จึงเน้น ISO 27040 หมวด *secure multi-tenancy, encryption, sanitization, availability, logging*

## 1. บัญชีที่จัดเก็บข้อมูล (Storage Inventory — control 5.9)

| ชั้นจัดเก็บ | เทคโนโลยี | ข้อมูล | ความอ่อนไหว |
|---|---|---|---|
| S1 | **Supabase Postgres** (cloud object/managed) | workspaces, members, `workspace_state` (JSONB แผนธุรกิจ), `auth.users` (อีเมล/PII) | สูง |
| S2 | **Cloudflare Durable Object** (SQLite/state) | `CeoAiAgent.history` — บทสนทนา AI | กลาง–สูง |
| S3 | **Browser localStorage** (`cjux2`) | สำเนา AppData ทั้งชุดบนเครื่องผู้ใช้ | กลาง |
| S4 | **Secret storage** (`.env`, wrangler secret, ไฟล์คีย์ใน Documents) | API keys, credentials | สูงสุด |
| S5 | **Cloudflare static assets** (`dist/`) | โค้ด frontend (public) | ต่ำ |

## 2. บริการความมั่นคงข้อมูล (ISO 27040 Storage Security Services)

### 2.1 Data Confidentiality — Encryption + Key Management (→ 27001 **8.24**)
| | สถานะ | หมายเหตุ |
|---|---|---|
| At-rest S1/S2 | 🟢 | Supabase/Cloudflare เข้ารหัส at-rest โดย default (managed) — ควรระบุใน supplier record (5.23) |
| In-transit | 🟢 | HTTPS/WSS ทุกช่องทาง |
| **At-rest S3 (localStorage)** | 🔴 | เก็บ **plaintext** บนเครื่องผู้ใช้ — ยอมรับความเสี่ยงตามการออกแบบ local-first แต่ต้องล้างเมื่อ logout (ดู 2.2) |
| Key management (S4) | 🟡 | คีย์ย้ายออก repo แล้ว แต่**ยังไม่ rotate** (R1) + ยังไม่แยกหน้าที่ผู้ถือกุญแจ/ผู้ดูแล |

### 2.2 Sanitization / Data Reduction (→ 27001 **8.10**, **7.14**; ISO 27040 Annex A)
| | สถานะ | หมายเหตุ |
|---|---|---|
| ล้าง localStorage ตอน logout (Clear) | 🟢 | **แก้แล้ว** — `signOut()` `removeItem` + reset (R9) |
| ลบ workspace/account (Purge) | 🔴 | DB มี `on delete cascade` แต่**ไม่มี flow ให้ผู้ใช้ลบ** + **DO history ไม่ถูก cascade** → PDPA erasure gap (R10) |
| Cloud media sanitization | 🟡 | พึ่ง crypto-erase ของผู้ให้บริการ — อ้างในสัญญา (5.22) |
| **สื่อทางกายภาพ** — โน้ตบุ๊กที่เก็บไฟล์คีย์ (Documents) | 🔴 | ต้อง sanitize (Purge/Destruct) ก่อนกำจัด/ขายเครื่อง + เก็บ sanitization record |

### 2.3 Data Integrity (→ 27001 8.13; WORM/immutability)
| | สถานะ | หมายเหตุ |
|---|---|---|
| ความถูกต้องระดับ DB | 🟢 | Postgres constraints + FK |
| Immutability ของ audit/invoice | 🔴 | ยังไม่มี WORM/append-only สำหรับ billing invoices/log |

### 2.4 Data Availability (→ 27001 **8.13**, **5.30**)
| | สถานะ | หมายเหตุ |
|---|---|---|
| Backup/PITR ของ S1 | 🔴 | **ยังไม่ยืนยันเปิด + ไม่เคยทดสอบ restore** (R5) |
| Redundancy S1/S2 | 🟢 | managed โดยผู้ให้บริการ |
| localStorage เป็น "backup"? | ⚠️ | ไม่ใช่ — S3 เป็น cache บนเครื่อง ไม่นับเป็นสำเนาสำรอง |

## 3. Secure Multi-Tenancy (ISO 27040 Clause 8 → 27001 **8.3**)
| ชั้น | การแยกผู้เช่า | สถานะ |
|---|---|---|
| S1 Supabase | **RLS** ทุกตาราง + owner-check + SoA/0006 revoke anon | 🟡 (0006 รอ apply — R2) |
| **S2 Durable Object** | เดิมทุกผู้ใช้ใช้ instance `default` ร่วมกัน → ประวัติแชทปนข้าม | 🟢 **แก้แล้ว** — `agentId` ผูกต่อ workspace/user (R8, รอ verify บน deploy) |

## 4. Logging & Monitoring (ISO 27040 Clause 8 → 27001 8.15/8.16)
- Cloudflare + Supabase มี access log — 🟡 **ยังไม่มีการ review/alert** การเข้าถึง storage ผิดปกติ

## 5. สรุปสิ่งที่ต้องทำ (Storage — เพิ่มเติมจากแผนหลัก)
1. 🔴 **R10** ทำ flow ลบ workspace/account + ล้าง DO history (PDPA erasure) — `เจ้าของ: IT Security`
2. 🔴 **R5** ยืนยัน Supabase PITR + ทดสอบ restore
3. 🔴 **R1** rotate คีย์ + แยกหน้าที่ key custodian
4. 🟢 **R8/R9** แก้แล้วในรอบนี้ — verify R8 บน Cloudflare deploy
5. 🟡 ระบุการเข้ารหัส at-rest ของผู้ให้บริการใน supplier record (5.23) + เปิด log review (8.16)
