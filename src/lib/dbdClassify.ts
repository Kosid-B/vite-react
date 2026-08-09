// dbdClassify.ts — จัดหมวดธุรกิจ DBD อัตโนมัติจากข้อความ (ชื่อร้าน + คำอธิบาย + สินค้า)
// ปรัชญา (ยืนยันโดย User): ผู้ใช้ "ไม่ต้องเลือกหมวด" เอง — ระบบแมปให้จากสิ่งที่เขาพิมพ์ธรรมชาติ
//   DBD = ฐานข้อมูล/reference หลังบ้าน (ใช้จัดกลุ่ม + schema) ไม่ใช่ taxonomy ที่ยัดให้ user ไล่เลือก
// pure + deterministic (เทสต์ได้) · rule-based ทำงานออฟไลน์ทันที (ไม่ต้องรอ AI) · แก้เองทับได้เสมอ

import { getDBDSector } from '../data/dbd';

export interface DbdGuess {
  value: string;        // '[X] <item>' — เก็บลง storefront.dbd ได้ทันที
  code: string;         // รหัสหมวด A–S
  sectorLabel: string;  // ชื่อหมวดเต็ม
  item: string;         // ชื่อประเภทย่อยที่เลือก
  score: number;        // จำนวนคำที่แมตช์ (ยิ่งมาก ยิ่งมั่นใจ)
  confidence: 'high' | 'medium' | 'low';
}

interface Rule { code: string; item: string; keywords: string[] }

/** กติกาแมป — เรียง "เฉพาะเจาะจงก่อน" (กาแฟก่อนอาหารทั่วไป, ซอฟต์แวร์ก่อนไอทีทั่วไป)
 *  keyword เป็น substring (ไทย/อังกฤษ ตัวพิมพ์เล็ก) — ครอบคลุมธุรกิจ SME ไทยที่พบบ่อย */
