import { describe, it, expect } from 'vitest';
import {
  allPlanReports, tokenCostThb, marginPct, meetsMinMargin,
  MIN_MARGIN_PCT, PLAN_PRICE_THB, PLAN_MONTHLY_TOKENS,
} from '../tokenEconomics';
import {
  PLAN_PRICE, PLAN_PRICE_NUM, annualPrice, annualPerMonth, ANNUAL_MONTHS_CHARGED,
} from '../access';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * เจ้าของถาม 6 ก.ย. 2569: *"12,000/ปี คือแพ็กใหม่ หรือ growth ลดราคาเมื่อจ่ายรายปี"*
 *
 * 🔴 คำตอบไม่ใช่เรื่องรสนิยม — **คำนวณได้จากต้นทุน token จริงของเราเอง**
 *    เทสต์นี้ล็อกคำตอบไว้ เพื่อไม่ให้รอบหน้ามีใคร (รวมผม) ตอบจากความรู้สึกอีก
 * ══════════════════════════════════════════════════════════════════════════ */

/** ราคาที่เจ้าของเสนอ: 12,000 บาท/ปี = 1,000 บาท/เดือน */
const PROPOSED_MONTHLY = 12000 / 12;

describe('ราคาที่ขายอยู่วันนี้ ผ่านเกณฑ์กำไรขั้นต่ำทุกแพ็ก', () => {
  it('ทุกแพ็กมี margin ≥ MIN_MARGIN_PCT (คิดที่เพดาน token เต็ม · worst case)', () => {
    for (const r of allPlanReports()) {
      expect(r.ok, `${r.plan} margin ${r.marginPct.toFixed(1)}%`).toBe(true);
      expect(r.marginPct).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
    }
  });
});

describe('🔴 12,000/ปี = growth ลดราคา — ทำไม่ได้ (ไม่ใช่ความเห็น แต่คำนวณได้)', () => {
  it('ให้ token เท่า growth (3M) ที่ราคา 1,000/เดือน ⇒ margin ต่ำกว่าเกณฑ์', () => {
    const cost = tokenCostThb(PLAN_MONTHLY_TOKENS.growth);
    const m = marginPct(PROPOSED_MONTHLY, cost);
    expect(m).toBeLessThan(MIN_MARGIN_PCT);
    expect(meetsMinMargin(PROPOSED_MONTHLY, PLAN_MONTHLY_TOKENS.growth)).toBe(false);
  });

  it('growth รายปีที่ต่ำที่สุดที่ยังผ่านเกณฑ์ ต้องสูงกว่า 12,000 บาท/ปี', () => {
    const cost = tokenCostThb(PLAN_MONTHLY_TOKENS.growth);
    const floorMonthly = cost / (1 - MIN_MARGIN_PCT / 100);
    expect(floorMonthly * 12).toBeGreaterThan(12000);
    // และยังต่ำกว่าราคาเต็มรายปี ⇒ ลดได้บ้าง แต่ไม่ถึง 12,000
    expect(floorMonthly * 12).toBeLessThan(PLAN_PRICE_THB.growth * 12);
  });
});

describe('🟢 12,000/ปี = แพ็กใหม่ระดับกลาง — ทำได้ ถ้าคุมเพดาน token', () => {
  it('ที่ราคา 1,000/เดือน ต้องมีเพดาน token ต่ำกว่า growth ถึงจะผ่านเกณฑ์', () => {
    expect(meetsMinMargin(PROPOSED_MONTHLY, PLAN_MONTHLY_TOKENS.starter)).toBe(true);
    expect(meetsMinMargin(PROPOSED_MONTHLY, PLAN_MONTHLY_TOKENS.growth)).toBe(false);
  });

  it('ราคาอยู่ระหว่าง starter กับ growth จริง (ไม่ใช่ส่วนลดของอันใดอันหนึ่ง)', () => {
    expect(PROPOSED_MONTHLY).toBeGreaterThan(PLAN_PRICE_THB.starter);
    expect(PROPOSED_MONTHLY).toBeLessThan(PLAN_PRICE_THB.growth);
  });

  it('🔴 และแพงกว่า starter รายปี ⇒ ขายเป็น "ส่วนลด starter" ไม่ได้', () => {
    expect(12000).toBeGreaterThan(PLAN_PRICE_THB.starter * 12);
  });
});

