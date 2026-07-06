/* ===== Pulse & A/B — วัด "อะไรทำให้ User อยากใช้งานต่อ" แบบโปร่งใส =====
 * หลักการ (จริยธรรมมาก่อน):
 *  1) ผู้ใช้ยินยอมก่อน (opt-in) — ปิดได้ทุกเมื่อ, รู้ตัวเสมอว่าอยู่ในการทดลอง
 *  2) ไม่บิดอารมณ์/ไม่หลอก — วัดความรู้สึกจริงด้วยคำถามตรง ๆ (pulse 👍😐👎)
 *  3) โปร่งใส — ผู้ใช้เห็นข้อมูลของตัวเองทั้งหมด และเห็นว่าถูกจัดกลุ่ม A/B ไหน
 *  4) ไม่ระบุตัวตน — ใช้ uid สุ่มเฉพาะเครื่อง เพื่อ "คงภาพเดิม" ของการทดลอง (deterministic)
 * การรวมผลข้ามผู้ใช้เกิดที่ GA4 (เหตุการณ์ถูกส่งพร้อม tag กลุ่ม) — ไฟล์นี้จัดการฝั่ง client เท่านั้น */

export type PulseScore = 1 | 2 | 3; // 1=👎 ยังไม่ช่วย, 2=😐 พอใช้, 3=👍 ช่วยได้จริง

export interface PulseEntry {
  day: string;        // yyyy-mm-dd (1 ครั้ง/วัน — ล่าสุดทับของเดิมในวันนั้น)
  score: PulseScore;
  note?: string;
}

export interface ExperimentsState {
  enabled: boolean;                       // ยินยอมให้วัดผลแบบโปร่งใส (opt-in)
  seenConsent: boolean;                   // เคยเห็นคำอธิบาย/ตัดสินใจแล้ว
  uid?: string;                           // id สุ่มไม่ระบุตัวตน (คงกลุ่ม A/B ให้เสถียร)
  assignments?: Record<string, string>;   // expId -> variantId (ล็อกครั้งแรกที่เห็น)
  pulses?: PulseEntry[];                  // ประวัติ pulse รายวัน
  activations?: string[];                 // expId ที่ผู้ใช้กด "อยากทำต่อ" แล้ว (นับ 1 ครั้ง)
  activeDays?: string[];                  // yyyy-mm-dd ที่ผู้ใช้ยัง active — ใช้วัด retention cohort (opt-in)
}

export interface Variant {
  id: string;
  label: string;      // ชื่อกลุ่ม (โปร่งใส ผู้ใช้เห็นได้)
  headline: string;   // ข้อความให้กำลังใจที่แตกต่างกัน (ตัวแปรที่ทดสอบ)
  body: string;
  cta: string;        // ป้ายปุ่ม "อยากทำต่อ"
}

export interface Experiment {
  id: string;
  question: string;   // สิ่งที่เราอยากรู้ (บอกผู้ใช้ตรง ๆ)
  variants: Variant[];
  goto?: string;      // PageId ที่ปุ่ม "อยากทำต่อ" พาไป (ค่าเริ่มต้น citylevelup)
}

