// founderMindset.ts — ด่านความพร้อมก่อนเร่งเครื่อง (Founder Mindset Engine)
//
// ทำไมต้องมี: คำถามที่ผู้ใช้ถามบ่อยที่สุดคือ "จะยิงแอดยังไงให้ได้ผล"
// แต่คำถามที่ควรตอบก่อนคือ "มีอะไรให้ยิงแอดแล้วหรือยัง" — ยิงแอดใส่ของที่ยังไม่มีคนซื้อ
// คือวิธีเผาเงินที่เร็วที่สุดที่ SME ไทยทำกันเป็นประจำ และไม่มีเครื่องมือไหนเตือน
// เพราะเครื่องมือทุกตัวถูกออกแบบมาให้ "ทำตามที่สั่ง"
//
// ═══ กติกาสองข้อที่ห้ามแก้ ═══
//
// 1. **ด่านอ่านจากข้อมูลจริง ห้ามให้ติ๊กเอง**
//    ถ้าเป็นช่องติ๊ก มันก็คือความเห็นของเจ้าของอีกแบบ แค่มีกล่องสี่เหลี่ยมล้อมไว้
//    เจ้าของทุกคนเชื่อว่าปัญหาของตัวเองจริงและลูกค้ารออยู่ — นั่นคือเหตุผลที่ต้องมีด่านนี้
//    ไม่ใช่เหตุผลที่จะให้เขาเป็นคนตอบเอง
//
// 2. **เตือน ไม่ใช่ห้าม**
//    ระบบไม่มีสิทธิ์บอกเจ้าของธุรกิจว่าห้ามใช้เงินตัวเอง · หน้าที่ของมันคือทำให้
//    "ยังไม่มีหลักฐาน" มองเห็นได้ก่อนจ่าย ไม่ใช่ปิดปุ่ม · เครื่องมือที่ขัดใจผู้ใช้
//    เพื่อผลดีของผู้ใช้ ยังเป็นเครื่องมือที่ผู้ใช้เลิกใช้อยู่ดี
//
// pure + tested · ไม่เรียกเน็ต ไม่อ่านเวลา (deterministic)

import type { AppData, PageId } from '../types';
import { DEFAULT_DATA } from '../data';

/**
 * คำถามที่ทุกฟีเจอร์/คอนเทนต์/แคมเปญต้องตอบให้ได้ก่อนสร้าง
 *
 * ⚠️ ตัดสิน "คำตอบ" ด้วยโค้ดไม่ได้ และห้ามแกล้งทำว่าได้
 * ระบบทำได้แค่บังคับให้มีคำตอบ ส่วนคำตอบดีพอไหมเป็นงานของคนหรือของบอร์ด
 */
export const GOLDEN_QUESTION =
  'สิ่งที่กำลังทำนี้ช่วยให้ธุรกิจเข้าใกล้ลูกค้า หลักฐาน กำไร หรือขยายได้ มากขึ้นอย่างไร?';

export type GateId = 'problem' | 'customer' | 'offer' | 'economics' | 'tracking' | 'evidence';

export interface Gate {
  id: GateId;
  /** คำถามในภาษาที่เจ้าของธุรกิจใช้ ไม่ใช่ศัพท์ startup */
  question: string;
  passed: boolean;
  /** ทำไมถึงผ่าน/ไม่ผ่าน — ต้องอ้างข้อมูลจริงเสมอ ไม่ใช่คำอธิบายลอย ๆ */
  evidence: string;
  /** ยังไม่ผ่าน → ทำอะไรต่อ */
  action: string;
  goto: PageId;
}

/** ระยะของธุรกิจ — ใช้เลือกว่าจะแนะนำให้ "พิสูจน์" หรือ "เร่ง" */
export type Stage = 'validate' | 'build' | 'scale';

export const STAGE_LABEL: Record<Stage, string> = {
  validate: 'ยังต้องพิสูจน์',
  build: 'กำลังสร้างระบบ',
  scale: 'พร้อมขยาย',
};

/** id ของดีลสาธิตที่มากับแอป — ห้ามนับเป็นหลักฐานว่ามีคนจ่ายเงินจริง */
const DEMO_DEAL_IDS = new Set((DEFAULT_DATA.marketplace?.deals ?? []).map((x) => x.id));

/** จำนวนครั้งที่รายได้ต้องเกิดซ้ำ ถึงจะนับว่าไม่ใช่ลูกค้ารายเดียวบังเอิญ */
const REPEAT_THRESHOLD = 3;

/**
 * ประเมินความพร้อมจากข้อมูลที่มีอยู่จริงในระบบ
 *
 * ทุกด่านต้องชี้ไปที่ข้อมูลที่ผู้ใช้ลงแรงใส่เข้ามาเอง ไม่ใช่ช่องที่กดผ่านได้
 */
