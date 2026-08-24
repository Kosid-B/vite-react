/* dmaic — วิธีทำงานที่จบด้วย "ทางเลือกที่ดีที่สุด" ไม่ใช่จบด้วยรายการปัญหา
 * (เจ้าของสั่ง 24 ส.ค. 2569: "คุณหมกมุ่นแต่ปัญหา ๆ คุณต้องหาวิธีพัฒนาแล้วประเมินผล
 *  แล้วหาทางเลือกที่ดีที่สุดเลย · ผมอายุ 50 ปีแล้ว อย่าให้ผมเสียเวลาเยอะ")
 *
 * 🔴 ความผิดที่ไฟล์นี้มีไว้กัน — ไม่ใช่ "วิเคราะห์ผิด" แต่คือ **หยุดอยู่ที่ Analyze**
 *    รายงานว่าอะไรพัง · ทำไมพัง · มีบั๊กกี่ตัว แล้วส่งให้เจ้าของตัดสินใจเอง
 *    = โยนงานที่หนักที่สุด (การเลือก) กลับไปให้คนที่มีเวลาน้อยที่สุด
 *
 * ทำไมเป็นโค้ด ไม่ใช่แค่ SKILL.md: skill เตือนได้ แต่ block ไม่ได้
 *    `dmaicGate()` คืน stuckAt = เฟสแรกที่ยังไม่ผ่าน ⇒ ตอบได้ว่า "ตอนนี้ต้องทำอะไร"
 *
 * pure ทั้งไฟล์ · ไม่เรียก network · ไม่มี side effect
 * ใช้ค่าคงที่ร่วมกับ growthPdca (MIN_FOR_RATE) และ positioningEngine (ClaimStatus)
 * — ห้ามนิยามเกณฑ์ใหม่ซ้ำ เพราะเกณฑ์ที่ไม่ตรงกันคือที่มาของข้อสรุปที่ขัดกันเอง
 */

import { MIN_FOR_RATE } from './growthPdca';
import { CLAIM_RANK, type ClaimStatus } from './positioningEngine';

export const PHASES = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'] as const;
export type Phase = typeof PHASES[number];

/** สิ่งที่แต่ละเฟสต้องส่งมอบ — ไม่ใช่ "ทำแล้ว" แต่คือ "มีของชิ้นนี้อยู่จริง" */
export const PHASE_DELIVERABLE: Record<Phase, string> = {
  Define: 'ปัญหา 1 ประโยค + เป้าหมายที่เป็นตัวเลข + เส้นตาย',
  Measure: 'ค่าตั้งต้นที่วัดมาจริง (หรือประกาศว่าวัดไม่ได้เพราะอะไร)',
  Analyze: 'สาเหตุราก 1 ข้อที่อธิบายตัวเลขได้',
  Improve: `ทางเลือกอย่างน้อย ${3} ทาง (รวม "ไม่ทำอะไรเลย") + คะแนน + ข้อที่เลือก`,
  Control: 'กลไกที่ทำให้ของที่ดีขึ้นแล้วไม่ไหลกลับ (เทสต์/ตัววัด/ด่าน)',
};

/** 🔴 จำนวนทางเลือกขั้นต่ำ — ทางเลือกเดียวไม่ใช่การตัดสินใจ มันคือการรายงาน */
export const MIN_OPTIONS = 3;

/** 🔴 ต้องมีทางเลือก "ไม่ทำอะไรเลย" เสมอ — คู่เทียบที่ซื่อสัตย์ที่สุดและถูกลืมบ่อยที่สุด
 *  (ตัวเดียวกับที่ competitorMemory.KNOWN_MARKET บอกว่าเป็นคู่แข่งที่ชนะบ่อยที่สุด) */
export const DO_NOTHING = 'ไม่ทำอะไรเลย';

