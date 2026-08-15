/* processRegister — ทะเบียนกระบวนการ + ตัววัด (MVP ขั้นที่ 1 ของ "SaaS แทนเอกสาร ISO")
 *
 * ทำไมเริ่มที่นี่: กระบวนการคือชั้นกลางของ CONTEXT_LAYERS ที่ทุกอย่างแขวนอยู่
 *   ข้อกำหนดผูกกับกระบวนการ · เอกสารเกิดจากกระบวนการ · ตัววัดวัดกระบวนการ
 *   ถ้าชั้นนี้ว่าง ชั้นอื่นก็ลอย
 *
 * สิ่งที่ทำให้ต่างจากตารางกระบวนการทั่วไป: ระบบ "บังคับสายโซ่" ให้
 *   ตัววัดทุกตัวต้องตอบได้ว่ามาจากอะไร — ถ้าตอบไม่ได้ ระบบเตือนทันที
 *   ไม่ต้องรอผู้ตรวจมาถามว่า "ทำไมถึงวัดตัวนี้" แล้วค่อยรู้ว่าตอบไม่ได้
 *
 * pure ทั้งไฟล์ — ทดสอบได้ ไม่มี side-effect · เก็บใน AppData (ใช้ได้ทั้ง local และ cloud)
 */

import { STANDARDS, type StandardId } from './isoStandards';

export interface MetricRow {
  id: string;
  /** ชื่อตัววัด เช่น "% ส่งมอบตรงเวลา" */
  name: string;
  /** เป้าหมาย เช่น "≥ 95%" — เก็บเป็นข้อความเพราะรูปแบบต่างกันมาก */
  target?: string;
  /** ความถี่ในการวัด เช่น "รายเดือน" */
  freq?: string;
  /** 🔑 มาจากอะไร — ความเสี่ยง/อันตราย/คุณค่าที่ตัววัดนี้เฝ้าอยู่
   *  ช่องนี้คือหัวใจทั้งหมด ถ้าว่าง = KPI ลอย ๆ ที่จะเป็น NC ที่ข้อ 9.1 */
  whyFrom?: string;
}

export interface ProcessRow {
  id: string;
  /** ชื่อกระบวนการตามที่คนหน้างานเรียก ไม่ใช่ชื่อทางการ */
  name: string;
  /** ผู้รับผิดชอบ — ต้องเป็น "ตำแหน่ง" ไม่ใช่ชื่อคน (คนลาออกได้ ระบบต้องอยู่ต่อ) */
  owner?: string;
  input?: string;
  output?: string;
  metrics: MetricRow[];
  /** ข้อกำหนดที่กระบวนการนี้ตอบ */
  clauses: string[];
  /** เอกสาร/บันทึกที่กระบวนการนี้ใช้จริง */
  docs: string[];
  updatedAt?: string;
}

export interface ProcessRegisterData {
  standard: StandardId;
  processes: ProcessRow[];
}

/* ── ตรวจสุขภาพทะเบียน — ส่วนที่เป็นคุณค่าจริงของระบบ ────────────────────── */

export type IssueLevel = 'blocker' | 'warn';

export interface RegisterIssue {
  level: IssueLevel;
  /** id ของแถวที่มีปัญหา — ว่างได้ถ้าเป็นปัญหาระดับทะเบียน */
  processId?: string;
  metricId?: string;
  what: string;
  /** ผลที่จะเกิดตอนตรวจ — ทำให้ผู้ใช้เข้าใจว่าทำไมต้องแก้ */
  audit: string;
}

/** คำที่บอกว่าใส่ "ชื่อคน" แทน "ตำแหน่ง" ในช่องผู้รับผิดชอบ
 *  ตรวจแบบหลวม ๆ ตั้งใจ — เตือนดีกว่าปล่อยผ่าน แต่ไม่บล็อกการบันทึก */
const POSITION_HINTS = [
  'ผู้จัดการ', 'หัวหน้า', 'ฝ่าย', 'แผนก', 'เจ้าหน้าที่', 'พนักงาน', 'ผู้อำนวยการ',
  'กรรมการ', 'ผู้ช่วย', 'ทีม', 'จป', 'QMR', 'Manager', 'Head', 'Supervisor', 'Officer', 'Lead',
];

