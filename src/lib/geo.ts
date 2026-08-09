// geo.ts — พิกัดร้าน (ปักหมุด) pure helpers + tested
// ปักหมุดได้จาก: ปุ่ม "ตำแหน่งปัจจุบัน" (navigator.geolocation) หรือวางลิงก์ Google Maps / "lat,lng"
// ไม่พึ่งไลบรารีแผนที่/ไทล์ภายนอก (เลี่ยง CSP ฝั่ง Worker + dependency น้อย) —
//   แสดงเป็นลิงก์ Google Maps + emit GeoCoordinates ลง LocalBusiness schema (local SEO)

export interface GeoPoint { lat: number; lng: number; }

/** พิกัดใช้ได้จริงไหม: lat −90..90, lng −180..180, เป็นตัวเลขจริง และไม่ใช่ (0,0) (null island = ยังไม่ปักหมุด) */
export function validCoord(lat: unknown, lng: unknown): boolean {
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a < -90 || a > 90 || b < -180 || b > 180) return false;
  if (a === 0 && b === 0) return false;
  return true;
}

/** ปัดพิกัดเหลือ ~6 ตำแหน่ง (≈0.1 ม.) — พอสำหรับปักหมุดร้าน + ไม่เก็บละเอียดเกินจำเป็น */
export function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** แยกพิกัดจากอินพุตผู้ใช้: ลิงก์ Google Maps หลายรูปแบบ หรือ "lat, lng" ล้วน → GeoPoint | null
 *  ลำดับความสำคัญ: !3d!4d (หมุดสถานที่จริง) > @lat,lng (จุดกึ่งกลางแผนที่) > ?q=/ll= > "lat,lng" */
export function parseGeo(input: string): GeoPoint | null {
  const s = (input || '').trim();
  if (!s) return null;
  const place = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const at = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const query = s.match(/[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const plain = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  const m = place || at || query || plain;
  if (!m) return null;
  const lat = roundCoord(Number(m[1])), lng = roundCoord(Number(m[2]));
  return validCoord(lat, lng) ? { lat, lng } : null;
}

/** ลิงก์เปิด Google Maps ไปที่พิกัด (ใช้บนหน้าร้าน + ปุ่มนำทาง) */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
