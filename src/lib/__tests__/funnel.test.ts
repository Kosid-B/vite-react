import { describe, it, expect } from 'vitest';
import { funnelSummary } from '../funnel';
import { DEFAULT_DATA } from '../../data';
import type { AppData, AgentTask, TaskStatus } from '../../types';

/* Activation funnel + engagement segments — ตอบ GA4: "หลุดตรงไหนก่อน activate" */

const t = (status: TaskStatus, id: string): AgentTask => ({ ...DEFAULT_DATA.aiCompany.tasks[0], id, status });

const base = (over: Partial<AppData>): AppData => ({
  ...DEFAULT_DATA,
  subscription: { ...DEFAULT_DATA.subscription, plan: 'free', status: 'active' },
  finance: [],
  onboardGoal: undefined,
  streak: undefined,
  marketplace: { ...DEFAULT_DATA.marketplace, deals: [] },
  ...over,
});

const company = (over: Partial<AppData['aiCompany']>): AppData['aiCompany'] => ({
  ...DEFAULT_DATA.aiCompany, ...over,
});

describe('funnelSummary — ขั้น funnel', () => {
  it('นับแต่ละขั้น + pct + drop-off + activationRate ถูกต้อง', () => {
    const ws1 = base({ onboardGoal: 'aicompany', finance: [{ id: 'r', label: 'ขาย', amount: 5000, kind: 'revenue', date: '2026-07-01' }], aiCompany: company({ name: 'บริษัทจริง', tasks: [t('done', 'a')] }) });
    const ws2 = base({ onboardGoal: 'sell', aiCompany: company({ name: '', tasks: [] }) });
    const ws3 = null;

    const f = funnelSummary([ws1, ws2, ws3]);
    expect(f.total).toBe(3);
    const by = Object.fromEntries(f.stages.map(s => [s.key, s.count]));
    expect(by.signup).toBe(3);
    expect(by.goal).toBe(2);       // ws1, ws2
    expect(by.activate).toBe(1);   // ws1 (ws2 name ว่าง, ws3 null)
    expect(by.work).toBe(1);       // ws1 มีงานเสร็จ
    expect(by.revenue).toBe(1);    // ws1 มีรายได้
    expect(f.activationRate).toBe(33.3);

    const goalStage = f.stages.find(s => s.key === 'goal')!;
    expect(goalStage.dropFromPrev).toBe(33.3); // (3-2)/3
    const actStage = f.stages.find(s => s.key === 'activate')!;
    expect(actStage.dropFromPrev).toBe(50);    // (2-1)/2
  });

  it('seed สด (ยังไม่แตะบริษัท) = ยังไม่ activate — กันตัวเลขหลอก ~100%', () => {
    // pristine DEFAULT_DATA มีชื่อ/ประเภท/เป้าหมาย/3 เอเจนต์จาก seed แต่ผู้ใช้ยังไม่ได้ปรับอะไร
    const pristine = base({});
    const f = funnelSummary([pristine]);
    expect(f.stages.find(s => s.key === 'activate')!.count).toBe(0);
    expect(f.activationRate).toBe(0);
  });

  it('แก้ประเภทธุรกิจ/เป้าหมายจาก seed = นับเป็น activate', () => {
    const custom = base({ aiCompany: company({ industry: 'ร้านกาแฟเฉพาะทาง' }) });
    expect(funnelSummary([custom]).stages.find(s => s.key === 'activate')!.count).toBe(1);
  });

  it('list ว่าง → total 0, ทุกขั้น 0, ไม่หาร 0', () => {
    const f = funnelSummary([]);
    expect(f.total).toBe(0);
    expect(f.activationRate).toBe(0);
    expect(f.stages.every(s => s.count === 0 && s.pct === 0)).toBe(true);
  });
});

describe('funnelSummary — segment ความลึก', () => {
  it('แบ่ง deep / active / shallow / inactive ตามการลงมือ', () => {
    const deep = base({ aiCompany: company({ name: 'D', tasks: [t('done','1'),t('done','2'),t('done','3'),t('done','4'),t('done','5')] }) });
    const active = base({ aiCompany: company({ name: 'A', tasks: [t('done','1')] }) });
    const shallow = base({ aiCompany: company({ name: 'S', agents: [], tasks: [], running: false }) });
    const inactive = null;

    const f = funnelSummary([deep, active, shallow, inactive]);
    const seg = Object.fromEntries(f.segments.map(s => [s.key, s.count]));
    expect(seg.deep).toBe(1);      // งานเสร็จ ≥5
    expect(seg.active).toBe(1);    // งานเสร็จ 1
    expect(seg.shallow).toBe(1);   // ไม่มีงาน/เอเจนต์
    expect(seg.inactive).toBe(1);  // null
  });
});
