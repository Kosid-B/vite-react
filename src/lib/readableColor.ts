/* ===== สีจากข้อมูลต้องอ่านออกบนพื้นจริง (pure · เทสต์ได้) =====
 *
 * 🔴 บั๊กจริง 22 ส.ค. 2569 — วัดด้วย contrast-audit บนเบราว์เซอร์จริง 50 หน้า
 *    ข้อความที่ contrast ต่ำที่สุดหลายจุด **ไม่ได้มาจาก CSS** แต่มาจาก inline style
 *    ที่เอาสีจากข้อมูลมาใส่ตรง ๆ:
 *      Dashboard.tsx  <div className="db-cp-chip" style={{ color: col.color }}>
 *      AICompany.tsx  <div className="skm-card-cat" style={{ color: catMeta.color }}>
 *      CompanyCity.tsx <div className="city-tier-name" style={{ color: s.level.color }}>
 *    สีพวกนี้ถูกเลือกไว้ตอนออกแบบพาเลตต์ โดยไม่รู้ว่าจะไปวางบนพื้นสีอะไร
 *    ⇒ วัดได้ contrast 1.01 (เกือบดำบนกรมท่า) = มองไม่เห็นเลย
 *
 * ⚠️ inline style ชนะทุกกฎใน stylesheet (ที่ไม่มี !important)
 *    ⇒ **แก้ด้วย CSS override ไม่ได้ ต้องแก้ที่จุดที่ส่งสีเข้าไป**
 *
 * วิธี: คงเฉดสีเดิมไว้ ปรับเฉพาะความสว่างจนตัดกับพื้นพอ — แบรนด์ยังอยู่ แต่อ่านออก
 */

/** พื้นผิวมาตรฐานของแอป (ธีมเข้ม) — ตรงกับ --bg3 / --bg ใน index.css */
export const SURFACE_DARK = '#0f172a';
export const SURFACE_DARKEST = '#020617';
export const SURFACE_LIGHT = '#ffffff';

/** เกณฑ์ WCAG AA สำหรับตัวอักษรขนาดปกติ */
export const AA_NORMAL = 4.5;

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (c: Rgb) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

function luminance(c: Rgb): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

/** อัตราส่วนความต่างของสองสี (1 = เหมือนกันเป๊ะ · 21 = ดำกับขาว) */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a), cb = parseHex(b);
  if (!ca || !cb) return 1;
  const la = luminance(ca), lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHsl(c: Rgb): [number, number, number] {
  const [r, g, b] = c.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/**
 * ปรับสีให้อ่านออกบนพื้นที่กำหนด โดย **คงเฉดสีเดิม** เปลี่ยนแค่ความสว่าง
 * คืนสีเดิมทันทีถ้าผ่านเกณฑ์อยู่แล้ว · คืนขาว/ดำถ้าเฉดนั้นไม่มีความสว่างไหนผ่านเลย
 *
 * ⚠️ ไล่ทีละขั้นจาก "สีเดิม" ออกไป ไม่ใช่จากปลายสุด
 *    (เคยพลาด: ไล่จากปลายแล้วได้ #000000 ทุกตัว — เฉดเดิมหายหมด)
 */
export function readableOn(color: string | undefined | null, surface: string = SURFACE_DARK, target: number = AA_NORMAL): string {
  if (!color) return 'inherit';            // ไม่มีสีจากข้อมูล → ปล่อยให้สืบทอด ไม่เดา
  const c = parseHex(color);
  if (!c) return color;                                   // ไม่ใช่ hex → ปล่อยผ่าน ไม่เดา
  if (contrastRatio(color, surface) >= target) return color;
  const sBg = parseHex(surface);
  if (!sBg) return color;
  const [h, s] = rgbToHsl(c);
  const [, , l0] = rgbToHsl(c);
  const goLighter = luminance(sBg) < 0.35;                 // พื้นเข้ม → ตัวอักษรต้องสว่างขึ้น
  for (let step = 0; step <= 100; step++) {
    const l = goLighter ? Math.min(1, l0 + step / 100) : Math.max(0, l0 - step / 100);
    const cand = toHex(hslToRgb(h, s, l));
    if (contrastRatio(cand, surface) >= target) return cand;
    if (l === 0 || l === 1) break;
  }
  return goLighter ? '#ffffff' : '#000000';
}
