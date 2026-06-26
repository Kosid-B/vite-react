export interface Stage {
  id: string;
  label: string;
  title: string;
  emotion: string;
  touch: string[];
  action: string[];
  pain: string[];
  opp: string[];
}

export interface Persona {
  name: string;
  role: string;
  initials: string;
  bg: string;
  tc: string;
  quote: string;
  goal: string[];
  fear: string[];
  search: string[];
  action: string[];
}

export interface ContentCol {
  hd: string;
  color: string;
  items: string[];
}

export interface ContentMonth {
  label: string;
  goal: string;
  cols: ContentCol[];
}

export interface ActionTag {
  label: string;
  className: string;
}

export interface Action {
  done: boolean;
  title: string;
  desc: string;
  priority: number;
  nb: string;
  nt: string;
  tags: ActionTag[];
}

export interface FunnelStage {
  stageId: string;
  leads: number;
  note: string;
}

export interface ROIStageCost {
  stageId: string;
  hours: number;
}

export interface ROIInput {
  avgDealValue: number;
  teamHourlyRate: number;
  monthlyRevenueTarget: number;
  stageCosts: ROIStageCost[];
}

export interface BMCData {
  partners: string[];
  activities: string[];
  value: string[];
  relationships: string[];
  segments: string[];
  resources: string[];
  channels: string[];
  costs: string[];
  revenue: string[];
}

export interface BusinessModelData {
  bmc: BMCData;
  de24: Array<{ done: boolean; notes: string }>;
}

/* ===== Autonomous AI Company (Paperclip-style) ===== */

export type AgentStatus = 'working' | 'idle' | 'waiting';

export interface Agent {
  id: string;
  role: string;        // เช่น CEO, CTO, CMO
  name: string;        // ชื่อเล่นของเอเจนต์
  avatar: string;      // emoji
  color: string;       // accent color
  mandate: string;     // หน้าที่/ขอบเขตงาน
  model: string;       // โมเดลสมอง (LLM) ที่ใช้
  status: AgentStatus;
  reportsTo: string | null; // id ของหัวหน้า (null = ขึ้นตรงต่อบอร์ด)
}

// Kanban: ต้องทำ → กำลังทำ → ตรวจสอบ → เสร็จ (หรือ ถูกบล็อก)
export type TaskStatus = 'queued' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  detail: string;
  status: TaskStatus;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  agentId: string;
  title: string;
  detail: string;
  impact: string;      // ผลกระทบ เช่น "งบ ฿15,000"
  status: ApprovalStatus;
}

export interface Integration {
  id: string;
  name: string;
  desc: string;
  icon: string;
  connected: boolean;
  apiKey: string;
}

export interface AICompany {
  name: string;
  goal: string;          // เป้าหมายหลัก (Mission) ที่บอร์ดตั้งไว้
  industry: string;
  running: boolean;      // ระบบอัตโนมัติกำลังทำงานอยู่หรือไม่
  heartbeatSec: number;  // รอบการตื่นของเอเจนต์ (วินาที) — เช่น 600 = ทุก 10 นาที
  autoHire: boolean;     // true = CEO จ้างเอเจนต์เองได้, false = ต้องให้บอร์ดอนุมัติ
  agents: Agent[];
  tasks: AgentTask[];
  approvals: Approval[];
  integrations: Integration[];
}

/* ===== Billing / PromptPay ===== */

export type PlanId = 'free' | 'growth' | 'scale';
export type SubStatus = 'none' | 'pending_payment' | 'active' | 'past_due' | 'cancelled';

export type InvoiceStatus = 'paid' | 'pending' | 'failed';

export interface Invoice {
  id: string;
  date: string;        // ISO วันที่ออกใบแจ้งหนี้
  plan: PlanId;
  amount: number;      // บาท (รวม VAT)
  status: InvoiceStatus;
}

export interface Subscription {
  plan: PlanId;
  status: SubStatus;
  promptpayId: string;        // เบอร์พร้อมเพย์ / เลขผู้เสียภาษีของร้านค้า
  autoRenew: boolean;         // ต่ออายุอัตโนมัติทุกรอบบิล
  currentPeriodEnd: string | null; // ISO วันครบรอบบิลถัดไป
  invoices: Invoice[];        // ประวัติใบแจ้งหนี้
}

/* ===== VRIO Analysis ===== */

export interface VrioItem {
  id: string;
  resource: string;   // ทรัพยากร/ความสามารถ
  note: string;       // บริบท/เหตุผล
  v: boolean;         // Valuable — สร้างคุณค่า/ลดต้นทุนได้
  r: boolean;         // Rare — หายาก คู่แข่งน้อยรายมี
  i: boolean;         // Inimitable — ลอกเลียน/ทดแทนได้ยาก
  o: boolean;         // Organized — องค์กรพร้อมเก็บเกี่ยวคุณค่า
}

/* ===== Marketplace (จับคู่คู่ค้า + ค่าดำเนินการ 3%) ===== */

export interface MarketPartner {
  id: string;
  name: string;
  category: string;    // หมวดบริการ
  desc: string;
  rating: number;      // 0–5
  priceFrom: number;   // ราคาเริ่มต้น (บาท)
  location: string;    // จังหวัด
  verified: boolean;
}

export type DealStatus = 'matched' | 'negotiating' | 'closed' | 'cancelled';

export interface Deal {
  id: string;
  partnerId: string;
  title: string;
  amount: number;      // มูลค่าดีล (บาท)
  status: DealStatus;
}

export interface Marketplace {
  feePct: number;      // ค่าดำเนินการแพลตฟอร์ม (%)
  partners: MarketPartner[];
  deals: Deal[];
}

export interface AppData {
  stages: Stage[];
  personas: Persona[];
  contentPlan: ContentMonth[];
  actions: Action[];
  funnel: FunnelStage[];
  roi: ROIInput;
  businessModel: BusinessModelData;
  aiCompany: AICompany;
  subscription: Subscription;
  vrio: VrioItem[];
  marketplace: Marketplace;
}

export type PageId = 'dashboard' | 'journey' | 'funnel' | 'roi' | 'personas' | 'content' | 'actions' | 'aisearch' | 'bmc' | 'aicompany' | 'billing' | 'vrio' | 'market' | 'team';
