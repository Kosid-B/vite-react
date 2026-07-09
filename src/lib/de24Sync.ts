/* ===== MIT 24 Steps Sync — CEO เสนอ "ปรับ 24 ขั้น (Disciplined Entrepreneurship)" เมื่อสถานการณ์เปลี่ยน =====
 * ตรรกะบริสุทธิ์ ทดสอบได้ · จับว่าข้อมูล (situation) เกี่ยวกับขั้นไหน → เสนอเพิ่มโน้ตทบทวนที่ขั้นนั้น
 * (human-in-the-loop) ทำให้แผน 24 ขั้นสอดคล้องกับสถานการณ์จริง คู่กับ BMC sync */

export type De24Step = { done: boolean; notes: string };

export interface De24StepDef {
  index: number;      // 0..23
  phase: number;      // 0..3
  name: string;       // ชื่อขั้น (ย่อ ไทย)
  hints: string[];    // คำ (ไทย+อังกฤษ) ที่บ่งว่าเกี่ยวขั้นนี้
}

/* 4 ระยะ: 0 ลูกค้าคือใคร · 1 คุณค่าที่นำเสนอ · 2 ขาย/รายได้ · 3 ทดสอบ/ขยาย */
export const DE24_DEFS: De24StepDef[] = [
  { index: 0, phase: 0, name: 'แบ่งส่วนตลาด', hints: ['แบ่งส่วนตลาด', 'แบ่งตลาด', 'ส่วนตลาด', 'market segmentation'] },
  { index: 1, phase: 0, name: 'เลือกตลาดหัวหาด', hints: ['ตลาดหัวหาด', 'beachhead', 'ตลาดเล็ก', 'เจาะตลาด'] },
  { index: 2, phase: 0, name: 'สร้างแฟ้มผู้ใช้ตัวจริง', hints: ['แฟ้มผู้ใช้', 'โปรไฟล์ผู้ใช้', 'end user', 'ผู้ใช้ตัวจริง'] },
  { index: 3, phase: 0, name: 'คำนวณ TAM ตลาดหัวหาด', hints: ['tam', 'total addressable', 'ขนาดตลาด', 'มูลค่าตลาด'] },
  { index: 4, phase: 0, name: 'กำหนด Persona', hints: ['persona', 'เพอร์โซนา', 'ตัวละครลูกค้า', 'เกณฑ์การซื้อ'] },
  { index: 5, phase: 0, name: 'วงจรการใช้ผลิตภัณฑ์', hints: ['use case', 'วงจรการใช้', 'full life cycle', 'ประสบการณ์ใช้งาน'] },
  { index: 6, phase: 1, name: 'ร่างภาพผลิตภัณฑ์', hints: ['สเปกผลิตภัณฑ์', 'ร่างภาพผลิตภัณฑ์', 'สตอรีบอร์ด', 'product spec'] },
  { index: 7, phase: 1, name: 'แปลงคุณค่าเป็นตัวเลข', hints: ['คุณค่าเป็นตัวเลข', 'quantify value', 'ประหยัดเงิน', 'as-is'] },
  { index: 8, phase: 1, name: 'ลูกค้า 10 คนถัดไป', hints: ['ลูกค้า 10', 'next 10', 'ลูกค้ากลุ่มแรก', 'ทดสอบกับลูกค้า'] },
  { index: 9, phase: 1, name: 'กำหนดแก่นธุรกิจ (Core)', hints: ['แก่นธุรกิจ', 'core', 'moat', 'network effect'] },
  { index: 10, phase: 1, name: 'ตำแหน่งในการแข่งขัน', hints: ['คู่แข่ง', 'แข่งขัน', 'competitive', 'positioning'] },
  { index: 11, phase: 2, name: 'หน่วยตัดสินใจ (DMU)', hints: ['dmu', 'ผู้ตัดสินใจ', 'economic buyer', 'champion'] },
  { index: 12, phase: 2, name: 'กระบวนการหาลูกค้า', hints: ['หาลูกค้า', 'acquire customer', 'sales cycle', 'กระบวนการได้ลูกค้า'] },
  { index: 13, phase: 2, name: 'TAM ตลาดถัดไป', hints: ['ตลาดถัดไป', 'ตลาดข้างเคียง', 'ขยายตลาด', 'next market'] },
  { index: 14, phase: 2, name: 'ออกแบบโมเดลธุรกิจ', hints: ['โมเดลธุรกิจ', 'business model', 'subscription', 'รูปแบบรายได้'] },
  { index: 15, phase: 2, name: 'กำหนดกรอบราคา', hints: ['ราคา', 'pricing', 'ตั้งราคา', 'กรอบราคา'] },
  { index: 16, phase: 2, name: 'คำนวณ LTV', hints: ['ltv', 'lifetime value', 'มูลค่าตลอดชีพ'] },
  { index: 17, phase: 2, name: 'ร่างกระบวนการขาย', hints: ['กระบวนการขาย', 'sales process', 'ช่องทางขาย'] },
  { index: 18, phase: 2, name: 'คำนวณ COCA', hints: ['coca', 'ต้นทุนหาลูกค้า', 'cac', 'cost of acquisition'] },
  { index: 19, phase: 3, name: 'ระบุสมมติฐานหลัก', hints: ['สมมติฐานหลัก', 'key assumption', 'ข้อสมมติ'] },
  { index: 20, phase: 3, name: 'ทดสอบสมมติฐาน', hints: ['ทดสอบสมมติฐาน', 'test assumption', 'ทดลอง', 'feedback'] },
  { index: 21, phase: 3, name: 'กำหนด MVBP', hints: ['mvbp', 'minimum viable', 'ผลิตภัณฑ์ขั้นต่ำ'] },
  { index: 22, phase: 3, name: 'พิสูจน์ว่าลูกค้าจะซื้อ', hints: ['k-factor', 'viral', 'พิสูจน์ว่าซื้อ', 'ลูกค้าจะซื้อจริง'] },
  { index: 23, phase: 3, name: 'แผนพัฒนาผลิตภัณฑ์', hints: ['แผนพัฒนาผลิตภัณฑ์', 'product plan', 'roadmap ผลิตภัณฑ์', 'full product'] },
];

