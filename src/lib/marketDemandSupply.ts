// marketDemandSupply.ts — Demand/Supply board (first-party จริง จากระบบเราเอง)
// demand = RFQ ที่ธุรกิจโพสต์หา (rfqs) · supply = หน้าร้านที่เปิดขาย (storefronts)
// จับกลุ่มตาม offerKind → โชว์ "หมวดนี้มีคนหา X · มีร้าน Y" บน Landing (แก้ pain รอ walk-in)
// จริยธรรม: ข้อมูลจริงในระบบเท่านั้น ไม่ปั้น · ตอนเริ่มน้อยก็โชว์ตรง ๆ
// pure + tested · reuse offerKind จาก b2bMatching (source of truth เดียว)
import { offerKind, kindLabel, type OfferKind } from './b2bMatching';

export type Opportunity = 'high' | 'balanced' | 'saturated';

export interface KindStat {
  kind: OfferKind;
  label: string;
  demand: number;     // จำนวน RFQ ในหมวดนี้
  supply: number;     // จำนวนหน้าร้านในหมวดนี้
  gap: number;        // demand - supply
  opportunity: Opportunity;
}

function opportunityOf(demand: number, supply: number): Opportunity {
  if (demand > supply) return 'high';               // คนห่ามากกว่าคนขาย = โอกาส
  if (supply > demand * 1.5 + 1) return 'saturated'; // คนขายเยอะกว่าดีมานด์มาก
  return 'balanced';
}

export const OPPORTUNITY_LABEL: Record<Opportunity, string> = {
  high: 'โอกาส — ดีมานด์มากกว่าร้าน',
  balanced: 'สมดุล',
  saturated: 'ร้านเยอะแล้ว — ต้องมีจุดต่าง',
};

/** รวม demand (หมวดจาก RFQ) + supply (หมวดจากร้าน) → สถิติต่อ kind เรียงตามดีมานด์ */
export function aggregate(demandCats: string[], supplyCats: string[]): KindStat[] {
  const d = new Map<OfferKind, number>();
  const s = new Map<OfferKind, number>();
  for (const c of demandCats) { const k = offerKind(c); d.set(k, (d.get(k) ?? 0) + 1); }
  for (const c of supplyCats) { const k = offerKind(c); s.set(k, (s.get(k) ?? 0) + 1); }
  const kinds = new Set<OfferKind>([...d.keys(), ...s.keys()]);
  return [...kinds]
    .map((kind): KindStat => {
      const demand = d.get(kind) ?? 0, supply = s.get(kind) ?? 0;
      return { kind, label: kindLabel(kind), demand, supply, gap: demand - supply, opportunity: opportunityOf(demand, supply) };
    })
    .sort((a, b) => b.demand - a.demand || b.gap - a.gap);
}

/** สร้าง KindStat จากตัวเลขนับ (ใช้ตอนอ่าน snapshot ที่เก็บ demand/supply ไว้แล้ว) */
export function kindStatFromCounts(kind: OfferKind, label: string, demand: number, supply: number): KindStat {
  return { kind, label: label || kindLabel(kind), demand, supply, gap: demand - supply, opportunity: opportunityOf(demand, supply) };
}

/** จากข้อความธุรกิจที่ผู้ใช้พิมพ์ → หา stat ของ kind นั้น (คืน null ถ้าไม่มีในสถิติ) */
export function statForText(text: string, stats: KindStat[]): KindStat | null {
  const k = offerKind(text);
  return stats.find(x => x.kind === k) ?? null;
}

// ── ROI ง่าย ๆ: ให้ร้านเห็น upside ถ้ารับดีมานด์เพิ่มจากระบบ (แสดงสมมติฐาน ไม่การันตี) ──
export interface RoiInput {
  walkinPerDay: number;   // ลูกค้าเดินเข้าต่อวันตอนนี้
  avgTicket: number;      // ยอดเฉลี่ยต่อบิล (บาท)
  extraOrdersPerMonth: number; // ออร์เดอร์เพิ่มที่คาดว่าจะรับจากดีมานด์ในระบบ/เดือน
}
export interface RoiResult {
  currentMonthly: number;
  extraMonthly: number;
  totalMonthly: number;
  upsidePct: number;      // % ที่เพิ่มจากปัจจุบัน
  note: string;
}
const n0 = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function roiEstimate(inp: RoiInput): RoiResult {
  const walk = n0(inp.walkinPerDay), ticket = n0(inp.avgTicket), extra = n0(inp.extraOrdersPerMonth);
  const currentMonthly = Math.round(walk * ticket * 30);
  const extraMonthly = Math.round(extra * ticket);
  const totalMonthly = currentMonthly + extraMonthly;
  const upsidePct = currentMonthly > 0 ? Math.round((extraMonthly / currentMonthly) * 100) : 0;
  return {
    currentMonthly, extraMonthly, totalMonthly, upsidePct,
    note: 'ประเมินจากตัวเลขที่คุณกรอก × ดีมานด์ในระบบ — เป็นการคาดการณ์เพื่อการตัดสินใจ ไม่ใช่การรับประกันรายได้',
  };
}
