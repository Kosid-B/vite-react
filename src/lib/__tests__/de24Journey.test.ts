import { describe, it, expect } from 'vitest';
import { de24Journey } from '../de24Journey';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

type Step = { done: boolean; notes: string };
function withDe24(doneUpTo: number): AppData {
  // ทำ done ขั้น 0..doneUpTo-1 (ตามลำดับ)
  const de24: Step[] = Array.from({ length: 24 }, (_, i) => ({ done: i < doneUpTo, notes: '' }));
  return { ...DEFAULT_DATA, businessModel: { ...DEFAULT_DATA.businessModel, de24 } };
}
// ทำ done แบบข้าม (ขั้น 5 เสร็จ แต่ 0-4 ยังไม่) → current ต้องยังเป็นขั้นแรกที่ยังไม่เสร็จ
function withGaps(doneIdx: number[]): AppData {
  const set = new Set(doneIdx);
  const de24: Step[] = Array.from({ length: 24 }, (_, i) => ({ done: set.has(i), notes: '' }));
  return { ...DEFAULT_DATA, businessModel: { ...DEFAULT_DATA.businessModel, de24 } };
}

describe('de24Journey', () => {
  it('เริ่มต้น (ยังไม่ทำอะไร) → current = ขั้น 1, ยังไม่ started, ไม่ complete', () => {
    const j = de24Journey(withDe24(0));
    expect(j.done).toBe(0);
    expect(j.started).toBe(false);
    expect(j.complete).toBe(false);
    expect(j.current?.num).toBe(1);
    expect(j.current?.phase).toBe(0);
    expect(j.next?.num).toBe(2);
  });

  it('ทำเสร็จ 3 ขั้น → current = ขั้น 4, done=3, pct สอดคล้อง', () => {
    const j = de24Journey(withDe24(3));
    expect(j.done).toBe(3);
    expect(j.current?.num).toBe(4);
    expect(j.pct).toBe(Math.round((3 / 24) * 100));
    expect(j.started).toBe(true);
  });

  it('current = ขั้นแรกที่ยังไม่ done เสมอ (แม้ทำข้ามขั้น)', () => {
    // ทำขั้น index 5 กับ 6 เสร็จ แต่ 0-4 ยังไม่ → current ต้องเป็นขั้น 1 (index 0)
    const j = de24Journey(withGaps([5, 6]));
    expect(j.current?.index).toBe(0);
    expect(j.done).toBe(2);
  });

  it('ครบ 24 ขั้น → complete, current/next = null, pct=100', () => {
    const j = de24Journey(withDe24(24));
    expect(j.complete).toBe(true);
    expect(j.current).toBeNull();
    expect(j.next).toBeNull();
    expect(j.pct).toBe(100);
    expect(j.phaseIntent).toBe('');
  });

  it('phaseProgress นับเฉพาะระยะของ current', () => {
    // ระยะ 0 = index 0..5 (6 ขั้น) · ทำเสร็จ 2 ขั้นแรก → current index 2, phase 0, done 2/6
    const j = de24Journey(withDe24(2));
    expect(j.current?.phase).toBe(0);
    expect(j.phaseProgress?.done).toBe(2);
    expect(j.phaseProgress?.total).toBe(6);
  });

  it('current มี guide/name ไม่ว่าง (ผูกกับ DE24_DEFS)', () => {
    const j = de24Journey(withDe24(10));
    expect(j.current?.name).toBeTruthy();
    expect(j.current?.guide).toBeTruthy();
    expect(j.phaseIntent).toBeTruthy();
  });
});
