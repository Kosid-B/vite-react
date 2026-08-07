// slug.ts — แปลงข้อความเป็น slug สะอาดสำหรับ /b/<slug> (กัน slug เพี้ยน เช่นวาง URL เต็ม)
// รองรับตัวอักษรไทย · ตัด protocol/www · เหลือ a-z 0-9 ไทย และ '-' · pure + tested

const STRIP_PROTO = /^\s*https?:\/\//i;
const STRIP_WWW = /^www\./i;
const INVALID = /[^a-z0-9฀-๿]+/gi; // ไม่ใช่ อังกฤษเล็ก/เลข/ไทย → '-'

/** slug สมบูรณ์ (ตัดขีดหัว-ท้าย) — ใช้ตอนบันทึก/สร้างอัตโนมัติ */
export function slugify(input: string): string {
  const s = (input ?? '')
    .trim()
    .replace(STRIP_PROTO, '')
    .replace(STRIP_WWW, '')
    .toLowerCase()
    .replace(INVALID, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, ''); // กันตัดกลางคำแล้วเหลือขีดท้าย
  return s || 'my-business';
}

/** slug ระหว่างพิมพ์ (soft) — ไม่ตัดขีดท้าย เพื่อให้พิมพ์ต่อได้ · ตัด protocol/อักขระแปลก */
export function slugifyInput(input: string): string {
  return (input ?? '')
    .replace(STRIP_PROTO, '')
    .replace(STRIP_WWW, '')
    .toLowerCase()
    .replace(INVALID, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60);
}
