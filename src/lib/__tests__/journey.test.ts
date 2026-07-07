import { describe, it, expect } from 'vitest';
import { JOURNEY, journeySteps, journeyProgress, nextStep, currentPhase } from '../journey';
import { DEFAULT_DATA } from '../../data';

describe('journey structure', () => {
  it('มี phase ครบ 6 ระยะ และทุก step มี id ไม่ซ้ำ', () => {
    expect(JOURNEY).toHaveLength(6);
    const ids = journeySteps().map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);   // ไม่ซ้ำ
  });

  it('ทุก step ชี้ไปหน้า (page) และมี hint', () => {
    for (const s of journeySteps()) {
      expect(s.page).toBeTruthy();
      expect(s.hint.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('user ใหม่ — ยังไม่มีการทำงาน (ไม่ติ๊กจากข้อมูล seed/demo)', () => {
  it('ทุก step ของ DEFAULT_DATA (seed) ยังไม่ done → progress = 0', () => {
    const p = journeyProgress(DEFAULT_DATA);
    expect(p.done).toBe(0);
    for (const s of journeySteps()) {
      expect(s.done(DEFAULT_DATA), `step "${s.id}" ไม่ควร done สำหรับ user ใหม่`).toBe(false);
    }
  });

  it('nextStep ของ user ใหม่ = step แรกสุด (industry)', () => {
    expect(nextStep(DEFAULT_DATA)?.id).toBe('industry');
  });
});

describe('เมื่อ user ลงมือจริง (ค่าต่างจาก seed) → step ติ๊ก done', () => {
  const acted = {
    ...DEFAULT_DATA,
    subscription: { ...DEFAULT_DATA.subscription, plan: 'growth' as const },
    aiCompany: {
      ...DEFAULT_DATA.aiCompany,
      industry: 'ร้านกาแฟของฉัน',
      goal: 'ยอดขาย ฿1,000,000 ใน 6 เดือน',
      missionApproved: true,
    },
  };
  const byId = (id: string) => journeySteps().find(s => s.id === id)!;

  it('industry/goal/mission/upgrade → done หลังผู้ใช้เปลี่ยนค่า', () => {
    expect(byId('industry').done(acted)).toBe(true);
    expect(byId('goal').done(acted)).toBe(true);
    expect(byId('mission').done(acted)).toBe(true);
    expect(byId('upgrade').done(acted)).toBe(true);
    expect(journeyProgress(acted).done).toBeGreaterThanOrEqual(4);
  });

  it('visited tool page → step เครื่องมือ done', () => {
    const visited = { ...DEFAULT_DATA, visitedPages: ['personas' as const] };
    expect(byId('personas').done(visited)).toBe(true);
  });
});

describe('progress + currentPhase invariants', () => {
  it('progress อยู่ในช่วง 0..total และ pct 0..100', () => {
    const p = journeyProgress(DEFAULT_DATA);
    expect(p.total).toBe(journeySteps().length);
    expect(p.done).toBeGreaterThanOrEqual(0);
    expect(p.done).toBeLessThanOrEqual(p.total);
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThanOrEqual(100);
  });

  it('currentPhase คืน phase ที่ยังมี step ค้าง (user ใหม่ = ระยะตั้งค่า)', () => {
    expect(currentPhase(DEFAULT_DATA)?.key).toBe('setup');
  });
});
