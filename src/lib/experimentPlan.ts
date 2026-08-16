/* experimentPlan — ตัดสินว่า "ตอนนี้ทดลองอะไรได้จริงบ้าง" จากปริมาณคนที่มีจริง
 *
 * ปัญหาที่แก้ (ตรวจจาก production 16 ส.ค. 2569):
 *   หน้า Landing มี A/B ค้างอยู่ 3 ชุดพร้อมกัน แต่ตัวเลขจริงคือ
 *     ผู้เข้าชม 60 คน · เลื่อนเกินครึ่งหน้า 1 คน · กด CTA 4 คน · สมัคร 1 คน
 *   → 2 ใน 3 ชุดทดสอบของที่อยู่ "ใต้ครึ่งหน้า" ซึ่ง 59 จาก 60 คนไม่เคยเห็น
 *   นี่ไม่ใช่ "ข้อมูลยังน้อย" แต่คือ **วัดสิ่งที่ไม่มีใครเห็น** — รันต่อไปอีกปีก็ไม่ได้คำตอบ
 *
 * หลักที่ใช้ตัดสิน (เรียงความสำคัญ):
 *   1) การทดลองที่คนส่วนใหญ่ไม่เห็น = ต้องหยุด ไม่ใช่รอ
 *   2) ตัวชี้วัดต้องเป็นสิ่งที่เกิดบ่อยพอจะวัดได้ — วัดที่ "สมัคร" ตอนมีคนสมัคร 1 คน = วัดความบังเอิญ
 *   3) รันทีละชุดจนจบ ดีกว่ารันพร้อมกันหลายชุดแล้วอ่านไม่ออกสักชุด
 *
 * ⚠️ การ "หยุด" ไม่ได้แปลว่าฟีเจอร์นั้นแย่ — แปลว่าตอนนี้ยังพิสูจน์ไม่ได้
 *    จึงต้องเลือกค่าตั้งต้นด้วยเหตุผล แล้วบันทึกไว้ว่าเลือกเพราะอะไร
 *
 * pure ทั้งไฟล์
 */

import type { LandingAgg } from './landingFunnel';

export type Placement = 'above_fold' | 'below_fold';
export type ExpStatus = 'running' | 'frozen';

export interface ExperimentPlanEntry {
  id: string;
  label: string;
  /** above_fold = ทุกคนที่เปิดหน้าเห็น · below_fold = เห็นเฉพาะคนที่เลื่อนลงไป */
  placement: Placement;
  status: ExpStatus;
  /** variant ที่ใช้เมื่อหยุดทดลอง — ต้องมีเมื่อ status='frozen' */
  frozenVariant?: string;
  /** เหตุผลที่ตัดสินแบบนี้ — เขียนไว้เพื่อให้คนอ่านทีหลังรู้ว่าไม่ได้เลือกมั่ว */
  reason: string;
}

/** ตัวชี้วัดหลักของการทดลองตอนนี้
 *  ไม่ใช่ "สมัคร" เพราะเกิดขึ้น 1 ครั้งใน 60 คน — วัดไม่ได้
 *  ใช้ "กดปุ่มหลัก" ซึ่งเกิดบ่อยกว่าและอยู่ก่อนหน้าในเส้นทางเดียวกัน */
export const PRIMARY_METRIC = 'cta' as const;
export const PRIMARY_METRIC_LABEL = 'กดปุ่มหลัก (CTA)';

export const EXPERIMENT_PLAN: ExperimentPlanEntry[] = [
  {
    id: 'hero',
    label: 'พาดหัว A/B',
    placement: 'above_fold',
    status: 'running',
    reason: 'ทุกคนที่เปิดหน้าเห็นพาดหัว — เป็นชุดเดียวที่กลุ่มตัวอย่างเท่ากับจำนวนผู้เข้าชมจริง',
  },
  {
    id: 'new_sections_v1',
    label: 'ส่วนใหม่บน Landing (เห็น/ไม่เห็น)',
    placement: 'below_fold',
    status: 'frozen',
    frozenVariant: 'show',
    reason:
      'ทดสอบส่วนที่อยู่ใต้ครึ่งหน้า แต่คนเลื่อนถึงแค่ 1 ใน 60 → วัดไม่ได้ · ' +
      'เลือก show เป็นค่าตั้งต้นเพราะ 2 ส่วนนั้น (ลอง AI จริง / ต่างจาก ChatGPT) ตอบข้อสงสัยที่เจ้าของชี้เองว่าลูกค้าแยกไม่ออก',
  },
  {
    id: 'layout',
    label: 'ลำดับบล็อก A/B',
    placement: 'below_fold',
    status: 'frozen',
    frozenVariant: 'explain_first',
    reason:
      'สลับลำดับบล็อกที่อยู่ใต้ครึ่งหน้า คนที่เลื่อนถึงมี 1 ใน 60 → วัดไม่ได้ · ' +
      'เลือก explain_first (แทน proof_first) เพราะกลุ่มเป้าหมายรอบนี้คือคนเพิ่งเริ่มธุรกิจ ต้องเข้าใจก่อนว่าระบบคืออะไร',
  },
];

