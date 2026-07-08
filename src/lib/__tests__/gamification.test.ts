import { describe, it, expect } from 'vitest';
import { getCompanyLevel, companyXP, COMPANY_LEVELS, QUESTS, ACHIEVEMENTS } from '../gamification';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* XP/ระดับบริษัท = แกน gamification (ผูก rewards/city) — เกณฑ์ระดับ + สูตร XP ต้องนิ่ง */

describe('getCompanyLevel — เกณฑ์ระดับตามช่วง XP', () => {
  it('map XP → rank ถูกช่วง (รวมขอบล่างของแต่ละระดับ)', () => {
    expect(getCompanyLevel(0).rank).toBe('Starter');
    expect(getCompanyLevel(999).rank).toBe('Starter');
    expect(getCompanyLevel(1000).rank).toBe('Growing');
    expect(getCompanyLevel(3000).rank).toBe('Professional');
    expect(getCompanyLevel(6000).rank).toBe('Advanced');
    expect(getCompanyLevel(10000).rank).toBe('Elite');
    expect(getCompanyLevel(9_999_999).rank).toBe('Elite');   // max = Infinity
  });

  it('ช่วงระดับต่อเนื่องไม่มีรู (max+1 ของอันก่อน = min ของอันถัดไป)', () => {
    for (let i = 1; i < COMPANY_LEVELS.length; i++) {
      expect(COMPANY_LEVELS[i].min).toBe(COMPANY_LEVELS[i - 1].max + 1);
    }
  });
});

describe('companyXP', () => {
  it('skillXP บวกเข้า XP ตรง ๆ (ไม่กระทบ quest/activity)', () => {
    const base = DEFAULT_DATA;
    const more: AppData = { ...base, aiCompany: { ...base.aiCompany, skillXP: (base.aiCompany.skillXP ?? 0) + 1000 } };
    expect(companyXP(more)).toBe(companyXP(base) + 1000);
  });

  it('ไม่ติดลบ และเป็นตัวเลขจำกัด', () => {
    const xp = companyXP(DEFAULT_DATA);
    expect(xp).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(xp)).toBe(true);
  });
});

describe('QUESTS / ACHIEVEMENTS', () => {
  it('id ไม่ซ้ำทั้งสองชุด', () => {
    const q = QUESTS.map(x => x.id);
    const a = ACHIEVEMENTS.map(x => x.id);
    expect(new Set(q).size).toBe(q.length);
    expect(new Set(a).size).toBe(a.length);
  });

  it('quest "team" สำเร็จเมื่อมีผู้บริหาร ≥ 3', () => {
    const team = QUESTS.find(q => q.id === 'team')!;
    const one = DEFAULT_DATA.aiCompany.agents[0];
    expect(team.done({ ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, agents: [one, one] } })).toBe(false);
    expect(team.done({ ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, agents: [one, one, one] } })).toBe(true);
  });

  it('achievement "first-hire" ได้เมื่อมีเอเจนต์ ≥ 1 + progress ไม่เกิน target', () => {
    const fh = ACHIEVEMENTS.find(a => a.id === 'first-hire')!;
    const none: AppData = { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, agents: [] } };
    expect(fh.earned(none)).toBe(false);
    const p = fh.progress(none);
    expect(p.cur).toBeLessThanOrEqual(p.target);
  });
});
