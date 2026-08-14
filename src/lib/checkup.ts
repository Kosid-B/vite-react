/* checkup — ตรวจสุขภาพระบบบริหาร 12 คำถาม (pure, tested)
 *
 * ใช้เป็น "ประตูหน้าบ้าน" สาธารณะ: ตอบ 12 ข้อ ~3 นาที ไม่ต้องสมัคร
 *   → ได้คะแนนความพร้อม + 3 ช่องว่างที่ใหญ่ที่สุด (ฟรี)
 *   → รายงานเต็ม + ลำดับสิ่งที่ต้องทำ = กรอกอีเมล (กลายเป็นลีดงานที่ปรึกษา)
 *
 * ออกแบบจากข้อกำหนดที่ผู้ตรวจเช็คแน่ (priority 1 + เอกสารบังคับ) ใน isoGapAssessment.ts
 * ภาษาที่ใช้ต้องเป็นภาษาคนทำธุรกิจ ไม่ใช่ภาษามาตรฐาน — คนตอบไม่จำเป็นต้องรู้ว่าข้อไหนคือข้อไหน
 *
 * ⚠️ นี่คือการคัดกรองเบื้องต้น ไม่ใช่การตรวจประเมินจริง — ผลลัพธ์ต้องบอกข้อจำกัดนี้เสมอ
 */

export type CheckupChoice = 0 | 1 | 2 | 3;

export interface CheckupQuestion {
  id: string;
  /** คำถามภาษาคนทำธุรกิจ */
  q: string;
  /** ข้อ ISO 9001 ที่คำถามนี้แทน */
  clause: string;
  /** เอกสารบังคับตามมาตรฐานหรือไม่ — ใช้ถ่วงน้ำหนักช่องว่าง */
  mandatory: boolean;
  /** ตัวเลือก 4 ระดับ เรียงจากแย่สุด (0) ไปดีสุด (3) */
  choices: [string, string, string, string];
  /** สิ่งที่ต้องทำถ้าคะแนนต่ำ */
  fix: string;
}

