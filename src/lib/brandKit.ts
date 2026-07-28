// brandKit.ts — สร้าง "Brand Guidelines" ต่อบริษัทของผู้ใช้ (ต่อยอดจาก companyIdentity: ชื่อ+โลโก้)
// pure + deterministic → พาเลตสี + คู่ฟอนต์ไทย + แนวทางใช้โลโก้ · ของบริษัท user (ไม่ใช่แบรนด์ Anthropic)

import { logoSvg, monogram } from './companyIdentity';

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;

export interface BrandSwatch { name: string; role: string; value: string; }
export interface BrandPalette {
  primary: string; secondary: string; accent: string; dark: string; light: string;
  swatches: BrandSwatch[];
}
export interface BrandFonts { heading: string; body: string; note: string; }
export interface BrandKit {
  palette: BrandPalette;
  fonts: BrandFonts;
  logoSvg: string;
  monogram: string;
  guidelines: string[];
}

// คู่ฟอนต์ไทย (Google Fonts) — อ่านง่าย รองรับไทยเต็ม
const FONT_PAIRS: BrandFonts[] = [
  { heading: 'Kanit', body: 'Sarabun', note: 'โมเดิร์น อ่านง่าย เหมาะธุรกิจทั่วไป' },
  { heading: 'Prompt', body: 'Sarabun', note: 'เรียบหรู เหมาะแบรนด์พรีเมียม/บริการ' },
  { heading: 'Kanit', body: 'Prompt', note: 'ทันสมัย มีบุคลิก เหมาะสินค้าไลฟ์สไตล์' },
  { heading: 'IBM Plex Sans Thai', body: 'Sarabun', note: 'สุขุม น่าเชื่อถือ เหมาะ B2B/องค์กร' },
];

/** สร้าง Brand Kit จากชื่อบริษัท (+ประเภทธุรกิจ) — deterministic ต่อชื่อเดียว */
export function buildBrandKit(name: string, industry?: string): BrandKit {
  const h = hash(name || 'brand') % 360;
  const primary = hsl(h, 62, 45);
  const secondary = hsl(h + 28, 55, 52);
  const accent = hsl(h + 180, 66, 50);
  const dark = hsl(h, 30, 14);
  const light = hsl(h, 30, 97);
  const fonts = FONT_PAIRS[hash(name + '|font') % FONT_PAIRS.length];
  const dom = (industry ?? '').replace(/\[[A-Z]\]\s*/, '').trim();

  return {
    palette: {
      primary, secondary, accent, dark, light,
      swatches: [
        { name: 'Primary', role: 'สีหลัก — โลโก้ ปุ่มหลัก หัวข้อเด่น', value: primary },
        { name: 'Secondary', role: 'สีรอง — พื้นหลังส่วน เน้นข้อมูลรอง', value: secondary },
        { name: 'Accent', role: 'สีเน้น — CTA ป้ายโปรโมชัน (ใช้น้อย ๆ)', value: accent },
        { name: 'Dark', role: 'ตัวอักษรหลัก พื้นเข้ม', value: dark },
        { name: 'Light', role: 'พื้นหลังสว่าง การ์ด', value: light },
      ],
    },
    fonts,
    logoSvg: logoSvg(name),
    monogram: monogram(name),
    guidelines: [
      `ใช้สี Primary กับโลโก้และองค์ประกอบหลักให้สม่ำเสมอทุกช่องทาง${dom ? ` (${dom})` : ''}`,
      'Accent ใช้เฉพาะจุดที่ต้องการให้คลิก/สังเกต — อย่าใช้ทั้งหน้า',
      `หัวข้อใช้ฟอนต์ ${fonts.heading} · เนื้อหาใช้ ${fonts.body} — ไม่ปนฟอนต์อื่นเกิน 2 แบบ`,
      'โลโก้: เว้นระยะขอบรอบโลโก้อย่างน้อยเท่าความสูงของตัวอักษรย่อ · ห้ายืด/บิดสัดส่วน',
      'พื้นเข้มใช้โลโก้/ตัวอักษรสีอ่อน · พื้นสว่างใช้สีเข้ม เพื่อคอนทราสต์ที่อ่านออก',
    ],
  };
}
