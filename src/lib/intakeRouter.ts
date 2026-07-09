import type { Agent } from '../types';

/* ===== CEO Intake Router — รับข้อมูลจาก User → CEO มอบงานให้ตำแหน่งที่เกี่ยวข้อง =====
 * ตรรกะบริสุทธิ์ ทดสอบได้ (rule-based · ทำงานได้ทุกโหมด ไม่กิน AI call)
 * วิเคราะห์ข้อความ (จากไฟล์/พิมพ์) → จับหมวดธุรกิจที่เกี่ยว → เลือกเอเจนต์ที่ตรงตำแหน่ง → สร้างงานมอบหมาย */

export interface IntakeCategory {
  key: string;
  label: string;         // ชื่อด้านธุรกิจ (แสดงผล)
  verb: string;          // สิ่งที่ต้องทำ (ใช้ตั้งชื่องาน)
  textHints: string[];   // คำในเนื้อหา (ไทย+อังกฤษ) ที่บ่งบอกว่าเกี่ยวหมวดนี้
  roleHints: string[];   // คำในตำแหน่ง/mandate ของเอเจนต์ที่ควรรับงานนี้
}

export const INTAKE_CATEGORIES: IntakeCategory[] = [
  { key: 'marketing', label: 'การตลาด/แบรนด์', verb: 'วางแผนและดำเนินการด้านการตลาด',
    textHints: ['ตลาด', 'การตลาด', 'โฆษณา', 'โปรโมชั่น', 'โปรโมชัน', 'แบรนด์', 'คอนเทนต์', 'โซเชียล', 'แคมเปญ', 'ลูกค้าใหม่', 'ยอดขายตก', 'marketing', 'brand', 'ads', 'campaign', 'content', 'seo', 'social'],
    roleHints: ['cmo', 'marketing', 'การตลาด', 'แบรนด์', 'brand', 'content'] },
  { key: 'finance', label: 'การเงิน/บัญชี', verb: 'วิเคราะห์และจัดการด้านการเงิน',
    textHints: ['การเงิน', 'บัญชี', 'งบประมาณ', 'งบ', 'ต้นทุน', 'กำไร', 'ขาดทุน', 'ราคา', 'ภาษี', 'กระแสเงินสด', 'ลงทุน', 'finance', 'budget', 'cost', 'profit', 'tax', 'cashflow', 'pricing', 'invoice'],
    roleHints: ['cfo', 'finance', 'การเงิน', 'บัญชี', 'accounting'] },
  { key: 'sales', label: 'ขาย/ดีล', verb: 'ปิดการขายและดูแลลูกค้า',
    textHints: ['ขาย', 'ดีล', 'ปิดการขาย', 'เสนอราคา', 'ออเดอร์', 'b2b', 'rfq', 'sales', 'deal', 'lead', 'quote', 'order', 'pipeline'],
    roleHints: ['cro', 'sales', 'ขาย', 'บริการลูกค้า'] },
  { key: 'ops', label: 'ปฏิบัติการ/ผลิต', verb: 'ดำเนินการด้านปฏิบัติการ/ผลิต',
    textHints: ['ผลิต', 'โรงงาน', 'ปฏิบัติการ', 'สต็อก', 'คลัง', 'ขนส่ง', 'โลจิสติกส์', 'ซัพพลาย', 'คุณภาพ', 'operation', 'production', 'factory', 'inventory', 'logistics', 'supply', 'quality', 'ops'],
    roleHints: ['coo', 'operation', 'ปฏิบัติการ', 'ผลิต', 'โรงงาน'] },
  { key: 'product', label: 'ผลิตภัณฑ์/เทคโนโลยี', verb: 'พัฒนาผลิตภัณฑ์/ระบบ',
    textHints: ['ผลิตภัณฑ์', 'สินค้า', 'ฟีเจอร์', 'พัฒนา', 'เทคโนโลยี', 'ระบบ', 'แอป', 'เว็บ', 'product', 'feature', 'tech', 'develop', 'app', 'software', 'system'],
    roleHints: ['cto', 'cpo', 'product', 'เทคโนโลยี', 'ผลิตภัณฑ์', 'tech'] },
  { key: 'people', label: 'ทีม/บุคคล (HR)', verb: 'บริหารทีมและบุคลากร',
    textHints: ['พนักงาน', 'จ้างงาน', 'บุคคล', 'สรรหา', 'อบรม', 'recruit', 'hire', 'training', 'บุคลากร'],
    roleHints: ['chro', 'hr', 'บุคคล', 'people'] },
  { key: 'legal', label: 'กฎหมาย/มาตรฐาน', verb: 'ดูแลด้านกฎหมาย/compliance',
    textHints: ['กฎหมาย', 'สัญญา', 'ข้อกำหนด', 'compliance', 'iso', 'pdpa', 'มาตรฐาน', 'ลิขสิทธิ์', 'legal', 'contract', 'regulation', 'license'],
    roleHints: ['legal', 'กฎหมาย', 'compliance', 'clo'] },
  { key: 'data', label: 'ข้อมูล/วิจัย', verb: 'วิเคราะห์ข้อมูลและวิจัย',
    textHints: ['วิเคราะห์', 'วิจัย', 'สถิติ', 'รายงานผล', 'สำรวจ', 'data', 'analysis', 'research', 'insight', 'analytics'],
    roleHints: ['data', 'วิจัย', 'research', 'analyst', 'cdo'] },
];

