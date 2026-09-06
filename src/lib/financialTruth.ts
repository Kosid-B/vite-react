/* financialTruth — ชั้นความจริงของตัวเลขการเงิน + กรวยเศรษฐศาสตร์ของลูกค้า
 *
 * เจ้าของตั้งโจทย์ 6 ก.ย. 2569:
 *   *"ธุรกิจไม่ได้ชี้ขาดที่การได้ลูกค้าครั้งแรก แต่ชี้ขาดที่ Activation → First Value → Second Payment"*
 *   และสั่งว่า **ห้าม Dashboard เอา ASSUMED ไปแสดงเหมือนเป็น Actual**
 *
 * 🔴 นี่คือ **แกนที่สาม ไม่ใช่ taxonomy ซ้ำ** — ต้องพูดให้ตรงว่าต่างกันตรงไหน:
 *   · `decisionRules.ThresholdStatus`  = *เกณฑ์นี้พิสูจน์แล้วหรือยัง*   (policy/hypothesis/validated)
 *   · `positioningEngine.ClaimStatus`  = *คำกล่าวอ้างนี้เชื่อได้แค่ไหน* (hypothesis→validated)
 *   · ไฟล์นี้ `TruthLevel`             = **ตัวเลขนี้มาจากไหน**          (วัดจริง/คำนวณ/สมมติ/รอใบเสนอราคา/ไม่มี)
 *   ⇒ ตัวเลขเดียวกันมี ThresholdStatus ไม่ได้ · เกณฑ์เดียวกันมี TruthLevel ไม่ได้ — คนละคำถาม
 *
 * 🔴 กฎที่ทั้งไฟล์ยืนอยู่บน: **ค่าที่คำนวณออกมา แข็งแรงกว่าวัตถุดิบที่อ่อนที่สุดไม่ได้**
 *   LTV ที่คำนวณจาก renewal 50% ที่เราเดาเอง = ตัวเลข **สมมติ** ไม่ใช่ตัวเลขจริง
 *   ต่อให้สูตรถูกทุกบรรทัด · นี่คือกลไกที่กันไม่ให้ค่าสมมติรั่วขึ้นแดชบอร์ดในคราบของจริง
 *
 * ⚠️ ไม่แตะฐานข้อมูล ไม่มี migration — pure ทั้งไฟล์ (ด่านปล่อยของยังกั้น schema อยู่)
 */

import { MIN_FOR_RATE } from './growthPdca';

/* ══════════════════════════════════════════════════════════════════
 * ชั้นความจริง
 * ══════════════════════════════════════════════════════════════════ */

export type TruthLevel =
  | 'measured'      // นับจากของจริงในระบบเรา
  | 'derived'       // คำนวณจากค่าอื่น — แข็งแรงเท่าวัตถุดิบที่อ่อนที่สุด
  | 'assumed'       // เราตั้งเอง ยังไม่มีหลักฐาน
  | 'placeholder'   // รอตัวเลขจริงจากภายนอก (ใบเสนอราคา ฯลฯ)
  | 'unavailable';  // ยังไม่มีข้อมูลให้คำนวณเลย

/** เรียงจากแข็งแรงที่สุดไปอ่อนที่สุด — ใช้หา "วัตถุดิบที่อ่อนที่สุด" */
export const TRUTH_ORDER: readonly TruthLevel[] = [
  'measured', 'derived', 'assumed', 'placeholder', 'unavailable',
];

export interface FinancialFact {
  key: string;
  label: string;
  /** 🔴 `null` = ไม่มีค่า ≠ 0 */
  value: number | null;
  level: TruthLevel;
  unit: string;
  /** ค่านี้มาจากไหน — บังคับมี ห้ามปล่อยลอย */
  source: string;
}

/** ระดับที่อ่อนที่สุดในกลุ่ม — หัวใจของการกันค่าสมมติรั่ว */
export function weakest(levels: readonly TruthLevel[]): TruthLevel {
  if (levels.length === 0) return 'unavailable';
  return levels.reduce((w, l) =>
    TRUTH_ORDER.indexOf(l) > TRUTH_ORDER.indexOf(w) ? l : w, TRUTH_ORDER[0]);
}

