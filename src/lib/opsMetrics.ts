// opsMetrics.ts — ออกแบบ "แบบฟอร์มบันทึกข้อมูลการดำเนินงาน" ต่อธุรกิจ (อ้างอิง BMC + ประเภทธุรกิจ)
// + ประเมินสมรรถนะจากข้อมูลที่ผู้ใช้กรอก/อัปโหลด · pure + deterministic → เทสต์ได้
// แนวคิด: ปิดลูป BMC (วางแผน → ลงมือ → วัดผล) ด้วยตัวชี้วัดที่มาจากบล็อก BMC ของผู้ใช้เอง

import type { BMCData } from '../types';

export type MetricKind = 'currency' | 'count' | 'percent' | 'number';
export type Cadence = 'daily' | 'weekly';

export interface OpsMetric {
  key: string;            // คีย์คงที่ (ใช้ใน values + CSV header)
  label: string;          // ป้ายแสดง
  unit: string;           // หน่วย
  cadence: Cadence;       // ความถี่ที่ควรบันทึก
  block: string;          // บล็อก BMC ที่มา (revenue/segments/…) หรือ 'industry'/'derived'
  kind: MetricKind;
  hint?: string;          // คำอธิบายสั้น
  /** 🔑 ตัววัดนี้เฝ้าอะไรอยู่ — คุณค่า/ความเสี่ยงที่มันบอกได้
   *  มาตรฐานเดียวกับ `processRegister.ProcessMetric.whyFrom` (ข้อ 9.1)
   *  บังคับ (ไม่ใช่ `?`) เพราะ **ตัววัดที่ตอบไม่ได้ว่ามาจากอะไร = KPI ลอย ๆ**
   *  — เดิมไฟล์นี้แจก KPI สำเร็จรูปโดยไม่มีช่องนี้ ซึ่งขัดกับ processRegister ในผลิตภัณฑ์เดียวกัน */
  whyFrom: string;
}

export interface OpsEntry {
  date: string;                     // YYYY-MM-DD
  values: Record<string, number>;   // key → ค่า
}

const first = (arr?: string[]) => (arr && arr.length ? arr[0] : '');

/** อักษรหมวด DBD (เช่น "[C] การผลิต" → "C") */
function sectorLetter(industry?: string): string {
  const m = (industry ?? '').match(/\[([A-Z])\]/);
  return m ? m[1] : '';
}

