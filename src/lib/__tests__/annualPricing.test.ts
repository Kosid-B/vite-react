import { describe, it, expect } from 'vitest';
import {
  allPlanReports, tokenCostThb, marginPct, meetsMinMargin,
  MIN_MARGIN_PCT, PLAN_PRICE_THB, PLAN_MONTHLY_TOKENS,
} from '../tokenEconomics';

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
