// heroVariant.ts — Dynamic landing hero (Dark AI Marketing · Hyper-Personalization ข้อ 6)
// เลือก "หน้า hero" ให้ตรงกับคนที่เข้ามา (มือใหม่กลัวเจ๊ง / เจ้าของหมดไฟ / คนมีของอยากเปิดร้าน)
// → ยิงตรงแก่นอารมณ์ + พาเข้า 2 ทางสมัคร: เปิดร้านค้า (storefront) หรือ เริ่มทำธุรกิจ (สมาชิก)
//
// จริยธรรม: ไม่มี fake scarcity — ทุก variant พูดถึงฟีเจอร์ที่มีจริง (validate/storefront/ทีม AI)
// เลือกจาก signal ที่มีอยู่จริง (UTM/referrer) ไม่ track ข้ามเว็บ ไม่เก็บ PII
//
// pure + testable: รับ search string (?...) + referrer → คืน variant (ไม่มี side-effect/DOM)

import type { OnboardGoal, PageId } from '../types';

export type HeroSeg = 'default' | 'seller' | 'newbie' | 'owner' | 'palm' | 'food';

export interface HeroVariant {
  seg: HeroSeg;
  badge: string;
  h1a: string;          // บรรทัดแรก (สีปกติ)
  h1bLines: string[];   // บรรทัดไฮไลต์ (join ด้วย <br/>)
  subLead: string;      // ประโยคเปิด (ตัวหนา) — ยิง pain/อารมณ์
  subRest: string;      // ส่วนต่อ (ปกติ)
  ctaLabel: string;     // ข้อความปุ่มหลัก
  /** เป้าหมาย onboarding ที่จะพาไปหลังเข้าแอป (null = ให้ GoalChooser ถามเอง) */
  goal: OnboardGoal | null;
  page: PageId | null;
}

