import type { AppData } from '../types';
import { financeSummary } from './finance';
import { resourceSummary } from './resources';
import { gateProgress, skillLevels } from './boardRoom';
import { cityStats } from './companyCity';

/** ภาพรวมทุกระบบในที่เดียว (read-only) — ใช้ในหน้า Dashboard รวม
 *  ดึงสรุปจากทุก lib โดยไม่แก้ข้อมูล */
export interface SystemOverview {
  aiCompany: { agents: number; active: number; done: number; running: boolean };
  board: {
    gatesApproved: number; gatesTotal: number;
    bizLevel: number; bizLabel: string; bizXp: number;
    mktLevel: number; mktLabel: string; mktXp: number;
  };
  resources: { count: number; monthlyCost: number; pending: number };
  finance: { revenue: number; expense: number; net: number; breakEven: boolean };
  city: { tier: string; xp: number; pctToNext: number };
}

const ACTIVE_STATUSES = ['queued', 'in_progress', 'review'];

export function systemOverview(d: AppData): SystemOverview {
  const c = d.aiCompany;
  const tasks = c?.tasks ?? [];
  const decisions = d.boardRoom?.decisions ?? [];
  const gates = gateProgress(decisions);
  const sk = skillLevels(decisions);
  const res = resourceSummary(d.resources ?? { items: [], requests: [] });
  const fin = financeSummary(d);
  const city = cityStats(d);

  return {
    aiCompany: {
      agents: (c?.agents ?? []).length,
      active: tasks.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      done: tasks.filter((t) => t.status === 'done').length,
      running: Boolean(c?.running),
    },
    board: {
      gatesApproved: gates.approved, gatesTotal: gates.total,
      bizLevel: sk.business.level, bizLabel: sk.business.label, bizXp: sk.business.xp,
      mktLevel: sk.marketing.level, mktLabel: sk.marketing.label, mktXp: sk.marketing.xp,
    },
    resources: { count: res.count, monthlyCost: res.totalMonthlyCost, pending: res.pendingRequests },
    finance: { revenue: fin.revenue, expense: fin.expense, net: fin.net, breakEven: fin.breakEven },
    city: { tier: city.tier?.label ?? '', xp: city.xp ?? 0, pctToNext: city.pctToNext ?? 0 },
  };
}
