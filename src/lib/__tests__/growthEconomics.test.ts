import { describe, it, expect } from 'vitest';
import {
  ltvOf, weekMetrics, latestWeekMetrics, isoWeekTag, healthLabel, G_CHANNELS,
  type GrowthEcoState,
} from '../growthEconomics';

const base: GrowthEcoState = {
  arpu: 1490, lifetimeMonths: 6, currentMRR: 0,
  weeks: [{
    weekTag: '2026-W32',
    entries: {
      youtube: { signups: 10, adCost: 0, otherCost: 0 },        // organic
      fb_group: { signups: 5, adCost: 5000, otherCost: 1000 },  // paid
      line: { signups: 0, adCost: 0, otherCost: 0 },            // na
    },
  }],
};

describe('ltvOf', () => {
  it('LTV = ARPU × อายุเฉลี่ย', () => {
    expect(ltvOf(base)).toBe(1490 * 6); // 8940
  });
  it('ค่าติดลบ → 0', () => {
    expect(ltvOf({ ...base, arpu: -5 })).toBe(0);
  });
});

describe('weekMetrics — ต่อช่องทาง', () => {
  const wm = weekMetrics(base, base.weeks[0]);

  it('YouTube organic → cac 0, health organic, coca 0', () => {
    const yt = wm.perChannel.find(c => c.channel === 'youtube')!;
    expect(yt.cac).toBe(0);
    expect(yt.coca).toBe(0);
    expect(yt.health).toBe('organic');
  });

  it('FB paid → CAC=adCost/signups, COCA รวม otherCost, LTV:CAC + ROI ถูก', () => {
    const fb = wm.perChannel.find(c => c.channel === 'fb_group')!;
    expect(fb.cac).toBe(1000);            // 5000/5
    expect(fb.coca).toBe(1200);           // 6000/5
    expect(fb.ltvCacRatio).toBe(8.9);     // 8940/1000
    expect(fb.roi).toBe(645);             // (8940-1200)/1200*100 = 645
    expect(fb.health).toBe('good');       // ratio >= 3
  });

  it('ช่องไม่มีสมัคร → cac/coca null, health na', () => {
    const line = wm.perChannel.find(c => c.channel === 'line')!;
    expect(line.cac).toBeNull();
    expect(line.health).toBe('na');
  });

  it('totals รวมทุกช่อง', () => {
    expect(wm.totals.signups).toBe(15);   // 10+5
    expect(wm.totals.adCost).toBe(5000);
    expect(wm.totals.totalCost).toBe(6000);
    expect(wm.totals.cac).toBe(333);      // 5000/15
  });

  it('ad gate ปิดเมื่อ MRR = 0, เปิดเมื่อ MRR > 0', () => {
    expect(weekMetrics(base, base.weeks[0]).adGateOpen).toBe(false);
    expect(weekMetrics({ ...base, currentMRR: 5000 }, base.weeks[0]).adGateOpen).toBe(true);
  });

  it('มีครบ 6 ช่องทางเสมอ', () => {
    expect(wm.perChannel).toHaveLength(G_CHANNELS.length);
  });
});

describe('latestWeekMetrics', () => {
  it('ไม่มีสัปดาห์ → null', () => {
    expect(latestWeekMetrics({ ...base, weeks: [] })).toBeNull();
  });
  it('คืนสัปดาห์สุดท้าย', () => {
    const s: GrowthEcoState = { ...base, weeks: [{ weekTag: 'A', entries: {} }, { weekTag: 'B', entries: {} }] };
    expect(latestWeekMetrics(s)!.weekTag).toBe('B');
  });
});

describe('isoWeekTag + healthLabel', () => {
  it('isoWeekTag คืนรูปแบบ YYYY-Www', () => {
    expect(isoWeekTag(new Date('2026-01-01T00:00:00Z'))).toMatch(/^2026-W\d{2}$/);
  });
  it('healthLabel ครอบคลุมทุกสถานะ', () => {
    expect(healthLabel('good')).toMatch(/คุ้ม/);
    expect(healthLabel('weak')).toMatch(/ขาดทุน/);
    expect(healthLabel('organic')).toMatch(/ฟรี/);
  });
});