const RULES: Rule[] = [
  // I — อาหาร/เครื่องดื่ม/ที่พัก
  { code: 'I', item: 'ร้านกาแฟและเครื่องดื่ม', keywords: ['กาแฟ', 'คาเฟ่', 'ชานม', 'ชาไข่มุก', 'เครื่องดื่ม', 'coffee', 'cafe', 'ชาเขียว', 'สมูทตี้', 'น้ำปั่น'] },
  { code: 'I', item: 'ร้านอาหารและภัตตาคาร', keywords: ['ร้านอาหาร', 'อาหาร', 'ภัตตาคาร', 'ก๋วยเตี๋ยว', 'ข้าว', 'หมูกระทะ', 'ชาบู', 'ปิ้งย่าง', 'ครัว', 'restaurant', 'เบเกอรี่', 'ขนม', 'เค้ก', 'bakery', 'ของกิน', 'อาหารตามสั่ง'] },
  { code: 'I', item: 'บริการจัดส่งอาหาร (Food Delivery)', keywords: ['เดลิเวอรี่อาหาร', 'ส่งอาหาร', 'food delivery'] },
  { code: 'I', item: 'โรงแรม รีสอร์ท และที่พักระยะสั้น', keywords: ['โรงแรม', 'รีสอร์ท', 'ที่พัก', 'โฮสเทล', 'hostel', 'hotel', 'resort', 'guesthouse', 'homestay', 'โฮมสเตย์'] },
  // J — ไอที/ซอฟต์แวร์/สื่อดิจิทัล
  { code: 'J', item: 'การพัฒนาซอฟต์แวร์และเกม', keywords: ['ซอฟต์แวร์', 'software', 'แอป', 'application', 'app', 'เว็บไซต์', 'website', 'เว็บ', 'โปรแกรม', 'ระบบ', 'saas', 'พัฒนาระบบ', 'coding', 'เขียนโปรแกรม'] },
  { code: 'J', item: 'ปัญญาประดิษฐ์และ Data Analytics', keywords: ['ai', 'ปัญญาประดิษฐ์', 'data', 'ดาต้า', 'analytics', 'machine learning', 'chatbot'] },
  { code: 'J', item: 'การผลิตภาพยนตร์ วิดีโอ และรายการโทรทัศน์', keywords: ['วิดีโอ', 'ตัดต่อ', 'ถ่ายวิดีโอ', 'production house', 'คอนเทนต์วิดีโอ', 'youtuber'] },
  { code: 'J', item: 'การสื่อสารโทรคมนาคม', keywords: ['โทรคมนาคม', 'อินเทอร์เน็ต', 'เน็ต', 'สัญญาณ', 'telecom'] },
  // M — วิชาชีพ/บริการเฉพาะทาง
  { code: 'M', item: 'การโฆษณาและการตลาด', keywords: ['การตลาด', 'marketing', 'โฆษณา', 'ads', 'เอเจนซี', 'agency', 'ยิงแอด', 'โซเชียล', 'social media', 'seo', 'คอนเทนต์'] },
  { code: 'M', item: 'การออกแบบ (Graphic / UX / Industrial)', keywords: ['ออกแบบ', 'design', 'กราฟิก', 'graphic', 'ux', 'ui', 'โลโก้', 'logo', 'ดีไซน์'] },
  { code: 'M', item: 'ที่ปรึกษาธุรกิจและการจัดการ', keywords: ['ที่ปรึกษา', 'consult', 'consulting', 'coaching', 'โค้ช', 'วางระบบ', 'iso', 'บริหารจัดการ'] },
  { code: 'M', item: 'กิจกรรมบัญชีและตรวจสอบบัญชี', keywords: ['บัญชี', 'accounting', 'ทำบัญชี', 'ตรวจสอบบัญชี', 'ภาษี', 'audit'] },
  { code: 'M', item: 'กิจกรรมทางกฎหมาย (Law Firm)', keywords: ['กฎหมาย', 'ทนาย', 'law', 'นิติกรรม', 'คดี'] },
  { code: 'M', item: 'กิจกรรมสถาปัตยกรรมและวิศวกรรม', keywords: ['สถาปนิก', 'สถาปัตยกรรม', 'วิศวกร', 'วิศวกรรม', 'เขียนแบบ', 'architect', 'engineering'] },
  // P — การศึกษา/อบรม
  { code: 'P', item: 'โรงเรียนกวดวิชาและติวเตอร์', keywords: ['กวดวิชา', 'ติวเตอร์', 'ติว', 'สอนพิเศษ', 'tutor'] },
  { code: 'P', item: 'การฝึกอบรมวิชาชีพและทักษะ', keywords: ['อบรม', 'ฝึกอบรม', 'training', 'คอร์ส', 'course', 'เวิร์กชอป', 'workshop', 'สอน', 'เรียน', 'สัมมนา'] },
  { code: 'P', item: 'การศึกษาออนไลน์ (E-Learning / EdTech)', keywords: ['edtech', 'e-learning', 'เรียนออนไลน์', 'คอร์สออนไลน์'] },
  // Q — สุขภาพ/ความงามเชิงการแพทย์
  { code: 'Q', item: 'Wellness และ Spa', keywords: ['สปา', 'spa', 'wellness', 'นวด', 'massage', 'ผ่อนคลาย'] },
  { code: 'Q', item: 'กิจกรรมโรงพยาบาลและคลินิก', keywords: ['คลินิก', 'clinic', 'โรงพยาบาล', 'หมอ', 'แพทย์', 'รักษา'] },
  { code: 'Q', item: 'กิจกรรมทันตกรรม', keywords: ['ทันตกรรม', 'ทำฟัน', 'จัดฟัน', 'dental', 'ฟัน'] },
  { code: 'Q', item: 'กิจกรรมสุขภาพอื่นๆ (กายภาพ / แพทย์แผนไทย)', keywords: ['กายภาพ', 'แพทย์แผนไทย', 'สมุนไพร', 'ฟิสิโอ'] },
  { code: 'Q', item: 'บริการดูแลเด็กเล็ก / เนอสเซอรี่', keywords: ['เนอสเซอรี่', 'ดูแลเด็ก', 'เดย์แคร์', 'nursery'] },
  // S — บริการส่วนบุคคล/ซ่อม
  { code: 'S', item: 'กิจกรรมบริการส่วนบุคคล (ทำผม เสริมสวย)', keywords: ['ทำผม', 'เสริมสวย', 'ซาลอน', 'salon', 'ตัดผม', 'ทำเล็บ', 'เล็บ', 'ต่อขนตา', 'สักคิ้ว', 'บาร์เบอร์', 'barber', 'ความงาม', 'เครื่องสำอาง', 'skincare', 'สกินแคร์'] },
  { code: 'S', item: 'สัตว์เลี้ยงและบริการที่เกี่ยวข้อง', keywords: ['สัตว์เลี้ยง', 'หมาแมว', 'อาบน้ำตัดขน', 'pet', 'กรูมมิ่ง', 'โรงแรมสัตว์'] },
  { code: 'S', item: 'บริการซักรีด', keywords: ['ซักรีด', 'ซักอบรีด', 'laundry', 'สะดวกซัก'] },
  { code: 'S', item: 'ซ่อมแซมคอมพิวเตอร์และอุปกรณ์', keywords: ['ซ่อมคอม', 'ซ่อมมือถือ', 'ซ่อมโน้ตบุ๊ก', 'ซ่อมอุปกรณ์'] },
  // F — ก่อสร้าง/ตกแต่ง
  { code: 'F', item: 'กิจกรรมก่อสร้างเฉพาะทาง', keywords: ['ก่อสร้าง', 'รับเหมา', 'ต่อเติม', 'รีโนเวท', 'renovate', 'ตกแต่งภายใน', 'interior', 'ช่างก่อสร้าง', 'construction'] },
  // H — ขนส่ง/โลจิสติกส์
  { code: 'H', item: 'โลจิสติกส์และซัพพลายเชน', keywords: ['ขนส่ง', 'โลจิสติกส์', 'logistics', 'ขนย้าย', 'ส่งพัสดุ', 'ส่งของ', 'fulfillment', 'คลังสินค้า', 'shipping'] },
  // L — อสังหาริมทรัพย์
  { code: 'L', item: 'นายหน้าและบริการด้านอสังหาริมทรัพย์', keywords: ['อสังหา', 'อสังหาริมทรัพย์', 'บ้าน', 'คอนโด', 'ที่ดิน', 'นายหน้า', 'ให้เช่า', 'real estate', 'property', 'หอพัก', 'อพาร์ทเมนต์'] },
  // K — การเงิน/ประกัน
  { code: 'K', item: 'Fintech และการชำระเงินดิจิทัล', keywords: ['fintech', 'ชำระเงิน', 'payment', 'กระเป๋าเงิน', 'คริปโต', 'crypto'] },
  { code: 'K', item: 'การประกันภัยและประกันชีวิต', keywords: ['ประกัน', 'ประกันภัย', 'ประกันชีวิต', 'insurance'] },
  { code: 'K', item: 'การลงทุนและหลักทรัพย์', keywords: ['ลงทุน', 'หุ้น', 'กองทุน', 'หลักทรัพย์', 'สินเชื่อ', 'เงินกู้'] },
  // N — บริการสนับสนุน/ท่องเที่ยว
  { code: 'N', item: 'บริการเดินทางและท่องเที่ยว', keywords: ['ท่องเที่ยว', 'ทัวร์', 'tour', 'travel', 'จองตั๋ว', 'แพ็กเกจทัวร์'] },
  { code: 'N', item: 'กิจกรรมจัดหางานและบุคลากร (HR Outsource)', keywords: ['จัดหางาน', 'recruit', 'hr', 'บุคลากร', 'หาคน'] },
  { code: 'N', item: 'บริการทำความสะอาดอาคาร', keywords: ['ทำความสะอาด', 'แม่บ้าน', 'cleaning', 'ทำความสะอาดบ้าน'] },
  // R — บันเทิง/กีฬา
  { code: 'R', item: 'กิจกรรมกีฬาและนันทนาการ', keywords: ['ฟิตเนส', 'fitness', 'ยิม', 'gym', 'โยคะ', 'yoga', 'กีฬา', 'สนามกีฬา', 'มวย'] },
  { code: 'R', item: 'กิจกรรมสร้างสรรค์ ศิลปะ และความบันเทิง', keywords: ['ถ่ายภาพ', 'ช่างภาพ', 'สตูดิโอ', 'photography', 'ดนตรี', 'วงดนตรี', 'อีเวนต์', 'event', 'จัดงาน'] },
  { code: 'R', item: 'สตูดิโอเกมและ E-Sport', keywords: ['เกม', 'game', 'esport', 'อีสปอร์ต'] },
  // A — เกษตร
  { code: 'A', item: 'กิจกรรมสนับสนุนการเกษตร', keywords: ['เกษตร', 'ฟาร์ม', 'farm', 'ปลูก', 'สวน', 'ผัก', 'ผลไม้', 'ปศุสัตว์', 'เลี้ยงสัตว์', 'ประมง', 'ข้าวสาร', 'ผลผลิต', 'organic', 'ออร์แกนิก'] },
  // C — ผลิต/แปรรูป (ทั่วไป — วางท้าย ๆ ให้ retail/food ชนะก่อน)
  { code: 'C', item: 'การผลิตอื่นๆ (Other Manufacturing)', keywords: ['ผลิต', 'โรงงาน', 'แปรรูป', 'manufacturing', 'oem', 'ผลิตภัณฑ์', 'โรงงานผลิต'] },
  { code: 'C', item: 'การผลิตเครื่องนุ่งห่ม (Wearing Apparel)', keywords: ['ตัดเย็บ', 'โรงงานเสื้อผ้า', 'ผลิตเสื้อ'] },
  // G — ค้าปลีก/ค้าส่ง (ตาข่ายกว้าง — วางท้ายสุดให้เป็น fallback ของ "ขายของ")
  { code: 'G', item: 'การค้าปลีกออนไลน์ / อีคอมเมิร์ซ', keywords: ['ขายออนไลน์', 'ออนไลน์', 'อีคอมเมิร์ซ', 'e-commerce', 'ecommerce', 'ร้านค้าออนไลน์', 'shopee', 'lazada', 'ดรอปชิป'] },
  { code: 'G', item: 'การขายปลีก (ยกเว้นยานยนต์)', keywords: ['ขายปลีก', 'ร้านค้า', 'ขายของ', 'ขายส่ง', 'ค้าปลีก', 'ค้าส่ง', 'shop', 'store', 'จำหน่าย', 'สินค้า', 'เสื้อผ้า', 'แฟชั่น', 'fashion', 'ของใช้', 'อุปกรณ์'] },
  { code: 'G', item: 'การซ่อมบำรุงยานยนต์', keywords: ['อู่', 'ซ่อมรถ', 'อะไหล่รถ', 'ยานยนต์', 'คาร์แคร์', 'car care', 'ล้างรถ'] },
];

