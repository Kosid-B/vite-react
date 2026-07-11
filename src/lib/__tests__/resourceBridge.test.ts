import { describe, it, expect } from 'vitest';
import {
  requestCost, isBigRequest, bigPendingRequests, financeEntryForApproval,
  approveResourceRequest, rejectResourceRequest, BIG_REQUEST_THRESHOLD, RESOURCE_BOARD_XP,
} from '../resourceBridge';
import { skillLevels } from '../boardRoom';
import type { ResourcesState, ResourceRequest, Resource } from '../resources';
import type { AppData } from '../../types';

const res = (over: Partial<Resource> = {}): Resource => ({
  id: 'r1', name: 'เซิร์ฟเวอร์', category: 'infra', unit: 'เครื่อง', quantity: 1, unitCost: 6000, createdAt: 'x', ...over,
});
const req = (over: Partial<ResourceRequest> = {}): ResourceRequest => ({
  id: 'q1', type: 'add', resourceId: 'r1', amount: 2, reason: 'ขยาย', status: 'pending', at: 'x', agentId: 'cto', ...over,
});
const mkData = (state: ResourcesState, over: Partial<AppData> = {}): AppData =>
  ({ resources: state, finance: [], boardRoom: { decisions: [] }, ...over }) as AppData;

describe('requestCost / isBigRequest', () => {
  it('คิดต้นทุน = unitCost × amount', () => {
    const state: ResourcesState = { items: [res({ unitCost: 6000 })], requests: [] };
    expect(requestCost(state, req({ amount: 2 }))).toBe(12000);
  });
  it('≥ เกณฑ์ = ก้อนใหญ่ · reduce ไม่นับ', () => {
    const state: ResourcesState = { items: [res({ unitCost: 6000 })], requests: [] };
    expect(isBigRequest(state, req({ amount: 2 }))).toBe(true);           // 12000 ≥ 10000
    expect(isBigRequest(state, req({ amount: 1 }))).toBe(false);          // 6000 < 10000
    expect(isBigRequest(state, req({ amount: 5, type: 'reduce' }))).toBe(false);
    expect(BIG_REQUEST_THRESHOLD).toBe(10000);
  });
  it('bigPendingRequests คืนเฉพาะ pending + big', () => {
    const state: ResourcesState = {
      items: [res({ unitCost: 6000 })],
      requests: [req({ id: 'big', amount: 2 }), req({ id: 'small', amount: 1 }), req({ id: 'done', amount: 3, status: 'approved' })],
    };
    const big = bigPendingRequests(state);
    expect(big.map((q) => q.id)).toEqual(['big']);
  });
});

describe('financeEntryForApproval — ทรัพยากรอนุมัติ → รายจ่าย', () => {
  it('add ที่มีต้นทุน → expense recurring', () => {
    const state: ResourcesState = { items: [res({ unitCost: 6000 })], requests: [] };
    const e = financeEntryForApproval(state, req({ amount: 2 }), '2026-07-11')!;
    expect(e.kind).toBe('expense');
    expect(e.amount).toBe(12000);
    expect(e.recurring).toBe(true);
    expect(e.date).toBe('2026-07-11');
  });
  it('reduce หรือไม่มีต้นทุน → null', () => {
    const state: ResourcesState = { items: [res({ unitCost: undefined })], requests: [] };
    expect(financeEntryForApproval(state, req(), '2026-07-11')).toBeNull();
    const s2: ResourcesState = { items: [res({ unitCost: 6000 })], requests: [] };
    expect(financeEntryForApproval(s2, req({ type: 'reduce' }), '2026-07-11')).toBeNull();
  });
});

describe('approveResourceRequest — รวม 3 ระบบ', () => {
  it('อนุมัติปกติ → ปรับจำนวน + ไหลเข้า finance (ไม่มี board XP)', () => {
    const data = mkData({ items: [res({ quantity: 1, unitCost: 6000 })], requests: [req({ amount: 2 })] });
    const next = approveResourceRequest(data, 'q1', { viaBoard: false, today: '2026-07-11' });
    expect(next.resources!.items[0].quantity).toBe(3);              // 1 + 2
    expect(next.finance!.length).toBe(1);                          // รายจ่ายอัตโนมัติ
    expect(next.finance![0].amount).toBe(12000);
    expect(next.boardRoom!.decisions.length).toBe(0);             // ไม่ผ่านบอร์ด = ไม่มี decision
  });
  it('อนุมัติผ่านบอร์ด → finance + board decision + business XP', () => {
    const data = mkData({ items: [res({ quantity: 1, unitCost: 6000 })], requests: [req({ amount: 2 })] });
    const next = approveResourceRequest(data, 'q1', { viaBoard: true, today: '2026-07-11' });
    expect(next.finance!.length).toBe(1);
    const dec = next.boardRoom!.decisions;
    expect(dec.length).toBe(1);
    expect(dec[0].status).toBe('approved');
    expect(dec[0].track).toBe('business');
    // XP สะสมเข้า skillLevels (dynamic — นอก AGENDA)
    expect(skillLevels(dec).business.xp).toBe(RESOURCE_BOARD_XP);
  });
  it('คำขอที่ไม่ pending → ไม่เปลี่ยนอะไร', () => {
    const data = mkData({ items: [res()], requests: [req({ status: 'approved' })] });
    expect(approveResourceRequest(data, 'q1', { viaBoard: true, today: 'x' })).toBe(data);
  });
});

describe('rejectResourceRequest', () => {
  it('mark rejected', () => {
    const data = mkData({ items: [res()], requests: [req()] });
    expect(rejectResourceRequest(data, 'q1').resources!.requests[0].status).toBe('rejected');
  });
});
