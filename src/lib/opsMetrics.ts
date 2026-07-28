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
  m.push({ key: 'revenue_total', label: 'ยอดขาย/รายได้รวม', unit: 'บาท', cadence: 'daily', block: 'revenue', kind: 'currency', hint: 'ยอดขายรวมของวัน' });
  const rev = first(bmc?.revenue);
  if (rev) m.push({ key: 'revenue_main', label: `รายได้: ${rev}`.slice(0, 40), unit: 'บาท', cadence: 'daily', block: 'revenue', kind: 'currency' });

  // ลูกค้า (segments block)
  m.push({ key: 'customers_new', label: 'ลูกค้าใหม่', unit: 'ราย', cadence: 'daily', block: 'segments', kind: 'count' });
  m.push({ key: 'customers_return', label: 'ลูกค้าเก่ากลับมา', unit: 'ราย', cadence: 'weekly', block: 'segments', kind: 'count' });

  // กิจกรรมหลัก (activities block) — หน่วยที่ส่งมอบ
  const act = first(bmc?.activities);
  m.push({ key: 'units_delivered', label: act ? `ปริมาณ: ${act}`.slice(0, 40) : 'หน่วยที่ผลิต/ให้บริการ', unit: 'หน่วย', cadence: 'daily', block: 'activities', kind: 'count' });

  // ต้นทุน (costs block)
  m.push({ key: 'cost_variable', label: 'ต้นทุนผันแปร (วัตถุดิบ/ของ)', unit: 'บาท', cadence: 'daily', block: 'costs', kind: 'currency' });

  // ช่องทาง (channels block) — ถ้ามี
  if (first(bmc?.channels)) {
    m.push({ key: 'leads_channel', label: `ลูกค้า/ลีดจาก: ${first(bmc?.channels)}`.slice(0, 40), unit: 'ราย', cadence: 'weekly', block: 'channels', kind: 'count' });
  }

  // ความสัมพันธ์ (relationships) — ความพึงพอใจ
  m.push({ key: 'satisfaction', label: 'ความพึงพอใจลูกค้า (0-5)', unit: 'คะแนน', cadence: 'weekly', block: 'relationships', kind: 'number', hint: 'เฉลี่ยจากรีวิว/สอบถาม' });

  // เฉพาะหมวดธุรกิจ
  const sec = sectorLetter(industry);
  if (sec === 'C') { // การผลิต
    m.push({ key: 'defect_rate', label: 'ของเสีย (%)', unit: '%', cadence: 'daily', block: 'industry', kind: 'percent' });
    m.push({ key: 'downtime_hr', label: 'เวลาเครื่องหยุด', unit: 'ชม.', cadence: 'daily', block: 'industry', kind: 'number' });
  } else if (sec === 'G') { // ค้าปลีก/ส่ง
    m.push({ key: 'stock_value', label: 'มูลค่าสินค้าคงคลัง', unit: 'บาท', cadence: 'weekly', block: 'industry', kind: 'currency' });
  } else if (sec === 'I') { // ที่พัก/อาหาร
    m.push({ key: 'waste', label: 'ของเสีย/ทิ้ง', unit: 'บาท', cadence: 'daily', block: 'industry', kind: 'currency' });
  }

  return m;
}

/* ── ประเมินสมรรถนะ ── */
export interface MetricEval {
  key: string; label: string; unit: string; kind: MetricKind;
  latest: number | null; avg: number; trendPct: number; // % เทียบค่าก่อนหน้า
  dir: 'up' | 'down' | 'flat';
}
export interface PerfReport {
  metrics: MetricEval[];
  summary: string[];   // ข้อสังเกตเชิงลงมือ
  score: number;       // 0-100 สุขภาพรวม (heuristic)
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
    const trendPct = latest != null && prev != null && prev !== 0 ? round(((latest - prev) / Math.abs(prev)) * 100) : 0;
    const dir: MetricEval['dir'] = trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'flat';
    return { key: mt.key, label: mt.label, unit: mt.unit, kind: mt.kind, latest, avg, trendPct, dir };
  });

  const summary: string[] = [];
  const byKey = (k: string) => metrics.find(x => x.key === k);
  const rev = byKey('revenue_total');
  const cost = byKey('cost_variable');
  if (rev?.latest != null) {
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
  if (!summary.length) summary.push('บันทึกข้อมูลต่อเนื่องอย่างน้อย 2 ครั้งเพื่อให้ระบบประเมินแนวโน้มได้');

  // score heuristic: เริ่ม 60 + โบนัสรายได้โต/กำไรบวก/พึงพอใจดี − โทษของเสีย/ขาดทุน
  let score = 60;
  if (rev?.dir === 'up') score += 12; else if (rev?.dir === 'down') score -= 10;
  if (rev?.latest != null && cost?.latest != null) score += rev.latest - cost.latest >= 0 ? 12 : -15;
  if (sat?.latest != null) score += sat.latest >= 4 ? 8 : sat.latest < 3 ? -8 : 0;
  if (defect?.latest != null && defect.latest > 5) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { metrics, summary, score, entriesUsed: sorted.length };
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
