// landingLayoutExperiment.ts — A/B ทดสอบ "ลำดับบล็อกบน landing" (anonymous ก่อนสมัคร)
// Dark AI Marketing #9 (ความเร็วในการทดลอง) + #15 (Conversion > Traffic) + #24 (จริยธรรม)
//
// คำถามที่อยากรู้: คนเข้าใจ+กล้าสมัครมากกว่า เมื่อเรา "อธิบายระบบก่อน" (TrustBar → วิธีใช้ 30 วิ →
// สิ่งที่ได้) หรือ "โชว์ดีมานด์/ROI ของจริงก่อน" แล้วค่อยอธิบาย? — ตอบ pain "ไม่เข้าใจระบบ → ไม่กล้าสมัคร"
//
// ทั้งสอง variant แสดง "เนื้อหาชุดเดียวกันครบถ้วน" ต่างแค่ลำดับ — ไม่ซ่อนข้อมูล ไม่มี scarcity ปลอม
// assign แบบ deterministic ต่อ browser (คนเดิมเห็นลำดับเดิมเสมอ ไม่เก็บ PII) · วัดผลจริงที่ GA4
// ⚠️ ต้องมี traffic ระดับหลักร้อย/วัน ผลถึงมีนัยสำคัญ — traffic น้อย = "เริ่มเก็บข้อมูลไว้"

export type LayoutAb = 'explain_first' | 'proof_first';

export const LAYOUT_AB_LABEL: Record<LayoutAb, string> = {
  explain_first: 'A · อธิบายระบบก่อน (TrustBar → วิธีใช้ 30 วิ → สิ่งที่ได้ → ดีมานด์/ROI)',
  proof_first: 'B · โชว์ดีมานด์/ROI ของจริงก่อน → แล้วค่อยอธิบายระบบ',
};

/** hash เสถียร (djb2) — เดียวกับ heroExperiment.ts/experiments.ts เพื่อความคงที่ต่อ browser */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** แบ่งกลุ่มจาก id ที่ผูกกับ browser (deterministic) — namespace ':layout_ab' แยกจาก hero_ab
 *  (คน ๆ เดียวจึงถูกสุ่มเข้าแต่ละการทดลองอย่างอิสระ ไม่พันกัน) */
export function layoutAbVariant(abId: string): LayoutAb {
  return hashStr((abId || 'anon') + ':layout_ab') % 2 === 0 ? 'explain_first' : 'proof_first';
}

/** อ่าน/สร้าง id นิรนามผูก browser (ใช้ตัวเดียวกับ hero A/B — 1 คน = 1 id คงที่)
 *  ปลอดภัยเมื่อ localStorage ถูกบล็อก → คืน 'anon' (ทุกคนกลุ่มเดียว ไม่พัง) */
export function getBrowserAbId(): string {
  try {
    let id = localStorage.getItem('ceo_ai_ab');
    if (!id) { id = 'ab-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ceo_ai_ab', id); }
    return id;
  } catch { return 'anon'; }
}
