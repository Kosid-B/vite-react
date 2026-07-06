/* ===== Pulse & A/B — วัด "อะไรทำให้ User อยากใช้งานต่อ" แบบโปร่งใส =====
 * หลักการ (จริยธรรมมาก่อน):
 *  1) ผู้ใช้ยินยอมก่อน (opt-in) — ปิดได้ทุกเมื่อ, รู้ตัวเสมอว่าอยู่ในการทดลอง
 *  2) ไม่บิดอารมณ์/ไม่หลอก — วัดความรู้สึกจริงด้วยคำถามตรง ๆ (pulse 👍😐👎)
 *  3) โปร่งใส — ผู้ใช้เห็นข้อมูลของตัวเองทั้งหมด และเห็นว่าถูกจัดกลุ่ม A/B ไหน
 *  4) ไม่ระบุตัวตน — ใช้ uid สุ่มเฉพาะเครื่อง เพื่อ "คงภาพเดิม" ของการทดลอง (deterministic)
 * การรวมผลข้ามผู้ใช้เกิดที่ GA4 (เหตุการณ์ถูกส่งพร้อม tag กลุ่ม) — ไฟล์นี้จัดการฝั่ง client เท่านั้น */

export type PulseScore = 1 | 2 | 3; // 1=👎 ยังไม่ช่วย, 2=😐 พอใช้, 3=👍 ช่วยได้จริง

export interface PulseEntry {
  day: string;        // yyyy-mm-dd (1 ครั้ง/วัน — ล่าสุดทับของเดิมในวันนั้น)
  score: PulseScore;
  note?: string;
}

export interface ExperimentsState {
  enabled: boolean;                       // ยินยอมให้วัดผลแบบโปร่งใส (opt-in)
  seenConsent: boolean;                   // เคยเห็นคำอธิบาย/ตัดสินใจแล้ว
  uid?: string;                           // id สุ่มไม่ระบุตัวตน (คงกลุ่ม A/B ให้เสถียร)
  assignments?: Record<string, string>;   // expId -> variantId (ล็อกครั้งแรกที่เห็น)
  pulses?: PulseEntry[];                  // ประวัติ pulse รายวัน
  activations?: string[];                 // expId ที่ผู้ใช้กด "อยากทำต่อ" แล้ว (นับ 1 ครั้ง)
}

export interface Variant {
  id: string;
  label: string;      // ชื่อกลุ่ม (โปร่งใส ผู้ใช้เห็นได้)
  headline: string;   // ข้อความให้กำลังใจที่แตกต่างกัน (ตัวแปรที่ทดสอบ)
  body: string;
  cta: string;        // ป้ายปุ่ม "อยากทำต่อ"
}

export interface Experiment {
  id: string;
  question: string;   // สิ่งที่เราอยากรู้ (บอกผู้ใช้ตรง ๆ)
  variants: Variant[];
}

/* คลังการทดลอง — ทดสอบว่า "การจัดกรอบกำลังใจแบบไหน" ทำให้อยากใช้งานต่อมากกว่า
 * ทั้งสองแบบซื่อสัตย์ ไม่มีคำขู่/ไม่มี scarcity ปลอม — ต่างกันแค่ "มุมมอง" */
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'encourage_frame',
    question: 'ข้อความให้กำลังใจแบบ “เห็นความก้าวหน้าของตัวเอง” หรือ “เป็นส่วนหนึ่งของชุมชน” ทำให้คุณอยากทำต่อมากกว่ากัน?',
    variants: [
      {
        id: 'progress',
        label: 'A · เห็นความก้าวหน้า',
        headline: 'ทุกก้าวของคุณสะสมเป็นเมืองที่โตขึ้นจริง',
        body: 'งานที่ทำเสร็จวันนี้ = อีกหนึ่งชั้นของเมืองบริษัทคุณ ความคืบหน้าเป็นของคุณล้วน ๆ',
        cta: 'ทำงานชิ้นถัดไปของฉัน',
      },
      {
        id: 'community',
        label: 'B · เป็นส่วนหนึ่งของชุมชน',
        headline: 'เจ้าของธุรกิจไทยหลายคนกำลังลงมือแบบคุณ',
        body: 'คุณไม่ได้เดินคนเดียว — เครื่องมือชุดเดียวกันนี้ช่วยผู้ประกอบการรายเล็กสร้างระบบให้ธุรกิจได้จริง',
        cta: 'ลงมือทำต่อกับชุมชน',
      },
    ],
  },
];

/* ---- helpers ---- */
const dayStr = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** hash สตริงแบบเสถียร (djb2) → ใช้แบ่งกลุ่ม A/B แบบ deterministic ต่อ uid */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** สุ่ม uid ไม่ระบุตัวตน (ครั้งเดียว) — ปลอดภัยถ้า crypto ไม่มีก็ fallback */
export function makeUid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return 'uid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** ค่าเริ่มต้น — ยังไม่ยินยอม, ยังไม่เห็นคำอธิบาย */
export function defaultExperiments(): ExperimentsState {
  return { enabled: false, seenConsent: false, pulses: [], assignments: {}, activations: [] };
}

/** เลือก variant สำหรับ experiment — คงเดิมถ้าเคยเห็นแล้ว (ล็อกใน assignments) */
export function variantFor(state: ExperimentsState, exp: Experiment): Variant {
  const locked = state.assignments?.[exp.id];
  if (locked) {
    const v = exp.variants.find(x => x.id === locked);
    if (v) return v;
  }
  const uid = state.uid ?? 'anon';
  const idx = hashStr(uid + ':' + exp.id) % exp.variants.length;
  return exp.variants[idx];
}

/** บันทึก pulse วันนี้ (ทับของวันเดียวกัน) → คืน state ใหม่ */
export function recordPulse(state: ExperimentsState, score: PulseScore, note?: string): ExperimentsState {
  const day = dayStr(Date.now());
  const rest = (state.pulses ?? []).filter(p => p.day !== day);
  const pulses = [...rest, { day, score, note }].sort((a, b) => a.day.localeCompare(b.day));
  return { ...state, pulses };
}

export function todayPulse(state: ExperimentsState): PulseEntry | undefined {
  const day = dayStr(Date.now());
  return (state.pulses ?? []).find(p => p.day === day);
}

/** สรุปข้อมูลของผู้ใช้เอง (โปร่งใส — ผู้ใช้ดูของตัวเองได้) */
export function pulseSummary(state: ExperimentsState) {
  const pulses = state.pulses ?? [];
  const n = pulses.length;
  const avg = n ? pulses.reduce((s, p) => s + p.score, 0) / n : 0;
  const last7 = pulses.slice(-7);
  const good = pulses.filter(p => p.score === 3).length;
  const meh = pulses.filter(p => p.score === 2).length;
  const bad = pulses.filter(p => p.score === 1).length;
  return { n, avg, last7, good, meh, bad };
}
