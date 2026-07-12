import { describe, it, expect } from 'vitest';
import { draftRfqLocal, draftQuoteLocal, openRfqShareText } from '../rfqDraft';

describe('draftRfqLocal', () => {
  it('ใช้ hint เป็น title + ใส่โครงรายละเอียด', () => {
    const d = draftRfqLocal('ออกแบบโลโก้ + CI', 'หมวด M · บริการวิชาชีพ');
    expect(d.title).toBe('ออกแบบโลโก้ + CI');
    expect(d.detail).toContain('ออกแบบโลโก้ + CI');
    expect(d.detail).toContain('หมวด M · บริการวิชาชีพ');
    expect(d.detail).toContain('กำหนดส่ง');
  });
  it('hint ว่าง → มี fallback ไม่พัง', () => {
    const d = draftRfqLocal('');
    expect(d.title.length).toBeGreaterThan(0);
    expect(d.detail).not.toContain('หมวดผู้ขายที่มองหา'); // ไม่มี sector → ไม่ใส่บรรทัดนั้น
  });
  it('title ยาวเกิน 60 ถูกตัด + …', () => {
    const long = 'ก'.repeat(80);
    const d = draftRfqLocal(long);
    expect(d.title.length).toBeLessThanOrEqual(60);
    expect(d.title.endsWith('…')).toBe(true);
  });
});

describe('draftQuoteLocal', () => {
  it('ใช้ budget เป็นราคาเริ่มต้น + note มีเงื่อนไขชำระ', () => {
    const q = draftQuoteLocal({ title: 'งาน A', budget: 15000 });
    expect(q.amount).toBe(15000);
    expect(q.note).toContain('งาน A');
    expect(q.note).toContain('มัดจำ');
  });
  it('budget 0 → amount 0 (ผู้ขายกรอกเอง)', () => {
    expect(draftQuoteLocal({ title: 'x', budget: 0 }).amount).toBe(0);
  });
});

describe('openRfqShareText', () => {
  it('รวมหัวข้อ+หมวด+งบ+ลิงก์', () => {
    const t = openRfqShareText({ title: 'หาโรงงานพิมพ์', budget: 20000, sectorLabel: 'หมวด C · การผลิต' }, 'https://ceoaithailand.org/b');
    expect(t).toContain('หาโรงงานพิมพ์');
    expect(t).toContain('หมวด C · การผลิต');
    expect(t).toContain('฿20,000');
    expect(t).toContain('https://ceoaithailand.org/b');
  });
  it('งบ 0 → ไม่โชว์บรรทัดงบ', () => {
    const t = openRfqShareText({ title: 'x', budget: 0, sectorLabel: 'y' }, 'url');
    expect(t).not.toContain('งบประมาณ');
  });
});
