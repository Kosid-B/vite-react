// marketSizerPlain.ts — "เครื่องมือประเมินขนาดตลาดฟรี" (lead magnet บน Landing)
// ห่อ estimateSizing ให้ออกมาเป็น "ภาษาบ้าน ๆ เข้าใจทันที" (ไม่โชว์ศัพท์ TAM/SAM/SOM)
// pure + deterministic (ทดสอบได้) · ไม่ต้อง login/AI — ทำงานฝั่ง browser เลย
// จริยธรรม: ระบุชัดว่าเป็น "ประเมินคร่าว ๆ จากสมมติฐาน" · ตัวเลขเป็นช่วง · ไม่ปั้นเป๊ะ

import { estimateSizing } from './marketSizing';

const TH_SME_BASE = 3_200_000;         // SME ไทย ~3.2M (OSMEP)
const LOCAL_BASE = Math.round(TH_SME_BASE / 77); // เฉลี่ยต่อจังหวัด ~41,600 (หยาบ — บอกผู้ใช้ว่าประเมิน)
export const DEFAULT_ARPU = 3000;      // ราคาต่อลูกค้า/ปี เริ่มต้น — ใช้เมื่อผู้ใช้ยังไม่กรอก (ปรับได้)

export type SizerScope = 'national' | 'local';

export interface SizerInput {
  business: string;       // ธุรกิจของผู้ใช้ (ใช้ทำ label + จำไว้)
  arpuPerYear: number;    // ลูกค้า 1 คนจ่ายให้คุณ ~เท่าไหร่/ปี (บาท)
  scope: SizerScope;      // ทั้งประเทศ / เฉพาะจังหวัด-ท้องถิ่น
}

export interface SizerRow {
  key: 'total' | 'reachable' | 'winnable';
  label: string;          // ภาษาบ้าน ๆ
  value: string;          // ช่วงเป็นบาท (อ่านง่าย)
  sub: string;            // อธิบายเสริม
}

export interface PlainSizing {
  ok: boolean;
  usingDefaultArpu: boolean; // true = ยังไม่กรอกราคาต่อลูกค้า → ใช้ค่าเริ่มต้น (บอกให้ผู้ใช้ปรับ)
  rows: SizerRow[];
  headline: string;       // สรุปให้ "อยากทำต่อ"
  disclaimer: string;
  tamValue: number;       // ตลาดรวม (บาท) — ใช้ทำกราฟ (ฐานสัดส่วน)
  samValue: number;       // เข้าถึงได้จริง (บาท)
  somValue: number;       // ตัวเลข "คว้าได้ปีแรก" (บาท) — ใช้ทำ hero count-up
  somCustomers: number;   // จำนวนลูกค้าโดยประมาณ
}

/** จำนวนเงินแบบอ่านง่าย: พันล้าน/ล้าน/พัน (฿) */
export function bahtPlain(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v >= 1_000_000_000) return '฿' + (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' พันล้าน';
  if (v >= 1_000_000) return '฿' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' ล้าน';
  return '฿' + v.toLocaleString('th-TH');
}

const rangePlain = ([lo, hi]: [number, number]): string => `${bahtPlain(lo)} – ${bahtPlain(hi)}`;
const numPlain = (n: number): string => Math.max(0, Math.round(n)).toLocaleString('th-TH');

/** ประเมินขนาดตลาดแล้วแปลงเป็นภาษาง่าย — ok=false ถ้า input ไม่พอ */
export function plainSizing(inp: SizerInput): PlainSizing {
  // กรอกแค่ "ธุรกิจ" ก็ได้ตัวเลขทันที (ใช้ราคาต่อลูกค้าเริ่มต้น) — ใส่ราคาจริงแล้วแม่นขึ้น
  if (!inp.business.trim()) {
    return { ok: false, usingDefaultArpu: false, rows: [], headline: '', disclaimer: '', tamValue: 0, samValue: 0, somValue: 0, somCustomers: 0 };
  }
  const typed = Number(inp.arpuPerYear);
  const usingDefaultArpu = !(typed > 0);
  const arpu = usingDefaultArpu ? DEFAULT_ARPU : typed;
  const businessBase = inp.scope === 'local' ? LOCAL_BASE : TH_SME_BASE;
  const r = estimateSizing({ annualRevenuePerCustomer: arpu, businessBase });

  const samCustomers = Math.round(businessBase * 0.03); // ตรงกับ default serviceablePct 3%
  const rows: SizerRow[] = [
    {
      key: 'total', label: '🌏 ตลาดรวมของธุรกิจแบบคุณ',
      value: rangePlain(r.tamRange),
      sub: inp.scope === 'local' ? 'เพดานสูงสุดในจังหวัด/ท้องถิ่น (ถ้าได้ลูกค้าทุกคน)' : 'เพดานสูงสุดทั้งประเทศ (ถ้าได้ลูกค้าทุกคน)',
    },
    {
      key: 'reachable', label: '🎯 กลุ่มที่คุณเข้าถึงได้จริง',
      value: rangePlain(r.samRange),
      sub: `≈ ${numPlain(samCustomers)} ราย ที่โมเดลธุรกิจคุณบริการได้`,
    },
    {
      key: 'winnable', label: '🏆 ที่คุณน่าจะคว้าได้ใน 1–2 ปีแรก',
      value: rangePlain(r.somRange),
      sub: `≈ ${numPlain(r.customersSom)} ราย — เป้าหมายที่จับต้องได้ก่อน`,
    },
  ];

  const headline = r.customersSom >= 1
    ? `แค่คว้าได้ ~${numPlain(r.customersSom)} ราย ก็มีรายได้ราว ${bahtPlain(r.som)} แล้ว — เริ่มโฟกัสกลุ่มนี้ก่อน`
    : 'ลองปรับตัวเลขให้ตรงธุรกิจจริง แล้วดูช่องที่จับต้องได้';

  return {
    ok: true,
    usingDefaultArpu,
    rows,
    headline,
    disclaimer: usingDefaultArpu
      ? `ประเมินจากราคาต่อลูกค้าเริ่มต้น (~${bahtPlain(DEFAULT_ARPU)}/ปี) — ใส่ราคาจริงของคุณในช่องด้านล่างเพื่อให้แม่นขึ้น · อิงสมมติฐาน SME ไทย ~3.2M`
      : 'ตัวเลขนี้เป็นการประเมินคร่าว ๆ จากที่คุณกรอก + สมมติฐานมาตรฐาน (SME ไทย ~3.2M) — สมัครแล้วให้ AI วิจัยตัวเลขจริงจาก Google ให้เจาะลึกกว่านี้',
    tamValue: r.tam,
    samValue: r.sam,
    somValue: r.som,
    somCustomers: r.customersSom,
  };
}
