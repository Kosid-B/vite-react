/* ===== ตรรกะตัดสินใจตอนโหลดข้อมูล workspace (pure — เทสต์ได้) =====
 * ปิดบั๊ก race: สลับ workspace เร็ว ๆ แล้วข้อมูลของ ws เดิมถูกเขียนทับ ws ใหม่
 * เหตุ: ตอน load ws ใหม่ อ่าน dataRef.current ซึ่งยังเป็นข้อมูลของ ws เดิม
 *       ถ้า local.rev > cloud.rev ก็ push ข้อมูล ws เดิมขึ้น ws ใหม่ → ปนกัน
 * แก้: ตัดสินใจโดยดูว่า "local เป็นของ ws นี้จริงไหม" (localBelongsToThisWs) */

export type WsLoadAction =
  | 'use-cloud'        // ใช้ข้อมูลจากคลาวด์ (setData(cloud))
  | 'keep-local-push'  // local เป็นของ ws นี้ + ใหม่กว่า/คลาวด์ว่าง → เก็บ local แล้ว push ขึ้น
  | 'init-fresh-push'; // สลับมา ws ใหม่ที่คลาวด์ว่าง + local เป็นของ ws อื่น → เริ่มด้วยข้อมูลเริ่มต้น (ไม่เอา ws เดิมมาปน)

export function resolveWsLoad(args: {
  hasCloud: boolean;
  cloudRev: number;
  localRev: number;
  localBelongsToThisWs: boolean;    // local ผูกกับ ws นี้ตรง ๆ (dataWs === ws)
  localIsUnbound?: boolean;         // local ยังไม่ผูก ws ไหนเลย (dataWs === null = งาน guest/ครั้งแรก) — default false
  /** 🔴 local เป็นข้อมูลของ "คนอื่น" ที่ค้างอยู่ในเบราว์เซอร์เครื่องนี้ — ห้าม push ขึ้นที่ไหนทั้งสิ้น
   *
   * บั๊กจริง (พบ 20 ส.ค. 2569): ผู้ใช้ใหม่สมัคร+ล็อกอินบนเบราว์เซอร์ที่เคยมีคนอื่นใช้
   *   → `dataWsRef` เป็น null เสมอตอนโหลดหน้าใหม่ (เป็น useRef ไม่ได้ persist)
   *   → localIsUnbound = true → ระบบเข้าใจว่า "งาน guest ของเจ้าตัว" → push ขึ้น ws ใหม่
   *   ⇒ **ข้อมูลธุรกิจของคนก่อนหน้าถูกคัดลอกเข้าบัญชีของคนใหม่ทั้งก้อน**
   *   ยืนยันจาก production: workspace_state ของสองบัญชี md5 ตรงกันทุกไบต์ (121,448 bytes)
   *
   * ⇒ "ไม่ผูก ws" ไม่ได้แปลว่า "เป็นของคนที่กำลังล็อกอินอยู่" — ต้องดูตัวตนของเจ้าของข้อมูลด้วย */
  localIsForeign?: boolean;
}): WsLoadAction {
  const { hasCloud, cloudRev, localRev, localBelongsToThisWs, localIsUnbound = false, localIsForeign = false } = args;
  // ข้อมูลของคนอื่น: ใช้คลาวด์ถ้ามี ไม่มีก็เริ่มใหม่ — ห้ามเอาไป push เด็ดขาด
  if (localIsForeign) return hasCloud ? 'use-cloud' : 'init-fresh-push';
  if (hasCloud) {
    // rev-guard (กัน cloud เก่าทับ local ใหม่) ใช้ได้เฉพาะเมื่อ local ผูกกับ ws นี้ "ตรง ๆ"
    // ⚠️ งาน guest ที่ยังไม่ผูก (unbound) ห้ามทับ cloud จริงของผู้ใช้ที่กลับมาล็อกอิน (กันงาน scratch ทับบัญชีจริง)
    if (localBelongsToThisWs && localRev > cloudRev) return 'keep-local-push';
    return 'use-cloud';
  }
  // คลาวด์ว่าง → เก็บ local ที่เป็นของ ws นี้ หรือ งาน guest ครั้งแรก (migrate ขึ้น) · local ของ ws อื่น → เริ่มใหม่ ไม่ปน
  if (localBelongsToThisWs || localIsUnbound) return 'keep-local-push';
  return 'init-fresh-push';
}

/** local ถือว่าเป็นของ ws นี้เมื่อ: ยังไม่เคยผูกกับ ws ไหน (null = งาน guest/ครั้งแรก) หรือผูกกับ ws เดียวกัน */
export function localBelongsTo(dataWs: string | null, activeWs: string): boolean {
  return dataWs === null || dataWs === activeWs;
}

/** ข้อมูลใน localStorage เป็นของ "คนอื่น" ไหม — มีเจ้าของที่ระบุไว้ และไม่ใช่คนที่กำลังล็อกอินอยู่
 *  (เดิมอยู่ใน App.tsx — ย้ายมาที่นี่เพราะ export ที่ไม่ใช่คอมโพเนนต์ในไฟล์คอมโพเนนต์
 *   ทำให้ Vite Fast Refresh พังทั้งไฟล์ · และตรรกะนี้เป็นเพื่อนบ้านของ resolveWsLoad อยู่แล้ว) */
export function isForeignLocalData(localOwner: string | null, currentUid: string | null | undefined): boolean {
  return !!localOwner && !!currentUid && localOwner !== currentUid;
}
