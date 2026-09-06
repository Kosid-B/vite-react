import { describe, it, expect } from 'vitest';
import {
  weakest, derive, showAsActual, econMetrics, cacTrap, verifiedFirstOutcomeRate,
  investmentGateStatus, INVESTMENT_GATES, ECON_FUNNEL, REQUIRED_TIMESTAMPS,
  TRUTH_ORDER, BREAK_EVEN_CVR, BASE_CASE_CVR, CVR_NOTE,
  type FinancialFact,
} from '../financialTruth';
import { MIN_FOR_RATE } from '../growthPdca';

/* ══════════════════════════════════════════════════════════════════════════
 * เจ้าของสั่ง 6 ก.ย. 2569: **ห้าม Dashboard เอา ASSUMED ไปแสดงเหมือนเป็น Actual**
 * ⇒ เทสต์ชุดนี้คือกลไกที่ทำให้คำสั่งนั้นบังคับใช้ได้จริง ไม่ใช่แค่ข้อตกลง
 * ══════════════════════════════════════════════════════════════════════════ */

const fact = (key: string, value: number | null, level: FinancialFact['level']): FinancialFact =>
  ({ key, label: key, value, level, unit: 'บาท', source: 'test' });

describe('ชั้นความจริง — ค่าที่คำนวณ แข็งแรงกว่าวัตถุดิบที่อ่อนที่สุดไม่ได้', () => {
  it('วัดจริงทั้งคู่ ⇒ ผลลัพธ์เป็น derived (แสดงเป็นตัวเลขจริงได้)', () => {
    const r = derive('x', 'x', 'บาท', [fact('a', 100, 'measured'), fact('b', 5, 'measured')], ([a, b]) => a / b);
    expect(r.level).toBe('derived');
    expect(showAsActual(r)).toBe(true);
  });

  it('🔴 มีวัตถุดิบสมมติแม้ตัวเดียว ⇒ ผลลัพธ์เป็นสมมติ และห้ามแสดงเป็นตัวเลขจริง', () => {
    const r = derive('ltv', 'LTV', 'บาท', [fact('a', 100, 'measured'), fact('renewal', 0.5, 'assumed')], ([a, b]) => a * b);
    expect(r.value).toBe(50);          // สูตรถูก
    expect(r.level).toBe('assumed');   // แต่ตัวเลขยังเชื่อไม่ได้
    expect(showAsActual(r)).toBe(false);
  });

  it('ขาดค่าตั้งต้นแม้ตัวเดียว ⇒ unavailable · ห้ามคืน 0', () => {
    const r = derive('x', 'x', 'บาท', [fact('a', 100, 'measured'), fact('b', null, 'unavailable')], ([a, b]) => a / b);
    expect(r.value).toBeNull();
    expect(r.level).toBe('unavailable');
  });

  it('weakest เลือกตัวที่อ่อนที่สุดเสมอ · กลุ่มว่าง = unavailable', () => {
    expect(weakest(['measured', 'assumed', 'derived'])).toBe('assumed');
    expect(weakest(['measured', 'measured'])).toBe('measured');
    expect(weakest([])).toBe('unavailable');
    expect(TRUTH_ORDER[0]).toBe('measured');
    expect(TRUTH_ORDER[TRUTH_ORDER.length - 1]).toBe('unavailable');
  });
});

describe('สถานะจริงวันนี้ — ลูกค้าจ่ายจริง 0 ราย', () => {
  it('ไม่กรอกอะไรเลย ⇒ ทุกตัวชี้วัด unavailable · ห้ามมีตัวไหนโชว์เป็นของจริง', () => {
    for (const f of econMetrics()) {
      expect(f.value, f.key).toBeNull();
      expect(showAsActual(f), f.key).toBe(false);
    }
  });

  it('ทุกตัวชี้วัดต้องบอกที่มา — ห้ามปล่อยลอย', () => {
    for (const f of econMetrics()) expect(f.source.length).toBeGreaterThan(5);
  });

  it('อัตราแปลงเป็นลูกค้าหลัก ต้องรอ MIN_FOR_RATE เหมือนทั้งระบบ (ห้ามเขียนเลขซ้ำ)', () => {
    const few = econMetrics({ paidStarter: MIN_FOR_RATE - 1, corePaid: 3, acquisitionSpend: 1000 });
    expect(few.find((f) => f.key === 'starterToCoreCvr')?.value).toBeNull();
    const enough = econMetrics({ paidStarter: MIN_FOR_RATE, corePaid: 15, acquisitionSpend: 1000 });
    expect(enough.find((f) => f.key === 'starterToCoreCvr')?.value).toBeCloseTo(0.15, 5);
  });
});

