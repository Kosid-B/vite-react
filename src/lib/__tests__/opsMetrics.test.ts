import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMetricSchema, evaluatePerformance, csvTemplate, parseOpsCsv, opsFinanceBridge, type OpsEntry,
  MIN_ENTRIES_FOR_SCORE, MIN_ENTRIES_FOR_TREND,
} from '../opsMetrics';

const BMC = {
  revenue: ['ขายกาแฟหน้าร้าน'], segments: ['พนักงานออฟฟิศ'], activities: ['ชงกาแฟ'],
  costs: ['เมล็ดกาแฟ'], channels: ['หน้าร้าน'], partners: [], value: [], relationships: [], resources: [],
};

describe('opsMetrics — schema จาก BMC + ประเภทธุรกิจ', () => {
  it('สร้างตัวชี้วัดจาก BMC (รายได้/ลูกค้า/ต้นทุน) + สตรีมหลัก', () => {
    const s = buildMetricSchema(BMC, '[I] ที่พักแรมและบริการด้านอาหาร');
    const keys = s.map(m => m.key);
    expect(keys).toContain('revenue_total');
    expect(keys).toContain('customers_new');
    expect(keys).toContain('cost_variable');
    expect(keys).toContain('revenue_main');       // มาจาก revenue[0]
    expect(keys).toContain('waste');              // เฉพาะหมวด I
    expect(s.find(m => m.key === 'revenue_main')!.label).toContain('ขายกาแฟ');
  });

  it('หมวดการผลิต (C) เพิ่มของเสีย% + downtime', () => {
    const s = buildMetricSchema(BMC, '[C] การผลิต');
    const keys = s.map(m => m.key);
    expect(keys).toContain('defect_rate');
    expect(keys).toContain('downtime_hr');
  });

  it('BMC ว่าง ยังได้ตัวชี้วัดสากล', () => {
    const s = buildMetricSchema(undefined, '');
    expect(s.length).toBeGreaterThanOrEqual(5);
    expect(s.map(m => m.key)).toContain('revenue_total');
  });

  it('มี cadence daily + weekly', () => {
    const s = buildMetricSchema(BMC, '');
    expect(s.some(m => m.cadence === 'daily')).toBe(true);
    expect(s.some(m => m.cadence === 'weekly')).toBe(true);
  });
});

