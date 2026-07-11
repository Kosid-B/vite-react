/** บริหารทรัพยากรธุรกิจ (Resource Management)
 *  รายการ + จำนวนทรัพยากรที่ธุรกิจต้องใช้ · C-Level (ตามที่ CEO มอบบทบาท) ดูแล + ขอเพิ่ม/ลด
 *  · CEO/บอร์ดอนุมัติคำขอ · AI ช่วยจัดสรรให้มีประสิทธิภาพ
 *  เก็บใน AppData.resources (localStorage + workspace_state) — ไม่มี migration */

export type ResourceCategory = 'people' | 'capital' | 'tools' | 'data' | 'marketing' | 'material' | 'infra';

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  unit: string;            // หน่วย (คน / บาท / license / ชิ้น …)
  quantity: number;        // จำนวนที่มี/ใช้อยู่
  unitCost?: number;       // ต้นทุนต่อหน่วย (บาท/เดือน) — ไว้คำนวณงบ
  ownerAgentId?: string;   // C-Level ที่ดูแล (อ้าง aiCompany.agents)
  note?: string;
  createdAt: string;
}

export interface ResourceRequest {
  id: string;
  type: 'add' | 'reduce' | 'new';   // เพิ่มจำนวน / ลดจำนวน / ขอทรัพยากรใหม่
  resourceId?: string;               // สำหรับ add/reduce
  resourceName?: string;             // สำหรับ new
  category?: ResourceCategory;       // สำหรับ new
  unit?: string;                     // สำหรับ new
  unitCost?: number;
  amount: number;                    // จำนวนที่ขอเพิ่ม/ลด (หรือจำนวนเริ่มต้นของ new)
  agentId?: string;                  // C-Level ผู้ขอ
  reason: string;
  impact?: string;                   // ผลกระทบ (เช่น งบ +฿X/เดือน)
  status: 'pending' | 'approved' | 'rejected';
  at: string;
}

export interface ResourcesState {
  items: Resource[];
  requests: ResourceRequest[];
}

export function defaultResources(): ResourcesState {
  return { items: [], requests: [] };
}

export const RESOURCE_CATEGORIES: Record<ResourceCategory, { label: string; icon: string; color: string; defaultOwner: string }> = {
  people:    { label: 'คน / ทีม',            icon: '👥', color: '#0e7490', defaultOwner: 'HRD' },
  capital:   { label: 'เงินทุน',             icon: '💰', color: '#a05c1a', defaultOwner: 'CFO' },
  tools:     { label: 'เครื่องมือ / ซอฟต์แวร์', icon: '🛠️', color: '#6b3fa0', defaultOwner: 'CTO' },
  data:      { label: 'ข้อมูล / ลูกค้า',      icon: '📊', color: '#1a4f8a', defaultOwner: 'CMO' },
  marketing: { label: 'งบการตลาด',           icon: '📣', color: '#2d6a4f', defaultOwner: 'CMO' },
  material:  { label: 'วัตถุดิบ / สต๊อก',     icon: '📦', color: '#c44b2b', defaultOwner: 'COO' },
  infra:     { label: 'โครงสร้างพื้นฐาน',     icon: '🏗️', color: '#374151', defaultOwner: 'COO' },
};

/** ทรัพยากรตั้งต้นที่ธุรกิจส่วนใหญ่ต้องใช้ (seed ให้ผู้ใช้เริ่มเร็ว) */
export const RESOURCE_TEMPLATES: Omit<Resource, 'id' | 'createdAt' | 'ownerAgentId'>[] = [
  { name: 'ทีมงาน / พนักงาน',        category: 'people',    unit: 'คน',      quantity: 1, unitCost: 15000 },
  { name: 'เงินทุนหมุนเวียน',        category: 'capital',   unit: 'บาท',     quantity: 50000 },
  { name: 'ซอฟต์แวร์ / เครื่องมือ',  category: 'tools',     unit: 'license', quantity: 1, unitCost: 500 },
  { name: 'ฐานลูกค้า / Lead',        category: 'data',      unit: 'ราย',     quantity: 0 },
  { name: 'งบโฆษณา / การตลาด',       category: 'marketing', unit: 'บาท/เดือน', quantity: 3000 },
  { name: 'สินค้าคงคลัง',            category: 'material',  unit: 'ชิ้น',    quantity: 0, unitCost: 100 },
  { name: 'เซิร์ฟเวอร์ / ระบบ',      category: 'infra',     unit: 'ระบบ',    quantity: 1, unitCost: 300 },
];

