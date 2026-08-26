/* businessGenome — โครงข้อมูลธุรกิจที่เป็นหัวใจของ moat (MOAT Architecture v1 · 23 ส.ค. 2569)
 *
 * 🔴 ประโยคเดียวที่อธิบายไฟล์นี้:
 *   **ประวัติแชตไม่ใช่ moat · ข้อมูลธุรกิจที่มีโครงสร้างและสะสมข้ามเวลาเป็น moat ได้**
 *
 * ทำไมทำ "ตอนนี้" ทั้งที่ผู้ใช้ยังเป็น 0:
 *   นี่คือ **รูปร่างของข้อมูล** ไม่ใช่ฟีเจอร์ — ผู้ใช้คนแรกที่กรอกลงโครงผิด ต้องรื้อทำใหม่ทั้งหมด
 *   (หลักเดียวกับ `iso-from-day-one` · และ `moatReadiness(0)` อนุญาตเฉพาะชั้นนี้กับ Thai Playbook)
 *
 * ⚠️ ไฟล์นี้ **ไม่มี migration และไม่แตะฐานข้อมูล** โดยตั้งใจ (ด่านปล่อยของ: `releaseGates.ts` — ตอนเขียนยังกั้นอยู่)
 *    มันคือ **สัญญาของโครงสร้าง** ที่ schema จริงจะต้องเคารพเมื่อถึงเวลาสร้าง
 *    ⇒ ตอนสร้างตารางจริง ให้ derive จากไฟล์นี้ ไม่ใช่คิดใหม่
 *
 * pure ทั้งไฟล์ · ไม่เรียก network · ไม่มี side effect
 */

import { CUSTOMER_JOURNEY } from './brandBrief';

/** ระดับความแน่นอน — ใช้ชุดเดียวกับ positioningEngine ห้ามนิยามซ้ำ */
export type { ClaimStatus } from './positioningEngine';

/** 8 กิ่งหลักของจีโนม — ลำดับนี้ตรงกับลำดับที่ธุรกิจเดินจริง */
export const GENOME_BRANCHES = [
  {
    key: 'business',
    name: 'Business',
    fields: ['founderGoal', 'industry', 'stage'],
    journeyStep: 1,
  },
  {
    key: 'customer',
    name: 'Customer',
    fields: ['segment', 'persona', 'jtbd', 'pain', 'buyingTrigger'],
    journeyStep: 2,
  },
  {
    key: 'problem',
    name: 'Problem',
    fields: ['severity', 'frequency', 'evidence'],
    journeyStep: 3,
  },
  {
    key: 'offer',
    name: 'Offer',
    fields: ['valueProposition', 'pricing', 'objections'],
    journeyStep: 4,
  },
  {
    key: 'acquisition',
    name: 'Acquisition',
    fields: ['channel', 'message', 'cac'],
    journeyStep: 5,
  },
  {
    key: 'experiment',
    name: 'Experiment',
    fields: ['hypothesis', 'method', 'result', 'learning'],
    journeyStep: 3,
  },
  {
    key: 'economics',
    name: 'Economics',
    fields: ['margin', 'ltv', 'cac'],
    journeyStep: 6,
  },
  {
    key: 'scale',
    name: 'Scale',
    fields: ['process', 'kpi', 'risk', 'managementSystem'],
    journeyStep: 7,
  },
] as const;

export type GenomeBranchKey = typeof GENOME_BRANCHES[number]['key'];

/* ── Evidence Graph ────────────────────────────────────────────────────────
 * ทุกคำแนะนำของ AI ต้องมีที่มา — ไล่กลับได้ถึงต้นตอเสมอ
 *   Claim → Hypothesis → Experiment → Evidence → Outcome → Confidence
 *
 * 🔴 นี่คือสิ่งที่ทำให้ "รอบหน้า AI ไม่ได้เริ่มจากศูนย์" = Business Memory
 *    ซึ่งมีมูลค่ามากกว่าการเก็บ prompt history
 * ──────────────────────────────────────────────────────────────────────── */

export interface EvidenceNode {
  /** ข้ออ้างที่กำลังพิสูจน์ */
  claim: string;
  hypothesis: string;
  /** วิธีทดลอง เช่น "สัมภาษณ์ 20 ร้าน" */
  method: string;
  /** สิ่งที่สังเกตได้ เช่น "14 ร้านมีปัญหา cost variance" */
  observed?: string;
  /** ผลจริง เช่น "3 ร้านซื้อ" */
  outcome?: string;
  /** บทเรียนที่กลับเข้าจีโนม */
  learning?: string;
  /** จำนวนตัวอย่างที่ใช้ — ตัวคุมว่าจะสรุปได้แค่ไหน */
  sampleSize?: number | null;
}

