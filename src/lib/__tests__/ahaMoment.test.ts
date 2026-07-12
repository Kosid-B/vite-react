import { describe, it, expect } from 'vitest';
import { ahaProgress, AHA_STEPS } from '../ahaMoment';
import type { AppData } from '../../types';

const mk = (over: Partial<AppData['aiCompany']>): AppData =>
  ({ aiCompany: { industry: '', goal: '', agents: [], running: false, tasks: [], ...over } } as unknown as AppData);

describe('ahaProgress — 3 ก้าวสู่ Aha', () => {
  it('ว่างเปล่า → 0/3, ยังไม่ activated, เวลาเต็ม 5 นาที', () => {
    const a = ahaProgress(mk({}));
    expect(a.doneCount).toBe(0);
    expect(a.total).toBe(3);
    expect(a.activated).toBe(false);
    expect(a.minsLeft).toBe(5);           // 2+2+1
    expect(a.nextStep?.id).toBe('goal');
  });

  it('ก้าวแรกเสร็จ (industry+goal) → 1/3, เหลือ 3 นาที, next=team', () => {
    const a = ahaProgress(mk({ industry: 'อีคอมเมิร์ซ', goal: 'ยอด ฿500k/เดือน' }));
    expect(a.doneCount).toBe(1);
    expect(a.minsLeft).toBe(3);
    expect(a.nextStep?.id).toBe('team');
  });

  it('ทีม ≥3 + มีงาน → activated ครบ 3/3', () => {
    const a = ahaProgress(mk({
      industry: 'x', goal: 'y',
      agents: [{}, {}, {}] as never,
      tasks: [{}] as never,
    }));
    expect(a.doneCount).toBe(3);
    expect(a.activated).toBe(true);
    expect(a.minsLeft).toBe(0);
    expect(a.pct).toBe(100);
    expect(a.nextStep).toBeNull();
  });

  it('running=true นับว่าเริ่มทำงานแล้ว แม้ไม่มี task', () => {
    const a = ahaProgress(mk({ industry: 'x', goal: 'y', agents: [{}, {}, {}] as never, running: true }));
    expect(a.steps.find(s => s.id === 'run')?.complete).toBe(true);
  });

  it('AHA_STEPS มี 3 ก้าว และรวมเวลา = 5 นาที', () => {
    expect(AHA_STEPS).toHaveLength(3);
    expect(AHA_STEPS.reduce((n, s) => n + s.mins, 0)).toBe(5);
  });
});
