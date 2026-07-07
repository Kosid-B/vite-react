# Environment Map — CEO AI Thailand
**แก้ปัญหา R11 (Config Drift) — ISO/IEC 27001:2022 control 8.9 (Configuration Management)**

| | |
|---|---|
| เวอร์ชัน | 3.0 (แก้ไขครั้งที่ 2 — v2.0 สรุปผิดกลับด้าน ดู § 0) |
| วันที่ | 2026-07-07 |
| ผู้จัดทำ | IT Security |
| สถานะ | 🟡 R11 ยัง**ไม่ปิดสมบูรณ์** — ยืนยัน production = `waigsnxhrlwtiotspaim` แล้ว แต่ยังต้อง verify schema/security/edge functions บนตัวจริงผ่าน MCP (รอเชื่อมบัญชี) — ดู [[R19]] |

## 0. ⚠️ Postmortem: เอกสารนี้เคยสรุปผิด **2 รอบ** — บันทึกไว้เป็นบทเรียน

**รอบที่ 1 (v1.0, 2026-07-03):** สรุป production = `waigsnxhrlwtiotspaim` โดยอิงคำผู้ใช้ + `.env` + CLI link
**รอบที่ 2 (v2.0, 2026-07-05):** "แก้" เป็น `rsjbqmnvocvtveelselj` โดยอิง `list_edge_functions` (เจอ 8 functions ACTIVE)
→ **รอบที่ 2 นี่แหละที่ผิด** และยังไปเปลี่ยน `.env`/CLI link ในเครื่องให้ชี้ตัวผิด + apply security migration ผิดโปรเจกต์

**รอบที่ 3 (v3.0, ฉบับนี้):** ยืนยันกลับว่า production จริง = **`waigsnxhrlwtiotspaim`** (org `bgvyelbcbxhzzfrzuqnh`, Pro plan)

**บทเรียนที่ลึกกว่าเดิม:**
> "ยึด API ระบบจริง" ยังไม่พอ — **ต้องยึด API ที่ตอบคำถามให้ถูกข้อ** คำถามคือ *"เว็บ production ต่อฐานข้อมูลไหน"*
> คำตอบที่ถูกต้องคือ **build-time env ของ frontend ที่ deploy จริง (ดูใน JS bundle บนโดเมนจริง)** ไม่ใช่
> *"โปรเจกต์ไหนมี edge functions"* — edge functions ถูก deploy ค้างไว้ที่ `rsjbqmnvocvtveelselj` ได้โดยที่
> frontend ไม่ได้ใช้เลย การดู `list_edge_functions` จึงตอบผิดข้อ

## 1. หลักฐานยืนยัน Production ตัวจริง = `waigsnxhrlwtiotspaim` (v3.0)

| แหล่งหลักฐาน | ผล | น้ำหนัก |
|---|---|---|
| **JS bundle ของเว็บ production** (`ceoaithailand.org/assets/index-*.js`) | **ไม่มี `.supabase.co` ของ project ใดเลย** → เว็บที่ deploy อยู่รัน **local-mode** (ไม่ต่อ backend) ⚠️ ต้อง fix deploy ก่อนเปิดตัว | สูงสุด — bundle จริงจากโดเมนจริง |
| **deploy.ps1 / deploy.sh** (สคริปต์ deploy ที่ใช้จริง) | `SUPABASE_URL=https://waigsnxhrlwtiotspaim.supabase.co` | สูง — เจตนา deploy |
| **`.env` ในเครื่อง + `supabase/config.toml`** | ทั้งคู่ → `waigsnxhrlwtiotspaim` | สูง |
| **Supabase CLI link** (`supabase/.temp/linked-project.json`) | `ref: waigsnxhrlwtiotspaim`, org `bgvyelbcbxhzzfrzuqnh`, name "CEO Ai Thailand" | สูง |
| **Liveness API** (`/auth/v1/health` บน waigsnxhrlwtiotspaim) | GoTrue v2.192.0 ตอบ healthy — project มีชีวิตจริง เป็น Pro | สูง |
| คำยืนยันเจ้าของระบบ (2026-07-07, ย้ำ 2 ครั้ง) | production = `waigsnxhrlwtiotspaim` | ประกอบ |