export const CHECKUP_QUESTIONS: CheckupQuestion[] = [
  {
    id: 'scope', clause: '4.3', mandatory: true,
    q: 'มีเอกสารที่เขียนไว้ชัดไหมว่า ระบบของคุณครอบคลุมงานอะไร ที่ไหนบ้าง',
    choices: ['ไม่มี', 'รู้กันเองแต่ไม่ได้เขียน', 'เขียนไว้แต่ไม่ได้ทบทวนนาน', 'เขียนไว้ชัด ทบทวนล่าสุดปีนี้'],
    fix: 'เขียนขอบเขตระบบ 1 หน้า — ทำอะไร ให้ใคร ที่ไหน มีอะไรที่ยกเว้นบ้างและเพราะอะไร',
  },
  {
    id: 'process', clause: '4.4', mandatory: false,
    q: 'ถ้าพนักงานใหม่เข้ามา มีผังงานหลักให้อ่านแล้วทำตามได้เลยไหม',
    choices: ['ไม่มี ต้องสอนกันปากต่อปาก', 'มีบางส่วน กระจัดกระจาย', 'มีครบแต่เก่า ไม่ตรงกับที่ทำจริง', 'มีครบและตรงกับงานจริง'],
    fix: 'เขียนผังกระบวนการหลัก 3–5 กระบวนการที่สำคัญที่สุดก่อน ไม่ต้องครบทุกอย่างในรอบแรก',
  },
  {
    id: 'policy', clause: '5.2', mandatory: true,
    q: 'ถ้าถามพนักงานว่า "นโยบายคุณภาพของบริษัทคืออะไร" เขาตอบได้ไหม',
    choices: ['ไม่มีนโยบาย', 'มีแต่ติดไว้เฉย ๆ ไม่มีใครจำได้', 'บางคนตอบได้', 'ส่วนใหญ่ตอบได้และเข้าใจความหมาย'],
    fix: 'เขียนนโยบายคุณภาพให้สั้นพอที่คนจำได้ แล้วสื่อสารซ้ำในที่ประชุมประจำ',
  },
  {
    id: 'risk', clause: '6.1', mandatory: false,
    q: 'มีรายการความเสี่ยงของธุรกิจ พร้อมระบุผู้รับผิดชอบแต่ละเรื่องไหม',
    choices: ['ไม่มี', 'อยู่ในหัวผู้บริหาร ไม่ได้เขียน', 'เขียนไว้แต่ไม่มีใครดูแลต่อ', 'มีทะเบียนความเสี่ยง มีเจ้าภาพ ทบทวนสม่ำเสมอ'],
    fix: 'เริ่มจากความเสี่ยง 10 ข้อที่ถ้าเกิดแล้วธุรกิจสะดุดจริง ระบุเจ้าภาพและแผนสำรองของแต่ละข้อ',
  },
  {
    id: 'objective', clause: '6.2', mandatory: true,
    q: 'มีเป้าหมายคุณภาพที่เป็นตัวเลข วัดได้ และมีคนรับผิดชอบไหม',
    choices: ['ไม่มี', 'มีเป้าแต่ไม่ใช่ตัวเลข', 'มีตัวเลขแต่ไม่ได้ตามผล', 'มีตัวเลข ตามผลทุกเดือน มีเจ้าภาพ'],
    fix: 'ตั้งเป้าหมายที่วัดได้ 3–5 ตัว ที่เชื่อมกับสิ่งที่ลูกค้าสนใจจริง ไม่ใช่ตัวเลขที่ตั้งไว้ให้ผู้ตรวจดู',
  },
  {
    id: 'docs', clause: '7.5', mandatory: true,
    q: 'ถ้าต้องหาเอกสารฉบับล่าสุด รู้ไหมว่าอยู่ที่ไหน และใครแก้ครั้งล่าสุด',
    choices: ['หาไม่เจอ ต้องถามคน', 'อยู่กระจายหลายที่ ไม่แน่ใจว่าอันไหนล่าสุด', 'มีที่เก็บกลางแต่ไม่มีระบบเวอร์ชัน', 'มีที่เก็บกลาง รู้เวอร์ชันและผู้แก้ไขล่าสุด'],
    fix: 'ทำทะเบียนเอกสารหลัก + กำหนดที่เก็บกลางที่เดียว + ระบุผู้อนุมัติของแต่ละฉบับ',
  },
  {
    id: 'nonconform', clause: '8.7', mandatory: true,
    q: 'เวลาเจอของเสียหรืองานที่ไม่ผ่านเกณฑ์ มีขั้นตอนจัดการที่ทุกคนทำเหมือนกันไหม',
    choices: ['แล้วแต่คน', 'มีวิธีทำแต่ไม่ได้เขียน', 'เขียนไว้แต่ไม่ได้บันทึกทุกครั้ง', 'มีขั้นตอนและบันทึกครบทุกครั้ง'],
    fix: 'กำหนดขั้นตอนแยก–ตัดสิน–บันทึก แล้วทำแบบฟอร์มบันทึกที่ใช้เวลากรอกไม่เกิน 2 นาที',
  },
  {
    id: 'measure', clause: '9.1', mandatory: false,
    q: 'เก็บตัวเลขผลงานและความเห็นลูกค้าอย่างสม่ำเสมอไหม',
    choices: ['ไม่ได้เก็บ', 'เก็บบ้างไม่เก็บบ้าง', 'เก็บสม่ำเสมอแต่ไม่ได้เอามาวิเคราะห์', 'เก็บและใช้ตัดสินใจจริง'],
    fix: 'เลือกตัวชี้วัด 3 ตัวที่กระทบลูกค้าโดยตรง เก็บให้ครบก่อน แล้วค่อยเพิ่ม',
  },
  {
    id: 'audit', clause: '9.2', mandatory: true,
    q: 'ปีที่ผ่านมา มีการตรวจติดตามภายในกี่ครั้ง',
    choices: ['ไม่มีเลย', 'มีแต่ทำก่อนผู้ตรวจมา', 'ทำตามแผน 1 ครั้ง', 'ทำตามแผนและมีการติดตามผลแก้ไข'],
    fix: 'วางแผนตรวจภายในปีละ 1 รอบเป็นอย่างน้อย และแยกคนตรวจออกจากคนทำงานนั้น',
  },
  {
    id: 'review', clause: '9.3', mandatory: true,
    q: 'ผู้บริหารประชุมทบทวนระบบปีละกี่ครั้ง และมีบันทึกไหม',
    choices: ['ไม่มี', 'คุยกันแต่ไม่มีบันทึก', 'มีปีละครั้ง มีบันทึก', 'มีสม่ำเสมอ มีบันทึก และมีการตัดสินใจตามมา'],
    fix: 'จัดประชุมทบทวนปีละ 1 ครั้งตามวาระที่มาตรฐานกำหนด และบันทึกมติที่ตัดสินใจไว้',
  },
  {
    id: 'corrective', clause: '10.2', mandatory: true,
    q: 'เวลาเกิดปัญหาซ้ำ ๆ มีการหาสาเหตุที่รากเหง้าและบันทึกไว้ไหม',
    choices: ['แก้เฉพาะหน้าไปเรื่อย ๆ', 'คุยกันแต่ไม่ได้บันทึก', 'มีบันทึกแต่ไม่ได้ตามผล', 'หาสาเหตุ บันทึก และยืนยันว่าไม่เกิดซ้ำ'],
    fix: 'ใช้แบบฟอร์มแก้ไข 1 หน้า: เกิดอะไร สาเหตุที่แท้จริง แก้อย่างไร ตรวจซ้ำเมื่อไร',
  },
  {
    id: 'buscount', clause: '7.2', mandatory: false,
    q: 'ถ้าคนที่ดูแลระบบลาออกพรุ่งนี้ ใครทำแทนได้ภายในกี่วัน',
    choices: ['ไม่มีใครทำแทนได้', 'มีคนพอทำได้ แต่ต้องใช้เวลาเรียนรู้เป็นเดือน', 'มีคนทำแทนได้ภายในสัปดาห์', 'มีมากกว่า 1 คนที่ทำแทนได้ทันที'],
    fix: 'เขียนขั้นตอนงานที่คนคนเดียวถืออยู่ให้เป็นเอกสาร แล้วให้คนที่สองลองทำตามจริง 1 รอบ',
  },
];