export function looksLikePerson(owner: string): boolean {
  const s = owner.trim();
  if (!s) return false;
  if (POSITION_HINTS.some((h) => s.toLowerCase().includes(h.toLowerCase()))) return false;
  // เหลือคำเดียวหรือสองคำสั้น ๆ โดยไม่มีคำบอกตำแหน่ง = น่าจะเป็นชื่อคน
  return s.split(/\s+/).length <= 2 && s.length <= 25;
}

/** หาปัญหาในทะเบียน เรียงตามความรุนแรง
 *
 *  blocker = ถ้าปล่อยไว้จะเป็น NC แน่ ๆ ตอนตรวจ
 *  warn    = ยังไม่ถึงกับ NC แต่เป็นจุดที่ผู้ตรวจมักเจาะ หรือทำให้ระบบเปราะ */
export function registerIssues(data: ProcessRegisterData): RegisterIssue[] {
  const out: RegisterIssue[] = [];
  const { processes, standard } = data;

  for (const p of processes) {
    if (!p.name.trim()) {
      out.push({ level: 'blocker', processId: p.id, what: 'กระบวนการไม่มีชื่อ', audit: 'ผู้ตรวจอ้างอิงไม่ได้ว่ากำลังตรวจอะไร' });
      continue;
    }
    if (!p.owner?.trim()) {
      out.push({
        level: 'blocker', processId: p.id,
        what: `"${p.name}" ยังไม่มีผู้รับผิดชอบ`,
        audit: 'ข้อ 5.3 — ผู้ตรวจถามว่าใครรับผิดชอบ แล้วไม่มีใครตอบได้',
      });
    } else if (looksLikePerson(p.owner)) {
      out.push({
        level: 'warn', processId: p.id,
        what: `"${p.name}" ระบุผู้รับผิดชอบเป็นชื่อคน ไม่ใช่ตำแหน่ง`,
        audit: 'คนลาออกแล้วระบบพัง — ผู้ตรวจรอบหน้าจะเจอว่าไม่มีใครรับผิดชอบ',
      });
    }

    if (p.metrics.length === 0) {
      out.push({
        level: 'blocker', processId: p.id,
        what: `"${p.name}" ยังไม่มีตัววัด`,
        audit: 'ข้อ 9.1 — ไม่มีใครรู้ว่ากระบวนการนี้ดีหรือแย่',
      });
    }

    for (const m of p.metrics) {
      if (!m.name.trim()) {
        out.push({ level: 'blocker', processId: p.id, metricId: m.id, what: `"${p.name}" มีตัววัดที่ไม่มีชื่อ`, audit: 'ข้อ 9.1' });
        continue;
      }
      if (!m.whyFrom?.trim()) {
        out.push({
          level: 'blocker', processId: p.id, metricId: m.id,
          what: `ตัววัด "${m.name}" ยังไม่ได้ระบุว่ามาจากความเสี่ยงหรือคุณค่าอะไร`,
          audit: 'ข้อ 9.1 — ผู้ตรวจถามว่า "ทำไมถึงวัดตัวนี้" แล้วตอบไม่ได้ นี่คือ NC ที่พบบ่อยที่สุด',
        });
      }
      if (!m.target?.trim()) {
        out.push({
          level: 'warn', processId: p.id, metricId: m.id,
          what: `ตัววัด "${m.name}" ยังไม่มีเป้าหมาย`,
          audit: 'วัดแล้วไม่มีเกณฑ์ตัดสิน = ไม่รู้ว่าผ่านหรือไม่ผ่าน',
        });
      }
    }

    if (p.docs.length === 0) {
      out.push({
        level: 'warn', processId: p.id,
        what: `"${p.name}" ยังไม่ได้ระบุเอกสาร/บันทึกที่ใช้`,
        audit: 'ข้อ 7.5 — ผู้ตรวจขอดูหลักฐานว่าทำจริงแล้วหาไม่เจอ',
      });
    }
  }

  // ข้อกำหนดที่ยังไม่มีกระบวนการไหนรับผิดชอบ
  const claimed = new Set(processes.flatMap((p) => p.clauses));
  const orphan = STANDARDS[standard].clauses.filter((c) => !claimed.has(c.id));
  if (orphan.length > 0) {
    out.push({
      level: 'blocker',
      what: `มี ${orphan.length} ข้อกำหนดที่ยังไม่มีกระบวนการไหนรับผิดชอบ (${orphan.slice(0, 5).map((c) => c.id).join(', ')}${orphan.length > 5 ? ' …' : ''})`,
      audit: 'ข้อที่ไม่มีเจ้าของคือข้อที่จะตกตรวจ เพราะไม่มีใครรู้ว่าต้องทำอะไร',
    });
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'blocker' ? -1 : 1));
}

