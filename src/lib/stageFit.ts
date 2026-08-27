/* stageFit — เอา skill `case-study-stage-fit` มาเป็นโค้ดที่บังคับใช้ได้จริง
 *
 * ปัญหาที่ไฟล์นี้แก้:
 *   `growthPdca.bottleneckOf()` บอกได้แล้วว่า "คอขวดคือ reach"
 *   แต่ไม่มีอะไรเชื่อมข้อสรุปนั้นกลับมาที่ **รายการงานที่เราวางแผนจะทำ**
 *   ⇒ รู้ว่าคอขวดคือ "ไม่มีคนมา" แต่ยังเปิดจอไปทำฟีเจอร์ต่อได้อย่างสบายใจ
 *
 * ไฟล์นี้ตอบคำถามเดียว: **"งานชิ้นนี้ ถึงเวลาของมันหรือยัง"**
 *   โดยตัดสินจากตัวเลขจริง ไม่ใช่ความรู้สึกว่าอันไหนน่าทำ
 *
 * 🔴 กฎที่ฝังอยู่ในไฟล์นี้ (มาจาก skill):
 *   ① งานที่สมมติว่า "มีลูกค้าอยู่แล้ว" ยังทำไม่ได้ ไม่ว่ามันจะดีแค่ไหน
 *   ② งานที่เลื่อนออกไป **ต้องมีตัวเลขปลดล็อก** ห้ามเขียนว่า "เมื่อโตกว่านี้"
 *   ③ งานที่ห้ามทำ ต้องบอกว่า **ทำไมถึงห้าม** (สำคัญกว่าตัวข้อ)
 *
 * pure ทั้งไฟล์ · ไม่มี side effect · ไม่แต่งตัวเลข
 */
import { REACH_FLOOR_PER_WEEK, MIN_FOR_RATE } from './growthPdca';

/** เฟสของธุรกิจ เรียงตามลำดับที่ข้ามไม่ได้ */
export type Stage = 'reach' | 'convert' | 'retain' | 'scale';

const STAGE_RANK: Record<Stage, number> = { reach: 0, convert: 1, retain: 2, scale: 3 };

export const STAGE_LABEL: Record<Stage, string> = {
  reach: 'ยังไม่มีคนมา',
  convert: 'มีคนมาแล้ว แต่ยังไม่มีใครจ่าย',
  retain: 'มีคนจ่ายแล้ว — ทำให้เขาอยู่ต่อ',
  scale: 'อยู่ต่อได้จริง — ขยาย',
};

export const STAGE_QUESTION: Record<Stage, string> = {
  reach: 'ทำยังไงให้มีคนมาถึงเรา',
  convert: 'ทำยังไงให้คนที่มาแล้วยอมจ่าย',
  retain: 'ทำยังไงให้คนที่จ่ายแล้วไม่หายไป',
  scale: 'ทำยังไงให้ทำซ้ำได้โดยไม่พังตอนโต',
};

/** ลูกค้าจ่ายเงินจริงกี่รายถึงจะเริ่มคิดเรื่อง "ทำให้เขาขาดเราไม่ได้" ได้
 *  ต่ำกว่านี้ = สร้างกรงที่ไม่มีใครอยู่ข้างใน (skill case-study-stage-fit หัวข้อ ⏳) */
export const LOCKIN_MIN_PAYING = 10;

/** ตัวเลขจริงที่ใช้ตัดสินเฟส — ทุกตัวต้องมาจากฐานข้อมูล ห้ามประมาณ */
export interface StageMetrics {
  /** ผู้เข้าชมเว็บใน 7 วันล่าสุด */
  visitorsPerWeek: number;
  /** ผู้เข้าชมสะสมทั้งหมด (ใช้ดูว่าอ่านอัตราส่วนได้หรือยัง) */
  visitorsTotal: number;
  /** ลูกค้าที่จ่ายเงินจริง — **ห้ามนับ admin-free** */
  payingCustomers: number;
  /** ลูกค้าที่ใช้ต่อเนื่องเกิน 2 รอบบิล */
  retainedCustomers?: number;
}

/** หาเฟสจากตัวเลขจริง — เฟสแรกที่ยังไม่ผ่านคือเฟสที่เราอยู่
 *  ⚠️ ลำดับนี้ห้ามสลับ: คนน้อยเกินไป = ไม่มีข้อมูลพอจะบอกว่าหน้าเว็บดีหรือไม่ดี */
export function stageOf(m: StageMetrics): Stage {
  if (m.visitorsPerWeek < REACH_FLOOR_PER_WEEK) return 'reach';
  if (m.payingCustomers <= 0) return 'convert';
  if (m.payingCustomers < LOCKIN_MIN_PAYING) return 'retain';
  return 'scale';
}