export const HERO_VARIANTS: Record<HeroSeg, HeroVariant> = {
  // ⚠️ กติกาของ hero ตัวนี้ (แก้ 16 ส.ค. 2569 ตามคำสั่งเจ้าของ):
  //   ต้องตอบ 3 คำถามให้จบใน 3 วินาที — (1) นี่คืออะไร (2) ฉันจะได้อะไร (3) ทำไมต้องที่นี่
  //   badge = ตอบข้อ 1 · h1 = ตอบข้อ 2 · subLead/subRest = ตอบข้อ 3
  //   เดิม badge เป็น 'OFFICIALLY POWERED BY…' ซึ่งไม่ตอบสักข้อ และ h1 ไม่บอกว่าได้อะไร
  default: {
    seg: 'default',
    badge: '✦  ระบบช่วยเริ่มและวางระบบธุรกิจ สำหรับคนไทย  ✦',
    h1a: 'อยากเริ่มธุรกิจ แต่ไม่รู้จะเริ่มตรงไหน?',
    h1bLines: ['มีระบบบอกทีละขั้น', 'จนขายได้จริง'],
    subLead: 'เริ่มจากตัวเลขของคุณเอง — รู้ว่าขายแล้วกำไรจริงไหม ก่อนลงเงินสักบาท',
    subRest: 'แล้วเดินต่อทีละขั้นพร้อมทีม AI: หาลูกค้า → เปิดร้าน → วางระบบ · ฟรี 15 วัน ไม่ต้องใช้บัตร',
    ctaLabel: '', // ใช้ label เริ่มต้นของปุ่ม (guest/สมัคร) ตามโหมด
    goal: null,
    page: null,
  },
  // คนมีของขายอยู่แล้ว → ดันเข้า "เปิดหน้าร้าน" (loss aversion: ลูกค้าหาไม่เจอ)
  seller: {
    seg: 'seller',
    badge: '✦  สำหรับคนที่มีของขายอยู่แล้ว  ✦',
    h1a: 'ของคุณดีกว่า แต่ร้านอื่นขายดีกว่า?',
    h1bLines: ['เปิดหน้าร้านออนไลน์ฟรี', 'ให้ลูกค้าหาคุณเจอ'],
    subLead: 'ไม่ใช่เพราะของคุณไม่ดีพอ — แต่เพราะคนที่กำลังหาของแบบคุณอยู่ ยังหาคุณไม่เจอ',
    subRest: 'รับใบขอราคา (RFQ) ปิดดีลจริง · เริ่มฟรี ไม่ต้องใช้บัตรเครดิต',
    ctaLabel: '🛒 เปิดหน้าร้านฟรีใน 5 นาที',
    goal: 'sell',
    page: 'storefront',
  },
  // มือใหม่ยังไม่เริ่ม (กลัวเจ๊ง) → ดันเข้า "ทดสอบไอเดีย" (cortisol → dopamine)
  newbie: {
    seg: 'newbie',
    badge: '✦  สำหรับคนอยากเริ่มธุรกิจแรก  ✦',
    h1a: 'กลัวเสียเงินเก็บที่สะสมมาหลายปี?',
    h1bLines: ['รู้ก่อนว่ามีคนจ่ายจริงไหม', 'ค่อยควักเงินออกมา'],
    subLead: 'ที่รั้งไว้ไม่ใช่เงิน — แต่คือความรู้สึกว่าถ้าพลาด จะอธิบายกับคนที่บ้านยังไง',
    subRest: 'ออกแบบโมเดลธุรกิจ (MIT 24 ขั้น) ทีละสเต็ป · เริ่มฟรี ไม่ต้องสมัคร',
    ctaLabel: '💡 ทดสอบไอเดียธุรกิจฟรี',
    goal: 'validate',
    page: 'bmc',
  },
  // เจ้าของที่ทำคนเดียว/อยากมีระบบ → ดันเข้า "ทีม AI ทั้งบริษัท" (loss aversion → serotonin)
  owner: {
    seg: 'owner',
    badge: '✦  สำหรับเจ้าของธุรกิจที่อยากโตแบบมีระบบ  ✦',
    h1a: 'ถ้าคุณหยุดสักวัน ธุรกิจหยุดตามไหม?',
    h1bLines: ['วางระบบให้มันเดินได้', 'โดยไม่ต้องมีคุณตลอดเวลา'],
    subLead: 'เหนื่อยที่ต้องเก่งทุกเรื่องคนเดียว และไม่มีใครให้ปรึกษาตอนต้องตัดสินใจ — เราออกแบบมาสำหรับตรงนี้',
    subRest: 'ออกแบบโดยที่ปรึกษา ISO/ธุรกิจจริง 20+ ปี · คุณคุมทุกการตัดสินใจ',
    ctaLabel: '🏢 ให้ทีม AI เริ่มทำงาน',
    goal: 'aicompany',
    page: 'aicompany',
  },
  // แคมเปญปาล์ม/เกษตรแปรรูป (message-match กับรีล/คารูเซล) → "วิกฤต = โอกาสสองด้าน"
  // ยิงคนในซัพพลายเชนปาล์ม: ชาวสวน/โรงสกัด (อยากกระจายความเสี่ยง+แปรรูป) และ SME แปรรูป (คว้าวัตถุดิบถูก)
  // → พาไป validate ไอเดียก่อนลงทุน (honest: ต้องมีดีมานด์จริง ไม่ใช่เห็นของถูกแล้วรีบผลิต)
  palm: {
    seg: 'palm',
    badge: '✦  สำหรับคนในซัพพลายเชนปาล์ม & เกษตรแปรรูป  ✦',
    h1a: 'เหนื่อยไหม กับราคาปาล์มที่เราคุมไม่ได้?',
    h1bLines: ['หาทางที่ตัวเองกำหนดได้', 'จากซัพพลายเชนที่คุณรู้ดีที่สุด'],
    subLead: 'ปีแล้วปีเล่าที่รายได้ขึ้นลงตามราคาที่คนอื่นเป็นคนตั้ง — เงินไม่ได้หาย มันย้ายที่ คำถามคือคุณอยู่ฝั่งไหน',
    subRest: 'ทดสอบไอเดียแปรรูปก่อนลงทุน (MIT 24 ขั้น) · CFO คำนวณกำไรจริง · เปิดร้านหาลูกค้า B2B — เริ่มฟรี',
    ctaLabel: '🌴 หาโอกาสจากซัพพลายเชนปาล์ม',
    goal: 'validate',
    page: 'bmc',
  },
  // แคมเปญแม่ค้าอาหาร/ร้านตามสั่ง/อาหารถุง (message-match กับคอนเทนต์ค่าครองชีพ-ต้นทุนอาหาร)
  // pain จริง: ขายดีแต่ไม่เหลือเงิน เพราะไม่รู้ต้นทุนต่อจาน/ถุง + ยุคของแพงลูกค้าเทียบราคา
  // → พาไปทีม AI (CFO คำนวณต้นทุน-กำไร) แทนการเดาราคา
  food: {
    seg: 'food',
    badge: '✦  สำหรับแม่ค้าอาหาร ร้านตามสั่ง & อาหารถุง  ✦',
    h1a: 'ตื่นตีห้า ยืนขายอาหารทั้งวัน แล้วนับเงินได้เท่าเดิม?',
    h1bLines: ['รู้ต้นทุนต่อจานจริง', 'ก่อนจะเหนื่อยฟรีอีกเดือน'],
    subLead: 'ไม่ได้ขายไม่ดี — แต่กำไรรั่วอยู่ในต้นทุนที่ไม่เคยมีใครคิดให้ครบสักที',
    subRest: 'CFO AI ช่วยคิดต้นทุน+กำไร · เปิดหน้าร้านรับออเดอร์ · หาลูกค้าประจำ/ออฟฟิศ (B2B) — เริ่มฟรี',
    ctaLabel: '🍲 คำนวณต้นทุน + ตั้งราคาให้มีกำไร',
    goal: 'aicompany',
    page: 'aicompany',
  },
};

