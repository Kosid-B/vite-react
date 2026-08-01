// instantPreview.ts — Black Hole "Instant Proof": สร้างตัวอย่าง แผน/ทีม AI/หน้าร้าน จาก "ชื่อธุรกิจ"
// pure + deterministic (seed จากชื่อ) · ไม่เรียก AI / ไม่ต้อง auth → โชว์ได้ "ก่อน login" ฟรี ไม่มีต้นทุน/abuse
// เป้า: ให้เห็นคุณค่าก่อนสมัคร = ทำลายกำแพง trust (Event Horizon / Aha ก่อน signup) — พอสมัครค่อยได้ AI จริง

export interface PreviewAgent { role: string; emoji: string; mandate: string; }
export interface InstantPreview {
  bizName: string;
  category: string;
  team: PreviewAgent[];
  plan: { goal: string; target: string; actions: string[] };
  storefront: { name: string; tagline: string; category: string };
}

/** djb2 hash → seed คงที่ (input เดิม = ผลเดิม, เทสต์ได้) */
function seed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
const pick = <T,>(arr: T[], n: number): T => arr[n % arr.length];

const CATEGORIES: { kw: string[]; label: string; target: string }[] = [
  { kw: ['คาเฟ่', 'กาแฟ', 'coffee', 'ชา', 'เบเกอร', 'ขนม', 'ร้านอาหาร', 'อาหาร', 'food', 'ครัว'], label: 'ร้านอาหาร & เครื่องดื่ม', target: 'คนวัยทำงาน 25–40 ที่มองหาที่นั่งทำงาน/พบปะ และรสชาติที่ไว้ใจได้' },
  { kw: ['ร้าน', 'shop', 'ขาย', 'store', 'เสื้อผ้า', 'แฟชั่น', 'beauty', 'ความงาม', 'เครื่องสำอาง', 'สินค้า'], label: 'ค้าปลีก & อีคอมเมิร์ซ', target: 'ลูกค้าออนไลน์ที่ชอบสินค้าเฉพาะกลุ่ม + ดูรีวิวจริงก่อนตัดสินใจ' },
  { kw: ['tech', 'เทค', 'ซอฟต์แวร์', 'software', 'app', 'แอป', 'ai', 'ระบบ', 'digital', 'ดิจิทัล'], label: 'เทคโนโลยี & ซอฟต์แวร์', target: 'SME/ทีมที่อยากลดงานซ้ำด้วยเครื่องมือดิจิทัลที่ใช้ง่าย' },
  { kw: ['บริการ', 'service', 'ที่ปรึกษา', 'consult', 'รับทำ', 'ซ่อม', 'สปา', 'คลินิก', 'สุขภาพ', 'อบรม'], label: 'บริการ & ที่ปรึกษา', target: 'ลูกค้าที่ต้องการผลลัพธ์ + ความเชี่ยวชาญที่ไว้ใจได้' },
];
function classify(name: string, hint?: string): { label: string; target: string } {
  const hay = ((hint ?? '') + ' ' + name).toLowerCase();
  for (const c of CATEGORIES) if (c.kw.some(k => hay.includes(k))) return { label: c.label, target: c.target };
  return { label: 'ธุรกิจทั่วไป', target: 'กลุ่มลูกค้าเป้าหมายหลักในพื้นที่/ช่องทางออนไลน์ของคุณ' };
}

const GOALS = [
  (b: string) => `พา ${b} ให้มีลูกค้าจ่ายเงิน 10 รายแรกภายใน 90 วัน`,
  (b: string) => `สร้างระบบให้ ${b} มีรายได้ประจำ + ฐานลูกค้าที่กลับมาซ้ำ`,
  (b: string) => `วางรากฐาน ${b} ให้พร้อมขยายอย่างเป็นระบบใน 6 เดือน`,
];
const ACTIONS = [
  'ยืนยันกลุ่มลูกค้าเป้าหมาย + ปัญหาที่เจ็บที่สุด (market validation)',
  'เปิดหน้าร้าน/สารบัญธุรกิจให้ลูกค้าค้นเจอบน Google',
  'ตั้งราคา + ข้อเสนอแรกที่ลูกค้าปฏิเสธได้ยาก',
  'วางช่องทางหาลูกค้า 1 ช่องที่ทำได้จริงทุกวัน',
  'สร้างคอนเทนต์ให้คุณค่า ดึงคนเข้ามาก่อนขาย',
  'ตั้ง KPI + วัดผลรายสัปดาห์ แล้วปรับให้ไว',
];
const TAGLINES = [
  'คุณภาพที่ไว้ใจได้ ในราคาที่เข้าถึง',
  'แก้ปัญหาให้คุณ ครบ จบ ในที่เดียว',
  'เริ่มง่าย ได้ผลจริง เติบโตไปด้วยกัน',
  'ใส่ใจทุกรายละเอียด เพื่อผลลัพธ์ที่ดีที่สุด',
];

/** สร้างตัวอย่างจากชื่อธุรกิจ — deterministic (ชื่อเดิม = ผลเดิม) */
export function buildInstantPreview(bizNameRaw: string, industryHint?: string): InstantPreview {
  const bizName = (bizNameRaw || '').trim() || 'ธุรกิจของคุณ';
  const s = seed(bizName + '|' + (industryHint ?? ''));
  const cat = classify(bizName, industryHint);

  const team: PreviewAgent[] = [
    { role: 'CEO — กลยุทธ์', emoji: '🧠', mandate: `วางแผนธุรกิจ ${bizName} + จัดลำดับงานที่ให้ผลเร็วที่สุด` },
    { role: 'CMO — การตลาด', emoji: '📣', mandate: `หาลูกค้าให้ ${bizName} ผ่านช่องทางที่ทำได้จริง + สร้างคอนเทนต์` },
    { role: 'CFO — การเงิน', emoji: '💰', mandate: `คุมกระแสเงินสด + ตั้งราคาให้ ${bizName} มีกำไรและไปต่อได้` },
    { role: 'COO — ปฏิบัติการ', emoji: '⚙️', mandate: `วางระบบงานประจำวันของ ${bizName} ให้ลื่นและทำซ้ำได้` },
  ];

  // เลือก 3 action ที่ไม่ซ้ำ (deterministic)
  const idxs: number[] = [];
  let k = s;
  while (idxs.length < 3 && idxs.length < ACTIONS.length) {
    const i = k % ACTIONS.length;
    if (!idxs.includes(i)) idxs.push(i);
    k = (k >> 2) + 1;
  }

  return {
    bizName, category: cat.label, team,
    plan: { goal: pick(GOALS, s)(bizName), target: cat.target, actions: idxs.map(i => ACTIONS[i]) },
    storefront: { name: bizName, tagline: pick(TAGLINES, s >> 2), category: cat.label },
  };
}
