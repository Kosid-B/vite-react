/* productQuickCheck — ชั้นที่ "ต่อโลกภายนอก" ของตรวจสินค้าเร็ว
 * (localStorage ของเครื่องผู้ใช้ + rpc ฝั่ง Supabase)
 *
 * แกนคำนวณล้วน ๆ ย้ายไป `quickCalcCore.ts` แล้ว เพื่อให้ Cloudflare Worker
 * เรียกสูตรชุดเดียวกันได้โดยไม่ต้องลาก supabase เข้าไปด้วย
 * re-export ทั้งหมด → ไฟล์ที่ import จากที่นี่อยู่แล้วไม่ต้องแก้อะไรเลย
 */
import { supabase, isSupabaseEnabled } from './supabase';
import { quickCheck, verdictOf, QUICK_TOPICS } from './quickCalcCore';
import type { ProductInput, QuickVerdict, TopicId } from './quickCalcCore';

export * from './quickCalcCore';

/** ปัดทศนิยม 2 ตำแหน่ง — helper ภายใน (ไม่ใช่สูตรธุรกิจ จึงไม่ต้องอยู่ใน core) */
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── ส่งขึ้นระบบ admin (first-party · ไม่มี PII) ────────────────────────
 * ⚠️ ส่งเฉพาะ field ที่เป็น dropdown/ตัวเลข — **ห้ามส่งชื่อสินค้า** ที่ผู้ใช้พิมพ์เอง
 *    เพราะเป็น free text ที่อาจมีชื่อร้าน/ชื่อคน (ดูเหตุผลเต็มใน migration 0056)
 * เงียบเสมอ: การเก็บสถิติต้องไม่ทำให้หน้าเว็บพัง
 * ─────────────────────────────────────────────────────────────────────── */

export interface QuickTrackPayload {
  p_session: string;
  p_biz: string;
  p_price: number;
  p_cost: number;
  p_units: number | null;
  p_fixed: number | null;
  p_verdict: QuickVerdict;
  p_topics: TopicId[];
  p_cta: boolean;
}

/** สร้าง payload สำหรับ RPC track_quickcheck — แยกออกมาให้ทดสอบได้ว่าไม่มีชื่อสินค้าหลุดไป */
export function quickTrackPayload(
  session: string, input: ProductInput, topics: readonly TopicId[], cta: boolean,
): QuickTrackPayload {
  return {
    p_session: session,
    p_biz: input.biz,
    p_price: Number(input.price) || 0,
    p_cost: Number(input.cost) || 0,
    p_units: input.unitsPerMonth ?? null,
    p_fixed: input.fixedCostPerMonth ?? null,
    p_verdict: verdictOf(quickCheck(input)),
    p_topics: [...topics],
    p_cta: cta,
  };
}

/* ── ยกข้อมูลเข้าแอปตอนสมัคร — "ไม่ต้องกรอกซ้ำ" ────────────────────────
 * เก็บใน localStorage ของเครื่องผู้ใช้เท่านั้น (มีชื่อสินค้าที่ผู้ใช้พิมพ์เอง = ไม่ควรขึ้น DB)
 * ต่อยอดจาก bizHint.ts ที่เดิมยกไปแค่ "ชื่อธุรกิจ"
 * ─────────────────────────────────────────────────────────────────────── */

export interface QuickDraft {
  input: ProductInput;
  topics: TopicId[];
  /** วันที่กรอก (ISO date) — ให้แอปตัดสินได้ว่าข้อมูลเก่าเกินไปหรือยัง */
  at: string;
}

const DRAFT_KEY = 'ceo_ai_quick_draft';
/** ร่างที่เก่ากว่านี้ถือว่าไม่เกี่ยวกันแล้ว — คนอาจเปิดเว็บทิ้งไว้เป็นเดือน */
export const DRAFT_MAX_AGE_DAYS = 30;

export function saveQuickDraft(d: QuickDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* โหมดส่วนตัว/เต็ม → ข้ามไป */ }
}

/** อ่านร่าง — คืน null เมื่อไม่มี พัง หรือเก่าเกิน DRAFT_MAX_AGE_DAYS */
export function readQuickDraft(today = new Date().toISOString().slice(0, 10)): QuickDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return parseQuickDraft(raw, today);
  } catch { return null; }
}

export function clearQuickDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
}

