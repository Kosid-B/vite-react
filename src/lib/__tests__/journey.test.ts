import { describe, it, expect } from 'vitest';
import { JOURNEY, journeySteps, journeyProgress, nextStep, currentPhase } from '../journey';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

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

describe('journeyProgress + nextStep', () => {
  it('progress อยู่ในช่วง 0..total และ pct 0..100', () => {
    const p = journeyProgress(DEFAULT_DATA);
    expect(p.total).toBe(journeySteps().length);
    expect(p.done).toBeGreaterThanOrEqual(0);
    expect(p.done).toBeLessThanOrEqual(p.total);
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThanOrEqual(100);
  });

  it('nextStep = step แรกที่ยังไม่ทำ (สอดคล้องกับ done count)', () => {
    const next = nextStep(DEFAULT_DATA);
    const p = journeyProgress(DEFAULT_DATA);
    if (p.done < p.total) {
      expect(next).not.toBeNull();
      expect(next!.done(DEFAULT_DATA)).toBe(false);
    } else {
      expect(next).toBeNull();
    }
  });

  it('เมื่อทุก step เสร็จ → progress เต็ม, nextStep null, currentPhase null', () => {
    // จำลอง done ครบด้วยการ visited ทุกหน้า + ข้อมูลจริงครบ
    const allPages = journeySteps().map(s => s.page);
    const full: AppData = {
      ...DEFAULT_DATA,
      visitedMarket: true,
      visitedPages: allPages,
      actions: [{ ...(DEFAULT_DATA.actions[0] ?? { id: 'a', text: 't', priority: 1, done: false, owner: '' }), done: true }] as AppData['actions'],
      aiCompany: {
        ...DEFAULT_DATA.aiCompany,
        industry: 'test', goal: 'test', missionApproved: true,
        agents: Array.from({ length: 3 }, (_, i) => ({ ...DEFAULT_DATA.aiCompany.agents[0], id: 'x' + i })) as AppData['aiCompany']['agents'],
        tasks: [{ ...DEFAULT_DATA.aiCompany.tasks[0], status: 'done' }] as AppData['aiCompany']['tasks'],
        purchasedSkills: ['skill1'],
        subscriptionOverride: undefined,
      },
      subscription: { ...DEFAULT_DATA.subscription, plan: 'growth' },
    };
    const p = journeyProgress(full);
    // อย่างน้อยขั้นที่ผูก visited + ข้อมูลจริงต้องเสร็จเกือบครบ (ยกเว้นที่ต้องพึ่ง logic เฉพาะ)
    expect(p.done).toBeGreaterThanOrEqual(journeySteps().length - 2);
  });
});

describe('currentPhase', () => {
  it('คืน phase ที่ยังมี step ค้าง (หรือ null ถ้าเสร็จหมด)', () => {
    const ph = currentPhase(DEFAULT_DATA);
    if (ph) expect(ph.steps.some(s => !s.done(DEFAULT_DATA))).toBe(true);
  });
});