export interface Option {
  name: string;
  /** ผลต่อเป้าหมายที่ตั้งไว้ 1–5 (ไม่ใช่ "ดีแค่ไหน" แต่คือ "ขยับตัวเลขนั้นแค่ไหน") */
  impact: number;
  /** แรงที่ต้องใช้ 1–5 (5 = หนักมาก) */
  effort: number;
  /** หลักฐานว่ามันได้ผล — งานวิจัยของคนอื่นยังไม่พอ ต้องถึง observed */
  evidence: ClaimStatus;
  /** ถอยกลับได้ไหมถ้าผิด — ของที่ถอยได้ ลองได้เร็วกว่าเสมอ */
  reversible: boolean;
  /** กี่วันถึงจะรู้ว่าได้ผลหรือไม่ (ไม่ใช่กี่วันถึงจะเสร็จ) */
  daysToSignal: number;
  /** ทำแล้วยังผิดกฎของโปรเจกต์ไหม (เช่น แตะ schema ตอน Gate B ยังไม่ปิด) */
  blockedBy?: string;
}

export interface ScoredOption extends Option {
  score: number;
  why: string;
  blocked: boolean;
}

/* ── การให้คะแนน ──────────────────────────────────────────────────────────
 * ⚠️ ตั้งใจให้ "เร็วที่จะรู้ผล" มีน้ำหนักสูง ไม่ใช่ "ผลใหญ่" อย่างเดียว
 *    เพราะของที่ผลใหญ่แต่ต้องรอ 90 วันถึงจะรู้ = เดิมพัน ไม่ใช่การพัฒนา
 *    และเจ้าของมีเวลาจำกัด ⇒ ทางที่ตอบได้เร็วมีค่ามากกว่าทางที่ตอบได้สวย
 * ─────────────────────────────────────────────────────────────────────── */
export const WEIGHTS = { impact: 3, effort: 2, evidence: 2, reversible: 1, speed: 2 } as const;

/** 14 วัน = รอบที่ยังตัดสินใจต่อได้ในเดือนเดียวกัน · ช้ากว่านี้คะแนนความเร็วลดลงเร็ว */
export const FAST_SIGNAL_DAYS = 14;

function speedScore(days: number): number {
  if (days <= 3) return 5;
  if (days <= 7) return 4;
  if (days <= FAST_SIGNAL_DAYS) return 3;
  if (days <= 30) return 2;
  return 1;
}

