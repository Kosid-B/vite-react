/* pricingAnalysis — วิเคราะห์ราคา (ติดตั้งจาก skill `pricing-analysis` เข้าระบบจริง)
 *
 * หลักของ skill: "ตั้งราคาจากคุณค่าที่ลูกค้าได้ ไม่ใช่จากต้นทุนที่เราจ่าย"
 *
 * ทำไมโมดูลนี้ถึงมีค่ากับเจ้าของธุรกิจไทยจริง ๆ:
 *   คำถามที่ SME ถามทุกวันคือ "ขึ้นราคาแล้วลูกค้าจะหนีไหม" กับ "ลดราคาแล้วจะได้ลูกค้าเพิ่มคุ้มไหม"
 *   ทั้งสองคำถามมี **คำตอบที่เป็นเลขคณิตแน่นอน** ไม่ต้องเดา ไม่ต้องใช้ AI และไม่ต้องมีข้อมูลตลาด
 *   แต่แทบไม่มีใครคำนวณ เพราะไม่รู้ว่าคำนวณได้
 *
 * ── สูตรแกนกลาง (พิสูจน์ได้ ไม่ใช่ rule of thumb) ──
 *   กำไรต่อหน่วย m = ราคา − ต้นทุน
 *   ขึ้นราคา x% → กำไรต่อหน่วยใหม่ m' = m + (ราคา × x)
 *   กำไรรวมเท่าเดิมเมื่อ  m' × Q(1−y) = m × Q   →   y = 1 − m/m'
 *   ⇒ **ยอดขายที่ยอมเสียได้ (หรือที่ต้องเพิ่ม) ขึ้นกับ "กำไรต่อหน่วย" ไม่ใช่ "ราคา"**
 *   นี่คือเหตุผลที่ธุรกิจกำไรบางลดราคาแล้วเจ๊ง ทั้งที่ยอดขายเพิ่ม
 *
 * ── ข้อบังคับความซื่อสัตย์ ──
 *   ใช้ Insight ชนิดเดียวกับ productQuickCheck (calc/question/action) จึงพ่นสถิติตลาด
 *   หรือราคาคู่แข่งที่ไม่มีแหล่งออกมาไม่ได้เลยโดยโครงสร้าง
 *   ราคาคู่แข่งใช้ได้เฉพาะที่ "ผู้ใช้กรอกเอง" เท่านั้น — เราไม่มีฐานข้อมูลราคาตลาด และไม่แต่งขึ้นมา
 *
 * pure ทั้งไฟล์
 */

import type { Insight, ProductInput } from './productQuickCheck';

/* ── ผลกระทบเมื่อเปลี่ยนราคา ─────────────────────────────────────────── */

