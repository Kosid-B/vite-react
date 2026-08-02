// eqms.ts — eQMS Closed-Loop (Superorganism เสา 4: Evolution/PLC · "compliance → ทรัพย์สินเชิงกลยุทธ์")
// เชื่อมกระบวนการคุณภาพให้เป็น "วงจรปิด" PDCA/CAPA: ตรวจพบ(Check) → แก้(Act) → ยืนยัน → ปิดวงจร
// สิ่งที่ค้าง = "open loop" (NC ยังไม่ปิด / clause แดง / audit เกินกำหนด) → ระบบชี้ว่าต้อง Act อะไรต่อ
// pure/testable — ใช้ข้อมูลจริงจาก iso9001 (clauses/nonconformities/audits) ไม่แต่งตัวเลข
import type { ISOClauseCheck, Nonconformity, InternalAudit } from '../types';

/** SLA ปิด CAPA ตามความรุนแรง (วัน) — เกินนี้ = overdue (วงจรค้างนานเกินไป) */
export const CAPA_SLA_DAYS: Record<Nonconformity['severity'], number> = { major: 30, minor: 60, observation: 90 };

export interface EqmsInput {
  clauses: ISOClauseCheck[];
  nonconformities: Nonconformity[];
  audits: InternalAudit[];
  now: Date;
}

export interface OpenLoop {
  kind: 'nonconformity' | 'red_clause' | 'overdue_audit';
  ref: string;           // clause หรือ id
  label: string;
  ageDays: number;       // อายุตั้งแต่เปิด (0 ถ้าไม่มีวันที่)
  overdue: boolean;      // เกิน SLA แล้ว
  severity: 'high' | 'med' | 'low';
}

export interface EqmsStatus {
  pdca: { plan: number; do: number; check: number; act: number }; // % ความครบแต่ละเฟส (0–100)
  openLoops: OpenLoop[];
  totalNc: number;
  closedNc: number;
  ncClosureRate: number; // closed / total (0–1)
  overdueCount: number;
  loopHealth: number;    // 0–100 (วงจรปิดครบ + ไม่มี overdue = สูง)
  headline: string;
  capaSuggestions: string[]; // Act อัตโนมัติ: จาก clause แดง/NC ที่ยังไม่ครบวงจร
}

const DAY = 86400000;
function ageDays(dateStr: string | undefined, now: Date): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}
const pct = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);
const SEV_MAP: Record<Nonconformity['severity'], OpenLoop['severity']> = { major: 'high', minor: 'med', observation: 'low' };

