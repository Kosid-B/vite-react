import { describe, it, expect } from 'vitest';
import {
  FEE, FEE_TIERS, PLATFORM_FEE_RATE, tierFor, feeFor, feeExplainTh, feeProjection, PLAN_FEE_DISCOUNT,
} from '../marketplaceFees';

describe('marketplaceFees — สถานะปัจจุบัน: ยังไม่เก็บ (0%)', () => {
  it('FEE.live = false → ไม่เก็บจริง ผู้ขายได้เต็ม', () => {
    expect(FEE.live).toBe(false);
    const q = feeFor(10_000);
    expect(q.fee).toBe(0);
    expect(q.rate).toBe(0);
    expect(q.net).toBe(10_000);
    expect(q.free).toBe(true);
  });

  it('ยังคำนวณ "ถ้าเก็บจะเป็นเท่าไร" ไว้เพื่อความโปร่งใส/ประเมินรายได้', () => {
    expect(feeFor(10_000).feeIfLive).toBe(300); // ขั้นกลาง 3%
    expect(feeFor(200_000).feeIfLive).toBe(3_000); // ขั้นใหญ่ 1.5%
  });

  it('ข้อความอธิบายบอกตรง ๆ ว่าตอนนี้ไม่เก็บ', () => {
    const s = feeExplainTh(10_000);
    expect(s).toMatch(/ฟรีช่วงเปิดตลาด/);
    expect(s).toMatch(/ยังไม่เก็บ/);
  });
});

describe('marketplaceFees — ขั้นบันไดตามมูลค่า', () => {
  it('ดีลเล็ก % สูง · ดีลใหญ่ % ต่ำ (ไม่ไล่ผู้ขายรายใหญ่)', () => {
    expect(tierFor(1_000).rate).toBe(0.05);
    expect(tierFor(5_000).rate).toBe(0.03);
    expect(tierFor(99_999).rate).toBe(0.03);
    expect(tierFor(100_000).rate).toBe(0.015);
  });

  it('อัตราลดลงเสมอเมื่อมูลค่าสูงขึ้น (monotonic)', () => {
    for (let i = 1; i < FEE_TIERS.length; i++) {
      expect(FEE_TIERS[i].rate).toBeLessThan(FEE_TIERS[i - 1].rate);
      expect(FEE_TIERS[i].minAmount).toBeGreaterThan(FEE_TIERS[i - 1].minAmount);
    }
  });

  it('คงค่าคงที่เดิมของระบบไว้ (3%)', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.03);
  });
});

describe('marketplaceFees — ค่าธรรมเนียมขั้นต่ำ', () => {
  it('ดีลจิ๋ว → ดันขึ้นขั้นต่ำ (แต่ไม่เกินมูลค่าดีล)', () => {
    const q = feeFor(100); // 5% = 5 → ต่ำกว่าขั้นต่ำ 20
    expect(q.feeIfLive).toBe(FEE.minFeeThb);
    expect(q.minApplied).toBe(true);

    const tiny = feeFor(10); // ขั้นต่ำ 20 > มูลค่า 10 → ห้ามเกินมูลค่า
    expect(tiny.feeIfLive).toBe(10);
  });

  it('ดีลใหญ่พอ → ไม่ติดขั้นต่ำ', () => {
    expect(feeFor(10_000).minApplied).toBe(false);
  });

  it('amount = 0 หรือติดลบ → ไม่มีค่าธรรมเนียม', () => {
    expect(feeFor(0).feeIfLive).toBe(0);
    expect(feeFor(-500).feeIfLive).toBe(0);
    expect(feeFor(-500).net).toBe(0);
  });
});

describe('marketplaceFees — ส่วนลดตามแพ็ก (แรงจูงใจอัปเกรด)', () => {
  it('แพ็กสูงกว่าเสียค่าธรรมเนียมน้อยกว่า', () => {
    expect(feeFor(10_000, 'free').feeIfLive).toBe(300);
    expect(feeFor(10_000, 'growth').feeIfLive).toBe(240); // ลด 20%
    expect(feeFor(10_000, 'scale').feeIfLive).toBe(180);  // ลด 40%
    expect(PLAN_FEE_DISCOUNT.scale).toBeGreaterThan(PLAN_FEE_DISCOUNT.growth);
  });
  it('แพ็กที่ไม่รู้จัก → ไม่ลด', () => {
    expect(feeFor(10_000, 'unknown').feeIfLive).toBe(300);
  });
});

describe('marketplaceFees — ประเมินรายได้', () => {
  it('ตอนนี้รายได้จริง = 0 แต่บอกได้ว่าถ้าเปิดเก็บจะได้เท่าไร', () => {
    const p = feeProjection(50, 10_000);
    expect(p.gmv).toBe(500_000);
    expect(p.revenue).toBe(0);            // ยังไม่เก็บ
    expect(p.revenueIfLive).toBe(15_000); // 50 × 300
    expect(p.effectiveRate).toBeCloseTo(0.03, 5);
  });
  it('ทนค่าติดลบ/ศูนย์', () => {
    const p = feeProjection(-5, -100);
    expect(p.gmv).toBe(0);
    expect(p.effectiveRate).toBe(0);
  });
});
