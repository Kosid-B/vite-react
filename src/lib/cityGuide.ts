// cityGuide.ts — สคริปต์ "โฮสต์เมือง" (Avatar) ต้อนรับคู่ค้าที่เข้ามาชมเมือง
// เน้นเนื้อหาเพื่อ "จับคู่ธุรกิจ" (matching สินค้า/บริการ/ดีล) ปรับตามระดับ/ยุคของเมือง
// pure + deterministic (ทดสอบได้) — component นำไปแสดง typewriter + อ่านออกเสียง (Web Speech)

import { eraByIndex, clampEra } from './cityEra';

export interface GuideCtx {
  company: string;       // ชื่อบริษัท/เมือง
  sectorLabel: string;   // หมวดธุรกิจอ่านง่าย ('' ได้)
  offerings: string[];   // สินค้า/บริการเด่น (อาจว่าง)
  eraIndex: number;      // 0–4
  tierLabel: string;     // ป้ายระดับเมือง
}

export interface GuideLine { icon: string; text: string }
export interface GuideScript {
  host: string;          // ชื่อผู้พูด
  lines: GuideLine[];    // บทพูดทีละบรรทัด (typewriter + TTS)
  ctas: { label: string; page: string }[];  // ปุ่มจับคู่ธุรกิจ
  speech: string;        // บทพูดรวม (สำหรับอ่านออกเสียงต่อเนื่อง)
}

/** เจตนาการจับคู่ต่อยุค — คู่ค้าแบบไหนเหมาะ + เรามีอะไรให้จับคู่ + ขนาดดีล */
interface MatchIntent { seeking: string; offer: string; deal: string }
const MATCH: MatchIntent[] = [
  { seeking: 'พันธมิตรรายแรกที่อยากเริ่มทดลองงานเล็ก ๆ ไปด้วยกัน', offer: 'งานคุณภาพ ราคาเป็นกันเอง ปรับให้ได้ตามโจทย์', deal: 'งานทดลอง/ล็อตเล็ก' },
  { seeking: 'คู่ค้าที่ช่วยเสริมการเติบโต — ซัพพลายเออร์หรือช่องทางขายใหม่', offer: 'กำลังผลิต/บริการที่เริ่มนิ่ง ส่งมอบตรงเวลา', deal: 'ดีลประจำรายเดือน' },
  { seeking: 'ดีล B2B ต่อเนื่อง และช่องทางกระจายสินค้าเพิ่ม', offer: 'สินค้า/บริการหลากหลาย พร้อมรับออเดอร์ต่อเนื่อง', deal: 'ออเดอร์ต่อเนื่อง/ปริมาณกลาง' },
  { seeking: 'พาร์ตเนอร์ซัพพลายเชนและดีลขนาดกลาง–ใหญ่', offer: 'ระบบที่วางไว้แล้ว (SOP/KPI) คุณภาพสม่ำเสมอ สเกลได้', deal: 'สัญญาระยะยาว/ปริมาณสูง' },
  { seeking: 'พาร์ตเนอร์เชิงกลยุทธ์ ขยายหลายพื้นที่/ส่งออก', offer: 'ระบบนิเวศครบวงจร เชื่อมต่อได้ทันที เชื่อถือได้', deal: 'ความร่วมมือเชิงกลยุทธ์' },
];

function clean(s: string): string { return (s || '').replace(/\s+/g, ' ').trim(); }

/** สร้างบทพูดของโฮสต์เมืองสำหรับคู่ค้า — เน้น matching ตามยุค */
export function guideScript(ctx: GuideCtx): GuideScript {
  const i = clampEra(ctx.eraIndex);
  const era = eraByIndex(i);
  const m = MATCH[i];
  const company = clean(ctx.company) || 'ธุรกิจของเรา';
  const sector = clean(ctx.sectorLabel);
  const offers = (ctx.offerings || []).map(clean).filter(Boolean).slice(0, 3);
  const offerText = offers.length ? offers.join(' · ') : 'สินค้าและบริการที่กำลังจัดทัพให้พร้อมขาย';

  const lines: GuideLine[] = [
    { icon: '👋', text: `สวัสดีครับ ยินดีต้อนรับสู่เมืองของ “${company}”` },
    { icon: '🏙️', text: `ตอนนี้เมืองอยู่ระดับ “${ctx.tierLabel}” (${era.name}) — ${era.caption}` },
    { icon: sector ? '🏷️' : '🧭', text: sector ? `เราทำธุรกิจในหมวด ${sector}` : 'ยินดีแนะนำธุรกิจของเราให้คู่ค้าได้รู้จัก' },
    { icon: '🛍️', text: `สิ่งที่เราจับคู่ให้ได้: ${offerText}` },
    { icon: '🎯', text: `ในระดับนี้เรากำลังมองหา ${m.seeking}` },
    { icon: '🤝', text: `จุดแข็งที่เสนอให้คู่ค้า: ${m.offer} (เหมาะกับ${m.deal})` },
    { icon: '📨', text: 'สนใจจับคู่ธุรกิจไหมครับ? ขอใบเสนอราคา (RFQ) หรือดูสินค้าในตลาดได้เลย' },
  ];

  const ctas = [
    { label: '📨 ขอใบเสนอราคา (RFQ)', page: 'trade' },
    { label: '🤝 จับคู่ธุรกิจ', page: 'citytrade' },
    { label: '🛍 ดูหน้าร้าน/สินค้า', page: 'storefront' },
  ];

  return { host: 'โฮสต์เมือง AI', lines, ctas, speech: lines.map(l => l.text).join(' ') };
}
