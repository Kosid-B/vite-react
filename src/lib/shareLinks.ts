// shareLinks.ts — ลิงก์แชร์หน้าร้านไป LINE/Facebook (Viral Loop: ทุกการแชร์ = โฆษณา)
// หน้าร้านสาธารณะมี OG card + badge "สร้างด้วย CEO AI Thailand" อยู่แล้ว → แชร์แล้วเห็นแบรนด์
// pure + testable (สร้าง URL อย่างเดียว ไม่มี side-effect)

/** แชร์ไป LINE (lineit/share) — โชว์ OG card ของหน้าร้าน (มี badge แบรนด์ในตัว) */
export function lineShareUrl(url: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

/** แชร์ไป Facebook */
export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** ข้อความแชร์พร้อมชื่อร้าน (สำหรับ copy หรือแนบ) */
export function shareText(name: string, url: string): string {
  const n = (name || 'ร้านของเรา').trim();
  return `${n} — ดูสินค้า/บริการและติดต่อได้เลย 👉 ${url}`;
}
