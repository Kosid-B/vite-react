import type { BMCData } from '../types';

/* ===== BMC Sync — ให้ CEO เชื่อมสถานการณ์ธุรกิจ (ข้อมูลจาก intake) เข้ากับ Business Model Canvas =====
 * ตรรกะบริสุทธิ์ ทดสอบได้ · จับว่าข้อมูลกระทบ BMC ช่องไหน → เสนอบันทึกเข้า canvas (human-in-the-loop)
 * ทำให้ "กระบวนการรับข้อมูล/มอบงาน" สอดคล้องกับ BMC และช่วยปรับ BMC ตามสถานการณ์จริง */

export type BMCKey = keyof BMCData;

export interface BMCBlock {
  key: BMCKey;
  title: string;
  sub: string;
  hints: string[];  // คำ (ไทย+อังกฤษ) ที่บ่งว่าข้อมูลเกี่ยวกับ block นี้
}

export const BMC_BLOCKS: BMCBlock[] = [
  { key: 'segments', title: 'Customer Segments', sub: 'กลุ่มลูกค้าเป้าหมาย',
    hints: ['ลูกค้า', 'กลุ่มเป้าหมาย', 'เซกเมนต์', 'segment', 'persona', 'ผู้ใช้', 'ตลาดเป้าหมาย', 'demographic', 'กลุ่มคน'] },
  { key: 'value', title: 'Value Propositions', sub: 'คุณค่าที่นำเสนอ',
    hints: ['คุณค่า', 'จุดขาย', 'แก้ปัญหา', 'ประโยชน์', 'ต่างจากคู่แข่ง', 'value', 'benefit', 'solve', 'usp', 'ข้อเสนอ'] },
  { key: 'channels', title: 'Channels', sub: 'ช่องทางเข้าถึงลูกค้า',
    hints: ['ช่องทาง', 'จัดจำหน่าย', 'หน้าร้าน', 'ออนไลน์', 'จัดส่ง', 'channel', 'marketplace', 'โซเชียล', 'ขายผ่าน', 'ดิลิเวอรี'] },
  { key: 'relationships', title: 'Customer Relationships', sub: 'ความสัมพันธ์ลูกค้า',
    hints: ['ความสัมพันธ์', 'ดูแลลูกค้า', 'บริการหลังการขาย', 'สมาชิก', 'loyalty', 'retention', 'crm', 'support', 'รักษาลูกค้า', 'คอมมูนิตี้'] },
  { key: 'revenue', title: 'Revenue Streams', sub: 'กระแสรายได้',
    hints: ['รายได้', 'ราคา', 'กำไร', 'ยอดขาย', 'ค่าบริการ', 'revenue', 'pricing', 'subscription', 'ค่าสมาชิก', 'รายรับ'] },
  { key: 'resources', title: 'Key Resources', sub: 'ทรัพยากรหลัก',
    hints: ['ทรัพยากร', 'ทีม', 'เทคโนโลยี', 'ทุน', 'resource', 'asset', 'เครื่องมือ', 'ระบบ', 'บุคลากร', 'สินทรัพย์'] },
  { key: 'activities', title: 'Key Activities', sub: 'กิจกรรมหลัก',
    hints: ['กิจกรรม', 'ผลิต', 'กระบวนการ', 'ดำเนินการ', 'activity', 'operation', 'produce', 'ผลิตภัณฑ์', 'พัฒนา', 'บริการ'] },
  { key: 'partners', title: 'Key Partners', sub: 'พันธมิตรหลัก',
    hints: ['พันธมิตร', 'ซัพพลายเออร์', 'ร่วมมือ', 'partner', 'supplier', 'outsource', 'จ้างภายนอก', 'ตัวแทน', 'คู่ค้า'] },
  { key: 'costs', title: 'Cost Structure', sub: 'โครงสร้างต้นทุน',
    hints: ['ต้นทุน', 'ค่าใช้จ่าย', 'รายจ่าย', 'งบ', 'cost', 'expense', 'ค่าเช่า', 'ค่าจ้าง', 'overhead'] },
];

const norm = (s: string) => (s ?? '').toLowerCase();
const clip = (s: string, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export interface BMCSuggestion {
  key: BMCKey;
  blockTitle: string;
  blockSub: string;
  snippet: string;   // ข้อความที่เสนอบันทึกเข้า block
}

/** จับว่าข้อมูล (situation) กระทบ BMC ช่องไหน → เสนอบันทึก (เรียงตามจำนวน hit) */
export function bmcSuggestions(text: string, tag = 'จากข้อมูลผู้ใช้'): BMCSuggestion[] {
  const hay = norm(text);
  if (!hay.trim()) return [];
  const snippet = `📌 [${tag}] ${clip(text, 90)}`;
  return BMC_BLOCKS
    .map(b => ({ block: b, hits: b.hints.filter(h => hay.includes(norm(h))).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map(({ block }) => ({ key: block.key, blockTitle: block.title, blockSub: block.sub, snippet }));
}

/** บันทึกข้อเสนอเข้า BMC (immutable) — append + dedupe, cap 12 รายการต่อ block กันบวม */
export function applyBmcSuggestion(bmc: BMCData, s: BMCSuggestion): BMCData {
  const cur = Array.isArray(bmc?.[s.key]) ? bmc[s.key] : [];
  if (cur.includes(s.snippet)) return bmc;
  return { ...bmc, [s.key]: [...cur, s.snippet].slice(-12) };
}