describe('evaluatePerformance', () => {
  const schema = buildMetricSchema(BMC, '');
  const day = (n: number) => `2026-07-${String(n).padStart(2, '0')}`;

  it('คำนวณ latest/avg/trend + กำไรขั้นต้น (ข้อมูลถึงเกณฑ์)', () => {
    const entries: OpsEntry[] = [
      { date: day(1), values: { revenue_total: 1000, cost_variable: 400 } },
      { date: day(2), values: { revenue_total: 1050, cost_variable: 410 } },
      { date: day(3), values: { revenue_total: 1100, cost_variable: 415 } },
      { date: day(4), values: { revenue_total: 1200, cost_variable: 420 } },
    ];
    const r = evaluatePerformance(schema, entries);
    const rev = r.metrics.find(m => m.key === 'revenue_total')!;
    expect(rev.latest).toBe(1200);
    expect(rev.dir).toBe('up');                       // 1100→1200
    expect(r.summary.join(' ')).toContain('กำไรขั้นต้น');
    expect(r.score).not.toBeNull();
    expect(r.score!).toBeGreaterThan(60);             // รายได้โต + กำไรบวก
    expect(r.entriesUsed).toBe(4);
    expect(r.needMoreEntries).toBe(0);
  });

  it('รายได้ตก + ต้นทุน>รายได้ → เตือน + score ต่ำ', () => {
    const entries: OpsEntry[] = [
      { date: day(1), values: { revenue_total: 1000, cost_variable: 300 } },
      { date: day(2), values: { revenue_total: 900, cost_variable: 400 } },
      { date: day(3), values: { revenue_total: 800, cost_variable: 500 } },
      { date: day(4), values: { revenue_total: 500, cost_variable: 700 } },
    ];
    const r = evaluatePerformance(schema, entries);
    expect(r.summary.join(' ')).toMatch(/ลดลง|สูงกว่ารายได้/);
    expect(r.score!).toBeLessThan(60);
  });

  /* ── 🔴 ด่านกัน "ให้คะแนนทั้งที่ยังไม่รู้อะไร" (24 ส.ค. 2569) ──────────────
   * เดิม score เริ่มที่ 60 และ UI แสดงทันที ⇒ ผู้ใช้เห็น "สมรรถนะ 60/100"
   * ตั้งแต่ยังไม่ได้กรอกอะไรเลย · ขัดกฎของโปรเจกต์เอง: ตรวจไม่ได้ ≠ 0
   * ────────────────────────────────────────────────────────────────────── */
  it('🔴 ไม่มีข้อมูลเลย → score ต้องเป็น null ห้ามเป็น 0 หรือ 60', () => {
    const r = evaluatePerformance(schema, []);
    expect(r.score).toBeNull();
    expect(r.needMoreEntries).toBe(MIN_ENTRIES_FOR_SCORE);
    expect(r.summary.join(' ')).toMatch(/บันทึกอีก \d+ ครั้ง/);
  });

  it('🔴 ข้อมูลน้อยกว่าเกณฑ์ → ยังไม่ให้คะแนน และบอกว่าเหลืออีกกี่ครั้ง', () => {
    for (let n = 1; n < MIN_ENTRIES_FOR_SCORE; n++) {
      const entries: OpsEntry[] = Array.from({ length: n }, (_, i) => ({
        date: day(i + 1), values: { revenue_total: 1000 + i * 100, cost_variable: 400 },
      }));
      const r = evaluatePerformance(schema, entries);
      expect(r.score, `${n} แถวไม่ควรได้คะแนน`).toBeNull();
      expect(r.needMoreEntries).toBe(MIN_ENTRIES_FOR_SCORE - n);
    }
  });

  it('🔴 2 จุดข้อมูล = การเทียบครั้งเดียว ห้ามเรียกว่าแนวโน้ม (trendPct = null)', () => {
    const entries: OpsEntry[] = [
      { date: day(1), values: { revenue_total: 1000 } },
      { date: day(2), values: { revenue_total: 1400 } },   // +40% ซึ่งเป็นความผันผวนรายวันปกติ
    ];
    const rev = evaluatePerformance(schema, entries).metrics.find(m => m.key === 'revenue_total')!;
    expect(rev.trendPct).toBeNull();
    expect(rev.dir).toBe('unknown');
    // และต้องไม่มีประโยคเรื่องแนวโน้มหลุดออกไป
    expect(evaluatePerformance(schema, entries).summary.join(' ')).not.toMatch(/โตขึ้น|ลดลง/);
  });

  it('ครบเกณฑ์แนวโน้มแล้ว จึงเริ่มพูดเรื่องทิศทางได้', () => {
    const entries: OpsEntry[] = Array.from({ length: MIN_ENTRIES_FOR_TREND }, (_, i) => ({
      date: day(i + 1), values: { revenue_total: 1000 + i * 100 },
    }));
    const rev = evaluatePerformance(schema, entries).metrics.find(m => m.key === 'revenue_total')!;
    expect(rev.trendPct).not.toBeNull();
    expect(rev.dir).toBe('up');
  });

  it('เกณฑ์คะแนนต้องเข้มกว่าหรือเท่ากับเกณฑ์แนวโน้ม — คะแนนสรุปทั้งธุรกิจ', () => {
    expect(MIN_ENTRIES_FOR_SCORE).toBeGreaterThanOrEqual(MIN_ENTRIES_FOR_TREND);
    expect(MIN_ENTRIES_FOR_TREND).toBeGreaterThan(2);
  });
});

