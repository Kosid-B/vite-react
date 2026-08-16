/* productQuickCheck — "ตรวจสินค้าเร็ว" บนหน้า Landing (ประตูหน้าของระบบ)
 *
 * ปัญหาที่แก้: คนแปลกหน้าที่เพิ่งเข้าเว็บครั้งแรก ไม่มีเหตุผลจะสมัคร เพราะยังไม่เห็นคุณค่าอะไรเลย
 *   ระบบมี 30+ หน้า แต่ทุกหน้าอยู่หลังประตูสมัคร → ไม่มีใครเดินเข้ามาถึง (ตรวจ 16 ส.ค. 2569: ผู้สมัครจริง 2 คน)
 *
 * วิธีแก้: ให้กรอกตัวเลขสินค้า 3 ช่อง แล้วเห็นคำตอบทันที **โดยไม่เรียก AI เลย**
 *   เร็วทันที · ไม่มีค่าใช้จ่าย · และที่สำคัญที่สุด — แต่งตัวเลขไม่ได้ เพราะเป็นเลขคณิตจากเลขที่เขากรอกเอง
 *   AI เก็บไว้ใช้ตอนที่เขากดอยากรู้ลึก (เฟส 2) ซึ่งคือคนที่สนใจจริงแล้ว = คุ้ม token กว่ามาก
 *
 * ═══ ข้อบังคับด้านความซื่อสัตย์ (สำคัญที่สุดในไฟล์นี้) ═══
 * หน้านี้แสดงผลให้ "คนที่ยังไม่รู้จักเรา" ดู — ตัวเลขปลอมหนึ่งตัวคือเสียความน่าเชื่อถือถาวร
 * และขัดกับ skill `data-verification-10-rules` ของเราเองทุกข้อ
 *
 * จึงออกแบบ type ให้ **เป็นไปไม่ได้ทางโครงสร้าง** ที่จะพ่นสถิติตลาดลอย ๆ ออกมา:
 *   Insight มีแค่ 3 แบบ — 'calc' (ต้องอ้างช่องที่ผู้ใช้กรอก) · 'question' (คำถามที่เขาต้องตอบเอง)
 *   · 'action' (สิ่งที่ทำได้) — **ไม่มีแบบ 'fact'** ให้ใส่ "ตลาดนี้มูลค่า X ล้านบาท" ได้เลย
 *   ถ้าวันหน้าต้องการตัวเลขตลาดจริง ต้องผ่าน Serper พร้อมลิงก์แหล่ง = คนละ type คนละทาง
 *
 * pure ทั้งไฟล์ — ไม่มี side-effect ไม่เรียกเน็ต ทดสอบได้
 */

import type { SkillBiz } from './skillCatalog';

/* ── ข้อมูลที่ผู้ใช้กรอก ─────────────────────────────────────────────────── */

export interface ProductInput {
  /** ประเภทธุรกิจ — dropdown เท่านั้น (เก็บลง DB ได้ ไม่ใช่ PII) */
  biz: SkillBiz;
  /** ชื่อสินค้า — ผู้ใช้พิมพ์เอง ⚠️ เก็บใน localStorage ของเครื่องเขาเท่านั้น ห้ามส่งขึ้น DB */
  name?: string;
  /** ราคาขายต่อหน่วย (บาท) */
  price: number;
  /** ต้นทุนต่อหน่วย (บาท) — เฉพาะต้นทุนตรง เช่น วัตถุดิบ/ค่าสินค้า */
  cost: number;
  /** ขายได้กี่หน่วยต่อเดือน (ถ้ารู้) */
  unitsPerMonth?: number;
  /** ค่าใช้จ่ายคงที่ต่อเดือน (ค่าเช่า เงินเดือน ฯลฯ) */
  fixedCostPerMonth?: number;
}

/* ── ผลคำนวณ — ทุกค่ามาจากเลขที่ผู้ใช้กรอกล้วน ─────────────────────────── */