export interface RegisterHealth {
  processes: number;
  metrics: number;
  /** ตัววัดที่ตอบได้ว่ามาจากอะไร — ตัวเลขที่สำคัญที่สุดในหน้านี้ */
  metricsWithWhy: number;
  clausesCovered: number;
  clausesTotal: number;
  blockers: number;
  warns: number;
  /** พร้อมให้ตรวจไหม — ไม่มี blocker เลยเท่านั้นถึงจะถือว่าพร้อม */
  ready: boolean;
}

export function registerHealth(data: ProcessRegisterData): RegisterHealth {
  const issues = registerIssues(data);
  const metrics = data.processes.flatMap((p) => p.metrics);
  const claimed = new Set(data.processes.flatMap((p) => p.clauses));
  const total = STANDARDS[data.standard].clauses.length;
  const blockers = issues.filter((i) => i.level === 'blocker').length;
  return {
    processes: data.processes.length,
    metrics: metrics.length,
    metricsWithWhy: metrics.filter((m) => m.whyFrom?.trim()).length,
    clausesCovered: STANDARDS[data.standard].clauses.filter((c) => claimed.has(c.id)).length,
    clausesTotal: total,
    blockers,
    warns: issues.filter((i) => i.level === 'warn').length,
    ready: blockers === 0 && data.processes.length > 0,
  };
}

/* ── ส่งออก — ต้องมีตั้งแต่วันแรก ────────────────────────────────────────
 * เหตุผลอยู่ใน docs/product/SAAS-AS-THE-SYSTEM.md ข้อ 3.1
 * ลูกค้าต้องถือข้อมูลตัวเองได้เสมอ ไม่งั้นเลิกจ่าย = เสียหลักฐาน = เสียใบรับรอง
 * ───────────────────────────────────────────────────────────────────── */

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** CSV ทะเบียนกระบวนการ — หนึ่งแถวต่อหนึ่งตัววัด (กระบวนการที่ยังไม่มีตัววัดก็ยังออกมา) */
export function registerCsv(data: ProcessRegisterData): string {
  const head = ['กระบวนการ', 'ผู้รับผิดชอบ', 'Input', 'Output', 'ตัววัด', 'เป้าหมาย', 'ความถี่', 'มาจาก (ความเสี่ยง/คุณค่า)', 'เอกสารที่ใช้', 'ข้อกำหนด'];
  const rows: string[][] = [];
  for (const p of data.processes) {
    const base = [p.name, p.owner ?? '', p.input ?? '', p.output ?? ''];
    const tail = [p.docs.join(' · '), p.clauses.join(', ')];
    if (p.metrics.length === 0) rows.push([...base, '', '', '', '', ...tail]);
    else for (const m of p.metrics) rows.push([...base, m.name, m.target ?? '', m.freq ?? '', m.whyFrom ?? '', ...tail]);
  }
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

/** ส่งออกทั้งหมดเป็น JSON — ใช้ย้ายระบบหรือเก็บสำรองฝั่งลูกค้า */
export function registerJson(data: ProcessRegisterData, stampedAt: string): string {
  return JSON.stringify(
    { exportedAt: stampedAt, standard: data.standard, standardCode: STANDARDS[data.standard].code, processes: data.processes },
    null,
    2,
  );
}

/** ทะเบียนเปล่าสำหรับเริ่มต้น */
export function emptyRegister(standard: StandardId): ProcessRegisterData {
  return { standard, processes: [] };
}
