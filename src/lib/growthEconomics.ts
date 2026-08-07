// growthEconomics.ts — Unit economics การตลาดรายสัปดาห์: LTV / CAC / COCA / ROI ต่อช่องทาง
// กรอกต้นทุนมือใน admin · แผน: organic ก่อน → มีรายรับ (MRR>0) ค่อยปลดล็อกลงแอด
// pure + tested · ไม่แต่งตัวเลข (คำนวณจากที่กรอก)

export type GChannelId = 'youtube' | 'fb_group' | 'line' | 'seo' | 'word_of_mouth' | 'other';

export const G_CHANNELS: { id: GChannelId; label: string; icon: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'fb_group', label: 'FB Group', icon: '👥' },
  { id: 'line', label: 'LINE', icon: '💚' },
  { id: 'seo', label: 'SEO', icon: '🔍' },
  { id: 'word_of_mouth', label: 'ปากต่อปาก', icon: '🗣️' },
  { id: 'other', label: 'อื่นๆ', icon: '➕' },
];

export interface GChannelEntry { signups: number; adCost: number; otherCost: number; }
export interface GWeek { weekTag: string; entries: Partial<Record<GChannelId, GChannelEntry>>; }
export interface GrowthEcoState {
  arpu: number;            // รายได้เฉลี่ยต่อสมาชิก/เดือน (บาท)
  lifetimeMonths: number;  // อายุเฉลี่ยของสมาชิก (เดือน)
  currentMRR: number;      // รายรับต่อเดือนตอนนี้ (บาท) — ใช้เป็น gate ก่อนลงแอด
  weeks: GWeek[];
}
export const DEFAULT_GROWTH_ECO: GrowthEcoState = { arpu: 0, lifetimeMonths: 0, currentMRR: 0, weeks: [] };

export type Health = 'good' | 'ok' | 'weak' | 'organic' | 'na';

export interface GChannelMetrics {
  channel: GChannelId; label: string; icon: string;
  signups: number; adCost: number; otherCost: number; totalCost: number;
  cac: number | null;          // ต้นทุนโฆษณา/ลูกค้า (null ถ้าไม่มีสมัคร)
  coca: number | null;         // ต้นทุนรวม/ลูกค้า (แอด+อื่นๆ)
  ltvCacRatio: number | null;  // LTV ÷ CAC (เกณฑ์ดี ≥ 3)
  roi: number | null;          // ROI% ต่อลูกค้า = (LTV − COCA)/COCA × 100
  health: Health;
}

export interface GTotals {
  signups: number; adCost: number; otherCost: number; totalCost: number;
  cac: number | null; coca: number | null; ltvCacRatio: number | null; roi: number | null;
}

export interface GWeekMetrics {
  weekTag: string;
  ltv: number;
  perChannel: GChannelMetrics[];
  totals: GTotals;
  adGateOpen: boolean;   // currentMRR > 0 → พร้อมลงทุนค่าโฆษณา
}

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** LTV = ARPU × อายุเฉลี่ย (เดือน) */
export function ltvOf(s: GrowthEcoState): number {
  return r0(Math.max(0, s.arpu || 0) * Math.max(0, s.lifetimeMonths || 0));
}

function healthOf(signups: number, cac: number | null, ratio: number | null): Health {
  if (signups <= 0) return 'na';
  if (cac === 0) return 'organic';        // ได้ลูกค้าโดยไม่เสียค่าแอด
  if (ratio == null) return 'na';
  if (ratio >= 3) return 'good';
  if (ratio >= 1) return 'ok';
  return 'weak';
}

function channelMetrics(id: GChannelId, e: GChannelEntry, ltv: number): GChannelMetrics {
  const meta = G_CHANNELS.find(c => c.id === id)!;
  const signups = Math.max(0, e.signups || 0);
  const adCost = Math.max(0, e.adCost || 0);
  const otherCost = Math.max(0, e.otherCost || 0);
  const totalCost = adCost + otherCost;
  const cac = signups > 0 ? r0(adCost / signups) : null;
  const coca = signups > 0 ? r0(totalCost / signups) : null;
  const ltvCacRatio = cac != null && cac > 0 ? r1(ltv / cac) : null;
  const roi = coca != null && coca > 0 ? r0(((ltv - coca) / coca) * 100) : null;
  return { channel: id, label: meta.label, icon: meta.icon, signups, adCost, otherCost, totalCost, cac, coca, ltvCacRatio, roi, health: healthOf(signups, cac, ltvCacRatio) };
}

/** คำนวณตัวชี้วัดของสัปดาห์ที่กำหนด */
export function weekMetrics(s: GrowthEcoState, week: GWeek): GWeekMetrics {
  const ltv = ltvOf(s);
  const perChannel = G_CHANNELS.map(c => channelMetrics(c.id, week.entries[c.id] ?? { signups: 0, adCost: 0, otherCost: 0 }, ltv));
  const signups = perChannel.reduce((n, c) => n + c.signups, 0);
  const adCost = perChannel.reduce((n, c) => n + c.adCost, 0);
  const otherCost = perChannel.reduce((n, c) => n + c.otherCost, 0);
  const totalCost = adCost + otherCost;
  const cac = signups > 0 ? r0(adCost / signups) : null;
  const coca = signups > 0 ? r0(totalCost / signups) : null;
  const ltvCacRatio = cac != null && cac > 0 ? r1(ltv / cac) : null;
  const roi = coca != null && coca > 0 ? r0(((ltv - coca) / coca) * 100) : null;
  return { weekTag: week.weekTag, ltv, perChannel, totals: { signups, adCost, otherCost, totalCost, cac, coca, ltvCacRatio, roi }, adGateOpen: (s.currentMRR || 0) > 0 };
}

/** ตัวชี้วัดของสัปดาห์ล่าสุด (weeks เรียงเก่า→ใหม่) */
export function latestWeekMetrics(s: GrowthEcoState): GWeekMetrics | null {
  if (!s.weeks || s.weeks.length === 0) return null;
  return weekMetrics(s, s.weeks[s.weeks.length - 1]);
}

/** ป้ายสัปดาห์ ISO เช่น "2026-W32" (pure — รับ Date เข้ามาเพื่อ test ได้) */
export function isoWeekTag(d: Date): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;               // จันทร์=1 … อาทิตย์=7
  dt.setUTCDate(dt.getUTCDate() + 4 - day);       // เลื่อนไปวันพฤหัสของสัปดาห์
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** ข้อความสุขภาพ LTV:CAC */
export function healthLabel(h: Health): string {
  switch (h) {
    case 'good': return 'คุ้ม (LTV:CAC ≥ 3)';
    case 'ok': return 'พอไหว (1–3) — ยังปรับได้';
    case 'weak': return 'ขาดทุน (LTV:CAC < 1)';
    case 'organic': return 'ฟรี (organic — ไม่มีค่าแอด)';
    default: return '—';
  }
}
