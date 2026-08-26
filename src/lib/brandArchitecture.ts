/* brandArchitecture — ความสัมพันธ์ระหว่าง B.TC (บริษัทแม่) กับ CEO AI Thailand
 * (เจ้าของกำหนด 26 ส.ค. 2569 · "นี้เป็นกฎการสร้างการตลาดและระบบที่สัมพันธ์กัน")
 *
 * 🔴 ความสับสนที่กฎนี้แก้:
 *   ระบบเรามี ISO/PDPA/Process/KPI อยู่เต็มไปหมด จนดูเหมือน "SaaS ด้าน ISO"
 *   ความจริงคือ ISO เป็น **ความเชี่ยวชาญสะสมของบริษัทแม่** ที่ถูกนำมาต่อยอด
 *   ⇒ CEO AI Thailand = AI Growth Platform **ที่มี** ความรู้ระบบบริหารหนุนหลัง
 *     ไม่ใช่ ISO SaaS ที่เพิ่มการตลาดเข้าไป
 *
 * 🔴 และห้ามให้ใครเข้าใจว่า CEO AI Thailand คือ B.TC เปลี่ยนชื่อเป็นบริษัท AI
 *   สองแบรนด์มีหน้าที่ต่างกัน และการรวมกันทำให้เสียทั้งสองฝั่ง
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

export interface BrandRole {
  name: string;
  /** หน้าที่ในโครงสร้าง — ตอบคำถามอะไรให้ลูกค้า */
  role: string;
  answers: string;
  owns: string[];
}

/** แบรนด์บริษัท — ตอบว่า "ทำไมเราถึงมีสิทธิ์สอนเรื่องการสร้างระบบธุรกิจ" */
export const CORPORATE: BrandRole = {
  name: 'B.TC',
  role: 'Credibility Engine',
  answers: 'ทำไมเราถึงมีสิทธิ์สอนเรื่องการสร้างระบบธุรกิจ',
  owns: ['Consulting', 'Training', 'Management Systems', 'ประสบการณ์ ISO / Process / Governance'],
};

/** แบรนด์ผลิตภัณฑ์ — ตอบว่า "AI จะทำให้ SME เริ่ม โต และ Scale ได้อย่างไร" */
export const PRODUCT: BrandRole = {
  name: 'CEO AI Thailand',
  role: 'Growth & Technology Engine',
  answers: 'AI จะทำให้ SME เริ่ม โต และ Scale ได้อย่างไร',
  owns: ['AI', 'SaaS', 'Business Growth', 'Automation'],
};

/** ทิศทางผลิตภัณฑ์ที่เจ้าของ freeze — ประโยคนี้ตัดสินลำดับของ roadmap ทั้งหมด */
export const DIRECTION = 'AI Growth Platform backed by B.TC Management-System Expertise';

/** 🔴 สิ่งที่ทิศทางนี้ **ไม่ใช่** — เขียนไว้เพราะมันคือสิ่งที่ระบบจะไหลกลับไปเป็นถ้าไม่มีใครกัน */
export const NOT_THIS = 'ISO SaaS ที่เพิ่ม Marketing เข้าไป';

/** ชั้นของผลิตภัณฑ์ — Growth Core มาก่อน · Governance เป็น Scale Layer */
export const LAYERS = [
  { key: 'start', label: 'START', what: 'Business Fit / MIT 24 Steps', stage: 'เริ่ม' },
  { key: 'grow', label: 'GROW', what: 'Marketing OS / Growth Intelligence', stage: 'โต' },
  { key: 'scale', label: 'SCALE', what: 'Systemize Operations / KPI', stage: 'วางระบบ' },
  { key: 'govern', label: 'GOVERN', what: 'ISO / TIS / PDPA', stage: 'กำกับดูแล' },
] as const;
export type LayerKey = typeof LAYERS[number]['key'];

/** ชั้นที่ compliance เริ่มมีความหมาย — ก่อนหน้านี้พูดไป = พูดเรื่องที่เขายังไม่มีปัญหา */
export const GOVERN_IS_LAST_LAYER = true;

/** ข้อความรับรองที่ใช้ได้ — วางเป็น "หนุนหลัง" ไม่ใช่ "พาดหัว" */
export const ENDORSEMENT =
  'สร้างโดยทีมที่ปรึกษาธุรกิจและระบบบริหารจาก B.TC ซึ่งมีประสบการณ์กว่า 20 ปี';

/** สารหลักของ hero — ต้องเป็นเส้นทางการเติบโต ไม่ใช่ความเชี่ยวชาญของเรา */
export const HERO_PROMISE = 'เริ่มธุรกิจ → โต → วัดผล → สร้างระบบ → Scale ด้วย AI';

