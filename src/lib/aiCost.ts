// aiCost.ts — ประมาณการต้นทุน AI จริง (Fireworks Playbook · Phase 4)
// ตอบคำถามบอร์ด: "ค่าเรียกโมเดลกินมาร์จินเท่าไร และถ้าเปิด model tiering (Haiku/Typhoon) ประหยัดจริงกี่บาท"
// pure + testable — ไม่มี side-effect · ราคาเป็นค่าประมาณจากราคาป้ายผู้ให้บริการ (ปรับได้ที่ MODEL_PRICE)

/** ราคา USD ต่อ 1M tokens (input, output) — ค่าประมาณจากราคาป้าย (อัปเดตเมื่อผู้ให้บริการเปลี่ยน) */
export const MODEL_PRICE: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  // open-source ไทยผ่าน Fireworks/Together (คลาส Llama-70B) — ถูกกว่า Sonnet มาก
  "typhoon": { in: 0.9, out: 0.9 },
};

export const USD_THB = 36; // อัตราแลกเปลี่ยนประมาณ (ปรับได้)

/** โปรไฟล์ token ต่อ 1 call ตามชนิดงาน (ประมาณจาก max_tokens + system/context จริง) */
export const CALL_PROFILE = {
  assist: { in: 700, out: 400 },   // ai-assist (คำแนะนำสั้น) = simple
  plan: { in: 1100, out: 900 },    // ai-plan (วางแผน) = complex
  agent: { in: 1400, out: 1100 },  // agent-run (ทำงานจริง) = complex
} as const;

export type CallType = keyof typeof CALL_PROFILE;

/** ต้นทุน 1 call (บาท) จากชื่อโมเดล + จำนวน token — โมเดลไม่รู้จัก = ใช้ sonnet เป็นฐาน */
export function callCostThb(model: string, inTok: number, outTok: number): number {
  const key = model in MODEL_PRICE ? model
    : model.toLowerCase().includes("typhoon") ? "typhoon"
    : model.toLowerCase().includes("haiku") ? "claude-haiku-4-5"
    : model.toLowerCase().includes("opus") ? "claude-opus-4-8"
    : "claude-sonnet-4-6";
  const p = MODEL_PRICE[key];
  return ((inTok * p.in) + (outTok * p.out)) / 1_000_000 * USD_THB;
}

export interface UsageVolume { assists: number; plans: number; agentRuns: number }

export interface CostScenario {
  label: string;
  models: Record<CallType, string>;
  byFn: Record<CallType, number>; // บาท/เดือน แยกตามฟังก์ชัน
  totalThb: number;               // บาท/เดือนรวม
}

function scenario(label: string, models: Record<CallType, string>, v: UsageVolume): CostScenario {
  const count: Record<CallType, number> = { assist: v.assists, plan: v.plans, agent: v.agentRuns };
  const byFn = {} as Record<CallType, number>;
  (Object.keys(CALL_PROFILE) as CallType[]).forEach((t) => {
    byFn[t] = count[t] * callCostThb(models[t], CALL_PROFILE[t].in, CALL_PROFILE[t].out);
  });
  return { label, models, byFn, totalThb: byFn.assist + byFn.plan + byFn.agent };
}

export interface CostReport {
  volume: UsageVolume;
  current: CostScenario;   // Sonnet ทุกงาน (ปัจจุบัน)
  tiered: CostScenario;    // simple→Haiku, complex→Sonnet (Phase 2)
  aggressive: CostScenario; // simple→Haiku, งานไทย→Typhoon (Phase 3)
  tieredSavingThb: number;
  tieredSavingPct: number;
  aggressiveSavingThb: number;
  aggressiveSavingPct: number;
}

const M_SONNET = "claude-sonnet-4-6";
const M_HAIKU = "claude-haiku-4-5";
const M_TYPHOON = "typhoon";

/** สร้างรายงานต้นทุน AI 3 สถานการณ์ + เงินที่ประหยัด */
export function costReport(v: UsageVolume): CostReport {
  const current = scenario("ปัจจุบัน (Sonnet ทุกงาน)", { assist: M_SONNET, plan: M_SONNET, agent: M_SONNET }, v);
  const tiered = scenario("Tiering (Haiku งานเบา)", { assist: M_HAIKU, plan: M_SONNET, agent: M_SONNET }, v);
  const aggressive = scenario("Tiering + Typhoon (งานไทย)", { assist: M_HAIKU, plan: M_SONNET, agent: M_TYPHOON }, v);
  const pct = (from: number, to: number) => (from > 0 ? ((from - to) / from) * 100 : 0);
  return {
    volume: v,
    current, tiered, aggressive,
    tieredSavingThb: current.totalThb - tiered.totalThb,
    tieredSavingPct: pct(current.totalThb, tiered.totalThb),
    aggressiveSavingThb: current.totalThb - aggressive.totalThb,
    aggressiveSavingPct: pct(current.totalThb, aggressive.totalThb),
  };
}

/** ประมาณ volume การเรียก AI/เดือน จากกิจกรรมจริงที่นับได้ (ค่าประมาณ — ใช้ agent tasks + agents เป็น proxy) */
export function estimateVolume(input: { tasksTotal: number; agents: number }): UsageVolume {
  return {
    assists: input.tasksTotal,   // ~1 คำแนะนำต่อ 1 งาน
    plans: Math.max(1, input.agents), // ~1 แผนต่อ 1 เอเจนต์ที่จ้าง
    agentRuns: input.tasksTotal, // ~1 การรันเอเจนต์ต่อ 1 งาน
  };
}
