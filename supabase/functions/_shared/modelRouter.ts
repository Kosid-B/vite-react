// _shared/modelRouter.ts — Model Router (Fireworks Playbook · Phase 1)
// เลือกโมเดลตาม "ระดับงาน" ผ่าน env → ลดต้นทุน AI โดยไม่ต้องแก้โค้ด (ตั้ง secret ก็สลับได้)
//
// พฤติกรรม default: ถ้าไม่ตั้ง MODEL_* → ทุก tier ใช้ ANTHROPIC_MODEL เดิม (sonnet)
//   = ไม่เปลี่ยนพฤติกรรมจนกว่าจะตั้ง env (Phase 2 ค่อยเปิด)
//
// เปิดใช้ tiering (ตัวอย่าง — ไม่ต้องแก้/ deploy โค้ด แค่ตั้ง secret แล้วรันอยู่แล้ว):
//   supabase secrets set MODEL_SIMPLE=claude-haiku-4-5-20251001 --project-ref waigsnxhrlwtiotspaim
//   → งาน 'simple' (เช่น ai-assist) ย้ายไป Haiku ทันที ต้นทุนลง ~80%/call
//
// tier:
//   'simple'  = งานเบา (คำแนะนำสั้น/สรุป/สกัดข้อมูล/เติม template) → ควรใช้โมเดลถูก
//   'complex' = งานหนัก (วางแผน/วิเคราะห์ธุรกิจ) → ควรคงโมเดลแรง (คุ้มค่า)
//   'thai'    = งานภาษาไทยล้วน → เผื่อ Typhoon/open-source ในอนาคต (Phase 3)

export type TaskTier = "simple" | "complex" | "thai";

const DEFAULT_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

// tier → model (env override) · ไม่ตั้ง = DEFAULT_MODEL (พฤติกรรมเดิม)
const TIER_MODEL: Record<TaskTier, string> = {
  simple: Deno.env.get("MODEL_SIMPLE") || DEFAULT_MODEL,
  complex: Deno.env.get("MODEL_COMPLEX") || DEFAULT_MODEL,
  thai: Deno.env.get("MODEL_THAI") || DEFAULT_MODEL,
};

/** เลือกโมเดลตามระดับงาน — default = โมเดลเดิม (ไม่เปลี่ยนพฤติกรรมจนกว่าจะตั้ง env tier) */
export function pickModel(tier: TaskTier = "complex"): string {
  return TIER_MODEL[tier] || DEFAULT_MODEL;
}
