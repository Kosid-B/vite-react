import { describe, it, expect } from 'vitest';
import { suggestPod, POD_CATALOG } from '../podSuggest';

describe('suggestPod', () => {
  it('คืนอันดับเรียงตาม fitScore (มาก→น้อย) + rank 1..N', () => {
    const r = suggestPod({ audience: 'b2c', industry: 'คาเฟ่' }, 6);
    expect(r).toHaveLength(6);
    expect(r[0].rank).toBe(1);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].fitScore).toBeGreaterThanOrEqual(r[i].fitScore);
  });

  it('คาเฟ่ → แก้วมัค/tote ติดอันดับ (เข้ากับธุรกิจ)', () => {
    const ids = suggestPod({ industry: 'ร้านกาแฟคาเฟ่', audience: 'b2c' }, 6).map(s => s.product.id);
    expect(ids).toContain('mug');
    expect(ids).toContain('tote');
    // แก้วมัคต้องมี why "เข้ากับธุรกิจ"
    const mug = suggestPod({ industry: 'ร้านกาแฟคาเฟ่', audience: 'b2c' }, 10).find(s => s.product.id === 'mug')!;
    expect(mug.why.join(' ')).toMatch(/เข้ากับธุรกิจ/);
  });

  it('B2B vs B2C ได้อันดับต่างกัน', () => {
    const b2b = suggestPod({ audience: 'b2b', industry: 'บริการองค์กร' }, 3).map(s => s.product.id);
    const b2c = suggestPod({ audience: 'b2c', industry: 'แฟชั่น' }, 3).map(s => s.product.id);
    expect(b2b).not.toEqual(b2c);
    // B2B ควรมี notebook/mug (ของขวัญองค์กร) ในอันดับต้น
    expect(b2b).toEqual(expect.arrayContaining(['mug']));
  });

  it('persona Gen Z → sticker/phonecase ได้คะแนนเพิ่ม', () => {
    const r = suggestPod({ audience: 'b2c', persona: 'วัยรุ่น Gen Z', industry: 'art' }, 10);
    const sticker = r.find(s => s.product.id === 'sticker')!;
    expect(sticker.why.join(' ')).toMatch(/Gen Z|วัยรุ่น/);
  });

  it('ทุกคำแนะนำมี why + priceRange + designAngle', () => {
    const r = suggestPod({ audience: 'b2c', industry: 'shop', company: 'ร้านเอ', valueProp: 'สดชื่น' }, 5);
    r.forEach(s => {
      expect(s.why.length).toBeGreaterThan(0);
      expect(s.priceRange).toMatch(/฿\d+–\d+/);
      expect(s.designAngle).toContain('สดชื่น');
    });
    expect(r[0].designAngle).toContain('ร้านเอ');
  });

  it('ข้อมูลว่าง → ยังคืนรายการได้ (ไม่พัง) + limit ทำงาน', () => {
    expect(suggestPod({}, 3)).toHaveLength(3);
    expect(suggestPod({}, 100).length).toBe(POD_CATALOG.length);
  });
});
