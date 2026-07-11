import type { Persona } from '../types';

/** Persona templates ที่ "เกิดจาก Market Research" — ไม่ใช่เดา
 *  แต่ละ segment มาจาก 5 กลุ่มเป้าหมายที่ประเมินไว้ (docs/marketing/MARKET-RESEARCH.md +
 *  market-insight-thailand) · จุดสำคัญ = ช่อง `search` (ช่องทางค้นหาจริง) → ผูกตรงกับ SEO/Ads targeting */

export interface SegmentTemplate {
  id: string;
  segment: string;      // ชื่อกลุ่ม (แสดงบนปุ่มเลือก)
  role: string;
  quote: string;
  pains: string[];
  gains: string[];
  goal: string[];
  fear: string[];
  search: string[];     // ช่องทางค้นหาจริง — feed เข้า Marketplace SEO keyword + Ads
  action: string[];
}

/** ลำดับขั้นตอนย่อย (guided flow) — เรียง "ใครก่อน แล้วค่อยลึก" กันกรอกมั่ว */
export const GUIDED_STEPS: { key: keyof Pick<Persona, 'pains' | 'gains' | 'goal' | 'fear' | 'search' | 'action'>; label: string; hint: string }[] = [
  { key: 'goal',   label: '1. เป้าหมาย (Job-to-be-done)', hint: 'เขาพยายามทำอะไรให้สำเร็จ' },
  { key: 'pains',  label: '2. Pain — เจ็บตรงไหน',          hint: 'อะไรที่ขวาง/ทำให้ลำบาก' },
  { key: 'gains',  label: '3. Gain — อยากได้ผลอะไร',       hint: 'ผลลัพธ์ที่ทำให้เขายิ้ม' },
  { key: 'fear',   label: '4. ความกังวล',                  hint: 'อะไรที่ทำให้ลังเลไม่ซื้อ' },
  { key: 'search', label: '5. ช่องทางค้นหา (จาก Research)', hint: 'เขาหาข้อมูลที่ไหน → ยิง SEO/Ads ตรงนั้น' },
  { key: 'action', label: '6. พฤติกรรม',                   hint: 'เขาทำอะไรในกระบวนการตัดสินใจ' },
];

export const THAI_SEGMENTS: SegmentTemplate[] = [
  {
    id: 'genz-founder',
    segment: 'Gen Z เริ่มธุรกิจ',
    role: 'ผู้ประกอบการรุ่นใหม่ (18–26)',
    quote: 'อยากมีธุรกิจของตัวเอง แต่ไม่มีทุนจ้างทีม อยากให้ AI ช่วยทำแทน',
    pains: ['ไม่มีทุนจ้างพนักงาน', 'ไม่รู้จะเริ่มระบบหลังบ้านยังไง', 'ทำคนเดียวไม่ทัน'],
    gains: ['เริ่มธุรกิจได้เร็วโดยไม่ต้องมีทีม', 'ดูโปรมืออาชีพตั้งแต่วันแรก'],
    goal: ['สร้างรายได้จากธุรกิจของตัวเอง', 'พิสูจน์ว่าทำได้โดยไม่ต้องเป็นลูกจ้าง'],
    fear: ['ลงทุนแล้วเจ๊ง', 'ระบบยากเกินจะใช้'],
    search: ['TikTok (คลิปเริ่มธุรกิจ)', 'Google "เริ่มธุรกิจด้วย AI"', 'IG/Reels', 'YouTube รีวิวเครื่องมือ'],
    action: ['ดูรีวิว/คลิปสั้นก่อนตัดสินใจ', 'ลองของฟรีก่อนจ่าย', 'ถามในคอมเมนต์/กลุ่ม'],
  },
  {
    id: 'laid-off',
    segment: 'คนเพิ่งตกงาน หารายได้',
    role: 'ผู้กำลังหารายได้ใหม่ (25–45)',
    quote: 'ตกงานกะทันหัน ต้องหารายได้เร็ว อยากได้อะไรที่เริ่มได้เลยไม่ต้องเรียนนาน',
    pains: ['รายได้หยุดกะทันหัน ต้องรีบ', 'ไม่มีทักษะดิจิทัลลึก', 'กลัวถูกหลอกลงทุน'],
    gains: ['มีช่องทางรายได้ที่เริ่มได้เร็ว', 'มีระบบช่วยทำงานแทนคน'],
    goal: ['มีรายได้กลับมาใน 30 วัน', 'พึ่งพาตัวเองได้'],
    fear: ['เสียเงินค่าสมัครแล้วใช้ไม่เป็น', 'โดนหลอก MLM'],
    search: ['Google "หารายได้เสริม 2569"', 'FB group หางาน/หารายได้', 'YouTube "งานออนไลน์"', 'LINE OpenChat'],
    action: ['เทียบหลายตัวเลือก', 'อ่านรีวิวคนจริง', 'เริ่มจากแผนฟรี/ถูกสุด'],
  },
  {
    id: 'micro-seller',
    segment: 'แม่ค้าออนไลน์รายย่อย',
    role: 'เจ้าของร้านออนไลน์คนเดียว (25–50)',
    quote: 'ขายของออนไลน์คนเดียว ตอบแชท ยิงแอด ทำบัญชี เองหมด ไม่มีเวลา',
    pains: ['งานจุกจิกเยอะ ทำคนเดียวไม่ไหว', 'ยิงแอดไม่เป็น เสียเงินฟรี', 'ไม่มีหน้าร้านที่ดูน่าเชื่อถือ'],
    gains: ['มีหน้าร้าน + ระบบช่วยขายอัตโนมัติ', 'ลูกค้าเจอร้านง่ายขึ้น'],
    goal: ['ยอดขายโตโดยไม่ต้องจ้างคน', 'มีเวลาทำอย่างอื่น'],
    fear: ['จ่ายค่าระบบแล้วไม่คุ้ม', 'ตั้งค่ายากเกินไป'],
    search: ['FB Marketplace/กลุ่มขายของ', 'LINE/LINE OpenChat', 'TikTok Shop', 'Google "เปิดร้านออนไลน์"'],
    action: ['ถามในกลุ่มแม่ค้า', 'ดูราคาก่อน', 'สมัครแบบรายวัน/ราคาถูกก่อน'],
  },
  {
    id: 'sme-owner',
    segment: 'เจ้าของ SME',
    role: 'เจ้าของกิจการ 5–50 คน (30–55)',
    quote: 'ธุรกิจโตขึ้นแต่ระบบยังทำมือ อยากได้ระบบที่คุมมาตรฐาน/บัญชี/ทีมได้',
    pains: ['ระบบหลังบ้านทำมือ ผิดพลาดบ่อย', 'จ้างที่ปรึกษาแพง', 'คุมทีม/มาตรฐานไม่ทั่วถึง'],
    gains: ['ระบบมาตรฐานที่สเกลได้', 'ลดต้นทุนที่ปรึกษา/พนักงาน'],
    goal: ['ทำให้ธุรกิจเป็นระบบ พร้อมโต', 'ผ่านมาตรฐาน/ตรวจได้'],
    fear: ['ระบบใหม่ทำทีมทำงานสะดุด', 'ผูกมัดสัญญายาว'],
    search: ['Google "ระบบ ISO/บัญชี SME"', 'LinkedIn', 'งานสัมมนา/หอการค้า', 'รีวิว/บอกต่อจากเจ้าของธุรกิจ'],
    action: ['ขอเดโม/ปรึกษา', 'เทียบกับคู่แข่ง', 'ให้ทีมลองใช้ก่อนตัดสินใจ'],
  },
  {
    id: 'industry-iso',
    segment: 'อุตสาหกรรม TIS/ISO',
    role: 'ผู้จัดการโรงงาน/QMR (35–55)',
    quote: 'ต้องทำเอกสาร ISO/TIS ให้ผ่านออดิต แต่งานเอกสารกินเวลาทีมมหาศาล',
    pains: ['งานเอกสารมาตรฐานเยอะมาก', 'เตรียมออดิตทีไรวุ่นทั้งโรงงาน', 'ที่ปรึกษา ISO แพงมาก'],
    gains: ['ระบบช่วยร่าง/คุมเอกสารมาตรฐาน', 'พร้อมออดิตตลอดเวลา'],
    goal: ['ผ่านการรับรอง/ต่ออายุมาตรฐาน', 'ลดเวลางานเอกสารของทีม'],
    fear: ['ระบบไม่ตรงข้อกำหนดมาตรฐานจริง', 'ข้อมูลโรงงานรั่ว'],
    search: ['Google "TIS มอก. ISO 9001 consult"', 'LinkedIn', 'งานแสดงสินค้าอุตสาหกรรม', 'สมาคมอุตสาหกรรม'],
    action: ['ขอใบเสนอราคา/เดโม', 'ตรวจ compliance/ความปลอดภัยข้อมูล', 'เสนอบอร์ดอนุมัติ'],
  },
];

