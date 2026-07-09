import { describe, it, expect } from 'vitest';
import { de24Suggestions, applyDe24Note, DE24_DEFS, type De24Step } from '../de24Sync';

const blankDe24 = (): De24Step[] => Array.from({ length: 24 }, () => ({ done: false, notes: '' }));

describe('de24Suggestions', () => {
  it('จับขั้นที่เกี่ยวจากคำในเนื้อหา', () => {
    const s = de24Suggestions('อยากตั้งราคาใหม่ และคำนวณ LTV ของลูกค้า');
    const idx = s.map(x => x.index);
    expect(idx).toContain(15); // กรอบราคา
    expect(idx).toContain(16); // LTV
  });

  it('คืน top N (กันรก) เรียงตาม hit', () => {
    const s = de24Suggestions('ตลาดหัวหาด beachhead ตลาดหัวหาด', 'x', 2);
    expect(s.length).toBeLessThanOrEqual(2);
    expect(s[0].index).toBe(1); // เลือกตลาดหัวหาด hit เยอะสุด
  });

  it('เนื้อหาว่าง → ไม่มีข้อเสนอ', () => {
    expect(de24Suggestions('   ')).toEqual([]);
  });

  it('มี phaseLabel + snippet มี tag', () => {
    const s = de24Suggestions('ทดสอบสมมติฐาน', 'ไฟล์ x.txt');
    expect(s[0].phaseLabel).toBeTruthy();
    expect(s[0].snippet).toContain('ไฟล์ x.txt');
  });
});

describe('applyDe24Note', () => {
  it('ต่อโน้ตเข้าขั้นที่ถูกต้อง (immutable)', () => {
    const de24 = blankDe24();
    const next = applyDe24Note(de24, 15, '📌 ปรับราคา');
    expect(next).not.toBe(de24);
    expect(next[15].notes).toBe('📌 ปรับราคา');
    expect(de24[15].notes).toBe(''); // ของเดิมไม่เปลี่ยน
  });

  it('ต่อท้ายโน้ตเดิมด้วย newline', () => {
    let de24 = blankDe24();
    de24[3] = { done: true, notes: 'เดิม' };
    de24 = applyDe24Note(de24, 3, '📌 ใหม่');
    expect(de24[3].notes).toBe('เดิม\n📌 ใหม่');
    expect(de24[3].done).toBe(true); // คง done เดิม
  });

  it('dedupe โน้ตซ้ำ', () => {
    let de24 = blankDe24();
    de24 = applyDe24Note(de24, 0, '📌 x');
    de24 = applyDe24Note(de24, 0, '📌 x');
    expect(de24[0].notes).toBe('📌 x');
  });

  it('index นอกช่วง / de24 เพี้ยน → คืนเดิม (ไม่ throw)', () => {
    const de24 = blankDe24();
    expect(applyDe24Note(de24, 99, 'x')).toBe(de24);
    expect(applyDe24Note(de24, -1, 'x')).toBe(de24);
    expect(() => applyDe24Note(undefined as unknown as De24Step[], 0, 'x')).not.toThrow();
  });
});

describe('DE24_DEFS', () => {
  it('ครบ 24 ขั้น index 0..23 · phase 0..3', () => {
    expect(DE24_DEFS.length).toBe(24);
    expect(DE24_DEFS.map(d => d.index)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(DE24_DEFS.every(d => d.phase >= 0 && d.phase <= 3)).toBe(true);
  });
});
