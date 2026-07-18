/* ===== 3 แรงขับที่ทำให้ลูกค้ายอมจ่าย (pure, ทดสอบได้) =====
 * หัวใจธุรกิจไม่ใช่แค่คุณภาพสินค้า แต่คือการตอบสนองความต้องการเชิงลึก 3 ประการ:
 *   1) ขจัดความทุกข์/ปัญหาที่ค้างคาใจ
 *   2) มอบความสะดวก ลดขั้นตอนยุ่งยาก
 *   3) ขายอารมณ์/ประสบการณ์เหนือระดับ (ทรงพลังที่สุด)
 * เครื่องมือให้ผู้ประกอบการประเมินว่าธุรกิจส่งมอบครบไหม + ชี้จุดที่ต้องเสริม */

export type TriggerKey = 'pain' | 'convenience' | 'emotion';

export interface TriggerDef {
  key: TriggerKey;
  icon: string;
  title: string;
  sub: string;
  prompt: string;      // คำถามกระตุ้นให้ผู้ประกอบการตอบ
  weight: number;      // น้ำหนักความสำคัญ (emotion สูงสุด)
}

export const TRIGGERS: TriggerDef[] = [
  {
    key: 'pain', icon: '🩹', title: 'ขจัดความทุกข์', sub: 'แก้ปัญหา/ความเจ็บปวดที่ค้างคาใจ',
    prompt: 'ธุรกิจคุณลบ "ความทุกข์/ปัญหา" อะไรของลูกค้าออกไป? (สิ่งที่เขาอยากหนีให้พ้น)', weight: 1,
  },
  {
    key: 'convenience', icon: '⚡', title: 'มอบความสะดวก', sub: 'ลดขั้นตอนยุ่งยาก ประหยัดเวลา/แรง',
    prompt: 'คุณทำให้ชีวิต/งานลูกค้า "ง่ายขึ้น" ตรงไหน? (ลดขั้นตอน เวลา ความยุ่งยาก)', weight: 1,
  },
  {
    key: 'emotion', icon: '✨', title: 'ขายอารมณ์/ประสบการณ์', sub: 'ความรู้สึก สถานะ ความภูมิใจ (ทรงพลังสุด)',
    prompt: 'ลูกค้า "รู้สึกอย่างไร" เมื่อใช้? (ภูมิใจ มั่นใจ สบายใจ ดูดี) — จุดนี้สร้างความจงรักภักดี', weight: 1.5,
  },
];

export interface TriggerEntry { note: string; score: number } // score 0–3
export type BuyingTriggersState = Record<TriggerKey, TriggerEntry>;

export const SCORE_LABEL: Record<number, string> = {
  0: 'ยังไม่ได้ทำ', 1: 'อ่อน', 2: 'พอใช้', 3: 'แข็งแรง',
};

export function emptyTriggers(): BuyingTriggersState {
  return {
    pain: { note: '', score: 0 },
    convenience: { note: '', score: 0 },
    emotion: { note: '', score: 0 },
  };
}

/** normalize — เติมค่าเริ่มต้นถ้าไม่มี */
export function getTriggers(state?: Partial<BuyingTriggersState>): BuyingTriggersState {
  const e = emptyTriggers();
  if (!state) return e;
  return {
    pain: { ...e.pain, ...state.pain },
    convenience: { ...e.convenience, ...state.convenience },
    emotion: { ...e.emotion, ...state.emotion },
  };
}

export interface TriggersSummary {
  /** คะแนนรวมถ่วงน้ำหนัก 0–100 */
  pct: number;
  /** แรงขับที่อ่อนสุด (ควรเสริมก่อน) */
  weakest: TriggerKey;
  /** แรงขับที่แข็งสุด (จุดขายหลัก) */
  strongest: TriggerKey;
  /** คำวินิจฉัย/คำแนะนำ */
  diagnosis: string;
}

const clampScore = (n: number) => Math.max(0, Math.min(3, Math.round(n || 0)));
const title = (k: TriggerKey) => TRIGGERS.find(t => t.key === k)!.title;

export function triggersSummary(state?: Partial<BuyingTriggersState>): TriggersSummary {
  const s = getTriggers(state);
  const totalW = TRIGGERS.reduce((a, t) => a + t.weight, 0);
  const gained = TRIGGERS.reduce((a, t) => a + clampScore(s[t.key].score) * t.weight, 0);
  const pct = Math.round((gained / (totalW * 3)) * 100);

  const sorted = [...TRIGGERS].sort((a, b) => clampScore(s[a.key].score) - clampScore(s[b.key].score));
  const weakest = sorted[0].key;
  const strongest = sorted[sorted.length - 1].key;

  let diagnosis: string;
  const emotionScore = clampScore(s.emotion.score);
  if (pct === 0) {
    diagnosis = 'เริ่มประเมินแต่ละด้าน — ธุรกิจที่ลูกค้ายอมจ่าย มักตอบโจทย์อย่างน้อย 1 ใน 3 ข้อนี้ชัดเจน';
  } else if (emotionScore <= 1) {
    diagnosis = `จุดที่ทรงพลังสุด "ขายอารมณ์/ประสบการณ์" ยังอ่อน — ลองเพิ่มมิติความรู้สึก (ภูมิใจ/มั่นใจ/ดูดี) นี่คือสิ่งที่คู่แข่งลอกยากและสร้างลูกค้าประจำ`;
  } else if (pct >= 80) {
    diagnosis = `แข็งแรงมาก! จุดขายหลัก = "${title(strongest)}" — สื่อสารจุดนี้ให้ชัดในทุกช่องทางการตลาด`;
  } else {
    diagnosis = `ควรเสริม "${title(weakest)}" ก่อน (อ่อนสุด) แล้วดันจุดแข็ง "${title(strongest)}" เป็นสารหลักในการขาย`;
  }
  return { pct, weakest, strongest, diagnosis };
}