/** สร้างชุดตัวชี้วัดจาก BMC + ประเภทธุรกิจ — bounded ~6-9 ตัว, deterministic */
export function buildMetricSchema(bmc: Partial<BMCData> | undefined, industry?: string): OpsMetric[] {
  const m: OpsMetric[] = [];

  // รายได้ (revenue block) — ยอดขายรวม + สตรีมหลัก
  m.push({ key: 'revenue_total', label: 'ยอดขาย/รายได้รวม', unit: 'บาท', cadence: 'daily', block: 'revenue', kind: 'currency', hint: 'ยอดขายรวมของวัน', whyFrom: 'คุณค่า: เงินที่ธุรกิจรับเข้าจริง — ตัวเลขที่ทุกการตัดสินใจอ้างกลับมาหา' });
  const rev = first(bmc?.revenue);
  if (rev) m.push({ key: 'revenue_main', label: `รายได้: ${rev}`.slice(0, 40), unit: 'บาท', cadence: 'daily', block: 'revenue', kind: 'currency', whyFrom: 'คุณค่า: สตรีมรายได้หลักที่ BMC บอกว่าธุรกิจพึ่งพา — ถ้าตัวนี้ตก ตัวรวมจะตกตาม' });

  // ลูกค้า (segments block)
  m.push({ key: 'customers_new', label: 'ลูกค้าใหม่', unit: 'ราย', cadence: 'daily', block: 'segments', kind: 'count', whyFrom: 'ความเสี่ยง: ธุรกิจโตจากลูกค้าเดิมอย่างเดียวไม่ได้ — ลูกค้าใหม่หยุดคือสัญญาณก่อนรายได้ตก' });
  m.push({ key: 'customers_return', label: 'ลูกค้าเก่ากลับมา', unit: 'ราย', cadence: 'weekly', block: 'segments', kind: 'count', whyFrom: 'คุณค่า: คนที่กลับมาซื้อซ้ำ = หลักฐานว่าสินค้าแก้ปัญหาได้จริง ไม่ใช่แค่ขายเก่ง' });

  // กิจกรรมหลัก (activities block) — หน่วยที่ส่งมอบ
  const act = first(bmc?.activities);
  m.push({ key: 'units_delivered', label: act ? `ปริมาณ: ${act}`.slice(0, 40) : 'หน่วยที่ผลิต/ให้บริการ', unit: 'หน่วย', cadence: 'daily', block: 'activities', kind: 'count', whyFrom: 'ความเสี่ยง: ส่งมอบไม่ทัน/ไม่ครบ กระทบทั้งรายได้และความเชื่อมั่น' });

  // ต้นทุน (costs block)
  m.push({ key: 'cost_variable', label: 'ต้นทุนผันแปร (วัตถุดิบ/ของ)', unit: 'บาท', cadence: 'daily', block: 'costs', kind: 'currency', whyFrom: 'ความเสี่ยง: ต้นทุนโตเร็วกว่ารายได้ = ขายดีแต่ขาดทุน ซึ่งมองไม่เห็นจากยอดขายอย่างเดียว' });

  // ช่องทาง (channels block) — ถ้ามี
  if (first(bmc?.channels)) {
    m.push({ key: 'leads_channel', label: `ลูกค้า/ลีดจาก: ${first(bmc?.channels)}`.slice(0, 40), unit: 'ราย', cadence: 'weekly', block: 'channels', kind: 'count', whyFrom: 'คุณค่า: ช่องทางที่ BMC บอกว่าใช้เข้าถึงลูกค้า — ต้องรู้ว่ามันยังพาคนมาอยู่ไหม' });
  }

  // ความสัมพันธ์ (relationships) — ความพึงพอใจ
  m.push({ key: 'satisfaction', label: 'ความพึงพอใจลูกค้า (0-5)', unit: 'คะแนน', cadence: 'weekly', block: 'relationships', kind: 'number', hint: 'เฉลี่ยจากรีวิว/สอบถาม', whyFrom: 'ความเสี่ยง: ความไม่พอใจมาก่อนการเลิกซื้อเสมอ และมาก่อนรายได้ตกหลายสัปดาห์' });

  // เฉพาะหมวดธุรกิจ
  const sec = sectorLetter(industry);
  if (sec === 'C') { // การผลิต
    m.push({ key: 'defect_rate', label: 'ของเสีย (%)', unit: '%', cadence: 'daily', block: 'industry', kind: 'percent', whyFrom: 'ความเสี่ยง: ของเสียหลุดถึงลูกค้า กระทบทั้งต้นทุนและความเชื่อมั่น' });
    m.push({ key: 'downtime_hr', label: 'เวลาเครื่องหยุด', unit: 'ชม.', cadence: 'daily', block: 'industry', kind: 'number', whyFrom: 'ความเสี่ยง: เครื่องหยุด = กำลังผลิตหายโดยที่ต้นทุนคงที่ยังเดินอยู่' });
  } else if (sec === 'G') { // ค้าปลีก/ส่ง
    m.push({ key: 'stock_value', label: 'มูลค่าสินค้าคงคลัง', unit: 'บาท', cadence: 'weekly', block: 'industry', kind: 'currency', whyFrom: 'ความเสี่ยง: เงินจมในสต็อก — กำไรทางบัญชีมีแต่เงินสดไม่มี' });
  } else if (sec === 'I') { // ที่พัก/อาหาร
    m.push({ key: 'waste', label: 'ของเสีย/ทิ้ง', unit: 'บาท', cadence: 'daily', block: 'industry', kind: 'currency', whyFrom: 'ความเสี่ยง: ของทิ้งคือต้นทุนที่จ่ายไปแล้วโดยไม่มีรายได้กลับมา' });
  }

  return m;
}

