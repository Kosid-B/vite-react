import { isSupabaseEnabled, supabase } from './supabase';

/** ประมูล Skill จากบริษัท — English Auction (ราคาไต่ขึ้น ผู้ให้ราคาสูงสุดชนะ)
 *  Admin ระบบเปิดประมูล → ทุกบริษัทบิดแข่งกันแบบเห็นราคากันสด →
 *  หมดเวลา Admin ปิดประมูล → ผู้ชนะชำระเงินแล้วรับ skill เข้าบริษัท
 *  Production: ตาราง skill_auctions / skill_bids · Local mode: localStorage */

export type AuctionStatus = 'open' | 'closed' | 'cancelled';

export interface Auction {
  id: string;
  skillId: string;       // id ใน SKILL_CATALOG (หรือ custom id สำหรับ skill.md ใหม่)
  skillName: string;
  skillDesc: string;
  icon: string;
  startPrice: number;    // ราคาเริ่มต้น
  minIncrement: number;  // บิดขั้นต่ำต่อครั้ง
  endsAt: string;        // ISO — เวลาปิดรับบิด
  status: AuctionStatus;
  winnerWs: string | null;
  winningBid: number;
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  wsId: string;
  bidderName: string;    // ชื่อบริษัทผู้บิด (โชว์สาธารณะ)
  amount: number;
  createdAt: string;
}

const LS_AUC = 'ceo_ai_auctions';
const LS_BID = 'ceo_ai_bids';

function lsLoad<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]; } catch { return []; }
}
function lsSave<T>(key: string, list: T[]) { localStorage.setItem(key, JSON.stringify(list)); }

/* ---------- mapping ---------- */
interface AucRow {
  id: string; skill_id: string; skill_name: string; skill_desc: string; icon: string;
  start_price: number; min_increment: number; ends_at: string; status: AuctionStatus;
  winner_ws: string | null; winning_bid: number; created_at: string;
}
interface BidRow {
  id: string; auction_id: string; ws_id: string; bidder_name: string; amount: number; created_at: string;
}
const toAuction = (r: AucRow): Auction => ({
  id: r.id, skillId: r.skill_id, skillName: r.skill_name, skillDesc: r.skill_desc, icon: r.icon,
  startPrice: Number(r.start_price), minIncrement: Number(r.min_increment), endsAt: r.ends_at,
  status: r.status, winnerWs: r.winner_ws, winningBid: Number(r.winning_bid), createdAt: r.created_at,
});
const toBid = (r: BidRow): Bid => ({
  id: r.id, auctionId: r.auction_id, wsId: r.ws_id, bidderName: r.bidder_name,
  amount: Number(r.amount), createdAt: r.created_at,
});

/* ---------- อ่าน ---------- */

export async function listAuctions(): Promise<Auction[]> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('skill_auctions').select('*')
      .order('created_at', { ascending: false }).limit(50);
    return (data as AucRow[] ?? []).map(toAuction);
  }
  return lsLoad<Auction>(LS_AUC);
}

/** บิดทั้งหมดของประมูลหนึ่งรายการ (เรียงราคาสูง→ต่ำ) */
export async function listBids(auctionId: string): Promise<Bid[]> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('skill_bids').select('*')
      .eq('auction_id', auctionId).order('amount', { ascending: false }).limit(50);
    return (data as BidRow[] ?? []).map(toBid);
  }
  return lsLoad<Bid>(LS_BID).filter(b => b.auctionId === auctionId).sort((a, b) => b.amount - a.amount);
}

/* ---------- Admin ---------- */

export async function createAuction(input: Omit<Auction, 'id' | 'status' | 'winnerWs' | 'winningBid' | 'createdAt'>): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('skill_auctions').insert({
      skill_id: input.skillId, skill_name: input.skillName, skill_desc: input.skillDesc, icon: input.icon,
      start_price: input.startPrice, min_increment: input.minIncrement, ends_at: input.endsAt,
    });
    return error ? error.message : '';
  }
  const list = lsLoad<Auction>(LS_AUC);
  list.unshift({ ...input, id: 'auc-' + Date.now().toString(36), status: 'open', winnerWs: null, winningBid: 0, createdAt: new Date().toISOString() });
  lsSave(LS_AUC, list);
  return '';
}

/** ปิดประมูล — บิดสูงสุดชนะ (English Auction) · คืน error ('' = สำเร็จ) */
export async function closeAuction(auction: Auction): Promise<string> {
  const bids = await listBids(auction.id);
  const top = bids[0] ?? null;
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('skill_auctions').update({
      status: top ? 'closed' : 'cancelled',
      winner_ws: top?.wsId ?? null,
      winning_bid: top?.amount ?? 0,
      updated_at: new Date().toISOString(),
    }).eq('id', auction.id);
    return error ? error.message : '';
  }
  lsSave(LS_AUC, lsLoad<Auction>(LS_AUC).map(a => a.id === auction.id
    ? { ...a, status: top ? 'closed' as const : 'cancelled' as const, winnerWs: top?.wsId ?? null, winningBid: top?.amount ?? 0 }
    : a));
  return '';
}

/* ---------- User ---------- */

/** เสนอราคา — ต้อง ≥ ราคาสูงสุดปัจจุบัน + ขั้นต่ำ · คืน error ('' = สำเร็จ) */
export async function placeBid(auction: Auction, wsId: string, bidderName: string, amount: number): Promise<string> {
  if (new Date(auction.endsAt) < new Date()) return 'หมดเวลาประมูลแล้ว — รอ Admin ประกาศผล';
  const bids = await listBids(auction.id);
  const floor = (bids[0]?.amount ?? auction.startPrice - auction.minIncrement) + auction.minIncrement;
  if (amount < floor) return `ราคาต้องไม่ต่ำกว่า ฿${floor.toLocaleString()} (สูงสุดตอนนี้ + ขั้นต่ำ)`;
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('skill_bids').insert({
      auction_id: auction.id, ws_id: wsId, bidder_name: bidderName, amount,
    });
    return error ? error.message : '';
  }
  const list = lsLoad<Bid>(LS_BID);
  list.unshift({ id: 'bid-' + Date.now().toString(36), auctionId: auction.id, wsId, bidderName, amount, createdAt: new Date().toISOString() });
  lsSave(LS_BID, list);
  return '';
}

/** เวลาที่เหลือแบบอ่านง่าย */
export function timeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'หมดเวลา';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `อีก ${Math.floor(h / 24)} วัน ${h % 24} ชม.`;
  if (h > 0) return `อีก ${h} ชม. ${m} นาที`;
  return `อีก ${m} นาที`;
}