/** ประเมินสถานะวงจรปิด PDCA/CAPA จากข้อมูล QMS จริง — pure */
export function eqmsStatus(inp: EqmsInput): EqmsStatus {
  const clauses = inp.clauses ?? [];
  const ncs = inp.nonconformities ?? [];
  const audits = inp.audits ?? [];
  const scored = clauses.filter(c => c.status !== 'na');
  const green = clauses.filter(c => c.status === 'green');
  const red = clauses.filter(c => c.status === 'red');

  const totalNc = ncs.length;
  const closedNc = ncs.filter(n => n.status === 'closed').length;
  const auditsDone = audits.filter(a => a.status === 'completed').length;

  // PDCA: Plan=ประเมินข้อกำหนด · Do=ทำจนมีหลักฐาน(green) · Check=ตรวจภายในเสร็จ · Act=ปิด NC
  const pdca = {
    plan: pct(scored.length, clauses.length),
    do: pct(green.length, clauses.length),
    check: audits.length > 0 ? pct(auditsDone, audits.length) : 0,
    act: totalNc > 0 ? pct(closedNc, totalNc) : 100, // ไม่มี NC = ไม่มีอะไรค้างต้องแก้
  };

  const openLoops: OpenLoop[] = [];
  for (const n of ncs) {
    if (n.status === 'closed') continue;
    const age = ageDays(n.date, inp.now);
    openLoops.push({
      kind: 'nonconformity', ref: n.clause || n.id,
      label: `NC ข้อ ${n.clause || '-'} (${n.severity}) — ${n.status === 'in_progress' ? 'กำลังแก้' : 'ยังไม่เริ่ม'}`,
      ageDays: age, overdue: age > CAPA_SLA_DAYS[n.severity], severity: SEV_MAP[n.severity],
    });
  }
  for (const c of red) {
    // clause แดงที่ยังไม่มี NC ผูกไว้ = วงจรเปิด (ตรวจพบแต่ยังไม่เปิด CAPA)
    if (ncs.some(n => n.clause === c.id && n.status !== 'closed')) continue;
    openLoops.push({ kind: 'red_clause', ref: c.id, label: `ข้อ ${c.id} สถานะแดง — ยังไม่เปิด CAPA`, ageDays: 0, overdue: false, severity: 'high' });
  }
  for (const a of audits) {
    const planned = a.plannedDate ? new Date(a.plannedDate).getTime() : NaN;
    const isOverdue = a.status === 'overdue' || (a.status === 'planned' && !Number.isNaN(planned) && planned < inp.now.getTime());
    if (isOverdue) openLoops.push({ kind: 'overdue_audit', ref: a.id, label: `ตรวจภายในเกินกำหนด — ${a.scope || 'ไม่ระบุขอบเขต'}`, ageDays: ageDays(a.plannedDate, inp.now), overdue: true, severity: 'med' });
  }

  const overdueCount = openLoops.filter(l => l.overdue).length;

  // loopHealth: เริ่ม 100 หัก per open loop (high 12/med 6/low 3) + overdue เพิ่ม 8 · floor 0
  let health = 100;
  for (const l of openLoops) health -= (l.severity === 'high' ? 12 : l.severity === 'med' ? 6 : 3) + (l.overdue ? 8 : 0);
  // ยังไม่เริ่มประเมินเลย → health สะท้อน Plan (กันโชว์ 100 ทั้งที่ยังไม่ทำอะไร)
  if (scored.length === 0) health = Math.min(health, 0);
  const loopHealth = Math.max(0, Math.min(100, health));

  const headline =
    scored.length === 0 ? 'ยังไม่เริ่มประเมินข้อกำหนด — เริ่มที่ Plan (ให้สถานะแต่ละข้อ)'
    : openLoops.length === 0 ? `วงจรปิดครบ — ไม่มีรายการค้าง (loop health ${loopHealth})`
    : overdueCount > 0 ? `มี ${openLoops.length} วงจรเปิด · ${overdueCount} เกินกำหนด — เร่ง Act ปิดวงจร`
    : `มี ${openLoops.length} วงจรเปิดรอ Act (ยังไม่เกินกำหนด)`;

  // CAPA อัตโนมัติ (Act): แปลง open loop → สิ่งที่ควรทำต่อ
  const capaSuggestions: string[] = [];
  for (const c of red) {
    if (ncs.some(n => n.clause === c.id && n.status !== 'closed')) continue;
    capaSuggestions.push(`เปิด CAPA ข้อ ${c.id}: หา root cause → แก้ไข → แนบหลักฐาน → ปิดวงจร`);
  }
  for (const n of ncs) {
    if (n.status === 'closed') continue;
    if (!n.rootCause?.trim()) capaSuggestions.push(`NC ข้อ ${n.clause || n.id}: ระบุ root cause ก่อน (ยังว่าง) เพื่อแก้ให้ตรงจุด`);
    else if (ageDays(n.date, inp.now) > CAPA_SLA_DAYS[n.severity]) capaSuggestions.push(`NC ข้อ ${n.clause || n.id}: เกิน SLA ${CAPA_SLA_DAYS[n.severity]} วัน — เร่งปิด`);
  }
  if (audits.length === 0 && scored.length > 0) capaSuggestions.push('ยังไม่มีการตรวจภายใน (Check) — วางแผน internal audit เพื่อปิดวงจร PDCA');

  return {
    pdca, openLoops, totalNc, closedNc,
    ncClosureRate: totalNc > 0 ? closedNc / totalNc : 0,
    overdueCount, loopHealth, headline,
    capaSuggestions: capaSuggestions.slice(0, 6),
  };
}
