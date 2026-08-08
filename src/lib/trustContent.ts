// trustContent.ts — T.R.U.S.T. Framework ฝังในแอป: ช่วยผู้ใช้ "สร้างคอนเทนต์สายเชื่อใจ" (pure/tested)
// เฟรมเวิร์กของ CEO AI Thailand เอง (ไม่เกี่ยว S.C.A.L.E. ของเจ้าอื่น)
// แกน: ยุค AI content ล้น → ความเชื่อใจคือของหายากที่ขายได้ (การตลาดอย่างมีจริยธรรม)
// ออนไลน์: ai-assist ร่างให้ · ออฟไลน์: scaffold rule-based (คำถาม/prompt ต่อขั้น)

export interface TrustStepDef {
  letter: string;   // T R U S T
  key: string;      // target/resonate/unique/social/track
  name: string;     // ชื่อขั้น
  guide: string;    // ทำอะไรในขั้นนี้
}

export const TRUST_STEPS: TrustStepDef[] = [
  { letter: 'T', key: 'target', name: 'Target', guide: 'เริ่มจากพฤติกรรมจริงของกลุ่มเป้าหมาย ไม่ใช่เดา — เขาค้นหา/บ่น/อยากได้อะไร' },
  { letter: 'R', key: 'resonate', name: 'Resonate', guide: 'เปิดด้วยแง่มุมที่กระตุ้นอารมณ์และความอยากรู้ ให้คนหยุดดูเพราะ “ใช่เลย”' },
  { letter: 'U', key: 'unique', name: 'Unique', guide: 'ชูจุดต่างที่ AI/คู่แข่งพูดแทนไม่ได้ — “ทำไมต้องเรา”' },
  { letter: 'S', key: 'social', name: 'Social proof', guide: 'แทรกรีวิว/เคส/หลักฐานจริง (ห้ามปั้น) เพื่อลดความลังเล' },
  { letter: 'T', key: 'track', name: 'Track', guide: 'ตั้ง KPI 1 ตัว + ทำ 2 เวอร์ชันไว้ทดสอบ A/B แล้วปรับ' },
];

export interface TrustBrief {
  topic: string;      // หัวข้อ/สินค้า/บริการ
  audience: string;   // กลุ่มเป้าหมาย
  goal: string;       // เป้าหมายของคอนเทนต์ (เช่น เก็บ list, ปิดการขาย, สร้าง awareness)
  channel: string;    // ช่องทาง (LINE/Facebook/LinkedIn/…)
}

/** brief พร้อมใช้ไหม — ต้องมีหัวข้ออย่างน้อย */
export function trustBriefReady(brief: TrustBrief): boolean {
  return brief.topic.trim().length > 0;
}

export interface TrustStepScaffold {
  letter: string;
  name: string;
  prompt: string;   // คำถาม/สิ่งที่ต้องเขียนในขั้นนี้ (interpolate จาก brief)
}

const orDash = (s: string, fallback: string) => (s.trim() ? s.trim() : fallback);

/** scaffold rule-based ต่อขั้น (ออฟไลน์/ไม่มี AI ก็ใช้ได้) — คำถามชี้ทางให้เขียนเอง */
export function trustLocalScaffold(brief: TrustBrief): TrustStepScaffold[] {
  const topic = orDash(brief.topic, 'สินค้า/บริการของคุณ');
  const aud = orDash(brief.audience, 'กลุ่มเป้าหมาย');
  const goal = orDash(brief.goal, 'เป้าหมายที่ตั้งไว้');
  const ch = orDash(brief.channel, 'ช่องทางที่เลือก');
  return [
    { letter: 'T', name: 'Target', prompt: `ระบุพฤติกรรมจริงของ "${aud}" ที่เกี่ยวกับ "${topic}" — เขาค้นหาคำว่าอะไร บ่นเรื่องอะไร หรืออยากได้อะไร (อ้างสิ่งที่เขาทำจริง ไม่ใช่เดา)` },
    { letter: 'R', name: 'Resonate', prompt: `เขียนประโยคเปิด (hook) เรื่อง "${topic}" ที่โดนอารมณ์ "${aud}" บน ${ch} — แตะความกลัว/ความหวัง/ความอยากรู้ ใน 1–2 บรรทัดแรก` },
    { letter: 'U', name: 'Unique', prompt: `บอกจุดต่างเรื่อง "${topic}" ที่คู่แข่ง/คอนเทนต์ AI ทั่วไปพูดแทนไม่ได้ — ทำไม "${aud}" ต้องเลือกคุณ` },
    { letter: 'S', name: 'Social proof', prompt: `แทรกหลักฐานจริงเกี่ยวกับ "${topic}" (รีวิว เคส ตัวเลขที่มีจริง) — ⚠️ ห้ามแต่ง/ปั้น ถ้ายังไม่มี ให้เว้นไว้เก็บทีหลัง` },
    { letter: 'T', name: 'Track', prompt: `ตั้ง KPI 1 ตัวที่วัด "${goal}" ได้ (เช่น คลิก/คอมเมนต์/ทัก/ลงทะเบียน) แล้วทำคอนเทนต์นี้ 2 เวอร์ชันไว้ทดสอบ A/B` },
  ];
}

/** instruction ให้ ai-assist ร่างคอนเทนต์ตาม T.R.U.S.T. — ซื่อสัตย์ ไม่แต่งตัวเลข/รีวิว (ตรงนโยบายคอนเทนต์ AI) */
export function buildTrustPrompt(brief: TrustBrief): string {
  const topic = orDash(brief.topic, '(ยังไม่ระบุหัวข้อ)');
  const aud = orDash(brief.audience, 'ผู้ประกอบการ SME ไทย');
  const goal = orDash(brief.goal, 'สร้างความสนใจและความเชื่อใจ');
  const ch = orDash(brief.channel, 'โซเชียลมีเดีย');
  return [
    `ช่วยร่างคอนเทนต์การตลาดภาษาไทยตามเฟรมเวิร์ก T.R.U.S.T. (Target·Resonate·Unique·Social proof·Track)`,
    `หัวข้อ/สินค้า: ${topic}`,
    `กลุ่มเป้าหมาย: ${aud}`,
    `เป้าหมายคอนเทนต์: ${goal}`,
    `ช่องทาง: ${ch}`,
    ``,
    `ให้ผลลัพธ์เป็น 5 ข้อ เรียงตาม T.R.U.S.T. — แต่ละข้อขึ้นต้นด้วยตัวอักษรและชื่อขั้น แล้วตามด้วยเนื้อคอนเทนต์ที่ร่างจริง (ไม่ใช่คำอธิบายทฤษฎี)`,
    `กติกาสำคัญ (จริยธรรม): ห้ามแต่งตัวเลข สถิติ หรือรีวิวที่ไม่มีจริง · ห้ามสร้างความเร่งด่วนปลอม · ถ้าไม่มีข้อมูลจริงในขั้น Social proof ให้เขียนว่า "ใส่รีวิว/เคสจริงของคุณตรงนี้" แทนการปั้น`,
  ].join('\n');
}
