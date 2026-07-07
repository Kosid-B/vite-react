// ค่าคงที่ + helper ล้วน ของหน้า บริษัท AI — แยกออกจาก AICompany.tsx เพื่อลดขนาดไฟล์/ดูแลง่าย
import type { AppData, AgentStatus, TaskStatus } from '../../types';

export const STATUS_LABEL: Record<AgentStatus, string> = {
  working: 'กำลังทำงาน',
  idle: 'ว่าง',
  waiting: 'รออนุมัติ',
};

export const TASK_COLS: { key: TaskStatus; hd: string; color: string }[] = [
  { key: 'queued', hd: 'ต้องทำ', color: '#8a8278' },
  { key: 'in_progress', hd: 'กำลังทำ', color: '#1a4f8a' },
  { key: 'review', hd: 'ตรวจสอบ', color: '#a05c1a' },
  { key: 'done', hd: 'เสร็จแล้ว', color: '#2d6a4f' },
  { key: 'blocked', hd: 'ถูกบล็อก', color: '#c44b2b' },
];

export const AGENT_PALETTE = ['#c44b2b', '#1a4f8a', '#2d6a4f', '#a05c1a', '#6b3fa0', '#0e7490'];
export const AVATARS = ['🤖', '🧠', '📈', '🛠️', '🎯', '🔬', '💡', '🗂️'];
export const MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'OpenAI Codex', 'gpt-4o'];

export const AVAILABLE_SKILLS = [
  'business-building-24-step','value-proposition-canvas','risk-assessment','revenue-model','kpi-dashboard',
  'product-roadmap','saas-onboarding-flow','customer-persona','customer-segmentation','customer-journey-map',
  'customer-win-story','conversion-funnel-analysis','pricing-strategy','pricing-analysis','pricing-calculator',
  'keyword-research','marketplace-seo','sentiment-analysis','salesforce-developer','automation-workflow',
  'data-driven-ai-agent','market-insight-thailand','market-validation-discovery',
  'ab-test-plan','analytics-setup-guide','attribution-model','benchmarking-report','cohort-analysis',
  'data-collection-plan','data-dashboard-design','feedback-analysis','metric-definition-guide',
  'saas-metrics-dashboard','customer-lifetime-value','marketplace-metrics','impact-report','grant-report',
  'social-impact-measurement','survey-analysis','knowledge-base-builder','job-posting',
  // HR & Team bundle
  'team-onboarding','performance-review','training-plan','talent-acquisition','compensation-design',
  // ISO Compliance
  'iso-9001-compliance-autopilot',
];

// ยิ่งรอบสั้น ทำงานเร็วแต่ใช้ token ถี่ (งบบานปลาย) · ยิ่งรอบยาว ประหยัดงบ
export const HEARTBEAT_OPTS = [
  { sec: 60, label: 'ทุก 1 นาที' },
  { sec: 300, label: 'ทุก 5 นาที' },
  { sec: 600, label: 'ทุก 10 นาที · แนะนำตอนเริ่ม' },
  { sec: 1800, label: 'ทุก 30 นาที' },
  { sec: 3600, label: 'ทุก 1 ชั่วโมง · ประหยัดงบ' },
  { sec: 86400, label: 'วันละครั้ง · ประหยัดสุด' },
];

export function fmtHeartbeat(sec: number): string {
  if (sec < 60) return sec + ' วินาที';
  if (sec < 3600) return sec / 60 + ' นาที';
  if (sec < 86400) return sec / 3600 + ' ชั่วโมง';
  return sec / 86400 + ' วัน';
}

