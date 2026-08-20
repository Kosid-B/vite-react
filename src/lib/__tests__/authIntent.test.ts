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

describe('หน้าสมัคร — คำบนปุ่มต้องเป็นคำที่คนหา', () => {
  const auth = readFileSync(join(process.cwd(), 'src', 'components', 'Auth.tsx'), 'utf8');

  it('แท็บสมัครต้องเขียนว่า "สมัครสมาชิก" ไม่ใช่คำที่ต้องตีความ', () => {
    // ของจริง 20 ส.ค. 2569: แท็บชื่อ "เปิดพื้นที่ทำงาน" → เจ้าของระบบเองยังหาไม่เจอ
    // กดไปแท็บ "เข้าสู่ระบบ" แล้วเจอ "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ทั้งที่ยังไม่มีบัญชี
    const tab = auth.match(/mode === 'signup' \? 'active' : ''[\s\S]{0,160}?<\/button>/);
    expect(tab, 'ไม่พบแท็บสมัคร').toBeTruthy();
    expect(tab![0]).toContain('สมัครสมาชิก');
  });
});

describe('ออกจากระบบ — ต้องรู้ว่ามาจากปุ่มไหน และต้องกดพลาดไม่ได้', () => {
  const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  const sidebar = readFileSync(join(process.cwd(), 'src', 'components', 'Sidebar.tsx'), 'utf8');

  /* ของจริง 20 ส.ค. 2569: ผู้ใช้บอก "กดจ่ายค่าสมาชิกแล้วเด้งออก"
   * auth log ของ Supabase ยืนยันว่ามี logout จริงเวลา 07:59:20
   * แต่เราบอกไม่ได้ว่ามาจากปุ่มไหน เพราะไม่เคยบันทึก → ได้แต่เดา */

  it('signOut ต้องบันทึกว่ามาจากไหน (via) — ไม่งั้นครั้งหน้าก็ยังเดาอยู่ดี', () => {
    expect(app).toMatch(/async function signOut\(via\s*=/);
    expect(app).toMatch(/track\('sign_out',\s*\{\s*via\s*\}\)/);
  });

  it('ทุกจุดที่เรียก signOut ต้องระบุที่มา ไม่ปล่อยเป็น unknown', () => {
    // ปุ่มในเมนู + ปุ่มสลับบัญชี = 2 ที่ · ห้ามมีการเรียกแบบไม่ใส่เหตุผล
    expect(app).toContain("signOut('sidebar')");
    expect(app).toContain("signOut('auth_switch')");
    // ไม่นับ supabase.auth.signOut() ซึ่งเป็น API ของไลบรารี ไม่ใช่ฟังก์ชันของเรา
    const bare = (app.match(/(?<!auth\.)\bsignOut\(\)/g) ?? []);
    expect(bare, 'มีการเรียก signOut() ของเราโดยไม่บอกที่มา').toEqual([]);
  });

  it('ปุ่มออกจากระบบในเมนู ต้องถามยืนยันก่อน (กดพลาดบนมือถือแล้วเสียหาย)', () => {
    const btn = sidebar.match(/className="sidebar-signout"[\s\S]{0,320}?<\/button>/);
    expect(btn, 'ไม่พบปุ่มออกจากระบบ').toBeTruthy();
    expect(btn![0]).toContain('window.confirm');
  });
});