/** ระดับความมั่นใจที่ "อนุญาตให้พูด" จากโหนดหลักฐานหนึ่ง
 *  ⚠️ คำนวณจากสิ่งที่กรอกจริง ไม่ใช่จากความรู้สึกของคนเขียน */
export function confidenceOf(n: EvidenceNode): 'hypothesis' | 'research' | 'observed' | 'validated' {
  if (n.outcome && n.learning) return 'validated';
  if (n.observed) return 'observed';
  if (n.method && n.hypothesis) return 'research';
  return 'hypothesis';
}

/* ── ความสมบูรณ์ของจีโนม ─────────────────────────────────────────────────
 * ใช้ตอบว่า "ธุรกิจนี้เดินมาถึงไหนแล้ว" โดยไม่ต้องถามเจ้าของซ้ำ
 * ──────────────────────────────────────────────────────────────────────── */

export type GenomeData = Partial<Record<GenomeBranchKey, Record<string, unknown>>>;

export interface BranchStatus {
  key: GenomeBranchKey;
  name: string;
  filled: number;
  total: number;
  /** กิ่งนี้ถือว่า "พอใช้ตัดสินใจ" เมื่อกรอกครบทุกช่อง */
  complete: boolean;
  missing: string[];
}

export function genomeStatus(data: GenomeData): BranchStatus[] {
  return GENOME_BRANCHES.map((b) => {
    const got = data[b.key] ?? {};
    const missing = b.fields.filter((f) => {
      const v = (got as Record<string, unknown>)[f];
      return v == null || (typeof v === 'string' && v.trim() === '');
    });
    return {
      key: b.key,
      name: b.name,
      filled: b.fields.length - missing.length,
      total: b.fields.length,
      complete: missing.length === 0,
      missing: [...missing],
    };
  });
}

/** กิ่งแรกที่ยังไม่ครบ = จุดที่ธุรกิจติดอยู่จริง (ไม่ใช่จุดที่เจ้าของอยากทำ)
 *  คืน null เมื่อครบทุกกิ่ง */
export function stuckBranch(data: GenomeData): BranchStatus | null {
  return genomeStatus(data).find((b) => !b.complete) ?? null;
}

/** จีโนมต้องครอบคลุมทุกขั้นของ Customer Journey ที่ผลิตภัณฑ์สัญญาไว้
 *  ⇒ ถ้ามีขั้นไหนไม่มีกิ่งรองรับ แปลว่าเราสัญญาสิ่งที่เก็บข้อมูลไม่ได้ */
export function journeyStepsCovered(): number[] {
  return [...new Set(GENOME_BRANCHES.map((b) => b.journeyStep))].sort((a, b) => a - b);
}

/** ขั้น Journey ที่ยังไม่มีกิ่งจีโนมรองรับ — ต้องว่างเสมอ (มีเทสต์บังคับ) */
export function journeyGaps(): number[] {
  const covered = new Set(journeyStepsCovered());
  // ขั้น 8–10 (KPI · ระบบ · Scale) รวมอยู่ในกิ่ง scale ⇒ ถือว่าครอบแล้วที่ขั้น 7
  return CUSTOMER_JOURNEY.filter((j) => j.step <= 7).map((j) => j.step).filter((s) => !covered.has(s));
}

/** 🔴 สิ่งที่ **ไม่ใช่** จีโนม — เขียนไว้กันคนเอาของผิดมาใส่แล้วคิดว่าได้ moat */
export const NOT_GENOME = [
  'ประวัติแชต (chat history)',
  'prompt ที่เคยใช้',
  'ไฟล์ที่ผู้ใช้อัปโหลด',
  'บันทึกการใช้งานรายวัน',
] as const;

export const WHY_NOT_GENOME =
  'ของพวกนี้ลอกได้ทันทีที่เปลี่ยนผู้ให้บริการ LLM และไม่ได้บอกอะไรเกี่ยวกับ "ธุรกิจ" ' +
  'สิ่งที่เป็น moat คือข้อมูลที่มีโครงสร้าง สะสมข้ามเวลา และผูกกับผลลัพธ์จริง';
