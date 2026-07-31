// welcomeKit.ts — Value-add bundle (Safe Promo ชั้นที่ 3): สมัครแพ็กจ่ายเงิน → ปลด Skills พิเศษอัตโนมัติ
// ต้นทุนส่วนเพิ่ม ≈ 0 (Skill = ชุด directive/เทมเพลต) แต่มูลค่ารับรู้สูง (~฿3,000) → กระตุ้นสมัคร โดยไม่เจ็บมาร์จิน
// id ต้องมีจริงใน src/data/skillCatalog.ts (SKILL_CATALOG)

/** ชุด Skill แถมเมื่อสมัครแพ็ก (Foundation tier — ครอบคลุม การตลาด/ขาย/ความรู้) */
export const WELCOME_KIT_SKILLS = [
  'keyword-research',        // การตลาด — หา keyword ลูกค้าค้นหา
  'customer-win-story',      // ขาย — เขียน case study ปิดการขาย
  'knowledge-base-builder',  // ops — คลังความรู้ ลด support
] as const;

/** รวม Welcome Kit เข้ากับ Skill ที่มีอยู่ (idempotent — เพิ่มเฉพาะที่ยังไม่มี) — pure */
export function grantWelcomeKit(owned: string[] | undefined): { skills: string[]; added: string[] } {
  const cur = owned ?? [];
  const added = WELCOME_KIT_SKILLS.filter((id) => !cur.includes(id));
  return { skills: added.length ? [...cur, ...added] : cur, added };
}
