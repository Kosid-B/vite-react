import { describe, it, expect } from 'vitest';
import {
  SKILL_CATALOG, SKILL_STAGES, BIZ_LABEL, TIER_LABEL,
  skillsForStage, skillsForBiz, skillsForPlan, canUseSkill,
  catalogSummary, recommendSkills, FREE_SKILL_COUNT, TOTAL_SKILL_COUNT,
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
      expect(TIER_LABEL[s.tier]).toBeTruthy();
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

describe('skillCatalog — สิทธิ์ตามแพ็ก (การคิดเงิน)', () => {
  it('แพ็กสูงกว่าใช้ได้มากกว่าเสมอ (ไม่มีสิทธิ์ถอยหลัง)', () => {
    const free = skillsForPlan('free').length;
    const starter = skillsForPlan('starter').length;
    const growth = skillsForPlan('growth').length;
    const scale = skillsForPlan('scale').length;
    expect(free).toBeLessThan(starter);
    expect(starter).toBeLessThan(growth);
    expect(growth).toBeLessThan(scale);
    expect(scale).toBe(TOTAL_SKILL_COUNT); // Scale ได้ครบทุกตัว
  });

  it('มีทักษะฟรีพอให้พิสูจน์คุณค่าก่อนจ่าย', () => {
    expect(FREE_SKILL_COUNT).toBeGreaterThanOrEqual(10);
    expect(skillsForPlan('free').length).toBe(FREE_SKILL_COUNT);
  });

  it('canUseSkill ตรงตามลำดับแพ็ก', () => {
    const paid = SKILL_CATALOG.find((s) => s.tier === 'growth')!;
    expect(canUseSkill('free', paid)).toBe(false);
    expect(canUseSkill('starter', paid)).toBe(false);
    expect(canUseSkill('growth', paid)).toBe(true);
    expect(canUseSkill('scale', paid)).toBe(true);
  });

  it('ทักษะฟรีใช้ได้ทุกแพ็กรวมทั้ง free', () => {
    for (const s of SKILL_CATALOG.filter((x) => x.tier === 'free')) {
      expect(canUseSkill('free', s)).toBe(true);
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
  });
});