/** คำนวณค่าใหม่จากหลายค่า — ระดับผลลัพธ์ถูกกดลงตามวัตถุดิบที่อ่อนที่สุดเสมอ
 *  🔴 นี่คือกลไกหลักของไฟล์: สูตรถูกไม่ได้แปลว่าตัวเลขเชื่อได้ */
export function derive(
  key: string, label: string, unit: string,
  inputs: readonly FinancialFact[],
  fn: (vals: number[]) => number | null,
): FinancialFact {
  const src = inputs.map((i) => i.key).join(' · ');
  if (inputs.some((i) => i.value === null)) {
    return { key, label, value: null, level: 'unavailable', unit,
      source: `คำนวณจาก ${src} — ยังขาดค่าตั้งต้น` };
  }
  const raw = fn(inputs.map((i) => i.value as number));
  const w = weakest(inputs.map((i) => i.level));
  return {
    key, label, value: raw, unit,
    // ผลลัพธ์เป็น 'derived' ได้ก็ต่อเมื่อวัตถุดิบทุกตัววัดจริง — ไม่งั้นตกชั้นตามตัวที่อ่อนที่สุด
    level: raw === null ? 'unavailable' : (w === 'measured' ? 'derived' : w),
    source: `คำนวณจาก ${src}`,
  };
}

/** แดชบอร์ดแสดงค่านี้เป็น "ตัวเลขจริง" ได้ไหม
 *  🔴 เจ้าของสั่งตรง ๆ: ห้ามเอา ASSUMED ไปแสดงเหมือนเป็น Actual */
export function showAsActual(f: FinancialFact): boolean {
  return f.value !== null && (f.level === 'measured' || f.level === 'derived');
}

/** ป้ายที่ต้องติดคู่ตัวเลขเสมอเมื่อยังไม่ใช่ของจริง */
export const TRUTH_BADGE: Record<TruthLevel, string> = {
  measured: '',
  derived: '',
  assumed: '🟡 สมมติ',
  placeholder: '🟡 รอตัวเลขจริง',
  unavailable: '🔴 ยังไม่มีข้อมูล',
};

/* ══════════════════════════════════════════════════════════════════
 * กรวยเศรษฐศาสตร์ — ห้ามข้ามขั้น
 * ══════════════════════════════════════════════════════════════════ */

export type EconStageKey =
  | 'paidStarter' | 'activated48h' | 'firstValue7d' | 'w3Active' | 'corePaid' | 'renewed';

export interface EconStage {
  key: EconStageKey;
  label: string;
  /** เกิดอะไรถึงนับว่าผ่านขั้นนี้ */
  definition: string;
  /** ต้องบันทึกเวลาอะไรถึงจะวัดขั้นนี้ได้ */
  needsTimestamp: string;
}

export const ECON_FUNNEL: readonly EconStage[] = [
  { key: 'paidStarter', label: 'จ่ายเข้ามาแล้ว', definition: 'จ่ายค่าแพ็กเริ่มต้นสำเร็จ', needsTimestamp: 'paid_at' },
  { key: 'activated48h', label: 'เปิดใช้ใน 48 ชม.', definition: 'เข้าใช้งานจริงครั้งแรกภายใน 48 ชม. หลังจ่าย', needsTimestamp: 'first_login_at' },
  { key: 'firstValue7d', label: 'ได้ผลลัพธ์แรกใน 7 วัน', definition: 'ทำงานจริงสำเร็จอย่างน้อย 1 ชิ้น', needsTimestamp: 'first_job_completed_at' },
  { key: 'w3Active', label: 'กลับมาใช้สัปดาห์ที่ 3', definition: 'ยังใช้งานอยู่ในสัปดาห์ที่ 3', needsTimestamp: 'last_active_at' },
  { key: 'corePaid', label: 'ซื้อสินค้าหลัก', definition: 'จ่ายค่าแพ็กหลักรายปี', needsTimestamp: 'core_paid_at' },
  { key: 'renewed', label: 'ต่ออายุ', definition: 'จ่ายรอบที่สองเมื่อครบกำหนด', needsTimestamp: 'renewed_at' },
];