export interface QuickResult {
  marginPerUnit: number;
  /** % กำไรต่อราคาขาย — null เมื่อราคาขาย ≤ 0 (หารไม่ได้ ไม่เดาแทน) */
  marginPct: number | null;
  /** ต้องขายกี่หน่วย/เดือน ถึงจะครอบคลุมค่าใช้จ่ายคงที่ — null เมื่อคำนวณไม่ได้ */
  breakEvenUnits: number | null;
  /** กำไรขั้นต้นต่อเดือน (ก่อนหักค่าใช้จ่ายคงที่) — null เมื่อไม่ได้บอกยอดขาย */
  grossPerMonth: number | null;
  /** กำไรสุทธิต่อเดือน — null เมื่อข้อมูลไม่พอ */
  netPerMonth: number | null;
  /** ขาดอีกกี่หน่วยถึงจะถึงจุดคุ้มทุน (บวก = ยังขาด · 0 = ถึงแล้ว) */
  unitsToBreakEven: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quickCheck(input: ProductInput): QuickResult {
  const price = Number(input.price) || 0;
  const cost = Number(input.cost) || 0;
  const units = input.unitsPerMonth != null && input.unitsPerMonth > 0 ? input.unitsPerMonth : null;
  const fixed = input.fixedCostPerMonth != null && input.fixedCostPerMonth > 0 ? input.fixedCostPerMonth : null;

  const marginPerUnit = round2(price - cost);
  const marginPct = price > 0 ? round2((marginPerUnit / price) * 100) : null;
  // กำไรต่อหน่วยต้องเป็นบวกเท่านั้นถึงจะมีจุดคุ้มทุน — ติดลบแปลว่ายิ่งขายยิ่งขาดทุน
  const breakEvenUnits = fixed != null && marginPerUnit > 0 ? Math.ceil(fixed / marginPerUnit) : null;
  const grossPerMonth = units != null ? round2(marginPerUnit * units) : null;
  const netPerMonth = grossPerMonth != null ? round2(grossPerMonth - (fixed ?? 0)) : null;
  const unitsToBreakEven =
    breakEvenUnits != null && units != null ? Math.max(0, breakEvenUnits - units) : null;

  return { marginPerUnit, marginPct, breakEvenUnits, grossPerMonth, netPerMonth, unitsToBreakEven };
}

/* ── ข้อสังเกต — 3 แบบเท่านั้น (ดูข้อบังคับด้านบน) ────────────────────── */

export type Insight =
  /** ตัวเลขที่คำนวณได้ — `from` ต้องบอกว่ามาจากช่องไหนที่ผู้ใช้กรอก (ตรวจสอบย้อนได้เสมอ) */
  | { kind: 'calc'; text: string; from: string; tone?: 'good' | 'bad' }
  /** คำถามที่มีแต่เจ้าของธุรกิจตอบได้ — เราไม่เดาแทน */
  | { kind: 'question'; text: string; why: string }
  /** สิ่งที่ลงมือทำได้ */
  | { kind: 'action'; text: string };

/** ระดับความรุนแรงของสถานการณ์ — ตัดสินจากเลขคณิตล้วน ไม่ใช่เกณฑ์อุตสาหกรรมที่เราไม่มีแหล่ง */
export type QuickVerdict = 'loss' | 'netLoss' | 'thin' | 'ok' | 'unknown';

/** ⚠️ บทเรียนจากการทดสอบจริง 16 ส.ค. 2569:
 *  เดิมตัดสินจาก marginPct อย่างเดียว → เคส "กำไรต่อหน่วย 40% แต่รวมแล้วขาดทุน 10,000/เดือน"
 *  ขึ้นป้ายเขียวว่า "กำไรต่อหน่วยพอมีช่อง" ซึ่งทำให้เจ้าของธุรกิจเข้าใจผิดว่าธุรกิจไปได้
 *  → ถ้ารู้ยอดขายและค่าใช้จ่ายคงที่แล้ว "กำไรสุทธิ" ต้องมาก่อน "กำไรต่อหน่วย" เสมอ */
export function verdictOf(r: QuickResult): QuickVerdict {
  if (r.marginPct == null) return 'unknown';
  if (r.marginPerUnit <= 0) return 'loss';
  if (r.netPerMonth != null && r.netPerMonth < 0) return 'netLoss';
  // 20% ไม่ใช่ "มาตรฐานอุตสาหกรรม" (เราไม่มีแหล่งอ้างอิงที่ตรวจสอบได้) — เป็นแค่เส้นเตือนให้ไปดูตัวเลขจริง
  // สิ่งที่ตัดสินจริงคือ breakEvenUnits ซึ่งเป็นเลขคณิต ไม่ใช่ความเห็น
  if (r.marginPct < 20) return 'thin';
  return 'ok';
}

export function verdictText(v: QuickVerdict): string {
  switch (v) {
    case 'loss': return 'ยิ่งขายยิ่งขาดทุน';
    case 'netLoss': return 'กำไรต่อหน่วยมี แต่รวมทั้งเดือนแล้วยังขาดทุน';
    case 'thin': return 'กำไรบาง — ต้องขายเยอะถึงจะอยู่ได้';
    case 'ok': return 'กำไรต่อหน่วยพอมีช่อง';
    case 'unknown': return 'ยังบอกไม่ได้ — ต้องมีราคาขาย';
  }
}

/** ป้ายนี้ควรขึ้นสีบวกไหม — ใช้ให้ UI ไม่ต้องรู้รายละเอียดของแต่ละ verdict */
export function verdictIsPositive(v: QuickVerdict): boolean {
  return v === 'ok';
}

const baht = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

/** ข้อสังเกตหลัก — เห็นทันทีหลังกรอก ไม่ต้องเลือกหัวข้อ ไม่ใช้ AI */
export function headlineInsights(input: ProductInput, r: QuickResult): Insight[] {
  const out: Insight[] = [];
  if (r.marginPct == null) {
    out.push({ kind: 'question', text: 'ราคาขายต่อหน่วยเท่าไหร่?', why: 'ยังคำนวณกำไรไม่ได้ถ้าไม่มีราคาขาย' });
    return out;
  }

  out.push({
    kind: 'calc',
    text: `กำไรต่อหน่วย ${baht(r.marginPerUnit)} บาท (${r.marginPct}% ของราคาขาย)`,
    from: 'ราคาขาย − ต้นทุนต่อหน่วย ที่คุณกรอก',
    tone: r.marginPerUnit > 0 ? 'good' : 'bad',
  });

  if (r.marginPerUnit <= 0) {
    out.push({
      kind: 'calc',
      text: 'ขายได้เท่าไหร่ก็ไม่มีทางคุ้ม เพราะต้นทุนสูงกว่าหรือเท่ากับราคาขาย',
      from: 'ต้นทุน ≥ ราคาขาย ที่คุณกรอก',
      tone: 'bad',
    });
  }

  if (r.breakEvenUnits != null) {
    out.push({
      kind: 'calc',
      text: `ต้องขายให้ได้ ${baht(r.breakEvenUnits)} หน่วย/เดือน ถึงจะคุ้มค่าใช้จ่ายคงที่`,
      from: 'ค่าใช้จ่ายคงที่ ÷ กำไรต่อหน่วย ที่คุณกรอก',
    });
  }

  if (r.netPerMonth != null) {
    out.push({
      kind: 'calc',
      text: `ที่ยอดขายปัจจุบัน เหลือ ${baht(r.netPerMonth)} บาท/เดือน`,
      from: 'กำไรต่อหน่วย × ยอดขาย − ค่าใช้จ่ายคงที่ ที่คุณกรอก',
      tone: r.netPerMonth > 0 ? 'good' : 'bad',
    });
  }
  if (r.unitsToBreakEven != null && r.unitsToBreakEven > 0) {
    out.push({
      kind: 'calc',
      text: `ยังขาดอีก ${baht(r.unitsToBreakEven)} หน่วย/เดือน ถึงจะถึงจุดคุ้มทุน`,
      from: 'จุดคุ้มทุน − ยอดขายที่คุณกรอก',
      tone: 'bad',
    });
  }

  // ข้อที่คนมักลืมที่สุด — ถามเสมอ ไม่ว่าตัวเลขจะออกมาสวยแค่ไหน
  out.push({
    kind: 'question',
    text: 'ต้นทุนที่กรอก รวมค่าแรงตัวเองแล้วหรือยัง?',
    why: 'เจ้าของกิจการส่วนใหญ่ไม่นับเวลาตัวเองเป็นต้นทุน ทำให้กำไรที่เห็นสูงกว่าความจริง',
  });

  if (input.fixedCostPerMonth == null) {
    out.push({
      kind: 'question',
      text: 'ค่าใช้จ่ายคงที่ต่อเดือนเท่าไหร่ (ค่าเช่า เงินเดือน ค่าน้ำไฟ)?',
      why: 'ยังคำนวณจุดคุ้มทุนไม่ได้ถ้าไม่รู้ค่าใช้จ่ายคงที่',
    });
  }
  return out;
}

/* ── 4 หัวข้อให้เลือกดูลึก ───────────────────────────────────────────────
 * เฟส 1 (ตอนนี้): rule-based ล้วน — ไม่เรียก AI ไม่มีค่าใช้จ่าย ไม่มีทางแต่ง
 * เฟส 2: ต่อ AI ผ่าน /api/guest-ask (โควตา token/IP/วัน ที่มีอยู่แล้ว) เมื่อพิสูจน์ว่ามีคนกดจริง
 * ─────────────────────────────────────────────────────────────────────── */

export type TopicId = 'profit' | 'pricing' | 'marketing' | 'risk';

export interface QuickTopic {
  id: TopicId;
  label: string;
  /** คำถามที่หัวข้อนี้ตอบ — เขียนเป็นภาษาที่เจ้าของธุรกิจใช้ ไม่ใช่ศัพท์วิชาการ */
  answers: string;
  icon: string;
  /** ทักษะในระบบที่รับช่วงต่อหลังสมัคร (id ตรงกับ skillCatalog) */
  skills: string[];
  /** หน้าปลายทางในแอปหลังสมัคร */
  goto: string;
}

export const QUICK_TOPICS: QuickTopic[] = [
  {
    id: 'profit',
    label: 'ต้นทุน & กำไร',
    answers: 'ต้นทุนจริงเท่าไหร่ · ตรงไหนกินกำไรมากที่สุด · ต้องขายเท่าไหร่ถึงอยู่ได้',
    icon: '💰',
    skills: ['cost-analysis', 'profit-loss-report', 'cashflow-liquidity-management'],
    goto: 'city',
  },
  {
    id: 'pricing',
    label: 'ตั้งราคา',
    answers: 'ควรตั้งราคาเท่าไหร่ถึงไม่ขาดทุน · ขึ้นราคาได้ไหม · ทำไมลูกค้าถึงยอมจ่าย',
    icon: '🏷️',
    skills: ['pricing-strategy', 'pricing-calculator', 'buying-triggers', 'decoy-effect'],
    goto: 'bmc',
  },
  {
    id: 'marketing',
    label: 'การตลาด',
    answers: 'ใครคือลูกค้าจริง · ขายผ่านช่องทางไหน · พูดยังไงให้โดน',
    icon: '📣',
    skills: ['customer-persona', 'pain-gain-discovery', 'value-proposition-canvas', 'social-creative-linking'],
    goto: 'marketing',
  },
  {
    id: 'risk',
    label: 'ความเสี่ยง & ระบบ',
    answers: 'โตแล้วคุมไม่อยู่ตรงไหน · ต้องวางระบบอะไรก่อน · เตรียมตัวตรวจ ISO ยังไง',
    icon: '🛡️',
    skills: ['risk-assessment', 'org-context-traceability', 'iso-9001', 'business-continuity-plan'],
    goto: 'process',
  },
];

export function topicById(id: TopicId): QuickTopic {
  return QUICK_TOPICS.find((t) => t.id === id) ?? QUICK_TOPICS[0];
}

/** ข้อสังเกตรายหัวข้อ — rule-based จากตัวเลขที่กรอก + คำถามที่เขาต้องตอบเอง
 *  ⚠️ ห้ามใส่สถิติตลาด ตัวเลขคู่แข่ง หรือค่าเฉลี่ยอุตสาหกรรม — type ไม่เปิดช่องให้อยู่แล้ว */
export function topicInsights(topic: TopicId, input: ProductInput, r: QuickResult): Insight[] {
  const out: Insight[] = [];
  const v = verdictOf(r);

  if (topic === 'profit') {
    if (r.breakEvenUnits != null) {
      const perDay = Math.ceil(r.breakEvenUnits / 30);
      out.push({
        kind: 'calc',
        text: `เฉลี่ยแล้วต้องขายให้ได้ราว ${baht(perDay)} หน่วย/วัน ถึงจะคุ้มค่าใช้จ่ายคงที่`,
        from: 'จุดคุ้มทุนต่อเดือน ÷ 30 วัน',
      });
    }
    out.push({
      kind: 'question',
      text: 'ต้นทุนต่อหน่วยที่กรอก รวมของเสีย/ของที่ขายไม่ทันแล้วหรือยัง?',
      why: 'ธุรกิจอาหารและค้าปลีกมักมีของเสียที่ไม่ถูกนับ ทำให้ต้นทุนจริงสูงกว่าที่คิด',
    });
    out.push({
      kind: 'question',
      text: 'ถ้าวัตถุดิบขึ้น 10% จะยังเหลือกำไรไหม?',
      why: 'กำไรบางแปลว่าทนแรงกระแทกได้น้อย — ต้องรู้ล่วงหน้าว่าจุดไหนเริ่มขาดทุน',
    });
    out.push({ kind: 'action', text: 'บันทึกรายรับ-รายจ่ายจริงสัก 1 เดือน แล้วเทียบกับตัวเลขที่เพิ่งกรอก' });
  }

  if (topic === 'pricing') {
    if (v === 'loss') {
      out.push({
        kind: 'calc',
        text: `ต้องขายอย่างน้อย ${baht(input.cost)} บาท ถึงจะเสมอตัว (ยังไม่มีกำไร)`,
        from: 'ต้นทุนต่อหน่วยที่คุณกรอก',
        tone: 'bad',
      });
    }
    if (r.marginPct != null && r.marginPerUnit > 0) {
      const up10 = round2(input.price * 1.1);
      const newMargin = round2(up10 - input.cost);
      out.push({
        kind: 'calc',
        text: `ถ้าขึ้นราคา 10% เป็น ${baht(up10)} บาท กำไรต่อหน่วยจะเป็น ${baht(newMargin)} บาท (จาก ${baht(r.marginPerUnit)})`,
        from: 'ราคาขาย × 1.1 − ต้นทุน ที่คุณกรอก',
      });
    }
    out.push({
      kind: 'question',
      text: 'ลูกค้าซื้อเพราะถูก หรือเพราะเหตุผลอื่น?',
      why: 'ถ้าซื้อเพราะเหตุผลอื่น การขึ้นราคามักเสียลูกค้าน้อยกว่าที่กลัว — แต่ต้องรู้ก่อนว่าเหตุผลนั้นคืออะไร',
    });
    out.push({ kind: 'action', text: 'ลองขึ้นราคากับลูกค้ากลุ่มเล็กก่อน แล้ววัดว่ามีใครหายไปจริงไหม' });
  }

  if (topic === 'marketing') {
    // ⚠️ ห้ามบอกว่า "ตลาดนี้โต X%" หรือ "คู่แข่งตั้งราคา Y" — เราไม่มีข้อมูลนั้นและแต่งไม่ได้
    out.push({
      kind: 'question',
      text: 'ลูกค้า 3 คนล่าสุดที่ซื้อ เขาซื้อไปแก้ปัญหาอะไร?',
      why: 'คำตอบนี้คือข้อความโฆษณาที่ดีที่สุดที่คุณมี — และไม่มีใครตอบแทนคุณได้',
    });
    out.push({
      kind: 'question',
      text: 'คนที่ถามราคาแล้วไม่ซื้อ เขาติดตรงไหน?',
      why: 'จุดที่คนลังเลคือจุดที่คอนเทนต์ต้องพูดถึง',
    });
    if (r.marginPerUnit > 0) {
      out.push({
        kind: 'calc',
        text: `ถ้าจะยิงโฆษณา ค่าโฆษณาต่อการขาย 1 ชิ้นต้องต่ำกว่า ${baht(r.marginPerUnit)} บาท ไม่งั้นขาดทุน`,
        from: 'กำไรต่อหน่วยที่คำนวณจากเลขที่คุณกรอก',
      });
    }
    out.push({ kind: 'action', text: 'เขียนคำที่ลูกค้าใช้เรียกปัญหาของเขา แล้วเอาคำนั้นไปทำคอนเทนต์' });
  }

  if (topic === 'risk') {
    out.push({
      kind: 'question',
      text: 'ถ้าคุณหายไป 2 สัปดาห์ ธุรกิจยังเดินได้ไหม?',
      why: 'ถ้าไม่ได้ แปลว่าความรู้ยังอยู่ในหัวคนเดียว — นั่นคือความเสี่ยงอันดับหนึ่งของ SME ที่กำลังโต',
    });
    out.push({
      kind: 'question',
      text: 'มีคนอื่นทำงานแทนคุณได้ไหมโดยไม่ต้องถาม?',
      why: 'คำตอบนี้บอกว่าคุณมีระบบ หรือมีแค่ความเคยชิน',
    });
    if (v === 'thin' || v === 'loss') {
      out.push({
        kind: 'calc',
        text: 'กำไรที่บางแปลว่าพลาดได้น้อยครั้ง — ของเสียหรือส่งช้าครั้งเดียวกินกำไรหลายชิ้น',
        from: 'กำไรต่อหน่วยที่คำนวณจากเลขที่คุณกรอก',
        tone: 'bad',
      });
    }
    out.push({ kind: 'action', text: 'เขียนงานที่ทำซ้ำทุกวันออกมา 5 อย่าง แล้วดูว่าอันไหนมีแต่คุณที่ทำได้' });
  }

  return out;
}

/* ── ยกข้อมูลเข้าแอปตอนสมัคร — "ไม่ต้องกรอกซ้ำ" ────────────────────────
 * เก็บใน localStorage ของเครื่องผู้ใช้เท่านั้น (มีชื่อสินค้าที่ผู้ใช้พิมพ์เอง = ไม่ควรขึ้น DB)
 * ต่อยอดจาก bizHint.ts ที่เดิมยกไปแค่ "ชื่อธุรกิจ"
 * ─────────────────────────────────────────────────────────────────────── */

export interface QuickDraft {
  input: ProductInput;
  topics: TopicId[];
  /** วันที่กรอก (ISO date) — ให้แอปตัดสินได้ว่าข้อมูลเก่าเกินไปหรือยัง */
  at: string;
}

const DRAFT_KEY = 'ceo_ai_quick_draft';
/** ร่างที่เก่ากว่านี้ถือว่าไม่เกี่ยวกันแล้ว — คนอาจเปิดเว็บทิ้งไว้เป็นเดือน */
export const DRAFT_MAX_AGE_DAYS = 30;

export function saveQuickDraft(d: QuickDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* โหมดส่วนตัว/เต็ม → ข้ามไป */ }
}