/* ── B.TC เป็นช่องทางกระจาย ไม่ใช่จุดยืน ─────────────────────────────────────
 * ⚠️ เส้นแบ่งที่ห้ามพลาด (ผมเคยเสนอผิดมาแล้ว 24 ส.ค. 2569):
 *   ลูกค้าเดิมของ B.TC **เข้ามาทางนี้ได้** — แต่เมื่อเข้ามาแล้วต้องเจอ
 *   **สารการเติบโตเดียวกับทุกคน** ไม่ใช่สาร ISO
 *   ⇒ ช่องทาง ≠ จุดยืน · ISO ยังโผล่ที่ชั้น GOVERN เหมือนเดิม
 * ─────────────────────────────────────────────────────────────────────── */

/** เส้นทางที่ลูกค้าเดิมของบริษัทแม่เดินเข้ามา */
export const DISTRIBUTION_JOURNEY = [
  'B.TC Training',
  'Business Assessment',
  'CEO AI Thailand',
  'Growth / Marketing / KPI',
  'Operations',
  'ISO / Certification',
  'Continuous Improvement',
] as const;

/** seg สำหรับคนที่มาจากบริษัทแม่ — ได้สารการเติบโต ไม่ใช่สาร ISO */
export const DISTRIBUTION_SEG = 'btc';

export interface BrandIssue {
  level: 'blocker' | 'warn';
  what: string;
  why: string;
}

/** คำที่บอกว่ากำลังนำด้วย compliance */
const COMPLIANCE_WORDS = ['iso', 'มอก.', 'pdpa', 'ผู้เชี่ยวชาญ iso', 'ใบรับรอง', 'ออดิท', 'ตรวจประเมิน'];
/** คำที่บอกว่ากำลังรวมสองแบรนด์เป็นอันเดียว */
const MERGE_PHRASES = ['b.tc คือ ceo ai', 'ceo ai คือ b.tc', 'เปลี่ยนชื่อเป็น', 'rebrand', 'b.tc เปลี่ยนเป็น'];

/** ตรวจข้อความที่จะขึ้น hero / พาดหัวสาธารณะ */
export function brandIssues(heroText: string): BrandIssue[] {
  const t = heroText.toLowerCase();
  const out: BrandIssue[] = [];

  const lead = COMPLIANCE_WORDS.find((w) => t.includes(w));
  if (lead) {
    out.push({
      level: 'blocker',
      what: `พาดหัวนำด้วยคำว่า "${lead}"`,
      why: 'compliance เป็นชั้น GOVERN (ชั้นสุดท้าย) — ไม่ใช่ Primary Job-to-be-Done ของลูกค้า ' +
        'และนำด้วย ISO = แข่งกับงานที่ปรึกษาของบริษัทแม่เอง',
    });
  }

  const merge = MERGE_PHRASES.find((w) => t.includes(w));
  if (merge) {
    out.push({
      level: 'blocker',
      what: `ข้อความทำให้เข้าใจว่าสองแบรนด์เป็นอันเดียวกัน ("${merge}")`,
      why: 'B.TC = Trust/Consulting/Training · CEO AI Thailand = AI/SaaS/Growth ' +
        'รวมกันแล้วเสียทั้งสองฝั่ง — ฝั่งหนึ่งดูเป็นบริษัท AI ที่ไม่มีประสบการณ์ อีกฝั่งดูเป็นที่ปรึกษาที่ขายซอฟต์แวร์',
    });
  }
  return out;
}

/** บล็อกที่แปะเข้า prompt — โครงสร้างแบรนด์ต้องเดินทางไปกับทุกคำสั่งที่สร้างคอนเทนต์ */
export function brandArchitectureBlock(): string {
  return [
    '## โครงสร้างแบรนด์ (ห้ามสลับหน้าที่)',
    `  ${CORPORATE.name} = ${CORPORATE.role} — ตอบว่า "${CORPORATE.answers}"`,
    `  ${PRODUCT.name} = ${PRODUCT.role} — ตอบว่า "${PRODUCT.answers}"`,
    `  ทิศทาง: ${DIRECTION}`,
    `  🔴 ไม่ใช่: ${NOT_THIS}`,
    '',
    `  ชั้นผลิตภัณฑ์: ${LAYERS.map((l) => l.label).join(' → ')} (GOVERN/ISO เป็นชั้นสุดท้ายเสมอ)`,
    `  พาดหัวหลักต้องเป็น: ${HERO_PROMISE}`,
    `  ข้อความรับรองที่ใช้ได้ (วางหนุนหลัง ไม่ใช่พาดหัว): "${ENDORSEMENT}"`,
    '',
    '🔴 ห้ามขึ้นพาดหัวด้วย ISO / มอก. / PDPA กับกลุ่มทั่วไป — นั่นคือชั้น GOVERN ไม่ใช่ปัญหาแรกของเขา',
    '🔴 ห้ามเขียนให้เข้าใจว่า CEO AI Thailand คือ B.TC เปลี่ยนชื่อเป็นบริษัท AI',
    `🔴 ลูกค้าเดิมของ ${CORPORATE.name} เข้ามาทาง seg=${DISTRIBUTION_SEG} ได้ — แต่ต้องเจอสารการเติบโตเดียวกับทุกคน`,
  ].join('\n');
}
