import { describe, it, expect } from 'vitest';
import { fillMissingTopLevel, arrayKeysOf } from '../appDataGuard';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* บั๊กจริงที่เทสต์ชุดนี้ล็อกไว้ (22 ส.ค. 2569):
 * แถว workspace_state ฝั่งคลาวด์ถูกเขียนเป็น {"rev":9999} ตอนล้างข้อมูลให้ผู้ใช้เริ่มใหม่
 * → migrate() เดิมไม่ได้กันคีย์ actions → data.actions.filter โยน → ทั้งเว็บเปิดไม่ได้
 * หลักฐาน: client_errors 7 แถว "undefined is not an object (evaluating 'e.actions.filter')" */
describe('appDataGuard — ข้อมูลคลาวด์ที่ไม่ครบต้องไม่ทำให้แอปล่ม', () => {
  it('ข้อมูลคลาวด์ที่มีแค่ {"rev":9999} ต้องได้คีย์อาเรย์ครบทุกตัว', () => {
    const parsed = fillMissingTopLevel({ rev: 9999 } as unknown as AppData, DEFAULT_DATA);
    for (const key of arrayKeysOf(DEFAULT_DATA)) {
      expect(Array.isArray((parsed as unknown as Record<string, unknown>)[key])).toBe(true);
    }
  });

  it('actions ต้องเป็นอาเรย์ — คีย์ตัวที่ทำให้เว็บล่มจริง', () => {
    const parsed = fillMissingTopLevel({ rev: 9999 } as unknown as AppData, DEFAULT_DATA);
    expect(Array.isArray(parsed.actions)).toBe(true);
    expect(() => parsed.actions.filter(a => a.done)).not.toThrow();
  });

  it('เก็บ rev เดิมไว้ ไม่ทับด้วยค่าเริ่มต้น', () => {
    const parsed = fillMissingTopLevel({ rev: 9999 } as unknown as AppData, DEFAULT_DATA);
    expect(parsed.rev).toBe(9999);
  });

  it('ไม่ทับข้อมูลที่ผู้ใช้มีอยู่จริง', () => {
    const mine = [{ done: true, title: 'ของผม', desc: '', priority: 1, nb: '', nt: '', tags: [] }];
    const parsed = fillMissingTopLevel(
      { rev: 3, actions: mine } as unknown as AppData, DEFAULT_DATA);
    expect(parsed.actions).toEqual(mine);
  });

  it('คีย์ที่ค่าเริ่มต้นเป็นอาเรย์ แต่คลาวด์ส่ง null มา ต้องถูกแทนที่ด้วยอาเรย์', () => {
    const parsed = fillMissingTopLevel(
      { rev: 1, actions: null } as unknown as AppData, DEFAULT_DATA);
    expect(Array.isArray(parsed.actions)).toBe(true);
  });

  it('null ที่ตั้งใจ (ค่าเริ่มต้นไม่ใช่อาเรย์) ต้องไม่ถูกทับ', () => {
    const defaults = { a: null as unknown, b: [1] };
    const got = fillMissingTopLevel({ a: null } as typeof defaults, defaults);
    expect(got.a).toBeNull();
  });

  it('คัดลอกลึก — แก้ข้อมูลผู้ใช้แล้วต้องไม่ไปโดน DEFAULT_DATA', () => {
    const before = DEFAULT_DATA.actions.length;
    const parsed = fillMissingTopLevel({ rev: 1 } as unknown as AppData, DEFAULT_DATA);
    parsed.actions.push({ ...parsed.actions[0], title: 'ของใหม่' });
    expect(DEFAULT_DATA.actions.length).toBe(before);
    expect(parsed.actions).not.toBe(DEFAULT_DATA.actions);
  });

  it('ออบเจ็กต์ว่างเปล่าต้องได้ทุกคีย์ของ DEFAULT_DATA', () => {
    const parsed = fillMissingTopLevel({} as AppData, DEFAULT_DATA);
    for (const key of Object.keys(DEFAULT_DATA)) {
      expect((parsed as unknown as Record<string, unknown>)[key]).toBeDefined();
    }
  });
});