/* คลังการทดลอง — ทดสอบว่า "การจัดกรอบกำลังใจแบบไหน" ทำให้อยากใช้งานต่อมากกว่า
 * ทั้งสองแบบซื่อสัตย์ ไม่มีคำขู่/ไม่มี scarcity ปลอม — ต่างกันแค่ "มุมมอง" */
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'encourage_frame',
    question: 'ข้อความให้กำลังใจแบบ “เห็นความก้าวหน้าของตัวเอง” หรือ “เป็นส่วนหนึ่งของชุมชน” ทำให้คุณอยากทำต่อมากกว่ากัน?',
    variants: [
      {
        id: 'progress',
        label: 'A · เห็นความก้าวหน้า',
        headline: 'ทุกก้าวของคุณสะสมเป็นเมืองที่โตขึ้นจริง',
        body: 'งานที่ทำเสร็จวันนี้ = อีกหนึ่งชั้นของเมืองบริษัทคุณ ความคืบหน้าเป็นของคุณล้วน ๆ',
        cta: 'ทำงานชิ้นถัดไปของฉัน',
      },
      {
        id: 'community',
        label: 'B · เป็นส่วนหนึ่งของชุมชน',
        headline: 'เจ้าของธุรกิจไทยหลายคนกำลังลงมือแบบคุณ',
        body: 'คุณไม่ได้เดินคนเดียว — เครื่องมือชุดเดียวกันนี้ช่วยผู้ประกอบการรายเล็กสร้างระบบให้ธุรกิจได้จริง',
        cta: 'ลงมือทำต่อกับชุมชน',
      },
    ],
    goto: 'citylevelup',
  },
  {
    id: 'first_step',
    question: 'ตอนเริ่มต้น คุณอยากให้ระบบชวน “ลงมือทีละก้าวเล็ก” หรือ “เห็นภาพปลายทางทั้งหมด” มากกว่ากัน?',
    variants: [
      {
        id: 'small',
        label: 'A · ก้าวเล็กก่อน',
        headline: 'เริ่มจากงานเดียววันนี้',
        body: 'ทำสิ่งเล็ก ๆ ให้เสร็จ 1 อย่างก่อน แล้วค่อยต่อยอด — ไม่ต้องรีบทำทุกอย่างพร้อมกัน',
        cta: 'มอบงานแรกให้ทีม AI',
      },
      {
        id: 'vision',
        label: 'B · เห็นภาพปลายทาง',
        headline: 'เห็นภาพบริษัท AI เต็มรูปแบบของคุณ',
        body: 'สำรวจว่าระบบทั้งหมดพาธุรกิจคุณไปได้ไกลแค่ไหน แล้วเลือกจุดที่อยากเริ่มเอง',
        cta: 'ดูทีมบริษัท AI ทั้งหมด',
      },
    ],
    goto: 'aicompany',
  },
];

/* ---- helpers ---- */
const dayStr = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** hash สตริงแบบเสถียร (djb2) → ใช้แบ่งกลุ่ม A/B แบบ deterministic ต่อ uid */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** สุ่ม uid ไม่ระบุตัวตน (ครั้งเดียว) — ปลอดภัยถ้า crypto ไม่มีก็ fallback */
export function makeUid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return 'uid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** ค่าเริ่มต้น — ยังไม่ยินยอม, ยังไม่เห็นคำอธิบาย */
export function defaultExperiments(): ExperimentsState {
  return { enabled: false, seenConsent: false, pulses: [], assignments: {}, activations: [] };
}

/** เลือก variant สำหรับ experiment — คงเดิมถ้าเคยเห็นแล้ว (ล็อกใน assignments) */
export function variantFor(state: ExperimentsState, exp: Experiment): Variant {
  const locked = state.assignments?.[exp.id];
  if (locked) {
    const v = exp.variants.find(x => x.id === locked);
    if (v) return v;
  }
  const uid = state.uid ?? 'anon';
  const idx = hashStr(uid + ':' + exp.id) % exp.variants.length;
  return exp.variants[idx];
}

/** บันทึก pulse วันนี้ (ทับของวันเดียวกัน) → คืน state ใหม่ */
export function recordPulse(state: ExperimentsState, score: PulseScore, note?: string): ExperimentsState {
  const day = dayStr(Date.now());
  const rest = (state.pulses ?? []).filter(p => p.day !== day);
  const pulses = [...rest, { day, score, note }].sort((a, b) => a.day.localeCompare(b.day));
  return { ...state, pulses };
}

export function todayPulse(state: ExperimentsState): PulseEntry | undefined {
  const day = dayStr(Date.now());
  return (state.pulses ?? []).find(p => p.day === day);
}

/** บันทึกว่าวันนี้ผู้ใช้ยัง active (opt-in) — dedup, เก็บล่าสุด 180 วัน. คืน state เดิมถ้าไม่เปลี่ยน */
export function recordActiveDay(state: ExperimentsState, ms = Date.now()): ExperimentsState {
  if (!state.enabled) return state;
  const day = dayStr(ms);
  const days = state.activeDays ?? [];
  if (days.includes(day)) return state;
  const next = [...days, day].sort((a, b) => a.localeCompare(b)).slice(-180);
  return { ...state, activeDays: next };
}

/** สรุปข้อมูลของผู้ใช้เอง (โปร่งใส — ผู้ใช้ดูของตัวเองได้) */
export function pulseSummary(state: ExperimentsState) {
  const pulses = state.pulses ?? [];
  const n = pulses.length;
  const avg = n ? pulses.reduce((s, p) => s + p.score, 0) / n : 0;
  const last7 = pulses.slice(-7);
  const good = pulses.filter(p => p.score === 3).length;
  const meh = pulses.filter(p => p.score === 2).length;
  const bad = pulses.filter(p => p.score === 1).length;
  return { n, avg, last7, good, meh, bad };
}

