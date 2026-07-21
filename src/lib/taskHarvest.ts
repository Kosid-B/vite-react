/** เก็บเกี่ยวผลงาน C-Level (task output) → ข้อมูลทรัพยากร/การเงิน
 *  parser แบบ "อนุรักษ์นิยม" (conservative) — ดึงเฉพาะที่ชัดเจน (มี ฿/บาท + คำบ่งชี้)
 *  เพื่อลด noise · ผลลัพธ์เป็นข้อเสนอ (คำขอ pending / รายการที่เพิ่มได้) ไม่ commit เงียบ */

import type { AppData, FinanceEntry } from '../types';
import type { ResourceRequest } from './resources';

export interface HarvestedFinance {
  label: string;
  amount: number;
  kind: 'revenue' | 'expense';
}
export interface HarvestedResource {
  resourceName: string;
  amount: number;
  reason: string;
}
export interface HarvestResult {
  finance: HarvestedFinance[];
  resources: HarvestedResource[];
}

const EXPENSE_KW = ['รายจ่าย', 'ต้นทุน', 'ค่าใช้จ่าย', 'ค่าจ้าง', 'จ่าย', 'งบ', 'ลงทุน', 'ค่า'];
const REVENUE_KW = ['รายได้', 'รายรับ', 'ยอดขาย', 'กำไร', 'รับเงิน', 'ขายได้'];
const RES_VERBS = ['เพิ่ม', 'จัดหา', 'ต้องการเพิ่ม', 'ขอเพิ่ม', 'ควรเพิ่ม', 'จัดซื้อ'];
const RES_UNITS = ['คน', 'เครื่อง', 'ชุด', 'license', 'ไลเซนส์', 'ระบบ', 'ตัว', 'ชิ้น'];

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** ดึงข้อมูลจากผลงาน — คืน { finance, resources } (อาจว่างถ้าไม่พบที่ชัดเจน) */
export function harvestFromOutput(output: string): HarvestResult {
  const finance: HarvestedFinance[] = [];
  const resources: HarvestedResource[] = [];
  if (!output || typeof output !== 'string') return { finance, resources };

  // ── การเงิน: จำนวนเงินที่มี ฿ หรือ "บาท" + คำบ่งชี้รายรับ/รายจ่ายที่ "ใกล้ที่สุด" ──
  const moneyRe = /(?:฿\s?([\d][\d,]*)|([\d][\d,]*)\s*บาท)/g;
  const seenAmt = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = moneyRe.exec(output)) !== null) {
    const amount = Number((m[1] ?? m[2] ?? '').replace(/,/g, ''));
    if (!(amount > 0) || seenAmt.has(amount)) continue;
    // ป้ายกำกับมักอยู่ก่อนตัวเลข → ฝั่งซ้ายชนะเมื่อระยะเท่ากัน
    const left = output.slice(Math.max(0, m.index - 32), m.index);
    const right = output.slice(m.index + m[0].length, m.index + m[0].length + 32);
    const nearest = (kws: string[]) => {
      let best = Infinity;
      for (const k of kws) {
        const li = left.lastIndexOf(k);
        if (li >= 0) best = Math.min(best, left.length - li);
        const ri = right.indexOf(k);
        if (ri >= 0) best = Math.min(best, ri + 1);
      }
      return best;
    };
    const eDist = nearest(EXPENSE_KW);
    const rDist = nearest(REVENUE_KW);
    if (eDist === Infinity && rDist === Infinity) continue; // ไม่มีคำบ่งชี้ → ข้าม
    seenAmt.add(amount);
    const kind: 'revenue' | 'expense' = rDist < eDist ? 'revenue' : 'expense';
    const label = clean(left + m[0]).slice(-56);
    finance.push({ label: label || 'รายการจากผลงาน AI', amount, kind });
  }

  // ── ทรัพยากร: "เพิ่ม/จัดหา <ชื่อ> [จำนวน] <ตัวเลข> <หน่วย>" ──
  const unitAlt = RES_UNITS.join('|');
  const verbAlt = RES_VERBS.join('|');
  const resRe = new RegExp(`(?:${verbAlt})\\s*([\\u0E00-\\u0E7Fa-zA-Z][\\u0E00-\\u0E7Fa-zA-Z\\s/]{1,24}?)\\s*(?:จำนวน\\s*)?(\\d+)\\s*(${unitAlt})`, 'g');
  const seenRes = new Set<string>();
  while ((m = resRe.exec(output)) !== null) {
    const name = clean(m[1]);
    const amount = Number(m[2]);
    const unit = m[3];
    if (!name || !(amount > 0)) continue;
    const key = name.toLowerCase() + '|' + unit;
    if (seenRes.has(key)) continue;
    seenRes.add(key);
    resources.push({ resourceName: `${name} (${unit})`, amount, reason: 'จากผลงาน AI: เสนอจัดหาเพิ่ม' });
  }

  return { finance, resources };
}

let hseq = 0;
/** เก็บผลงาน → เติมข้อมูลจริง (pure): สร้างคำขอทรัพยากร (new, pending → ผ่านอนุมัติ → finance auto)
 *  + รายการการเงินที่พบ (expense/revenue) ลง d.finance · คืน AppData ใหม่ + จำนวนที่เพิ่ม */
export function applyHarvestToData(
  data: AppData, output: string, agentId: string | undefined, today: string,
): { data: AppData; added: { finance: number; resources: number } } {
  const h = harvestFromOutput(output);
  if (!h.finance.length && !h.resources.length) return { data, added: { finance: 0, resources: 0 } };

  const reqs: ResourceRequest[] = h.resources.map((r) => ({
    id: 'rq-h-' + today + '-' + (hseq++), type: 'new', resourceName: r.resourceName,
    category: 'tools', amount: r.amount, agentId, reason: r.reason, status: 'pending', at: today,
  }));
  const fins: FinanceEntry[] = h.finance.map((f) => ({
    id: 'fin-h-' + today + '-' + (hseq++), label: '🤖 ' + f.label, amount: f.amount, kind: f.kind, date: today,
  }));

  const resources = data.resources ?? { items: [], requests: [] };
  const next: AppData = {
    ...data,
    resources: reqs.length ? { ...resources, requests: [...reqs, ...resources.requests] } : resources,
    finance: fins.length ? [...fins, ...(data.finance ?? [])] : (data.finance ?? []),
  };
  return { data: next, added: { finance: fins.length, resources: reqs.length } };
}
