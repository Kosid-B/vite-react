import { supabase, isSupabaseEnabled } from './supabase';
import { isChunkLoadError } from './errorReport';

/* Client errors — "ผู้ใช้เจออะไรพังบ้าง" จากตาราง client_errors (0058)
 *
 * ทำไมไฟล์นี้ถึงมี logic ไม่ใช่แค่ fetch:
 *   ตัวเลขดิบหลอกตาได้ 2 ทาง และเคยหลอกมาแล้ว (17 ส.ค. 2569 — ดู LESSONS-LEDGER)
 *     1. บั๊กเก่าที่แก้ไปแล้วยังค้างอยู่ในตาราง → ดูเหมือนพังทั้งที่หยุดพังไปแล้ว
 *        → ต้องแยกด้วย "เกิดล่าสุดเมื่อไหร่" (active/stale) ไม่ใช่จำนวนรวมอย่างเดียว
 *     2. chunk error จากการ deploy ≠ บั๊กในโค้ด → ต้องแยกป้ายออกจากกัน
 *   ทั้งหมดเป็น pure function เพื่อเทสต์ได้โดยไม่ต้องมี DB
 */

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  source: string;
  path: string | null;
  stack: string | null;
  ua: string | null;
  count: number;
  first_seen: string;
  last_seen: string;
}

export interface ClientErrorAgg {
  days: number;
  total: number;
  by_source: Record<string, number>;
  by_path: Record<string, number>;
  groups: ErrorGroup[];
}

/** ยังเกิดอยู่ = เห็นล่าสุดภายใน 48 ชม. — เกินนั้นถือว่า "เงียบแล้ว" (อาจแก้ไปแล้ว) */
export const ACTIVE_WINDOW_HOURS = 48;

export function isActive(g: ErrorGroup, now = Date.now()): boolean {
  const t = Date.parse(g.last_seen);
  if (Number.isNaN(t)) return false;
  return now - t <= ACTIVE_WINDOW_HOURS * 3600_000;
}

/** chunk error = ผลข้างเคียงของการ deploy ทับ ไม่ใช่บั๊กในโค้ด — ต้องแยกก่อนตีความ */
export function isDeployArtifact(g: ErrorGroup): boolean {
  return isChunkLoadError(g.message);
}

export type Severity = 'active-bug' | 'deploy' | 'quiet';

export function severityOf(g: ErrorGroup, now = Date.now()): Severity {
  if (isDeployArtifact(g)) return 'deploy';
  return isActive(g, now) ? 'active-bug' : 'quiet';
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  'active-bug': 'ยังพังอยู่',
  deploy: 'จากการ deploy',
  quiet: 'เงียบแล้ว',
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  'active-bug': '#dc2626',
  deploy: '#f59e0b',
  quiet: 'var(--ink3)',
};

/** เรียงตามสิ่งที่ต้องซ่อมก่อน: บั๊กที่ยังเกิดอยู่ → จำนวนครั้งมาก */
export function rankedGroups(agg: ClientErrorAgg | null, now = Date.now()): ErrorGroup[] {
  if (!agg?.groups?.length) return [];
  const rank: Record<Severity, number> = { 'active-bug': 0, deploy: 1, quiet: 2 };
  return [...agg.groups].sort((a, b) => {
    const d = rank[severityOf(a, now)] - rank[severityOf(b, now)];
    return d !== 0 ? d : b.count - a.count;
  });
}

/** จำนวน error ที่เป็นบั๊กจริงและยังเกิดอยู่ — ตัวเลขเดียวที่ควรทำให้ตกใจ */
export function activeBugCount(agg: ClientErrorAgg | null, now = Date.now()): number {
  return rankedGroups(agg, now)
    .filter(g => severityOf(g, now) === 'active-bug')
    .reduce((s, g) => s + g.count, 0);
}

/**
 * สิ่งที่ตัวเลขชุดนี้ "ตอบไม่ได้" — ต้องขึ้นคู่กับตัวเลขเสมอ
 * (กฎโปรเจกต์: ตัวเลขที่ไม่บอกข้อจำกัด = ตัวเลขที่พร้อมจะถูกอ่านผิด)
 */
export function errorCaveats(agg: ClientErrorAgg | null): string[] {
  const out = [
    'นับเป็น "ครั้ง" ไม่ใช่ "คน" — เราไม่เก็บ id ผู้ใช้โดยตั้งใจ คนเดียวเจอ 3 ครั้ง = 3',
    'chunk error ที่ระบบ reload แก้ให้เองสำเร็จ จะไม่ถูกส่งมาที่นี่ (ErrorBoundary ออกก่อนรายงาน) — ที่เห็นคือกรณีที่ reload แล้วยังพัง',
    'error ที่ทำให้เบราว์เซอร์ล่มทั้งแท็บ ส่ง beacon ไม่ทัน = ไม่ถูกนับ',
  ];
  if (agg && agg.total === 0) {
    out.push(`ยังไม่มีข้อมูลใน ${agg.days} วันล่าสุด — ถ้าเพิ่งเปิดใช้ ต้องรอให้มีคนเจอ error ก่อนถึงจะเห็นอะไร`);
  }
  return out;
}

/** ดึงสรุป error (admin เท่านั้น — RPC เช็ค is_app_admin เอง) */
export async function loadClientErrors(days = 7): Promise<ClientErrorAgg | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.rpc('client_errors_agg', { p_days: days });
  if (error || !data) return null;
  const d = data as Partial<ClientErrorAgg>;
  return {
    days: d.days ?? days,
    total: d.total ?? 0,
    by_source: d.by_source ?? {},
    by_path: d.by_path ?? {},
    groups: Array.isArray(d.groups) ? d.groups : [],
  };
}
