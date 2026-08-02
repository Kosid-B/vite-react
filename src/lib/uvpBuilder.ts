// uvpBuilder.ts — Unique Value Proposition builder (Superorganism เสา 3: Specialization/Defense)
// "ผีเสื้อสีเตือนภัย/พรางตัว" → ธุรกิจต้องมีจุดขายที่ชัด + ลอกยาก (moat) เพื่อแยกจากคู่แข่ง
// สร้างประโยค UVP จากองค์ประกอบจริง + ให้คะแนน 4 มิติ (Relevancy/Value/Differentiation/Defensibility)
// + โค้ชจุดอ่อน · pure/testable

export type MoatType = 'network' | 'data' | 'ip' | 'brand' | 'switching' | 'cost' | 'none';

export interface UvpInput {
  segment: string;        // ลูกค้าเป้าหมาย (ยิ่งแคบยิ่งคม)
  pain: string;           // ปัญหา/งานที่ลูกค้าต้องแก้
  benefit: string;        // คุณค่า/ผลลัพธ์หลัก
  quantified: string;     // ตัวเลขคุณค่า (ประหยัด X / +Y%) — ไม่บังคับ
  competitor: string;     // ทางเลือกเดิม/คู่แข่ง
  differentiator: string; // จุดต่างหลัก
  moatType: MoatType;     // ประเภท moat (ตัวชี้ว่าลอกยากแค่ไหน)
}

export type DimKey = 'relevancy' | 'value' | 'differentiation' | 'defensibility';
export interface UvpDimension { key: DimKey; label: string; level: 0 | 1 | 2; note: string }

export interface UvpResult {
  statement: string;
  variants: string[];
  dimensions: UvpDimension[];
  score: number;                 // 0–100
  grade: 'weak' | 'developing' | 'strong';
  coaching: string[];
}

export const MOAT_LABEL: Record<MoatType, string> = {
  network: 'Network Effect (ยิ่งคนใช้ยิ่งมีค่า)', data: 'Data Moat (คลังข้อมูลสะสม)',
  ip: 'IP/สิทธิบัตร/ความรู้เฉพาะ', brand: 'Brand/ความเชื่อใจ', switching: 'Switching Cost (ย้ายยาก)',
  cost: 'Cost Leadership (ต้นทุนต่ำสุด)', none: 'ยังไม่มี moat ชัดเจน',
};

// ความแข็งแรงของ moat: network/data/ip = ยั่งยืน(2) · brand/switching/cost = พอมี(1) · none = 0
const MOAT_STRENGTH: Record<MoatType, 0 | 1 | 2> = {
  network: 2, data: 2, ip: 2, brand: 1, switching: 1, cost: 1, none: 0,
};

const has = (s: string | undefined): boolean => !!s && s.trim().length > 0;
const or = (v: string, ph: string): string => (has(v) ? v.trim() : ph);

/** สร้าง UVP + คะแนน 4 มิติ + โค้ช — pure */
export function buildUvp(inp: UvpInput): UvpResult {
  const seg = or(inp.segment, '[ลูกค้าเป้าหมาย]');
  const pain = or(inp.pain, '[ปัญหา]');
  const benefit = or(inp.benefit, '[คุณค่า]');
  const comp = or(inp.competitor, '[ทางเลือกเดิม]');
  const diff = or(inp.differentiator, '[จุดต่าง]');
  const valNum = has(inp.quantified) ? ` (${inp.quantified.trim()})` : '';

  const statement = `สำหรับ${seg}ที่${pain} — ${benefit}${valNum} ต่างจาก${comp}ตรงที่${diff}`;
  const variants = [
    `ทางเลือกเดียวที่${diff} สำหรับ${seg}`,
    `${benefit}${valNum} โดยไม่ต้อง${pain}`,
    `ไม่เหมือน${comp}: ${diff}`,
  ];

  // มิติ
  const relevancy: 0 | 1 | 2 = (has(inp.segment) && has(inp.pain)) ? 2 : (has(inp.segment) || has(inp.pain)) ? 1 : 0;
  const value: 0 | 1 | 2 = has(inp.benefit) ? (has(inp.quantified) ? 2 : 1) : 0;
  const differentiation: 0 | 1 | 2 = (has(inp.differentiator) && has(inp.competitor)) ? 2 : has(inp.differentiator) ? 1 : 0;
  const defensibility: 0 | 1 | 2 = MOAT_STRENGTH[inp.moatType] ?? 0;

  const dimensions: UvpDimension[] = [
    { key: 'relevancy', label: 'Relevancy — ตรงกลุ่ม/ปัญหาจริง', level: relevancy, note: relevancy === 2 ? 'ระบุกลุ่ม+ปัญหาชัด' : 'ยังกว้างไป' },
    { key: 'value', label: 'Value — คุณค่าชัด (มีตัวเลข)', level: value, note: value === 2 ? 'มีตัวเลขคุณค่า' : value === 1 ? 'ยังไม่เป็นตัวเลข' : 'ยังไม่ระบุคุณค่า' },
    { key: 'differentiation', label: 'Differentiation — ต่างจากคู่แข่ง', level: differentiation, note: differentiation === 2 ? 'เทียบคู่แข่งได้' : 'ยังไม่ชัด' },
    { key: 'defensibility', label: 'Defensibility — ลอกยาก (moat)', level: defensibility, note: MOAT_LABEL[inp.moatType] },
  ];

  const score = Math.round((dimensions.reduce((s, d) => s + d.level, 0) / 8) * 100);
  // moat เป็นหัวใจของเสา 3 — ไม่มี moat (defensibility 0) = ยัง strong ไม่ได้ (คู่แข่งลอกทัน)
  let grade: UvpResult['grade'] = score >= 75 ? 'strong' : score >= 40 ? 'developing' : 'weak';
  if (defensibility === 0 && grade === 'strong') grade = 'developing';

  const coaching: string[] = [];
  if (defensibility === 0) coaching.push('จุดต่างยังลอกง่าย — หา moat ที่ยั่งยืน (Network/Data/ความรู้เฉพาะ) ไม่งั้นคู่แข่งตามทันเร็ว');
  if (value < 2) coaching.push('ทำคุณค่าให้เป็นตัวเลข (ประหยัด X บาท/ชม. หรือ +Y%) — ตัวเลขขายได้กว่าคำบรรยาย');
  if (differentiation < 2) coaching.push('ระบุ "ทางเลือกเดิม/คู่แข่ง" ให้ชัด แล้วบอกจุดต่าง — UVP ต้องเทียบได้');
  if (relevancy < 2) coaching.push('เจาะ segment + pain ให้เฉพาะเจาะจง (ยิ่งแคบยิ่งคม) แทนที่จะพูดกว้าง ๆ');
  if (coaching.length === 0) coaching.push('UVP แข็งแรง — เอาไปทดสอบกับลูกค้าจริง 10 ราย แล้ววัดว่าจับใจไหม');

  return { statement, variants, dimensions, score, grade, coaching };
}