export interface CheckupGap {
  id: string;
  q: string;
  clause: string;
  mandatory: boolean;
  score: CheckupChoice;
  fix: string;
  /** น้ำหนักความเร่งด่วน — ยิ่งสูงยิ่งควรแก้ก่อน */
  weight: number;
}

export type CheckupBand = 'critical' | 'weak' | 'developing' | 'ready';

export interface CheckupResult {
  score: number;         // คะแนนดิบ 0–36
  maxScore: number;      // 36
  pct: number;           // 0–100
  band: CheckupBand;
  bandLabel: string;
  summary: string;
  /** ช่องว่างเรียงตามความเร่งด่วน */
  gaps: CheckupGap[];
  /** 3 อันดับแรก — ส่วนที่โชว์ฟรี */
  topGaps: CheckupGap[];
  /** จำนวนเอกสารบังคับที่ยังขาด (คะแนน ≤ 1) */
  missingMandatory: number;
  /** ประมาณการวันทำงานที่ต้องใช้ปิดช่องว่าง (ช่วง) */
  effortDays: [number, number];
}

const BAND_LABEL: Record<CheckupBand, string> = {
  critical: 'ยังไม่มีระบบที่ใช้ได้จริง',
  weak: 'มีบางส่วน แต่ยังไม่ครบ',
  developing: 'ใกล้พร้อม เหลือบางจุด',
  ready: 'พร้อมสำหรับการตรวจรับรอง',
};

const BAND_SUMMARY: Record<CheckupBand, string> = {
  critical:
    'ตอนนี้ธุรกิจยังพึ่งความจำและความสามารถของคนเป็นหลัก ซึ่งเดินได้แต่ขยายไม่ได้ ' +
    'ข่าวดีคือจุดเริ่มต้นแบบนี้มักใช้เวลาน้อยกว่าที่คิด เพราะไม่ต้องรื้อของเก่า',
  weak:
    'มีของอยู่บ้างแล้ว แต่กระจัดกระจายและไม่ต่อกัน ' +
    'งานส่วนใหญ่จึงเป็นการรวบรวมและเชื่อมสิ่งที่มีอยู่ ไม่ใช่สร้างใหม่ทั้งหมด',
  developing:
    'ระบบใช้งานได้จริงแล้ว เหลือจุดที่ผู้ตรวจมักถามและมักตกกัน ' +
    'ถ้าปิดช่องว่างที่เหลือได้ครบ โอกาสผ่านสูง',
  ready:
    'ระบบอยู่ในสภาพที่พร้อมให้ตรวจ สิ่งที่ควรทำต่อคือรักษาให้คงที่ ' +
    'และเตรียมรับข้อกำหนดใหม่ที่จะเพิ่มเข้ามาในฉบับปรับปรุง',
};

function bandOf(pct: number): CheckupBand {
  if (pct < 30) return 'critical';
  if (pct < 55) return 'weak';
  if (pct < 80) return 'developing';
  return 'ready';
}

/** ประเมินผลจากคำตอบ — คีย์คือ question id, ค่าคือ 0–3
 *  คำถามที่ไม่ได้ตอบถือว่า 0 (ปลอดภัยกว่าเดา) */
