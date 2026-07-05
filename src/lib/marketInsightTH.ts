import type { AppData } from '../types';
import { weekTag } from './segmentation';

export { weekTag };

/* ===== CMO หาข้อมูลตลาดไทย → กลยุทธ์เสนอ CEO → บอร์ด =====
 * ฝัง Market Insight ทางการ (ทะเบียนราษฎร์ ณ ธ.ค. 2568 / ใช้งานปี 2569) เป็นแหล่งข้อมูล
 * พื้นฐานให้ CMO agent อ้างอิง แล้วต่อยอดด้วยการค้นข้อมูลตลาดจริง (Serper) เพื่อเสนอ CEO
 * ที่มา: MarketThink (ฐานข้อมูลทะเบียนราษฎร์ ธ.ค. 2568) · B. Training Consultant */

/** ภาพรวมประชากรไทย (ทางการ ณ ธ.ค. 2568) */
export const TH_POPULATION = {
  total: 65_809_011,
  yoyChange: -142_199, // ลดลงจากปีก่อนหน้า
  status: 'สังคมผู้สูงอายุเต็มตัว',
  expat: 988_303,
  asOf: 'ธ.ค. 2568',
  topProvinces: [
    'กรุงเทพฯ', 'นครราชสีมา', 'อุบลราชธานี', 'เชียงใหม่', 'ขอนแก่น',
    'ชลบุรี', 'บุรีรัมย์', 'อุดรธานี', 'นครศรีธรรมราช', 'ศรีสะเกษ',
  ],
  expatHubs: ['เชียงใหม่', 'ตาก', 'เชียงราย', 'กรุงเทพฯ'],
  industrialFocus: ['ชลบุรี', 'ขอนแก่น', 'กรุงเทพฯ'],
};

/** กลุ่มเป้าหมายตาม Generation + กลยุทธ์การสื่อสาร */
export interface GenSegment {
  gen: string;
  share: number; // %
  behavior: string;
  channel: string;
}
export const TH_GENERATIONS: GenSegment[] = [
  { gen: 'Baby Boomer', share: 16, behavior: 'ห่วงสุขภาพ/คุณภาพชีวิต', channel: 'สื่อดั้งเดิม (TV), เทคโนโลยีสุขภาพ' },
  { gen: 'Gen X', share: 24, behavior: 'หัวหน้าครอบครัว/ผู้ตัดสินใจ', channel: 'เน้น Brand Trust, ความจริงใจ' },
  { gen: 'Gen Y', share: 23, behavior: 'พนักงาน/เจ้าของธุรกิจ', channel: 'ความคุ้มค่า, คุณภาพ, Engagement' },
  { gen: 'Gen Z', share: 20, behavior: 'กำลังซื้ออนาคต', channel: 'Influencer/Review, ความสร้างสรรค์' },
];

/** ข้อมูลเชิงกลยุทธ์สำหรับ CEO AI Thailand (SaaS/ISO/TIS) */
export const TH_INSIGHTS = [
  'Quality over Quantity: ประชากรลดลง → รักษาลูกค้าเดิม (Retention) + เพิ่ม Value ผ่าน TIS/ISO สำคัญกว่าหาลูกค้าใหม่อย่างเดียว',
  'Localization: ฟีเจอร์สำหรับแรงงานต่างชาติ → ยิงตลาดเจาะจังหวัด expat สูง (เชียงใหม่/ตาก/เชียงราย/กทม.)',
  'Content ราย Gen: TIS Automate เน้นความน่าเชื่อถือ/แม่นยำสำหรับผู้บริหาร (Gen X) แต่เน้นง่าย/เร็วสำหรับผู้ปฏิบัติงาน (Gen Y)',
  'Area Focus: ยิง Ads ไปยังจังหวัดศูนย์กลางอุตสาหกรรม (ชลบุรี/ขอนแก่น/กทม.)',
];

/** สรุปสั้นสำหรับแสดงบนการ์ด (ก่อนกด agent) */
export function insightHeadline(): string {
  const p = TH_POPULATION;
  return `ประชากร ${(p.total / 1e6).toFixed(1)} ล้าน (${p.yoyChange.toLocaleString('th-TH')}) · expat ${(p.expat / 1e3).toFixed(0)}k · ${p.status}`;
}

/** คำสั่งให้ CMO agent: ใช้ข้อมูลทางการเป็นฐาน + ค้นตลาดจริง → กลยุทธ์เสนอ CEO/บอร์ด */
export function marketInsightInstruction(d: AppData): string {
  const c = d.aiCompany;
  const gen = TH_GENERATIONS.map(g => `${g.gen} ${g.share}% (${g.behavior} → ${g.channel})`).join(' · ');
  return [
    `ทำหน้าที่ CMO: หาข้อมูลตลาดประเทศไทยเพื่อเสนอ CEO พิจารณานำเสนอบอร์ด — ธุรกิจ: ${c?.name || 'บริษัท'} (${c?.industry || 'ไม่ระบุอุตสาหกรรม'})`,
    `เป้าหมายบริษัท: ${c?.goal || '-'}`,
    '',
    '=== ข้อมูลตลาดไทยทางการ (ทะเบียนราษฎร์ ณ ธ.ค. 2568 · ใช้งานปี 2569) — ใช้เป็นฐานอ้างอิง ===',
    `• ประชากรรวม ${TH_POPULATION.total.toLocaleString('th-TH')} คน (เปลี่ยนแปลง ${TH_POPULATION.yoyChange.toLocaleString('th-TH')} คน) · ${TH_POPULATION.status}`,
    `• ชาวต่างชาติ/Expat ${TH_POPULATION.expat.toLocaleString('th-TH')} คน (กระจุก: ${TH_POPULATION.expatHubs.join(', ')})`,
    `• จังหวัดกำลังซื้อสูง (Top 10): ${TH_POPULATION.topProvinces.join(', ')}`,
    `• จังหวัดศูนย์กลางอุตสาหกรรม: ${TH_POPULATION.industrialFocus.join(', ')}`,
    `• Generation: ${gen}`,
    '',
    'ให้ค้นข้อมูลตลาด/เทรนด์/คู่แข่งล่าสุดเพิ่มเติม แล้วจัดทำ "รายงานข้อมูลตลาดเชิงกลยุทธ์" เสนอ CEO:',
    '1) ภาพตลาด (Market Overview): ขนาด/แนวโน้ม + สิ่งที่กระทบธุรกิจเราตรง ๆ (อ้างข้อมูลทางการข้างต้น)',
    '2) กลุ่มเป้าหมายที่ควรโฟกัส: เลือก 2–3 Gen/พื้นที่ ที่คุ้มที่สุดสำหรับสินค้าเรา พร้อมเหตุผล',
    '3) กลยุทธ์ต่อกลุ่ม: ช่องทาง · โทนการสื่อสาร · ข้อเสนอ (offer) · ข้อความหลัก (key message)',
    '4) โอกาส/พื้นที่ยิงโฆษณา: จังหวัดเป้าหมาย + เหตุผลจากกำลังซื้อ/อุตสาหกรรม/expat',
    '5) ความเสี่ยง/ข้อควรระวัง (contrarian) อย่างน้อย 1 ข้อ + แนวทางรับมือ',
    '6) ข้อเสนอเชิงงบ/การลงมือ 3 ข้อ (ทำได้จริง วัดผลได้) สำหรับบอร์ดพิจารณาอนุมัติ',
    '',
    'ตอบเป็นภาษาไทย กระชับ มีหัวข้อชัด เหมาะสำหรับ CEO นำเสนอบอร์ด',
  ].join('\n');
}
