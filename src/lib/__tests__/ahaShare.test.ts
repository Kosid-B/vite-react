import { describe, it, expect } from 'vitest';
import type { AppData } from '../../types';
import { closedDealCount, hasNewDealMilestone } from '../ahaShare';

function mk(statuses: string[]): AppData {
  return { marketplace: { deals: statuses.map((s, i) => ({ id: String(i), status: s })) } } as unknown as AppData;
}

describe('ahaShare — aha-moment trigger', () => {
  it('closedDealCount นับเฉพาะ deal ที่ closed', () => {
    expect(closedDealCount(mk(['closed', 'matched', 'closed', 'cancelled']))).toBe(2);
    expect(closedDealCount(mk([]))).toBe(0);
    expect(closedDealCount({} as AppData)).toBe(0); // ไม่มี marketplace ก็ไม่พัง
  });

  it('hasNewDealMilestone จริงเมื่อมีดีลปิดใหม่มากกว่าที่เคยเห็น', () => {
    expect(hasNewDealMilestone(1, 0)).toBe(true);   // ปิดดีลแรก
    expect(hasNewDealMilestone(3, 2)).toBe(true);   // ปิดดีลใหม่
    expect(hasNewDealMilestone(2, 2)).toBe(false);  // เห็นครบแล้ว → ไม่ nag
    expect(hasNewDealMilestone(1, 5)).toBe(false);  // seen มากกว่า (กันเคสแปลก)
    expect(hasNewDealMilestone(0, 0)).toBe(false);  // ยังไม่มีดีล
  });
});