/** เวลาที่ต้องบันทึกเพื่อวัดกรวยนี้ได้ — 🔴 วันนี้ยังไม่มีสักตัว (ต้องแตะ schema = ด่านปล่อยของกั้นอยู่) */
export const REQUIRED_TIMESTAMPS: readonly string[] =
  ECON_FUNNEL.map((s) => s.needsTimestamp);

export interface EconInput {
  acquisitionSpend?: number | null;
  paidStarter?: number | null;
  activated48h?: number | null;
  firstValue7d?: number | null;
  w3Active?: number | null;
  corePaid?: number | null;
  renewed?: number | null;
  /** รายได้ที่ถึงกำหนดต่ออายุในช่วงที่ดู */
  eligibleRenewalRevenue?: number | null;
  renewedRevenue?: number | null;
  /** กำไรส่วนเพิ่มต่อเดือนต่อลูกค้า 1 ราย */
  monthlyContributionMargin?: number | null;
  contributionLtv?: number | null;
}

const m = (key: string, label: string, v: number | null | undefined, unit: string, source: string): FinancialFact =>
  ({ key, label, value: v ?? null, unit, level: v == null ? 'unavailable' : 'measured', source });

/* ══════════════════════════════════════════════════════════════════
 * 8 ตัวชี้วัดที่เจ้าของกำหนด
 * ══════════════════════════════════════════════════════════════════ */

export function econMetrics(inp: EconInput = {}): FinancialFact[] {
  const spend = m('acquisitionSpend', 'งบหาลูกค้า', inp.acquisitionSpend, 'บาท', 'ระบบโฆษณา (เจ้าของกรอก)');
  const starter = m('paidStarter', 'ลูกค้าที่จ่ายเข้ามา', inp.paidStarter, 'ราย', 'payments (ตัดที่ admin-free ออกแล้ว)');
  const act = m('activated48h', 'เปิดใช้ใน 48 ชม.', inp.activated48h, 'ราย', 'first_login_at (ยังไม่มีในระบบ)');
  const fv = m('firstValue7d', 'ได้ผลลัพธ์แรกใน 7 วัน', inp.firstValue7d, 'ราย', 'first_job_completed_at (ยังไม่มีในระบบ)');
  const core = m('corePaid', 'ซื้อสินค้าหลัก', inp.corePaid, 'ราย', 'payments');
  const cm = m('monthlyContributionMargin', 'กำไรส่วนเพิ่ม/เดือน/ราย', inp.monthlyContributionMargin, 'บาท', 'ต้นทุนจริง (ยังไม่ได้แยก)');
  const ltv = m('contributionLtv', 'LTV เชิงกำไรส่วนเพิ่ม', inp.contributionLtv, 'บาท', 'ต้องมี cohort จริง');
  const renewRev = m('renewedRevenue', 'รายได้ที่ต่ออายุ', inp.renewedRevenue, 'บาท', 'payments');
  const eligRev = m('eligibleRenewalRevenue', 'รายได้ที่ถึงกำหนดต่ออายุ', inp.eligibleRenewalRevenue, 'บาท', 'payments');

  const per = (a: FinancialFact, b: FinancialFact, key: string, label: string) =>
    derive(key, label, 'บาท/ราย', [a, b], ([s, n]) => (n > 0 ? Math.round(s / n) : null));

  const cac = per(spend, core, 'coreCac', 'ต้นทุนได้ลูกค้าหลัก 1 ราย (CAC จริง)');

  return [
    per(spend, starter, 'starterCpa', 'ต้นทุนต่อคนที่จ่ายเข้ามา (CPA)'),
    per(spend, act, 'activationCpa', 'ต้นทุนต่อคนที่เปิดใช้จริง'),
    per(spend, fv, 'firstValueCpa', 'ต้นทุนต่อคนที่ได้ผลลัพธ์แรก'),
    cac,
    derive('starterToCoreCvr', 'อัตราแปลงเป็นลูกค้าหลัก', 'สัดส่วน', [core, starter],
      ([c, s]) => (s >= MIN_FOR_RATE ? c / s : null)),
    derive('cacPayback', 'คืนทุนค่าหาลูกค้าใน (เดือน)', 'เดือน', [cac, cm],
      ([c, margin]) => (margin > 0 ? Math.round((c / margin) * 10) / 10 : null)),
    derive('ltvToCac', 'LTV ต่อ CAC', 'เท่า', [ltv, cac],
      ([l, c]) => (c > 0 ? Math.round((l / c) * 100) / 100 : null)),
    derive('revenueRetention', 'อัตรารักษารายได้', 'สัดส่วน', [renewRev, eligRev],
      ([r, e]) => (e > 0 ? r / e : null)),
  ];
}