// เทมเพลตข้อความสำหรับ "ฟีดงานสด" จำลองการทำงาน 24 ชม.
export const FEED_TEMPLATES: ((role: string, name: string, goal: string) => string)[] = [
  (r, n) => `${r} ${n} กำลังวิเคราะห์ข้อมูลตลาดและคู่แข่ง`,
  (r, n) => `${r} ${n} ร่างแผนงานสัปดาห์ถัดไปเสร็จแล้ว`,
  (r, n) => `${r} ${n} มอบหมายงานย่อย 3 รายการให้ทีม`,
  (r, n) => `${r} ${n} เรียกใช้ Web Search เพื่อหาข้อมูลลูกค้าใหม่`,
  (r, n) => `${r} ${n} เขียนร่างคอนเทนต์โฆษณา 3 เวอร์ชัน`,
  (r, n) => `${r} ${n} ส่งอีเมลติดตามลูกค้า 18 ราย`,
  (r, n, g) => `${r} ${n} ตรวจความคืบหน้าเทียบเป้าหมาย: "${g.slice(0, 28)}…"`,
  (r, n) => `${r} ${n} ขออนุมัติงบจากบอร์ดสำหรับแคมเปญใหม่`,
  (r, n) => `${r} ${n} อัปเดตรายงานผลลัพธ์ลง Google Sheets`,
];

// เครื่องมือ (sub-menu ของ บริษัท AI) + ตำแหน่ง C-level ที่เหมาะจะดูแลแต่ละตัว
export const TOOL_SPECS: { id: string; label: string; icon: string; owner: string; desc: string }[] = [
  { id: 'journey', label: 'Journey Map', icon: '🗺️', owner: 'CMO',
    desc: 'แผนที่เส้นทางลูกค้า 8 ขั้น — touchpoints, ความรู้สึก, pain points และโอกาสในแต่ละ stage' },
  { id: 'funnel', label: 'Conversion Funnel', icon: '⏬', owner: 'CMO',
    desc: 'วิเคราะห์อัตราแปลงลูกค้าแต่ละขั้น หาจุดที่ lead หลุดมากที่สุดเพื่อแก้ให้ตรงจุด' },
  { id: 'roi', label: 'ROI Calculator', icon: '💹', owner: 'CFO',
    desc: 'คำนวณผลตอบแทนการลงทุน เทียบต้นทุน–รายได้ เพื่อตัดสินใจใช้งบอย่างคุ้มค่า' },
  { id: 'personas', label: 'Personas', icon: '👥', owner: 'CMO',
    desc: 'โปรไฟล์ลูกค้าในอุดมคติ — พฤติกรรม แรงจูงใจ ปัญหา และช่องทางที่เข้าถึงได้' },
  { id: 'content', label: 'Content Plan', icon: '📝', owner: 'CMO',
    desc: 'แผนคอนเทนต์รายเดือนต่อช่องทาง (Blog/SEO, Social, Email) พร้อมหัวข้อและ keyword' },
  { id: 'actions', label: 'Priority Actions', icon: '✅', owner: 'COO',
    desc: 'รายการงานสำคัญเรียงตามความเร่งด่วน (P1–P3) พร้อมติดตามสถานะจนเสร็จ' },
  { id: 'bmc', label: 'Business Model · MIT24', icon: '🧩', owner: 'CSO',
    desc: 'กรอบสร้างธุรกิจ 24 ขั้นตอนของ MIT — ตั้งแต่ Beachhead Market จนถึง MVBP' },
  { id: 'roadmap', label: 'Product Roadmap', icon: '🛣️', owner: 'CPO',
    desc: 'แผนพัฒนาผลิตภัณฑ์รายไตรมาส จัดลำดับฟีเจอร์ must / should / nice-to-have' },
  { id: 'marketing', label: 'กลยุทธ์การตลาด', icon: '📣', owner: 'CMO',
    desc: 'วางแผนช่องทางการตลาด งบประมาณ, CPL และอัตราแปลงต่อช่องทาง' },
  { id: 'vrio', label: 'VRIO Analysis', icon: '🏆', owner: 'CSO',
    desc: 'วิเคราะห์ความได้เปรียบเชิงแข่งขัน — Value, Rarity, Imitability, Organization' },
  { id: 'sipoc', label: 'SIPOC Process', icon: '🔄', owner: 'COO',
    desc: 'แผนผังกระบวนการ Supplier → Input → Process → Output → Customer หา Gap และคอขวด' },
];

