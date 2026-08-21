import { describe, it, expect } from 'vitest';
import { resolveWsLoad, isForeignLocalData, localOwnership, GUEST_OWNER } from '../wsSync';

/* 🔴 บั๊กข้อมูลรั่วข้ามบัญชี (พบบน production 20 ส.ค. 2569)
 *
 * อาการ: ผู้ใช้ใหม่ (keawtao2520@gmail.com) สมัคร+ล็อกอินบนเบราว์เซอร์ที่เคยล็อกอินบัญชีเจ้าของ
 *   → เวิร์กสเปซใหม่ถูกสร้างถูกต้อง แต่ **ข้อมูลธุรกิจของเจ้าของถูกคัดลอกเข้าไปทั้งก้อน**
 *   ยืนยัน: `md5(workspace_state.data)` ของสองบัญชีตรงกันทุกไบต์ (121,448 bytes)
 *   และหน้าจอบัญชีใหม่ขึ้น "ไม่ได้เจอกัน 4 วัน · 20/24 (83%)" ทั้งที่เพิ่งสมัครนาทีนั้น
 *
 * ต้นเหตุ: `dataWsRef` เป็น useRef → รีเซ็ตเป็น null ทุกครั้งที่โหลดหน้าใหม่
 *   → `localIsUnbound = true` เสมอ → ระบบตีความว่า "งาน guest ของเจ้าตัว" → push ขึ้น ws ใหม่
 *   ⇒ "ไม่ผูก ws" ≠ "เป็นของคนที่กำลังล็อกอินอยู่"
 */

describe('isForeignLocalData — ข้อมูลใน localStorage เป็นของใคร', () => {
  it('🔴 เคสที่เป็นบั๊กจริง: ข้อมูลของ A ค้างอยู่ แล้ว B ล็อกอิน → ต้องบอกว่าเป็นของคนอื่น', () => {
    expect(isForeignLocalData('user-A', 'user-B')).toBe(true);
  });

  it('เจ้าของเดิมกลับมาเอง → ไม่ใช่ของคนอื่น', () => {
    expect(isForeignLocalData('user-A', 'user-A')).toBe(false);
  });

  it('งาน guest จริง ๆ (ไม่มีเจ้าของ) → ไม่ใช่ของคนอื่น จะได้ migrate ขึ้นบัญชีใหม่ได้ตามเดิม', () => {
    expect(isForeignLocalData(null, 'user-B')).toBe(false);
    expect(isForeignLocalData('', 'user-B')).toBe(false);
  });

  it('ยังไม่ล็อกอิน → ตัดสินไม่ได้ ต้องไม่บล็อก', () => {
    expect(isForeignLocalData('user-A', null)).toBe(false);
    expect(isForeignLocalData('user-A', undefined)).toBe(false);
  });
});

describe('resolveWsLoad — ข้อมูลของคนอื่น ห้าม push ขึ้นที่ไหนทั้งสิ้น', () => {
  const foreign = {
    hasCloud: false, cloudRev: 0, localRev: 99,
    localBelongsToThisWs: false, localIsUnbound: true, localIsForeign: true,
  };

  it('🔴 เคสจริง: ws ใหม่คลาวด์ว่าง + local เป็นของคนอื่น → เริ่มใหม่ ไม่ push', () => {
    expect(resolveWsLoad(foreign)).toBe('init-fresh-push');
  });

  it('local เป็นของคนอื่น + คลาวด์มีข้อมูล → ใช้คลาวด์ (ของเจ้าตัว)', () => {
    expect(resolveWsLoad({ ...foreign, hasCloud: true })).toBe('use-cloud');
  });

  it('ต่อให้ localRev สูงกว่ามาก ก็ห้ามชนะ — rev ของคนอื่นไม่เกี่ยวกับเรา', () => {
    expect(resolveWsLoad({ ...foreign, hasCloud: true, cloudRev: 1, localRev: 9999 }))
      .toBe('use-cloud');
    expect(resolveWsLoad({ ...foreign, hasCloud: true, localBelongsToThisWs: true, localRev: 9999 }))
      .toBe('use-cloud');
  });

  it('งาน guest ที่ "ทำเครื่องหมายไว้" ยัง migrate ขึ้น ws ใหม่ได้ (เส้นทางที่ตั้งใจ)', () => {
    expect(resolveWsLoad({
      hasCloud: false, cloudRev: 0, localRev: 5,
      localBelongsToThisWs: false, localIsUnbound: true, ownership: 'guest',
    })).toBe('keep-local-push');
  });

  it('🔴 แต่ "ไม่มีเจ้าของเลย" ห้าม migrate — นี่คือรูที่ทำให้บั๊กเกิดซ้ำรอบสอง', () => {
    // เทสต์เดิมเคยเขียนว่าเคสนี้ต้อง keep-local-push โดยเรียกมันว่า "งาน guest ที่ไม่มีเจ้าของ"
    // ซึ่งเป็นการยืนยันพฤติกรรมที่เป็นต้นเหตุเอง — ข้อมูลของบัญชีก่อนหน้าก็ "ไม่มีเจ้าของ" เหมือนกัน
    // แยกสองอย่างนี้ออกจากกันไม่ได้ถ้าไม่ทำเครื่องหมาย ⇒ ต้องเลือกฝั่งที่ปลอดภัยกว่า
    expect(resolveWsLoad({
      hasCloud: false, cloudRev: 0, localRev: 5,
      localBelongsToThisWs: false, localIsUnbound: true, ownership: 'unknown',
    })).toBe('init-fresh-push');
  });

  it('พฤติกรรมเดิมต้องไม่พัง — local ของ ws นี้และใหม่กว่า ยังชนะคลาวด์', () => {
    expect(resolveWsLoad({
      hasCloud: true, cloudRev: 2, localRev: 7,
      localBelongsToThisWs: true, ownership: 'self',
    })).toBe('keep-local-push');
  });
});