export function assessReadiness(d: AppData): Gate[] {
  const revenueEntries = (d.finance ?? []).filter((e) => e.kind === 'revenue');
  /**
   * ⚠️ ตัดดีลตัวอย่างที่มากับแอปออกก่อนเสมอ
   *
   * DEFAULT_DATA มีดีลสาธิต 'dl1' สถานะ closed มูลค่า 45,000 บาทติดมาด้วย
   * นับรวมเมื่อไร ผู้ใช้ที่เพิ่งเปิดแอปวินาทีแรกจะถูกบอกว่า "มีคนจ่ายเงินให้เราแล้ว"
   * ทั้งที่ยังไม่มีใครจ่ายสักบาท — เป็นการหลอกตัวเองที่ระบบเป็นคนสร้างให้
   * ซึ่งตรงข้ามกับเหตุผลทั้งหมดที่ด่านชุดนี้มีอยู่
   *
   * เทียบกับ id ของ DEFAULT_DATA แทนการเขียน id ไว้ตรง ๆ เพื่อให้เปลี่ยนข้อมูลสาธิต
   * เมื่อไร ตัวกรองก็ตามไปเอง (เขียนไว้ตรง ๆ แล้ววันหนึ่งจะหลุดโดยไม่มีใครรู้)
   */
  const closedDeals = (d.marketplace?.deals ?? []).filter(
    (x) => x.status === 'closed' && !DEMO_DEAL_IDS.has(x.id),
  );
  const personas = d.personas ?? [];

  /**
   * นับเฉพาะรายการที่ผู้ใช้กรอกเอง ไม่รวมรายการอัตโนมัติ
   *
   * autoEntries() ใส่ "ค่าแพ็กเกจ CEO AI Thailand" เป็นรายจ่ายให้อัตโนมัติเมื่อจ่ายแพ็ก
   * นับรวมด้วยเมื่อไร ด่าน "รู้กำไรจริง" จะผ่านเองทันทีที่จ่ายค่าแพ็ก
   * ทั้งที่ผู้ใช้ยังไม่เคยบันทึกต้นทุนธุรกิจตัวเองสักบาท
   */
  const manual = d.finance ?? [];
  const revenue = manual.filter((e) => e.kind === 'revenue').reduce((s2, e) => s2 + e.amount, 0);
  const expense = manual.filter((e) => e.kind === 'expense').reduce((s2, e) => s2 + e.amount, 0);

  // ── 1. ปัญหาจริงหรือเราคิดไปเอง ──
  const research = d.marketInsight;
  const verdict = d.cmoValidation?.verdict;
  const problemPassed = Boolean(research) || verdict === 'go';

  // ── 2. รู้หรือยังว่าขายให้ใคร ──
  const customerPassed = personas.length > 0 && Boolean(d.audienceType);

  // ── 3. มีคนจ่ายจริงแล้วหรือยัง ──
  const paidOnce = revenueEntries.length > 0 || closedDeals.length > 0;

  // ── 4. ขายแล้วเหลือเท่าไร ──
  const economicsPassed = revenue > 0 && expense > 0;

  // ── 5. วัดผลได้จริงไหม ──
  const trackingPassed = d.funnelSource === 'real';

  // ── 6. เกิดซ้ำหรือบังเอิญครั้งเดียว ──
  const repeats = revenueEntries.length + closedDeals.length;
  const evidencePassed = repeats >= REPEAT_THRESHOLD;

  return [
    {
      id: 'problem',
      question: 'ปัญหานี้เป็นปัญหาจริงของลูกค้า หรือเราคิดไปเอง',
      passed: problemPassed,
      evidence: research
        ? `ยืนยันผลวิจัยตลาดแล้ว (${research.segments.length} กลุ่มเป้าหมาย)`
        : verdict === 'go'
          ? 'ผ่านการพิสูจน์ไอเดียของ CMO แล้ว (GO)'
          : 'ยังไม่มีผลวิจัยตลาดหรือผลพิสูจน์ไอเดียในระบบ',
      action: 'ทำวิจัยตลาดให้จบก่อน — ยังไม่ต้องสร้างอะไร',
      // 'marketing' คือหน้าที่มีเครื่องมือประเมินขนาดตลาด (MarketSizingPanel)
      // ไม่ใช่ 'market' ซึ่งเป็น Marketplace ตลาด B2B และยังต้องใช้แพ็ก growth ด้วย
      goto: 'marketing',
    },
    {
      id: 'customer',
      question: 'ระบุได้ไหมว่าลูกค้าคนแรกคือใคร',
      passed: customerPassed,
      evidence: customerPassed
        ? `ตั้งลูกค้าเป้าหมายไว้ ${personas.length} แบบ · ขายให้${d.audienceType === 'b2b' ? 'ธุรกิจ' : 'ลูกค้าทั่วไป'}`
        : personas.length === 0
          ? 'ยังไม่ได้ตั้งลูกค้าเป้าหมายสักแบบ'
          : 'ยังไม่ได้เลือกว่าขายให้ธุรกิจหรือขายให้ลูกค้าทั่วไป',
      action: 'ตั้งลูกค้าเป้าหมายให้เจาะจงจนนึกหน้าออก',
      goto: 'personas',
    },
    {
      id: 'offer',
      question: 'มีคนจ่ายเงินให้เราแล้วหรือยัง',
      passed: paidOnce,
      evidence: paidOnce
        ? `มีรายรับ ${revenueEntries.length} รายการ · ดีลที่ปิดได้ ${closedDeals.length} ดีล`
        : 'ยังไม่มีรายรับหรือดีลที่ปิดได้ในระบบ',
      action: 'หาลูกค้าคนแรกให้ได้ก่อน แม้แค่รายเดียวก็เปลี่ยนทุกอย่าง',
      goto: 'storefront',
    },
    {
      /**
       * ⚠️ ด่านนี้เคยอ่านจาก growthEco (ARPU/LTV/MRR) ซึ่งกรอกได้เฉพาะในหน้าผู้ดูแลระบบ
       * ผู้ใช้ทั่วไปจึงผ่านไม่ได้ตลอดกาล และเพราะ nextBestAction() คืนด่านแรกที่ยังไม่ผ่าน
       * ทุกคนที่ผ่านสามด่านแรกจะถูกจอดอยู่ที่งานที่ตัวเองทำไม่ได้ — ทางตันที่ไม่มีอะไรฟ้อง
       *
       * ย้ายมาอ่านจากรายรับ-รายจ่ายที่ผู้ใช้กรอกเองในคลังเมือง ซึ่งเป็นตัวเลขเดียวกัน
       * ที่เจ้าของ SME คิดอยู่แล้วทุกวัน: ขายได้เท่าไร จ่ายไปเท่าไร เหลือเท่าไร
       */
      id: 'economics',
      question: 'ขายแล้วเหลือกำไรเท่าไร รู้ตัวเลขจริงหรือเดาเอา',
      passed: economicsPassed,
      evidence: economicsPassed
        ? `รายรับ ${revenue.toLocaleString('th-TH')} บาท · รายจ่าย ${expense.toLocaleString('th-TH')} บาท · ` +
          `เหลือ ${(revenue - expense).toLocaleString('th-TH')} บาท`
        : revenue > 0
          ? 'บันทึกรายรับแล้ว แต่ยังไม่ได้บันทึกรายจ่าย จึงยังไม่รู้ว่าเหลือเท่าไร'
          : 'ยังไม่ได้บันทึกรายรับกับรายจ่ายจริง',
      action: 'บันทึกรายรับกับรายจ่ายจริง แล้วดูว่าขายแล้วเหลือเท่าไร',
      goto: 'city',
    },
    {
      id: 'tracking',
      question: 'ถ้ายิงเงินออกไป จะรู้ไหมว่าอันไหนได้ผล',
      passed: trackingPassed,
      evidence: trackingPassed
        ? 'ใส่ตัวเลขจริงในกรวยลูกค้าแล้ว'
        : 'กรวยลูกค้ายังเป็นตัวเลขตัวอย่าง ไม่ใช่ของจริง',
      action: 'ใส่ตัวเลขจริงลงกรวยลูกค้าก่อน ไม่งั้นจ่ายไปก็ไม่รู้ว่าอันไหนได้ผล',
      goto: 'funnel',
    },
    {
      id: 'evidence',
      question: 'มันเกิดซ้ำได้ หรือบังเอิญครั้งเดียว',
      passed: evidencePassed,
      evidence: evidencePassed
        ? `มีรายการรายได้/ดีลรวม ${repeats} ครั้ง`
        : `มี ${repeats} ครั้ง ยังไม่ถึง ${REPEAT_THRESHOLD} ครั้งที่จะบอกได้ว่าไม่ใช่ฟลุ๊ก`,
      action: 'ทำซ้ำให้ได้อีก แล้วดูว่าวิธีเดิมยังใช้ได้ไหม',
      goto: 'city',
    },
  ];
}

