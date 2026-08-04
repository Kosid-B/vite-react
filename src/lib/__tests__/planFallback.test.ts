import { describe, it, expect } from 'vitest';
import { localPlan } from '../planFallback';

describe('localPlan', () => {
  const agents = [{ role: 'CEO' }, { role: 'CMO' }, { role: 'CFO' }];

  it('มอบงานให้ทุกบทบาท + มีเรื่องขออนุมัติ', () => {
    const p = localPlan({ goal: 'ยอดขาย ฿1M', industry: 'อีคอมเมิร์ซ', agents });
    expect(p.tasks.length).toBeGreaterThanOrEqual(3);
    expect(p.approvals.length).toBe(1);
    // ทุกงาน queued (พร้อมให้ทีมลงมือ)
    expect(p.tasks.every(t => t.status === 'queued')).toBe(true);
    // แต่ละงานผูกกับ agentRole จริง
    expect(p.tasks.every(t => agents.some(a => a.role === t.agentRole))).toBe(true);
  });

  it('งานแนบบริบทเป้าหมาย/ธุรกิจ', () => {
    const p = localPlan({ goal: 'โต 3 เท่า', industry: 'ร้านกาแฟ', agents: [{ role: 'CMO' }] });
    expect(p.tasks[0].detail).toContain('ร้านกาแฟ');
    expect(p.tasks[0].detail).toContain('โต 3 เท่า');
  });

  it('บทบาทไม่รู้จัก → ได้งาน default', () => {
    const p = localPlan({ agents: [{ role: 'ตำแหน่งแปลก' }] });
    expect(p.tasks.length).toBe(1);
    expect(p.tasks[0].title).toContain('3 งานสำคัญ');
  });

  it('เรื่องขออนุมัติมอบให้ CFO ถ้ามี', () => {
    const p = localPlan({ agents });
    expect(p.approvals[0].agentRole).toBe('CFO');
  });

  it('จำกัดจำนวนงานไม่ให้ล้น (≤ ~8)', () => {
    const many = Array.from({ length: 10 }, () => ({ role: 'CMO' }));
    expect(localPlan({ agents: many }).tasks.length).toBeLessThanOrEqual(9);
  });

  it('ทีมว่าง → ไม่มีงาน แต่ยังมีเรื่องขออนุมัติ default', () => {
    const p = localPlan({ agents: [] });
    expect(p.tasks.length).toBe(0);
    expect(p.approvals[0].agentRole).toBe('CEO');
  });
});
