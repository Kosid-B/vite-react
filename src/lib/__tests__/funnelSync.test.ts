import { describe, it, expect } from 'vitest';
import { parseFunnelNumbers, applyFunnelNumbers, isSeedFunnel } from '../funnelSync';
import type { FunnelStage } from '../../types';

describe('parseFunnelNumbers', () => {
  it('ดึงเลขจากบรรทัด/คอมมา', () => {
    expect(parseFunnelNumbers('10000\n2500\n750')).toEqual([10000, 2500, 750]);
    expect(parseFunnelNumbers('10000, 2500, 750')).toEqual([10000, 2500, 750]);
  });
  it('รองรับเลขหลักพันมี comma (paste จาก GA4)', () => {
    expect(parseFunnelNumbers('10,000\t2,500\t750')).toEqual([10000, 2500, 750]);
  });
  it('ข้ามข้อความปน + ว่าง → []', () => {
    expect(parseFunnelNumbers('Step 1: 10,000 users · Step 2: 2,500 users')).toEqual([1, 10000, 2, 2500]);
    expect(parseFunnelNumbers('')).toEqual([]);
    expect(parseFunnelNumbers(undefined as unknown as string)).toEqual([]);
  });
});

describe('applyFunnelNumbers', () => {
  const funnel: FunnelStage[] = [
    { stageId: 's1', leads: 1, note: 'a' },
    { stageId: 's2', leads: 1, note: 'b' },
    { stageId: 's3', leads: 1, note: 'c' },
  ];
  it('วางเลขทับ leads เท่าที่มี (step เกินคงเดิม)', () => {
    const r = applyFunnelNumbers(funnel, [100, 40]);
    expect(r[0].leads).toBe(100);
    expect(r[1].leads).toBe(40);
    expect(r[2].leads).toBe(1);   // ไม่มีเลข → คงเดิม
    expect(r[0].note).toBe('a');  // note ไม่แตะ
  });
  it('ไม่กลายพันธุ์ของเดิม', () => {
    applyFunnelNumbers(funnel, [9]);
    expect(funnel[0].leads).toBe(1);
  });
});

describe('isSeedFunnel', () => {
  it('undefined/ค่าอื่น = seed · "real" = จริง', () => {
    expect(isSeedFunnel(undefined)).toBe(true);
    expect(isSeedFunnel('seed')).toBe(true);
    expect(isSeedFunnel('real')).toBe(false);
  });
});
