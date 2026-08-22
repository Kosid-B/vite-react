import { describe, it, expect } from 'vitest';
import { marginPct, MIN_MARGIN_PCT, tokenCostThb, PLAN_PRICE_THB, PLAN_MONTHLY_TOKENS } from '../tokenEconomics';
import {
  decide, usdToThb, usablePoolThb, freeWorkspaceCapThb, clipsAffordable,
  FREE_POOL_THB_PER_MONTH, paidRenderBudgetThb, PAID_CLIPS_PER_MONTH,
  FREE_CLIPS_LIFETIME, WORST_CASE_CLIP_THB, USD_TO_THB,
  planTotalCostThb, VIDEO_PLAN, PLAN_TOKENS_MIRROR,
} from '../videoBudget';

const base = { spentGlobalThb: 0, spentWsThb: 0, clipsThisMonth: 0, clipsLifetime: 0, estCostThb: 15, plan: 'free' as const };

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
    const cap = paidRenderBudgetThb('growth');
    expect(decide({ ...base, plan: 'growth', spentWsThb: cap, estCostThb: 15 }).reason).toBe('workspace-cap');
  });

  it('🔴 เพดานเงินของแพ็ก ต้องพอกับโควตาคลิปที่สัญญาไว้เสมอ (กันขายของที่ส่งมอบไม่ได้)', () => {
    for (const plan of ['starter', 'growth', 'scale'] as const) {
      expect(paidRenderBudgetThb(plan)).toBeGreaterThanOrEqual(
        PAID_CLIPS_PER_MONTH[plan] * WORST_CASE_CLIP_THB);
    }
  });

  /* 🔴 เทสต์ตัวเดิมของข้อนี้ **ผิดแบบเดียวกับโค้ด** — เช็ค marginPct(ราคา, ค่าวิดีโอ)
     โดยไม่นับต้นทุน token ที่แพ็กสัญญาไว้อยู่แล้ว (57-61% ของราคา)
     ⇒ มันเห็นด้วยกับความผิดพลาด แทนที่จะจับได้ · ตัวใหม่นับทั้งสองก้อน */
  it('🔴 ทุกแพ็กต้องมีกำไร ≥ MIN_MARGIN_PCT เมื่อนับ **ทั้งค่า token และค่าวิดีโอ** แบบใช้เต็มโควตา', () => {
    for (const plan of ['starter', 'growth', 'scale'] as const) {
      const cost = planTotalCostThb(PLAN_TOKENS_MIRROR[plan], PAID_CLIPS_PER_MONTH[plan], tokenCostThb);
      expect(marginPct(PLAN_PRICE_THB[plan], cost)).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
    }
  });

  it('โควตา token ที่ใช้ตรวจมาร์จิน ต้องตรงกับของจริงใน tokenEconomics (กัน config drift)', () => {
    for (const plan of ['starter', 'growth', 'scale'] as const) {
      expect(PLAN_TOKENS_MIRROR[plan]).toBe(PLAN_MONTHLY_TOKENS[plan]);
    }
  });

  it('แพ็กสายวิดีโอ ฿1,790 ต้องผ่านเกณฑ์กำไรเมื่อนับทั้งสองก้อน', () => {
    const cost = planTotalCostThb(VIDEO_PLAN.monthlyTokens, VIDEO_PLAN.clipsPerMonth, tokenCostThb);
    expect(marginPct(VIDEO_PLAN.priceThb, cost)).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
  });

  it('แพ็กสายวิดีโอต้องให้คลิปมากกว่าแพ็กเดิมทุกตัวที่ราคาต่ำกว่า — ไม่งั้นไม่มีเหตุผลให้ซื้อ', () => {
    expect(VIDEO_PLAN.clipsPerMonth).toBeGreaterThan(PAID_CLIPS_PER_MONTH.growth);
    expect(VIDEO_PLAN.priceThb).toBeGreaterThan(PLAN_PRICE_THB.growth);
  });

  it('🟡 เตือนความเปราะ: ถ้าอัตราทำซ้ำจริงแย่กว่าที่ตั้งไว้มาก แพ็ก ฿1,790 จะตกเกณฑ์', () => {
    // ต้นทุน/คลิปถ้า retry เป็น 2.5x แทน 1.6x → ~฿42
    const worse = tokenCostThb(VIDEO_PLAN.monthlyTokens) + VIDEO_PLAN.clipsPerMonth * 42;
    expect(marginPct(VIDEO_PLAN.priceThb, worse)).toBeLessThan(MIN_MARGIN_PCT);
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
    expect(decide({ ...base, clipsLifetime: FREE_CLIPS_LIFETIME }).reason).toBe('quota');
  });

  it('แพ็กฟรีได้ 1 คลิป — "อาฮ่า" ต้องได้ฟรี แต่คลิปที่ 2 ต้องจ่าย', () => {
    expect(FREE_CLIPS_LIFETIME).toBe(1);
  });

  it('🔴 คลิปฟรีนับ "ตลอดชีพ" ไม่ใช่ต่อเดือน — เดือนใหม่ต้องไม่รีเซ็ตให้คนเดิม', () => {
    // ผู้ใช้ฟรีที่เคยใช้ไปแล้ว 1 คลิป แต่เดือนนี้ยังไม่ได้ใช้เลย → ต้องยังถูกปฏิเสธ
    const d = decide({ ...base, clipsThisMonth: 0, clipsLifetime: 1 });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe('quota');
  });

  it('ผู้ใช้ฟรีที่ถูกปฏิเสธ ต้องได้รู้ว่ายังทำบทฟรีได้ (ไม่ปิดประตูทั้งบาน)', () => {
    expect(decide({ ...base, clipsLifetime: 1 }).message).toContain('บท');
  });

  it('โควตาของแพ็กที่จ่ายเงินต้องเพิ่มตามราคา', () => {
    const p = PAID_CLIPS_PER_MONTH;
    /* ⚠️ ห้ามเทียบ FREE_CLIPS_LIFETIME กับ starter ด้วย "<" ตรง ๆ — คนละหน่วย
       ฟรี = 1 ครั้งตลอดชีพ · starter = 1 ครั้งต่อเดือน (ได้ 12 คลิป/ปี เทียบกับ 1)
       เกณฑ์ที่ถูกคือ "จ่ายเงินแล้วต้องไม่ได้น้อยกว่าฟรี" */
    expect(p.starter).toBeGreaterThanOrEqual(FREE_CLIPS_LIFETIME);
    expect(p.starter).toBeLessThan(p.growth);
    expect(p.growth).toBeLessThan(p.scale);
  });

  it('🔴 ทุกแพ็กต้องมีกำไร **สูงกว่า 32%** (เจ้าของยกเกณฑ์ 22 ส.ค. 2569) เมื่อนับทั้ง token และวิดีโอ', () => {
    for (const plan of ['starter', 'growth', 'scale'] as const) {
      const cost = planTotalCostThb(PLAN_TOKENS_MIRROR[plan], PAID_CLIPS_PER_MONTH[plan], tokenCostThb);
      expect(marginPct(PLAN_PRICE_THB[plan], cost)).toBeGreaterThan(32);
    }
    const vp = planTotalCostThb(VIDEO_PLAN.monthlyTokens, VIDEO_PLAN.clipsPerMonth, tokenCostThb);
    expect(marginPct(VIDEO_PLAN.priceThb, vp)).toBeGreaterThan(32);
  });
});