export function planEntry(id: string): ExperimentPlanEntry | null {
  return EXPERIMENT_PLAN.find(e => e.id === id) ?? null;
}

/** variant ที่ต้องใช้ถ้าชุดนี้ถูกหยุด — null = ยังรันอยู่ ให้สุ่มตามปกติ */
export function frozenVariantOf(id: string): string | null {
  const e = planEntry(id);
  return e && e.status === 'frozen' ? (e.frozenVariant ?? null) : null;
}

/* ── ตรวจว่าแผนนี้สมเหตุสมผลกับตัวเลขจริงไหม ────────────────────────── */

/** คนที่ "มีโอกาสเห็น" การทดลองนี้จริง ๆ
 *  ใต้ครึ่งหน้า = ใช้จำนวนคนที่เลื่อนเกิน 50% (LandingAgg.engaged) ไม่ใช่ผู้เข้าชมทั้งหมด
 *  — จุดนี้แหละที่เคยหลอกตา: เห็นเลข 60 คนแล้วนึกว่าทดสอบได้ ทั้งที่คนเห็นจริงคือ 1 */
export function reachableAudience(agg: LandingAgg | null, placement: Placement): number {
  if (!agg) return 0;
  return placement === 'above_fold' ? agg.total : agg.engaged;
}

/** ต้องมีคนกี่คนต่อกลุ่ม ถึงจะเทียบกันได้ (เกณฑ์เดียวกับที่ใช้ทั้งระบบ) */
export const MIN_PER_ARM = 30;

export interface PlanIssue {
  id: string;
  level: 'blocker' | 'warn';
  text: string;
}

/** ปัญหาของแผนปัจจุบันเมื่อเทียบกับตัวเลขจริง — ว่างเปล่า = แผนใช้ได้ */
export function planIssues(agg: LandingAgg | null): PlanIssue[] {
  const out: PlanIssue[] = [];
  const running = EXPERIMENT_PLAN.filter(e => e.status === 'running');

  for (const e of running) {
    const reach = reachableAudience(agg, e.placement);
    if (reach < MIN_PER_ARM * 2) {
      out.push({
        id: e.id,
        level: 'blocker',
        text: `"${e.label}" มีคนเห็นจริง ${reach} คน แต่ต้องการอย่างน้อย ${MIN_PER_ARM * 2} คน (${MIN_PER_ARM} ต่อกลุ่ม)`,
      });
    }
  }

  // ผลลัพธ์ที่ใช้ตัดสินต้องเกิดบ่อยพอ ไม่งั้นเทียบกลุ่มไม่ได้แม้คนพอ
  const events = agg?.cta ?? 0;
  if (running.length > 0 && events < MIN_PER_ARM) {
    out.push({
      id: 'metric',
      level: 'blocker',
      text: `${PRIMARY_METRIC_LABEL} เกิดขึ้น ${events} ครั้ง — น้อยเกินกว่าจะเทียบกลุ่มได้ (ต้องการ ~${MIN_PER_ARM} ครั้งขึ้นไป)`,
    });
  }

  if (running.length > 1) {
    out.push({
      id: 'concurrency',
      level: 'warn',
      text: `รันพร้อมกัน ${running.length} ชุด — ที่ปริมาณคนระดับนี้ ควรรันทีละชุดจนจบ`,
    });
  }

  // การทดลองที่ถูกหยุดต้องมีค่าตั้งต้นและเหตุผลเสมอ (กันการ "หยุดแล้วลืม")
  for (const e of EXPERIMENT_PLAN.filter(x => x.status === 'frozen')) {
    if (!e.frozenVariant) {
      out.push({ id: e.id, level: 'blocker', text: `"${e.label}" ถูกหยุดแต่ไม่ได้ระบุค่าตั้งต้น` });
    }
  }
  return out;
}

/** สรุปสั้น ๆ ให้แอดมินอ่านว่า "ตอนนี้ทดลองอะไรอยู่ และทำไมชุดอื่นถึงหยุด" */
export function planSummary(agg: LandingAgg | null): string[] {
  return EXPERIMENT_PLAN.map(e => {
    const reach = reachableAudience(agg, e.placement);
    return e.status === 'running'
      ? `▶ ${e.label} — กำลังทดลอง · คนเห็นจริง ${reach} คน`
      : `⏸ ${e.label} — หยุดไว้ที่ "${e.frozenVariant}" · ${e.reason}`;
  });
}
