// competitorAnalysis.ts — แผนที่คู่แข่ง (ราคา × ความเชี่ยวชาญ) + หาช่องว่างตลาด · CMO นำเสนอ
// pure + deterministic → เทสต์ได้ · AI (agent-run + Serper) เติมคู่แข่งจริง · path นี้ = โครง + fallback

export type PriceTier = 'budget' | 'mid' | 'premium';

export interface Competitor {
  name: string;
  tier: PriceTier;
  target: string;
  strengths: string;
  weaknesses: string;
}

export interface GapFinding {
  gap: string;          // ช่องว่างที่พบ
  why: string;          // ทำไมเป็นโอกาส
  moveHint: string;     // ควรทำอะไร
}

const TIER_LABEL: Record<PriceTier, string> = { budget: 'ประหยัด', mid: 'กลางตลาด', premium: 'พรีเมียม' };
export const tierLabel = (t: PriceTier) => TIER_LABEL[t];

/** อาร์เชไทป์คู่แข่ง 3 ระดับ (rule-based) — ให้เห็นภาพก่อน AI เติมชื่อจริง */
export function competitorArchetypes(industry?: string): Competitor[] {
  const dom = (industry ?? 'ธุรกิจ').replace(/\[[A-Z]\]\s*/, '').slice(0, 24) || 'ธุรกิจ';
  return [
    { name: `รายเล็ก/ท้องถิ่น (${dom})`, tier: 'budget', target: 'ลูกค้าเน้นราคาถูก', strengths: 'ราคาถูก ยืดหยุ่น ใกล้ชิดลูกค้า', weaknesses: 'ไม่มีระบบ/แบรนด์ ขยายยาก คุณภาพไม่คงที่' },
    { name: `เจ้าตลาดกลาง (${dom})`, tier: 'mid', target: 'SME/ลูกค้าทั่วไป', strengths: 'แบรนด์รู้จัก มีระบบพอสมควร', weaknesses: 'ไม่เฉพาะทาง ปรับตัวช้า บริการมาตรฐานกลาง ๆ' },
    { name: `แบรนด์พรีเมียม/ต่างชาติ`, tier: 'premium', target: 'องค์กร/ลูกค้ากำลังซื้อสูง', strengths: 'คุณภาพสูง น่าเชื่อถือ ครบวงจร', weaknesses: 'แพง เข้าถึงยาก ไม่เข้าใจบริบทไทย/รายเล็ก' },
  ];
}

/** หาช่องว่างจากจุดยืนราคา + จุดต่างของเรา (differentiator) */
export function findGap(input: { differentiator?: string; targetTier?: PriceTier }): GapFinding {
  const diff = (input.differentiator ?? '').trim();
  const tier = input.targetTier ?? 'mid';
  return {
    gap: tier === 'premium'
      ? 'คุณภาพระดับพรีเมียมในราคาที่ SME ไทยเข้าถึงได้ (ช่องว่างระหว่างเจ้ากลางกับพรีเมียมต่างชาติ)'
      : tier === 'budget'
        ? 'ราคาประหยัดแต่ "มีระบบ/แบรนด์" (ยกระดับจากรายเล็กท้องถิ่นที่ไม่มีระบบ)'
        : 'กลางตลาดแต่ "เฉพาะทาง + เข้าใจบริบทไทย" (เจ้ากลางไม่เฉพาะทาง พรีเมียมไม่เข้าใจรายเล็ก)',
    why: diff
      ? `จุดต่างของเรา "${diff}" ตรงกับช่องที่คู่แข่งทั้ง 3 ระดับยังไม่เต็มที่`
      : 'คู่แข่งกระจุกที่ปลายสุด (ถูกสุด/แพงสุด) — ช่วงกลางที่ "คุ้ม+เฉพาะทาง" ยังเปิด',
    moveHint: 'โฟกัส segment เดียวให้ชนะก่อน + สื่อจุดต่างให้คมในทุกช่องทาง แล้วค่อยขยาย',
  };
}

/** prompt ให้ CMO (agent-run + Serper) วิเคราะห์คู่แข่งจริง + ช่องว่าง */
export function competitorPrompt(ctx: { industry?: string; value?: string; goal?: string }): string {
  return (
    'คุณคือ CMO วิเคราะห์คู่แข่งของธุรกิจนี้ในตลาดไทย แล้วนำเสนอเป็นภาษาไทย: ' +
    `หมวด: ${ctx.industry ?? '-'} · คุณค่าของเรา: ${ctx.value ?? '-'} · เป้าหมาย: ${ctx.goal ?? '-'}. ` +
    'ให้: (1) ตารางคู่แข่งหลัก 3-5 ราย (ชื่อจริงถ้าค้นได้ · ระดับราคา · กลุ่มเป้าหมาย · จุดแข็ง · จุดอ่อน) ' +
    '(2) แผนที่จุดยืน (ราคา × ความเชี่ยวชาญ) (3) "ช่องว่าง" ที่ยังไม่มีใครทำเต็มที่ + เหตุผล ' +
    '(4) ข้อเสนอ 2-3 ข้อว่าเราควรวางตัวตรงไหนและสื่อสารจุดต่างอย่างไร. อ้างอิงแหล่งถ้าใช้ข้อมูลจริง'
  );
}