export type Fit = 'now' | 'later' | 'never';

export interface Initiative {
  id: string;
  label: string;
  /** เฟสต่ำสุดที่งานนี้เริ่มมีความหมาย · 'never' = ห้ามทำไม่ว่าเฟสไหน */
  needs: Stage | 'never';
  /** ทำไมถึงต้องรอถึงเฟสนั้น / ทำไมถึงห้ามทำ — บังคับมี */
  why: string;
  /** ตัวเลขที่ต้องถึงก่อนถึงจะปลดล็อก (บังคับมีเมื่อ needs ไม่ใช่ 'reach') */
  unlock?: string;
  /** ถ้างานนี้มี "เวอร์ชันทำมือ" ที่ทำได้เลยตั้งแต่วันนี้ */
  manualFirst?: string;
}

/** งานจริงของเรา — ทุกแถวต้องชี้ไปที่ของที่มีอยู่จริงในโปรเจกต์
 *  ⚠️ ห้ามใส่งานสมมติเพื่อให้ตารางดูสวย · ถ้าไม่แน่ใจว่ามันมีอยู่จริง ห้ามใส่ */
export const INITIATIVES: Initiative[] = [
  {
    id: 'search-console',
    label: 'อ่านผล Search Console — คนค้นคำอะไรแล้วเจอเรา',
    needs: 'reach',
    why: '🟢 ยืนยัน GSC แล้ว (22 ส.ค. 2569) และ index แล้ว 12 หน้า ⇒ งานที่เหลือคือ **อ่านผล** ไม่ใช่ตั้งค่า · คำที่คนค้นจริงคือข้อมูลที่กำหนดว่าจะเขียนคอนเทนต์อะไรต่อ',
  },
  {
    id: 'brand-entity',
    label: 'ทำสัญญาณ entity ให้ครบ — ค้นชื่อเราแล้วต้องเจอเรา ไม่ใช่องค์กรที่ชื่อคล้ายกัน',
    needs: 'reach',
    why: 'งานเฟสนี้ผลิตของอย่างเดียวคือ "คนที่จำชื่อเราได้" · ถ้าเขาไปค้นแล้วเจอองค์กรอื่นแทน แรงที่ลงไปหายที่ปลายทางโดยที่ growthPdca มองไม่เห็น (รับแต่ตัวเลขฝั่งเว็บ) · และ branded search คือตัวชี้วัดการรับรู้ที่ปลอมไม่ได้ (skill invisible-influence) ⇒ ดูสถานะจริงที่แผง brandVisibility',
  },
  {
    id: 'content-shortlinks',
    label: 'ปล่อยคอนเทนต์ + ลิงก์สั้นติด utm (ตาม content-link-contract)',
    needs: 'reach',
    why: 'ทางเดียวที่ทำให้ตัวเลขผู้เข้าชมขยับ · หลักฐานของ Do คือมีคนเข้ามาจากชิ้นนั้นจริง',
  },
  {
    id: 'video-manual',
    label: 'ทำคลิปด้วยมือให้ SME จริง 5 คลิป (เฟส 0 ของ Video Orchestrator)',
    needs: 'reach',
    why: 'ได้คอนเทนต์จริง + ได้รู้ว่ากระบวนการควรเป็นยังไง ก่อนจะเขียนเป็นระบบ',
  },
  {
    id: 'deploy-lint-gate',
    label: 'ใส่ขั้น lint ใน cloudflare-deploy.yml',
    needs: 'reach',
    why: 'เป็นเรื่อง "วิธีทำงาน" ทำได้ทุกเฟส · บทเรียน Skunk Works ที่อ่านถูก = ตัดขั้นตอนขออนุญาต ไม่ใช่ตัดขั้นตอนตรวจ',
  },
  {
    id: 'landing-ab',
    label: 'ทดลอง A/B พาดหัว/ส่วนประกอบบนหน้า Landing',
    needs: 'convert',
    why: 'คนน้อยกว่านี้อ่าน "กี่ %" ไม่ได้ — ความต่างที่เห็นคือความบังเอิญ',
    unlock: `ผู้เข้าชมสะสม ≥ ${MIN_FOR_RATE} คน (และ ≥ ${REACH_FLOOR_PER_WEEK} คน/สัปดาห์)`,
  },
  {
    id: 'marketplace-seo',
    label: 'เปิดหน้า /b ให้ Google index (Marketplace SEO)',
    needs: 'convert',
    why: 'มี MIN_STOREFRONTS_TO_INDEX=5 กัน thin page อยู่แล้ว · ตอนนี้ร้านจริง = 0 ⇒ เปิดไปก็ noindex',
    unlock: 'มีร้านจริงในระบบ ≥ 5 ร้าน',
  },
  {
    id: 'video-orchestrator',
    label: 'สร้างระบบทำวิดีโออัตโนมัติ (schema 0066 + provider router)',
    needs: 'retain',
    why: 'เป็นฟีเจอร์ที่ขายในแพ็ก ฿1,790 ⇒ ต้องมีคนจ่ายเงินก่อนถึงจะรู้ว่าคุ้มสร้าง',
    unlock: `ลูกค้าจ่ายเงินจริง ≥ ${LOCKIN_MIN_PAYING} ราย`,
    manualFirst: 'ทำมือ 5 คลิปก่อน (ดู video-manual)',
  },
  {
    id: 'crm-sync',
    label: 'ต่อ HubSpot / Google Sheets ให้ลูกค้าเชื่อมเอง',
    needs: 'retain',
    why: 'เครื่องมือจัดการ lead จำนวนมาก — ยังไม่มี lead จำนวนมากให้จัดการ',
    unlock: `ลูกค้าจ่ายเงินจริง ≥ ${LOCKIN_MIN_PAYING} ราย`,
  },
  {
    id: 'data-lockin',
    label: 'ทำให้ข้อมูลที่ลูกค้าสะสม "ย้ายแล้วเสียดาย"',
    needs: 'retain',
    why: 'คุณค่าอยู่ที่สิ่งที่สะสมหลังการขายครั้งแรก — ต้องมีคนสะสมอยู่จริงก่อน',
    unlock: `จ่ายจริง ≥ ${LOCKIN_MIN_PAYING} ราย และใช้ต่อเนื่องเกิน 2 รอบบิล ≥ 3 ราย`,
  },
  {
    id: 'data-hostage',
    label: 'ล็อกลูกค้าด้วยการทำให้ export ข้อมูลไม่ได้',
    needs: 'never',
    why: '🚫 ขัดจุดยืนโปรเจกต์ — processRegister มี CSV/JSON export ตั้งแต่วันแรก ("ลูกค้าถือข้อมูลเอง") · ต้องเป็น "ย้ายแล้วเสียดาย" ไม่ใช่ "ย้ายไม่ได้"',
  },
  {
    id: 'too-big-to-fail',
    label: 'กระจายฐานให้ใหญ่เกินกว่าจะถูกล้ม',
    needs: 'never',
    why: '🚫 ได้ผลเพราะเป็นอำนาจต่อรองระดับประเทศ · เวอร์ชันเล็กที่ใช้ได้จริงคือกระจายคุณค่าให้หลายคนในองค์กรลูกค้าเดียวกัน',
  },
  {
    id: 'stop-marketing',
    label: 'เลิกทำการตลาด — เชื่อว่าของดีขายตัวเองได้',
    needs: 'never',
    why: '🚫 จริงเฉพาะเมื่อลูกค้าไม่มีทางเลือกอื่น · ลูกค้าเราจะไม่ซื้ออะไรเลยก็ได้ และไม่เคยได้ยินชื่อเรา',
  },
];