export interface PriceScenario {
  /** เปลี่ยนราคากี่ % (บวก = ขึ้น, ลบ = ลด) */
  changePct: number;
  newPrice: number;
  newMarginPerUnit: number;
  /** ยอดขายเปลี่ยนได้ถึงกี่ % ก่อนกำไรรวมจะเท่าเดิม
   *  ขึ้นราคา → บวก = "เสียลูกค้าได้ถึง X% ยังคุ้ม"
   *  ลดราคา  → ลบ  = "ต้องขายเพิ่มอีก X% ถึงจะเท่าทุนเดิม"
   *  null เมื่อคำนวณไม่ได้ (กำไรต่อหน่วยใหม่ ≤ 0) */
  breakEvenVolumePct: number | null;
  /** ถ้าขายได้เท่าเดิม กำไรรวมต่อเดือนจะเป็นเท่าไหร่ — null เมื่อไม่รู้ยอดขาย */
  profitIfVolumeSame: number | null;
  /** ราคาใหม่ต่ำกว่าต้นทุน = ขายเท่าไหร่ก็ขาดทุน */
  belowCost: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function priceScenario(input: ProductInput, changePct: number): PriceScenario {
  const price = Number(input.price) || 0;
  const cost = Number(input.cost) || 0;
  const units = input.unitsPerMonth && input.unitsPerMonth > 0 ? input.unitsPerMonth : null;

  const newPrice = r2(price * (1 + changePct / 100));
  const m = price - cost;
  const m2 = newPrice - cost;

  // ต้องมีกำไรต่อหน่วยเดิมเป็นบวกด้วย — ถ้าเดิมขาดทุนอยู่แล้ว "จุดคุ้มเดิม" ไม่มีความหมาย
  const breakEvenVolumePct = m > 0 && m2 > 0 ? r2((1 - m / m2) * 100) : null;

  return {
    changePct,
    newPrice,
    newMarginPerUnit: r2(m2),
    breakEvenVolumePct,
    profitIfVolumeSame: units != null ? r2(m2 * units) : null,
    belowCost: newPrice < cost,
  };
}

/** ขั้นราคามาตรฐานที่ใช้ดูภาพรวม — ลด 20/10 · ขึ้น 10/20 */
export const PRICE_STEPS = [-20, -10, 10, 20] as const;

export function priceLadder(input: ProductInput): PriceScenario[] {
  return PRICE_STEPS.map((p) => priceScenario(input, p));
}

/* ── ตรวจว่ากำลังตั้งราคาแบบ "ต้นทุน + บวก" อยู่หรือเปล่า ────────────────
 * skill ระบุว่า cost-plus คือ anti-pattern อันดับหนึ่ง — แต่คนส่วนใหญ่ทำโดยไม่รู้ตัว
 * สัญญาณที่ตรวจได้จากตัวเลขล้วน: ราคา = ต้นทุน × ตัวคูณกลม ๆ (2 เท่า, 3 เท่า, +50%) */

export interface CostPlusSignal {
  /** ตัวคูณจากต้นทุน (ราคา ÷ ต้นทุน) — null เมื่อต้นทุนเป็น 0 */
  multiple: number | null;
  /** ใกล้ตัวคูณกลม ๆ ไหม (สัญญาณว่าตั้งจากต้นทุน ไม่ใช่จากคุณค่า) */
  looksCostPlus: boolean;
  /** ตัวคูณกลมที่ใกล้ที่สุด เช่น 2 หรือ 3 */
  nearest: number | null;
}

const ROUND_MULTIPLES = [1.5, 2, 2.5, 3, 4, 5];

export function costPlusSignal(input: ProductInput): CostPlusSignal {
  const price = Number(input.price) || 0;
  const cost = Number(input.cost) || 0;
  if (cost <= 0 || price <= 0) return { multiple: null, looksCostPlus: false, nearest: null };
  const multiple = r2(price / cost);
  let nearest: number | null = null;
  let best = Infinity;
  for (const m of ROUND_MULTIPLES) {
    const d = Math.abs(multiple - m);
    if (d < best) { best = d; nearest = m; }
  }
  // ห่างจากตัวคูณกลมไม่เกิน 2% ถือว่า "ตั้งจากต้นทุน" (แคบไว้ก่อน — เตือนผิดแล้วเสียความน่าเชื่อถือ)
  return { multiple, looksCostPlus: best <= 0.02 * (nearest ?? 1), nearest };
}

/* ── ตำแหน่งราคาเทียบคู่แข่ง ─────────────────────────────────────────────
 * ⚠️ ราคาคู่แข่งต้องมาจากที่ผู้ใช้กรอกเองเท่านั้น — เราไม่มีฐานข้อมูลราคาตลาดไทย
 *    และจะไม่แต่งขึ้นมา (กฎเดียวกับ productQuickCheck) */

export type PricePosition = 'budget' | 'mid' | 'premium' | 'unknown';

export function positionOf(yourPrice: number, competitorPrices: readonly number[]): PricePosition {
  const list = competitorPrices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (list.length < 2 || !(yourPrice > 0)) return 'unknown';   // ต่ำกว่า 2 เจ้า เทียบไม่ได้จริง
  const lo = list[0], hi = list[list.length - 1];
  if (yourPrice < lo) return 'budget';
  if (yourPrice > hi) return 'premium';
  return 'mid';
}

export function positionText(p: PricePosition): string {
  switch (p) {
    case 'budget': return 'ถูกกว่าทุกเจ้าที่กรอกมา';
    case 'premium': return 'แพงกว่าทุกเจ้าที่กรอกมา';
    case 'mid': return 'อยู่กลาง ๆ ในกลุ่มที่กรอกมา';
    case 'unknown': return 'ยังเทียบไม่ได้ — ต้องมีราคาคู่แข่งอย่างน้อย 2 เจ้า';
  }
}

/* ── ข้อสังเกตเรื่องราคา (ใช้ type เดียวกับ productQuickCheck) ─────────── */

const baht = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

export function pricingInsights(input: ProductInput): Insight[] {
  const out: Insight[] = [];
  const price = Number(input.price) || 0;
  const cost = Number(input.cost) || 0;
  const m = price - cost;

  if (price <= 0) {
    out.push({ kind: 'question', text: 'ราคาขายต่อหน่วยเท่าไหร่?', why: 'ยังวิเคราะห์ราคาไม่ได้ถ้าไม่มีราคาตั้งต้น' });
    return out;
  }

  if (m <= 0) {
    out.push({
      kind: 'calc',
      text: `ตอนนี้ขายต่ำกว่าทุน — ต้องขายอย่างน้อย ${baht(cost)} บาท ถึงจะเสมอตัว`,
      from: 'ต้นทุนต่อหน่วยที่คุณกรอก',
      tone: 'bad',
    });
    out.push({ kind: 'action', text: 'แก้ราคาหรือแก้ต้นทุนก่อน แล้วค่อยคิดเรื่องกลยุทธ์ราคา' });
    return out;
  }

  // ขึ้นราคา 10% — คำถามที่เจ้าของธุรกิจถามบ่อยที่สุด
  const up = priceScenario(input, 10);
  if (up.breakEvenVolumePct != null) {
    out.push({
      kind: 'calc',
      text: `ถ้าขึ้นราคา 10% เป็น ${baht(up.newPrice)} บาท — เสียลูกค้าได้ถึง ${baht(up.breakEvenVolumePct)}% กำไรยังเท่าเดิม`,
      from: 'กำไรต่อหน่วยเดิม ÷ กำไรต่อหน่วยใหม่ (จากราคาและต้นทุนที่คุณกรอก)',
      tone: 'good',
    });
  }

  // ลดราคา 10% — ด้านที่คนมองข้าม และเป็นด้านที่ทำให้เจ๊ง
  const down = priceScenario(input, -10);
  if (down.breakEvenVolumePct != null) {
    const need = Math.abs(down.breakEvenVolumePct);
    out.push({
      kind: 'calc',
      text: `ถ้าลดราคา 10% ต้องขายเพิ่มอีก ${baht(need)}% ถึงจะได้กำไรเท่าเดิม`,
      from: 'กำไรต่อหน่วยเดิม ÷ กำไรต่อหน่วยหลังลดราคา (จากตัวเลขที่คุณกรอก)',
      tone: need > 30 ? 'bad' : undefined,
    });
    if (need > 30) {
      // ⚠️ ห้ามเขียนว่า "กำไรบาง" ตรงนี้ — เส้น 30% ถูกข้ามได้แม้กำไรหนา (เช่น margin 40% ก็ต้องเพิ่ม 33%)
      //    จะขัดกับป้ายสรุปด้านบนที่อาจบอกว่ากำไรพอมีช่อง · พูดถึงตัวเลขอย่างเดียวพอ
      out.push({
        kind: 'calc',
        text: `ต้องขายเพิ่ม ${baht(need)}% ≈ มากกว่าหนึ่งในสี่ของยอดเดิม — การลดราคามักต้องการยอดเพิ่มมากกว่าที่คนคาดไว้มาก`,
        from: 'ผลจากสูตรจุดคุ้มทุนข้างต้น',
        tone: 'bad',
      });
    }
  } else if (down.belowCost) {
    out.push({
      kind: 'calc',
      text: 'ลดราคา 10% แล้วจะต่ำกว่าต้นทุนทันที — ทำไม่ได้',
      from: 'ราคาหลังลด เทียบกับต้นทุนที่คุณกรอก',
      tone: 'bad',
    });
  }

  // ตั้งจากต้นทุนหรือจากคุณค่า — หัวใจของ skill นี้
  const cp = costPlusSignal(input);
  if (cp.looksCostPlus && cp.nearest) {
    out.push({
      kind: 'question',
      text: `ราคาตอนนี้เท่ากับต้นทุน × ${cp.nearest} พอดี — ตั้งจากต้นทุน หรือตั้งจากสิ่งที่ลูกค้าได้?`,
      why: 'ตั้งราคาจากต้นทุนแปลว่าเพดานราคาถูกกำหนดโดยซัพพลายเออร์ ไม่ใช่โดยคุณค่าที่คุณสร้าง',
    });
  }

  out.push({
    kind: 'question',
    text: 'ลูกค้าที่ซื้อแพงที่สุด เขาซื้อเพราะอะไร?',
    why: 'คำตอบนี้คือสิ่งที่ควรเอาไปตั้งราคา ไม่ใช่ต้นทุนของคุณ',
  });
  out.push({
    kind: 'question',
    text: 'เคยมีใครบ่นว่าแพงไหม?',
    why: 'ถ้าไม่มีใครบ่นเลย มักแปลว่าตั้งราคาต่ำเกินไป (anti-pattern ที่พบบ่อยที่สุด)',
  });
  out.push({ kind: 'action', text: 'ลองขึ้นราคากับลูกค้าใหม่ก่อน คงราคาเดิมให้ลูกค้าเก่า แล้ววัดว่าเสียไปจริงกี่ราย' });

  return out;
}
