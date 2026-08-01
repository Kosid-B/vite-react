import { describe, it, expect } from 'vitest';
import { buildInstantPreview } from '../instantPreview';

describe('buildInstantPreview', () => {
  it('deterministic — ชื่อเดิม = ผลเดิม', () => {
    const a = buildInstantPreview('ร้านกาแฟดอยคำ');
    const b = buildInstantPreview('ร้านกาแฟดอยคำ');
    expect(a).toEqual(b);
  });

  it('ต่างชื่อ → เป้าหมาย/tagline ต่างได้ (seed ต่าง)', () => {
    const a = buildInstantPreview('AlphaTech');
    const b = buildInstantPreview('BetaShop');
    expect(a.plan.goal).not.toBe(a.storefront.tagline);
    // อย่างน้อยต้องไม่เหมือนกันทั้งก้อน
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('จัดหมวดจากคีย์เวิร์ด', () => {
    expect(buildInstantPreview('คาเฟ่ริมคลอง').category).toContain('ร้านอาหาร');
    expect(buildInstantPreview('MySoftware App').category).toContain('เทคโนโลยี');
    expect(buildInstantPreview('รับทำบัญชี ที่ปรึกษา').category).toContain('บริการ');
    expect(buildInstantPreview('ร้านขายเสื้อผ้า').category).toContain('ค้าปลีก');
  });

  it('ชื่อว่าง → fallback ไม่พัง', () => {
    const p = buildInstantPreview('   ');
    expect(p.bizName).toBe('ธุรกิจของคุณ');
    expect(p.team).toHaveLength(4);
    expect(p.plan.actions).toHaveLength(3);
  });

  it('ทีมครบ 4 + แผนมี goal/target/3 actions ไม่ซ้ำ + ใส่ชื่อธุรกิจ', () => {
    const p = buildInstantPreview('สวนผักออร์แกนิค');
    expect(p.team).toHaveLength(4);
    expect(p.team[0].mandate).toContain('สวนผักออร์แกนิค');
    expect(p.plan.goal).toContain('สวนผักออร์แกนิค');
    expect(p.plan.actions).toHaveLength(3);
    expect(new Set(p.plan.actions).size).toBe(3);        // ไม่ซ้ำ
    expect(p.storefront.name).toBe('สวนผักออร์แกนิค');
  });

  it('industryHint มีผลต่อการจัดหมวด', () => {
    expect(buildInstantPreview('Nova', 'ร้านอาหาร').category).toContain('ร้านอาหาร');
  });
});