/* ===== รวมผลข้ามผู้ใช้ (ฝั่ง Admin) — เทียบ variant ไหนทำให้ "อยากใช้งานต่อ" มากกว่า =====
 * ใช้เฉพาะ workspace ที่ยินยอม (enabled). วัด 2 อย่างต่อ variant:
 *   1) activationRate — สัดส่วนคนที่กด "อยากทำต่อ"
 *   2) pulseAvg — ความรู้สึกเฉลี่ย (/3) ของคนในกลุ่มนั้น
 * ทั้งคู่คือ proxy ของ "อยากใช้งานต่อ/อยากซื้อ" แบบซื่อสัตย์ (ไม่บิดอารมณ์) */
export interface ExpVariantStat {
  experiment: string;
  variant: string;
  variantLabel: string;
  headline: string;
  exposed: number;         // workspace ที่ถูกจัดกลุ่มนี้
  activated: number;       // กด "อยากทำต่อ"
  activationRate: number;  // %
  pulseN: number;
  pulseAvg: number;        // /3
  good: number; meh: number; bad: number;
}
export interface ExpReport {
  experiment: string;
  question: string;
  variants: ExpVariantStat[];
  winner?: string;         // variant id ที่ activationRate สูงกว่า (ถ้าต่างกันชัด)
}
export interface ExperimentsAggregate {
  total: number;           // workspace ทั้งหมดที่พิจารณา
  optIn: number;           // ยินยอมเข้าร่วม
  pulseN: number;
  pulseAvg: number;
  reports: ExpReport[];
}

export function aggregateExperiments(states: (ExperimentsState | undefined | null)[]): ExperimentsAggregate {
  const total = states.length;
  let optIn = 0, pulseN = 0, pulseSum = 0;
  // key: experimentId|variantId → accumulator
  const acc = new Map<string, ExpVariantStat & { _sum: number }>();

  for (const st of states) {
    if (!st || !st.enabled) continue;
    optIn++;
    const ps = st.pulses ?? [];
    pulseN += ps.length;
    pulseSum += ps.reduce((s, p) => s + p.score, 0);

    for (const exp of EXPERIMENTS) {
      const vid = st.assignments?.[exp.id];
      if (!vid) continue;                         // ยังไม่ถูก expose
      const v = exp.variants.find(x => x.id === vid);
      const key = exp.id + '|' + vid;
      let row = acc.get(key);
      if (!row) {
        row = {
          experiment: exp.id, variant: vid,
          variantLabel: v?.label ?? vid, headline: v?.headline ?? '',
          exposed: 0, activated: 0, activationRate: 0,
          pulseN: 0, pulseAvg: 0, good: 0, meh: 0, bad: 0, _sum: 0,
        };
        acc.set(key, row);
      }
      row.exposed++;
      if ((st.activations ?? []).includes(exp.id)) row.activated++;
      for (const p of ps) {
        row.pulseN++; row._sum += p.score;
        if (p.score === 3) row.good++; else if (p.score === 2) row.meh++; else row.bad++;
      }
    }
  }

  const reports: ExpReport[] = EXPERIMENTS.map(exp => {
    const variants = exp.variants.map(v => {
      const row = acc.get(exp.id + '|' + v.id);
      if (!row) {
        return { experiment: exp.id, variant: v.id, variantLabel: v.label, headline: v.headline,
          exposed: 0, activated: 0, activationRate: 0, pulseN: 0, pulseAvg: 0, good: 0, meh: 0, bad: 0 } as ExpVariantStat;
      }
      return {
        experiment: row.experiment, variant: row.variant, variantLabel: row.variantLabel, headline: row.headline,
        exposed: row.exposed, activated: row.activated,
        activationRate: row.exposed ? Math.round((row.activated / row.exposed) * 100) : 0,
        pulseN: row.pulseN, pulseAvg: row.pulseN ? row._sum / row.pulseN : 0,
        good: row.good, meh: row.meh, bad: row.bad,
      } as ExpVariantStat;
    });
    // ผู้ชนะ = activationRate สูงกว่า และมี exposed ทั้งคู่ ≥ 1 (กัน noise ตอนข้อมูลน้อย)
    let winner: string | undefined;
    const ranked = [...variants].filter(v => v.exposed > 0).sort((a, b) => b.activationRate - a.activationRate);
    if (ranked.length >= 2 && ranked[0].activationRate > ranked[1].activationRate) winner = ranked[0].variant;
    return { experiment: exp.id, question: exp.question, variants, winner };
  });

  return { total, optIn, pulseN, pulseAvg: pulseN ? pulseSum / pulseN : 0, reports };
}

