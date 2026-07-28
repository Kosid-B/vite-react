import { describe, it, expect } from 'vitest';
import { investmentMemoPrompt, renderMemoOutline, stanceLabel, type MemoInput } from '../investmentMemo';

const sample: MemoInput = {
  company: 'ตัวอย่าง คอร์ป', ticker: 'DEMO',
  stance: 'long', conviction: 'medium',
  oneLiner: 'ตลาดให้ค่าธุรกิจ recurring ต่ำเกินไปหลังปรับโมเดลเป็น subscription',
  drivers: ['สัดส่วนรายได้ recurring โตต่อเนื่อง', 'churn ลดหลังปรับ onboarding'],
  catalysts: [{ what: 'ประกาศงบ Q3', when: 'พ.ย.' }, { what: 'เปิดตลาดต่างประเทศ' }],
  risks: ['การแข่งขันด้านราคา', 'พึ่งลูกค้ารายใหญ่ไม่กี่ราย'],
  target: '+30% ใน 12 เดือน', timeframe: '12 เดือน',
};

describe('investmentMemo — prototype', () => {
  it('stanceLabel แปลจุดยืนเป็นไทย', () => {
    expect(stanceLabel('long')).toContain('LONG');
    expect(stanceLabel('short')).toContain('SHORT');
    expect(stanceLabel('hold')).toContain('HOLD');
  });

  it('prompt มี ticker/stance/thesis + กติกาห้ามแต่งตัวเลข + kill criteria', () => {
    const p = investmentMemoPrompt(sample);
    expect(p).toContain('DEMO');
    expect(p).toContain('LONG');
    expect(p).toContain(sample.oneLiner);
    expect(p).toContain('ห้ามแต่งตัวเลข');
    expect(p).toContain('Kill criteria');
  });

  it('renderMemoOutline เป็น markdown มีหัวข้อครบ + disclaimer + เตือนเรื่อง data', () => {
    const md = renderMemoOutline(sample);
    expect(md.startsWith('# Investment Memo — ตัวอย่าง คอร์ป (DEMO)')).toBe(true);
    ['## Thesis', '## ตัวขับเคลื่อนหลัก', '## กรอบ Valuation', '## Catalysts', '## ความเสี่ยงหลัก', '## Kill criteria']
      .forEach(h => expect(md).toContain(h));
    expect(md).toContain('ไม่ใช่คำแนะนำการลงทุน');
    expect(md).toContain('ยังไม่ต่อ data feed');
    expect(md).toContain('ประกาศงบ Q3');
  });

  it('input ว่าง → outline ยังมีโครง + ช่องให้เติม (ไม่พัง)', () => {
    const md = renderMemoOutline({ company: 'X', stance: 'hold', oneLiner: '' });
    expect(md).toContain('# Investment Memo — X');
    expect(md).toContain('ยังไม่ระบุ thesis');
    expect(md).toContain('เติมตัวขับเคลื่อน');
  });

  it('จำกัดจำนวน drivers/risks ไม่เกิน 6', () => {
    const many = Array.from({ length: 10 }, (_, i) => `ข้อ ${i}`);
    const md = renderMemoOutline({ ...sample, drivers: many, risks: many });
    expect((md.match(/- ข้อ \d/g) ?? []).length).toBeLessThanOrEqual(12); // 6 drivers + 6 risks
  });
});
