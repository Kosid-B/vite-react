import { describe, it, expect } from 'vitest';
import {
  decide, usdToThb, usablePoolThb, freeWorkspaceCapThb, clipsAffordable,
  FREE_POOL_THB_PER_MONTH, PAID_RENDER_BUDGET_THB, FREE_CLIPS_PER_MONTH, USD_TO_THB,
} from '../videoBudget';

const base = { spentGlobalThb: 0, spentWsThb: 0, clipsThisMonth: 0, estCostThb: 15, plan: 'free' as const };

describe('videoBudget — fail-closed', () => {
  it('ประเมินราคาไม่ได้ = ไม่อนุญาต (ห้าม fail-open)', () => {
    expect(decide({ ...base, estCostThb: null }).allow).toBe(false);
    expect(decide({ ...base, estCostThb: null }).reason).toBe('no-estimate');
  });

  it('ราคาติดลบ/NaN ก็ต้องไม่อนุญาต', () => {
    expect(decide({ ...base, estCostThb: -1 }).allow).toBe(false);
    expect(decide({ ...base, estCostThb: NaN }).allow).toBe(false);
  });

  it('usdToThb ของค่าพัง คืน Infinity เพื่อให้ถูกปฏิเสธ ไม่ใช่ 0', () => {
    expect(usdToThb(NaN)).toBe(Infinity);
    expect(usdToThb(-5)).toBe(Infinity);
  });

  it('ข้อความตอนปฏิเสธเพราะระบบ ต้องไม่โทษผู้ใช้', () => {
    expect(decide({ ...base, estCostThb: null }).message).toContain('ไม่ใช่ความผิดของคุณ');
  });
});

describe('videoBudget — งบกองกลางคุมเฉพาะผู้ใช้ฟรี', () => {
  it('ผู้ใช้ฟรีถูกงบกองกลางบล็อกเมื่อเต็ม', () => {
    const d = decide({ ...base, spentGlobalThb: usablePoolThb() });
    expect(d.allow).toBe(false);
    expect(['global', 'reserve']).toContain(d.reason);
  });

  it('🔴 ลูกค้าที่จ่ายเงินต้องไม่ถูกงบกองกลางบล็อก — ไม่งั้นคือขายของที่ส่งมอบไม่ได้', () => {
    const d = decide({ ...base, plan: 'growth', spentGlobalThb: 99_999, estCostThb: 15 });
    expect(d.allow).toBe(true);
  });

  it('ลูกค้าที่จ่ายเงินยังถูกเพดานของแพ็กตัวเองคุมอยู่', () => {
    const cap = PAID_RENDER_BUDGET_THB.growth;
    expect(decide({ ...base, plan: 'growth', spentWsThb: cap, estCostThb: 15 }).reason).toBe('workspace-cap');
  });

  it('เพดานของแพ็กที่จ่ายเงินต้องมากขึ้นตามราคาแพ็ก', () => {
    expect(PAID_RENDER_BUDGET_THB.starter).toBeLessThan(PAID_RENDER_BUDGET_THB.growth);
    expect(PAID_RENDER_BUDGET_THB.growth).toBeLessThan(PAID_RENDER_BUDGET_THB.scale);
  });
});

describe('videoBudget — กันคนเดียวกินงบทั้งเดือน', () => {
  it('เวิร์กสเปซฟรีเดียวใช้เกินสัดส่วนที่กำหนดไม่ได้', () => {
    const d = decide({ ...base, spentWsThb: freeWorkspaceCapThb(), estCostThb: 15 });
    expect(d.reason).toBe('workspace-cap');
  });

  it('เพดานต่อคนต้องน้อยกว่างบกองกลาง (ไม่งั้นกันอะไรไม่ได้เลย)', () => {
    expect(freeWorkspaceCapThb()).toBeLessThan(FREE_POOL_THB_PER_MONTH);
  });
});

describe('videoBudget — โควตาคลิป', () => {
  it('ใช้ครบโควตาแล้วต้องถูกปฏิเสธ ก่อนไปคิดเรื่องเงิน', () => {
    const d = decide({ ...base, clipsThisMonth: FREE_CLIPS_PER_MONTH.free });
    expect(d.reason).toBe('quota');
  });

  it('แพ็กฟรีได้ 1 คลิป — "อาฮ่า" ต้องได้ฟรี แต่คลิปที่ 2 ต้องจ่าย', () => {
    expect(FREE_CLIPS_PER_MONTH.free).toBe(1);
  });

  it('โควตาต้องเพิ่มตามแพ็ก', () => {
    const f = FREE_CLIPS_PER_MONTH;
    expect(f.free).toBeLessThan(f.starter);
    expect(f.starter).toBeLessThan(f.growth);
    expect(f.growth).toBeLessThan(f.scale);
  });
});

describe('videoBudget — เลขจริงจากราคา provider (ส.ค. 2569)', () => {
  // Wan 2.6 = $0.05/วินาที · คลิป 8 วินาที = $0.40
  const wan8s = usdToThb(0.4);

  it('คลิป Wan 2.6 8 วินาที ต้องอยู่ราว ฿15', () => {
    expect(wan8s).toBeCloseTo(0.4 * USD_TO_THB, 2);
    expect(wan8s).toBeLessThan(20);
  });

  it('งบกองกลาง ฿1,000 รองรับผู้ใช้ฟรีได้ราว 50-60 คลิป/เดือน', () => {
    const n = clipsAffordable(wan8s);
    expect(n).toBeGreaterThanOrEqual(50);
    expect(n).toBeLessThanOrEqual(60);
  });

  it('🔴 Veo 3.1 Standard (มีเสียง) กินงบทั้งเดือนใน ~7 คลิป — จึงห้ามใช้เป็นตัวตั้งต้น', () => {
    const veoStd8s = usdToThb(3.2);   // 5 วินาที = $2.00 ⇒ 8 วินาที ≈ $3.20
    expect(clipsAffordable(veoStd8s)).toBeLessThan(10);
  });
});