/* ── B: ตัววัดทุกตัวต้องตอบได้ว่ามาจากอะไร (มาตรฐานเดียวกับ processRegister) ── */
describe('🔴 whyFrom — ห้ามแจก KPI ลอย ๆ', () => {
  it('ทุกตัววัดที่ระบบสร้างให้ ต้องบอกได้ว่าเฝ้าคุณค่า/ความเสี่ยงอะไร', () => {
    for (const industry of ['', '[C] การผลิต', '[G] ค้าปลีก', '[I] ที่พักและอาหาร']) {
      for (const mt of buildMetricSchema(BMC, industry)) {
        expect(mt.whyFrom?.trim().length, `${industry} · ${mt.key} ไม่มี whyFrom`).toBeGreaterThan(20);
        expect(mt.whyFrom, `${mt.key} ต้องบอกว่าเป็นคุณค่าหรือความเสี่ยง`).toMatch(/คุณค่า|ความเสี่ยง/);
      }
    }
  });

  it('BMC ว่างก็ยังต้องมี whyFrom ครบ — ไม่มีทางลัด', () => {
    for (const mt of buildMetricSchema(undefined, '')) {
      expect(mt.whyFrom?.trim(), mt.key).toBeTruthy();
    }
  });

  it('เหตุผลต้องเดินทางไปถึงหน้าจอ ไม่ใช่ค้างอยู่ใน schema', () => {
    const schema = buildMetricSchema(BMC, '');
    const r = evaluatePerformance(schema, [{ date: '2026-07-01', values: { revenue_total: 1000 } }]);
    const rev = r.metrics.find(m => m.key === 'revenue_total')!;
    expect(rev.whyFromShort).toBe(schema.find(m => m.key === 'revenue_total')!.whyFrom);
  });

  it('ใช้มาตรฐานเดียวกับ processRegister — ชื่อช่องต้องตรงกัน ไม่ใช่คิดใหม่', () => {
    const reg = readFileSync(resolve(__dirname, '../processRegister.ts'), 'utf8');
    expect(reg).toMatch(/whyFrom\?: string;/);
  });
});

describe('opsFinanceBridge (Ops → CFO/เมือง)', () => {
  it('รวมรายได้/ต้นทุน + กำไรขั้นต้น + มาร์จิน + เฉลี่ย/วัน', () => {
    const b = opsFinanceBridge([
      { date: '2026-07-01', values: { revenue_total: 1000, cost_variable: 400 } },
      { date: '2026-07-02', values: { revenue_total: 1500, cost_variable: 600 } },
    ]);
    expect(b.days).toBe(2);
    expect(b.revenue).toBe(2500);
    expect(b.cost).toBe(1000);
    expect(b.gross).toBe(1500);
    expect(b.margin).toBe(60);
    expect(b.avgDailyRevenue).toBe(1250);
    expect(b.note).toContain('มาร์จิน 60%');
  });
  it('ไม่มีข้อมูล → note ชวนเริ่มบันทึก', () => {
    const b = opsFinanceBridge([]);
    expect(b.days).toBe(0);
    expect(b.note).toContain('เริ่มบันทึก');
  });
});

describe('CSV template + parse', () => {
  const schema = buildMetricSchema(BMC, '');
  it('เทมเพลตมี header date + keys', () => {
    const t = csvTemplate(schema);
    expect(t.split('\n')[0]).toContain('date');
    expect(t.split('\n')[0]).toContain('revenue_total');
  });

  it('parse ข้าม comment + จับเฉพาะคีย์ใน schema + ต้องมีวันที่ถูกรูปแบบ', () => {
    const csv = 'date,revenue_total,cost_variable,junk\n# comment\n2026-07-01,1000,400,999\nbad-date,5,5,5';
    const rows = parseOpsCsv(csv, schema);
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe('2026-07-01');
    expect(rows[0].values.revenue_total).toBe(1000);
    expect(rows[0].values).not.toHaveProperty('junk');   // คีย์นอก schema ถูกตัด
  });
});
