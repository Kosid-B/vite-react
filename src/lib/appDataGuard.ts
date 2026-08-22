/* ===== ชั้นกันพัง: ข้อมูลจากคลาวด์ต้องครบตาม schema ก่อนเข้าแอป (pure — เทสต์ได้) =====
 *
 * 🔴 บั๊กจริง 22 ส.ค. 2569 — เว็บเปิดไม่ได้เลย ขึ้น "เกิดข้อผิดพลาดชั่วคราว" ทั้งหน้า
 *   ต้นเหตุ: แถวใน `workspace_state` ถูกเขียนเป็น `{"rev": 9999}` (ตอนล้างข้อมูลให้ผู้ใช้เริ่มใหม่)
 *   → `resolveWsLoad` เห็นว่ามีคลาวด์ ⇒ 'use-cloud' ⇒ `migrate(cloud)` ⇒ `data.actions` เป็น undefined
 *   → `data.actions.filter(...)` โยน TypeError ⇒ ErrorBoundary กินทั้งหน้า ⇒ ผู้ใช้เข้าระบบไม่ได้
 *   หลักฐาน: `client_errors` 7 แถว "undefined is not an object (evaluating 'e.actions.filter')" path=/
 *
 * บทเรียน (ledger): **`cloud as AppData` คือ "การประกาศ" ไม่ใช่ "การตรวจ"**
 *   migrate() เดิมกันไว้ทีละคีย์ตามที่นึกออก (funnel/roi/businessModel/…) — คีย์ที่ "มีมาตั้งแต่วันแรก"
 *   อย่าง actions/tasks/agents ไม่มีใครกันไว้ เพราะสมมติว่ามันต้องมีเสมอ
 *   ⇒ กันทีละคีย์ = กันได้เฉพาะคีย์ที่เคยพัง · ที่ถูกคือกัน **ทุกคีย์** จากค่าเริ่มต้นโดยอัตโนมัติ
 *
 * ขอบเขตโดยตั้งใจ: เติมเฉพาะ "คีย์บนสุด" ที่หายไป/ชนิดผิดจากอาเรย์ — ไม่ไล่ลึกทั้งต้นไม้
 *   (ของลึกกว่านั้นยังเป็นหน้าที่ของ migrate รายฟีเจอร์ ซึ่งรู้บริบทว่าคีย์ย่อยไหนสำคัญ)
 */

/** คัดลอกลึกแบบไม่แชร์ reference — สำคัญมาก ไม่งั้นผู้ใช้แก้ข้อมูลแล้วไปโดน DEFAULT_DATA ทั้งก้อน */
function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * เติมคีย์บนสุดที่ขาดให้ครบตามค่าเริ่มต้น แล้วคืนออบเจ็กต์เดิม (แก้ในที่)
 *
 * เติมเมื่อ:
 *   ① คีย์นั้น `undefined` (ไม่มีในข้อมูลที่โหลดมา)
 *   ② ค่าเริ่มต้นเป็นอาเรย์ แต่ของที่โหลดมาไม่ใช่อาเรย์ — เพราะนี่คือชนิดที่พังทันทีที่เรียก
 *      `.filter/.map/.some` ซึ่งเป็นรูปแบบที่ทำให้ทั้งหน้าล่มจริง
 *
 * ไม่เติมเมื่อค่าที่โหลดมาเป็น `null` และค่าเริ่มต้นไม่ใช่อาเรย์ — `null` เป็นค่าที่ตั้งใจได้
 * (เช่น `coupon` ที่ยังไม่มีคูปอง) การทับด้วยค่าเริ่มต้นจะกลายเป็นแก้ข้อมูลผู้ใช้โดยพลการ
 */
export function fillMissingTopLevel<T extends object>(parsed: T, defaults: T): T {
  const target = parsed as Record<string, unknown>;
  const src = defaults as unknown as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    const dv = src[key];
    if (dv === undefined) continue;
    const cur = target[key];
    const needsFill = cur === undefined || (Array.isArray(dv) && !Array.isArray(cur));
    if (needsFill) target[key] = deepCopy(dv);
  }
  return parsed;
}

/** คีย์บนสุดที่ค่าเริ่มต้นเป็นอาเรย์ — รายการนี้คือชุดที่ "พังทั้งหน้า" ได้ถ้าหาย (ใช้ในเทสต์) */
export function arrayKeysOf<T extends object>(defaults: T): string[] {
  const src = defaults as unknown as Record<string, unknown>;
  return Object.keys(src).filter(k => Array.isArray(src[k]));
}
