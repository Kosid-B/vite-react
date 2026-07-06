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
  de24Owners?: (string | null)[]; // agentId ของ C-level เจ้าของแต่ละ Phase (CEO มอบหมาย)
}

/* ===== SIPOC — Process Management =====
 * เก็บใน AppData (workspace_state.data) เช่นเดียวกับข้อมูลธุรกิจอื่น
 * → sync Supabase อัตโนมัติ ไม่ต้องมีตารางแยก */
export interface SipocProcess {
  id: string;
  name: string;        // ชื่อกระบวนการ (ระบุจุดเริ่มต้น–จุดสิ้นสุด)
  goal: string;        // ขอบเขต/ผลลัพธ์ที่คาดหวังของกระบวนการ
  suppliers: string[]; // S — ผู้ส่งมอบปัจจัยนำเข้า
  inputs: string[];    // I — ปัจจัยนำเข้า (ทรัพยากร/ข้อมูล/วัตถุดิบ)
  process: string[];   // P — ขั้นตอนหลักเรียงลำดับ
  outputs: string[];   // O — ผลลัพธ์ (ผลิตภัณฑ์/บริการ)
  customers: string[]; // C — ผู้รับผลลัพธ์ (ภายใน/ภายนอก)
  ownerId?: string;    // agentId ผู้รับผิดชอบกระบวนการ (M-level)
  dataStore?: string[]; // การจัดเก็บข้อมูลของกระบวนการ — ออกแบบโดย M-level agent
  updatedAt: string;
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
  jd?: string;             // Job Description ที่ AI สร้าง
  knowledgeBase?: string;  // คลังความรู้ของแผนก
}

/* ===== Product Roadmap ===== */
export type RoadmapQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type RoadmapStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';
export type RoadmapPriority = 'must' | 'should' | 'nice';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  quarter: RoadmapQuarter;
  year: number;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  owner: string;
  aiOutput?: string;
}

// Kanban: ต้องทำ → กำลังทำ → ตรวจสอบ → เสร็จ (หรือ ถูกบล็อก)
export type TaskStatus = 'queued' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  detail: string;
  status: TaskStatus;
  output?: string;           // ผลลัพธ์จาก AI Agent (หลังดำเนินงานจริง)
  executedAt?: string;       // เวลาที่ AI Agent ดำเนินงานสำเร็จ
  requiresApproval?: boolean; // ต้องได้รับการอนุมัติจากมนุษย์ก่อน heartbeat จะรัน
  useWebSearch?: boolean;    // เปิดใช้ Serper.dev (Google Search) เพื่อดึงข้อมูล real-time
  searchQuery?: string;      // custom search query (ถ้าไม่ระบุ ใช้ title + industry)
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

export interface SkillPlanItem {
  agentId: string;
  role: string;
  skills: string[];    // skill IDs จาก SKILL_CATALOG หรือ customSkills
  process: string;     // กระบวนการหลักที่รับผิดชอบ
  kpi: string;         // KPI ที่วัดได้
}

export type CompetencyLevel = 0 | 1 | 2 | 3 | 4;
// 0=ไม่มี 1=Novice 2=Developing 3=Proficient 4=Expert

export interface CompetencySkill {
  skillId: string;
  level: CompetencyLevel;    // ระดับที่ต้องการ
  criteria: string;          // HRD กำหนดวิธีประเมิน
  assessMethod: string;      // Practical test / Portfolio / Interview / Observation
}

export interface RoleCompetency {
  agentId: string;
  role: string;
  competencies: CompetencySkill[];
}