export function passedCount(gates: Gate[]): number {
  return gates.filter((g) => g.passed).length;
}

/**
 * ระยะของธุรกิจจากจำนวนด่านที่ผ่าน
 *
 * ไม่ใช่คะแนน ไม่ใช่เกรด — เป็นแค่ตัวบอกว่าคำแนะนำต่อไปควรเป็นแนวไหน
 * ตั้งเป็นคะแนนเมื่อไรผู้ใช้จะเริ่มไล่ทำให้ตัวเลขสวย แทนที่จะทำธุรกิจ
 */
export function readinessStage(gates: Gate[]): Stage {
  const passed = passedCount(gates);
  if (passed >= 5) return 'scale';
  if (passed >= 3) return 'build';
  return 'validate';
}

/** งานที่ใช้เงินก้อน — แต่ละอย่างต้องการหลักฐานคนละชุด */
export type ScaleActionId = 'ads' | 'hire' | 'inventory' | 'expand';

export interface ScaleAction {
  id: ScaleActionId;
  label: string;
  /** ด่านที่ควรผ่านก่อน — ไม่ใช่ทุกด่าน เพราะแต่ละงานเสี่ยงคนละแบบ */
  requires: GateId[];
}

export const SCALE_ACTIONS: ScaleAction[] = [
  // ยิงแอดใส่ของที่ยังไม่มีคนซื้อ = จ่ายเงินเพื่อให้คนเห็นของที่เขาไม่ซื้ออยู่ดี
  { id: 'ads', label: 'ลงโฆษณา', requires: ['problem', 'customer', 'offer', 'economics', 'tracking'] },
  // จ้างคนก่อนมีรายได้ซ้ำ = เพิ่มรายจ่ายประจำด้วยรายได้ที่ยังไม่ประจำ
  { id: 'hire', label: 'จ้างเพิ่ม', requires: ['offer', 'economics', 'evidence'] },
  { id: 'inventory', label: 'สต็อกของ', requires: ['offer', 'evidence'] },
  { id: 'expand', label: 'ขยายสาขา/ตลาดใหม่', requires: ['offer', 'economics', 'evidence', 'tracking'] },
];