/* ===== Retention cohort รายสัปดาห์ — "คนที่ให้ pulse สูงกลับมาใช้ต่อจริงไหม" =====
 * แบ่ง cohort ตาม sentiment เฉลี่ยของ pulse (สูง/กลาง/ต่ำ) แล้วเทียบว่ากลุ่มไหน "กลับมาใช้ต่อ" มากกว่า
 * ใช้ activeDays (opt-in) + วัน pulse (รวมเป็นวัน active). เส้น retention รายสัปดาห์นับจาก "วันแรกที่ active"
 * สัปดาห์ที่ยังมาไม่ถึง (window ยังไม่เริ่ม) = null (ไม่นับเป็น churn) — วิธีมาตรฐานของ cohort analysis */
const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const dayToMs = (day: string): number => +new Date(day + 'T00:00:00Z');

export type CohortId = 'high' | 'mid' | 'low';
export interface CohortStat {
  cohort: CohortId;
  label: string;
  users: number;
  avgPulse: number;        // /3
  returned7: number;       // % active ใน 7 วันล่าสุด
  returned14: number;      // % active ใน 14 วันล่าสุด
  avgActiveWeeks: number;  // จำนวนสัปดาห์ที่ active เฉลี่ย
  curve: (number | null)[]; // retention % สัปดาห์ 0..3 (null = ยังไม่ถึงสัปดาห์นั้น)
}
export interface RetentionReport {
  optIn: number;
  withData: number;        // มีทั้ง pulse + วัน active พอวัดได้
  weeks: number;           // ความยาวเส้น retention (4)
  cohorts: CohortStat[];
  insight: string;
}

const COHORT_LABEL: Record<CohortId, string> = {
  high: '😄 pulse สูง (≥2.5)', mid: '🙂 pulse กลาง (2.0–2.5)', low: '😕 pulse ต่ำ (<2.0)',
};