export interface CustomSkill {
  id: string;
  name: string;
  desc: string;
  category: string;
  tier: 1 | 2 | 3;
  price: number;
  status: 'pending_hrd' | 'active' | 'rejected';
  hrdProcess?: string;   // HRD ออกแบบกระบวนการมาตรฐาน
  addedAt: string;
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
  purchasedSkills: string[];  // skill IDs ที่บริษัทซื้อแล้ว
  skillXP: number;            // XP สะสมจากการซื้อ Skill
  mission: string;            // Mission Statement ที่ CEO เสนอและบอร์ดอนุมัติ
  missionApproved: boolean;
  skillPlan: SkillPlanItem[]; // HRD กำหนด Skills + Process ต่อตำแหน่ง
  customSkills: CustomSkill[]; // Skills ที่ User เพิ่มเองผ่านกระบวนการ HRD
  competencyMap: RoleCompetency[]; // HRD กำหนด Competency Level ต่อตำแหน่ง
  toolOwners?: Record<string, string>; // toolId → agentId — C-level ที่ CEO มอบหมายให้ดูแลเครื่องมือแต่ละตัว
  productDesc?: string; // บอร์ดอธิบายผลิตภัณฑ์/บริการของบริษัท (ใช้ให้ CEO ร่าง BMC)
  productDbd?: string;  // หมวดผลิตภัณฑ์/บริการตาม DBD (TSIC) — ใช้จัดกลุ่มใน Marketplace และงานการตลาด
  bmcDraft?: { bmc: BMCData; note: string; proposedAt: string }; // ร่าง BMC จาก CEO รอบอร์ดอนุมัติ
}

/* ===== Billing / PromptPay ===== */

export type PlanId = 'free' | 'starter' | 'growth' | 'scale';
export type SubStatus = 'none' | 'trial' | 'pending_payment' | 'active' | 'past_due' | 'cancelled';

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
  trialEndDate: string | null;     // ISO วันสิ้นสุดการทดลองใช้ 15 วัน
  invoices: Invoice[];        // ประวัติใบแจ้งหนี้
  billingCycle?: 'monthly' | 'yearly'; // รอบบิล — รายปีจ่าย ~10 เดือน (ลด churn)
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

/* ===== Win Story Library ===== */
export type WinCategory = 'revenue' | 'retention' | 'growth' | 'transformation' | 'efficiency';

export interface WinMetric {
  label: string;
  before: string;
  after: string;
  change: string;
}

export interface WinStory {
  id: string;
  date: string;
  customerName: string;
  category: WinCategory;
  headlineMetric: string;
  situation: string;
  challenge: string;
  actions: string[];
  turningPoint: string;
  metrics: WinMetric[];
  timeline: string;
  quote: string;
  lessons: string[];
  whyItMatters: string;
  documentedBy: string;
}

/* ===== Feedback Analysis ===== */
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';
export type FeedbackSource = 'survey' | 'review' | 'support' | 'social' | 'email';

export interface FeedbackEntry {
  id: string;
  date: string;
  source: FeedbackSource;
  sentiment: FeedbackSentiment;
  theme: string;
  content: string;
  rating?: number;
}

export interface FeedbackTheme {
  id: string;
  name: string;
  impact: number;
  effort: number;
}

export interface FeedbackAnalysis {
  period: string;
  themes: FeedbackTheme[];
  entries: FeedbackEntry[];
}

/* ===== Marketing Strategy ===== */
export type MarketingChannelType = 'seo' | 'sem' | 'social' | 'email' | 'referral' | 'content' | 'event' | 'partner';

export interface MarketingChannel {
  id: string;
  name: string;
  type: MarketingChannelType;
  budget: number;
  leadsPerMonth: number;
  cpl: number;
  convRate: number;
  active: boolean;
  notes: string;
}

export type MarketingCampaignStatus = 'planned' | 'active' | 'done' | 'paused';

export interface MarketingCampaign {
  id: string;
  name: string;
  channelId: string;
  budget: number;
  startDate: string;
  endDate: string;
  goal: string;
  kpiTarget: string;
  status: MarketingCampaignStatus;
  result: string;
}

export interface MarketingGoal {
  id: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
}

export interface MarketingStrategy {
  monthlyBudget: number;
  targetLeads: number;
  targetCAC: number;
  channels: MarketingChannel[];
  campaigns: MarketingCampaign[];
  goals: MarketingGoal[];
}

/* ===== ISO 9001:2015 QMS ===== */
export type ISOStatus = 'green' | 'amber' | 'red' | 'na';

export interface ISOClauseCheck {
  id: string;        // e.g. "4.1"
  title: string;
  status: ISOStatus;
  evidence: string;  // หลักฐาน/เอกสารที่อ้างอิง
  notes: string;
}

