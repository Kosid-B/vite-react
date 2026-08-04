/* planFallback — แผนเบื้องต้นแบบ rule-based (ไม่พึ่ง AI/เน็ต) ให้ CEO "วางแผน" ได้เสมอ
 * ใช้เมื่อ Edge Function ai-plan ล่ม/ช้า/timeout หรือโหมด local ที่ไม่มี Supabase
 * คืนรูปแบบเดียวกับ response ของ ai-plan → หน้า AICompany map ต่อได้ด้วยโค้ดเดิม (pure, tested) */

export interface PlanTaskLite { agentRole: string; title: string; detail: string; status: string; }
export interface PlanApprovalLite { agentRole: string; title: string; detail: string; impact: string; }
export interface LocalPlan { tasks: PlanTaskLite[]; approvals: PlanApprovalLite[]; }

interface AgentLite { role: string; mandate?: string }

/* งานตั้งต้นต่อบทบาท — จับคู่จากคีย์เวิร์ดในชื่อตำแหน่ง (รองรับทั้งไทย/อังกฤษ) */
const ROLE_TASKS: { match: string[]; tasks: { title: string; detail: string }[] }[] = [
  { match: ['ceo', 'ผู้บริหารสูงสุด', 'กรรมการผู้จัดการ'], tasks: [
    { title: 'จัดลำดับความสำคัญ 90 วันแรก', detail: 'ทบทวนเป้าหมายบริษัท แล้วเลือก 3 สิ่งที่ต้องทำก่อน พร้อมตัวชี้วัดที่วัดผลได้' },
  ] },
  { match: ['cmo', 'marketing', 'การตลาด', 'แบรนด์', 'brand'], tasks: [
    { title: 'ร่างแผนการตลาด 30 วันแรก', detail: 'กำหนดข้อความหลัก (value proposition) + คอนเทนต์ 4 ชิ้นแรก' },
    { title: 'เลือก 3 ช่องทางหาลูกค้าที่คุ้มที่สุด', detail: 'ประเมินช่องทาง (SEO/โซเชียล/พาร์ตเนอร์) แล้วโฟกัสที่ ROI สูงสุด' },
  ] },
  { match: ['cfo', 'finance', 'การเงิน', 'บัญชี'], tasks: [
    { title: 'ทำประมาณการรายรับ-รายจ่าย 3 เดือน', detail: 'ระบุต้นทุนคงที่/ผันแปร และคาดการณ์กระแสเงินสด' },
    { title: 'คำนวณจุดคุ้มทุน & ตั้งราคาขาย', detail: 'หายอดขายขั้นต่ำต่อเดือนเพื่อไม่ขาดทุน แล้วตั้งราคาที่มีกำไร' },
  ] },
  { match: ['cto', 'tech', 'เทค', 'ไอที', 'it', 'ระบบ', 'วิศวกร'], tasks: [
    { title: 'เลือกเครื่องมือ/ระบบหลักที่ต้องใช้', detail: 'ระบุเครื่องมือจำเป็น (เว็บ/ร้านออนไลน์/ชำระเงิน) ให้ประหยัดและต่อยอดได้' },
    { title: 'วางระบบเก็บข้อมูลลูกค้าเบื้องต้น', detail: 'ตั้งวิธีเก็บรายชื่อ/ติดต่อลูกค้า เพื่อทำการตลาดซ้ำได้' },
  ] },
  { match: ['coo', 'operation', 'ปฏิบัติการ', 'ผลิต', 'ops'], tasks: [
    { title: 'ร่าง SOP งานหลัก 3 ขั้นตอน', detail: 'เขียนขั้นตอนการทำงานหลักให้ทีมทำตามได้เหมือนกันทุกครั้ง' },
  ] },
  { match: ['sale', 'ขาย', 'business development', 'bd'], tasks: [
    { title: 'ทำรายชื่อลูกค้าเป้าหมาย 20 ราย', detail: 'รวบรวมลูกค้าที่น่าจะซื้อ + ร่างสคริปต์เปิดการขายสั้น ๆ' },
  ] },
  { match: ['hr', 'บุคคล', 'ทรัพยากรบุคคล', 'people'], tasks: [
    { title: 'ระบุทักษะที่ทีมยังขาด', detail: 'ทำรายการตำแหน่ง/ทักษะที่ต้องเสริมใน 90 วันข้างหน้า' },
  ] },
];

const DEFAULT_TASKS = [{ title: 'ระบุ 3 งานสำคัญของตำแหน่งนี้ในสัปดาห์แรก', detail: 'กำหนดงานที่ส่งผลต่อเป้าหมายบริษัทมากที่สุด พร้อมกำหนดวันเสร็จ' }];

function tasksForRole(role: string): { title: string; detail: string }[] {
  const r = role.toLowerCase();
  const hit = ROLE_TASKS.find(rt => rt.match.some(m => r.includes(m)));
  return hit ? hit.tasks : DEFAULT_TASKS;
}

/** สร้างแผนเบื้องต้นจากเป้าหมาย/ประเภทธุรกิจ/ทีม — มอบ 1–2 งานต่อคน + 1 เรื่องขออนุมัติงบ */
export function localPlan(input: { goal?: string; industry?: string; agents: AgentLite[] }): LocalPlan {
  const goal = (input.goal ?? '').trim();
  const industry = (input.industry ?? '').trim();
  const ctx = [industry && `บริบทธุรกิจ: ${industry}`, goal && `เพื่อเป้าหมาย: ${goal}`].filter(Boolean).join(' · ');

  const tasks: PlanTaskLite[] = [];
  for (const a of input.agents) {
    if (tasks.length >= 8) break; // กันงานล้น
    for (const t of tasksForRole(a.role)) {
      tasks.push({ agentRole: a.role, title: t.title, detail: ctx ? `${t.detail} (${ctx})` : t.detail, status: 'queued' });
    }
  }

  // 1 เรื่องขออนุมัติ — งบเริ่มต้น (มอบให้ CFO ถ้ามี ไม่งั้น CEO)
  const budgetRole = input.agents.find(a => /cfo|การเงิน|finance/i.test(a.role))?.role
    ?? input.agents.find(a => /ceo/i.test(a.role))?.role
    ?? input.agents[0]?.role ?? 'CEO';
  const approvals: PlanApprovalLite[] = [{
    agentRole: budgetRole,
    title: 'ขออนุมัติงบเริ่มต้น 30 วันแรก',
    detail: 'ตั้งงบก้อนแรกสำหรับการตลาด/เครื่องมือ เพื่อเริ่มทดสอบตลาดจริง',
    impact: 'ปลดล็อกการลงมือจริงใน 30 วันแรก',
  }];

  return { tasks, approvals };
}