// เครื่องมือ → ฟิลด์ข้อมูลใน AppData (ใช้ตอน "ลบข้อมูลเครื่องมือ" = รีเซ็ตเป็นค่าเริ่มต้น)
export const TOOL_DATA_KEY: Record<string, keyof AppData> = {
  journey: 'stages', funnel: 'funnel', roi: 'roi', personas: 'personas',
  content: 'contentPlan', actions: 'actions', bmc: 'businessModel',
  roadmap: 'roadmap', marketing: 'marketing', vrio: 'vrio', sipoc: 'sipoc',
};

// สเปกตำแหน่ง C-level ที่ CEO สร้างอัตโนมัติเมื่อยังไม่มีในผังองค์กร
export const C_LEVEL_SPECS: Record<string, { avatar: string; color: string; name: string; mandate: string }> = {
  CMO: { avatar: '📣', color: '#c44b2b', name: 'มณี', mandate: 'บริหารการตลาดและลูกค้า — ดูแล Journey Map, Conversion Funnel, Personas, Content Plan และกลยุทธ์การตลาด' },
  CFO: { avatar: '💰', color: '#2d6a4f', name: 'บุญมี', mandate: 'บริหารการเงินและการลงทุน — ดูแล ROI Calculator วิเคราะห์ความคุ้มค่าและงบประมาณ' },
  COO: { avatar: '⚙️', color: '#a05c1a', name: 'สมชาย', mandate: 'บริหารปฏิบัติการ — ดูแล Priority Actions ติดตามงานสำคัญให้เสร็จตามแผน' },
  CSO: { avatar: '🧭', color: '#6b3fa0', name: 'วิชัย', mandate: 'บริหารกลยุทธ์องค์กร — ดูแล Business Model (MIT24) และ VRIO Analysis' },
  CPO: { avatar: '🛠️', color: '#0e7490', name: 'ดารา', mandate: 'บริหารผลิตภัณฑ์ — ดูแล Product Roadmap จัดลำดับฟีเจอร์และแผนการพัฒนา' },
};

// ชื่อไทยที่ CEO ใช้เสนอเป็นชื่อเรียกเอเจนต์แต่ละตำแหน่ง (บอร์ดเลือก/อนุมัติ)
export const NAME_POOLS: Record<string, string[]> = {
  CEO: ['ปัญญา', 'ภูมิพัฒน์', 'ธนากร', 'อาทิตย์'],
  CTO: ['ธารา', 'ปกรณ์', 'ศิวกร', 'เมธา'],
  CMO: ['มณี', 'แพรวา', 'พิมพ์มาดา', 'ชุติมา'],
  CFO: ['บุญมี', 'ธนัชพร', 'กันตพงศ์', 'รัตนา'],
  COO: ['สมชาย', 'วรากร', 'ชลธิชา', 'ประเสริฐ'],
  CSO: ['วิชัย', 'ปริญญา', 'ณัฐวุฒิ', 'สุขุม'],
  CPO: ['ดารา', 'ภาสกร', 'ชนิกานต์', 'นวัต'],
  HRD: ['อารีย์', 'สุภาพร', 'พัชราภา', 'เมตตา'],
};
export const GENERIC_NAMES = ['จันทรา', 'นภา', 'คีรี', 'วารี', 'อรุณ', 'เสาวลักษณ์', 'พฤกษ์', 'ไผท'];

