import { describe, it, expect } from 'vitest';
import {
  RESOURCE_CATEGORIES, RESOURCE_TEMPLATES, resourceSummary, applyApproval,
  rejectRequest, suggestReallocation, defaultResources, parseAiAllocations,
  type ResourcesState, type Resource, type ResourceRequest,
} from '../resources';

const res = (over: Partial<Resource> = {}): Resource => ({
  id: 'r1', name: 'ทีมงาน', category: 'people', unit: 'คน', quantity: 2, unitCost: 15000,
  createdAt: '2026-07-11', ...over,
});
const req = (over: Partial<ResourceRequest> = {}): ResourceRequest => ({
  id: 'q1', type: 'add', resourceId: 'r1', amount: 1, reason: 'ขยายทีม', status: 'pending', at: '2026-07-11', ...over,
});

describe('templates + categories', () => {
  it('มี 7 หมวด + template ครอบทุกหมวด', () => {
    expect(Object.keys(RESOURCE_CATEGORIES).length).toBe(7);
    const cats = new Set(RESOURCE_TEMPLATES.map((t) => t.category));
    expect(cats.size).toBe(7);
  });
});

describe('resourceSummary', () => {
  it('นับจำนวน + รวมต้นทุนเดือน (qty×unitCost) + pending + unowned', () => {
    const state: ResourcesState = {
      items: [res({ id: 'r1', quantity: 2, unitCost: 15000 }), res({ id: 'r2', category: 'data', unit: 'ราย', quantity: 0, unitCost: undefined, ownerAgentId: undefined })],
      requests: [req({ status: 'pending' }), req({ id: 'q2', status: 'approved' })],
    };
    const s = resourceSummary(state);
    expect(s.count).toBe(2);
    expect(s.totalMonthlyCost).toBe(30000); // 2×15000 (r2 ไม่มี unitCost)
    expect(s.pendingRequests).toBe(1);
    expect(s.unowned).toBe(2); // ทั้งคู่ไม่มี owner
    expect(s.byCategory.find((c) => c.category === 'people')?.cost).toBe(30000);
  });
});

describe('applyApproval — อนุมัติ → ปรับจำนวนจริง', () => {
  it('add → เพิ่มจำนวน + mark approved', () => {
    const state: ResourcesState = { items: [res({ quantity: 2 })], requests: [req({ type: 'add', amount: 3 })] };
    const next = applyApproval(state, 'q1');
    expect(next.items[0].quantity).toBe(5);
    expect(next.requests[0].status).toBe('approved');
  });
  it('reduce → ลดจำนวน (คลัมป์ไม่ต่ำกว่า 0)', () => {
    const state: ResourcesState = { items: [res({ quantity: 2 })], requests: [req({ type: 'reduce', amount: 5 })] };
    expect(applyApproval(state, 'q1').items[0].quantity).toBe(0);
  });
  it('new → เพิ่มทรัพยากรใหม่เข้า items', () => {
    const state: ResourcesState = {
      items: [],
      requests: [req({ id: 'qn', type: 'new', resourceId: undefined, resourceName: 'GPU Server', category: 'infra', unit: 'เครื่อง', amount: 2 })],
    };
    const next = applyApproval(state, 'qn');
    expect(next.items.length).toBe(1);
    expect(next.items[0].name).toBe('GPU Server');
    expect(next.items[0].quantity).toBe(2);
  });
  it('คำขอที่ไม่ pending → ไม่เปลี่ยนอะไร', () => {
    const state: ResourcesState = { items: [res()], requests: [req({ status: 'approved' })] };
    expect(applyApproval(state, 'q1')).toBe(state);
  });
});

describe('rejectRequest', () => {
  it('mark rejected เฉพาะ pending', () => {
    const state: ResourcesState = { items: [], requests: [req()] };
    expect(rejectRequest(state, 'q1').requests[0].status).toBe('rejected');
  });
});

describe('suggestReallocation — จัดสรรอัตโนมัติ', () => {
  it('ทรัพยากร data จำนวน 0 → เสนอเพิ่ม · ต้นทุนสูงสุด → เสนอทบทวน', () => {
    const state: ResourcesState = {
      items: [
        res({ id: 'd', name: 'Lead', category: 'data', unit: 'ราย', quantity: 0, unitCost: undefined }),
        res({ id: 'big', name: 'ทีม', category: 'people', quantity: 5, unitCost: 20000 }),
      ],
      requests: [],
    };
    const sugg = suggestReallocation(state);
    expect(sugg.find((x) => x.resourceId === 'd' && x.type === 'add')).toBeTruthy();
    expect(sugg.find((x) => x.resourceId === 'big' && x.type === 'reduce')).toBeTruthy();
  });
  it('defaultResources ว่าง', () => {
    expect(defaultResources()).toEqual({ items: [], requests: [] });
  });
});

describe('parseAiAllocations — แปลงผล agent-run เป็นคำขอ', () => {
  const items: Resource[] = [
    res({ id: 'srv', name: 'เซิร์ฟเวอร์', category: 'infra' }),
    res({ id: 'lead', name: 'ฐานลูกค้า', category: 'data' }),
  ];
  it('parse JSON (มี code fence) → add จับคู่ resourceId, new ตั้ง resourceName', () => {
    const raw = '```json\n[{"resource":"เซิร์ฟเวอร์","action":"add","amount":2,"reason":"โหลดสูง"},' +
      '{"resource":"GPU","action":"new","amount":1,"category":"infra","reason":"เทรน AI"}]\n```';
    const out = parseAiAllocations(raw, items);
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ type: 'add', resourceId: 'srv', amount: 2 });
    expect(out[1]).toMatchObject({ type: 'new', resourceName: 'GPU', category: 'infra', amount: 1 });
  });
  it('add/reduce ที่จับคู่ทรัพยากรไม่ได้ → ข้าม', () => {
    const out = parseAiAllocations('[{"resource":"ไม่มีของนี้","action":"reduce","amount":3,"reason":"x"}]', items);
    expect(out.length).toBe(0);
  });
  it('amount ≤ 0 หรือ action ไม่รู้จัก → ข้าม', () => {
    const out = parseAiAllocations('[{"resource":"เซิร์ฟเวอร์","action":"add","amount":0},{"resource":"ฐานลูกค้า","action":"buy","amount":5}]', items);
    expect(out.length).toBe(0);
  });
  it('ไม่ใช่ JSON → คืน [] (ให้ fallback heuristic)', () => {
    expect(parseAiAllocations('ขอโทษครับ วิเคราะห์ไม่ได้', items)).toEqual([]);
    expect(parseAiAllocations('', items)).toEqual([]);
  });
});