/* ══════════════════════════════════════════════════════════════════
 * กับดัก CPA — จุดที่เจ้าของชี้ว่าอันตรายที่สุด
 * ══════════════════════════════════════════════════════════════════ */

export interface CacTrap {
  cpa: number | null;
  coreCac: number | null;
  /** CAC จริงแพงกว่า CPA กี่เท่า — `null` = ตรวจไม่ได้ */
  multiple: number | null;
  verdict: 'ok' | 'trap' | 'unknown';
  why: string;
}

/** *"CPA 700 บาทอาจดูดีบน Ads Dashboard แต่ยังเป็น CAC ที่แย่ได้"*
 *  ⇒ เลิก optimize เฉพาะ CPA · ต้องดูต้นทุนต่อลูกค้าที่ **ได้ผลลัพธ์จริง** */
export function cacTrap(inp: EconInput = {}): CacTrap {
  const spend = inp.acquisitionSpend ?? null;
  const starter = inp.paidStarter ?? null;
  const core = inp.corePaid ?? null;
  if (spend === null || !starter) {
    return { cpa: null, coreCac: null, multiple: null, verdict: 'unknown',
      why: 'ยังไม่มีงบหาลูกค้าหรือจำนวนคนที่จ่ายเข้ามา ⇒ คำนวณไม่ได้ · ห้ามเดาว่าถูกหรือแพง' };
  }
  const cpa = Math.round(spend / starter);
  if (core === null) {
    return { cpa, coreCac: null, multiple: null, verdict: 'unknown',
      why: `CPA ${cpa} บาท — แต่ยังไม่รู้ว่ากี่คนซื้อสินค้าหลัก ⇒ **ยังบอกไม่ได้ว่าคุ้มไหม** · ` +
        'ตัวเลขนี้วัดการซื้อครั้งแรก ไม่ได้วัดว่าธุรกิจอยู่รอด' };
  }
  if (core === 0) {
    return { cpa, coreCac: null, multiple: null, verdict: 'trap',
      why: `CPA ${cpa} บาท แต่ยังไม่มีใครซื้อสินค้าหลักเลย ⇒ ต้นทุนต่อลูกค้าที่อยู่ต่อยัง**หารไม่ได้** ` +
        '— นี่คือสถานะที่ CPA สวยที่สุดและอันตรายที่สุดพร้อมกัน' };
  }
  const coreCac = Math.round(spend / core);
  const multiple = Math.round((coreCac / cpa) * 10) / 10;
  return {
    cpa, coreCac, multiple,
    verdict: multiple >= 3 ? 'trap' : 'ok',
    why: `CPA ${cpa} บาท · แต่ต้นทุนต่อลูกค้าหลักจริง ${coreCac} บาท (${multiple} เท่า) — ` +
      (multiple >= 3
        ? 'ส่วนต่างนี้คือคนที่จ่ายแล้วไม่ไปต่อ ⇒ แก้ Activation ก่อนเพิ่มงบ'
        : 'ส่วนต่างยังอยู่ในระดับที่อธิบายได้'),
  };
}

/* ══════════════════════════════════════════════════════════════════
 * North Star + ด่านปล่อยเงินลงทุน
 * ══════════════════════════════════════════════════════════════════ */

/** *"% ของ Paid Customers ที่ได้ผลลัพธ์ธุรกิจแรกที่ตรวจสอบได้ภายใน X วัน"*
 *  🔴 ต้องเป็น **ผลลัพธ์ที่ตรวจสอบได้** ไม่ใช่ "เข้าใช้งานแล้ว" */