/** แยกออกมาให้ทดสอบได้โดยไม่ต้องมี localStorage */
export function parseQuickDraft(raw: string, today: string): QuickDraft | null {
  let d: unknown;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || typeof d !== 'object') return null;
  const o = d as Partial<QuickDraft>;
  if (!o.input || typeof o.input !== 'object' || typeof o.at !== 'string') return null;
  const days = daysBetween(o.at, today);
  if (days == null || days > DRAFT_MAX_AGE_DAYS) return null;
  return {
    input: o.input as ProductInput,
    topics: Array.isArray(o.topics) ? o.topics.filter(isTopicId) : [],
    at: o.at,
  };
}

function isTopicId(v: unknown): v is TopicId {
  return typeof v === 'string' && QUICK_TOPICS.some((t) => t.id === v);
}

/** จำนวนวันระหว่างสองวันที่รูปแบบ YYYY-MM-DD — null เมื่อรูปแบบผิด */
function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from), b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** แปลงร่างเป็นรายการรายรับ-รายจ่ายตั้งต้น — ให้ผู้ใช้เห็นข้อมูลตัวเองในแอปทันทีหลังสมัคร
 *  คืนอาร์เรย์ว่างเมื่อข้อมูลไม่พอ (ไม่ใส่ตัวเลขมั่วเพื่อให้ดูมีอะไร) */
export function draftToFinance(
  d: QuickDraft,
): { id: string; kind: 'revenue' | 'expense'; label: string; amount: number; date: string }[] {
  const { input, at } = d;
  const units = input.unitsPerMonth;
  if (!units || units <= 0) return [];
  const rows: { id: string; kind: 'revenue' | 'expense'; label: string; amount: number; date: string }[] = [];
  const name = (input.name || 'สินค้า').slice(0, 40);
  rows.push({ id: `qd-rev-${at}`, kind: 'revenue', label: `ขาย ${name} (จากที่กรอกบนหน้าแรก)`, amount: round2(input.price * units), date: at });
  rows.push({ id: `qd-cog-${at}`, kind: 'expense', label: `ต้นทุน ${name} (จากที่กรอกบนหน้าแรก)`, amount: round2(input.cost * units), date: at });
  if (input.fixedCostPerMonth && input.fixedCostPerMonth > 0) {
    rows.push({ id: `qd-fix-${at}`, kind: 'expense', label: 'ค่าใช้จ่ายคงที่ (จากที่กรอกบนหน้าแรก)', amount: round2(input.fixedCostPerMonth), date: at });
  }
  return rows;
}

/* ── อ่านสรุปในแผงแอดมิน ───────────────────────────────────────────────── */

export interface QuickAgg {
  total: number;
  with_topic: number;
  cta: number;
  median_price: number;
  median_cost: number;
  median_margin_pct: number;
  by_biz: Record<string, number>;
  by_verdict: Record<string, number>;
  /** ⭐ ตัวที่สำคัญที่สุด — หัวข้อไหนถูกกดมากสุด = เจ้าของธุรกิจกังวลเรื่องอะไรจริง */
  by_topic: Record<string, number>;
}

/** ดึงสรุปจาก RPC (admin เท่านั้น — RPC เช็ค is_app_admin() เอง) */
export async function loadQuickAgg(days = 30): Promise<QuickAgg | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.rpc('quickcheck_agg', { p_days: days });
  if (error || !data) return null;
  const d = data as Partial<QuickAgg>;
  return {
    total: d.total ?? 0,
    with_topic: d.with_topic ?? 0,
    cta: d.cta ?? 0,
    median_price: Number(d.median_price ?? 0),
    median_cost: Number(d.median_cost ?? 0),
    median_margin_pct: d.median_margin_pct ?? 0,
    by_biz: d.by_biz ?? {},
    by_verdict: d.by_verdict ?? {},
    by_topic: d.by_topic ?? {},
  };
}

/** จัดอันดับหัวข้อที่คนกดมากสุด (pure — แยกออกมาให้ทดสอบได้) */
export function topConcerns(agg: QuickAgg | null): { id: string; label: string; count: number; pct: number }[] {
  const by = agg?.by_topic ?? {};
  const total = Object.values(by).reduce((s, n) => s + n, 0);
  return Object.entries(by)
    .map(([id, count]) => ({
      id,
      label: QUICK_TOPICS.find((t) => t.id === id)?.label ?? id,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** จำนวนขั้นต่ำก่อนที่อันดับหัวข้อจะเชื่อได้ — ต่ำกว่านี้คือเสียงรบกวน
 *  (บทเรียนเดียวกับ landingFunnel.MIN_SAMPLE — เคย "อ่านผลจาก 60 คน" แล้วสรุปผิดมาแล้ว) */
export const MIN_CONCERN_SAMPLE = 30;

export function concernsTrustworthy(agg: QuickAgg | null): boolean {
  return (agg?.with_topic ?? 0) >= MIN_CONCERN_SAMPLE;
}