export function retentionCohorts(states: (ExperimentsState | undefined | null)[], nowMs = Date.now()): RetentionReport {
  const WEEKS = 4;
  const todayMs = dayToMs(dayStr(nowMs));
  let optIn = 0, withData = 0;

  type Acc = { users: number; sumPulse: number; ret7: number; ret14: number; sumWeeks: number; wNum: number[]; wDen: number[] };
  const mk = (): Acc => ({ users: 0, sumPulse: 0, ret7: 0, ret14: 0, sumWeeks: 0, wNum: Array(WEEKS).fill(0), wDen: Array(WEEKS).fill(0) });
  const buckets: Record<CohortId, Acc> = { high: mk(), mid: mk(), low: mk() };

  for (const st of states) {
    if (!st || !st.enabled) continue;
    optIn++;
    const pulses = st.pulses ?? [];
    if (pulses.length === 0) continue;                       // ไม่มี sentiment
    // วัน active = activeDays ∪ วันที่ให้ pulse (การให้ pulse ก็คือ active)
    const daySet = new Set<string>([...(st.activeDays ?? []), ...pulses.map(p => p.day)]);
    const active = [...daySet].map(dayToMs).sort((a, b) => a - b);
    if (active.length === 0) continue;
    withData++;

    const avg = pulses.reduce((s, p) => s + p.score, 0) / pulses.length;
    const cohort: CohortId = avg >= 2.5 ? 'high' : avg >= 2.0 ? 'mid' : 'low';
    const b = buckets[cohort];
    b.users++; b.sumPulse += avg;

    const first = active[0], last = active[active.length - 1];
    if (todayMs - last <= 6 * DAY_MS) b.ret7++;
    if (todayMs - last <= 13 * DAY_MS) b.ret14++;
    b.sumWeeks += new Set(active.map(ms => Math.floor(ms / WEEK_MS))).size;

    for (let w = 0; w < WEEKS; w++) {
      const winStart = first + w * WEEK_MS;
      if (todayMs < winStart) break;                         // สัปดาห์ยังมาไม่ถึง → ไม่นับ
      b.wDen[w]++;
      const winEnd = winStart + WEEK_MS;
      if (active.some(ms => ms >= winStart && ms < winEnd)) b.wNum[w]++;
    }
  }

  const cohorts: CohortStat[] = (['high', 'mid', 'low'] as CohortId[]).map(id => {
    const b = buckets[id];
    return {
      cohort: id, label: COHORT_LABEL[id], users: b.users,
      avgPulse: b.users ? b.sumPulse / b.users : 0,
      returned7: b.users ? Math.round((b.ret7 / b.users) * 100) : 0,
      returned14: b.users ? Math.round((b.ret14 / b.users) * 100) : 0,
      avgActiveWeeks: b.users ? b.sumWeeks / b.users : 0,
      curve: b.wDen.map((den, w) => den ? Math.round((b.wNum[w] / den) * 100) : null),
    };
  });

  // insight: เทียบ retention (7 วัน) ของกลุ่ม pulse สูง vs ต่ำ
  const hi = cohorts.find(c => c.cohort === 'high')!;
  const lo = cohorts.find(c => c.cohort === 'low')!;
  let insight: string;
  if (hi.users === 0 || lo.users === 0) {
    insight = 'ข้อมูลยังไม่พอเทียบ — ต้องมีผู้ใช้ทั้งกลุ่ม pulse สูงและต่ำที่มีประวัติการกลับมาใช้';
  } else if (hi.returned7 > lo.returned7) {
    insight = `คนที่ให้ pulse สูงกลับมาใช้ต่อ (7 วัน) ${hi.returned7}% เทียบกับกลุ่ม pulse ต่ำ ${lo.returned7}% — pulse สูงสัมพันธ์กับการอยู่ต่อ`;
  } else if (hi.returned7 < lo.returned7) {
    insight = `กลุ่ม pulse ต่ำกลับมา ${lo.returned7}% สูงกว่ากลุ่ม pulse สูง ${hi.returned7}% — pulse ไม่ทำนายการอยู่ต่อในข้อมูลนี้ (ตรวจสอบเพิ่ม)`;
  } else {
    insight = `ทั้งสองกลุ่มกลับมาใช้ต่อใกล้เคียงกัน (${hi.returned7}%) — pulse ยังไม่แยกความต่างชัด`;
  }

  return { optIn, withData, weeks: WEEKS, cohorts, insight };
}

/* ===== Export ผล A/B (CSV ดาวน์โหลด / TSV วางลง Google Sheets) ===== */
const EXP_HEADERS = [
  'การทดลอง', 'คำถาม', 'กลุ่ม', 'ข้อความ',
  'ผู้เข้าร่วม', 'อยากทำต่อ', 'activation%', 'pulse_n', 'pulse_เฉลี่ย/3',
  '😄', '🙂', '😕', 'ผู้ชนะ',
];

function expRows(agg: ExperimentsAggregate): (string | number)[][] {
  const out: (string | number)[][] = [];
  for (const rep of agg.reports) {
    for (const v of rep.variants) {
      out.push([
        rep.experiment, rep.question, v.variantLabel, v.headline,
        v.exposed, v.activated, v.activationRate, v.pulseN, v.pulseN ? v.pulseAvg.toFixed(2) : '',
        v.good, v.meh, v.bad, rep.winner === v.variant ? 'ชนะ' : '',
      ]);
    }
  }
  return out;
}

/** CSV — escape ค่าที่มี comma/quote/newline + BOM ให้ Excel/Sheets อ่านไทยถูก */
export function expReportCsv(agg: ExperimentsAggregate): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [EXP_HEADERS.map(esc).join(',')];
  for (const r of expRows(agg)) lines.push(r.map(esc).join(','));
  return '﻿' + lines.join('\r\n');
}

/** TSV — คัดลอกวางใน Google Sheets ลงช่องอัตโนมัติ */
export function expReportTsv(agg: ExperimentsAggregate): string {
  const clean = (v: string | number) => String(v ?? '').replace(/[\t\n\r]/g, ' ');
  const lines = [EXP_HEADERS.join('\t')];
  for (const r of expRows(agg)) lines.push(r.map(clean).join('\t'));
  return lines.join('\n');
}