const norm = (s: string) => (s ?? '').toLowerCase();
const clip = (s: string, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** เอเจนต์ที่เป็น CEO (ผู้มอบหมาย) — fallback เมื่อไม่มีตำแหน่งตรง */
export function findCeo(agents: Agent[]): Agent | null {
  return agents.find(a => /ceo|ประธานเจ้าหน้าที่บริหาร|ประธาน/i.test(a.role)) ?? null;
}

/** หมวดที่เนื้อหาแตะ (มี hit อย่างน้อย 1) เรียงตามจำนวน hit มาก→น้อย */
export function detectAreas(text: string): { category: IntakeCategory; hits: number }[] {
  const hay = norm(text);
  if (!hay.trim()) return [];
  return INTAKE_CATEGORIES
    .map(category => ({ category, hits: category.textHints.filter(h => hay.includes(norm(h))).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

/** เลือกเอเจนต์ที่ตรงหมวดที่สุด (role ก่อน แล้ว mandate) — fallback: CEO → คนแรก */
export function pickAgent(agents: Agent[], category: IntakeCategory): Agent | null {
  if (agents.length === 0) return null;
  const byRole = agents.find(a => category.roleHints.some(h => norm(a.role).includes(norm(h))));
  if (byRole) return byRole;
  const byMandate = agents.find(a => category.roleHints.some(h => norm(a.mandate).includes(norm(h))));
  if (byMandate) return byMandate;
  return findCeo(agents) ?? agents[0];
}

export interface RoutedTask {
  agentId: string;
  agentRole: string;
  areaLabels: string[];  // หมวดที่มอบหมายให้เอเจนต์นี้
  title: string;
  detail: string;
}

/** CEO อ่านข้อมูล → มอบงานให้ตำแหน่งที่เกี่ยวข้อง (dedupe: 1 เอเจนต์ = 1 งาน รวมทุกหมวดที่รับ) */
export function routeIntake(text: string, agents: Agent[], sourceLabel = 'พิมพ์ข้อมูล'): RoutedTask[] {
  const content = clip(text, 1500);
  if (!content || agents.length === 0) return [];

  const areas = detectAreas(content);
  const summary = clip(content, 60);

  // ไม่พบหมวดที่ตรง → ให้ CEO ทบทวนแล้วมอบหมายเอง
  if (areas.length === 0) {
    const ceo = findCeo(agents) ?? agents[0];
    return [{
      agentId: ceo.id, agentRole: ceo.role, areaLabels: ['ทบทวนทั่วไป'],
      title: `ทบทวนข้อมูลจากผู้ใช้: ${summary}`,
      detail: `[รับข้อมูลจากผู้ใช้ · ${sourceLabel}]\n${content}\n\n(CEO: วิเคราะห์แล้วมอบหมายตำแหน่งที่เกี่ยวข้อง)`,
    }];
  }

  // จับคู่หมวด → เอเจนต์ แล้วรวมตาม agentId
  const byAgent = new Map<string, RoutedTask>();
  for (const { category } of areas) {
    const agent = pickAgent(agents, category);
    if (!agent) continue;
    const existing = byAgent.get(agent.id);
    if (existing) {
      if (!existing.areaLabels.includes(category.label)) existing.areaLabels.push(category.label);
    } else {
      byAgent.set(agent.id, {
        agentId: agent.id, agentRole: agent.role, areaLabels: [category.label],
        title: '', detail: '',
      });
    }
  }

  return [...byAgent.values()].map(t => ({
    ...t,
    title: `${t.areaLabels.join(' · ')}: ${summary}`,
    detail: `[รับข้อมูลจากผู้ใช้ · ${sourceLabel} · มอบโดย CEO]\nด้าน: ${t.areaLabels.join(', ')}\n\n${content}`,
  }));
}