**สรุป: Production Supabase = `waigsnxhrlwtiotspaim`** (org `bgvyelbcbxhzzfrzuqnh`, Pro plan)
เข้าถึงผ่าน MCP ปัจจุบัน**ไม่ได้** (MCP ผูกกับบัญชี Vercel org `vercel_icfg_...` ที่มีแค่ `rsjbqmnvocvtveelselj`)

## 2. ผลกระทบจากความผิดพลาด v2.0 ที่ต้องตามแก้ (ดู [[R19]])

| ประเด็น | เกิดอะไรขึ้น | ต้องทำ |
|---|---|---|
| Security migration `0022`/`0023` (แก้ R2/R12/R13/R14) | apply ลง `rsjbqmnvocvtveelselj` (ตัวผิด) | ต้อง verify/apply ชุดเดียวกันบน `waigsnxhrlwtiotspaim` |
| Incident grants (§ เดิม) แก้บน `rsjbqmnvocvtveelselj` | เป็นการแก้บนตัวที่ไม่ใช่ prod จริง | ตรวจว่า `waigsnxhrlwtiotspaim` มีปัญหาสิทธิ์เดียวกันหรือไม่ |
| `.env`/CLI link ในเครื่อง | ปัจจุบันชี้ `waigsnxhrlwtiotspaim` ถูกต้องแล้ว (revert แล้ว) | ✅ ไม่ต้องแก้ |
| Edge functions บน `waigsnxhrlwtiotspaim` | ยังไม่ยืนยันว่ามี/ครบ (ai-assist ฯลฯ) + ตั้ง ANTHROPIC_API_KEY แล้วหรือยัง | ตรวจผ่าน MCP หลังเชื่อมบัญชีถูก |

## 3. โปรเจกต์ Supabase ทั้งหมดที่เกี่ยวข้อง

| Project ref | org | คืออะไร | สถานะ |
|---|---|---|---|
| **`waigsnxhrlwtiotspaim`** | `bgvyelbcbxhzzfrzuqnh` | **Production จริง** (Pro) | ✅ ตัวจริง — MCP ปัจจุบันเข้าไม่ถึง |
| `rsjbqmnvocvtveelselj` | `vercel_icfg_iAC8mla8cQ9VTLI4j31OKxwh` (Vercel, Free) | มี edge functions deploy ค้าง + เคยถูกเข้าใจผิดว่าเป็น prod (v2.0) | ⚠️ ไม่ใช่ prod — MCP เข้าถึงได้ |
| `galtbbkcddugnsfkgyqm` | (แยก) | TIS Automate (คนละผลิตภัณฑ์) | ✅ ปกติ |

## 4. แผนที่ environment ปัจจุบัน (v3.0 — ยึดตามนี้)