/** อ่านร่าง — คืน null เมื่อไม่มี พัง หรือเก่าเกิน DRAFT_MAX_AGE_DAYS */
export function readQuickDraft(today = new Date().toISOString().slice(0, 10)): QuickDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parseQuickDraft(raw, today);
  } catch { return null; }
}

export function clearQuickDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
}

/** แยกออกมาให้ทดสอบได้โดยไม่ต้องมี localStorage */
export function parseQuickDraft(raw: string, today: string): QuickDraft | null {
  let d: unknown;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const o = d as Partial<QuickDraft>;
  if (!o.input || typeof o.input !== 'object' || typeof o.at !== 'string') return null;
  const days = daysBetween(o.at, today);
  if (days == null || days > DRAFT_MAX_AGE_DAYS) return null;
  return {
    input: o.input as ProductInput,
    topics: Array.isArray(o.topics) ? o.topics.filter(isTopicId) : [],
    at: o.at,
  };
}

function isTopicId(v: unknown): v is TopicId {
  return typeof v === 'string' && QUICK_TOPICS.some((t) => t.id === v);
}

/** จำนวนวันระหว่างสองวันที่รูปแบบ YYYY-MM-DD — null เมื่อรูปแบบผิด */
function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from), b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** แปลงร่างเป็นรายการรายรับ-รายจ่ายตั้งต้น — ให้ผู้ใช้เห็นข้อมูลตัวเองในแอปทันทีหลังสมัคร
 *  คืนอาร์เรย์ว่างเมื่อข้อมูลไม่พอ (ไม่ใส่ตัวเลขมั่วเพื่อให้ดูมีอะไร) */
export function draftToFinance(
  d: QuickDraft,
): { id: string; kind: 'revenue' | 'expense'; label: string; amount: number; date: string }[] {
  const { input, at } = d;
  const units = input.unitsPerMonth;
  if (!units || units <= 0) return [];
  const rows: { id: string; kind: 'revenue' | 'expense'; label: string; amount: number; date: string }[] = [];
  const name = (input.name || 'สินค้า').slice(0, 40);
  rows.push({ id: `qd-rev-${at}`, kind: 'revenue', label: `ขาย ${name} (จากที่กรอกบนหน้าแรก)`, amount: round2(input.price * units), date: at });
  rows.push({ id: `qd-cog-${at}`, kind: 'expense', label: `ต้นทุน ${name} (จากที่กรอกบนหน้าแรก)`, amount: round2(input.cost * units), date: at });
  if (input.fixedCostPerMonth && input.fixedCostPerMonth > 0) {
    rows.push({ id: `qd-fix-${at}`, kind: 'expense', label: 'ค่าใช้จ่ายคงที่ (จากที่กรอกบนหน้าแรก)', amount: round2(input.fixedCostPerMonth), date: at });
  }
  return rows;
}
