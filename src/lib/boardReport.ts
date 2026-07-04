import type { AICompany, AgentTask } from '../types';

/* ===== CEO รายงานบอร์ด — รวมผลงานที่ AI Agent แต่ละตำแหน่งทำเสร็จ (สถานะ review)
 * → สรุปต่อบอร์ด + ขออนุมัติดำเนินการขั้นถัดไป (ล้วนเป็น pure function ไม่พึ่ง API) */

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

/** ข้อความรายงานบอร์ด (ภาษาไทย) — คัดลอก/แนบใน approval ได้ */
export function boardReportText(c: AICompany): string {
  const groups = reportByPosition(c);
  const done = (c.tasks ?? []).filter(t => t.status === 'done').length;
  const next = nextStepTasks(c);
  const dateTh = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const lines: string[] = [];
  lines.push(`📊 รายงานผลการดำเนินงานต่อบอร์ด — ${c.name || 'บริษัท AI'}`);
  lines.push(`วันที่ ${dateTh}`);
  if (c.goal) lines.push(`เป้าหมาย: ${c.goal}`);
  lines.push('');

  if (groups.length === 0) {
    lines.push('ยังไม่มีผลงานที่รอการอนุมัติจากบอร์ด (ไม่มีงานสถานะ "ตรวจสอบ")');
  } else {
    lines.push(`ผลงานที่ทีมดำเนินการเสร็จ รอบอร์ดพิจารณา (${reviewTasks(c).length} งาน):`);
    lines.push('');
    for (const g of groups) {
      lines.push(`▸ ${g.role} (${g.name}) — ${g.tasks.length} งาน`);
      for (const t of g.tasks) {
        lines.push(`   • ${t.title}`);
        lines.push(`     ผล: ${snippet(t.output)}`);
      }
      lines.push('');
    }
  }

  lines.push(`สรุปสถานะ: เสร็จสมบูรณ์แล้ว ${done} งาน · รอบอร์ดอนุมัติ ${reviewTasks(c).length} งาน · คิวถัดไป ${next.length} งาน`);
  if (next.length > 0) {
    lines.push('');
    lines.push('ขั้นตอนถัดไป (ขออนุมัติดำเนินการ):');
    next.slice(0, 6).forEach(t => lines.push(`   → ${t.title}`));
    if (next.length > 6) lines.push(`   → …และอีก ${next.length - 6} งาน`);
  }
  lines.push('');
  lines.push('จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติผลการดำเนินงานและดำเนินการในขั้นตอนถัดไป');
  return lines.join('\n');
}
