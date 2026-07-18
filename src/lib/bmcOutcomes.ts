/* ===== BMC Outcome Tracker (pure, ทดสอบได้) =====
 * ป้อนผลลัพธ์จริงตามกระบวนการที่กำหนดใน Business Model Canvas (9 ช่อง)
 * ปิดลูป: วางแผน (BMC) → ลงมือ (24-step/Kanban) → วัดผลจริง (ที่นี่)
 * รองรับทั้ง KPI (เป้า→ผลจริง→%สถานะ) และข้อความ + ลิงก์หลักฐาน */
import type { AppData, BmcBlockKey, BmcOutcome } from '../types';

export const BMC_BLOCKS: { key: BmcBlockKey; title: string; sub: string; emoji: string }[] = [
  { key: 'partners',      title: 'Key Partners',          sub: 'พันธมิตรหลัก',        emoji: '🤝' },
  { key: 'activities',    title: 'Key Activities',        sub: 'กิจกรรมหลัก',         emoji: '⚙️' },
  { key: 'value',         title: 'Value Propositions',    sub: 'คุณค่าที่นำเสนอ',     emoji: '💎' },
  { key: 'relationships', title: 'Customer Relationships', sub: 'ความสัมพันธ์ลูกค้า',  emoji: '💬' },
  { key: 'segments',      title: 'Customer Segments',     sub: 'กลุ่มลูกค้า',          emoji: '🎯' },
  { key: 'resources',     title: 'Key Resources',         sub: 'ทรัพยากรหลัก',        emoji: '🏭' },
  { key: 'channels',      title: 'Channels',              sub: 'ช่องทาง',              emoji: '📢' },
  { key: 'costs',         title: 'Cost Structure',        sub: 'โครงสร้างต้นทุน',     emoji: '💸' },
  { key: 'revenue',       title: 'Revenue Streams',       sub: 'กระแสรายได้',          emoji: '💰' },
];

const BLOCK_TITLE: Record<BmcBlockKey, string> = Object.fromEntries(
  BMC_BLOCKS.map(b => [b.key, `${b.title} (${b.sub})`]),
) as Record<BmcBlockKey, string>;

export function blockTitle(key: BmcBlockKey): string { return BLOCK_TITLE[key] ?? key; }

export type OutcomeStatus = 'none' | 'behind' | 'ontrack' | 'done';

/** % ความสำเร็จ (actual/target) — คืน 0 ถ้า target ≤ 0 */
export function outcomePct(o: Pick<BmcOutcome, 'target' | 'actual'>): number {
  if (!o.target || o.target <= 0) return 0;
  return Math.max(0, Math.round((o.actual / o.target) * 100));
}

/** สถานะจาก % (done ≥100 / ontrack ≥70 / behind <70 / none = ยังไม่ตั้งเป้า) */
export function outcomeStatus(o: Pick<BmcOutcome, 'target' | 'actual'>): OutcomeStatus {
  if (!o.target || o.target <= 0) return 'none';
  const p = outcomePct(o);
  if (p >= 100) return 'done';
  if (p >= 70) return 'ontrack';
  return 'behind';
}

export const STATUS_META: Record<OutcomeStatus, { label: string; color: string; icon: string }> = {
  done:    { label: 'สำเร็จ',      color: '#22c55e', icon: '✅' },
  ontrack: { label: 'ตามแผน',     color: '#f59e0b', icon: '🟡' },
  behind:  { label: 'ต่ำกว่าเป้า', color: '#ef4444', icon: '🔴' },
  none:    { label: 'ยังไม่ตั้งเป้า', color: '#64748b', icon: '⚪' },
};

const list = (data: AppData): BmcOutcome[] => data.businessModel?.outcomes ?? [];

/** outcomes ของช่องที่ระบุ */
export function outcomesFor(data: AppData, block: BmcBlockKey): BmcOutcome[] {
  return list(data).filter(o => o.block === block);
}

function withOutcomes(data: AppData, outcomes: BmcOutcome[]): AppData {
  return { ...data, businessModel: { ...data.businessModel, outcomes } };
}

/** เพิ่มผลลัพธ์ใหม่ (ต้องมี metric) — now ส่งเข้ามาเพื่อให้ทดสอบได้ */
export function addOutcome(
  data: AppData,
  input: { block: BmcBlockKey; metric: string; target: number; actual: number; unit?: string; note?: string; evidenceUrl?: string },
  now: Date,
  id = 'oc-' + now.getTime().toString(36),
): AppData {
  const metric = input.metric.trim();
  if (!metric) return data;
  const rec: BmcOutcome = {
    id,
    block: input.block,
    metric,
    target: Number.isFinite(input.target) ? input.target : 0,
    actual: Number.isFinite(input.actual) ? input.actual : 0,
    unit: input.unit?.trim() || undefined,
    note: input.note?.trim() || undefined,
    evidenceUrl: input.evidenceUrl?.trim() || undefined,
    updatedAt: now.toISOString(),
  };
  return withOutcomes(data, [rec, ...list(data)]);
}

/** แก้ผลลัพธ์ที่มีอยู่ (patch เฉพาะฟิลด์ที่ส่งมา) */
export function updateOutcome(data: AppData, id: string, patch: Partial<Omit<BmcOutcome, 'id' | 'block'>>, now: Date): AppData {
  const outcomes = list(data).map(o =>
    o.id === id ? { ...o, ...patch, updatedAt: now.toISOString() } : o,
  );
  return withOutcomes(data, outcomes);
}

/** ลบผลลัพธ์ */
export function removeOutcome(data: AppData, id: string): AppData {
  return withOutcomes(data, list(data).filter(o => o.id !== id));
}

export interface BmcOutcomeSummary {
  total: number;
  done: number;
  ontrack: number;
  behind: number;
  /** % ความสำเร็จเฉลี่ยของ outcome ที่ตั้งเป้าแล้ว (0 ถ้าไม่มี) */
  avgPct: number;
  perBlock: Array<{ block: BmcBlockKey; title: string; count: number; avgPct: number }>;
}

/** สรุปภาพรวม + รายช่อง (ใช้ทำ dashboard แผน vs ผลจริง) */
export function outcomesSummary(data: AppData): BmcOutcomeSummary {
  const all = list(data);
  const withTarget = all.filter(o => o.target > 0);
  const done = all.filter(o => outcomeStatus(o) === 'done').length;
  const ontrack = all.filter(o => outcomeStatus(o) === 'ontrack').length;
  const behind = all.filter(o => outcomeStatus(o) === 'behind').length;
  const avgPct = withTarget.length
    ? Math.round(withTarget.reduce((s, o) => s + outcomePct(o), 0) / withTarget.length)
    : 0;
  const perBlock = BMC_BLOCKS.map(b => {
    const items = all.filter(o => o.block === b.key && o.target > 0);
    return {
      block: b.key,
      title: `${b.title}`,
      count: all.filter(o => o.block === b.key).length,
      avgPct: items.length ? Math.round(items.reduce((s, o) => s + outcomePct(o), 0) / items.length) : 0,
    };
  });
  return { total: all.length, done, ontrack, behind, avgPct, perBlock };
}