export function assessCheckup(answers: Readonly<Record<string, CheckupChoice>>): CheckupResult {
  const gaps: CheckupGap[] = [];
  let score = 0;

  for (const q of CHECKUP_QUESTIONS) {
    const raw = answers[q.id];
    const s = (raw === 0 || raw === 1 || raw === 2 || raw === 3 ? raw : 0) as CheckupChoice;
    score += s;
    if (s < 3) {
      // ยิ่งคะแนนต่ำและยิ่งเป็นเอกสารบังคับ ยิ่งเร่งด่วน
      gaps.push({ ...q, score: s, weight: (3 - s) * (q.mandatory ? 2 : 1) });
    }
  }

  gaps.sort((a, b) => b.weight - a.weight || a.clause.localeCompare(b.clause));

  const maxScore = CHECKUP_QUESTIONS.length * 3;
  const pct = Math.round((score / maxScore) * 100);
  const band = bandOf(pct);
  const missingMandatory = CHECKUP_QUESTIONS.filter(
    (q) => q.mandatory && ((answers[q.id] ?? 0) as number) <= 1,
  ).length;

  // ประมาณการหยาบ ๆ: ช่องว่างหนึ่งจุด ≈ 0.5–1 วันทำงาน · เอกสารบังคับที่ขาดคิดเพิ่มอีกจุดละครึ่งวัน
  const base = gaps.reduce((sum, g) => sum + (3 - g.score) * 0.25, 0);
  const lo = Math.max(2, Math.round(base + missingMandatory * 0.5));
  const hi = Math.max(lo + 2, Math.round(base * 1.8 + missingMandatory));

  return {
    score, maxScore, pct, band,
    bandLabel: BAND_LABEL[band],
    summary: BAND_SUMMARY[band],
    gaps,
    topGaps: gaps.slice(0, 3),
    missingMandatory,
    effortDays: [lo, hi],
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * โหมดเต็ม — ครบทุกข้อกำหนด แยกตามมาตรฐาน (9001 / 14001 / 45001 / 22301)
 *
 * โหมดเร็ว 12 ข้อ = ประตูหน้าบ้าน (ใครก็ทำได้ใน 3 นาที)
 * โหมดเต็ม = สิ่งที่ใช้แทนการตรวจสุขภาพจริงได้ — ลูกค้ากรอกเองก่อน
 *   ที่ปรึกษาเข้าไปตรวจยืนยันแทนที่จะเริ่มจากศูนย์ → งาน 3 วันเหลือ 1–2 วัน
 *
 * คำถามสร้างจากคู่มือรายข้อที่มีอยู่แล้ว (isoStandards + isoGapAssessment)
 * ใช้สเกลวุฒิภาวะ 4 ระดับชุดเดียวกันทุกข้อ — ตรงกับวิธีที่การตรวจ gap ทำจริง
 * และซื่อสัตย์กว่าการแต่งคำถามเฉพาะข้อขึ้นมาเองโดยไม่มีที่มา
 * ══════════════════════════════════════════════════════════════════════════ */

import { STANDARDS, annexAOf, type StandardId } from './isoStandards';

/** สเกลวุฒิภาวะ 4 ระดับ ใช้ได้กับทุกข้อกำหนด */
export const MATURITY_CHOICES: [string, string, string, string] = [
  'ยังไม่ได้ทำ',
  'ทำอยู่ แต่ไม่ได้เขียนไว้เป็นเอกสาร',
  'มีเอกสาร แต่ไม่ได้ใช้จริงหรือไม่ทันสมัย',
  'มีเอกสารและใช้จริง ทบทวนสม่ำเสมอ',
];

export interface FullCheckupQuestion {
  id: string;          // = clause id เช่น '4.1'
  section: string;     // '4'..'10'
  sectionTitle: string;
  title: string;       // ชื่อข้อกำหนด
  q: string;           // สิ่งที่ต้องทำ (จาก guide.action)
  keyDoc: string;      // หลักฐานที่ผู้ตรวจมองหา
  priority: 1 | 2 | 3;
  mandatory: boolean;
  /** แนวตีความจากภาคผนวกท้ายเล่ม (Annex A) — เป็น "แนวทาง" ไม่ใช่ข้อกำหนด
   *  ไม่นำมาคิดคะแนน ใช้ช่วยผู้ตอบตีความว่าข้อนั้นต้องการอะไรจริง ๆ */
  annexA?: string;
}

/** สร้างชุดคำถามครบทุกข้อของมาตรฐานที่เลือก */
export function fullCheckupQuestions(std: StandardId): FullCheckupQuestion[] {
  const def = STANDARDS[std];
  const sectionTitle = new Map(def.groups.map((g) => [g.section, g.title]));
  return def.clauses.map((c) => {
    const section = c.id.split('.')[0];
    return {
      id: c.id,
      section,
      sectionTitle: sectionTitle.get(section) ?? `ข้อ ${section}`,
      title: c.title,
      q: c.guide.action,
      keyDoc: c.guide.keyDoc,
      priority: c.guide.priority,
      mandatory: c.guide.mandatoryDoc === true,
      annexA: annexAOf(std, c.id),
    };
  });
}

export interface FullSectionScore {
  section: string;
  title: string;
  score: number;
  max: number;
  pct: number;
  gaps: number;
}

export interface FullCheckupResult {
  standard: StandardId;
  standardCode: string;
  score: number;
  maxScore: number;
  pct: number;
  band: CheckupBand;
  bandLabel: string;
  summary: string;
  sections: FullSectionScore[];
  /** ทุกข้อที่ยังไม่เต็ม เรียงตามความเร่งด่วน */
  gaps: (FullCheckupQuestion & { score: CheckupChoice; weight: number })[];
  missingMandatory: number;
  /** ข้อที่ผู้ตรวจเช็คแน่ (priority 1) และยังไม่พร้อม — คือรายการที่ทำให้ตกจริง */
  blockers: FullCheckupQuestion[];
  effortDays: [number, number];
}

/** ประเมินโหมดเต็ม — คีย์คือ clause id */
export function assessFullCheckup(
  std: StandardId,
  answers: Readonly<Record<string, CheckupChoice>>,
): FullCheckupResult {
  const qs = fullCheckupQuestions(std);
  const bySection = new Map<string, { title: string; score: number; max: number; gaps: number }>();
  const gaps: FullCheckupResult['gaps'] = [];
  let score = 0;

  for (const q of qs) {
    const raw = answers[q.id];
    const s = (raw === 0 || raw === 1 || raw === 2 || raw === 3 ? raw : 0) as CheckupChoice;
    score += s;

    const sec = bySection.get(q.section) ?? { title: q.sectionTitle, score: 0, max: 0, gaps: 0 };
    sec.score += s;
    sec.max += 3;
    if (s < 3) sec.gaps += 1;
    bySection.set(q.section, sec);

    if (s < 3) {
      // ยิ่งคะแนนต่ำ · ยิ่งลำดับความสำคัญสูง · ยิ่งเป็นเอกสารบังคับ → ยิ่งเร่งด่วน
      const weight = (3 - s) * (4 - q.priority) * (q.mandatory ? 2 : 1);
      gaps.push({ ...q, score: s, weight });
    }
  }

  gaps.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id, undefined, { numeric: true }));

  const maxScore = qs.length * 3;
  const pct = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const band = bandOf(pct);
  const missingMandatory = qs.filter((q) => q.mandatory && ((answers[q.id] ?? 0) as number) <= 1).length;
  const blockers = qs.filter((q) => q.priority === 1 && ((answers[q.id] ?? 0) as number) <= 1);

  const base = gaps.reduce((sum, g) => sum + (3 - g.score) * (g.priority === 1 ? 0.4 : 0.2), 0);
  const lo = Math.max(3, Math.round(base + missingMandatory * 0.5));
  const hi = Math.max(lo + 3, Math.round(base * 1.8 + missingMandatory));

  const sections: FullSectionScore[] = [...bySection.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([section, v]) => ({
      section, title: v.title, score: v.score, max: v.max,
      pct: v.max === 0 ? 0 : Math.round((v.score / v.max) * 100),
      gaps: v.gaps,
    }));

  return {
    standard: std,
    standardCode: STANDARDS[std].code,
    score, maxScore, pct, band,
    bandLabel: BAND_LABEL[band],
    summary: BAND_SUMMARY[band],
    sections, gaps, missingMandatory, blockers,
    effortDays: [lo, hi],
  };
}

/** ข้อความกำกับผลลัพธ์ — ต้องแสดงทุกครั้ง ห้ามตัดออก
 *  เหตุผล: การคัดกรอง 12 ข้อไม่ใช่การตรวจประเมิน การปล่อยให้เข้าใจผิดคือความเสี่ยงจริง */
export const CHECKUP_DISCLAIMER =
  'ผลนี้เป็นการคัดกรองเบื้องต้นจากคำถาม 12 ข้อ ไม่ใช่การตรวจประเมินตามมาตรฐาน ' +
  'และไม่สามารถใช้แทนการตรวจรับรองจากหน่วยรับรองได้ ' +
  'ใช้เพื่อดูภาพรวมและจัดลำดับสิ่งที่ควรทำก่อนเท่านั้น';
