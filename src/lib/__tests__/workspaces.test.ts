import { describe, it, expect } from 'vitest';
import { wsSaveOk, isMissingRpc } from '../workspaces';

/* compare-and-set (0040) — ตรรกะ map outcome/error ต้องเชื่อได้ (data-integrity core) */

describe('wsSaveOk', () => {
  it("'written' → true (เซฟลงจริง)", () => {
    expect(wsSaveOk('written')).toBe(true);
  });
  it("'stale' → true (cloud ใหม่กว่า ไม่เขียนทับ แต่ปลอดภัย ไม่ต้อง retry)", () => {
    expect(wsSaveOk('stale')).toBe(true);
  });
  it("'denied' → false (ไม่ใช่สมาชิก)", () => {
    expect(wsSaveOk('denied')).toBe(false);
  });
  it('null/undefined/ค่าแปลก → false', () => {
    expect(wsSaveOk(null)).toBe(false);
    expect(wsSaveOk(undefined)).toBe(false);
    expect(wsSaveOk('???')).toBe(false);
  });
});

describe('isMissingRpc — ตรวจว่า RPC ยังไม่ deploy (ให้ fallback)', () => {
  it('PostgREST PGRST202 (ไม่พบฟังก์ชัน) → true', () => {
    expect(isMissingRpc({ code: 'PGRST202', message: 'Could not find the function' })).toBe(true);
  });
  it('Postgres 42883 (undefined_function) → true', () => {
    expect(isMissingRpc({ code: '42883', message: 'function ws_save_state does not exist' })).toBe(true);
  });
  it('error อื่น (network/permission) → false (ไม่ fallback)', () => {
    expect(isMissingRpc({ code: '500', message: 'internal error' })).toBe(false);
  });
  it('null → false', () => {
    expect(isMissingRpc(null)).toBe(false);
  });
});
