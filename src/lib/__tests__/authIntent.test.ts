import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldWarnWrongAccount, wrongAccountText } from '../authIntent';

describe('กดลิงก์สมัคร แต่ล็อกอินค้างอยู่ → ต้องเตือน ห้ามเงียบ', () => {
  const base = { cameForAuth: true, hasSession: true, dismissed: false };

  it('🔴 เคสที่เป็นบั๊กจริง: ตั้งใจมาสมัคร + มี session ค้าง → ต้องเตือน', () => {
    expect(shouldWarnWrongAccount(base)).toBe(true);
  });

  it('ไม่มี session (คนใหม่จริง ๆ) → ไม่ต้องเตือน จะได้ไม่กวน', () => {
    expect(shouldWarnWrongAccount({ ...base, hasSession: false })).toBe(false);
  });

  it('เข้ามาเองไม่ได้กดลิงก์สมัคร → ไม่ต้องเตือน', () => {
    expect(shouldWarnWrongAccount({ ...base, cameForAuth: false })).toBe(false);
  });

  it('กด "ใช้บัญชีนี้ต่อ" แล้ว → หยุดเตือน (ห้ามตื๊อ)', () => {
    expect(shouldWarnWrongAccount({ ...base, dismissed: true })).toBe(false);
  });

  it('ข้อความต้องบอก "เป็นใคร" ไม่ใช่แค่ "คุณล็อกอินอยู่"', () => {
    expect(wrongAccountText('a@b.com')).toContain('a@b.com');
    // ไม่มีอีเมลก็ต้องไม่พังและต้องไม่โกหกว่ารู้
    expect(wrongAccountText(null)).not.toContain('undefined');
    expect(wrongAccountText(undefined).length).toBeGreaterThan(10);
  });
});

describe('App.tsx ต้องใช้เงื่อนไขนี้จริง (กันแก้แล้วหลุดอีกรอบ)', () => {
  const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');

  it('แถบเตือนต้องอยู่ "นอก" กำแพง !session — ไม่งั้นมันจะไม่มีวันถูกเรนเดอร์', () => {
    expect(app).toMatch(/cameForAuth\s*&&\s*session\s*&&/);
  });

  it('ต้อง latch ค่าจาก query ไว้ ไม่อ่านสด (query ถูกล้างทิ้งหลัง mount)', () => {
    expect(app).toMatch(/const\s+\[cameForAuth\]\s*=\s*useState\(/);
  });

  it('ปุ่มต้องพาไปหน้าสมัครจริงหลังออกจากระบบ ไม่ใช่แค่ signOut แล้วทิ้งไว้', () => {
    const fn = app.match(/async function signOutThenSignup\(\)[\s\S]{0,400}?\n  \}/);
    expect(fn, 'ไม่พบ signOutThenSignup').toBeTruthy();
    expect(fn![0]).toContain('setShowAuth(true)');
  });
});
