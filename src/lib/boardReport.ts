import type { AICompany, AgentTask, AppData } from '../types';
import { financeSummary, allEntries } from './finance';

const baht = (n: number): string => '฿' + Math.round(n).toLocaleString('th-TH');

/* ===== CEO รายงานบอร์ด — รวมผลงานที่ AI Agent แต่ละตำแหน่งทำเสร็จ (สถานะ review)
 * → สรุปต่อบอร์ด + ขออนุมัติดำเนินการขั้นถัดไป (ล้วนเป็น pure function ไม่พึ่ง API)
 * โครงรายงานมาตรฐาน (ตามที่บอร์ดกำหนด): การตลาด · ส่งมอบ · การเงิน/Cashflow ·
 * รายการที่ต้องจ่าย · ข้อผิดพลาด/ข้อบกพร่อง · ประเด็นขออนุมัติ · ขั้นตอนถัดไป */

export interface PositionReport {
  agentId: string;
  role: string;
  name: string;
  color?: string;
  tasks: AgentTask[];
}

/** งานที่ AI Agent ทำเสร็จแล้วรอบอร์ดตัดสิน (review) */
export function reviewTasks(c: AICompany): AgentTask[] {
  return (c.tasks ?? []).filter(t => t.status === 'review');
}

/** งานถัดไปที่รอดำเนินการ (queued/in_progress) — "ขั้นตอนถัดไป" */
export function nextStepTasks(c: AICompany): AgentTask[] {
  return (c.tasks ?? []).filter(t => t.status === 'queued' || t.status === 'in_progress');
}

/** รวมผลงาน review จัดกลุ่มตามตำแหน่ง (เฉพาะตำแหน่งที่มีผลงานรออนุมัติ) */
export function reportByPosition(c: AICompany): PositionReport[] {
  const rev = reviewTasks(c);
  const byAgent = new Map<string, PositionReport>();
  for (const t of rev) {
    const ag = c.agents.find(a => a.id === t.agentId);
    const key = t.agentId || '—';
    if (!byAgent.has(key)) {
      byAgent.set(key, { agentId: key, role: ag?.role ?? 'ไม่ระบุตำแหน่ง', name: ag?.name ?? '—', color: ag?.color, tasks: [] });
    }
    byAgent.get(key)!.tasks.push(t);
  }
  return [...byAgent.values()];
}

const snippet = (s: string | undefined, n = 160): string => {
  const clean = (s ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n) + '…' : clean || '(ไม่มีผลลัพธ์บันทึก)';
};

const MARKETING_HINT = /cmo|market|ตลาด|แบรนด์|content|โฆษณา|campaign/i;

/** ข้อความรายงานบอร์ด (ภาษาไทย) — โครงมาตรฐานตามที่บอร์ดกำหนด · คัดลอก/แนบใน approval/อีเมลได้ */
export function boardReportText(d: AppData): string {
  const c = d.aiCompany;
  const fin = financeSummary(d);
  const entries = allEntries(d);
  const payables = entries.filter(e => e.kind === 'expense');
  const tasks = c.tasks ?? [];
  const done = tasks.filter(t => t.status === 'done');
  const blocked = tasks.filter(t => t.status === 'blocked');
  const review = reviewTasks(c);
  const next = nextStepTasks(c);
  const groups = reportByPosition(c);
  const deals = d.marketplace?.deals ?? [];
  const closed = deals.filter(x => x.status === 'closed');
  const mkt = tasks.filter(t => {
    const ag = c.agents.find(a => a.id === t.agentId);
    return (t.status === 'done' || t.status === 'review') && ag && MARKETING_HINT.test(ag.role);
  });
  const dateTh = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const L: string[] = [];

  L.push(`📊 รายงานผลการดำเนินงานต่อบอร์ด — ${c.name || 'บริษัท AI'}`);
  L.push(`วันที่ ${dateTh}${c.goal ? ` · เป้าหมาย: ${c.goal}` : ''}`);
  L.push('');
  L.push(`สรุปผู้บริหาร: ทีมทำงานเสร็จ ${done.length} งาน · รอบอร์ดอนุมัติ ${review.length} · คิวถัดไป ${next.length} · `
    + `กำไรสุทธิ ${baht(fin.net)} (${fin.breakEven ? 'คุ้มทุน' : 'ยังไม่คุ้มทุน'})`);
  L.push('');

  L.push('1) 📣 งานการตลาด');
  if (mkt.length === 0) L.push('   — ยังไม่มีงานการตลาดที่ทำเสร็จรอบนี้');
  else mkt.slice(0, 8).forEach(t => L.push(`   • ${t.title} — ${snippet(t.output, 90)}`));
  L.push('');

  L.push('2) 📦 ผลการส่งมอบสินค้า/บริการ');
  L.push(`   • งานที่ส่งมอบเสร็จ ${done.length} งาน · ดีลที่ปิดสำเร็จ ${closed.length} ดีล (มูลค่า ${baht(closed.reduce((s, x) => s + (x.amount || 0), 0))})`);
  if (closed.length > 0) closed.slice(0, 5).forEach(x => L.push(`   • ${x.title} — ${baht(x.amount || 0)}`));
  L.push('');

  L.push('3) 💰 สรุปการเงิน & Cashflow');
  L.push(`   • รายรับ (เงินเข้า) ${baht(fin.revenue)} · รายจ่าย (เงินออก) ${baht(fin.expense)}`);
  L.push(`   • กระแสเงินสดสุทธิ (Cashflow) ${baht(fin.net)} · อัตรากำไร ${fin.margin}%`);
  L.push(`   • สถานะ: ${fin.breakEven ? 'รายรับครอบคลุมรายจ่าย ✅' : 'รายจ่ายมากกว่ารายรับ ⚠️ ต้องเร่งรายได้/คุมต้นทุน'}`);
  L.push('');

  L.push('4) 🧾 รายการที่ต้องจ่าย (Payables)');
  if (payables.length === 0) L.push('   — ไม่มีรายการค่าใช้จ่าย');
  else payables.slice(0, 8).forEach(e => L.push(`   • ${e.label || 'ค่าใช้จ่าย'} — ${baht(e.amount)}${e.recurring ? ' (ประจำ)' : ''}`));
  L.push('');

  L.push('5) ⚠️ ข้อผิดพลาด / ข้อบกพร่อง');
  if (blocked.length === 0) L.push('   — ไม่พบงานที่ติดปัญหา/ถูกบล็อก');
  else blocked.slice(0, 8).forEach(t => L.push(`   • ${t.title} — ${snippet(t.output, 90)}`));
  L.push('');

  L.push(`6) 📌 ประเด็นเสนอบอร์ดพิจารณาอนุมัติ (${review.length})`);
  if (groups.length === 0) L.push('   — ไม่มีงานสถานะ "ตรวจสอบ" ที่รออนุมัติ');
  else groups.forEach(g => {
    L.push(`   ▸ ${g.role} (${g.name}) — ${g.tasks.length} งาน`);
    g.tasks.forEach(t => L.push(`      • ${t.title} — ${snippet(t.output, 80)}`));
  });
  L.push('');

  L.push('7) → ขั้นตอนถัดไป (ขออนุมัติดำเนินการ)');
  if (next.length === 0) L.push('   — ไม่มีงานในคิว');
  else {
    next.slice(0, 6).forEach(t => L.push(`   → ${t.title}`));
    if (next.length > 6) L.push(`   → …และอีก ${next.length - 6} งาน`);
  }
  L.push('');
  L.push('จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติผลการดำเนินงานและดำเนินการในขั้นตอนถัดไป');
  return L.join('\n');
}