/* ══════════════════════════════════════════════════════════════════════
 * รอบที่ 2 — 21 ส.ค. 2569: บั๊กเดิม **เกิดซ้ำทั้งที่แก้ไปแล้ว 23 ชั่วโมงก่อนหน้า**
 * ตัวกันของเดิมเป็น fail-open: ถ้าฝั่งใดฝั่งหนึ่งไม่รู้ค่า มันบอกว่า "ไม่ใช่ของคนอื่น"
 * ยืนยันจาก production: workspace ของบัญชีใหม่ตรงกับของแอดมิน 36 จาก 40 คีย์
 *   รวมถึง plan: "scale" ที่บัญชีนั้นไม่เคยซื้อ และ signupAt ของอีกคน
 * ══════════════════════════════════════════════════════════════════════ */

describe('localOwnership — ต้อง fail-closed เมื่อพิสูจน์ไม่ได้', () => {
  it('ไม่มีเจ้าของบันทึกไว้ = unknown (ไม่ใช่ "ของเจ้าตัว")', () => {
    expect(localOwnership(null, 'user-B')).toBe('unknown');
  });

  it('🔴 ยังไม่รู้ว่าใครล็อกอินอยู่ = unknown — เคสนี้เองที่ตัวกันเดิมปล่อยผ่าน', () => {
    expect(localOwnership('user-A', undefined)).toBe('unknown');
    expect(localOwnership('user-A', null)).toBe('unknown');
  });

  it('ของคนอื่นชัดเจน = foreign · ของเจ้าตัว = self · งาน guest = guest', () => {
    expect(localOwnership('user-A', 'user-B')).toBe('foreign');
    expect(localOwnership('user-A', 'user-A')).toBe('self');
    expect(localOwnership(GUEST_OWNER, 'user-B')).toBe('guest');
  });

  it('ทุกสถานะที่ไม่ใช่ self/guest ห้าม push ขึ้นเวิร์กสเปซที่ยังว่าง', () => {
    for (const ownership of ['foreign', 'unknown'] as const) {
      expect(resolveWsLoad({
        hasCloud: false, cloudRev: 0, localRev: 9999,
        localBelongsToThisWs: true, localIsUnbound: true, ownership,
      }), ownership).toBe('init-fresh-push');
    }
  });
});

describe('App.tsx ต้องไม่กลับไปลบชื่อเจ้าของตอนยังไม่ล็อกอิน', () => {
  it('เซฟตอนไม่ล็อกอิน ต้องเขียนว่า guest ไม่ใช่ลบทิ้ง', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const app = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
    // ของเดิม: `if (uid) setItem(...) else removeItem(...)` ⇒ ทุกครั้งที่เซฟตอนไม่ล็อกอิน
    // เครื่องหมายเจ้าของถูกลบ ทั้งที่ข้อมูลของคนเก่ายังอยู่ = ตัวกันตาบอด
    expect(app).toContain("localStorage.setItem(DATA_OWNER_KEY, uid || GUEST_OWNER)");
    expect(app, 'ลบชื่อเจ้าของได้ทางเดียวคือ clearLocalOwner() ซึ่งเรียกคู่กับการลบข้อมูล')
      .toContain('clearLocalOwner()');
    expect(app).toContain('ownership: localOwnership(readLocalOwner(), session?.user.id)');
  });
});
