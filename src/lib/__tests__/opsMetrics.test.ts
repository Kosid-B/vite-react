import { describe, it, expect } from 'vitest';
import {
  buildMetricSchema, evaluatePerformance, csvTemplate, parseOpsCsv, opsFinanceBridge, type OpsEntry,
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
  it('คำนวณ latest/avg/trend + กำไรขั้นต้น', () => {
    const entries: OpsEntry[] = [
      { date: '2026-07-01', values: { revenue_total: 1000, cost_variable: 400 } },
      { date: '2026-07-02', values: { revenue_total: 1200, cost_variable: 420 } },
    ];
    const r = evaluatePerformance(schema, entries);
    const rev = r.metrics.find(m => m.key === 'revenue_total')!;
    expect(rev.latest).toBe(1200);
    expect(rev.avg).toBe(1100);
    expect(rev.dir).toBe('up');                       // 1000→1200
    expect(r.summary.join(' ')).toContain('กำไรขั้นต้น');
    expect(r.score).toBeGreaterThan(60);              // รายได้โต + กำไรบวก
    expect(r.entriesUsed).toBe(2);
  });

  it('รายได้ตก + ต้นทุน>รายได้ → เตือน + score ต่ำ', () => {
    const entries: OpsEntry[] = [
      { date: '2026-07-01', values: { revenue_total: 1000, cost_variable: 300 } },
      { date: '2026-07-02', values: { revenue_total: 500, cost_variable: 700 } },
    ];
    const r = evaluatePerformance(schema, entries);
    expect(r.summary.join(' ')).toMatch(/ลดลง|สูงกว่ารายได้/);
    expect(r.score).toBeLessThan(60);
  });

  it('ไม่มีข้อมูลพอ → ข้อความชวนบันทึกต่อ', () => {
    const r = evaluatePerformance(schema, []);
    expect(r.summary.join(' ')).toContain('บันทึกข้อมูลต่อเนื่อง');
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
