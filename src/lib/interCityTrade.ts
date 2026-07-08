import type { AppData, FinanceEntry } from '../types';

/* ===== การค้าระหว่างเมืองธุรกิจ (Inter-City Trade) =====
 * CEO จับคู่โอกาสค้าขายระหว่าง "เมืองของเรา" กับพาร์ตเนอร์ในระบบ, CMO ให้คะแนน/แนะนำ
 * บอร์ด (ผู้ใช้) ดูรายงาน + กดปิดการค้า → บันทึกเป็นดีล + ลงบัญชีการเงิน (ขับเศรษฐกิจเมือง)
 * การรับ/จ่ายเงินจริง gate ด้วย PAYMENT.xenditLive (เปิดอัตโนมัติเมื่อ Xendit ผ่าน KYC) */

export interface TradeOpportunity {
  id: string;
  partnerId: string;
  partner: string;
  location: string;
  category: string;
  direction: 'sell' | 'buy';   // sell = เราขายให้ (รายได้) · buy = เราซื้อ/จ้าง (รายจ่าย)
  item: string;
  estValue: number;
  score: number;               // ความเข้ากัน 0–99 (CMO ให้คะแนน)
}

// หมวดที่มักเป็น "บริการที่เราจ้าง" → ทิศ buy
const BUY_HINTS = ['บริการ', 'ที่ปรึกษา', 'การตลาด', 'บัญชี', 'กฎหมาย', 'ขนส่ง', 'โลจิสติกส์', 'ไอที', 'ดีไซน์', 'ออกแบบ', 'โฆษณา'];
function directionFor(category: string): 'sell' | 'buy' {
  const c = category ?? '';
  return BUY_HINTS.some(h => c.includes(h)) ? 'buy' : 'sell';
}
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** CEO+CMO สร้างโอกาสค้าขายระหว่างเมือง (rule-based, ไม่เปลือง AI call)
 *  ทนต่อข้อมูลพาร์ตเนอร์ที่ field ขาด/ผิดชนิด (data จาก localStorage/Supabase อาจไม่ครบ) — ไม่ให้หน้าเพจล่ม */
export function tradeOpportunities(d: AppData): TradeOpportunity[] {
  const partners = d.marketplace?.partners ?? [];
  const closedPartnerIds = new Set((d.marketplace?.deals ?? [])
    .filter(x => x.status === 'closed').map(x => x.partnerId));
  const avg = num(d.roi?.avgDealValue);
  const myProduct = d.aiCompany?.productDesc?.trim() || d.aiCompany?.industry?.trim() || 'สินค้า/บริการของเรา';

  return partners
    .filter(p => p && !closedPartnerIds.has(p.id))
    .map(p => {
      const category = p.category ?? '';
      const rating = num(p.rating);
      const priceFrom = num(p.priceFrom);
      const name = p.name ?? 'พาร์ตเนอร์';
      const direction = directionFor(category);
      const estValue = Math.max(priceFrom, Math.round((avg || priceFrom || 3000) * (0.6 + rating / 10)));
      const score = Math.min(99, Math.round(55 + rating * 8 + (p.verified ? 8 : 0)));
      const item = direction === 'sell' ? myProduct : `${category || 'บริการ'} จาก ${name}`;
      return { id: `op_${p.id ?? name}`, partnerId: p.id, partner: name, location: p.location ?? '', category, direction, item, estValue, score };
    })
    .sort((a, b) => b.score - a.score);
}

export interface TradeReport {
  opportunities: TradeOpportunity[];
  count: number;
  gmv: number;          // มูลค่ารวมประเมิน (โอกาสที่ยังเปิด)
  feePct: number;
  fee: number;
  net: number;
  closedCount: number;
  closedGmv: number;
}

export function tradeReport(d: AppData): TradeReport {
  const opportunities = tradeOpportunities(d);
  const gmv = opportunities.reduce((s, o) => s + o.estValue, 0);
  const feePct = d.marketplace?.feePct ?? 3;
  const fee = Math.round((gmv * feePct) / 100);
  const closed = (d.marketplace?.deals ?? []).filter(x => x.status === 'closed');
  return {
    opportunities, count: opportunities.length,
    gmv, feePct, fee, net: gmv - fee,
    closedCount: closed.length,
    closedGmv: closed.reduce((s, x) => s + x.amount, 0),
  };
}

/** ปิดการค้า → เพิ่ม Deal (closed) + ลงบัญชีการเงิน (รายได้สุทธิถ้าขาย / รายจ่ายถ้าซื้อ) */
export function closeTrade(d: AppData, op: TradeOpportunity): AppData {
  const feePct = d.marketplace?.feePct ?? 3;
  const fee = Math.round((op.estValue * feePct) / 100);
  const mk = d.marketplace ?? { feePct: 3, partners: [], deals: [] };
  const deal = {
    id: `d_${Date.now().toString(36)}`,
    partnerId: op.partnerId,
    title: `${op.direction === 'sell' ? 'ขายให้' : 'ซื้อจาก'} ${op.partner} — ${op.item}`,
    amount: op.estValue,
    status: 'closed' as const,
  };
  const entry: FinanceEntry = op.direction === 'sell'
    ? { id: `f_trade_${deal.id}`, label: `การค้าระหว่างเมือง: ขายให้ ${op.partner} (หักค่าธรรมเนียม ${feePct}%)`, amount: op.estValue - fee, kind: 'revenue', date: new Date().toISOString().slice(0, 10) }
    : { id: `f_trade_${deal.id}`, label: `การค้าระหว่างเมือง: ซื้อจาก ${op.partner}`, amount: op.estValue, kind: 'expense', date: new Date().toISOString().slice(0, 10) };

  return {
    ...d,
    marketplace: { ...mk, deals: [...mk.deals, deal] },
    finance: [...(d.finance ?? []), entry],
  };
}
