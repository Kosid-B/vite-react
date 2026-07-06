import { describe, it, expect } from 'vitest';
import { pickNudgeVariant, buildNudge, NUDGE_ANGLES, REAL_PROOF, REAL_OFFER } from '../authNudge';

describe('authNudge — nudge ที่ใช้สัญญาณจริง (authentic)', () => {
  it('pickNudgeVariant deterministic + วนครบทุกมุม', () => {
    const seen = new Set(NUDGE_ANGLES.map((_, i) => pickNudgeVariant(i)));
    expect(seen.size).toBe(NUDGE_ANGLES.length);       // 4 วันติดกัน = 4 มุมต่างกัน
    expect(pickNudgeVariant(0)).toBe(pickNudgeVariant(4)); // deterministic (วนรอบ)
  });

  it('รองรับ stamp ติดลบโดยไม่พัง', () => {
    expect(NUDGE_ANGLES).toContain(pickNudgeVariant(-1));
  });

  it('ทุก nudge ใช้ proof จริง + offer จริง (ไม่ใช่ตัวเลขปลอม/celebrity)', () => {
    for (const angle of NUDGE_ANGLES) {
      const n = buildNudge(angle);
      expect(n.proof).toBe(REAL_PROOF);       // เครดิตจริง ตรวจสอบได้
      expect(n.chip).toBe(REAL_OFFER);        // offer จริงของระบบ
      expect(n.headline.length).toBeGreaterThan(0);
      expect(n.symbol.length).toBeGreaterThan(0);
    }
  });
});
