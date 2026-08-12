import { describe, it, expect } from 'vitest';
import {
  SKILL_CATALOG, SKILL_STAGES, BIZ_LABEL, PLAN_LABEL,
  skillsForStage, skillsForBiz, skillsForPlan, canUseSkill,
  catalogSummary, recommendSkills, FREE_SKILL_COUNT, TOTAL_SKILL_COUNT,
  signatureSkills, standardSkills, priceOf, consultantEquivOf, ownsSkill,
  bundleDiscount, bundleQuote, CONSULTANT_EQUIV, SIGNATURE_TOTAL_PRICE, SIGNATURE_COUNT,
  creditFor, OWN_AUTHORS,
} from '../skillCatalog';

describe('skillCatalog — ความถูกต้องของข้อมูล', () => {
  it('มีทักษะพอสมควรและไม่มี id ซ้ำ', () => {
    expect(TOTAL_SKILL_COUNT).toBeGreaterThan(80);
    expect(new Set(SKILL_CATALOG.map((s) => s.id)).size).toBe(TOTAL_SKILL_COUNT);
  });

  it('ทุกทักษะมีขั้นตอน/ประเภท/แพ็ก/คำอธิบาย ครบ', () => {
    const stages = new Set(SKILL_STAGES.map((s) => s.id));
    for (const s of SKILL_CATALOG) {
      expect(stages.has(s.stage)).toBe(true);
      expect(BIZ_LABEL[s.biz]).toBeTruthy();
      expect(PLAN_LABEL[s.minPlan]).toBeTruthy();
      expect(s.desc.length).toBeGreaterThan(10);
    }
  });

  it('ไม่มีเครื่องมือฝั่ง dev หลุดเข้ามาให้ผู้ใช้เห็น', () => {
    const ids = SKILL_CATALOG.map((s) => s.id);
    for (const internal of ['mcp-builder', 'skill-creator', 'docx', 'pptx', 'canvas-design', 'code-review']) {
      expect(ids).not.toContain(internal);
    }
  });

  it('ทุกขั้นตอนมีทักษะอย่างน้อย 5 ตัว (ไม่มีขั้นที่ว่างเปล่า)', () => {
    for (const st of SKILL_STAGES) expect(skillsForStage(st.id).length).toBeGreaterThanOrEqual(5);
  });

  it('ขั้นตอนเรียงลำดับถูกต้อง 1→5', () => {
    expect(SKILL_STAGES.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('skillCatalog — การคิดเงิน 2 ทาง', () => {
  it('แยก signature (ซื้อขาด) กับ standard (รวมในแพ็ก) ครบ ไม่มีตัวคาบเกี่ยว', () => {
    const sig = signatureSkills(), std = standardSkills();
    expect(sig.length + std.length).toBe(TOTAL_SKILL_COUNT);
    expect(sig.length).toBeGreaterThan(20);
    for (const s of sig) {
      expect(s.price).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(s.valueTier);
    }
    for (const s of std) expect(s.price).toBeUndefined();
  });

  it('signature ต้องซื้อก่อนถึงใช้ได้ — แพ็กสูงแค่ไหนก็ไม่ปลดให้', () => {
    const sig = signatureSkills()[0];
    expect(canUseSkill('scale', sig)).toBe(false);       // จ่าย ฿5,900/เดือน ก็ยังไม่ได้
    expect(canUseSkill('free', sig, [sig.id])).toBe(true); // ซื้อแล้วใช้ได้แม้อยู่แพ็กฟรี
  });

  it('ซื้อขาดแล้วเป็นเจ้าของถาวร — ลดแพ็กลงก็ยังใช้ได้', () => {
    const sig = signatureSkills()[0];
    expect(canUseSkill('scale', sig, [sig.id])).toBe(true);
    expect(canUseSkill('free', sig, [sig.id])).toBe(true); // ลดจาก scale → free ยังใช้ได้
  });

  it('skillsForPlan รวมทั้งที่แพ็กปลดให้ และที่ซื้อขาดไว้', () => {
    const sig = signatureSkills()[0];
    const base = skillsForPlan('free');
    expect(base.some((s) => s.id === sig.id)).toBe(false);
    const withBought = skillsForPlan('free', [sig.id]);
    expect(withBought.length).toBe(base.length + 1);
    expect(withBought.some((s) => s.id === sig.id)).toBe(true);
    expect(ownsSkill([sig.id], sig.id)).toBe(true);
    expect(ownsSkill([], sig.id)).toBe(false);
  });

  it('standard ยังปลดตามแพ็กเหมือนเดิม', () => {
    const paid = standardSkills().find((s) => s.minPlan === 'growth')!;
    expect(canUseSkill('starter', paid)).toBe(false);
    expect(canUseSkill('growth', paid)).toBe(true);
  });

  it('มีทักษะฟรีพอให้พิสูจน์คุณค่าก่อนจ่าย', () => {
    expect(FREE_SKILL_COUNT).toBeGreaterThanOrEqual(10);
  });

  it('ราคารวมคลัง signature สมเหตุสมผล และแต่ละ tier ราคาไม่ถอยหลัง', () => {
    expect(SIGNATURE_TOTAL_PRICE).toBeGreaterThan(20_000);
    expect(SIGNATURE_COUNT).toBe(signatureSkills().length);
    expect(CONSULTANT_EQUIV[1]).toBeLessThan(CONSULTANT_EQUIV[2]);
    expect(CONSULTANT_EQUIV[2]).toBeLessThan(CONSULTANT_EQUIV[3]);
    // ราคาขายต้องถูกกว่าการจ้างที่ปรึกษาเสมอ (ไม่งั้นไม่มีเหตุผลให้ซื้อ)
    for (const s of signatureSkills()) {
      expect(priceOf(s)).toBeLessThan(consultantEquivOf(s));
    }
  });
});

describe('skillCatalog — สิทธิ์ในผลงาน (กันขายงานคนอื่น)', () => {
  it('ทักษะที่ขายรายตัวได้ ต้องเป็นผลงานของเราเท่านั้น', () => {
    for (const s of signatureSkills()) {
      if (s.author) {
        expect(OWN_AUTHORS as readonly string[]).toContain(s.author);
      }
    }
  });

  it('ผลงานผู้อื่นห้ามถูกตั้งราคาขายรายตัว', () => {
    const others = SKILL_CATALOG.filter(
      (s) => s.author && !(OWN_AUTHORS as readonly string[]).includes(s.author),
    );
    expect(others.length).toBeGreaterThan(0); // มีจริงในระบบ
    for (const s of others) {
      expect(s.origin).toBe('standard');
      expect(s.price).toBeUndefined();
    }
  });

  it('ผลงานผู้อื่นต้องมีข้อความเครดิต · ของเราเองไม่ต้องเครดิตตัวเอง', () => {
    const other = SKILL_CATALOG.find((s) => s.author && !(OWN_AUTHORS as readonly string[]).includes(s.author))!;
    expect(creditFor(other)).toContain(other.author!);
    const mine = signatureSkills().find((s) => s.author)!;
    expect(creditFor(mine)).toBeNull();
    expect(creditFor({ ...other, author: undefined })).toBeNull();
  });
});

describe('skillCatalog — ซื้อยกชุด', () => {
  it('ยิ่งซื้อหลายตัวยิ่งลด และไม่เกิน 25%', () => {
    expect(bundleDiscount(1)).toBe(0);
    expect(bundleDiscount(2)).toBe(0.10);
    expect(bundleDiscount(4)).toBe(0.18);
    expect(bundleDiscount(6)).toBe(0.25);
    expect(bundleDiscount(100)).toBe(0.25);
  });

  it('ใบเสนอราคายกชุดคำนวณถูก และไม่คิดเงินตัวที่ซื้อไปแล้วซ้ำ', () => {
    const q = bundleQuote('validate');
    expect(q.items.length).toBeGreaterThan(0);
    expect(q.price).toBe(Math.round(q.listPrice * (1 - q.discount)));
    expect(q.saved).toBe(q.listPrice - q.price);
    expect(q.price).toBeLessThanOrEqual(q.listPrice);

    const ownedAll = q.items.map((s) => s.id);
    const q2 = bundleQuote('validate', ownedAll);
    expect(q2.items).toHaveLength(0);
    expect(q2.price).toBe(0);
  });

  it('ยกชุดต้องถูกกว่าซื้อทีละตัวเสมอ (เมื่อมี ≥2 ตัว)', () => {
    for (const st of SKILL_STAGES) {
      const q = bundleQuote(st.id);
      if (q.items.length >= 2) expect(q.price).toBeLessThan(q.listPrice);
    }
  });
});

describe('skillCatalog — กรองตามประเภทธุรกิจ', () => {
  it('ธุรกิจเฉพาะทางได้ทั้งของตัวเอง + ของกลาง', () => {
    const food = skillsForBiz('food');
    expect(food.every((s) => s.biz === 'food' || s.biz === 'all')).toBe(true);
    expect(food.length).toBeGreaterThan(0);
    expect(food.length).toBeLessThanOrEqual(TOTAL_SKILL_COUNT);
  });
  it("'all' ได้ทุกตัว", () => {
    expect(skillsForBiz('all').length).toBe(TOTAL_SKILL_COUNT);
  });
});

describe('skillCatalog — AI แนะนำทักษะถัดไป', () => {
  it('แนะนำขั้นที่ผู้ใช้อยู่ก่อน ไม่ย้อนกลับไปขั้นที่ผ่านมาแล้ว', () => {
    const rec = recommendSkills({ stage: 'launch', plan: 'growth', limit: 5 });
    expect(rec.length).toBe(5);
    expect(rec[0].stage).toBe('launch');
    // ไม่มีขั้นก่อนหน้า (validate/model) ขึ้นมาเป็นอันดับต้น
    expect(['validate', 'model']).not.toContain(rec[0].stage);
  });

  it('ไม่แนะนำตัวที่ใช้ไปแล้วซ้ำ', () => {
    const first = recommendSkills({ stage: 'validate', plan: 'free', limit: 3 });
    const again = recommendSkills({ stage: 'validate', plan: 'free', done: first.map((s) => s.id), limit: 3 });
    for (const s of again) expect(first.map((x) => x.id)).not.toContain(s.id);
  });

  it('ดันทักษะที่ตรงประเภทธุรกิจขึ้นมา', () => {
    const rec = recommendSkills({ stage: 'model', biz: 'food', plan: 'scale', limit: 10 });
    const foodOnly = rec.filter((s) => s.biz === 'food');
    if (foodOnly.length) {
      // ถ้ามีทักษะเฉพาะร้านอาหารในผลลัพธ์ ต้องอยู่ครึ่งบน
      expect(rec.indexOf(foodOnly[0])).toBeLessThan(rec.length / 2 + 1);
    }
  });

  it('ยังโชว์ทักษะที่ล็อกอยู่ (ให้เห็นคุณค่าของการอัปเกรด) แต่จัดหลังตัวที่ใช้ได้', () => {
    const rec = recommendSkills({ stage: 'launch', plan: 'free', limit: 10 });
    expect(rec.length).toBeGreaterThan(0);
    // ภายใน "ขั้นเดียวกัน" ตัวที่ใช้ได้ต้องมาก่อนตัวที่ล็อก
    // (ข้ามขั้น = ความเกี่ยวข้องกับขั้นที่ผู้ใช้อยู่สำคัญกว่าสถานะล็อก — ตั้งใจให้เป็นแบบนี้)
    const same = rec.filter((s) => s.stage === 'launch');
    const uIdx = same.findIndex((s) => canUseSkill('free', s));
    const lIdx = same.findIndex((s) => !canUseSkill('free', s));
    if (uIdx !== -1 && lIdx !== -1) expect(uIdx).toBeLessThan(lIdx);
  });

  it('limit ทำงาน และไม่พังเมื่อ done ครอบคลุมเยอะ', () => {
    expect(recommendSkills({ stage: 'scale', plan: 'free', limit: 2 })).toHaveLength(2);
    const all = SKILL_CATALOG.map((s) => s.id);
    expect(recommendSkills({ stage: 'scale', plan: 'free', done: all })).toHaveLength(0);
  });
});

describe('skillCatalog — สรุปสำหรับ Landing', () => {
  it('catalogSummary ครบ 5 ขั้น และยอดรวมตรงกับ catalog', () => {
    const sum = catalogSummary();
    expect(sum).toHaveLength(5);
    expect(sum.reduce((a, b) => a + b.total, 0)).toBe(TOTAL_SKILL_COUNT);
    expect(sum.reduce((a, b) => a + b.free, 0)).toBe(FREE_SKILL_COUNT);
    expect(sum.reduce((a, b) => a + b.signature, 0)).toBe(SIGNATURE_COUNT);
  });
});
