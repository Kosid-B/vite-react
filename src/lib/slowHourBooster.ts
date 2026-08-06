// slowHourBooster.ts — (B) ดึงคนช่วงว่าง + ลูกค้าเก่ากลับมา (เติมชั่วโมงที่เงียบ)
// สร้างข้อความโปรฯ แบบมีกรอบเวลา "จริง" (ไม่หลอก) + เคล็ดทำให้ลูกค้ากลับมาซ้ำ · pure + tested
import { shopKind, type ShopKind } from './recurringDemand';

export interface FlashPromo {
  headline: string;
  body: string;
  hashtags: string;
}

const clampPct = (p?: number) => Math.min(50, Math.max(5, Math.round(p && p > 0 ? p : 15)));

const ANGLE: Record<ShopKind, (name: string, pct: number, win: string) => Omit<FlashPromo, 'hashtags'>> = {
  food: (name, pct, win) => ({
    headline: `🍽️ ช่วง ${win} คนน้อย — ${name} ลด ${pct}%`,
    body: `เฉพาะวันนี้ ${win} · สั่งผ่าน LINE/ทักแชทรับก่อนใคร ไม่ต้องต่อคิว · ของสด ทำใหม่ทุกจาน`,
  }),
  carcare: (name, pct, win) => ({
    headline: `🚗 คิวว่างช่วง ${win} — ${name} ลด ${pct}%`,
    body: `ล้างช่วง ${win} วันนี้ ไม่ต้องรอคิว ลด ${pct}% · จองผ่าน LINE ล็อกเวลาได้เลย`,
  }),
  beauty: (name, pct, win) => ({
    headline: `💆 คิวว่าง ${win} — ${name} ลด ${pct}%`,
    body: `จองด่วนช่วง ${win} วันนี้ รับส่วนลด ${pct}% · ทักไลน์จองเวลาที่สะดวก`,
  }),
  retail: (name, pct, win) => ({
    headline: `🛍️ ${win} วันนี้เท่านั้น — ${name} ลด ${pct}%`,
    body: `แวะช่วง ${win} รับส่วนลด ${pct}% หรือทักไลน์สั่งของ ส่งให้ถึงที่`,
  }),
  service: (name, pct, win) => ({
    headline: `🔧 คิวว่าง ${win} — ${name} ลด ${pct}%`,
    body: `จองงานช่วง ${win} วันนี้ ลด ${pct}% · ทักไลน์นัดเวลาได้เลย`,
  }),
  other: (name, pct, win) => ({
    headline: `⏰ ${win} วันนี้ — ${name} ลดพิเศษ ${pct}%`,
    body: `เฉพาะช่วง ${win} วันนี้ · ทักไลน์/แชทรับสิทธิ์ก่อนใคร`,
  }),
};

/** สร้างข้อความโปรฯ ช่วงว่าง (มีกรอบเวลาจริงที่ร้านกำหนด — ไม่ใช่ scarcity หลอก) */
export function flashPromo(shopName: string, shopText: string, opts?: { discountPct?: number; from?: string; to?: string }): FlashPromo {
  const name = (shopName || 'ร้านเรา').trim();
  const pct = clampPct(opts?.discountPct);
  const win = (opts?.from && opts?.to) ? `${opts.from}–${opts.to} น.` : 'บ่ายนี้';
  const base = ANGLE[shopKind(shopText)](name, pct, win);
  return { ...base, hashtags: '#โปรวันนี้ #ใกล้ฉัน #อร่อยบอกต่อ #ร้านเด็ด' };
}

/** เคล็ดทำให้ลูกค้ากลับมาซ้ำ (repeat) — ต่อยอดจากลิงก์/LINE ที่ร้านมี */
export function loyaltyTips(shopText: string): string[] {
  const k = shopKind(shopText);
  const common = [
    'ติด QR หน้าร้าน → สแกนแอดไลน์ร้าน แล้วส่งโปรช่วงว่างหาลูกค้าเก่าได้ตรง ๆ',
    'บัตรสะสม 10 ครั้งฟรี 1 (หรือแต้มในไลน์) — ให้เหตุผลลูกค้ากลับมา',
  ];
  const perKind: Record<ShopKind, string[]> = {
    food: ['เปิดพรีออเดอร์มื้อถัดไปตอนลูกค้ากำลังกิน ("พรุ่งนี้สั่งล่วงหน้าลด 10%")'],
    carcare: ['เตือนล้างรอบถัดไปอัตโนมัติทางไลน์ (ทุก 2 สัปดาห์) + แพ็กเหมา 5 ครั้ง'],
    beauty: ['จองรอบถัดไปก่อนลูกค้าเดินออก + ไลน์เตือนวันนัด'],
    retail: ['แจ้งของใหม่/ลดราคาให้ลูกค้าเก่าก่อนใครทางไลน์'],
    service: ['ตั้งรอบเช็ก/บำรุงครั้งหน้า + เตือนล่วงหน้าทางไลน์'],
    other: ['เก็บไลน์ลูกค้า แล้วส่งโปรเฉพาะช่วงว่าง'],
  };
  return [...perKind[k], ...common];
}