// M-level ที่ C-level แต่ละสายขอเพิ่มได้ — mandate คือบทบาทที่ C-level กำหนด
// (ใช้เป็นข้อมูลสร้าง AI Agent ตำแหน่งนั้นเมื่อบอร์ดอนุมัติ · แก้ไขได้ก่อนส่ง)
export const M_LEVEL_SUGGESTIONS: Record<string, { role: string; mandate: string }[]> = {
  CEO: [
    { role: 'General Manager', mandate: 'บริหารงานทั่วไปตามนโยบาย CEO ประสานงานทุกฝ่าย ติดตามผลการดำเนินงานและรายงานรายสัปดาห์' },
  ],
  CMO: [
    { role: 'Marketing Manager', mandate: 'วางแผนและรันแคมเปญการตลาดรายเดือน ดูแล Content Plan, SEO และ Social Media ให้สอดคล้องกลยุทธ์ CMO พร้อมรายงาน CPL/Conversion ทุกสัปดาห์' },
    { role: 'Sales Manager', mandate: 'บริหาร Pipeline การขายตั้งแต่ Lead ถึงปิดการขาย ดูแล Conversion Funnel ทำ Sales Forecast รายเดือนเสนอ CMO' },
    { role: 'Content Manager', mandate: 'ผลิตและดูแลคอนเทนต์ทุกช่องทางตาม Content Plan ควบคุมคุณภาพ แบรนด์ และตารางเผยแพร่' },
  ],
  CFO: [
    { role: 'Finance Manager', mandate: 'จัดทำงบประมาณ กระแสเงินสด และรายงานการเงินรายเดือน วิเคราะห์ต้นทุน/ROI สนับสนุนการตัดสินใจของ CFO' },
    { role: 'Accounting Manager', mandate: 'ดูแลบัญชีรายรับ-รายจ่าย ใบกำกับภาษี และ Compliance ทางบัญชีให้ถูกต้องครบถ้วน' },
  ],
  COO: [
    { role: 'Operations Manager', mandate: 'ควบคุมกระบวนการปฏิบัติงานประจำวัน ติดตาม Priority Actions และ SLA ประสานทีมให้ส่งมอบตรงเวลา' },
    { role: 'Project Manager', mandate: 'วางแผนและติดตามโปรเจกต์ ควบคุม Scope/Timeline/Resource รายงานความคืบหน้าต่อ COO' },
  ],
  CTO: [
    { role: 'Engineering Manager', mandate: 'บริหารทีมพัฒนา ดูแลคุณภาพระบบ การเชื่อมต่อ API และแผนงานเทคนิคตามทิศทาง CTO' },
    { role: 'Data Manager', mandate: 'ดูแลข้อมูล ระบบวิเคราะห์ และ Dashboard ให้ทีมใช้ตัดสินใจได้ พร้อมควบคุม Data Governance' },
  ],
  CSO: [
    { role: 'Strategy Manager', mandate: 'วิเคราะห์ตลาด/คู่แข่ง อัปเดต VRIO และ Business Model สนับสนุนการวางกลยุทธ์ของ CSO' },
  ],
  CPO: [
    { role: 'Product Manager', mandate: 'ดูแล Product Roadmap เก็บ Feedback ผู้ใช้ จัดลำดับฟีเจอร์ และประสานทีมพัฒนาให้ส่งมอบตามแผน' },
  ],
};
export const M_LEVEL_GENERIC: { role: string; mandate: string }[] = [
  { role: 'Manager', mandate: 'บริหารงานในสายงานตามที่ผู้บังคับบัญชากำหนด ติดตามงานทีมและรายงานผลรายสัปดาห์' },
];
export const M_CUSTOM = '__custom__';

// C-level = role รูปแบบ CxO (CEO, CMO, CFO, COO, CTO, CSO, CPO ฯลฯ)
export function isCLevel(role: string): boolean {
  return /\bC[A-Z]O\b/i.test(role.trim());
}
export function mSuggestionsFor(role: string): { role: string; mandate: string }[] {
  const key = Object.keys(M_LEVEL_SUGGESTIONS).find(k => role.toUpperCase().includes(k));
  return key ? M_LEVEL_SUGGESTIONS[key] : M_LEVEL_GENERIC;
}

// วิธีชำระเงินตอนซื้อ Skill (payment gateway จริงเปิดใช้เมื่อ WEBHOOK_SECRET พร้อม)
export const PAY_METHODS = [
  { id: 'promptpay', label: 'PromptPay QR', icon: '📱' },
  { id: 'card', label: 'บัตรเครดิต/เดบิต', icon: '💳' },
  { id: 'transfer', label: 'โอนธนาคาร', icon: '🏦' },
];

export function nowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