describe('videoBudget — เลขจริงจากราคา provider (ส.ค. 2569)', () => {
  // Wan 2.6 = $0.05/วินาที · คลิป 8 วินาที = $0.40
  const wan8s = usdToThb(0.4);

  it('คลิป Wan 2.6 8 วินาที ต้องอยู่ราว ฿15', () => {
    expect(wan8s).toBeCloseTo(0.4 * USD_TO_THB, 2);
    expect(wan8s).toBeLessThan(20);
  });

  it('งบกองกลาง ฿1,000 รองรับ "ผู้ใช้ฟรีคนใหม่" ได้ราว 24-31 คน/เดือน (คิดค่าทำซ้ำแล้ว)', () => {
    const n = clipsAffordable(WORST_CASE_CLIP_THB);
    expect(n).toBeGreaterThanOrEqual(20);
    expect(n).toBeLessThanOrEqual(31);
  });

  it('🔴 Veo 3.1 Standard (มีเสียง) กินงบทั้งเดือนใน ~7 คลิป — จึงห้ามใช้เป็นตัวตั้งต้น', () => {
    const veoStd8s = usdToThb(3.2);   // 5 วินาที = $2.00 ⇒ 8 วินาที ≈ $3.20
    expect(clipsAffordable(veoStd8s)).toBeLessThan(10);
  });
});
