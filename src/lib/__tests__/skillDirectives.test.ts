import { describe, it, expect } from 'vitest';
import { skillDirectives, withSkillDirectives, SKILL_DIRECTIVES, SYSTEM_DESIGN_DIRECTIVE } from '../skillDirectives';

/* Skill directives → inject เข้า mandate ของ agent-run · ซื้อ skill ไหนใส่ directive นั้น */

describe('skillDirectives', () => {
  it('รวม directive เฉพาะ skill ที่ซื้อ (มีในทะเบียน)', () => {
    const out = skillDirectives(['data-driven-ai-agent']);
    expect(out).toContain('Data-Driven AI Agent');
    expect(out).not.toContain('Market Validation');
  });
  it('หลาย skill → คั่นด้วยบรรทัดว่าง', () => {
    const out = skillDirectives(['data-driven-ai-agent', 'market-validation-discovery']);
    expect(out).toContain('Data-Driven AI Agent');
    expect(out).toContain('Market Validation');
    expect(out).toContain('\n\n');
  });
  it('ไม่มี/undefined/skill ไม่รู้จัก → ตัดทิ้ง', () => {
    expect(skillDirectives(undefined)).toBe('');
    expect(skillDirectives([])).toBe('');
    expect(skillDirectives(['ไม่มีจริง'])).toBe('');
  });
});

describe('withSkillDirectives', () => {
  it('ใส่ PLG (system design) เสมอ + mandate นำหน้า', () => {
    const out = withSkillDirectives('ทำงาน X', undefined);
    expect(out.startsWith('ทำงาน X')).toBe(true);
    expect(out).toContain(SYSTEM_DESIGN_DIRECTIVE);
  });
  it('ต่อ directive ของ skill ที่ซื้อท้าย PLG', () => {
    const out = withSkillDirectives('mandate', ['market-insight-thailand']);
    expect(out).toContain('Market Insight');
    expect(out).toContain(SKILL_DIRECTIVES['market-insight-thailand']);
  });
});
