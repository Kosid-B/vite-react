import { describe, it, expect } from 'vitest';
import { TRUST_SIGNALS } from '../trustSignals';

describe('trustSignals', () => {
  it('มีสัญญาณ + ทุกอันมี icon/label', () => {
    expect(TRUST_SIGNALS.length).toBeGreaterThan(0);
    TRUST_SIGNALS.forEach(s => {
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
    });
  });

  it('ไม่มีตัวเลข "ผู้ใช้/ลูกค้า X คน" ปลอม (กัน social proof เท็จ)', () => {
    const joined = TRUST_SIGNALS.map(s => s.label).join(' ');
    expect(joined).not.toMatch(/\d+[,\d]*\s*(ผู้ใช้|ลูกค้า|users|customers|คนใช้)/i);
  });
});
