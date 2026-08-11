import { describe, it, expect } from 'vitest';
import { AI_OBJECTIONS, AI_OBJECTIONS_TITLE, AI_OBJECTIONS_SUB } from '../aiObjections';

describe('aiObjections', () => {
  it('ครอบคลุม 3 ความกลัวหลัก (ใช้ไม่เป็น / ถูกต้อง / คุมได้) + ลองก่อน', () => {
    expect(AI_OBJECTIONS.length).toBeGreaterThanOrEqual(3);
    const all = AI_OBJECTIONS.map((o) => o.fear + o.answer).join(' ');
    expect(all).toMatch(/ใช้ไม่เป็น|เคยใช้ AI/);
    expect(all).toMatch(/ถูกต้อง|มั่ว/);
    expect(all).toMatch(/คุม|อนุมัติ|ตรวจ/);
  });
  it('ทุกข้อมี icon/fear/answer ครบ', () => {
    for (const o of AI_OBJECTIONS) {
      expect(o.icon.length).toBeGreaterThan(0);
      expect(o.fear.length).toBeGreaterThan(0);
      expect(o.answer.length).toBeGreaterThan(0);
    }
  });
  it('มีหัวข้อ + คำโปรย', () => {
    expect(AI_OBJECTIONS_TITLE.length).toBeGreaterThan(0);
    expect(AI_OBJECTIONS_SUB.length).toBeGreaterThan(0);
  });
});
