import { describe, it, expect } from 'vitest';
import { extractVerdict, VERDICT_META } from '../marketValidation';

describe('extractVerdict', () => {
  it('อ่าน GO เป็น verdict go', () => {
    expect(extractVerdict('สรุป: GO — ไอเดียมี pain จริง')).toBe('go');
  });
  it('อ่าน PIVOT', () => {
    expect(extractVerdict('PIVOT: ควรปรับกลุ่มเป้าหมายก่อน')).toBe('pivot');
  });
  it('อ่าน KILL', () => {
    expect(extractVerdict('KILL — ตลาดเล็กเกินไป เสนอ pivot idea')).toBe('kill');
  });
  it('เลือกคำที่ปรากฏก่อน (บรรทัดสรุปมักอยู่ต้น)', () => {
    // "KILL" อยู่ก่อน "go ahead" ในเนื้อความ → ต้องได้ kill
    expect(extractVerdict('Decision: KILL. อย่าเพิ่ง go ahead')).toBe('kill');
  });
  it('คืนค่าว่างเมื่อไม่มี verdict', () => {
    expect(extractVerdict('ยังไม่สรุป')).toBe('');
    expect(extractVerdict('')).toBe('');
  });
  it('VERDICT_META มีครบทุก verdict พร้อมสี', () => {
    for (const v of ['go', 'pivot', 'kill'] as const) {
      expect(VERDICT_META[v].label).toBeTruthy();
      expect(VERDICT_META[v].color).toMatch(/^#/);
    }
  });
});
