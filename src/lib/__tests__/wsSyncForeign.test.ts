import { describe, it, expect } from 'vitest';
import { resolveWsLoad } from '../wsSync';
import { isForeignLocalData } from '../../App';

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

  it('พฤติกรรมเดิมต้องไม่พัง — งาน guest ที่ไม่มีเจ้าของ ยัง migrate ขึ้น ws ใหม่ได้', () => {
    expect(resolveWsLoad({
      hasCloud: false, cloudRev: 0, localRev: 5,
      localBelongsToThisWs: false, localIsUnbound: true, localIsForeign: false,
    })).toBe('keep-local-push');
  });

  it('พฤติกรรมเดิมต้องไม่พัง — local ของ ws นี้และใหม่กว่า ยังชนะคลาวด์', () => {
    expect(resolveWsLoad({
      hasCloud: true, cloudRev: 2, localRev: 7,
      localBelongsToThisWs: true, localIsForeign: false,
    })).toBe('keep-local-push');
  });
});
