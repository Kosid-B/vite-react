import { describe, it, expect } from 'vitest';
import {
  bySource, byCampaign, byContent, untaggedPct, contentVerdict, MIN_PER_CONTENT,
} from '../contentPerformance';
import type { LandingAgg } from '../landingFunnel';

const base: LandingAgg = {
  total: 0, engaged: 0, cta: 0, signup: 0, avg_scroll: 0, avg_dwell: 0, bounce: 0,
  by_seg: {}, by_ref: {}, by_ab: {},
};
const agg = (o: Partial<LandingAgg>): LandingAgg => ({ ...base, ...o });
const cell = (total: number, cta: number, signup = 0) => ({ total, cta, signup });

describe('contentPerformance — คอนเทนต์ชิ้นไหนพาคนมา', () => {
  it('เรียงตามจำนวนคน และคำนวณ % ที่กด CTA ต่อชิ้น', () => {
    const rows = bySource(agg({ by_utm_source: { youtube: cell(50, 5), tiktok: cell(80, 2) } }));
    expect(rows.map((r) => r.key)).toEqual(['tiktok', 'youtube']);
    expect(rows.find((r) => r.key === 'youtube')!.ctaPct).toBe(10);
    expect(rows.find((r) => r.key === 'tiktok')!.ctaPct).toBe(2.5);
  });

  it('แปลง campaign กลับเป็นลิงก์สั้นที่คนจำได้ (pricing → /ราคา)', () => {
    const rows = byCampaign(agg({ by_campaign: { pricing: cell(30, 6) } }));
    expect(rows[0].label).toBe('/ราคา');
  });

  it('บอกตรง ๆ ว่าคนที่ไม่ได้ติดแท็กมีกี่ % — ตัวเลขสุขภาพของการตลาดเราเอง', () => {
    // 70 คน · ติดแท็ก 7 (youtube) · ไม่ระบุ 63 → 90%
    expect(untaggedPct(agg({
      total: 70, by_utm_source: { '(ไม่ระบุ)': cell(63, 3), youtube: cell(7, 2) },
    }))).toBe(90);
    expect(untaggedPct(null)).toBe(0);
  });

  it('🔴 ไม่มี by_utm_source มาเลย ต้องได้ 100% ไม่ใช่ 0% (คีย์ที่หาย ห้ามกลายเป็นข่าวดี)', () => {
    // บั๊กจริง 19 ส.ค. 2569: เดิมอ่านช่อง '(ไม่ระบุ)' ตรง ๆ ด้วย `?? 0`
    //   สคีมาเก่า/ยังไม่มีใครติดแท็ก → ไม่มีช่องนั้น → คืน 0 = "ติดแท็กครบทุกคน"
    //   ซึ่งตรงข้ามกับความจริงแบบสุดขั้ว (production จริงตอนนั้น: ติดแท็ก 0 จาก 70 คน)
    expect(untaggedPct(agg({ total: 70 }))).toBe(100);
    expect(untaggedPct(agg({ total: 70, by_utm_source: {} }))).toBe(100);
  });

  it('ยังไม่มีใครมาจากลิงก์ติดแท็ก → ต้องบอกว่ายังสรุปไม่ได้ ไม่ใช่โชว์อันดับ', () => {
    const v = contentVerdict(agg({ total: 70, by_utm_source: { '(ไม่ระบุ)': cell(70, 4) } }));
    expect(v.ready).toBe(false);
    expect(v.message).toContain('ยังไม่มีใครมาจากลิงก์ที่ติดแท็ก');
  });

  it('คนน้อยเกินต่อชิ้น → ห้ามประกาศผู้ชนะ (experiment-reality-check)', () => {
    const v = contentVerdict(agg({ total: 30, by_campaign: { pricing: cell(MIN_PER_CONTENT - 1, 9) } }));
    expect(v.ready).toBe(false);
    expect(v.message).toContain(`${MIN_PER_CONTENT}`);
  });

  it('คนพอแล้ว → ชี้ชิ้นที่ CTA สูงสุด ไม่ใช่ชิ้นที่คนเยอะสุด', () => {
    const v = contentVerdict(agg({
      total: 200,
      by_campaign: { pricing: cell(40, 12), sim_scam: cell(120, 6) }, // sim คนเยอะกว่า แต่ CTA ต่ำกว่า
    }));
    expect(v.ready).toBe(true);
    expect(v.message).toContain('/ราคา');   // 30% ชนะ 5%
    expect(v.message).not.toContain('sim');
  });

  it('ไม่มีข้อมูลเลยต้องไม่พัง', () => {
    for (const f of [bySource, byCampaign, byContent]) expect(f(null)).toEqual([]);
    expect(contentVerdict(null).ready).toBe(false);
  });
});
