import { describe, it, expect } from 'vitest';
import { TEAM_TEMPLATES, GENERAL_TEMPLATE, pickTeamTemplate } from '../teamTemplates';

describe('teamTemplates', () => {
  it('ทุกเทมเพลตมี CEO เป็น lead 1 คนเสมอ', () => {
    for (const t of TEAM_TEMPLATES) {
      const leads = t.roles.filter(r => r.lead);
      expect(leads).toHaveLength(1);
      expect(leads[0].role).toBe('CEO');
    }
  });

  it('ทุกเทมเพลตมีทีม ≥ 3 คน (ผ่านเกณฑ์ activation)', () => {
    expect(TEAM_TEMPLATES.every(t => t.roles.length >= 3)).toBe(true);
  });

  it('pickTeamTemplate จับคีย์เวิร์ดธุรกิจได้', () => {
    expect(pickTeamTemplate('ร้านกาแฟเล็ก ๆ').id).toBe('food');
    expect(pickTeamTemplate('ขายของออนไลน์').id).toBe('ecommerce');
    expect(pickTeamTemplate('บริษัท software startup').id).toBe('tech');
    expect(pickTeamTemplate('รับจ้างที่ปรึกษา').id).toBe('service');
    expect(pickTeamTemplate('โรงงานผลิตชิ้นส่วน').id).toBe('manufacturing');
  });

  it('ไม่ตรงคีย์เวิร์ด / ว่าง → ทีมทั่วไป', () => {
    expect(pickTeamTemplate('อะไรสักอย่าง').id).toBe('general');
    expect(pickTeamTemplate('').id).toBe('general');
    expect(pickTeamTemplate(undefined).id).toBe(GENERAL_TEMPLATE.id);
  });

  it('ชื่อบทบาทไม่ซ้ำภายในเทมเพลตเดียว', () => {
    for (const t of TEAM_TEMPLATES) {
      const roles = t.roles.map(r => r.role);
      expect(new Set(roles).size).toBe(roles.length);
    }
  });
});