describe('กับดัก CPA — ตัวเลขที่ดูดีที่สุดตอนที่อันตรายที่สุด', () => {
  it('ตัวอย่างของเจ้าของเอง: spend 70,000 · จ่ายเข้ามา 100 · ซื้อหลัก 5 ⇒ CPA 700 แต่ CAC 14,000', () => {
    const t = cacTrap({ acquisitionSpend: 70000, paidStarter: 100, corePaid: 5 });
    expect(t.cpa).toBe(700);
    expect(t.coreCac).toBe(14000);
    expect(t.multiple).toBe(20);
    expect(t.verdict).toBe('trap');
  });

  it('🔴 ยังไม่มีใครซื้อสินค้าหลัก = trap ไม่ใช่ ok (CPA สวยที่สุดตอนที่แย่ที่สุด)', () => {
    const t = cacTrap({ acquisitionSpend: 70000, paidStarter: 100, corePaid: 0 });
    expect(t.verdict).toBe('trap');
    expect(t.coreCac).toBeNull();       // หารด้วยศูนย์ไม่ได้ — ห้ามแกล้งคืนเลข
  });

  it('ไม่รู้จำนวนคนซื้อหลัก ⇒ unknown ห้ามตัดสินว่าคุ้ม', () => {
    const t = cacTrap({ acquisitionSpend: 70000, paidStarter: 100 });
    expect(t.verdict).toBe('unknown');
    expect(t.why).toMatch(/ยังบอกไม่ได้ว่าคุ้มไหม/);
  });

  it('ไม่มีข้อมูลเลย ⇒ unknown ห้ามเดาว่าถูกหรือแพง', () => {
    expect(cacTrap().verdict).toBe('unknown');
  });
});

describe('ด่านปล่อยเงินลงทุน — fail-closed และต้องมีคนอนุมัติเสมอ', () => {
  it('ทุกด่านต้องให้คนอนุมัติ — ระบบปล่อยเงินเองไม่ได้', () => {
    expect(INVESTMENT_GATES.length).toBe(6);
    for (const g of INVESTMENT_GATES) expect(g.humanApproval).toBe(true);
  });

  it('canRelease เป็น false เสมอ ไม่ว่าสถานะไหน', () => {
    for (const inp of [{}, { paidStarter: 10 }, { paidStarter: 10, activated48h: 5, firstValue7d: 3, corePaid: 2, renewed: 1 }]) {
      expect(investmentGateStatus(inp).canRelease).toBe(false);
    }
  });

  it('วันนี้ค้างที่ด่าน 0 — ยังไม่มีลูกค้าที่จ่ายเงินจริง', () => {
    expect(investmentGateStatus().stuckAt.n).toBe(0);
  });

  it('วัด Activation ไม่ได้ ⇒ ค้างด่าน 1 (ตรวจไม่ได้ = ไม่ผ่าน)', () => {
    expect(investmentGateStatus({ paidStarter: 10 }).stuckAt.n).toBe(1);
  });

  it('ยอดสมัครโตอย่างเดียว ปลดด่าน 3 ไม่ได้', () => {
    const s = investmentGateStatus({ paidStarter: 500, activated48h: 200, firstValue7d: 100, corePaid: 0 });
    expect(s.stuckAt.n).toBe(3);
  });
});

describe('North Star + เกณฑ์ที่ห้ามใช้ผิดความหมาย', () => {
  it('North Star ต้องนับ "ผลลัพธ์ที่ตรวจสอบได้" ไม่ใช่ "เข้าใช้งานแล้ว"', () => {
    const r = verifiedFirstOutcomeRate({ paidStarter: 100, firstValue7d: 37 });
    expect(r.value).toBeCloseTo(0.37, 5);
    expect(r.label).toMatch(/ตรวจสอบได้/);
  });

  it('ไม่มีข้อมูล ⇒ null ไม่ใช่ 0', () => {
    expect(verifiedFirstOutcomeRate().value).toBeNull();
  });

  it('🔴 2% = เส้นรอด ห้ามเป็นเป้าหมาย · 15% = สมมติ', () => {
    expect(BREAK_EVEN_CVR).toBe(0.02);
    expect(BASE_CASE_CVR).toBe(0.15);
    expect(CVR_NOTE).toMatch(/ห้ามใช้เป็นเป้าหมาย/);
    expect(CVR_NOTE).toMatch(/สมมติ/);
  });
});

describe('กรวยเศรษฐศาสตร์ — บอกได้ว่าขาดตัวบันทึกอะไร', () => {
  it('ทุกขั้นต้องบอกทั้งนิยามและเวลาที่ต้องบันทึก', () => {
    for (const s of ECON_FUNNEL) {
      expect(s.definition.length).toBeGreaterThan(10);
      expect(s.needsTimestamp).toMatch(/_at$/);
    }
  });

  it('รายการเวลาที่ต้องบันทึก ตรงกับกรวยเสมอ (เพิ่มขั้นแล้วไม่เพิ่มเวลา = แดง)', () => {
    expect(REQUIRED_TIMESTAMPS).toEqual(ECON_FUNNEL.map((s) => s.needsTimestamp));
  });
});