export const DE24_PHASE_LABELS = ['ลูกค้าคือใคร', 'คุณค่าที่นำเสนอ', 'ขาย/รายได้', 'ทดสอบ/ขยาย'];

const norm = (s: string) => (s ?? '').toLowerCase();
const clip = (s: string, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export interface De24Suggestion {
  index: number;
  phase: number;
  phaseLabel: string;
  name: string;
  snippet: string;   // โน้ตที่เสนอเพิ่มเข้าขั้นนั้น
}

/** จับขั้นที่เกี่ยวกับสถานการณ์ (เรียงตาม hit) — คืน top N กันรก */
export function de24Suggestions(text: string, tag = 'จากข้อมูลผู้ใช้', top = 3): De24Suggestion[] {
  const hay = norm(text);
  if (!hay.trim()) return [];
  const snippet = `📌 [${tag}] ${clip(text, 90)}`;
  return DE24_DEFS
    .map(d => ({ def: d, hits: d.hints.filter(h => hay.includes(norm(h))).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.def.index - b.def.index)
    .slice(0, top)
    .map(({ def }) => ({
      index: def.index, phase: def.phase, phaseLabel: DE24_PHASE_LABELS[def.phase] ?? '',
      name: def.name, snippet,
    }));
}

/** เพิ่มโน้ตทบทวนเข้าขั้นที่ index (immutable) — ต่อท้าย notes, dedupe, ทน de24 สั้น/เพี้ยน */
export function applyDe24Note(de24: De24Step[], index: number, snippet: string): De24Step[] {
  if (!Array.isArray(de24) || index < 0 || index >= de24.length) return de24;
  const step = de24[index] ?? { done: false, notes: '' };
  const notes = typeof step.notes === 'string' ? step.notes : '';
  if (notes.includes(snippet)) return de24;
  const next = [...de24];
  next[index] = { ...step, notes: notes.trim() ? `${notes}\n${snippet}` : snippet };
  return next;
}
