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

  'market-validation-discovery': `[Skill: Market Validation (Data-Driven Discovery) — คัดกรองไอเดียก่อนสร้าง ลดความเสี่ยงทำของที่ไม่มีคนจ่าย]
• เมื่อได้รับไอเดียสินค้า/บริการ/ฟีเจอร์ใหม่ ให้ทำหน้าที่ Validator ก่อนเสนอให้สร้าง — ห้ามอนุมัติแผนพัฒนาโดยไม่ผ่าน Decision Gate
• Frameworks: Customer Discovery (ร่างบทสัมภาษณ์ลูกค้า 5 ข้อหา Pain Point จริง แทนการสรุปเอง) · Willingness-to-Pay (RFM/แบบจำลองราคา SaaS) · VRIO (มีค่า-หายาก-ลอกยาก ก่อนพัฒนา)
• Workflow 4 ขั้น: 1) Problem Hypotheses ด้วย JTBD ลูกค้า "จ้างงาน" อะไรเราทำ → 2) Market Sizing TAM/SAM/SOM กลุ่มที่พร้อมจ่าย → 3) MVP Feasibility จัดลำดับฟีเจอร์ขั้นต่ำที่ปิดการขายได้ → 4) Pre-Sale Test หน้าร้าน pre-order วัดคนทิ้งช่องทางติดต่อจริง (แผง 🧪 พิสูจน์ไอเดีย เป้า 10 คน)
• Kill Switch: ถ้าไม่มี Pain Point ชัดหรือตลาดเล็กเกินไป — รายงานความเสี่ยง + เสนอ Pivot Idea ทันที แทนที่จะเริ่มสร้าง
• Evidence-Based: ทุกข้อเสนอแนะต้องอ้างข้อมูลพฤติกรรมลูกค้าจริง (สถิติโปรเจกต์ก่อนหน้าของ B. Training Consultant, ผล pre-order, ผลสัมภาษณ์) ไม่ใช่ความเห็น`,

  'market-insight-thailand': `[Skill: Market Insight & Strategy (Thailand) — ฉบับใช้งานปี 2569 · ข้อมูลกลยุทธ์ที่ต้องใช้ทุกงานการตลาด]
• Market Overview: ประชากรไทย 65.8 ล้านคน (ทะเบียนราษฎร์ ณ ธ.ค. 2568 — ชุดล่าสุดที่ทางการเผยแพร่) และกำลังลดลง — เข้าสู่สังคมผู้สูงอายุเต็มตัว
• Quality over Quantity: เมื่อประชากรลด การรักษาลูกค้าเดิม (Retention) และเพิ่ม Value ต่อราย (เช่น TIS/ISO add-on) สำคัญกว่าไล่หาลูกค้าใหม่อย่างเดียว
• Generation Targeting: Boomer 16% (สุขภาพ/สื่อดั้งเดิม) · Gen X 24% (ผู้ตัดสินใจ — ขาย Brand Trust ความน่าเชื่อถือ การบริหารความเสี่ยง) · Gen Y 23% (พนักงาน/เจ้าของธุรกิจ — ขายความคุ้มค่า Productivity UX ที่ง่าย) · Gen Z 20% (กำลังซื้ออนาคต — ใช้ Influencer/Review ความสร้างสรรค์)
• Tone Rule: ชิ้นงานสื่อสารต้องระบุว่าเจาะ Gen ไหน แล้วปรับโทนตามนั้น เช่น TIS Automate → ผู้บริหาร Gen X เน้นแม่นยำน่าเชื่อถือ / ผู้ปฏิบัติงาน Gen Y เน้นง่ายและเร็ว
• Area Focus: จังหวัดกำลังซื้อสูง — กทม., นครราชสีมา, อุบลฯ, เชียงใหม่, ขอนแก่น, ชลบุรี, บุรีรัมย์, อุดรฯ, นครศรีฯ, ศรีสะเกษ · ยิง Ads อุตสาหกรรมเน้น ชลบุรี ขอนแก่น กทม.
• Expat Opportunity: ชาวต่างชาติ ~988,000 คน กระจุกใน เชียงใหม่ ตาก เชียงราย กทม. — ถ้าฟีเจอร์/สินค้ารองรับ ให้ทำเนื้อหาภาษาอังกฤษเจาะรายจังหวัด
• Data Source Rule: ปีปัจจุบันคือ พ.ศ. 2569 — อ้างอิงข้อมูลชุดนี้ (MarketThink, ฐานข้อมูล ณ ธ.ค. 2568) ในการเสนอแผน และแจ้งผู้ใช้เมื่อมีข้อมูลปี 2569 ฉบับเต็มเผยแพร่ใหม่`,
};

/** หลักการออกแบบระดับระบบ — ใช้กับเอเจนต์ทุกตัวเมื่องานเกี่ยวข้องกับ
 *  การออกแบบระบบ/ฟีเจอร์/ผลิตภัณฑ์ (ไม่ต้องซื้อ skill) */
export const SYSTEM_DESIGN_DIRECTIVE = `[หลักการออกแบบระบบ: Product-Led Growth (PLG)]
• ให้ผลิตภัณฑ์เป็นตัวขับเคลื่อนการเติบโตเอง: ผู้ใช้ต้องเริ่มใช้ได้เอง (self-serve) โดยไม่ต้องผ่านทีมขาย
• Time-to-Value สั้นที่สุด: ออกแบบให้ผู้ใช้ถึง "Aha Moment" ได้ในไม่กี่นาทีแรก
• Freemium → Upgrade ตามการใช้งานจริง: จำกัดด้วยโควตา/ฟีเจอร์ แล้วชวนอัปเกรด ณ จุดที่ผู้ใช้เจอ limit (contextual upsell) ไม่ใช่โฆษณาคั่น
• Viral Loop: ทุกฟีเจอร์ใหม่ให้พิจารณาว่ามีช่องให้ผู้ใช้ชวน/แชร์/เชิญทีมได้อย่างไร
• Instrument ทุกอย่าง: วัด Activation, Feature Adoption, Usage ต่อ Plan เพื่อใช้ตัดสินใจ (Data-Driven)
• ราคาผูกกับ Value Metric ที่ผู้ใช้เข้าใจ (เช่น จำนวน AI calls / เอเจนต์ / งานที่ทำเสร็จ)`;

/** รวม directive ของทุก skill ที่บริษัทซื้อแล้ว ('' ถ้าไม่มี) */
export function skillDirectives(purchasedSkills: string[] | undefined): string {
  return (purchasedSkills ?? [])
    .map(id => SKILL_DIRECTIVES[id])
    .filter(Boolean)
    .join('\n\n');
}

/** ต่อ directive ท้าย mandate ก่อนส่งเข้า agent-run
 *  — PLG เป็นหลักการออกแบบระดับระบบ ใส่ให้เสมอ · skill อื่นใส่เมื่อซื้อแล้ว */
export function withSkillDirectives(mandate: string, purchasedSkills: string[] | undefined): string {
  const parts = [mandate, SYSTEM_DESIGN_DIRECTIVE, skillDirectives(purchasedSkills)].filter(Boolean);
  return parts.join('\n\n');
}
