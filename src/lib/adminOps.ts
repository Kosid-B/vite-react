import type { AppData } from '../types';
import { financeSummary, fmtBaht } from './finance';
import { cityStats } from './companyCity';

/* ===== สรุปผลการดำเนินงานของ User (ฝั่ง Admin) =====
 * รวมตัวเลขจาก AppData ของแต่ละ workspace ให้บอร์ดเห็นว่า User ดำเนินงานไปถึงไหน
 * (ใช้ฟังก์ชันบริสุทธิ์เดียวกับที่หน้าเมือง/การเงินใช้ — เลขตรงกันทั้งระบบ) */

export interface WsOps {
  plan: string;          // PlanId
  planLabel: string;
  subStatus: string;     // trial/active/…
  revenue: number;
  expense: number;
  net: number;
  margin: number;        // %
  tasksDone: number;
  tasksTotal: number;
  dealsClosed: number;
  dealsValue: number;    // มูลค่ารวมดีลที่ปิดแล้ว (บาท)
  agents: number;
  running: boolean;      // ระบบอัตโนมัติกำลังทำงาน
  skills: number;        // Skill ที่ซื้อ
  cityTier: string;      // ระดับเมือง (label)
  companyLevel: string;  // ระดับบริษัท (rank)
  streak: number;        // วันต่อเนื่อง
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', starter: 'Starter', growth: 'Growth', scale: 'Scale',
};

export function workspaceOps(d: AppData): WsOps {
  const fin = financeSummary(d);
  const city = cityStats(d);
  const ai = d.aiCompany;
  const tasks = ai?.tasks ?? [];
  const deals = d.marketplace?.deals ?? [];
  const closed = deals.filter(x => x.status === 'closed');
  const plan = d.subscription?.plan ?? 'free';

  return {
    plan,
    planLabel: PLAN_LABEL[plan] ?? plan,
    subStatus: d.subscription?.status ?? 'none',
    revenue: fin.revenue,
    expense: fin.expense,
    net: fin.net,
    margin: fin.margin,
    tasksDone: tasks.filter(t => t.status === 'done').length,
    tasksTotal: tasks.length,
    dealsClosed: closed.length,
    dealsValue: closed.reduce((s, x) => s + (x.amount || 0), 0),
    agents: ai?.agents?.length ?? 0,
    running: !!ai?.running,
    skills: ai?.purchasedSkills?.length ?? 0,
    cityTier: city.tier?.label ?? '-',
    companyLevel: city.level?.rank ?? '-',
    streak: d.streak?.count ?? 0,
  };
}

/* ===== รวมยอดทั้งระบบ (KPI ด้านบน) ===== */
export interface OpsTotals {
  workspaces: number;
  activeCompanies: number;   // ระบบอัตโนมัติกำลังรัน
  paying: number;            // แพ็กมีเงิน (ไม่ใช่ free/none)
  revenue: number;
  expense: number;
  net: number;
  tasksDone: number;
  dealsClosed: number;
  dealsValue: number;
}

export function opsTotals(list: WsOps[]): OpsTotals {
  return list.reduce<OpsTotals>((acc, o) => ({
    workspaces: acc.workspaces + 1,
    activeCompanies: acc.activeCompanies + (o.running ? 1 : 0),
    paying: acc.paying + (o.plan !== 'free' && o.subStatus === 'active' ? 1 : 0),
    revenue: acc.revenue + o.revenue,
    expense: acc.expense + o.expense,
    net: acc.net + o.net,
    tasksDone: acc.tasksDone + o.tasksDone,
    dealsClosed: acc.dealsClosed + o.dealsClosed,
    dealsValue: acc.dealsValue + o.dealsValue,
  }), { workspaces: 0, activeCompanies: 0, paying: 0, revenue: 0, expense: 0, net: 0, tasksDone: 0, dealsClosed: 0, dealsValue: 0 });
}

/* ===== Export: CSV (ดาวน์โหลด) / TSV (คัดลอกวางลง Google Sheets ได้ตรงช่อง) ===== */
export interface OpsRow extends WsOps { name: string; owner: string; members: number; created: string }

const HEADERS = [
  'บริษัท/เวิร์กสเปซ', 'เจ้าของ', 'สมาชิก', 'แพ็ก', 'สถานะ',
  'รายได้', 'รายจ่าย', 'กำไรสุทธิ', 'มาร์จิน%',
  'งานเสร็จ', 'งานทั้งหมด', 'ดีลปิด', 'มูลค่าดีล',
  'เอเจนต์', 'ระบบรัน', 'Skill', 'ระดับเมือง', 'ระดับบริษัท', 'ต่อเนื่อง(วัน)', 'สร้างเมื่อ',
];

function cells(r: OpsRow): (string | number)[] {
  return [
    r.name, r.owner, r.members, r.planLabel, r.subStatus,
    r.revenue, r.expense, r.net, r.margin,
    r.tasksDone, r.tasksTotal, r.dealsClosed, r.dealsValue,
    r.agents, r.running ? 'ใช่' : 'ไม่', r.skills, r.cityTier, r.companyLevel, r.streak, r.created,
  ];
}

/** CSV — escape ค่าที่มี comma/quote/newline (กัน field เพี้ยน) */
export function opsCsv(rows: OpsRow[]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [HEADERS.map(esc).join(',')];
  for (const r of rows) lines.push(cells(r).map(esc).join(','));
  return '﻿' + lines.join('\r\n'); // BOM ให้ Excel/Sheets อ่านภาษาไทยถูก
}

/** TSV — คัดลอกแล้ววางใน Google Sheets ลงช่องอัตโนมัติ (แท็บคั่น) */
export function opsTsv(rows: OpsRow[]): string {
  const clean = (v: string | number) => String(v ?? '').replace(/[\t\n\r]/g, ' ');
  const lines = [HEADERS.join('\t')];
  for (const r of rows) lines.push(cells(r).map(clean).join('\t'));
  return lines.join('\n');
}

export { fmtBaht };
