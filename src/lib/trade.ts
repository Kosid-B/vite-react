import { isSupabaseEnabled, supabase } from './supabase';

/** Marketplace M2 (RFQ) + M3 (Orders + ค่าดำเนินการ 3%)
 *  Production: ตาราง rfqs / orders · Local mode: localStorage (demo) */

export const PLATFORM_FEE_RATE = 0.03;

export type RfqStatus = 'open' | 'quoted' | 'accepted' | 'declined' | 'closed';
export type OrderStatus = 'pending_payment' | 'paid' | 'delivered' | 'completed' | 'cancelled';

export interface Rfq {
  id: string;
  buyerWs: string;
  buyerName: string;
  sellerSlug: string | null;   // null = ประกาศงานกลาง (Open RFQ) รอผู้ขายรับ
  sector: string;              // หมวด DBD ของงาน (ใช้จับคู่ประกาศกลาง)
  title: string;
  detail: string;
  budget: number;
  contact: string;
  status: RfqStatus;
  quoteAmount: number;
  quoteNote: string;
  createdAt: string;
}

export interface Order {
  id: string;
  rfqId: string | null;
  buyerWs: string;
  sellerWs: string;
  title: string;
  amount: number;
  fee: number;
  status: OrderStatus;
  createdAt: string;
}

const LS_RFQ = 'ceo_ai_rfqs';
const LS_ORD = 'ceo_ai_orders';
export const LOCAL_WS = 'local';

function lsLoad<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]; } catch { return []; }
}
function lsSave<T>(key: string, list: T[]) { localStorage.setItem(key, JSON.stringify(list)); }

/* ---------- mapping ---------- */
// deno-friendly snake_case rows
interface RfqRow {
  id: string; buyer_ws: string; buyer_name: string; seller_slug: string | null;
  sector?: string; title: string; detail: string; budget: number; contact: string;
  status: RfqStatus; quote_amount: number; quote_note: string; created_at: string;
}
interface OrderRow {
  id: string; rfq_id: string | null; buyer_ws: string; seller_ws: string;
  title: string; amount: number; fee: number; status: OrderStatus; created_at: string;
}
const toRfq = (r: RfqRow): Rfq => ({
  id: r.id, buyerWs: r.buyer_ws, buyerName: r.buyer_name, sellerSlug: r.seller_slug,
  sector: r.sector ?? '', title: r.title, detail: r.detail, budget: Number(r.budget), contact: r.contact,
  status: r.status, quoteAmount: Number(r.quote_amount), quoteNote: r.quote_note,
  createdAt: r.created_at?.slice(0, 10) ?? '',
});
const toOrder = (r: OrderRow): Order => ({
  id: r.id, rfqId: r.rfq_id, buyerWs: r.buyer_ws, sellerWs: r.seller_ws,
  title: r.title, amount: Number(r.amount), fee: Number(r.fee), status: r.status,
  createdAt: r.created_at?.slice(0, 10) ?? '',
});

/* ---------- M2: RFQ ---------- */

export async function createRfq(input: Omit<Rfq, 'id' | 'status' | 'quoteAmount' | 'quoteNote' | 'createdAt'>): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('rfqs').insert({
      buyer_ws: input.buyerWs, buyer_name: input.buyerName, seller_slug: input.sellerSlug,
      sector: input.sector, title: input.title, detail: input.detail, budget: input.budget, contact: input.contact,
    });
    return error ? error.message : '';
  }
  const list = lsLoad<Rfq>(LS_RFQ);
  list.unshift({ ...input, id: 'rfq-' + Date.now().toString(36), status: 'open', quoteAmount: 0, quoteNote: '', createdAt: new Date().toISOString().slice(0, 10) });
  lsSave(LS_RFQ, list);
  return '';
}

/* ---------- ประกาศงานกลาง (Open RFQ) — กลไก "ดีลแรก" ---------- */

/** งานประกาศกลางที่ยังเปิดรับใบเสนอราคา (ทุกหมวด — UI กรองเอง) */
export async function listOpenRfqs(): Promise<Rfq[]> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('rfqs').select('*')
      .is('seller_slug', null).eq('status', 'open')
      .order('created_at', { ascending: false }).limit(100);
    return (data as RfqRow[] ?? []).map(toRfq);
  }
  return lsLoad<Rfq>(LS_RFQ).filter(r => r.sellerSlug === null && r.status === 'open');
}