const PALETTES = [
  { bg: '#eff4fb', tc: '#1a4f8a' }, { bg: '#fdf3f0', tc: '#c44b2b' },
  { bg: '#edf7f2', tc: '#2d6a4f' }, { bg: '#fdf6ec', tc: '#a05c1a' },
];

/** initials 2 ตัวจากชื่อ (ตัวอักษรแรกของ ≤2 คำแรก) — รองรับไทย/อังกฤษ */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!words.length) return 'NP';
  return words.map((w) => [...w][0] ?? '').join('').toUpperCase() || 'NP';
}

/** สร้าง Persona เต็มจาก segment template (deterministic) — index กำหนดสี */
export function personaFromSegment(seg: SegmentTemplate, index: number): Persona {
  const pal = PALETTES[index % PALETTES.length];
  return {
    name: seg.segment,
    role: seg.role,
    initials: initialsOf(seg.segment),
    bg: pal.bg,
    tc: pal.tc,
    quote: seg.quote,
    pains: [...seg.pains],
    gains: [...seg.gains],
    goal: [...seg.goal],
    fear: [...seg.fear],
    search: [...seg.search],
    action: [...seg.action],
  };
}

/** persona เปล่าแบบมีโครง (สำหรับกรอกเอง/ให้ AI เติม) */
export function blankPersona(index: number): Persona {
  const pal = PALETTES[index % PALETTES.length];
  return {
    name: 'Persona ใหม่', role: 'ตำแหน่ง / บทบาท', initials: 'NP',
    bg: pal.bg, tc: pal.tc, quote: 'เพิ่ม quote ของ persona นี้',
    pains: ['ปัญหาที่ลูกค้าเจอ'], gains: ['ผลลัพธ์ที่ลูกค้าอยากได้'],
    goal: ['เป้าหมาย'], fear: ['ความกังวล'], search: ['ช่องทาง'], action: ['พฤติกรรม'],
  };
}

/** รวมผล AI (summary=quote, suggestions=pains) เข้ากับฐาน (segment ที่เลือก หรือ blank)
 *  ให้ persona มาจาก research จริง: pains/quote จากข้อความ · gains/search จาก segment */
export function personaFromResearch(
  base: Persona,
  ai: { quote?: string; pains?: string[] },
): Persona {
  const pains = (ai.pains ?? []).map((s) => s.trim()).filter(Boolean);
  return {
    ...base,
    quote: ai.quote?.trim() || base.quote,
    pains: pains.length ? pains : base.pains,
  };
}
