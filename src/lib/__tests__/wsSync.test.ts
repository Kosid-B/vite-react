import { describe, it, expect } from 'vitest';
import { resolveWsLoad, localBelongsTo } from '../wsSync';

/* ปิดบั๊ก race สลับ workspace — ตรรกะตัดสินใจต้องเชื่อได้ (data-integrity core) */

describe('localBelongsTo', () => {
  it('null (guest/ครั้งแรก) → เป็นของ ws นี้', () => {
    expect(localBelongsTo(null, 'B')).toBe(true);
  });
  it('ws เดียวกัน → ใช่', () => {
    expect(localBelongsTo('A', 'A')).toBe(true);
  });
  it('คนละ ws → ไม่ใช่ (กันปน)', () => {
    expect(localBelongsTo('A', 'B')).toBe(false);
  });
});

/* ⚠️ ตั้งแต่ 21 ส.ค. 2569 `ownership` เป็นส่วนหนึ่งของการตัดสินใจ และค่าเริ่มต้นคือ 'unknown'
 *    = ไม่ระบุ แปลว่า "พิสูจน์ไม่ได้ว่าเป็นของใคร" ⇒ ห้าม push (fail-closed)
 *    เทสต์ที่ตั้งใจทดสอบเส้นทางปกติ จึงต้องระบุ ownership ให้ชัด ไม่ใช่ปล่อยว่าง */
describe('resolveWsLoad', () => {
  it('มี cloud + local เป็นของ ws นี้ + ใหม่กว่า → keep-local-push (rev-guard)', () => {
    expect(resolveWsLoad({ hasCloud: true, cloudRev: 2, localRev: 5, localBelongsToThisWs: true, ownership: 'self' })).toBe('keep-local-push');
  });

  it('มี cloud + local เป็นของ ws นี้ แต่ cloud ใหม่กว่า → use-cloud', () => {
    expect(resolveWsLoad({ hasCloud: true, cloudRev: 9, localRev: 5, localBelongsToThisWs: true })).toBe('use-cloud');
  });

  it('🔑 บั๊กหลัก: มี cloud + local เป็นของ ws อื่น (แม้ rev สูง) → use-cloud (ห้าม push ข้าม ws)', () => {
    expect(resolveWsLoad({ hasCloud: true, cloudRev: 1, localRev: 99, localBelongsToThisWs: false })).toBe('use-cloud');
  });

  it('cloud ว่าง + local เป็นของ ws นี้ (ครั้งแรก/guest) → keep-local-push', () => {
    expect(resolveWsLoad({ hasCloud: false, cloudRev: 0, localRev: 3, localBelongsToThisWs: true, ownership: 'self' })).toBe('keep-local-push');
  });

  it('🔑 บั๊กหลัก: cloud ว่าง + local เป็นของ ws อื่น → init-fresh-push (เริ่มใหม่ ไม่ปน)', () => {
    expect(resolveWsLoad({ hasCloud: false, cloudRev: 0, localRev: 99, localBelongsToThisWs: false })).toBe('init-fresh-push');
  });

  it('guest สมัครใหม่: cloud ว่าง + งาน guest ที่ทำเครื่องหมายไว้ → keep-local-push (migrate งาน guest ขึ้น)', () => {
    // ⚠️ ต้องระบุ ownership: 'guest' — "ไม่ผูก ws" อย่างเดียวไม่พอ (ข้อมูลของบัญชีก่อนหน้าก็ไม่ผูกเหมือนกัน)
    expect(resolveWsLoad({ hasCloud: false, cloudRev: 0, localRev: 4, localBelongsToThisWs: false, localIsUnbound: true, ownership: 'guest' })).toBe('keep-local-push');
  });

  it('🔑 กันงานหาย: guest → ล็อกอินบัญชีเดิมที่มี cloud อยู่แล้ว (unbound, rev สูง) → use-cloud (ไม่ทับบัญชีจริงด้วยงาน scratch)', () => {
    expect(resolveWsLoad({ hasCloud: true, cloudRev: 3, localRev: 99, localBelongsToThisWs: false, localIsUnbound: true })).toBe('use-cloud');
  });
});
