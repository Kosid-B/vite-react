import { describe, it, expect } from 'vitest';
import { SAFETY_COMMITMENTS, SAFETY_FAQ, SAFETY_TAGLINE } from '../aiSafety';

describe('aiSafety — คำมั่นความปลอดภัย AI', () => {
  it('คำมั่น 6 ข้อ ครบฟิลด์', () => {
    expect(SAFETY_COMMITMENTS).toHaveLength(6);
    SAFETY_COMMITMENTS.forEach(c => {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.body.length).toBeGreaterThan(0);
    });
  });
  it('ครอบคลุมเกราะหลัก: RLS · allowlist · human-in-the-loop', () => {
    const all = SAFETY_COMMITMENTS.map(c => c.title + ' ' + c.body).join(' ');
    expect(all).toContain('RLS');
    expect(all).toContain('allowlist');
    expect(all).toContain('human-in-the-loop');
    expect(all).toContain('PDPA');
  });
  it('FAQ ตอบประเด็นข่าว (แฮก/เข้าถึงระบบภายนอก)', () => {
    const joined = SAFETY_FAQ.map(f => f.q + ' ' + f.a).join(' ');
    expect(SAFETY_FAQ.length).toBeGreaterThanOrEqual(4);
    expect(joined).toContain('แฮก');
    expect(joined).toContain('ข้อมูลบริษัทอื่น');
  });
  it('tagline มีสาระ', () => {
    expect(SAFETY_TAGLINE).toContain('เวิร์กสเปซ');
  });
});