export interface ScaleVerdict {
  action: ScaleAction;
  /** ด่านที่ยังไม่ผ่านและงานนี้ต้องการ */
  blockers: Gate[];
  ready: boolean;
  /** ข้อความที่จะให้ผู้ใช้อ่าน — ตรงไปตรงมา ไม่ประชด ไม่สั่งสอน */
  message: string;
}

/**
 * ตรวจก่อนใช้เงินก้อน
 *
 * ⚠️ คืนคำเตือน ไม่ได้คืนคำสั่งห้าม · ผู้เรียกต้องไม่เอา ready ไปปิดปุ่ม
 * เจ้าของธุรกิจอาจรู้อะไรที่ระบบไม่รู้ (ลูกค้าเก่าโทรมาสั่ง สัญญาที่ยังไม่ได้กรอก)
 * ระบบที่มั่นใจว่าตัวเองรู้ดีกว่าเจ้าของ คือระบบที่เจ้าของเลิกใช้
 */
export function scaleCheck(actionId: ScaleActionId, gates: Gate[]): ScaleVerdict {
  const action = SCALE_ACTIONS.find((a) => a.id === actionId) ?? SCALE_ACTIONS[0];
  const blockers = gates.filter((g) => action.requires.includes(g.id) && !g.passed);

  return {
    action,
    blockers,
    ready: blockers.length === 0,
    message: blockers.length === 0
      ? `หลักฐานครบสำหรับ "${action.label}" แล้ว`
      : `ยัง${action.label}ได้ แต่ยังไม่มีหลักฐาน ${blockers.length} ข้อ — ` +
        `ถ้าไม่ผ่านแล้วทำเลย ให้ตั้งงบเท่าที่ยอมเสียได้ทั้งหมด`,
  };
}

export interface NextAction {
  title: string;
  why: string;
  goto: PageId;
  /** true = เป็นงานพิสูจน์ ไม่ใช่งานเร่งยอด */
  isValidation: boolean;
}

/**
 * งานถัดไปที่คุ้มที่สุด — ด่านแรกที่ยังไม่ผ่าน
 *
 * ทำไมเอาแค่ "หนึ่ง" งาน: รายการยาว ๆ อ่านแล้วรู้สึกดีแต่ไม่มีใครเริ่ม
 * คนที่มีเวลาว่างวันละชั่วโมงต้องการรู้ว่า "พรุ่งนี้ทำอะไร" ไม่ใช่ "มีอะไรต้องทำบ้าง"
 */
export function nextBestAction(gates: Gate[]): NextAction {
  const blocked = gates.find((g) => !g.passed);

  if (!blocked) {
    return {
      title: 'ถึงเวลาเร่งเครื่อง',
      why: 'ผ่านครบทุกด่านแล้ว — ขยายสิ่งที่พิสูจน์แล้วว่าได้ผล',
      goto: 'analytics',
      isValidation: false,
    };
  }

  return {
    title: blocked.action,
    why: blocked.evidence,
    goto: blocked.goto,
    isValidation: true,
  };
}