/* ── ประเมินสมรรถนะ ── */
/* ── เกณฑ์ขั้นต่ำก่อน "สรุป" ────────────────────────────────────────────────
 * 🔴 ความผิดที่กัน: เดิม score เริ่มที่ 60 แล้ว UI แสดงทันที ⇒ ผู้ใช้เปิดหน้ามา
 *    เห็น "สมรรถนะธุรกิจ 60/100" ตั้งแต่ยังไม่ได้กรอกอะไรเลยสักแถว
 *    ขัดกฎของโปรเจกต์เอง: ตรวจไม่ได้ ≠ 0 · ห้ามสรุปเมื่อตัวอย่างไม่พอ
 *
 * ⚠️ ทำไมไม่ใช้ MIN_FOR_RATE (=100) ของ growthPdca: นั่นเป็นเกณฑ์ของ **อัตราส่วน**
 *    จากผู้เข้าชมนิรนามจำนวนมาก · ที่นี่เป็น **อนุกรมเวลาของธุรกิจเดียว** คนละชนิดกัน
 *    จึงตั้งเกณฑ์ของตัวเองพร้อมเหตุผล ไม่ใช่ลอกตัวเลขข้ามความหมาย
 * ─────────────────────────────────────────────────────────────────────────── */

/** ต่ำกว่านี้ห้ามพูดคำว่า "แนวโน้ม" — 2 จุดคือการเทียบครั้งเดียว ซึ่งแยกความผันผวน
 *  รายวันออกจากทิศทางไม่ได้เลย (บทเรียนเดียวกับ ledger #42: % ที่ไม่รู้ฐาน) */
export const MIN_ENTRIES_FOR_TREND = 3;

/** ต่ำกว่านี้ห้ามให้คะแนนรวม — คะแนนเดียวที่สรุปทั้งธุรกิจต้องยืนบนข้อมูลมากกว่าแนวโน้ม */
export const MIN_ENTRIES_FOR_SCORE = 4;

