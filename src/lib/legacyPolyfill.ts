/* legacyPolyfill — เติมเมธอดที่เบราว์เซอร์เก่ายังไม่มี ก่อนโค้ดอื่นทำงาน
 *
 * 🔴 ปัญหาจริงที่พบใน production (ตรวจ `client_errors` 10 ก.ย. 2569):
 *   `this.i.at is not a function` · `t.entries.at is not a function` (27 ส.ค. · 4 ครั้ง)
 *   ⇒ ผู้ใช้บางคน **เห็นหน้าขาว** ไม่ใช่แค่ฟีเจอร์เสีย
 *
 * ⚠️ `Array.prototype.at` มาใน Safari 15.4 — ผู้ใช้ iOS เก่ากว่านั้นไม่มี
 *    และกลุ่มผู้ชมเรา **45+ = 58%** ⇒ เครื่องเก่าเป็นเรื่องปกติ ไม่ใช่ขอบเคส
 *
 * 🔴 จุดที่พลาดง่ายและผมเกือบพลาดเอง: **ลด `build.target` ไม่ช่วย**
 *    esbuild แปลงได้แค่ *ไวยากรณ์* — `.at()` เป็น **เมธอดของ runtime**
 *    ลด target ให้ต่ำแค่ไหนก็ไม่มีใครเติมให้ ⇒ ต้อง polyfill เท่านั้น
 *
 * ⚠️ `.at()` **ไม่ได้มาจากโค้ดเรา** (grep แล้วไม่เจอสักที่) — มาจาก dependency ที่ bundle เข้ามา
 *    ⇒ เลี่ยงด้วยการ "ไม่ใช้" ไม่ได้ ต้องเติมให้ระบบ
 */

function atPolyfill(this: { length: number; [i: number]: unknown }, n: number): unknown {
  const len = this.length;
  const i = Math.trunc(n) || 0;
  const k = i < 0 ? len + i : i;
  return k < 0 || k >= len ? undefined : this[k];
}

/** เรียกให้เร็วที่สุดใน main.tsx — ต้องมาก่อนโค้ดใด ๆ ที่อาจเรียก `.at()` */
export function installLegacyPolyfills(): void {
  for (const proto of [Array.prototype, String.prototype]) {
    if (typeof (proto as { at?: unknown }).at !== 'function') {
      Object.defineProperty(proto, 'at', {
        value: atPolyfill, writable: true, configurable: true, enumerable: false,
      });
    }
  }
}
