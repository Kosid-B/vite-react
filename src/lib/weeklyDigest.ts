import type { AppData, PageId } from '../types';
import { allEntries } from './finance';
import { weekTag } from './segmentation';
import { streakCount } from './streak';
import { companyXP, getCompanyLevel } from './gamification';
import { nextStep } from './journey';

/* ===== สรุปสัปดาห์นี้ (Weekly Digest) — ตรรกะบริสุทธิ์ ทดสอบได้ =====
 * ดึงข้อมูลจริง (การเงินสัปดาห์นี้ + streak + ระดับ + งานเสร็จ + ก้าวถัดไป)
 * มาสรุปเป็นการ์ดเดียวบน Dashboard → ดึงผู้ใช้กลับมาใช้ต่อ (retention) */

export interface WeeklyDigest {
  weekTag: string;
  revenue: number;          // รายได้ "สัปดาห์นี้" (จากรายการที่มีวันที่ในสัปดาห์)
  expense: number;
  net: number;
  entriesThisWeek: number;
  streak: number;           // วันต่อเนื่องปัจจุบัน (สะสม)
  activeDaysThisWeek: number;
  tasksDone: number;        // งานที่ทีม AI ทำเสร็จ (สะสม)
  dealsClosed: number;      // ดีลปิด (สะสม)
  levelRank: string;
  levelBadge: string;
  levelColor: string;
  xp: number;
  nextAction: { label: string; page: PageId } | null;
  highlights: string[];     // 1–3 ข้อความชวนทำต่อ (ไม่ซ้ำกับตัวเลข/ปุ่ม)
}

/** วันเดียวกันสัปดาห์เดียวกับ now ไหม — parse 'yyyy-mm-dd' แบบ local ให้ตรงกับ weekTag */
function sameWeek(dateStr: string, now: Date): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return false;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(dt.getTime())) return false;
  return weekTag(dt) === weekTag(now);
}

export function weeklyDigest(d: AppData, now: Date = new Date()): WeeklyDigest {
  const wk = weekTag(now);

  const entries = allEntries(d).filter(e => sameWeek(e.date, now));
  const revenue = entries.filter(e => e.kind === 'revenue').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = revenue - expense;

  const streak = streakCount(d);
  const activeDaysThisWeek = (d.experiments?.activeDays ?? []).filter(day => sameWeek(day, now)).length;

  const tasksDone = (d.aiCompany?.tasks ?? []).filter(t => t.status === 'done').length;
  const dealsClosed = (d.marketplace?.deals ?? []).filter(x => x.status === 'closed').length;

  const xp = companyXP(d);
  const level = getCompanyLevel(xp);
  const ns = nextStep(d);
  const nextAction = ns ? { label: ns.label, page: ns.page } : null;

  const highlights: string[] = [];
  if (net > 0) highlights.push('📈 สัปดาห์นี้ทำกำไร — เยี่ยมมาก!');
  else if (revenue > 0) highlights.push('💪 มีรายได้เข้าแล้ว คุมรายจ่ายอีกนิดก็กำไร');
  if (dealsClosed > 0) highlights.push(`🤝 ปิดดีลสะสม ${dealsClosed} ดีล`);
  if (tasksDone > 0) highlights.push(`✅ ทีม AI ทำงานเสร็จ ${tasksDone} งาน`);
  if (highlights.length === 0) highlights.push('เริ่มสัปดาห์นี้ด้วยการมอบงานแรกให้ทีม AI 🚀');

  return {
    weekTag: wk, revenue, expense, net, entriesThisWeek: entries.length,
    streak, activeDaysThisWeek, tasksDone, dealsClosed,
    levelRank: level.rank, levelBadge: level.badge, levelColor: level.color, xp,
    nextAction, highlights,
  };
}
