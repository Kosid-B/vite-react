import { describe, it, expect } from 'vitest';
import { businessBrainScore, CHATBOT_DIFF, type BrainInputs } from '../moatMeter';

const EMPTY: BrainInputs = { financeEntries: 0, opsDays: 0, dealsClosed: 0, agents: 0, skillsLearned: 0, streakDays: 0 };
const FULL: BrainInputs = { financeEntries: 12, opsDays: 30, dealsClosed: 10, agents: 5, skillsLearned: 10, streakDays: 30 };

describe('businessBrainScore', () => {
  it('ไม่มีข้อมูล → score 0 + tier seed + สารเริ่มต้น', () => {
    const r = businessBrainScore(EMPTY);
    expect(r.score).toBe(0);
    expect(r.tier.key).toBe('seed');
    expect(r.filledCount).toBe(0);
    expect(r.dataPoints).toBe(0);
    expect(r.switchingNote).toContain('เริ่ม');
  });

  it('ข้อมูลเต็ม → score 100 + tier moat (คูเมือง)', () => {
    const r = businessBrainScore(FULL);
    expect(r.score).toBe(100);
    expect(r.tier.key).toBe('moat');
    expect(r.filledCount).toBe(6);
  });

  it('score cap ที่ 100 แม้ค่าเกิน cap', () => {
    const r = businessBrainScore({ financeEntries: 999, opsDays: 999, dealsClosed: 999, agents: 99, skillsLearned: 99, streakDays: 999 });
    expect(r.score).toBe(100);
  });

  it('มีข้อมูลบางส่วน → switchingNote อ้างจำนวนจุดข้อมูลจริง', () => {
    const r = businessBrainScore({ ...EMPTY, financeEntries: 3, dealsClosed: 1 });
    expect(r.dataPoints).toBe(4);
    expect(r.switchingNote).toContain('4 จุดข้อมูล');
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(25);
    expect(r.tier.key).toBe('seed');
  });

  it('nextStep ชี้ asset ที่มีช่องว่างคะแนนมากสุด', () => {
    // เติมทุกอย่างยกเว้น deals (weight 20) → nextStep ควรเป็นดีล
    const r = businessBrainScore({ ...FULL, dealsClosed: 0 });
    expect(r.nextStep).toContain('ดีล');
  });

  it('assets earned รวม = score (ก่อน cap)', () => {
    const r = businessBrainScore({ ...EMPTY, agents: 5 }); // 15/15
    const agentAsset = r.assets.find((a) => a.key === 'agents')!;
    expect(agentAsset.earned).toBe(15);
    expect(r.score).toBe(15);
  });
});

describe('CHATBOT_DIFF', () => {
  it('มีคู่เปรียบเทียบ + พูดถึง integration ไทย', () => {
    expect(CHATBOT_DIFF.length).toBeGreaterThanOrEqual(3);
    expect(CHATBOT_DIFF.some((d) => /PDPA|PromptPay|SlipOK|ไทย/.test(d.us))).toBe(true);
    CHATBOT_DIFF.forEach((d) => { expect(d.them.length).toBeGreaterThan(0); expect(d.us.length).toBeGreaterThan(0); });
  });
});