describe('กฎที่เหลือไว้ — ราคาใหม่ทุกตัวต้องผ่านเกณฑ์กำไรก่อนประกาศ', () => {
  it('meetsMinMargin คือด่านเดียวที่ตัดสิน — ห้ามตั้งราคาจากความรู้สึก', () => {
    // ราคาที่ต่ำกว่าต้นทุนต้องไม่ผ่านเสมอ ไม่ว่าจะฟังดูน่าดึงดูดแค่ไหน
    expect(meetsMinMargin(100, PLAN_MONTHLY_TOKENS.growth)).toBe(false);
    expect(meetsMinMargin(PLAN_PRICE_THB.growth, PLAN_MONTHLY_TOKENS.growth)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ช่องโหว่ที่ไฟล์ชื่อ "annualPricing" ไม่เคยตรวจ (เจอ 10 ก.ย. 2569)
 *
 *   เทสต์เดิมทั้งไฟล์ตรวจแต่ราคา **สมมติ** 12,000/ปี ที่ยังไม่มีในระบบ
 *   แต่ **ราคารายปีที่ขายอยู่จริง** (`access.annualPrice` · โชว์ใน `Billing.tsx`)
 *   ไม่เคยถูกเอาเข้าเกณฑ์กำไรเลยสักครั้ง
 *
 *   ⇒ เราตอบคำถามเรื่องราคาที่ยังไม่มี อย่างละเอียด · แล้วปล่อยราคาที่มีอยู่จริงไม่ตรวจ
 * ══════════════════════════════════════════════════════════════════════════ */

const PAID = ['starter', 'growth', 'scale'] as const;

describe('ราคาต้องมีแหล่งเดียว — "ใช้ล่าสุด" ต้องเป็นกลไก ไม่ใช่ความจำ', () => {
  it('access.PLAN_PRICE_NUM ตรงกับ tokenEconomics.PLAN_PRICE_THB ทุกแพ็ก', () => {
    // สองไฟล์นี้เขียนตัวเลขเดียวกันคนละที่ — แก้ที่เดียวแล้วลืมอีกที่ = ราคาบนเว็บกับ
    // ราคาที่ใช้คิดกำไร คนละตัว โดยไม่มีอะไรส่งเสียง
    for (const p of PAID) expect(PLAN_PRICE_NUM[p], p).toBe(PLAN_PRICE_THB[p]);
  });

  it('ข้อความราคาที่ผู้ใช้เห็น ต้องมีตัวเลขเดียวกับที่ระบบคิดเงิน', () => {
    for (const p of PAID) {
      const shown = PLAN_PRICE[p].replace(/[^0-9]/g, '');
      expect(shown, `${p}: ${PLAN_PRICE[p]}`).toBe(String(PLAN_PRICE_NUM[p]));
    }
  });
});

describe('ราคารายปีที่ขายอยู่จริง ต้องผ่านเกณฑ์กำไรเหมือนรายเดือน', () => {
  /** 🟢 **หนี้ปิดแล้ว 11 ก.ย. 2569** (เจ้าของอนุมัติ `ANNUAL_MONTHS_CHARGED` 10 → 11)
   *
   *  ประวัติที่ต้องไม่ลืม: ที่ 10 เดือน (ลด 16.7%) ราคารายปีหลุดเกณฑ์ **ทั้ง 3 แพ็ก**
   *    starter 7,900 → 31.1%  ·  growth 14,900 → 27.0%  ·  scale 59,000 → 26.2%
   *  ที่ 11 เดือน (ลด 8.3%) ⇒ 37.3 / 33.6 / 32.9% ผ่านครบ · **ราคารายเดือนไม่ถูกแตะ**
   *
   *  ⚠️ รายการนี้ต้องว่างตลอดไป — มีชื่อโผล่มาเมื่อไร แปลว่ามีคนลดราคาจนกำไรหลุดเกณฑ์ */
  const KNOWN_BELOW_GATE: readonly string[] = [];

  const belowGate = PAID.filter(
    (p) => !meetsMinMargin(annualPerMonth(p), PLAN_MONTHLY_TOKENS[p]),
  );

  it('ไม่มีแพ็กไหนขายรายปีต่ำกว่าเกณฑ์กำไร', () => {
    expect(belowGate).toEqual([...KNOWN_BELOW_GATE]);
  });

  it('รายเดือนยังผ่านครบทุกแพ็ก — ส่วนลดรายปีห้ามลากกำไรลงไปด้วย', () => {
    for (const r of allPlanReports()) expect(r.ok, r.plan).toBe(true);
  });

  it('🔴 ค่าที่ใช้อยู่ต้องเป็นค่าต่ำสุดที่ยังผ่านเกณฑ์ — ไม่ขี้เหนียวเกินจำเป็น', () => {
    // ให้ส่วนลดลึกที่สุดเท่าที่กำไรยังผ่าน (ลูกค้าได้มากสุดโดยธุรกิจไม่เจ็บ)
    const passes = (n: number) =>
      PAID.every((p) => marginPct(Math.round(PLAN_PRICE_THB[p] * n / 12),
        tokenCostThb(PLAN_MONTHLY_TOKENS[p])) >= MIN_MARGIN_PCT);
    expect(passes(ANNUAL_MONTHS_CHARGED)).toBe(true);
    expect(passes(ANNUAL_MONTHS_CHARGED - 1)).toBe(false);  // ต่ำกว่านี้ = หลุดเกณฑ์
  });

  it('🔒 ห้ามถอยกลับไป 10 เดือน — ค่าเดิมที่ทำให้หลุดเกณฑ์ทั้ง 3 แพ็ก', () => {
    expect(ANNUAL_MONTHS_CHARGED).toBeGreaterThan(10);
    for (const p of PAID) {
      const perMonthAt10 = Math.round(PLAN_PRICE_THB[p] * 10 / 12);
      expect(marginPct(perMonthAt10, tokenCostThb(PLAN_MONTHLY_TOKENS[p])), p)
        .toBeLessThan(MIN_MARGIN_PCT);
    }
  });

  it('ราคารายปี = ราคารายเดือน × ANNUAL_MONTHS_CHARGED (แหล่งเดียว ไม่เขียนเลขซ้ำ)', () => {
    for (const p of PAID) {
      expect(annualPrice(p), p).toBe(PLAN_PRICE_NUM[p] * ANNUAL_MONTHS_CHARGED);
    }
  });

  it('🔴 หน้าขาย (SalePage) ต้องคำนวณราคาจาก access.ts ห้าม hardcode', () => {
    // เดิมหน้านี้ "mirror" ราคาเป็นเลขตายตัว 5 ตัว ⇒ แก้ต้นทางแล้วหน้าขายยังโฆษณาราคาเก่า
    const sale = readFileSync(resolve(__dirname, '../../pages/SalePage.tsx'), 'utf8');
    for (const stale of ['14900', '1242', '2980', '17880']) {
      expect(sale, `SalePage ยังมีเลขตายตัว ${stale}`).not.toContain(stale);
    }
    expect(sale).toContain("annualPrice('growth')");
    expect(sale).toContain('ANNUAL_MONTHS_CHARGED');
  });
});