export function verifiedFirstOutcomeRate(inp: EconInput = {}): FinancialFact {
  const fv = m('firstValue7d', 'ได้ผลลัพธ์แรก', inp.firstValue7d, 'ราย', 'ยังไม่มีตัวบันทึกในระบบ');
  const paid = m('paidStarter', 'ลูกค้าที่จ่าย', inp.paidStarter, 'ราย', 'payments');
  return derive('verifiedFirstOutcomeRate', 'อัตราได้ผลลัพธ์ธุรกิจแรกที่ตรวจสอบได้', 'สัดส่วน',
    [fv, paid], ([f, p]) => (p > 0 ? f / p : null));
}

export interface InvestmentGate {
  n: 0 | 1 | 2 | 3 | 4 | 5;
  evidence: string;
  unlocks: string;
  /** 🔴 ทุกด่านต้องให้คนอนุมัติ — ระบบเสนอได้ ปล่อยเงินเองไม่ได้ */
  humanApproval: true;
}

export const INVESTMENT_GATES: readonly InvestmentGate[] = [
  { n: 0, evidence: 'มีคนยอมจ่ายเงินจริง', unlocks: 'สร้าง MVP', humanApproval: true },
  { n: 1, evidence: 'Activation เกิดจริง (วัดได้)', unlocks: 'ปรับ onboarding', humanApproval: true },
  { n: 2, evidence: 'First Value เกิดจริง (ตรวจสอบได้)', unlocks: 'เริ่มเพิ่มลูกค้า', humanApproval: true },
  { n: 3, evidence: 'มีหลักฐานการแปลงเป็นลูกค้าหลัก', unlocks: 'ปลดงบ Growth', humanApproval: true },
  { n: 4, evidence: 'cohort ต่ออายุมีหลักฐาน', unlocks: 'Scale', humanApproval: true },
  { n: 5, evidence: 'unit economics + กระแสเงินสดผ่าน', unlocks: 'ขยาย B2B', humanApproval: true },
];

/** ด่านแรกที่ยังผ่านไม่ได้ — fail-closed เสมอเมื่อวัดไม่ได้ */
export function investmentGateStatus(inp: EconInput = {}): {
  stuckAt: InvestmentGate; why: string; canRelease: false;
} {
  const paid = inp.paidStarter ?? null;
  const act = inp.activated48h ?? null;
  const fv = inp.firstValue7d ?? null;
  const core = inp.corePaid ?? null;
  const renewed = inp.renewed ?? null;
  const g = (n: number) => INVESTMENT_GATES[n];
  if (!paid) return { stuckAt: g(0), why: 'ยังไม่มีลูกค้าที่จ่ายเงินจริง', canRelease: false };
  if (act === null) return { stuckAt: g(1), why: 'วัด Activation ไม่ได้ (ยังไม่บันทึก first_login_at)', canRelease: false };
  if (fv === null) return { stuckAt: g(2), why: 'วัด First Value ไม่ได้ (ยังไม่บันทึก first_job_completed_at)', canRelease: false };
  if (!core) return { stuckAt: g(3), why: 'ยังไม่มีใครแปลงเป็นลูกค้าหลัก', canRelease: false };
  if (!renewed) return { stuckAt: g(4), why: 'ยังไม่มี cohort ที่ต่ออายุ', canRelease: false };
  return { stuckAt: g(5), why: 'ต้องตรวจ unit economics + กระแสเงินสดก่อนขยาย B2B', canRelease: false };
}

/** เกณฑ์ที่เจ้าของย้ำว่าห้ามใช้ผิดความหมาย */
export const BREAK_EVEN_CVR = 0.02;
export const BASE_CASE_CVR = 0.15;
/** 🔴 2% = เส้นรอดตามโมเดล **ไม่ใช่เป้าหมาย** · 15% = สมมติ จนกว่าจะมี cohort จริง */
export const CVR_NOTE =
  `${BREAK_EVEN_CVR * 100}% คือเส้นที่แค่ไม่ขาดทุนตามโมเดล ห้ามใช้เป็นเป้าหมายธุรกิจ · ` +
  `${BASE_CASE_CVR * 100}% ใน Base Case เป็นค่า **สมมติ** จนกว่าจะมี cohort จริง`;