```
┌─ CEO AI Thailand — Production ──────────────────────────────────
│ Supabase project  : waigsnxhrlwtiotspaim  (org bgvyelbcbxhzzfrzuqnh · Pro plan)  ✅ ตัวจริง
│ ยืนยันด้วย        : JS bundle เว็บจริง + deploy scripts + .env + CLI link + liveness API
│ Custom domain     : ceoaithailand.org
│ Deploy            : Cloudflare Workers (wrangler deploy)
│ ⚠️ ปัญหาปัจจุบัน  : เว็บที่ deploy อยู่เป็น local-mode (bundle ไม่มี Supabase URL)
│                     → ต้อง rebuild+deploy โดยมี VITE_SUPABASE_URL/ANON_KEY ก่อนเปิดตัว
│ เข้าถึงผ่าน MCP    : ❌ ยังไม่ได้ (ต้องเชื่อม MCP กับบัญชี org bgvyelbcbxhzzfrzuqnh)
├─ rsjbqmnvocvtveelselj (Vercel org, Free) — ไม่ใช่ prod ────────────
│ มี edge functions 8 ตัว deploy ค้าง · security fix ของเซสชันก่อนลงผิดที่นี่ (ดู R19)
│ MCP ปัจจุบันเข้าถึงได้ (แต่ไม่ใช่ตัวที่ควรแก้)
├─ TIS Automate (แยกผลิตภัณฑ์) ────────────────────────────────────
│ Supabase project  : galtbbkcddugnsfkgyqm · ห้าม apply migration ข้ามโปรเจกต์
├─ Cloudflare Worker ──────────────────────────────────────────────
│ Worker name       : ceo-ai-thailand · Secret: ANTHROPIC_API_KEY
├─ GitHub Actions (deploy.yml) ────────────────────────────────────
│ Secrets           : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CLOUDFLARE_* 
│ ⚠️ ต้องเช็คว่าค่าจริงชี้ waigsnxhrlwtiotspaim (ถ้า build ผ่าน Actions)
├─ Dev/local ──────────────────────────────────────────────────────
│ .env ปัจจุบัน      : ชี้ waigsnxhrlwtiotspaim (ระวัง — local dev ต่อ prod จริงตรง)
└──────────────────────────────────────────────────────────────────
```

## 5. Action Items

| # | งาน | เจ้าของ | สถานะ |
|---|---|---|---|
| 1 | เชื่อม Supabase MCP กับบัญชี org `bgvyelbcbxhzzfrzuqnh` (เพื่อ audit/fix/verify `waigsnxhrlwtiotspaim` ได้) | เจ้าของระบบ | 🔴 กำลังทำ (วิธี A) |
| 2 | Verify/apply security hardening (0022/0023 + incident grants) บน `waigsnxhrlwtiotspaim` | IT Security | 🔴 เปิด (R19) |
| 3 | ตรวจว่า edge functions (ai-assist ฯลฯ) + ANTHROPIC_API_KEY มีครบบน `waigsnxhrlwtiotspaim` | IT Security | 🔴 เปิด |
| 4 | Rebuild+deploy frontend ให้ต่อ `waigsnxhrlwtiotspaim` (แก้ local-mode) ก่อนเปิดตัว | เจ้าของระบบ | 🔴 เปิด |
| 5 | ยืนยัน backup/PITR เปิดอยู่บน `waigsnxhrlwtiotspaim` (Pro) — R5 | เจ้าของระบบ | 🟡 น่าจะมีแล้ว รอ verify |
| 6 | ตัดสินใจชะตากรรม `rsjbqmnvocvtveelselj` (Free, Vercel) — เก็บเป็น backup/ลบ | เจ้าของระบบ | 🟡 ค้าง |

## 6. หลักการป้องกันในอนาคต (control 8.9) — ปรับปรุงหลังพลาดรอบ 2
- **คำถามต้องถูกก่อนหาหลักฐาน:** "production ต่อ DB ไหน" ตอบด้วย **build-time env ของ frontend ที่ deploy จริง**
  (ดู `.supabase.co` ใน JS bundle บนโดเมนจริง) — ไม่ใช่ "โปรเจกต์ไหนมี edge functions / มีข้อมูล"
- **หลักฐานหลายชั้นต้อง converge:** bundle + deploy script + .env + CLI link + liveness ควรชี้ตัวเดียวกัน
  ถ้าขัดกัน = ยังไม่จบ อย่าเพิ่งสรุป
- อย่าแก้ config ในเครื่อง (`.env`, CLI link) ให้ชี้ตัวใหม่ **จนกว่าจะยืนยัน ground truth เสร็จ** — ไม่งั้นทำ drift แย่ลง
- ก่อนแก้ production ตรง ใช้ read-only query ยืนยันปัญหา + ขอ confirm เจ้าของระบบก่อนเสมอ
