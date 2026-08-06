import { describe, it, expect } from 'vitest';
import { offerKind, matchOne, topMatches, kindLabel, type BizProfile } from '../b2bMatching';

const biz = (o: Partial<BizProfile>): BizProfile => ({
  id: Math.random().toString(36), name: 'ธุรกิจ', category: '', location: '', ...o,
});

describe('offerKind', () => {
  it('จำแนกหมวดจาก keyword', () => {
    expect(offerKind('ร้านก๋วยเตี๋ยวไก่')).toBe('food');
    expect(offerKind('ขนส่งพัสดุด่วน')).toBe('logistics');
    expect(offerKind('รับทำบัญชีและภาษี')).toBe('accounting');
    expect(offerKind('ค้าส่งวัตถุดิบอาหาร')).toBe('material');
    expect(offerKind('อะไรก็ไม่รู้')).toBe('other');
  });
  it('kindLabel มีทุกชนิด', () => {
    expect(kindLabel('food')).toContain('อาหาร');
  });
});

describe('matchOne', () => {
  const me = biz({ id: 'me', category: 'ร้านอาหารตามสั่ง', location: 'ชลบุรี' });

  it('ร้านอาหาร ↔ ซัพพลายเออร์วัตถุดิบ = ทิศ buy + คะแนนสูง', () => {
    const m = matchOne(me, biz({ id: 's', category: 'ค้าส่งวัตถุดิบ', location: 'ชลบุรี' }));
    expect(m.direction).toBe('buy');
    expect(m.score).toBeGreaterThanOrEqual(70);
    expect(m.reasons.join(' ')).toContain('ต้องใช้');
    expect(m.action).toContain('RFQ');
  });

  it('ร้านอาหาร ↔ บริษัทขนส่ง = buy (ร้านอาหารต้องใช้ขนส่ง)', () => {
    const m = matchOne(me, biz({ id: 'l', category: 'ขนส่งเดลิเวอรี' }));
    expect(m.direction).toBe('buy');
  });

  it('บริษัทวัตถุดิบมอง "ร้านอาหาร" = ทิศ sell (ขายให้)', () => {
    const supplier = biz({ id: 'sup', category: 'ค้าส่งวัตถุดิบ' });
    const m = matchOne(supplier, biz({ id: 'r', category: 'ร้านอาหาร' }));
    expect(m.direction).toBe('sell');
    expect(m.action).toContain('เสนอ');
  });

  it('ประเภทเดียวกัน = peer (พันธมิตร)', () => {
    const m = matchOne(me, biz({ id: 'r2', category: 'ร้านอาหารญี่ปุ่น' }));
    expect(m.direction).toBe('peer');
    expect(m.reasons.join(' ')).toContain('ประเภทเดียวกัน');
  });

  it('พื้นที่เดียวกัน + verified + rating เพิ่มคะแนน', () => {
    const near = matchOne(me, biz({ id: 'a', category: 'ค้าส่งวัตถุดิบ', location: 'ชลบุรี', rating: 5, verified: true }));
    const far = matchOne(me, biz({ id: 'b', category: 'ค้าส่งวัตถุดิบ', location: 'เชียงใหม่' }));
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.reasons.join(' ')).toContain('พื้นที่เดียวกัน');
  });

  it('ไม่อยู่ในระบบ → needsInvite + action เชิญ (viral)', () => {
    const m = matchOne(me, biz({ id: 'x', category: 'ค้าส่งวัตถุดิบ', inSystem: false }));
    expect(m.needsInvite).toBe(true);
    expect(m.action).toContain('เชิญ');
  });
});

describe('topMatches', () => {
  const me = biz({ id: 'me', category: 'ร้านกาแฟ', location: 'กรุงเทพ' });
  const pool = [
    me,
    biz({ id: 'a', category: 'ค้าส่งเมล็ดกาแฟ/วัตถุดิบ', location: 'กรุงเทพ' }),  // buy, near
    biz({ id: 'b', category: 'ขนส่ง', location: 'ภูเก็ต' }),                     // buy, far
    biz({ id: 'c', category: 'อะไรไม่รู้', location: '' }),                       // other → คะแนนต่ำ ถูกตัด
  ];

  it('ตัดตัวเอง + เรียงคะแนน + กรอง minScore', () => {
    const r = topMatches(me, pool);
    expect(r.find(m => m.biz.id === 'me')).toBeUndefined();
    expect(r[0].biz.id).toBe('a'); // near + complementary = คะแนนสูงสุด
    expect(r.every(m => m.score >= 45)).toBe(true);
  });

  it('pool ว่าง → []', () => {
    expect(topMatches(me, [])).toEqual([]);
  });
});
