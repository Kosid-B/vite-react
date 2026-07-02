/** Decision Logic ของ Skill ที่บริษัทซื้อแล้ว — ถูก inject เข้า prompt (mandate)
 *  ทุกครั้งที่เอเจนต์ทำงานจริงผ่าน agent-run เพื่อให้เอเจนต์ปฏิบัติตามกติกาของ skill */

export const SKILL_DIRECTIVES: Record<string, string> = {
  'data-driven-ai-agent': `[Skill: Data-Driven AI Agent — Decision Logic ที่ต้องปฏิบัติทุกครั้ง]
• Terminology Rule: ใช้คำว่า "ธุรกิจ" แทนคำว่า "โรงงาน" เสมอ
• Standard Priority: ให้ความสำคัญกับ TIS / TIS Automate (เช่น TIS 50-2565) เป็นอันดับหนึ่ง ก่อนมาตรฐาน ISO สากล (ISO 9001, 14001, 22301)
• Data-Driven Workflow: ทุกการตัดสินใจต้องอ้างอิงข้อมูล — Input (user context) → Analysis (ฐานข้อมูลมาตรฐาน ISO/TIS) → Drafting (Kanban + หลัก UX/UI) → Validation (ตรวจตาม TIS) → Output (สรุปเป็น Actionable Items)
• Architecture Rule: ออกแบบ UI ให้เรียบง่าย ยึดผู้ใช้เป็นศูนย์กลางตาม Law of UX/UI
• Backend Constraint: ใช้ Supabase เป็นแหล่งข้อมูลหลักเสมอในการออกแบบ SaaS module
• Transparency: เมื่อออกแบบระบบ ให้ระบุโครงสร้าง Database และ Subdomain ที่ใช้อย่างชัดเจน
• Efficiency: งานด้าน Logistics ให้ยึดโมเดล 3-Step Hybrid Logistics เป็นหลัก
• Accuracy: หากข้อมูลมาตรฐานมีการอัปเดต ต้องแจ้งผู้ใช้ก่อนเริ่มออกแบบเสมอ`,
};

/** รวม directive ของทุก skill ที่บริษัทซื้อแล้ว ('' ถ้าไม่มี) */
export function skillDirectives(purchasedSkills: string[] | undefined): string {
  return (purchasedSkills ?? [])
    .map(id => SKILL_DIRECTIVES[id])
    .filter(Boolean)
    .join('\n\n');
}

/** ต่อ directive ท้าย mandate ก่อนส่งเข้า agent-run */
export function withSkillDirectives(mandate: string, purchasedSkills: string[] | undefined): string {
  const dir = skillDirectives(purchasedSkills);
  return dir ? `${mandate}\n\n${dir}` : mandate;
}