export interface FittedInitiative extends Initiative {
  fit: Fit;
}

export interface StageFitReport {
  stage: Stage;
  question: string;
  now: FittedInitiative[];
  later: FittedInitiative[];
  never: FittedInitiative[];
  /** อ่านอัตราส่วนได้หรือยัง — ถ้ายัง ตัวเลข % ทุกตัวในระบบยังเชื่อไม่ได้ */
  canReadRates: boolean;
  /** ประโยคเดียวที่ควรทำตอนนี้ */
  headline: string;
}

export function fitOf(init: Initiative, stage: Stage): Fit {
  if (init.needs === 'never') return 'never';
  return STAGE_RANK[init.needs] <= STAGE_RANK[stage] ? 'now' : 'later';
}

export function stageFitReport(m: StageMetrics, initiatives: Initiative[] = INITIATIVES): StageFitReport {
  const stage = stageOf(m);
  const fitted = initiatives.map((i) => ({ ...i, fit: fitOf(i, stage) }));
  const now = fitted.filter((i) => i.fit === 'now');
  return {
    stage,
    question: STAGE_QUESTION[stage],
    now,
    later: fitted.filter((i) => i.fit === 'later'),
    never: fitted.filter((i) => i.fit === 'never'),
    canReadRates: m.visitorsTotal >= MIN_FOR_RATE,
    headline:
      stage === 'reach'
        ? `คนเข้า ${m.visitorsPerWeek}/สัปดาห์ (ต้องถึง ${REACH_FLOOR_PER_WEEK}) — งานเดียวที่มีความหมายตอนนี้คือทำให้มีคนมา`
        : `${STAGE_LABEL[stage]} — ${STAGE_QUESTION[stage]}`,
  };
}
