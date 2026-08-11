import { describe, it, expect } from 'vitest';
import {
  landingVariant, showNewSections, landingAbStats, landingAbVerdict,
  MIN_SAMPLE_PER_ARM, CONTROL_SHARE,
} from '../landingAb';

describe('landingAb — assignment', () => {
  it('deterministic: session เดิม → กลุ่มเดิมเสมอ', () => {
    const a = landingVariant('sess-123');
    const b = landingVariant('sess-123');
    expect(a).toBe(b);
    expect(['control', 'show']).toContain(a);
  });

  it('แบ่งกลุ่มใกล้ 50/50 เมื่อ CONTROL_SHARE=0.5 (กระจายพอควรบน 4000 session)', () => {
    let show = 0;
    for (let i = 0; i < 4000; i++) if (landingVariant('s' + i) === 'show') show++;
    const pct = show / 4000;
    expect(pct).toBeGreaterThan(0.4);
    expect(pct).toBeLessThan(0.6);
    expect(CONTROL_SHARE).toBe(0.5);
  });

  it('controlShare=1 → ทุกคน control · =0 → ทุกคน show', () => {
    expect(landingVariant('x', 1)).toBe('control');
    expect(landingVariant('x', 0)).toBe('show');
  });

  it('showNewSections', () => {
    expect(showNewSections('show')).toBe(true);
    expect(showNewSections('control')).toBe(false);
  });
});

describe('landingAb — stats', () => {
  it('คำนวณ signupRate/ctaRate ต่อกลุ่ม + เรียง show ก่อน control', () => {
    const stats = landingAbStats({
      control: { total: 200, signup: 4, cta: 20 },
      show: { total: 200, signup: 10, cta: 40 },
    });
    expect(stats[0].variant).toBe('show');
    expect(stats[0].signupRate).toBe(5);
    expect(stats[1].variant).toBe('control');
    expect(stats[1].signupRate).toBe(2);
    expect(stats[0].ctaRate).toBe(20);
  });

  it('ทน null/empty + total=0', () => {
    expect(landingAbStats(null)).toEqual([]);
    const s = landingAbStats({ show: { total: 0, signup: 0 } });
    expect(s[0].signupRate).toBe(0);
  });
});

describe('landingAb — verdict', () => {
  it('ยังไม่พอสรุปเมื่อ sample ต่ำกว่าเกณฑ์', () => {
    const v = landingAbVerdict({ show: { total: 5, signup: 1 }, control: { total: 5, signup: 0 } });
    expect(v.ready).toBe(false);
    expect(v.message).toContain(String(MIN_SAMPLE_PER_ARM));
  });

  it('show ชนะ → รายงาน lift (จุด% + relative%)', () => {
    const v = landingAbVerdict({
      show: { total: 300, signup: 15, cta: 60 },     // 5%
      control: { total: 300, signup: 6, cta: 30 },   // 2%
    });
    expect(v.ready).toBe(true);
    expect(v.winner).toBe('show');
    expect(v.liftPct).toBe(3);
    expect(v.relLiftPct).toBe(150);
    expect(v.message).toContain('ช่วยจริง');
  });

  it('control ชนะ → เตือนทบทวน', () => {
    const v = landingAbVerdict({
      show: { total: 300, signup: 6 },
      control: { total: 300, signup: 15 },
    });
    expect(v.winner).toBe('control');
    expect(v.liftPct).toBeLessThan(0);
  });

  it('เท่ากัน → tie', () => {
    const v = landingAbVerdict({
      show: { total: 300, signup: 9 },
      control: { total: 300, signup: 9 },
    });
    expect(v.winner).toBe('tie');
    expect(v.liftPct).toBe(0);
  });
});