export interface Nonconformity {
  id: string;
  date: string;
  clause: string;    // เช่น "8.7"
  description: string;
  severity: 'major' | 'minor' | 'observation';
  rootCause: string;
  status: 'open' | 'in_progress' | 'closed';
  closedDate?: string;
}

export interface ISODocument {
  id: string;
  docNo: string;
  title: string;
  clause: string;
  revision: string;
  effectiveDate: string;
  owner: string;
}

export interface InternalAudit {
  id: string;
  plannedDate: string;
  scope: string;       // ขอบเขตของการตรวจ
  auditor: string;
  status: 'planned' | 'completed' | 'overdue';
  findings: string;    // สรุปผลการตรวจ
}

export interface ISO9001Data {
  enabled: boolean;
  tier: 'basic' | 'certified'; // basic=กำลังเตรียม, certified=ได้รับรองแล้ว
  certBody: string;     // หน่วยงานรับรอง เช่น "SGS", "Bureau Veritas"
  certExpiry: string;   // วันหมดอายุใบรับรอง ISO
  scope: string;        // ขอบเขตระบบ QMS
  clauses: ISOClauseCheck[];
  nonconformities: Nonconformity[];
  documents: ISODocument[];
  audits: InternalAudit[];
  nextAuditDate: string;
  qualityPolicy: string;
  qualityObjectives: string[];
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
  roadmap: RoadmapItem[];
  winStories: WinStory[];
  marketing: MarketingStrategy;
  feedback: FeedbackAnalysis;
  gtmAuditChecks?: boolean[];
  iso9001?: ISO9001Data;
  factory?: FactoryData;
  sipoc?: SipocProcess[];
  visitedMarket?: boolean; // เข้าหน้าตลาด/หน้าร้านแล้ว — ใช้ติ๊ก Quest "เข้าตลาดธุรกิจ"
  finance?: FinanceEntry[]; // รายรับ-รายจ่ายที่กรอกเอง — ขับเศรษฐกิจเมืองบริษัท (SIM)
  // ===== รางวัลจากเกมเมืองบริษัท (SIM) =====
  claimedRewards?: string[];              // id รางวัลที่รับแล้ว
  coupon?: { pct: number; reason: string }; // ส่วนลดค่าแพ็กเกจล่าสุด (เก็บ % สูงสุด)
  featuredVoucherDays?: number;           // สิทธิ์ดันร้านขึ้น "แนะนำ" สะสม (วัน)
  cityUnlocks?: string[];                 // ของปลดล็อกในเกม (cosmetic)
  streak?: { count: number; lastDay: string }; // ส่วนต่อเนื่องรายวัน (ทำงานจริงในแอป)
  proMode?: boolean;                      // โหมดโปร — ซ่อนองค์ประกอบเกมบน Dashboard
  // CMO วิเคราะห์ตลาด+กลุ่มลูกค้า (Segmentation) รายสัปดาห์ทุกวันศุกร์ (ดึงข้อมูลตลาดจริง)
  cmoMarket?: { analysis: string; webUsed: boolean; updatedAt: string; weekTag: string };
  // C-Level ทุกตำแหน่งวิเคราะห์ + รายงานผลต่อ CEO ทุกวันศุกร์
  cLevelReports?: { weekTag: string; items: { agentId: string; role: string; name: string; color?: string; analysis: string; at: string }[] };
  // CMO หาข้อมูลตลาดไทย (ประชากร/Gen/พื้นที่) → กลยุทธ์เสนอ CEO พิจารณาเสนอบอร์ด
  cmoInsight?: { analysis: string; webUsed: boolean; updatedAt: string; weekTag: string };
  // CMO ตั้งทีมขาย (Sales) → แผนดำเนินงานทีมขายจาก pipeline จริง
  cmoSales?: { plan: string; webUsed: boolean; updatedAt: string };
  // CMO สร้าง Personal Brand ของบริษัท (persona/voice/pillars/ช่องทาง) — ปรับด้วย agent
  cmoBrand?: { kit: string; webUsed: boolean; updatedAt: string };
  // CMO พิสูจน์ไอเดียก่อนลงทุนสร้าง (VRIO/JTBD/TAM-SAM-SOM/Kill-Pivot) → GO/PIVOT/KILL
  cmoValidation?: { idea: string; report: string; verdict: 'go' | 'pivot' | 'kill' | ''; webUsed: boolean; updatedAt: string };
  // Pulse & A/B — วัด "อะไรทำให้อยากใช้งานต่อ" แบบโปร่งใส (opt-in, ไม่ระบุตัวตน) — ดู lib/experiments.ts
  experiments?: import('./lib/experiments').ExperimentsState;
}