export interface MetricEval {
  key: string; label: string; unit: string; kind: MetricKind;
  latest: number | null; avg: number;
  /** % เทียบค่าก่อนหน้า · **null = จุดข้อมูลไม่พอจะเรียกว่าแนวโน้ม** ไม่ใช่ 0 */
  trendPct: number | null;
  dir: 'up' | 'down' | 'flat' | 'unknown';
  /** ตัววัดนี้เฝ้าอะไรอยู่ — ส่งต่อจาก schema เพื่อให้ UI ตอบผู้ตรวจได้โดยไม่ต้องเดา */
  whyFromShort: string;
}
export interface PerfReport {
  metrics: MetricEval[];
  summary: string[];   // ข้อสังเกตเชิงลงมือ
  /** 0-100 สุขภาพรวม (heuristic) · **null = ยังประเมินไม่ได้** ห้ามแปลงเป็น 0 หรือ 60 */
  score: number | null;
  /** ยังต้องบันทึกอีกกี่ครั้งถึงจะให้คะแนนได้ (0 = ให้คะแนนได้แล้ว) */
  needMoreEntries: number;
  entriesUsed: number;
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** ประเมินจาก entries (เรียงตามวันที่) เทียบตัวชี้วัดตาม schema */
export function evaluatePerformance(schema: OpsMetric[], entries: OpsEntry[]): PerfReport {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const metrics: MetricEval[] = schema.map(mt => {
    const series = sorted
      .map(e => e.values[mt.key])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const latest = series.length ? series[series.length - 1] : null;
    const prev = series.length > 1 ? series[series.length - 2] : null;
    const avg = series.length ? round(series.reduce((s, v) => s + v, 0) / series.length) : 0;
    // 🔴 จุดข้อมูลไม่ถึงเกณฑ์ = ไม่มีแนวโน้มให้พูดถึง (null ไม่ใช่ 0 — 0 แปลว่า "ทรงตัว" ซึ่งเป็นคำโกหก)
    const enough = series.length >= MIN_ENTRIES_FOR_TREND;
    const trendPct = enough && latest != null && prev != null && prev !== 0
      ? round(((latest - prev) / Math.abs(prev)) * 100)
      : null;
    const dir: MetricEval['dir'] = trendPct == null ? 'unknown'
      : trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'flat';
    return { key: mt.key, label: mt.label, unit: mt.unit, kind: mt.kind, latest, avg, trendPct, dir, whyFromShort: mt.whyFrom };
  });

  const summary: string[] = [];
  const byKey = (k: string) => metrics.find(x => x.key === k);
  const rev = byKey('revenue_total');
  const cost = byKey('cost_variable');
  // dir เป็น 'unknown' เมื่อจุดข้อมูลไม่พอ ⇒ ไม่พูดเรื่องแนวโน้มเลย ดีกว่าพูดผิด
  if (rev?.latest != null && rev.trendPct != null) {
    if (rev.dir === 'up') summary.push(`📈 รายได้ล่าสุดโตขึ้น ${rev.trendPct}% จากครั้งก่อน`);
    else if (rev.dir === 'down') summary.push(`📉 รายได้ล่าสุดลดลง ${Math.abs(rev.trendPct)}% — ตรวจช่องทาง/โปรโมชัน`);
  }
  if (rev?.latest != null && cost?.latest != null) {
    const gross = rev.latest - cost.latest;
    const margin = rev.latest ? round((gross / rev.latest) * 100) : 0;
    summary.push(gross >= 0
      ? `💰 กำไรขั้นต้นล่าสุด ~${gross.toLocaleString()} บาท (มาร์จิน ${margin}%)`
      : `⚠️ ต้นทุนผันแปรสูงกว่ารายได้ล่าสุด ${Math.abs(gross).toLocaleString()} บาท`);
    if (cost.dir === 'up' && (rev.dir !== 'up')) summary.push('⚠️ ต้นทุนโตเร็วกว่ารายได้ — คุมต้นทุน/ตั้งราคาใหม่');
  }
  const defect = byKey('defect_rate');
  if (defect?.latest != null && defect.latest > 5) summary.push(`🔧 ของเสีย ${defect.latest}% สูงกว่าเกณฑ์ 5% — ทบทวนกระบวนการผลิต`);
  const sat = byKey('satisfaction');
  if (sat?.latest != null && sat.latest < 3.5) summary.push(`🙁 ความพึงพอใจ ${sat.latest}/5 ต่ำ — เก็บ feedback เชิงลึก`);
  const needMoreEntries = Math.max(0, MIN_ENTRIES_FOR_SCORE - sorted.length);
  if (!summary.length) {
    summary.push(needMoreEntries > 0
      ? `บันทึกอีก ${needMoreEntries} ครั้ง ระบบถึงจะประเมินสมรรถนะให้ได้`
      : 'ยังไม่พบสัญญาณที่ต้องลงมือ — บันทึกต่อเนื่องเพื่อให้อ่านแนวโน้มได้แม่นขึ้น');
  }

  // 🔴 ข้อมูลไม่ถึงเกณฑ์ = **ยังประเมินไม่ได้** ห้ามคืนเลขตั้งต้นให้ดูเหมือนมีคำตอบ
  //    (เดิมคืน 60 เสมอ ⇒ หน้าจอโชว์ "60/100" ตั้งแต่ยังไม่มีข้อมูลสักแถว)
  if (needMoreEntries > 0) {
    return { metrics, summary, score: null, needMoreEntries, entriesUsed: sorted.length };
  }

  // score heuristic: เริ่ม 60 + โบนัสรายได้โต/กำไรบวก/พึงพอใจดี − โทษของเสีย/ขาดทุน
  let score = 60;
  if (rev?.dir === 'up') score += 12; else if (rev?.dir === 'down') score -= 10;
  if (rev?.latest != null && cost?.latest != null) score += rev.latest - cost.latest >= 0 ? 12 : -15;
  if (sat?.latest != null) score += sat.latest >= 4 ? 8 : sat.latest < 3 ? -8 : 0;
  if (defect?.latest != null && defect.latest > 5) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { metrics, summary, score, needMoreEntries: 0, entriesUsed: sorted.length };
}

/* ── สะพานเชื่อม Ops → CFO/เมือง: สรุปตัวเลขการเงินจากผลดำเนินงานจริง ── */
export interface OpsFinanceBridge {
  days: number;            // จำนวนวันที่มีข้อมูลรายได้
  revenue: number;         // รวมรายได้ (revenue_total)
  cost: number;            // รวมต้นทุนผันแปร (cost_variable)
  gross: number;           // กำไรขั้นต้น
  margin: number;          // %
  avgDailyRevenue: number;
  note: string;            // ข้อความให้ CFO/เมืองใช้
}

/** สรุปผลดำเนินงานเป็นตัวเลขการเงิน — ให้ CFO วิเคราะห์ + เมืองเติบโตจาก "ตัวเลขจริง" */
export function opsFinanceBridge(entries: OpsEntry[]): OpsFinanceBridge {
  const rev = entries.map(e => e.values.revenue_total).filter((v): v is number => typeof v === 'number');
  const cost = entries.map(e => e.values.cost_variable).filter((v): v is number => typeof v === 'number');
  const revenue = rev.reduce((s, v) => s + v, 0);
  const totalCost = cost.reduce((s, v) => s + v, 0);
  const gross = revenue - totalCost;
  const margin = revenue > 0 ? round((gross / revenue) * 100) : 0;
  const days = rev.length;
  const avgDailyRevenue = days ? round(revenue / days) : 0;
  const note = days === 0
    ? 'ยังไม่มีข้อมูลผลดำเนินงานรายวัน — เริ่มบันทึกในหน้าโรงงานอัจฉริยะเพื่อให้ CFO วิเคราะห์จากตัวเลขจริง'
    : `จากผลดำเนินงาน ${days} วัน: รายได้รวม ฿${revenue.toLocaleString()} · กำไรขั้นต้น ฿${gross.toLocaleString()} (มาร์จิน ${margin}%) · เฉลี่ย ฿${avgDailyRevenue.toLocaleString()}/วัน`;
  return { days, revenue, cost: totalCost, gross, margin, avgDailyRevenue, note };
}

/* ── CSV (เทมเพลตให้โหลด + parse ไฟล์ที่อัปกลับ) ── */
export function csvTemplate(schema: OpsMetric[]): string {
  const header = ['date', ...schema.map(m => m.key)].join(',');
  const labelRow = ['# วันที่ (YYYY-MM-DD)', ...schema.map(m => `${m.label} (${m.unit})`)].join(',');
  return `${header}\n${labelRow}\n`;
}

/** parse CSV → OpsEntry[] (ข้ามบรรทัด comment #, จับเฉพาะคีย์ที่อยู่ใน schema) */
export function parseOpsCsv(text: string, schema: OpsMetric[]): OpsEntry[] {
  const keys = new Set(schema.map(m => m.key));
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const out: OpsEntry[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const dateIdx = header.indexOf('date');
    const date = (cells[dateIdx] ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const values: Record<string, number> = {};
    header.forEach((h, i) => {
      if (h === 'date' || !keys.has(h)) return;
      const n = Number((cells[i] ?? '').trim());
      if (!Number.isNaN(n) && (cells[i] ?? '').trim() !== '') values[h] = n;
    });
    if (Object.keys(values).length) out.push({ date, values });
  }
  return out;
}