const WORD = /[\s·]+/;

/** จัดหมวด DBD จากข้อความอิสระ — คืน null ถ้าจับไม่ได้ (ให้ UI ถามผู้ใช้แทน) */
export function classifyDbd(text: string): DbdGuess | null {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return null;

  let best: { rule: Rule; score: number } | null = null;
  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) if (t.includes(kw.toLowerCase())) score++;
    // เจอก่อน (เฉพาะเจาะจงกว่า) ชนะเมื่อคะแนนเท่ากัน → ใช้ > (ไม่ >=)
    if (score > 0 && (!best || score > best.score)) best = { rule, score };
  }
  if (!best) return null;

  const { rule, score } = best;
  const sectorLabel = getDBDSector(rule.code)?.label ?? '';
  return {
    value: `[${rule.code}] ${rule.item}`,
    code: rule.code,
    sectorLabel,
    item: rule.item,
    score,
    confidence: score >= 3 ? 'high' : score === 2 ? 'medium' : 'low',
  };
}

/** รวมข้อความจากหน้าร้านเพื่อป้อน classifier (ชื่อ + คำอธิบาย + จุดขาย + สินค้า/บริการ) */
export function storefrontText(parts: { name?: string; description?: string; vp?: string; services?: string[]; products?: { name: string; desc?: string }[] }): string {
  const bits = [
    parts.name, parts.description, parts.vp,
    (parts.services ?? []).join(' '),
    (parts.products ?? []).map(p => `${p.name} ${p.desc ?? ''}`).join(' '),
  ];
  return bits.filter(Boolean).join(' ').replace(WORD, ' ').trim();
}