/* ===== การเงินธุรกิจ (ขับเมืองบริษัท) ===== */
export interface FinanceEntry {
  id: string;
  label: string;
  amount: number;                 // บาท (จำนวนบวก)
  kind: 'revenue' | 'expense';
  date: string;                   // yyyy-mm-dd
  recurring?: boolean;            // รายการรายเดือนซ้ำ
}

export type PageId = 'dashboard' | 'journey' | 'funnel' | 'roi' | 'personas' | 'content' | 'actions' | 'aisearch' | 'bmc' | 'aicompany' | 'billing' | 'vrio' | 'market' | 'team' | 'admin' | 'roadmap' | 'marketing' | 'iso9001' | 'cases' | 'analytics' | 'factory' | 'sipoc' | 'storefront' | 'trade' | 'city' | 'citytrade' | 'citylevelup' | 'pulse';

/* ===== Factory / โรงงานอัจฉริยะ ===== */
export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown';
export type WorkOrderStatus = 'planned' | 'in_progress' | 'done' | 'on_hold';

export interface FactoryMachine {
  id: string;
  name: string;
  line: string;
  status: MachineStatus;
  oee: number;
  plannedTime: number;    // minutes/shift
  downtime: number;       // minutes actual downtime
  idealCycleTime: number; // minutes per unit (ideal)
  lastMaintenance: string | null;
  nextMaintenance: string | null;
}

export interface WorkOrder {
  id: string;
  product: string;
  targetQty: number;
  actualQty: number;
  defectQty: number;
  status: WorkOrderStatus;
  dueDate: string;
  machineId: string;
  shift: 1 | 2 | 3;
  note: string;
}

export interface MudaEntry {
  type: string;
  typeEn: string;
  description: string;
  fix: string;
  level: 'low' | 'medium' | 'high';
  note: string;
}

export interface FiveSCheck {
  id: string;
  s: 1 | 2 | 3 | 4 | 5;
  text: string;
  checked: boolean;
}

export interface KaizenItem {
  id: string;
  title: string;
  proposer: string;
  type: 'quality' | 'cost' | 'safety' | 'delivery' | 'morale';
  status: 'idea' | 'doing' | 'done';
  result: string;
}

export type TPMPillarStatus = 'not_started' | 'planning' | 'implementing' | 'sustaining';

export interface TPMPillar {
  id: string;
  pillar: number;
  name: string;
  nameEn: string;
  description: string;
  score: number;
  status: TPMPillarStatus;
  notes: string;
}

export interface InventoryLot {
  id: string;
  lotNo: string;          // เลขล็อต / Batch No.
  receivedDate: string;   // วันรับเข้าคลัง (ISO date)
  mfgDate: string;        // วันผลิต (ISO date)
  expDate: string | null; // วันหมดอายุ (ISO date) — null = ไม่มีวันหมดอายุ
  qty: number;            // จำนวนในล็อตนี้
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;            // รหัสสินค้า / วัตถุดิบ
  category: 'raw' | 'wip' | 'finished' | 'spare';
  unit: string;
  minQty: number;         // Safety Stock ขั้นต่ำ
  maxQty: number;         // Max Stock
  location: string;
  supplier: string;       // ซัพพลายเออร์
  costPerUnit: number;    // ราคาต่อหน่วย (บาท)
  lots: InventoryLot[];   // ล็อตสินค้า — เรียงตาม FEFO
}

export interface FactoryData {
  name: string;
  type: string;
  location: string;
  capacityPerDay: number;
  shifts: number;
  machines: FactoryMachine[];
  workOrders: WorkOrder[];
  kpi: { targetOEE: number; targetDefectRate: number; targetOnTimeDelivery: number; };
  mudaLog: MudaEntry[];
  fiveS: FiveSCheck[];
  kaizen: KaizenItem[];
  taktDemand: number;
  tpm: TPMPillar[];
  inventory: InventoryItem[];
}
