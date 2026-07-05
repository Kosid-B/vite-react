import type { AppData } from '../types';

/* ===== CMO Market Validation — พิสูจน์ไอเดียก่อนลงทุนสร้าง (Data-Driven Discovery) =====
 * กรอบ: JTBD · VRIO · TAM/SAM/SOM · Willingness-to-Pay · MVP Feasibility · Pre-Sale Test
 * Decision Gate: GO / PIVOT / KILL — ลดความเสี่ยงทำของที่ไม่มีคนจ่าย
 * เสริมกับแผง 🧪 พิสูจน์ไอเดีย (หน้าร้าน) ที่วัด demand จริงจาก leads */

export type Verdict = 'go' | 'pivot' | 'kill' | '';

/** สกัด verdict จากผลลัพธ์ agent (มองหา GO/PIVOT/KILL) */
export function extractVerdict(text: string): Verdict {
  const t = (text || '').toUpperCase();
  const iGo = t.indexOf('GO'), iPivot = t.indexOf('PIVOT'), iKill = t.indexOf('KILL');
  // เลือกคำที่ปรากฏก่อน (มักเป็นบรรทัดสรุป) — PIVOT/KILL เด่นกว่า GO ถ้าอยู่ใกล้ต้น
  const cands: { v: Verdict; i: number }[] = [
    { v: 'kill' as Verdict, i: iKill }, { v: 'pivot' as Verdict, i: iPivot }, { v: 'go' as Verdict, i: iGo },
  ].filter(c => c.i >= 0).sort((a, b) => a.i - b.i);
  return cands.length ? cands[0].v : '';
}

export const VERDICT_META: Record<Exclude<Verdict, ''>, { label: string; icon: string; color: string; hint: string }> = {
  go:    { label: 'GO — ลุยต่อ',      icon: '✅', color: '#22c55e', hint: 'ไอเดียมี Pain จริง + ตลาดพอ → เดินหน้าทำ MVP + Pre-Sale Test' },
  pivot: { label: 'PIVOT — ปรับก่อน', icon: '🔄', color: '#f59e0b', hint: 'มีจุดอ่อน → ปรับกลุ่มเป้าหมาย/ข้อเสนอ/ราคา แล้วทดสอบใหม่' },
  kill:  { label: 'KILL — หยุด',      icon: '🛑', color: '#ef4444', hint: 'Pain ไม่ชัด/ตลาดเล็กเกิน → หยุดก่อนเสียทรัพยากร เสนอ Pivot Idea' },
};

/** คำสั่งให้ CMO agent ทำหน้าที่ Validator พิสูจน์ไอเดีย */
export function validationInstruction(d: AppData, idea: string): string {
  const c = d.aiCompany;
  return [
    `ทำหน้าที่ CMO/Validator: พิสูจน์ไอเดียก่อนลงทุนสร้าง (Build) เพื่อลดความเสี่ยงทำของที่ไม่มีคนจ่าย`,
    `ธุรกิจ: ${c?.name || 'บริษัท'} (${c?.industry || 'ไม่ระบุ'}) · เป้าหมาย: ${c?.goal || '-'}`,
    `ไอเดียที่ต้องพิสูจน์: "${idea}"`,
    '',
    'ให้ค้นข้อมูลตลาด/คู่แข่งที่เกี่ยวข้อง แล้ววิเคราะห์ตามกรอบ (ตอบเป็นภาษาไทย กระชับ):',
    '1) Jobs-to-be-Done: ลูกค้า "จ้าง" ไอเดียนี้ทำงานอะไรให้ (pain/gain ที่แท้จริง)',
    '2) VRIO: Value · Rarity · Inimitability · Organization — ได้เปรียบแข่งขันจริงไหม',
    '3) TAM/SAM/SOM: ประเมินขนาดตลาด (top-down + bottom-up) กลุ่มที่พร้อมจ่าย',
    '4) Willingness-to-Pay: ราคาที่ลูกค้ายอมจ่าย + เหตุผล (อ้างพฤติกรรม/คู่แข่ง)',
    '5) MVP Feasibility: ฟีเจอร์ขั้นต่ำที่ปิดการขายได้ทันที (ตัดส่วนที่ยังไม่จำเป็น)',
    '6) บทสัมภาษณ์ลูกค้าเป้าหมาย 5 ข้อ (เช็คว่า pain รุนแรงพอให้จ่ายไหม)',
    '7) Pre-Sale Test: แนะวิธีทดสอบจริง (เปิดหน้าร้าน pre-order → วัดคนทิ้งช่องทางติดต่อ เป้า 10 คน)',
    '',
    'สรุป Decision Gate — ขึ้นบรรทัดแรกของสรุปด้วยคำเดียว: GO หรือ PIVOT หรือ KILL',
    '(ถ้า KILL/PIVOT ให้เสนอ "Pivot Idea" ทางเลือกที่สมจริง 1–2 ข้อทันที)',
    'ปิดท้ายด้วยเหตุผลสั้น ๆ ที่อ้างอิงข้อมูล ไม่ใช่ความรู้สึก',
  ].join('\n');
}
