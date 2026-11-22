import { describe, it, expect } from 'vitest';
import {
  PHASE1_BASELINE,
  PHASE1_SCOPE,
  PHASE1_FROZEN_AT,
  PHASE1_FROZEN_BUNDLE,
  REQUIRED_KEYS,
  baselineIssues,
  baselineFrozen,
  baselineStatusLine,
  baselineBlock,
  type BaselineMetric,
} from '../phase1Baseline';

/* ══════════════════════════════════════════════════════════════════════════
 * ไฟล์นี้ **คือกลไก freeze เอง** ไม่ใช่เทสต์ประกอบ
 *   "freeze" ในโปรเจกต์นี้ = ตัวเลขถูกเขียนลงรีโป + ถูกล็อกไว้ตรงนี้
 *   ⇒ แก้ค่าโดยไม่แก้เทสต์ = แดง ⇒ ตัวเลขขยับได้ แต่ขยับแบบ "ตั้งใจ" เท่านั้น
 * ══════════════════════════════════════════════════════════════════════════ */

const base = (over: Partial<BaselineMetric> = {}): BaselineMetric => ({
  key: 'x',
  label: 'ตัวอย่าง',
  required: false,
  truth: 'measured',
  value: 1,
  unit: 'แถว',
  measuredAt: '2026-11-01',
  method: 'select count(*) from public.example — วิธีนับที่ยาวพอจะรันซ้ำได้',
  ...over,
});

describe('① ค่าที่ freeze แล้ว — ล็อกทีละตัว', () => {
  const v = (k: string) => PHASE1_BASELINE.find((m) => m.key === k)?.value;

  it('ตัวเลขทุกตัวต้องเป็นค่าที่วัดเมื่อ 22 พ.ย. 2569 เป๊ะ', () => {
    expect(v('landingVisitors')).toBe(395);
    expect(v('segIdentified')).toBe(20);
    expect(v('reachedCta')).toBe(10);
    expect(v('signups')).toBe(5);
    expect(v('quickcheckSubmissions')).toBe(1);
    expect(v('payingCustomers')).toBe(0);
    expect(v('clientErrors')).toBe(27);
    expect(v('osEventsFromUsLive')).toBe(0);
  });

  it('วันที่ freeze และของจริงที่เสิร์ฟตอนนั้น ถูกบันทึกไว้', () => {
    expect(PHASE1_FROZEN_AT).toBe('2026-11-22');
    expect(PHASE1_FROZEN_BUNDLE).toBe('index-DQCwqKgo.js');
  });

  /* 🔴 ด่านนี้กัน "ลดเกณฑ์เพื่อให้ผ่าน" — วิธีโกงที่ง่ายที่สุดคือถอด required ออกสักตัว */
  it('🔴 รายการตัวชี้วัดที่บังคับ ห้ามหดลง', () => {
    expect([...REQUIRED_KEYS].sort()).toEqual([
      'clientErrors',
      'landingVisitors',
      'osEventsFromUsLive',
      'payingCustomers',
      'quickcheckSubmissions',
      'reachedCta',
      'segIdentified',
      'signups',
    ]);
  });

  it('ทุกตัวต้องบอกวิธีนับที่รันซ้ำได้ ไม่ใช่ "ดูจากแดชบอร์ด"', () => {
    for (const m of PHASE1_BASELINE) {
      expect(m.method.length, m.key).toBeGreaterThan(30);
      expect(m.method, m.key).not.toMatch(/ดูจาก|ประมาณ|น่าจะ/);
    }
  });

  /* 🔴 `0` คือตัวเลขที่ถูกอ่านผิดบ่อยที่สุดในรีโปนี้ (decisionRules.zeroIsNotProof)
   *    ⇒ ตัวไหนเป็น 0 ต้องมีประโยคกำกับว่ามันไม่ได้แปลว่าอะไร */
  it('🔴 ตัวที่เป็นศูนย์ ต้องบอกว่ามันไม่ได้แปลว่าอะไร', () => {
    for (const m of PHASE1_BASELINE.filter((x) => x.value === 0)) {
      expect(m.doesNotMean, `${m.key} เป็น 0 แต่ไม่กำกับว่าอ่านผิดยังไงได้`).toBeTruthy();
    }
  });

  it('ขอบเขตของ Phase 1 ต้องเขียนไว้ — ไม่งั้น "baseline ของอะไร" ตอบไม่ได้', () => {
    expect(PHASE1_SCOPE.length).toBeGreaterThanOrEqual(3);
  });
});

describe('② เงื่อนไขปิดด่าน — ต้องแดงจริงเมื่อของขาด', () => {
  it('สถานะจริงตอนนี้: freeze สำเร็จ', () => {
    expect(baselineIssues()).toEqual([]);
    expect(baselineFrozen()).toBe(true);
  });

  it('🔴 ตัวบังคับที่ยังวัดไม่ได้ = ยัง freeze ไม่ได้ (ถึงจะบอกเหตุผลครบ)', () => {
    const rows = [base({ required: true, truth: 'unavailable', value: null, whyUnavailable: 'ยังไม่มีตารางให้นับ' })];
    expect(baselineFrozen(rows)).toBe(false);
    expect(baselineIssues(rows).join()).toMatch(/ยัง freeze ไม่ได้/);
  });

  it('🔴 วัดไม่ได้แต่ใส่ 0 = ผิด — 0 ไม่ใช่ "ไม่รู้"', () => {
    const rows = [base({ truth: 'unavailable', value: 0, whyUnavailable: 'ยังไม่มีตารางให้นับ' })];
    expect(baselineIssues(rows).join()).toMatch(/0 ไม่ใช่/);
  });

  it('วัดไม่ได้แล้วไม่บอกเหตุผล = แดง', () => {
    const rows = [base({ truth: 'unavailable', value: null })];
    expect(baselineIssues(rows).join()).toMatch(/ไม่บอกว่าเพราะอะไร/);
  });

  it('วิธีนับสั้นเกินไป = แดง', () => {
    expect(baselineIssues([base({ method: 'นับแล้ว' })]).join()).toMatch(/สั้นเกิน/);
  });

  it('วันที่วัดอยู่ในอนาคต = แดง (กันการกรอกล่วงหน้า)', () => {
    expect(baselineIssues([base({ measuredAt: '2027-01-01' })], '2026-11-22').join()).toMatch(/อนาคต/);
  });

  it('ขาดตัวชี้วัดที่บังคับ = แดง', () => {
    expect(baselineIssues([base()]).join()).toMatch(/ขาดตัวชี้วัดที่บังคับ/);
  });

  it('บอกว่าวัดแล้วแต่ค่าไม่ใช่ตัวเลข = แดง', () => {
    expect(baselineIssues([base({ value: null })]).join()).toMatch(/ค่าไม่ใช่ตัวเลข/);
  });
});

describe('③ ประโยคสถานะ', () => {
  it('มีปีกำกับเสมอ (ด่านที่รู้สถานะต้องบอกที่มาได้)', () => {
    expect(baselineStatusLine()).toMatch(/256\d/);
  });

  it('บล็อกสรุปมีครบทุกตัว + คำเตือนเรื่องการอ่าน 0', () => {
    const b = baselineBlock();
    for (const m of PHASE1_BASELINE) expect(b).toContain(m.label);
    expect(b).toMatch(/ยังไม่พบ/);
  });
});
