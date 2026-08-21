/* ===== ตรรกะตัดสินใจตอนโหลดข้อมูล workspace (pure — เทสต์ได้) =====
 * ปิดบั๊ก race: สลับ workspace เร็ว ๆ แล้วข้อมูลของ ws เดิมถูกเขียนทับ ws ใหม่
 * เหตุ: ตอน load ws ใหม่ อ่าน dataRef.current ซึ่งยังเป็นข้อมูลของ ws เดิม
 *       ถ้า local.rev > cloud.rev ก็ push ข้อมูล ws เดิมขึ้น ws ใหม่ → ปนกัน
 * แก้: ตัดสินใจโดยดูว่า "local เป็นของ ws นี้จริงไหม" (localBelongsToThisWs) */

/** เจ้าของข้อมูลที่ค้างอยู่ใน localStorage ของเบราว์เซอร์เครื่องนี้
 *  'guest'   = งานที่ทำไว้ตอนยังไม่ล็อกอิน บนเครื่องนี้ (ตั้งใจให้ยกเข้าบัญชีตอนสมัคร)
 *  'self'    = ของคนที่กำลังล็อกอินอยู่
 *  'foreign' = ของบัญชีอื่น
 *  'unknown' = **พิสูจน์ไม่ได้ว่าเป็นของใคร** — ต้องปฏิบัติเหมือน foreign (ดูเหตุผลใน resolveWsLoad) */
export type LocalOwnership = 'self' | 'guest' | 'foreign' | 'unknown';

/** ค่าที่เขียนลง localStorage เมื่อทำงานอยู่โดยยังไม่ล็อกอิน */
export const GUEST_OWNER = 'guest';

/** แปลง (เจ้าของที่บันทึกไว้, uid ที่ล็อกอินอยู่) → สถานะความเป็นเจ้าของ
 *  ⚠️ ไม่มีเจ้าของบันทึกไว้ หรือยังไม่รู้ว่าใครล็อกอินอยู่ = 'unknown' ห้ามเดาว่าเป็นของเจ้าตัว */
export function localOwnership(localOwner: string | null, currentUid: string | null | undefined): LocalOwnership {
  if (localOwner === GUEST_OWNER) return 'guest';
  if (!localOwner || !currentUid) return 'unknown';
  return localOwner === currentUid ? 'self' : 'foreign';
}

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
  /** 🔴 ข้อมูลที่ค้างในเบราว์เซอร์นี้เป็นของใคร — ตัวชี้ขาดว่าจะ push ขึ้นบัญชีใหม่ได้ไหม
   *
   * บั๊กจริงรอบที่ 1 (20 ส.ค. 2569): ผู้ใช้ใหม่สมัครบนเบราว์เซอร์ที่เคยมีคนอื่นใช้
   *   → `dataWsRef` เป็น null เสมอตอนโหลดหน้าใหม่ (useRef ไม่ persist) → localIsUnbound = true
   *   → ระบบเข้าใจว่า "งาน guest ของเจ้าตัว" → push ขึ้น ws ใหม่
   *   ⇒ ข้อมูลธุรกิจของคนก่อนหน้าถูกคัดลอกเข้าบัญชีของคนใหม่ทั้งก้อน
   *
   * บั๊กจริงรอบที่ 2 (21 ส.ค. 2569 — **เกิดซ้ำทั้งที่แก้รอบแรกไปแล้ว**): ตัวกันของเดิมเป็น
   *   `localOwner && currentUid && localOwner !== currentUid` ⇒ **ถ้าฝั่งใดฝั่งหนึ่งไม่รู้ค่า
   *   มันคืน false = "ไม่ใช่ของคนอื่น" แล้วปล่อยให้ push** (fail-open)
   *   ซึ่งเกิดได้ง่ายมากอย่างน้อย 2 ทาง:
   *     ① เบราว์เซอร์ที่ใช้แอปมาก่อนหน้าที่จะมีตัวกัน = ไม่เคยมีเจ้าของบันทึกไว้เลย
   *     ② โค้ดเดิมเรียก `writeLocalOwner(session?.user.id)` ทุกครั้งที่เซฟ — ตอนยังไม่ล็อกอิน
   *        ค่านั้นเป็น undefined ⇒ **ลบเครื่องหมายเจ้าของทิ้ง** ทั้งที่ข้อมูลของคนเก่ายังอยู่
   *   ยืนยันจาก production: workspace ของบัญชีใหม่กับของแอดมิน มีคีย์ตรงกันทุกไบต์ 36 จาก 40 คีย์
   *   (ชื่อบริษัท เป้าหมาย BMC ลูกค้า ทรัพยากร การเงิน และแม้แต่ `plan: "scale"` ที่ไม่เคยซื้อ)
   *
   * ⇒ กติกาใหม่ต้อง **fail-closed**: จะ push ข้อมูลเดิมขึ้นบัญชีได้ ก็ต่อเมื่อ
   *   *พิสูจน์ได้* ว่าเป็นของเจ้าตัว ('self') หรือเป็นงาน guest บนเครื่องนี้ ('guest')
   *   "ไม่รู้ว่าเป็นของใคร" ต้องถือว่าเป็นของคนอื่นไว้ก่อนเสมอ
   *   (เสียงานร่างของตัวเอง = กู้คืนได้จากคลาวด์/สำเนาสำรอง · ข้อมูลรั่วข้ามบัญชี = กู้ความเชื่อใจไม่ได้) */
  ownership?: LocalOwnership;
}): WsLoadAction {
  const { hasCloud, cloudRev, localRev, localBelongsToThisWs, localIsUnbound = false, ownership = 'unknown' } = args;
  // ของคนอื่น หรือพิสูจน์ไม่ได้ว่าเป็นของใคร: ใช้คลาวด์ถ้ามี ไม่มีก็เริ่มใหม่ — ห้าม push เด็ดขาด
  if (ownership === 'foreign' || ownership === 'unknown') return hasCloud ? 'use-cloud' : 'init-fresh-push';
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