let seq = 0;
export function newResourceId(): string {
  return 'res-' + Date.now().toString(36) + '-' + (seq++);
}
export function newRequestId(): string {
  return 'rq-' + Date.now().toString(36) + '-' + (seq++);
}

export interface ResourceSummary {
  count: number;
  totalMonthlyCost: number;   // รวมต้นทุน (quantity × unitCost) เฉพาะที่มี unitCost
  pendingRequests: number;
  byCategory: { category: ResourceCategory; count: number; cost: number }[];
  unowned: number;            // ทรัพยากรที่ยังไม่มี C-Level ดูแล
}

export function resourceSummary(state: ResourcesState): ResourceSummary {
  const items = state.items ?? [];
  const cost = (r: Resource) => (r.unitCost ? r.unitCost * r.quantity : 0);
  const cats = (Object.keys(RESOURCE_CATEGORIES) as ResourceCategory[]).map((category) => {
    const inCat = items.filter((r) => r.category === category);
    return { category, count: inCat.length, cost: inCat.reduce((s, r) => s + cost(r), 0) };
  }).filter((c) => c.count > 0);
  return {
    count: items.length,
    totalMonthlyCost: items.reduce((s, r) => s + cost(r), 0),
    pendingRequests: (state.requests ?? []).filter((q) => q.status === 'pending').length,
    byCategory: cats,
    unowned: items.filter((r) => !r.ownerAgentId).length,
  };
}

/** อนุมัติคำขอ → ปรับ items จริง (pure): add=+amount, reduce=-amount (คลัมป์ 0), new=append */
export function applyApproval(state: ResourcesState, requestId: string): ResourcesState {
  const req = (state.requests ?? []).find((q) => q.id === requestId);
  if (!req || req.status !== 'pending') return state;

  let items = [...state.items];
  if (req.type === 'add' && req.resourceId) {
    items = items.map((r) => r.id === req.resourceId ? { ...r, quantity: r.quantity + req.amount } : r);
  } else if (req.type === 'reduce' && req.resourceId) {
    items = items.map((r) => r.id === req.resourceId ? { ...r, quantity: Math.max(0, r.quantity - req.amount) } : r);
  } else if (req.type === 'new') {
    items = [{
      id: newResourceId(),
      name: req.resourceName ?? 'ทรัพยากรใหม่',
      category: req.category ?? 'tools',
      unit: req.unit ?? 'หน่วย',
      quantity: req.amount,
      unitCost: req.unitCost,
      ownerAgentId: req.agentId,
      createdAt: new Date().toISOString(),
    }, ...items];
  }
  const requests = state.requests.map((q) => q.id === requestId ? { ...q, status: 'approved' as const } : q);
  return { items, requests };
}

export function rejectRequest(state: ResourcesState, requestId: string): ResourcesState {
  return {
    ...state,
    requests: state.requests.map((q) => q.id === requestId && q.status === 'pending' ? { ...q, status: 'rejected' as const } : q),
  };
}

/** ข้อเสนอจัดสรรทรัพยากร (heuristic ใช้เมื่อไม่มี AI) — ตอบ "จัดให้มีประสิทธิภาพ"
 *  - ทรัพยากรจำนวน 0 (data/material/people) → เสนอเพิ่ม
 *  - ต้นทุนสูงสุดในหมวด → เสนอทบทวน (reduce)  */
export function suggestReallocation(state: ResourcesState): { resourceId: string; type: 'add' | 'reduce'; amount: number; reason: string }[] {
  const items = state.items ?? [];
  const out: { resourceId: string; type: 'add' | 'reduce'; amount: number; reason: string }[] = [];
  for (const r of items) {
    if (r.quantity === 0 && (r.category === 'data' || r.category === 'people' || r.category === 'material')) {
      out.push({ resourceId: r.id, type: 'add', amount: r.category === 'people' ? 1 : 10, reason: `"${r.name}" มีจำนวน 0 — ธุรกิจขาดทรัพยากรนี้ ควรเพิ่มเพื่อเดินงานได้` });
    }
  }
  // ต้นทุนรวมสูงสุด → เสนอทบทวนประสิทธิภาพ
  const withCost = items.filter((r) => r.unitCost && r.quantity > 0).sort((a, b) => (b.unitCost! * b.quantity) - (a.unitCost! * a.quantity));
  if (withCost[0]) {
    out.push({ resourceId: withCost[0].id, type: 'reduce', amount: Math.max(1, Math.round(withCost[0].quantity * 0.1)), reason: `"${withCost[0].name}" เป็นต้นทุนก้อนใหญ่สุด — ทบทวนว่าใช้เต็มประสิทธิภาพหรือลดได้` });
  }
  return out;
}
