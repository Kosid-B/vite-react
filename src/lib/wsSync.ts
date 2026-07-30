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
  localBelongsToThisWs: boolean;
}): WsLoadAction {
  const { hasCloud, cloudRev, localRev, localBelongsToThisWs } = args;
  if (hasCloud) {
    // rev-guard (กัน cloud เก่าทับ local ใหม่) ใช้ได้เฉพาะเมื่อ local เป็นของ ws นี้จริง
    if (localBelongsToThisWs && localRev > cloudRev) return 'keep-local-push';
    return 'use-cloud';
  }
  // คลาวด์ว่าง
  if (localBelongsToThisWs) return 'keep-local-push'; // ws เดิม/ครั้งแรก (เช่น งาน guest) → ดันขึ้น
  return 'init-fresh-push';                            // ws ใหม่ที่ยังไม่มีข้อมูล → เริ่มใหม่ ไม่ปน ws เดิม
}

/** local ถือว่าเป็นของ ws นี้เมื่อ: ยังไม่เคยผูกกับ ws ไหน (null = งาน guest/ครั้งแรก) หรือผูกกับ ws เดียวกัน */
export function localBelongsTo(dataWs: string | null, activeWs: string): boolean {
  return dataWs === null || dataWs === activeWs;
}
