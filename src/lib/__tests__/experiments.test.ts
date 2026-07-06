import { describe, it, expect } from 'vitest';
import {
  EXPERIMENTS, variantFor, recordPulse, todayPulse, pulseSummary,
  aggregateExperiments, expReportCsv, expReportTsv, defaultExperiments, type ExperimentsState,
} from '../experiments';

const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const today = dayStr(Date.now());

describe('experiments — defaults & consent', () => {
  it('ค่าเริ่มต้นปิด (opt-in) และยังไม่เห็น consent', () => {
    const s = defaultExperiments();
    expect(s.enabled).toBe(false);
    expect(s.seenConsent).toBe(false);
    expect(s.pulses).toEqual([]);
  });
});

describe('variantFor — deterministic assignment', () => {
  const exp = EXPERIMENTS[0];
  it('uid เดิม → variant เดิมเสมอ', () => {
    const s: ExperimentsState = { enabled: true, seenConsent: true, uid: 'uid-abc' };
    const a = variantFor(s, exp);
    const b = variantFor(s, exp);
    expect(a.id).toBe(b.id);
  });
  it('assignment ที่ล็อกไว้ชนะการคำนวณจาก uid', () => {
    const other = exp.variants.find(v => v.id !== variantFor({ enabled: true, seenConsent: true, uid: 'x' }, exp).id)!;
    const s: ExperimentsState = { enabled: true, seenConsent: true, uid: 'x', assignments: { [exp.id]: other.id } };
    expect(variantFor(s, exp).id).toBe(other.id);
  });
  it('uid ต่างกันกระจายทั้งสองกลุ่ม (ไม่เอนไปกลุ่มเดียว)', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const v = variantFor({ enabled: true, seenConsent: true, uid: 'user-' + i }, exp);
      counts[v.id] = (counts[v.id] ?? 0) + 1;
    }
    for (const v of exp.variants) expect(counts[v.id] ?? 0).toBeGreaterThan(0);
  });
});

describe('recordPulse / pulseSummary', () => {
  it('บันทึก pulse วันนี้ และทับของวันเดียวกัน (1 ครั้ง/วัน)', () => {
    let s = defaultExperiments();
    s = recordPulse(s, 2);
    s = recordPulse(s, 3);
    expect(s.pulses).toHaveLength(1);
    expect(todayPulse(s)?.score).toBe(3);
  });
  it('สรุปคะแนนเฉลี่ยและ breakdown ถูกต้อง', () => {
    const s: ExperimentsState = {
      enabled: true, seenConsent: true,
      pulses: [
        { day: '2026-07-01', score: 3 },
        { day: '2026-07-02', score: 1 },
        { day: '2026-07-03', score: 2 },
      ],
    };
    const sum = pulseSummary(s);
    expect(sum.n).toBe(3);
    expect(sum.avg).toBeCloseTo(2);
    expect(sum.good).toBe(1);
    expect(sum.bad).toBe(1);
  });
});

describe('aggregateExperiments — รวมผลข้ามผู้ใช้', () => {
  const exp = EXPERIMENTS[0];
  const [vA, vB] = exp.variants;

  it('นับเฉพาะ workspace ที่ยินยอม (enabled)', () => {
    const agg = aggregateExperiments([
      { enabled: false, seenConsent: true, assignments: { [exp.id]: vA.id } },
      undefined,
      { enabled: true, seenConsent: true, assignments: { [exp.id]: vA.id } },
    ]);
    expect(agg.total).toBe(3);
    expect(agg.optIn).toBe(1);
  });

  it('activationRate และ pulseAvg แยกตาม variant', () => {
    const states: ExperimentsState[] = [
      // variant A: 2 คน, 1 activate, pulses เฉลี่ยสูง
      { enabled: true, seenConsent: true, assignments: { [exp.id]: vA.id }, activations: [exp.id], pulses: [{ day: today, score: 3 }] },
      { enabled: true, seenConsent: true, assignments: { [exp.id]: vA.id }, activations: [], pulses: [{ day: today, score: 3 }] },
      // variant B: 2 คน, 0 activate, pulses ต่ำ
      { enabled: true, seenConsent: true, assignments: { [exp.id]: vB.id }, activations: [], pulses: [{ day: today, score: 1 }] },
      { enabled: true, seenConsent: true, assignments: { [exp.id]: vB.id }, activations: [], pulses: [{ day: today, score: 1 }] },
    ];
    const agg = aggregateExperiments(states);
    const rep = agg.reports.find(r => r.experiment === exp.id)!;
    const a = rep.variants.find(v => v.variant === vA.id)!;
    const b = rep.variants.find(v => v.variant === vB.id)!;
    expect(a.exposed).toBe(2);
    expect(a.activationRate).toBe(50);
    expect(a.pulseAvg).toBeCloseTo(3);
    expect(b.activationRate).toBe(0);
    expect(b.pulseAvg).toBeCloseTo(1);
    expect(rep.winner).toBe(vA.id); // A activation สูงกว่า → ชนะ
  });

  it('ไม่มีผู้เข้าร่วม → optIn 0, ไม่มีผู้ชนะ', () => {
    const agg = aggregateExperiments([undefined, { enabled: false, seenConsent: false }]);
    expect(agg.optIn).toBe(0);
    expect(agg.reports[0].winner).toBeUndefined();
  });

  it('รายงานครบทุกการทดลองในคลัง', () => {
    const agg = aggregateExperiments([]);
    expect(agg.reports).toHaveLength(EXPERIMENTS.length);
  });
});

describe('registry — ทุกการทดลองมี 2 กลุ่ม + field ครบ', () => {
  it('อย่างน้อย 2 การทดลอง แต่ละอันมี ≥2 variant + question', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(2);
    for (const e of EXPERIMENTS) {
      expect(e.question).toBeTruthy();
      expect(e.variants.length).toBeGreaterThanOrEqual(2);
      for (const v of e.variants) {
        expect(v.label && v.headline && v.cta).toBeTruthy();
      }
    }
  });
});

describe('export ผล A/B', () => {
  const exp = EXPERIMENTS[0];
  const agg = aggregateExperiments([
    { enabled: true, seenConsent: true, assignments: { [exp.id]: exp.variants[0].id }, activations: [exp.id], pulses: [{ day: today, score: 3 }] },
  ]);
  it('CSV มี BOM + header + 1 แถวต่อ variant ต่อการทดลอง', () => {
    const csv = expReportCsv(agg);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const rows = csv.split('\r\n');
    const totalVariants = EXPERIMENTS.reduce((s, e) => s + e.variants.length, 0);
    expect(rows.length).toBe(1 + totalVariants); // header + variants
  });
  it('TSV คั่นด้วยแท็บ', () => {
    const tsv = expReportTsv(agg);
    expect(tsv.split('\n')[0]).toContain('\t');
  });
});