/** ผู้ขายรับงานกลาง: claim เป็นของหน้าร้านตัวเอง + ส่งใบเสนอราคาในคลิกเดียว */
export async function claimOpenRfq(id: string, mySlug: string, quoteAmount: number, quoteNote: string): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('rfqs')
      .update({ seller_slug: mySlug, status: 'quoted', quote_amount: quoteAmount, quote_note: quoteNote, updated_at: new Date().toISOString() })
      .eq('id', id).is('seller_slug', null).eq('status', 'open');
    return error ? error.message : '';
  }
  lsSave(LS_RFQ, lsLoad<Rfq>(LS_RFQ).map(r =>
    r.id === id && r.sellerSlug === null
      ? { ...r, sellerSlug: mySlug, status: 'quoted' as const, quoteAmount, quoteNote }
      : r));
  return '';
}

/** RFQ ที่ฉันส่งออก (ผู้ซื้อ) */
export async function listMyRfqs(buyerWs: string | null): Promise<Rfq[]> {
  if (isSupabaseEnabled && supabase) {
    if (!buyerWs) return [];
    const { data } = await supabase.from('rfqs').select('*').eq('buyer_ws', buyerWs).order('created_at', { ascending: false });
    return (data as RfqRow[] ?? []).map(toRfq);
  }
  return lsLoad<Rfq>(LS_RFQ).filter(r => r.buyerWs === LOCAL_WS);
}

/** RFQ ที่เข้ามาหาหน้าร้านของฉัน (ผู้ขาย) */
export async function listIncomingRfqs(mySlug: string | null): Promise<Rfq[]> {
  if (!mySlug) return [];
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('rfqs').select('*').eq('seller_slug', mySlug).order('created_at', { ascending: false });
    return (data as RfqRow[] ?? []).map(toRfq);
  }
  return lsLoad<Rfq>(LS_RFQ).filter(r => r.sellerSlug === mySlug);
}

/** ผู้ขายตอบใบเสนอราคา / ปฏิเสธ */
export async function answerRfq(id: string, status: 'quoted' | 'declined', quoteAmount = 0, quoteNote = ''): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('rfqs')
      .update({ status, quote_amount: quoteAmount, quote_note: quoteNote, updated_at: new Date().toISOString() })
      .eq('id', id);
    return error ? error.message : '';
  }
  lsSave(LS_RFQ, lsLoad<Rfq>(LS_RFQ).map(r => r.id === id ? { ...r, status, quoteAmount, quoteNote } : r));
  return '';
}

/* ---------- M3: Orders ---------- */

/** ผู้ซื้อรับใบเสนอราคา → สร้างออเดอร์ (ค่าดำเนินการ 3%) */
export async function acceptQuote(rfq: Rfq, sellerWs: string): Promise<string> {
  const fee = Math.round(rfq.quoteAmount * PLATFORM_FEE_RATE);
  if (isSupabaseEnabled && supabase) {
    const { error: e1 } = await supabase.from('orders').insert({
      rfq_id: rfq.id, buyer_ws: rfq.buyerWs, seller_ws: sellerWs,
      title: rfq.title, amount: rfq.quoteAmount, fee,
    });
    if (e1) return e1.message;
    const { error: e2 } = await supabase.from('rfqs').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', rfq.id);
    return e2 ? e2.message : '';
  }
  const orders = lsLoad<Order>(LS_ORD);
  orders.unshift({
    id: 'ord-' + Date.now().toString(36), rfqId: rfq.id, buyerWs: rfq.buyerWs, sellerWs,
    title: rfq.title, amount: rfq.quoteAmount, fee, status: 'pending_payment',
    createdAt: new Date().toISOString().slice(0, 10),
  });
  lsSave(LS_ORD, orders);
  lsSave(LS_RFQ, lsLoad<Rfq>(LS_RFQ).map(r => r.id === rfq.id ? { ...r, status: 'accepted' as const } : r));
  return '';
}

/** ออเดอร์ทั้งหมดที่เกี่ยวกับ workspace ฉัน (ซื้อหรือขาย) */
export async function listOrders(wsId: string | null): Promise<Order[]> {
  if (isSupabaseEnabled && supabase) {
    if (!wsId) return [];
    const { data } = await supabase.from('orders').select('*')
      .or(`buyer_ws.eq.${wsId},seller_ws.eq.${wsId}`)
      .order('created_at', { ascending: false });
    return (data as OrderRow[] ?? []).map(toOrder);
  }
  return lsLoad<Order>(LS_ORD);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    return error ? error.message : '';
  }
  lsSave(LS_ORD, lsLoad<Order>(LS_ORD).map(o => o.id === id ? { ...o, status } : o));
  return '';
}