/** คะแนนรวม 0–100 — เทียบกันได้เท่านั้น ห้ามอ่านเป็น "ความน่าจะสำเร็จ" */
export function scoreOption(o: Option): ScoredOption {
  const evidence = CLAIM_RANK[o.evidence] + 1;          // hypothesis 1 → validated 4
  const parts = {
    impact: o.impact * WEIGHTS.impact,
    effort: (6 - o.effort) * WEIGHTS.effort,            // แรงน้อย = ดี
    evidence: (evidence * 1.25) * WEIGHTS.evidence,     // สเกลให้เท่ากับ 1–5
    reversible: (o.reversible ? 5 : 2) * WEIGHTS.reversible,
    speed: speedScore(o.daysToSignal) * WEIGHTS.speed,
  };
  const max = 5 * (WEIGHTS.impact + WEIGHTS.effort + WEIGHTS.evidence + WEIGHTS.reversible + WEIGHTS.speed);
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const blocked = Boolean(o.blockedBy);
  const top = (Object.entries(parts) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  return {
    ...o,
    blocked,
    score: blocked ? 0 : Math.round((raw / max) * 100),
    why: blocked
      ? `ทำไม่ได้ตอนนี้: ${o.blockedBy}`
      : `แรงที่สุดที่ ${top} · รู้ผลใน ${o.daysToSignal} วัน · ${o.reversible ? 'ถอยกลับได้' : '⚠️ ถอยกลับยาก'}`,
  };
}

/** เรียงจากดีที่สุด · ของที่ติดกฎโปรเจกต์ตกไปท้ายเสมอ ไม่ว่าคะแนนดิบจะสวยแค่ไหน */
export function rankOptions(options: Option[]): ScoredOption[] {
  return options.map(scoreOption).sort((a, b) => b.score - a.score || a.daysToSignal - b.daysToSignal);
}

export interface Recommendation {
  best: ScoredOption | null;
  runnerUp: ScoredOption | null;
  /** ประโยคเดียวที่เจ้าของต้องอ่าน — ห้ามยาวกว่านี้ */
  line: string;
  whyNotRunnerUp: string;
  /** ทางเลือกที่ตกเพราะติดกฎ ไม่ใช่เพราะไม่ดี — ต้องบอก ไม่ใช่เงียบหาย */
  parked: ScoredOption[];
}

export function chooseBest(options: Option[]): Recommendation {
  const ranked = rankOptions(options);
  const usable = ranked.filter((o) => !o.blocked);
  const best = usable[0] ?? null;
  const runnerUp = usable[1] ?? null;
  if (!best) {
    return {
      best: null, runnerUp: null, parked: ranked.filter((o) => o.blocked),
      line: 'ยังเลือกไม่ได้ — ทุกทางติดกฎของโปรเจกต์ ต้องปลดล็อกก่อน',
      whyNotRunnerUp: '',
    };
  }
  return {
    best,
    runnerUp,
    parked: ranked.filter((o) => o.blocked),
    line: `เลือก "${best.name}" — ${best.why}`,
    whyNotRunnerUp: runnerUp
      ? `"${runnerUp.name}" ตกไปเพราะ ${runnerUp.score < best.score
          ? `คะแนนต่ำกว่า (${runnerUp.score} vs ${best.score})`
          : `รู้ผลช้ากว่า (${runnerUp.daysToSignal} vs ${best.daysToSignal} วัน)`}`
      : 'ไม่มีทางเลือกรอง — เสี่ยงที่จะเป็นการตัดสินใจที่ไม่ได้เทียบกับอะไรเลย',
  };
}

/* ── ด่าน DMAIC ──────────────────────────────────────────────────────────── */

export interface DmaicCase {
  problem: string;
  /** เป้าหมายต้องเป็นตัวเลข — "ดีขึ้น" ไม่ใช่เป้าหมาย เพราะวัดไม่ได้ว่าถึงหรือยัง */
  target?: { metric: string; from: number | null; to: number; byDays: number };
  /** ค่าตั้งต้นที่วัดมาจริง · null = วัดไม่ได้ (ต้องบอกเหตุผลใน baselineBlindReason) */
  baseline?: number | null;
  baselineBlindReason?: string;
  /** จำนวนตัวอย่างที่ค่าตั้งต้นนั้นมาจาก — น้อยกว่า MIN_FOR_RATE ห้ามสรุปอัตราส่วน */
  sample?: number;
  rootCause?: string;
  options?: Option[];
  chosen?: string;
  /** กลไกกันไหลกลับ (ชื่อเทสต์ / ตัววัด / ด่าน) */
  control?: string;
}

export interface DmaicVerdict {
  stuckAt: Phase | null;
  /** ต้องทำอะไรต่อ — ประโยคเดียว สั่งได้เลย */
  nextAction: string;
  /** ตัดสินใจได้หรือยัง */
  canDecide: boolean;
  recommendation: Recommendation | null;
  /** จุดบอดที่ต้องประกาศ ไม่ใช่ซ่อน */
  blindSpots: string[];
}

export function dmaicGate(c: DmaicCase): DmaicVerdict {
  const blindSpots: string[] = [];
  const opts = c.options ?? [];

  if (!c.problem.trim() || !c.target || !c.target.metric.trim()) {
    return {
      stuckAt: 'Define', canDecide: false, recommendation: null, blindSpots,
      nextAction: 'เขียนปัญหา 1 ประโยค + เป้าหมายที่เป็นตัวเลข + เส้นตาย — "ให้ดีขึ้น" ยังไม่ใช่เป้าหมาย',
    };
  }

  const hasBaseline = c.baseline !== undefined && c.baseline !== null;
  if (!hasBaseline && !c.baselineBlindReason) {
    return {
      stuckAt: 'Measure', canDecide: false, recommendation: null, blindSpots,
      nextAction: `วัดค่าตั้งต้นของ "${c.target.metric}" ก่อน — ไม่มีค่าตั้งต้น = พิสูจน์ไม่ได้ว่าดีขึ้น`,
    };
  }
  if (!hasBaseline) {
    blindSpots.push(`🔴 วัดค่าตั้งต้นไม่ได้: ${c.baselineBlindReason} ⇒ งานแรกคือซ่อมการวัด ไม่ใช่แก้ตัวสินค้า`);
  }
  if (c.sample !== undefined && c.sample < MIN_FOR_RATE) {
    blindSpots.push(`🟡 ตัวอย่าง ${c.sample} < ${MIN_FOR_RATE} ⇒ ห้ามสรุปเป็นอัตราส่วน อ่านเป็นทิศทางได้อย่างเดียว`);
  }

  if (!c.rootCause?.trim()) {
    return {
      stuckAt: 'Analyze', canDecide: false, recommendation: null, blindSpots,
      nextAction: 'ระบุสาเหตุราก 1 ข้อที่อธิบายตัวเลขได้ — ห้ามข้ามไปแก้ก่อนรู้ว่าแก้อะไร',
    };
  }

  // 🔴 จุดที่พลาดจริงและเป็นเหตุผลที่ไฟล์นี้มีอยู่: วิเคราะห์เสร็จแล้วหยุด
  if (opts.length < MIN_OPTIONS) {
    return {
      stuckAt: 'Improve', canDecide: false, recommendation: null, blindSpots,
      nextAction: `หยุดวิเคราะห์ — เสนอทางเลือกให้ครบ ${MIN_OPTIONS} ทาง (มีอยู่ ${opts.length}) ` +
        `รวม "${DO_NOTHING}" แล้วให้คะแนน · รายงานปัญหาโดยไม่มีทางเลือก = ยังไม่ได้ทำงาน`,
    };
  }
  if (!opts.some((o) => o.name.includes(DO_NOTHING))) {
    return {
      stuckAt: 'Improve', canDecide: false, recommendation: null, blindSpots,
      nextAction: `เพิ่มทางเลือก "${DO_NOTHING}" เข้าไปเทียบด้วย — ถ้าชนะไม่ได้ แปลว่าอย่าเพิ่งทำ`,
    };
  }

  const rec = chooseBest(opts);
  if (!c.chosen) {
    return {
      stuckAt: 'Improve', canDecide: true, recommendation: rec, blindSpots,
      nextAction: rec.line,
    };
  }
  if (!c.control?.trim()) {
    return {
      stuckAt: 'Control', canDecide: true, recommendation: rec, blindSpots,
      nextAction: `เลือก "${c.chosen}" แล้ว — เหลือกลไกกันไหลกลับ (เทสต์/ตัววัด/ด่าน) ` +
        'ของที่ดีขึ้นแล้วไม่มีกลไกเฝ้า จะกลับมาเหมือนเดิมเสมอ',
    };
  }
  return {
    stuckAt: null, canDecide: true, recommendation: rec, blindSpots,
    nextAction: `ปิดรอบแล้ว — "${c.chosen}" มี ${c.control} เฝ้าอยู่ · รอบถัดไปเริ่มที่ Define ของปัญหาถัดไป`,
  };
}

/** บล็อกที่แปะเข้า prompt — บังคับให้ agent จบด้วยข้อเสนอ ไม่ใช่จบด้วยรายการปัญหา */
export function dmaicBlock(): string {
  return [
    '## วิธีทำงาน (DMAIC) — ห้ามจบที่ "เจอปัญหาอะไรบ้าง"',
    `เฟส: ${PHASES.join(' → ')}`,
    ...PHASES.map((p) => `  · ${p}: ${PHASE_DELIVERABLE[p]}`),
    '',
    `🔴 ทุกครั้งที่รายงานปัญหา ต้องมาพร้อมทางเลือกอย่างน้อย ${MIN_OPTIONS} ทาง (รวม "${DO_NOTHING}")`,
    '   พร้อมคะแนน + ข้อที่แนะนำ + เหตุผลที่ไม่เลือกอันดับสอง — ประโยคเดียว',
    '🔴 ผู้ใช้มีเวลาจำกัด: ขึ้นต้นด้วย **ข้อเสนอ** ไม่ใช่ด้วยที่มา · รายละเอียดอยู่ข้างล่างให้เปิดดูได้',
    `🔴 ของที่รู้ผลภายใน ${FAST_SIGNAL_DAYS} วัน ชนะของที่ผลใหญ่กว่าแต่ต้องรอ — เร็วที่จะรู้ผิด = ต้นทุนต่ำที่สุด`,
  ].join('\n');
}