const hit = (hay: string, needles: string[]) => needles.some((n) => hay.includes(n));

/** ตัดสิน segment จาก signal ที่มีอยู่จริง — ลำดับความชัดเจน: seg > goal > utm keyword > referrer */
export function segmentFor(search: string, referrer = ''): HeroSeg {
  let params: URLSearchParams;
  try { params = new URLSearchParams(search || ''); } catch { return 'default'; }
  const get = (k: string) => (params.get(k) ?? '').toLowerCase();

  // 1) ระบุตรง ๆ (?seg=seller|newbie|owner|palm) — ใช้ในลิงก์แคมเปญของเราเอง
  const seg = get('seg');
  if (seg === 'seller' || seg === 'newbie' || seg === 'owner' || seg === 'palm' || seg === 'food') return seg;

  // 2) ?goal= (เผื่อสะพานจากเว็บบริษัท)
  const goal = get('goal');
  if (hit(goal, ['sell', 'shop', 'store', 'storefront', 'ร้าน'])) return 'seller';
  if (hit(goal, ['validate', 'idea', 'ไอเดีย'])) return 'newbie';
  if (hit(goal, ['aicompany', 'business', 'owner', 'company'])) return 'owner';

  // 3) utm keyword (content/campaign/term รวมกัน)
  const utm = [get('utm_content'), get('utm_campaign'), get('utm_term')].join(' ');
  if (hit(utm, ['palm', 'ปาล์ม', 'biodiesel', 'ไบโอดีเซล', 'เกษตรแปรรูป'])) return 'palm';
  if (hit(utm, ['food', 'อาหาร', 'แกงถุง', 'ตามสั่ง', 'แม่ค้า', 'ต้นทุนอาหาร'])) return 'food';
  if (hit(utm, ['seller', 'shop', 'store', 'ร้าน', 'ขายของ'])) return 'seller';
  if (hit(utm, ['owner', 'sme', 'scale', 'system', 'ระบบ', 'เจ้าของ'])) return 'owner';
  if (hit(utm, ['newbie', 'idea', 'start', 'เริ่ม', 'ไอเดีย', 'มือใหม่'])) return 'newbie';

  // 4) referrer/utm_source heuristic (เบา ๆ) — TikTok/IG = มือใหม่วัยเริ่ม · LinkedIn = เจ้าของ/B2B
  const src = (get('utm_source') + ' ' + (referrer || '').toLowerCase());
  if (hit(src, ['tiktok', 'instagram', 'ig.'])) return 'newbie';
  if (hit(src, ['linkedin'])) return 'owner';

  return 'default';
}

/** คืน HeroVariant สำหรับ search string + referrer ปัจจุบัน */
export function pickHeroVariant(search: string, referrer = ''): HeroVariant {
  return HERO_VARIANTS[segmentFor(search, referrer)];
}
