// _shared/modelRouter.ts — Model Router (Fireworks Playbook · Phase 1 → multi-model)
// เลือกโมเดลตาม "ระดับงาน" + "ภาษา" ผ่าน env → ลดต้นทุน AI โดยไม่ต้องแก้โค้ด (ตั้ง secret ก็สลับได้)
//
// พฤติกรรม default: ถ้าไม่ตั้ง MODEL_*/MODELS_* → ทุก tier ใช้ ANTHROPIC_MODEL เดิม (sonnet)
//   = ไม่เปลี่ยนพฤติกรรมจนกว่าจะตั้ง env
//
// ── โหมดโมเดลเดียว (เดิม) ──
//   supabase secrets set MODEL_SIMPLE=claude-haiku-4-5-20251001
//   → งาน 'simple' ย้ายไป Haiku
//
// ── โหมดหลายโมเดล + fallback (ใหม่) ── ตั้งเป็น comma list เรียงลำดับความชอบ:
//   MODELS_THAI="typhoon-v2.1-12b-instruct,accounts/fireworks/models/llama-v3p3-70b-instruct"
//   MODELS_SIMPLE="accounts/fireworks/models/llama-v3p1-8b-instruct,claude-haiku-4-5-20251001"
//   MODELS_COMPLEX="accounts/fireworks/models/llama-v3p3-70b-instruct"
//   → ระบบลองตัวแรกก่อน · ล่ม/ตอบไม่ได้ → ตัวถัดไป · สุดท้าย fallback Claude (DEFAULT_MODEL) เสมอ
//
// ── เลือกอัตโนมัติตามภาษา ── ถ้า input เป็นไทย + มี MODELS_THAI/MODEL_THAI → ดันโมเดลไทยขึ้นก่อน (เช่น Typhoon)
//
// tier:
//   'simple'  = งานเบา (คำแนะนำสั้น/สรุป/สกัด/เติม template) → โมเดลถูก
//   'complex' = งานหนัก (วางแผน/วิเคราะห์) → โมเดลแรง
//   'thai'    = งานภาษาไทยล้วน → โมเดลไทย (Typhoon) ถ้ามี

export type TaskTier = "simple" | "complex" | "thai";

const DEFAULT_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

/** อ่าน candidate list ต่อ tier: MODELS_<TIER> (comma) ก่อน แล้ว MODEL_<TIER> (เดี่ยว) แล้ว default */
function candidatesFor(tier: TaskTier): string[] {
  const many = Deno.env.get(`MODELS_${tier.toUpperCase()}`);
  const one = Deno.env.get(`MODEL_${tier.toUpperCase()}`);
  const list = (many ? many.split(",") : (one ? [one] : []))
    .map((s) => s.trim()).filter(Boolean);
  return list.length ? list : [DEFAULT_MODEL];
}

/** โมเดลไทยที่ตั้งไว้ (สำหรับดันขึ้นก่อนเมื่อ input เป็นไทย) — ว่างถ้าไม่ได้ตั้ง */
function thaiCandidates(): string[] {
  const many = Deno.env.get("MODELS_THAI");
  const one = Deno.env.get("MODEL_THAI");
  return (many ? many.split(",") : (one ? [one] : []))
    .map((s) => s.trim()).filter(Boolean);
}

const hasThai = (s?: string) => !!s && /[฀-๿]/.test(s);
const dedup = (arr: string[]) => [...new Set(arr)];

/**
 * คืน "รายการโมเดลเรียงลำดับ" ให้ลองตามลำดับ (fallback chain) — จบด้วย DEFAULT_MODEL เสมอ
 * @param tier ระดับงาน
 * @param text ข้อความ input (ใช้ตรวจภาษา — ถ้าเป็นไทยจะดันโมเดลไทยขึ้นก่อน)
 */
export function pickModels(tier: TaskTier = "complex", text?: string): string[] {
  const base = candidatesFor(tier);
  // input ไทย + ไม่ใช่ tier thai อยู่แล้ว → ดัน Typhoon/โมเดลไทยขึ้นหน้า
  const prefer = (tier !== "thai" && hasThai(text)) ? thaiCandidates() : [];
  return dedup([...prefer, ...base, DEFAULT_MODEL]);
}

/** (back-compat) เลือกโมเดลตัวเดียว = ตัวแรกของ chain */
export function pickModel(tier: TaskTier = "complex", text?: string): string {
  return pickModels(tier, text)[0] || DEFAULT_MODEL;
}
