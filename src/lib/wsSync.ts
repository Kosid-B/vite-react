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
}): WsLoadAction {
  const { hasCloud, cloudRev, localRev, localBelongsToThisWs, localIsUnbound = false } = args;
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
