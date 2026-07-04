import { useEffect, useRef, useState } from 'react';
import { trackAiCall } from '../lib/usage';
import type { AppData, Agent, AgentStatus, ApprovalStatus, TaskStatus, SkillPlanItem, CustomSkill, RoleCompetency } from '../types';
import { autoH } from '../utils';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { SKILL_CATALOG, CATEGORY_META, TIER_META, type SkillCategory, type SkillEntry } from '../data/skillCatalog';
import { listAdminSkills } from '../lib/adminSkills';
import { recommendSkills } from '../lib/skillAdvisor';
import SkillAuction from '../components/SkillAuction';
import SkillAdvisor from '../components/SkillAdvisor';
import Integrations from '../components/Integrations';
import type { Auction } from '../lib/auctions';
import { trackSkillPurchase } from '../lib/skillStats';
import { withSkillDirectives } from '../lib/skillDirectives';
import { COMPANY_LEVELS, XP_PER_TIER, getCompanyLevel } from '../lib/gamification';
import DBDSelect from '../components/DBDSelect';
import { reviewTasks, nextStepTasks, reportByPosition, boardReportText } from '../lib/boardReport';

// ---- Org Chart Node (recursive) ----
interface OcNodeProps {
  agent: Agent;
  agents: Agent[];
  onAdd: (parentId: string) => void;
  onFire: (id: string) => void;
  onSaveField: (id: string, field: keyof Agent, value: string) => void;
  onGenJD: (id: string) => void;
  generatingJD: string | null;
}
function OcNode({ agent, agents, onAdd, onFire, onSaveField, onGenJD, generatingJD }: OcNodeProps) {
  const children = agents.filter(a => a.reportsTo === agent.id);
  const isGenJD = generatingJD === agent.id;
  return (
    <div className="oc-subtree">
      <div className="oc-node" style={{ borderTopColor: agent.color }}>
        <div className="oc-node-av" style={{ background: agent.color + '22' }}>{agent.avatar}</div>
        <div className="oc-node-info">
          <input className="oc-role-inp"
            defaultValue={agent.role} key={'ocr' + agent.id + agent.role}
            onBlur={e => onSaveField(agent.id, 'role', e.target.value)} spellCheck={false} />
          <input className="oc-name-inp"
            defaultValue={agent.name} key={'ocn' + agent.id + agent.name}
            onBlur={e => onSaveField(agent.id, 'name', e.target.value)} spellCheck={false} />
        </div>
        <div className="oc-node-actions">
          <button className="oc-jd-btn" onClick={() => onGenJD(agent.id)} disabled={isGenJD} title="สร้าง Job Description">
            {isGenJD ? '⏳' : '📄'}
          </button>
          <button className="oc-add-btn" onClick={() => onAdd(agent.id)} title="เพิ่มตำแหน่งใต้บังคับบัญชา">＋</button>
          <button className="oc-del-btn" onClick={() => onFire(agent.id)} title="ลบตำแหน่ง">×</button>
        </div>
        {agent.jd && (
          <details className="oc-jd-detail">
            <summary className="oc-jd-summary">📄 Job Description</summary>
            <pre className="oc-jd-body">{agent.jd}</pre>
          </details>
        )}
      </div>
      {children.length > 0 && (
        <div className="oc-children">
          {children.map(child => (
            <OcNode key={child.id} agent={child} agents={agents}
              onAdd={onAdd} onFire={onFire} onSaveField={onSaveField}
              onGenJD={onGenJD} generatingJD={generatingJD} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  wsId?: string | null; // workspace ปัจจุบัน — ใช้ประกอบสถิติการซื้อ Skill
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  working: 'กำลังทำงาน',
  idle: 'ว่าง',
  waiting: 'รออนุมัติ',
};

const TASK_COLS: { key: TaskStatus; hd: string; color: string }[] = [
  { key: 'queued', hd: 'ต้องทำ', color: '#8a8278' },
  { key: 'in_progress', hd: 'กำลังทำ', color: '#1a4f8a' },
  { key: 'review', hd: 'ตรวจสอบ', color: '#a05c1a' },
  { key: 'done', hd: 'เสร็จแล้ว', color: '#2d6a4f' },
  { key: 'blocked', hd: 'ถูกบล็อก', color: '#c44b2b' },
];

const AGENT_PALETTE = ['#c44b2b', '#1a4f8a', '#2d6a4f', '#a05c1a', '#6b3fa0', '#0e7490'];
const AVATARS = ['🤖', '🧠', '📈', '🛠️', '🎯', '🔬', '💡', '🗂️'];
const MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'OpenAI Codex', 'gpt-4o'];


const AVAILABLE_SKILLS = [
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
const HEARTBEAT_OPTS = [
  { sec: 60, label: 'ทุก 1 นาที' },
  { sec: 300, label: 'ทุก 5 นาที' },
  { sec: 600, label: 'ทุก 10 นาที · แนะนำตอนเริ่ม' },
  { sec: 1800, label: 'ทุก 30 นาที' },
  { sec: 3600, label: 'ทุก 1 ชั่วโมง · ประหยัดงบ' },
  { sec: 86400, label: 'วันละครั้ง · ประหยัดสุด' },
];

function fmtHeartbeat(sec: number): string {
  if (sec < 60) return sec + ' วินาที';
  if (sec < 3600) return sec / 60 + ' นาที';
  if (sec < 86400) return sec / 3600 + ' ชั่วโมง';
  return sec / 86400 + ' วัน';
}

// เทมเพลตข้อความสำหรับ "ฟีดงานสด" จำลองการทำงาน 24 ชม.
const FEED_TEMPLATES: ((role: string, name: string, goal: string) => string)[] = [
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
const TOOL_SPECS: { id: string; label: string; icon: string; owner: string; desc: string }[] = [
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

// สเปกตำแหน่ง C-level ที่ CEO สร้างอัตโนมัติเมื่อยังไม่มีในผังองค์กร
const C_LEVEL_SPECS: Record<string, { avatar: string; color: string; name: string; mandate: string }> = {
  CMO: { avatar: '📣', color: '#c44b2b', name: 'มณี', mandate: 'บริหารการตลาดและลูกค้า — ดูแล Journey Map, Conversion Funnel, Personas, Content Plan และกลยุทธ์การตลาด' },
  CFO: { avatar: '💰', color: '#2d6a4f', name: 'บุญมี', mandate: 'บริหารการเงินและการลงทุน — ดูแล ROI Calculator วิเคราะห์ความคุ้มค่าและงบประมาณ' },
  COO: { avatar: '⚙️', color: '#a05c1a', name: 'สมชาย', mandate: 'บริหารปฏิบัติการ — ดูแล Priority Actions ติดตามงานสำคัญให้เสร็จตามแผน' },
  CSO: { avatar: '🧭', color: '#6b3fa0', name: 'วิชัย', mandate: 'บริหารกลยุทธ์องค์กร — ดูแล Business Model (MIT24) และ VRIO Analysis' },
  CPO: { avatar: '🛠️', color: '#0e7490', name: 'ดารา', mandate: 'บริหารผลิตภัณฑ์ — ดูแล Product Roadmap จัดลำดับฟีเจอร์และแผนการพัฒนา' },
};

// ชื่อไทยที่ CEO ใช้เสนอเป็นชื่อเรียกเอเจนต์แต่ละตำแหน่ง (บอร์ดเลือก/อนุมัติ)
const NAME_POOLS: Record<string, string[]> = {
  CEO: ['ปัญญา', 'ภูมิพัฒน์', 'ธนากร', 'อาทิตย์'],
  CTO: ['ธารา', 'ปกรณ์', 'ศิวกร', 'เมธา'],
  CMO: ['มณี', 'แพรวา', 'พิมพ์มาดา', 'ชุติมา'],
  CFO: ['บุญมี', 'ธนัชพร', 'กันตพงศ์', 'รัตนา'],
  COO: ['สมชาย', 'วรากร', 'ชลธิชา', 'ประเสริฐ'],
  CSO: ['วิชัย', 'ปริญญา', 'ณัฐวุฒิ', 'สุขุม'],
  CPO: ['ดารา', 'ภาสกร', 'ชนิกานต์', 'นวัต'],
  HRD: ['อารีย์', 'สุภาพร', 'พัชราภา', 'เมตตา'],
};
const GENERIC_NAMES = ['จันทรา', 'นภา', 'คีรี', 'วารี', 'อรุณ', 'เสาวลักษณ์', 'พฤกษ์', 'ไผท'];

// M-level ที่ C-level แต่ละสายขอเพิ่มได้ — mandate คือบทบาทที่ C-level กำหนด
// (ใช้เป็นข้อมูลสร้าง AI Agent ตำแหน่งนั้นเมื่อบอร์ดอนุมัติ · แก้ไขได้ก่อนส่ง)
const M_LEVEL_SUGGESTIONS: Record<string, { role: string; mandate: string }[]> = {
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
const M_LEVEL_GENERIC: { role: string; mandate: string }[] = [
  { role: 'Manager', mandate: 'บริหารงานในสายงานตามที่ผู้บังคับบัญชากำหนด ติดตามงานทีมและรายงานผลรายสัปดาห์' },
];
const M_CUSTOM = '__custom__';

// C-level = role รูปแบบ CxO (CEO, CMO, CFO, COO, CTO, CSO, CPO ฯลฯ)
function isCLevel(role: string): boolean {
  return /\bC[A-Z]O\b/i.test(role.trim());
}
function mSuggestionsFor(role: string): { role: string; mandate: string }[] {
  const key = Object.keys(M_LEVEL_SUGGESTIONS).find(k => role.toUpperCase().includes(k));
  return key ? M_LEVEL_SUGGESTIONS[key] : M_LEVEL_GENERIC;
}

// วิธีชำระเงินตอนซื้อ Skill (payment gateway จริงเปิดใช้เมื่อ WEBHOOK_SECRET พร้อม)
const PAY_METHODS = [
  { id: 'promptpay', label: 'PromptPay QR', icon: '📱' },
  { id: 'card', label: 'บัตรเครดิต/เดบิต', icon: '💳' },
  { id: 'transfer', label: 'โอนธนาคาร', icon: '🏦' },
];

function nowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AICompany({ data, onUpdate, wsId }: Props) {
  const c = data.aiCompany;
  const canWebSearch = data.subscription?.plan === 'growth' || data.subscription?.plan === 'scale';
  const [feed, setFeed] = useState<{ id: number; time: string; text: string; color: string }[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  const [planning, setPlanning] = useState(false);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());
  const [generatingJD, setGeneratingJD] = useState<string | null>(null);
  const [kbEditId, setKbEditId] = useState<string | null>(null);
  const [suggestingRoles, setSuggestingRoles] = useState(false);
  const [ceoSuggestions, setCeoSuggestions] = useState<Array<{ role: string; mandate: string; reportsToRole: string; reason: string }>>([]);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);
  const [definingMandates, setDefiningMandates] = useState(false);
  const [mandateProposals, setMandateProposals] = useState<Array<{ role: string; mandate: string; skills?: string[]; kpi?: string }>>([]);
  const [mandateMsg, setMandateMsg] = useState<string | null>(null);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [mktCategory, setMktCategory] = useState<SkillCategory | 'all'>('all');
  const [mktTier, setMktTier] = useState<0 | 1 | 2 | 3>(0);
  const [buyConfirm, setBuyConfirm] = useState<SkillEntry | null>(null);
  const [mktMsg, setMktMsg] = useState<string | null>(null);
  const [proposingMission, setProposingMission] = useState(false);
  const [missionMsg, setMissionMsg] = useState<string | null>(null);
  const [boardReportMsg, setBoardReportMsg] = useState<string | null>(null);
  const [hrdPlanningSkills, setHrdPlanningSkills] = useState(false);
  const [skillPlanMsg, setSkillPlanMsg] = useState<string | null>(null);
  const [addCustomSkillOpen, setAddCustomSkillOpen] = useState(false);
  const [customSkillDraft, setCustomSkillDraft] = useState({ name: '', desc: '', category: 'hr', tier: 1 as 1|2|3 });
  const [competencyMsg, setCompetencyMsg] = useState<string | null>(null);
  const [designingCompetency, setDesigningCompetency] = useState(false);
  const [errorLog, setErrorLog] = useState<{ time: string; msg: string; taskTitle: string }[]>([]);
  const [adminSkillList, setAdminSkillList] = useState<SkillEntry[]>([]);
  const [nameProposals, setNameProposals] = useState<Array<{ agentId: string; role: string; avatar: string; color: string; current: string; options: string[] }>>([]);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  // C-level ขอเพิ่ม M-level (form เปิดบนการ์ดเอเจนต์ทีละใบ)
  const [mReq, setMReq] = useState<{ agentId: string; role: string; mandate: string; custom: boolean } | null>(null);

  // โหลด skill ที่ Admin ระบบเพิ่มเข้า Marketplace (แสดงให้ทุกบริษัท)
  useEffect(() => {
    listAdminSkills()
      .then(list => setAdminSkillList(list.map(s => ({
        id: s.id, name: s.name, category: s.category, tier: s.tier,
        price: s.price, desc: s.desc, icon: s.icon, tags: s.tags,
      }))))
      .catch(() => { /* ตารางยังไม่พร้อม/offline — แสดงเฉพาะ catalog ในตัว */ });
  }, []);

  // Refs for heartbeat to avoid stale closures
  const executeTaskRef = useRef<((taskId: string) => Promise<void>) | null>(null);
  const cRef = useRef(c);
  const runningIdsRef = useRef(runningTaskIds);
  useEffect(() => { cRef.current = c; });
  useEffect(() => { runningIdsRef.current = runningTaskIds; }, [runningTaskIds]);

  // เครื่องยนต์จำลอง: ขณะ running จะสร้างกิจกรรมใหม่เรื่อย ๆ (ephemeral ไม่บันทึกลง storage)
  useEffect(() => {
    if (!c.running) return;
    const tick = () => {
      const ag = c.agents[Math.floor(Math.random() * c.agents.length)];
      if (!ag) return;
      const tpl = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
      counter.current += 1;
      setFeed(prev => [
        { id: counter.current, time: nowTime(), text: tpl(ag.role, ag.name, c.goal), color: ag.color },
        ...prev,
      ].slice(0, 40));
    };
    tick();
    const iv = setInterval(tick, 2600);
    return () => clearInterval(iv);
  }, [c.running, c.agents, c.goal]);

  // Heartbeat: รันงาน queued จริงด้วย Claude API เมื่อ running=true และ Supabase เปิดใช้งาน
  useEffect(() => {
    if (!c.running || !isSupabaseEnabled || !supabase) return;
    const run = async () => {
      if (runningIdsRef.current.size > 0) return;
      // ข้ามงานที่ต้องอนุมัติจากมนุษย์ก่อน
      const first = cRef.current.tasks.find(t => t.status === 'queued' && !t.requiresApproval);
      if (!first) return;
      const agent = cRef.current.agents.find(a => a.id === first.agentId);
      counter.current += 1;
      setFeed(prev => [{
        id: counter.current,
        time: nowTime(),
        text: `⚡ Heartbeat: ${agent?.name ?? 'Agent'} เริ่มดำเนินงาน "${first.title}"`,
        color: agent?.color ?? '#1a4f8a',
      }, ...prev].slice(0, 40));
      try {
        await executeTaskRef.current?.(first.id);
      } catch (e) {
        const errMsg = (e as Error).message ?? 'Unknown error';
        setErrorLog(prev => [{ time: nowTime(), msg: errMsg, taskTitle: first.title }, ...prev].slice(0, 20));
        counter.current += 1;
        setFeed(prev => [{
          id: counter.current,
          time: nowTime(),
          text: `🔴 Error: "${first.title}" — ${errMsg}`,
          color: '#c44b2b',
        }, ...prev].slice(0, 40));
      }
    };
    const ms = Math.max((c.heartbeatSec ?? 30) * 1000, 15000);
    run();
    const iv = setInterval(run, ms);
    return () => clearInterval(iv);
  }, [c.running, c.heartbeatSec]);

  function patch(next: Partial<typeof c>) {
    onUpdate({ ...data, aiCompany: { ...c, ...next } });
  }

  function toggleRun() {
    if (!c.running) setFeed([]);
    patch({ running: !c.running });
  }

  // เรียก Edge Function ai-plan ให้ CEO วางแผนด้วย Claude จริง
  async function runAiPlan() {
    if (!supabase) return;
    setPlanning(true); setPlanMsg(null);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('ai-plan', {
        body: { goal: c.goal, industry: c.industry, agents: c.agents.map(a => ({ role: a.role, mandate: a.mandate })) },
      });
      if (error) throw error;
      const roleToId = (role: string) =>
        c.agents.find(a => a.role.toLowerCase() === String(role ?? '').toLowerCase())?.id ?? c.agents[0]?.id ?? '';
      const ok: TaskStatus[] = ['queued', 'in_progress', 'review', 'done', 'blocked'];
      const newTasks = (res?.tasks ?? []).map((t: { agentRole?: string; title?: string; detail?: string; status?: string }, i: number) => ({
        id: 'ai-' + Date.now().toString(36) + i,
        agentId: roleToId(t.agentRole ?? ''),
        title: String(t.title ?? 'งานจาก AI'),
        detail: String(t.detail ?? ''),
        status: (ok.includes(t.status as TaskStatus) ? t.status : 'queued') as TaskStatus,
      }));
      const newApprovals = (res?.approvals ?? []).map((a: { agentRole?: string; title?: string; detail?: string; impact?: string }, i: number) => ({
        id: 'aiap-' + Date.now().toString(36) + i,
        agentId: roleToId(a.agentRole ?? ''),
        title: String(a.title ?? 'ขออนุมัติ'),
        detail: String(a.detail ?? ''),
        impact: String(a.impact ?? ''),
        status: 'pending' as ApprovalStatus,
      }));
      patch({ tasks: [...newTasks, ...c.tasks], approvals: [...newApprovals, ...c.approvals] });
      setPlanMsg(`✓ CEO วางแผนเพิ่ม ${newTasks.length} งาน${newApprovals.length ? ` · ${newApprovals.length} เรื่องรออนุมัติ` : ''}`);
    } catch (e) {
      setPlanMsg('✕ วางแผนไม่สำเร็จ: ' + ((e as Error).message || 'error') + ' — ตรวจว่า deploy ai-plan + ตั้ง ANTHROPIC_API_KEY แล้ว');
    } finally {
      setPlanning(false);
    }
  }

  // ให้ AI Agent ดำเนินงานจริงตามบทบาทหน้าที่ใน org chart
  async function executeTask(taskId: string) {
    if (!supabase) return;
    const task = c.tasks.find(t => t.id === taskId);
    const agent = c.agents.find(a => a.id === task?.agentId);
    if (!task || !agent) return;

    setRunningTaskIds(prev => new Set(prev).add(taskId));
    // เริ่มงาน: เปลี่ยนสถานะเป็น in_progress
    patch({ tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t) });

    try {
      const orgContext = c.agents
        .filter(a => a.id !== agent.id)
        .map(a => ({ role: a.role, mandate: a.mandate }));

      trackAiCall();

      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: agent.role,
          name: agent.name,
          mandate: withSkillDirectives(agent.mandate, c.purchasedSkills),
          model: agent.model,
          title: task.title,
          detail: task.detail,
          goal: c.goal,
          industry: c.industry,
          companyName: c.name,
          orgContext,
          useWebSearch: task.useWebSearch ?? false,
          searchQuery: task.searchQuery,
        },
      });
      if (error) throw error;

      const webTag = res?.webSearchUsed ? ' 🌐' : '';
      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      patch({
        tasks: c.tasks.map(t => t.id === taskId
          ? { ...t, status: 'review' as const, output: (res?.output ?? '') + webTag, executedAt: now }
          : t
        ),
      });
    } catch (e) {
      patch({
        tasks: c.tasks.map(t => t.id === taskId
          ? { ...t, status: 'blocked' as const, output: '✕ ดำเนินงานไม่สำเร็จ: ' + (e as Error).message }
          : t
        ),
      });
    } finally {
      setRunningTaskIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  }

  // Keep ref in sync so heartbeat always calls latest version
  useEffect(() => { executeTaskRef.current = executeTask; });

  // สร้าง Job Description สำหรับตำแหน่งในผังองค์กร
  async function generateJD(agentId: string) {
    if (!supabase) return;
    const agent = c.agents.find(a => a.id === agentId);
    if (!agent) return;
    setGeneratingJD(agentId);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: 'HR Manager',
          mandate: withSkillDirectives('เขียน Job Description ที่ครบถ้วน ชัดเจน ดึงดูดผู้สมัครคุณภาพ', c.purchasedSkills),
          model: 'claude-sonnet-4-6',
          title: `สร้าง JD สำหรับตำแหน่ง ${agent.role}`,
          detail: `หน้าที่ (Mandate): ${agent.mandate}\nรายงานต่อ: ${c.agents.find(a => a.id === agent.reportsTo)?.role ?? 'บอร์ด'}`,
          goal: `เขียน Job Description ฉบับสมบูรณ์สำหรับตำแหน่ง "${agent.role}" ในบริษัท "${c.name}" อุตสาหกรรม ${c.industry} — ให้มีหัวข้อ: ภาพรวมตำแหน่ง, ความรับผิดชอบหลัก, คุณสมบัติที่ต้องการ, สิ่งที่ได้รับ`,
          industry: c.industry,
          companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      patch({ agents: c.agents.map(a => a.id === agentId ? { ...a, jd: res?.output ?? '' } : a) });
    } catch (e) {
      patch({ agents: c.agents.map(a => a.id === agentId ? { ...a, jd: '✕ ' + (e as Error).message } : a) });
    } finally {
      setGeneratingJD(null);
    }
  }

  // SEO Agent: auto-สร้างและ execute revenue model task
  async function runSeoRevenueModel(agentId: string) {
    const agent = c.agents.find(a => a.id === agentId);
    if (!agent) return;
    const taskId = 'seo-rev-' + Date.now().toString(36);
    const newTask = {
      id: taskId,
      agentId,
      title: 'Revenue Model Analysis (Auto)',
      detail: `วิเคราะห์ Revenue Model ของ ${c.name}: LTV, COCA, K-Factor, Pricing Tiers และ Growth Projection 12 เดือน สำหรับตลาด ${c.industry}`,
      status: 'queued' as const,
    };
    patch({ tasks: [...c.tasks, newTask] });
    setTimeout(() => executeTask(taskId), 100);
  }

  // CEO วิเคราะห์ org chart และแนะนำตำแหน่งที่ขาด (รวม Sales & Marketing)
  async function ceoSuggestRoles() {
    if (!supabase) return;
    setSuggestingRoles(true);
    setSuggestMsg(null);
    setCeoSuggestions([]);
    try {
      const existing = c.agents.map(a => a.role).join(', ') || 'ยังไม่มีทีม';
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: 'CEO',
          mandate: withSkillDirectives('วิเคราะห์โครงสร้างองค์กรและแนะนำตำแหน่งที่ควรจ้างตามเป้าหมายธุรกิจ', c.purchasedSkills),
          model: 'claude-sonnet-4-6',
          title: 'แนะนำตำแหน่งที่ขาดในผังองค์กร',
          detail: [
            `บริษัท: ${c.name} | อุตสาหกรรม: ${c.industry}`,
            `เป้าหมาย: ${c.goal}`,
            `ตำแหน่งปัจจุบัน: ${existing}`,
            '',
            'ให้ CEO วิเคราะห์ว่าตำแหน่งใดที่ขาดอยู่ที่จำเป็นต้องมีเพื่อบรรลุเป้าหมาย',
            'โดยเฉพาะด้าน Sales, Marketing, CRM และ Technology (เช่น Salesforce Developer)',
            '',
            `Skill Tools ที่ระบบ AI มีให้ใช้: ${AVAILABLE_SKILLS.join(', ')}`,
            '',
            'ตอบกลับเป็น JSON array เท่านั้น รูปแบบ:',
            '[{"role":"ชื่อตำแหน่ง","mandate":"หน้าที่หลัก 1-2 ประโยค","reportsToRole":"รายงานต่อตำแหน่งใด","reason":"เหตุผลที่ต้องมีตำแหน่งนี้","skills":["skill1","skill2"]}]',
            'แนะนำ 3-6 ตำแหน่ง ไม่ต้องซ้ำกับที่มีอยู่แล้ว',
          ].join('\n'),
          goal: c.goal,
          industry: c.industry,
          companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: Array<{ role: string; mandate: string; reportsToRole: string; reason: string; skills?: string[] }> = JSON.parse(match[0]);
        setCeoSuggestions(parsed);
        setSuggestMsg(`✓ CEO แนะนำ ${parsed.length} ตำแหน่ง — เลือกเพิ่มได้เลย`);
      } else {
        setSuggestMsg('CEO วิเคราะห์: ' + output.slice(0, 120));
      }
    } catch (e) {
      setSuggestMsg('✕ ' + (e as Error).message);
    } finally {
      setSuggestingRoles(false);
    }
  }

  // CEO ขออนุมัติ User ก่อนเพิ่มตำแหน่งในผังองค์กร
  function requestHireApproval(sug: { role: string; mandate: string; reportsToRole: string; reason: string }) {
    const ceoAgent = c.agents.find(a => a.role.toLowerCase().includes('ceo')) ?? c.agents[0];
    const approval: import('../types').Approval = {
      id: 'hire-' + Date.now().toString(36),
      agentId: ceoAgent?.id ?? '',
      title: `📋 CEO ขอเพิ่มตำแหน่ง: ${sug.role}`,
      detail: `หน้าที่: ${sug.mandate}\nรายงานต่อ: ${sug.reportsToRole}`,
      impact: JSON.stringify({ type: 'hire', role: sug.role, mandate: sug.mandate, reportsToRole: sug.reportsToRole }),
      status: 'pending',
    };
    patch({ approvals: [...c.approvals, approval] });
    setCeoSuggestions(prev => prev.filter(s => s.role !== sug.role));
  }

  // C-level ขอเพิ่ม M-level พร้อมบทบาทหน้าที่ที่ตนกำหนด → CEO เสนอบอร์ด
  // เมื่อบอร์ดอนุมัติ decideApproval (type 'hire') จะสร้าง AI Agent ตำแหน่งนั้นทันที
  function requestMLevel(cAgent: Agent, role: string, mandate: string) {
    if (!role.trim() || !mandate.trim()) return;
    const approval: import('../types').Approval = {
      id: 'hire-m-' + Date.now().toString(36),
      agentId: cAgent.id,
      title: `📋 ${cAgent.role} ขอเพิ่ม M-level: ${role.trim()} — CEO เสนอบอร์ดอนุมัติ`,
      detail: `บทบาทหน้าที่ (กำหนดโดย ${cAgent.role} ${cAgent.name}):\n${mandate.trim()}\n\nรายงานต่อ: ${cAgent.role} · อนุมัติแล้วระบบสร้าง AI Agent ตำแหน่งนี้ทันที`,
      impact: JSON.stringify({ type: 'hire', role: role.trim(), mandate: mandate.trim(), reportsToRole: cAgent.role }),
      status: 'pending',
    };
    patch({ approvals: [...c.approvals, approval] });
    setMReq(null);
    setFeed(prev => [
      { id: ++counter.current, time: nowTime(), text: `${cAgent.role} ${cAgent.name} ขอเพิ่ม ${role.trim()} — CEO เสนอบอร์ดอนุมัติ`, color: cAgent.color },
      ...prev,
    ].slice(0, 40));
  }

  // CEO กำหนดบทบาทหน้าที่ทุกตำแหน่งให้สอดคล้องกับ Business Process + เป้าหมาย + Skills
  async function ceoDefineMandates() {
    if (!supabase || c.agents.length === 0) return;
    setDefiningMandates(true);
    setMandateMsg(null);
    setMandateProposals([]);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: 'CEO',
          mandate: withSkillDirectives('กำหนดบทบาทหน้าที่ของทุกตำแหน่งในองค์กรให้สอดคล้องกับกระบวนการธุรกิจและเป้าหมายบริษัท', c.purchasedSkills),
          model: 'claude-sonnet-4-6',
          title: 'กำหนดบทบาทหน้าที่ (Role Mandate) ทุกตำแหน่ง',
          detail: [
            `บริษัท: ${c.name} | อุตสาหกรรม: ${c.industry}`,
            `เป้าหมายบริษัท: ${c.goal}`,
            '',
            'ตำแหน่งปัจจุบันในองค์กร:',
            c.agents.map(a => `- ${a.role}: ${a.mandate}`).join('\n'),
            '',
            `Skill Tools ที่ระบบ AI มีให้ใช้งาน: ${AVAILABLE_SKILLS.join(', ')}`,
            '',
            'ให้ CEO กำหนดบทบาทหน้าที่ (Mandate) ให้ทุกตำแหน่งโดย:',
            '1. สอดคล้องกับเป้าหมายบริษัทและ Business Process ตามอุตสาหกรรม',
            '2. ระบุ Skill Tools ที่ตำแหน่งนั้นควรใช้ (2-4 skills ที่เกี่ยวข้องที่สุด)',
            '3. กำหนด KPI หลักที่ต้องรับผิดชอบและวัดได้จริง',
            '4. อธิบายบทบาทชัดเจน 2-3 ประโยค ครอบคลุมหน้าที่หลักและการทำงานร่วมกับทีม',
            '',
            'ตอบกลับเป็น JSON array เท่านั้น:',
            '[{"role":"ชื่อตำแหน่ง","mandate":"บทบาทหน้าที่ 2-3 ประโยค","skills":["skill1","skill2"],"kpi":"KPI หลัก 1-2 ตัว"}]',
          ].join('\n'),
          goal: c.goal,
          industry: c.industry,
          companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: Array<{ role: string; mandate: string; skills?: string[]; kpi?: string }> = JSON.parse(match[0]);
        setMandateProposals(parsed);
        setMandateMsg(`✓ CEO กำหนดบทบาท ${parsed.length} ตำแหน่ง — ตรวจสอบแล้วกด "บันทึกทั้งหมด"`);
      } else {
        setMandateMsg('CEO วิเคราะห์: ' + output.slice(0, 200));
      }
    } catch (e) {
      setMandateMsg('✕ ' + (e as Error).message);
    } finally {
      setDefiningMandates(false);
    }
  }

  function applyMandateProposals() {
    let count = 0;
    const updated = c.agents.map(agent => {
      const proposal = mandateProposals.find(p =>
        p.role.toLowerCase() === agent.role.toLowerCase() ||
        agent.role.toLowerCase().includes(p.role.toLowerCase().split(' ')[0]) ||
        p.role.toLowerCase().includes(agent.role.toLowerCase().split(' ')[0])
      );
      if (!proposal) return agent;
      count++;
      const skillLine = proposal.skills?.length ? `\n📌 Skills: ${proposal.skills.join(' · ')}` : '';
      const kpiLine = proposal.kpi ? `\n📊 KPI: ${proposal.kpi}` : '';
      return { ...agent, mandate: proposal.mandate + skillLine + kpiLine };
    });
    patch({ agents: updated });
    setMandateProposals([]);
    setMandateMsg(`✅ บันทึกบทบาทหน้าที่แล้ว ${count} ตำแหน่ง`);
  }

  function fmtImpact(impact: string): string {
    try {
      const meta = JSON.parse(impact);
      if (meta.type === 'hire') return `📋 เพิ่มตำแหน่ง: ${meta.role} · รายงานต่อ: ${meta.reportsToRole}`;
      if (meta.type === 'mission') return `🧭 Mission: ${String(meta.mission ?? '').slice(0, 80)}`;
      return impact;
    } catch { return impact; }
  }

  // ทุกตำแหน่งทำงานแบบ AI Agent — สร้างและรันงานจากบทบาทหน้าที่ทันที
  async function runAgentNow(agentId: string) {
    const agent = c.agents.find(a => a.id === agentId);
    if (!agent || !supabase) return;
    setRunningAgentId(agentId);
    const taskId = 'auto-' + Date.now().toString(36);
    const newTask = {
      id: taskId,
      agentId,
      title: `${agent.role} ดำเนินงานตามบทบาทหน้าที่`,
      detail: [
        `บทบาท: ${agent.mandate}`,
        `เป้าหมายบริษัท: ${c.goal}`,
        `อุตสาหกรรม: ${c.industry}`,
        '',
        `ให้ ${agent.role} วิเคราะห์สถานการณ์ปัจจุบัน ระบุปัญหา/โอกาสสำคัญ`,
        'และดำเนินงานที่สร้างผลกระทบสูงสุดต่อเป้าหมายบริษัทในขณะนี้',
        'พร้อมระบุผลลัพธ์ที่วัดได้และขั้นตอนถัดไป',
      ].join('\n'),
      status: 'queued' as const,
    };
    patch({ tasks: [...c.tasks, newTask] });
    setTimeout(async () => {
      await executeTask(taskId);
      setRunningAgentId(null);
    }, 100);
  }

  // ซื้อ Skill + สะสม XP (Gamification) — payMethod = วิธีชำระเงินที่ผู้ใช้เลือก
  function purchaseSkill(skill: SkillEntry, payMethod?: string) {
    const owned = c.purchasedSkills ?? [];
    if (owned.includes(skill.id)) return;
    const gainXP = XP_PER_TIER[skill.tier];
    const newXP = (c.skillXP ?? 0) + gainXP;
    const prevLevel = getCompanyLevel(c.skillXP ?? 0);
    const newLevel = getCompanyLevel(newXP);
    const levelUp = prevLevel.rank !== newLevel.rank;
    patch({ purchasedSkills: [...owned, skill.id], skillXP: newXP });
    setBuyConfirm(null);
    // สถิติการตลาด: บันทึก event ไปหลังบ้าน (fire-and-forget ไม่ block การซื้อ)
    trackSkillPurchase(skill, payMethod ?? 'unknown', wsId).catch(() => { /* วิเคราะห์ภายหลังได้จาก workspace_state */ });
    const payLabel = PAY_METHODS.find(m => m.id === payMethod)?.label;
    const paidVia = payLabel ? ` · ชำระผ่าน ${payLabel}` : '';
    setMktMsg(levelUp
      ? `🎉 Level Up! บริษัทเลื่อนระดับเป็น ${newLevel.badge} ${newLevel.rank} — +${gainXP} XP · ได้รับ "${skill.name}" แล้ว${paidVia}`
      : `✅ ได้รับ "${skill.name}" แล้ว · +${gainXP} XP · รวม ${newXP.toLocaleString()} XP${paidVia}`
    );
  }

  /** ผู้ชนะประมูลชำระเงิน → รับ skill เข้าบริษัท (+XP ตามมูลค่าที่บิดได้) */
  function claimAuctionSkill(a: Auction, payMethod: string) {
    const ownedNow = c.purchasedSkills ?? [];
    if (ownedNow.includes(a.skillId)) return;
    const gainXP = a.winningBid >= 2000 ? 200 : 150;
    patch({ purchasedSkills: [...ownedNow, a.skillId], skillXP: (c.skillXP ?? 0) + gainXP });
    trackSkillPurchase(
      { id: a.skillId, name: a.skillName, category: 'strategy', tier: 3, price: a.winningBid, desc: a.skillDesc, icon: a.icon, tags: [] },
      'auction:' + payMethod, wsId,
    ).catch(() => { /* วิเคราะห์ภายหลังได้ */ });
    setMktMsg(`🏆 รับ "${a.skillName}" จากการประมูลแล้ว (${'฿' + a.winningBid.toLocaleString()}) · +${gainXP} XP`);
  }

  // CEO ขออนุมัติเพิ่มตำแหน่ง HRD Manager ผ่านบอร์ด
  function requestHrdRole() {
    requestHireApproval({
      role: 'HRD Manager',
      mandate: 'พัฒนาทักษะและศักยภาพทีม วางแผนฝึกอบรม บริหาร Skill Acquisition และสร้าง Knowledge Base องค์กร\n📌 Skills: job-posting · knowledge-base-builder · survey-analysis · feedback-analysis',
      reportsToRole: 'CEO',
      reason: 'พัฒนาขีดความสามารถทีมให้สอดคล้องกับเป้าหมายบริษัท และจัดการ Skill ที่ซื้อในระบบ',
    });
  }

  // CEO ร่าง Mission Statement → สร้าง approval ประเภท 'mission' รอบอร์ดอนุมัติ
  async function ceoProposeMission() {
    if (!supabase) return;
    setProposingMission(true);
    setMissionMsg(null);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: 'CEO',
          mandate: withSkillDirectives('ร่าง Mission Statement ที่ชัดเจน ทะเยอทะยาน และเป็นแรงบันดาลใจ สอดคล้องกับเป้าหมายและทักษะขององค์กร', c.purchasedSkills),
          model: 'claude-sonnet-4-6',
          title: 'ร่าง Mission Statement สำหรับบริษัท',
          detail: [
            `บริษัท: ${c.name} | อุตสาหกรรม: ${c.industry}`,
            `เป้าหมายหลัก: ${c.goal}`,
            '',
            'ทีมงาน AI:',
            c.agents.map(a => `- ${a.role}: ${a.mandate.split('\n')[0]}`).join('\n'),
            '',
            `Skill ที่องค์กรมี: ${(c.purchasedSkills ?? []).join(', ') || 'ยังไม่มี'}`,
            '',
            'ให้ CEO ร่าง Mission Statement ที่:',
            '1. สั้น กระชับ ทรงพลัง (2-3 ประโยค)',
            '2. ระบุว่าองค์กรนี้ทำเพื่อใคร สร้างคุณค่าอะไร และแตกต่างอย่างไร',
            '3. ใช้ภาษาไทยที่เข้าใจง่ายและจุดประกายแรงบันดาลใจ',
            '',
            'ตอบกลับในรูปแบบ JSON: {"mission": "Mission Statement ที่นี่", "rationale": "เหตุผล 2-3 บรรทัด"}',
          ].join('\n'),
          goal: c.goal, industry: c.industry, companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\{[\s\S]*\}/);
      let mission = '', rationale = '';
      if (match) {
        const parsed = JSON.parse(match[0]);
        mission = String(parsed.mission ?? '').trim();
        rationale = String(parsed.rationale ?? '');
      } else {
        mission = output.trim().slice(0, 300);
      }
      if (!mission) throw new Error('ไม่ได้รับ Mission Statement');
      const ceoAgent = c.agents.find(a => a.role.toLowerCase().includes('ceo')) ?? c.agents[0];
      const approval: import('../types').Approval = {
        id: 'mis-' + Date.now().toString(36),
        agentId: ceoAgent?.id ?? '',
        title: `🧭 CEO เสนอ Mission Statement`,
        detail: `"${mission}"\n\nเหตุผล: ${rationale}`,
        impact: JSON.stringify({ type: 'mission', mission }),
        status: 'pending',
      };
      patch({ approvals: [...c.approvals, approval] });
      setMissionMsg('✓ CEO ร่าง Mission แล้ว — เลื่อนลงไปที่กล่องอนุมัติเพื่ออนุมัติ');
    } catch (e) {
      setMissionMsg('✕ ' + (e as Error).message);
    } finally {
      setProposingMission(false);
    }
  }

  // HRD กำหนด Skill Plan ให้ทุกตำแหน่งตาม Mission ของบริษัท
  async function hrdDefineSkillPlan() {
    const hrdAgent = c.agents.find(a => /hrd|hr manager/i.test(a.role));
    if (!hrdAgent) { setSkillPlanMsg('✕ ยังไม่มี HRD Manager — กด "ขอเพิ่ม HRD" และรอ Approve ก่อน'); return; }
    if (!supabase) return;
    setHrdPlanningSkills(true);
    setSkillPlanMsg(null);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: hrdAgent.role, name: hrdAgent.name, mandate: withSkillDirectives(hrdAgent.mandate, c.purchasedSkills), model: hrdAgent.model,
          title: 'กำหนด Skill Plan ตาม Mission ของบริษัท',
          detail: [
            `บริษัท: ${c.name} | Mission: ${c.mission || c.goal}`,
            '',
            'ทีมงาน AI (agentId → role → mandate):',
            c.agents.map(a => `- ${a.id}: ${a.role} — ${a.mandate.split('\n')[0]}`).join('\n'),
            '',
            `Skills ในระบบ: ${AVAILABLE_SKILLS.join(', ')}`,
            `Skills ที่ซื้อแล้ว: ${(c.purchasedSkills ?? []).join(', ') || 'ยังไม่มี'}`,
            '',
            'ให้ HRD กำหนด Skill Plan สำหรับทุกตำแหน่ง ตอบเป็น JSON array:',
            '[{"agentId":"id","role":"ชื่อตำแหน่ง","skills":["skill1","skill2"],"process":"กระบวนการหลัก 1-2 ประโยค","kpi":"KPI ที่วัดได้"}]',
          ].join('\n'),
          goal: c.mission || c.goal, industry: c.industry, companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: SkillPlanItem[] = JSON.parse(match[0]);
        patch({ skillPlan: parsed });
        setSkillPlanMsg(`✓ HRD กำหนด Skill Plan ${parsed.length} ตำแหน่งแล้ว`);
      } else {
        setSkillPlanMsg('HRD: ' + output.slice(0, 200));
      }
    } catch (e) {
      setSkillPlanMsg('✕ ' + (e as Error).message);
    } finally {
      setHrdPlanningSkills(false);
    }
  }

  // User เพิ่ม Custom Skill → ส่งให้ HRD ออกแบบกระบวนการมาตรฐาน
  function submitCustomSkill() {
    const { name, desc, category, tier } = customSkillDraft;
    if (!name.trim() || !desc.trim()) return;
    const price = tier === 1 ? 1000 : tier === 2 ? 1500 : 2000;
    const newSkill: CustomSkill = {
      id: 'csk-' + Date.now().toString(36),
      name: name.trim(), desc: desc.trim(), category, tier, price,
      status: 'pending_hrd', addedAt: new Date().toLocaleDateString('th-TH'),
    };
    patch({ customSkills: [...(c.customSkills ?? []), newSkill] });
    setCustomSkillDraft({ name: '', desc: '', category: 'hr', tier: 1 });
    setAddCustomSkillOpen(false);
  }

  // HRD ออกแบบกระบวนการมาตรฐานสำหรับ Custom Skill ที่ User เพิ่ม
  async function hrdProcessCustomSkill(skillId: string) {
    const skill = (c.customSkills ?? []).find(s => s.id === skillId);
    const hrdAgent = c.agents.find(a => /hrd|hr manager/i.test(a.role));
    if (!skill || !hrdAgent || !supabase) return;
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: hrdAgent.role, mandate: withSkillDirectives(hrdAgent.mandate, c.purchasedSkills), model: hrdAgent.model,
          title: `ออกแบบกระบวนการมาตรฐานสำหรับ Skill: ${skill.name}`,
          detail: [
            `ชื่อ Skill: ${skill.name}`,
            `คำอธิบาย: ${skill.desc}`,
            `หมวดหมู่: ${skill.category} | ระดับ: Tier ${skill.tier}`,
            '',
            'ให้ HRD ออกแบบกระบวนการมาตรฐาน (Standard Process) สำหรับ Skill นี้:',
            '1. วัตถุประสงค์การเรียนรู้ 3-5 ข้อ',
            '2. ขั้นตอนการฝึกอบรมที่ชัดเจน',
            '3. วิธีประเมินความสามารถ',
            '4. KPI ที่บ่งชี้ว่าใช้ Skill นี้ได้จริง',
            '',
            'ตอบเป็น JSON: {"process": "กระบวนการมาตรฐาน 3-5 ขั้นตอน"}',
          ].join('\n'),
          goal: c.goal, industry: c.industry, companyName: c.name, orgContext: [],
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\{[\s\S]*\}/);
      const process = match ? String(JSON.parse(match[0]).process ?? output) : output;
      patch({ customSkills: (c.customSkills ?? []).map(s => s.id === skillId ? { ...s, status: 'active' as const, hrdProcess: process } : s) });
    } catch {
      patch({ customSkills: (c.customSkills ?? []).map(s => s.id === skillId ? { ...s, status: 'rejected' as const } : s) });
    }
  }

  // HRD ออกแบบระบบประเมิน Competency ต่อตำแหน่ง
  async function hrdDesignCompetencyAssessment() {
    const hrdAgent = c.agents.find(a => /hrd|hr manager/i.test(a.role));
    if (!hrdAgent) { setCompetencyMsg('✕ ยังไม่มี HRD Manager'); return; }
    if (c.skillPlan.length === 0) { setCompetencyMsg('✕ กำหนด Skill Plan ก่อน แล้วค่อยออกแบบการประเมิน'); return; }
    if (!supabase) return;
    setDesigningCompetency(true);
    setCompetencyMsg(null);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: hrdAgent.role, mandate: withSkillDirectives(hrdAgent.mandate, c.purchasedSkills), model: hrdAgent.model,
          title: 'ออกแบบ Competency Assessment Framework',
          detail: [
            `บริษัท: ${c.name} | Mission: ${c.mission || c.goal}`,
            '',
            'Skill Plan ปัจจุบัน:',
            c.skillPlan.map(p => `- ${p.role} (${p.agentId}): ${p.skills.join(', ')} | KPI: ${p.kpi}`).join('\n'),
            '',
            'ระดับ Competency: 0=ไม่มี 1=Novice 2=Developing 3=Proficient 4=Expert',
            '',
            'ให้ HRD กำหนด Competency Framework สำหรับทุกตำแหน่ง ตอบเป็น JSON array:',
            '[{"agentId":"id","role":"ชื่อตำแหน่ง","competencies":[{"skillId":"skill-id","level":3,"criteria":"เกณฑ์ประเมิน","assessMethod":"Portfolio/Test/Interview/Observation"}]}]',
          ].join('\n'),
          goal: c.goal, industry: c.industry, companyName: c.name,
          orgContext: c.agents.map(a => ({ role: a.role, mandate: a.mandate })),
        },
      });
      if (error) throw error;
      const output: string = res?.output ?? '';
      const match = output.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: RoleCompetency[] = JSON.parse(match[0]);
        patch({ competencyMap: parsed });
        setCompetencyMsg(`✓ HRD ออกแบบ Competency Assessment ${parsed.length} ตำแหน่งแล้ว`);
      } else {
        setCompetencyMsg('HRD: ' + output.slice(0, 200));
      }
    } catch (e) {
      setCompetencyMsg('✕ ' + (e as Error).message);
    } finally {
      setDesigningCompetency(false);
    }
  }

  function setCompanyField(field: 'name' | 'goal' | 'industry', value: string) {
    patch({ [field]: value } as Partial<typeof c>);
  }

  /* ----- agents ----- */
  function saveAgent(id: string, field: keyof Agent, value: string) {
    patch({ agents: c.agents.map(a => a.id === id ? { ...a, [field]: value } : a) });
  }
  function hireAgent() {
    const i = c.agents.length;
    const newAgent: Agent = {
      id: 'a-' + Date.now().toString(36),
      role: 'ตำแหน่งใหม่', name: 'เอเจนต์', avatar: AVATARS[i % AVATARS.length],
      color: AGENT_PALETTE[i % AGENT_PALETTE.length],
      mandate: 'อธิบายหน้าที่ของเอเจนต์นี้', model: MODELS[1],
      status: c.autoHire ? 'idle' : 'waiting',
      reportsTo: c.agents.find(a => a.role === 'CEO')?.id ?? null,
    };
    patch({ agents: [...c.agents, newAgent] });
  }
  // เพิ่มตำแหน่งใต้บังคับบัญชาของ parentId (จากปุ่ม ＋ ใน org chart)
  function hireUnder(parentId: string) {
    const i = c.agents.length;
    const parent = c.agents.find(a => a.id === parentId);
    const newAgent: Agent = {
      id: 'a-' + Date.now().toString(36),
      role: 'ตำแหน่งใหม่', name: 'เอเจนต์',
      avatar: AVATARS[i % AVATARS.length],
      color: AGENT_PALETTE[i % AGENT_PALETTE.length],
      mandate: `รับผิดชอบต่อ ${parent?.role ?? 'หัวหน้า'} — ระบุหน้าที่ที่นี่`,
      model: MODELS[1],
      status: c.autoHire ? 'idle' : 'waiting',
      reportsTo: parentId,
    };
    patch({ agents: [...c.agents, newAgent] });
  }
  function fireAgent(id: string) {
    const owners = Object.fromEntries(Object.entries(c.toolOwners ?? {}).filter(([, aid]) => aid !== id));
    patch({
      agents: c.agents.filter(a => a.id !== id).map(a => a.reportsTo === id ? { ...a, reportsTo: null } : a),
      tasks: c.tasks.filter(t => t.agentId !== id),
      toolOwners: owners,
    });
  }

  /* ----- CEO เสนอชื่อเรียกแต่ละตำแหน่ง → บอร์ด (User) เลือก/อนุมัติ ----- */
  function ceoProposeNames() {
    if (c.agents.length === 0) return;
    const proposals = c.agents.map(a => {
      const key = Object.keys(NAME_POOLS).find(k => a.role.toUpperCase().includes(k));
      const pool = [...new Set([...(key ? NAME_POOLS[key] : []), ...GENERIC_NAMES])]
        .filter(n => n !== a.name)
        .sort(() => Math.random() - 0.5);
      return { agentId: a.id, role: a.role, avatar: a.avatar, color: a.color, current: a.name, options: pool.slice(0, 3) };
    });
    setNameProposals(proposals);
    setNameMsg(`🧠 CEO เสนอชื่อเรียกสำหรับ ${proposals.length} ตำแหน่ง — บอร์ดคลิกชื่อที่ต้องการเพื่ออนุมัติ หรือคงชื่อเดิม`);
    setFeed(prev => [
      { id: ++counter.current, time: nowTime(), text: `CEO เสนอชื่อเรียกเอเจนต์ ${proposals.length} ตำแหน่ง รอบอร์ดอนุมัติ`, color: AGENT_PALETTE[0] },
      ...prev,
    ].slice(0, 40));
  }
  function approveName(agentId: string, name: string) {
    const ag = c.agents.find(a => a.id === agentId);
    saveAgent(agentId, 'name', name);
    setNameProposals(prev => prev.filter(p => p.agentId !== agentId));
    setFeed(prev => [
      { id: ++counter.current, time: nowTime(), text: `บอร์ดอนุมัติชื่อ "${name}" สำหรับตำแหน่ง ${ag?.role ?? ''}`, color: ag?.color ?? AGENT_PALETTE[0] },
      ...prev,
    ].slice(0, 40));
  }
  function keepName(agentId: string) {
    setNameProposals(prev => prev.filter(p => p.agentId !== agentId));
  }
  function approveAllFirstNames() {
    const chosen = Object.fromEntries(
      nameProposals.filter(p => p.options[0]).map(p => [p.agentId, p.options[0]]),
    );
    patch({ agents: c.agents.map(a => chosen[a.id] ? { ...a, name: chosen[a.id] } : a) });
    setNameProposals([]);
    setNameMsg(`✅ บอร์ดอนุมัติชื่อใหม่ ${Object.keys(chosen).length} ตำแหน่งเรียบร้อย`);
  }

  /* ----- tool owners: CEO เลือก/สร้าง C-level ดูแลเครื่องมือแต่ละตัว ----- */
  function setToolOwner(toolId: string, agentId: string) {
    const owners = { ...(c.toolOwners ?? {}) };
    if (agentId) owners[toolId] = agentId; else delete owners[toolId];
    patch({ toolOwners: owners });
  }
  function ceoAssignToolOwners() {
    const agents = [...c.agents];
    let ceo = agents.find(a => a.role.toUpperCase().includes('CEO'));
    if (!ceo) {
      ceo = {
        id: 'a-' + Date.now().toString(36) + '-ceo', role: 'CEO', name: 'เอเจนต์หลัก',
        avatar: '🤖', color: AGENT_PALETTE[0], mandate: 'กำหนดทิศทางและตัดสินใจสูงสุด',
        model: MODELS[0], status: 'idle', reportsTo: null,
      };
      agents.push(ceo);
    }
    const owners: Record<string, string> = { ...(c.toolOwners ?? {}) };
    const msgs: { text: string; color: string }[] = [];
    for (const tool of TOOL_SPECS) {
      if (owners[tool.id] && agents.some(a => a.id === owners[tool.id])) continue; // มีผู้รับผิดชอบอยู่แล้ว
      let agent = agents.find(a => a.role.toUpperCase().includes(tool.owner));
      if (!agent) {
        const spec = C_LEVEL_SPECS[tool.owner];
        agent = {
          id: 'a-' + Date.now().toString(36) + '-' + tool.owner.toLowerCase(),
          role: tool.owner, name: spec.name, avatar: spec.avatar, color: spec.color,
          mandate: spec.mandate, model: MODELS[1],
          status: c.autoHire ? 'idle' : 'waiting', reportsTo: ceo.id,
        };
        agents.push(agent);
        msgs.push({ text: `CEO สร้างตำแหน่ง ${tool.owner} (${spec.name}) รายงานตรงต่อ CEO`, color: spec.color });
      }
      owners[tool.id] = agent.id;
      msgs.push({ text: `CEO มอบหมาย ${agent.role} ${agent.name} ดูแล ${tool.label}`, color: agent.color });
    }
    patch({ agents, toolOwners: owners });
    if (msgs.length === 0) {
      msgs.push({ text: 'CEO ตรวจสอบแล้ว — เครื่องมือทุกตัวมี C-level ดูแลครบ', color: AGENT_PALETTE[0] });
    }
    setFeed(prev => [
      ...msgs.map(m => ({ id: ++counter.current, time: nowTime(), text: m.text, color: m.color })),
      ...prev,
    ].slice(0, 40));
  }

  /* ----- tasks ----- */
  function moveTask(id: string, status: TaskStatus) {
    patch({ tasks: c.tasks.map(t => t.id === id ? { ...t, status } : t) });
  }
  function addTask() {
    patch({ tasks: [...c.tasks, {
      id: 't-' + Date.now().toString(36),
      agentId: c.agents[0]?.id ?? '',
      title: 'งานใหม่', detail: 'รายละเอียดงาน', status: 'queued',
    }] });
  }
  function delTask(id: string) {
    patch({ tasks: c.tasks.filter(t => t.id !== id) });
  }

  /* ----- approvals ----- */
  function decideApproval(id: string, status: ApprovalStatus) {
    const approval = c.approvals.find(a => a.id === id);
    if (approval && status === 'approved') {
      try {
        const meta = JSON.parse(approval.impact);
        if (meta.type === 'hire') {
          const i = c.agents.length;
          const parent = c.agents.find(a =>
            a.role.toLowerCase().includes(String(meta.reportsToRole ?? '').toLowerCase()) ||
            String(meta.reportsToRole ?? '').toLowerCase().includes(a.role.toLowerCase())
          );
          const newAgent: Agent = {
            id: 'a-' + Date.now().toString(36),
            role: meta.role, name: meta.role,
            avatar: AVATARS[i % AVATARS.length],
            color: AGENT_PALETTE[i % AGENT_PALETTE.length],
            mandate: meta.mandate, model: MODELS[1],
            status: 'idle', reportsTo: parent?.id ?? null,
          };
          patch({
            approvals: c.approvals.map(a => a.id === id ? { ...a, status } : a),
            agents: [...c.agents, newAgent],
          });
          return;
        }
        if (meta.type === 'board_report') {
          const ids: string[] = Array.isArray(meta.taskIds) ? meta.taskIds : [];
          const idSet = new Set(ids);
          patch({
            approvals: c.approvals.map(a => a.id === id ? { ...a, status } : a),
            tasks: c.tasks.map(t => idSet.has(t.id) && t.status === 'review'
              ? { ...t, status: 'done' as const } : t),
          });
          setFeed(prev => [
            { id: ++counter.current, time: nowTime(), text: `✅ บอร์ดอนุมัติผลการดำเนินงาน ${ids.length} งาน — ดำเนินการขั้นตอนถัดไป`, color: AGENT_PALETTE[0] },
            ...prev,
          ].slice(0, 40));
          return;
        }
        if (meta.type === 'mission') {
          const missionTasks = c.agents.map((a, i) => ({
            id: 'mis-' + Date.now().toString(36) + i,
            agentId: a.id,
            title: `พัฒนากระบวนการตาม Mission ใหม่`,
            detail: `Mission: ${meta.mission}\n\nให้ ${a.role} วิเคราะห์ว่ากระบวนการที่ตนรับผิดชอบต้องปรับปรุงอย่างไรเพื่อสนับสนุน Mission นี้ พร้อมกำหนด 3 Action สำคัญในเดือนแรก`,
            status: 'queued' as const,
          }));
          patch({
            approvals: c.approvals.map(a => a.id === id ? { ...a, status } : a),
            mission: meta.mission,
            missionApproved: true,
            tasks: [...c.tasks, ...missionTasks],
          });
          setMissionMsg(`✅ Mission อนุมัติแล้ว! ส่งงานพัฒนากระบวนการให้ทีม ${missionTasks.length} คน — กด "HRD กำหนด Skill Plan" เพื่อวางแผนพัฒนาทักษะ`);
          return;
        }
      } catch { /* not a hire approval */ }
    }
    patch({ approvals: c.approvals.map(a => a.id === id ? { ...a, status } : a) });
  }

  /* ----- CEO รายงานบอร์ด: รวมผลงาน AI Agent (review) → เสนอบอร์ดอนุมัติขั้นต่อไป ----- */
  function ceoReportToBoard() {
    const rev = reviewTasks(c);
    if (rev.length === 0) { setBoardReportMsg('ยังไม่มีผลงานรอรายงาน (ไม่มีงานสถานะ "ตรวจสอบ")'); return; }
    if (c.approvals.some(a => a.status === 'pending' && a.id.startsWith('rpt-'))) {
      setBoardReportMsg('มีรายงานรอบอร์ดอนุมัติอยู่แล้ว — ดูที่ "เรื่องรออนุมัติจากบอร์ด"'); return;
    }
    const ceo = c.agents.find(a => a.role.toLowerCase().includes('ceo')) ?? c.agents[0];
    const approval: import('../types').Approval = {
      id: 'rpt-' + Date.now().toString(36),
      agentId: ceo?.id ?? '',
      title: `📊 CEO รายงานผลการดำเนินงาน — ${rev.length} งานรออนุมัติ`,
      detail: boardReportText(c),
      impact: JSON.stringify({ type: 'board_report', taskIds: rev.map(t => t.id) }),
      status: 'pending',
    };
    patch({ approvals: [approval, ...c.approvals] });
    setBoardReportMsg(`✅ CEO ส่งรายงานให้บอร์ดแล้ว (${rev.length} งาน) — อนุมัติได้ที่ "เรื่องรออนุมัติจากบอร์ด"`);
    setFeed(prev => [
      { id: ++counter.current, time: nowTime(), text: `CEO รายงานผลการดำเนินงาน ${rev.length} งาน ต่อบอร์ด — รออนุมัติ`, color: ceo?.color ?? AGENT_PALETTE[0] },
      ...prev,
    ].slice(0, 40));
  }

  // บอร์ดอนุมัติผลทั้งหมดทันที (Automate): review → done โดยไม่ผ่านรอบขออนุมัติ
  function boardApproveAllReview() {
    const rev = reviewTasks(c);
    if (rev.length === 0) { setBoardReportMsg('ไม่มีงานสถานะ "ตรวจสอบ" ให้อนุมัติ'); return; }
    patch({ tasks: c.tasks.map(t => t.status === 'review' ? { ...t, status: 'done' as const } : t) });
    setBoardReportMsg(`✅ บอร์ดอนุมัติผลทั้งหมด ${rev.length} งาน → เสร็จสมบูรณ์`);
    setFeed(prev => [
      { id: ++counter.current, time: nowTime(), text: `✅ บอร์ดอนุมัติผลทั้งหมด ${rev.length} งาน — ดำเนินการขั้นตอนถัดไป`, color: AGENT_PALETTE[0] },
      ...prev,
    ].slice(0, 40));
  }

  const agentName = (id: string) => c.agents.find(a => a.id === id)?.role ?? '—';
  const pendingApprovals = c.approvals.filter(a => a.status === 'pending').length;
  const workingCount = c.running ? c.agents.filter(a => a.status === 'working').length : 0;
  const queuedCount = c.tasks.filter(t => t.status === 'queued' || t.status === 'in_progress').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">องค์กร AI อัตโนมัติ</div>
        <div className="page-meta">
          <span className="meta-chip">{c.agents.length} เอเจนต์</span>
          <span className="meta-chip">{queuedCount} งานในระบบ</span>
          {pendingApprovals > 0 && <span className="meta-chip" style={{ borderColor: 'var(--rust)', color: 'var(--rust)' }}>{pendingApprovals} รออนุมัติ</span>}
          <span className="law-badge" data-tip={"Jakob's Law: ใช้รูปแบบ Kanban + org chart\nที่ผู้ใช้คุ้นจาก Trello/Asana อยู่แล้ว\nจึงเรียนรู้ได้ทันที"}>Jakob's Law</span>
          <span className="law-badge" data-tip={"Doherty Threshold: ฟีดงานสดตอบสนอง < 400ms\nระบบรู้สึก 'มีชีวิต' ทำงานตลอดเวลา\nผู้ใช้จึงอยู่กับระบบนานขึ้น"}>Doherty Threshold</span>
          <span className="law-badge" data-tip={"Miller's Law: สรุปตัวเลขเป็น 4 ก้อน\nไม่ล้น working memory ของบอร์ด"}>Miller's Law</span>
        </div>
      </div>

      {/* ===== Control bar ===== */}
      <div className="ai-control">
        <div className="ai-control-main">
          <input className="ai-co-name" defaultValue={c.name} key={'n' + c.name}
            onBlur={e => setCompanyField('name', e.target.value)} spellCheck={false} />
          <div className="ai-co-industry">
            <span className="ai-co-lbl">ประเภทธุรกิจ (DBD)</span>
            <DBDSelect className="ai-co-ind-inp" value={c.industry}
              onChange={v => setCompanyField('industry', v)} />
          </div>
        </div>
        <div className="ai-control-side">
          <label className="ai-hb" title={'Heartbeat = ความถี่ที่เอเจนต์ตื่นมาทำงาน\nรอบสั้น = เร็วแต่ใช้ token/งบมากขึ้น\nรอบยาว = ประหยัดงบ (บันทึกอัตโนมัติ)'}>
            <span>รอบทำงาน (Heartbeat)</span>
            <select value={c.heartbeatSec} onChange={e => patch({ heartbeatSec: Number(e.target.value) })}>
              {HEARTBEAT_OPTS.map(h => <option key={h.sec} value={h.sec}>{h.label}</option>)}
            </select>
          </label>
          <label className="ai-switch">
            <input type="checkbox" checked={c.autoHire} onChange={e => patch({ autoHire: e.target.checked })} />
            <span>ให้ CEO จ้างเอเจนต์เองได้</span>
          </label>
          {isSupabaseEnabled && (
            <button className="ai-plan-btn" onClick={runAiPlan} disabled={planning}>
              {planning ? 'CEO กำลังคิด…' : '✦ ให้ CEO วางแผนด้วย Claude'}
            </button>
          )}
          {isSupabaseEnabled && !c.missionApproved && (
            <button className="ai-mission-btn" onClick={ceoProposeMission} disabled={proposingMission}>
              {proposingMission ? '⏳ CEO กำลังร่าง Mission…' : '🧭 ให้ CEO ร่าง Mission'}
            </button>
          )}
          <button className={`ai-run-btn${c.running ? ' running' : ''}`} onClick={toggleRun}>
            <span className="ai-run-dot" />
            {c.running ? 'กำลังทำงาน · กดเพื่อหยุด' : 'เริ่มให้ทีม AI ทำงาน'}
          </button>
        </div>
      </div>
      {planMsg && <div className="ai-plan-msg">{planMsg}</div>}

      <div className="ai-goal-box">
        <div className="ai-goal-lbl">🎯 เป้าหมายหลักที่บอร์ดตั้งไว้</div>
        <textarea className="ai-goal-inp" rows={2} defaultValue={c.goal} key={'g' + c.goal}
          onBlur={e => setCompanyField('goal', e.target.value)}
          onChange={e => autoH(e.target)} ref={el => autoH(el)} spellCheck={false} />
      </div>

      {/* ===== CEO Mission ===== */}
      {(missionMsg || c.missionApproved) && (
        <div className="ai-mission-wrap">
          {missionMsg && <div className="ai-mission-msg">{missionMsg}</div>}
          {c.missionApproved && c.mission && (
            <div className="ai-mission-box">
              <div className="ai-mission-label">🧭 Mission Statement (อนุมัติโดยบอร์ด)</div>
              <div className="ai-mission-text">{c.mission}</div>
              {isSupabaseEnabled && (
                <button className="ai-mission-re-btn" onClick={ceoProposeMission} disabled={proposingMission}>
                  {proposingMission ? '⏳…' : '✏️ ร่าง Mission ใหม่'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="ai-budget-tip">
        💰 <b>คุมงบ token:</b> รอบ Heartbeat ยิ่งยาวยิ่งประหยัด — แนะนำ “ทุก 10 นาที” ตอนตั้งค่าเริ่มต้น
        แล้วเปลี่ยนเป็น “ทุกชั่วโมง” หรือ “วันละครั้ง” เมื่อใช้งานจริง · ปรับแล้ว<b>บันทึกอัตโนมัติ</b>ทันที ไม่ต้องกด Save
      </div>

      {/* ===== Stat strip ===== */}
      <div className="ai-stats">
        <div className="ai-stat"><div className="ai-stat-num">{c.running ? workingCount : 0}</div><div className="ai-stat-lbl">เอเจนต์ทำงานอยู่</div></div>
        <div className="ai-stat"><div className="ai-stat-num">{c.tasks.filter(t => t.status === 'in_progress').length}</div><div className="ai-stat-lbl">งานกำลังดำเนินการ</div></div>
        <div className="ai-stat"><div className="ai-stat-num">{c.tasks.filter(t => t.status === 'done').length}</div><div className="ai-stat-lbl">งานเสร็จแล้ว</div></div>
        <div className="ai-stat"><div className="ai-stat-num" style={{ color: pendingApprovals ? 'var(--rust)' : undefined }}>{pendingApprovals}</div><div className="ai-stat-lbl">รอบอร์ดอนุมัติ</div></div>
      </div>

      {/* ===== ผังองค์กร ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">
          🏢 ผังองค์กร — CEO กำหนดโครงสร้าง
          {isSupabaseEnabled && (<>
            <button className="ai-suggest-btn" onClick={ceoSuggestRoles} disabled={suggestingRoles || definingMandates} title="ให้ CEO วิเคราะห์และแนะนำตำแหน่งที่ขาด (ต้องผ่านการ Approve)">
              {suggestingRoles ? '⏳ CEO กำลังวิเคราะห์…' : '🧠 CEO แนะนำตำแหน่ง'}
            </button>
            {c.agents.length > 0 && (
              <button className="ai-suggest-btn mandate-btn" onClick={ceoDefineMandates} disabled={definingMandates || suggestingRoles} title="CEO กำหนดบทบาทหน้าที่ทุกตำแหน่งให้สอดคล้องกับกระบวนการธุรกิจและ Skills">
                {definingMandates ? '⏳ CEO กำลังกำหนดบทบาท…' : '🎯 CEO กำหนดบทบาท'}
              </button>
            )}
          </>)}
          <button className="ai-mini-add hrd-req-btn" onClick={requestHrdRole} title="CEO ส่งคำขอเพิ่ม HRD Manager — ต้องผ่านการ Approve จากบอร์ด">
            🎓 ขอเพิ่ม HRD
          </button>
          <button className="ai-mini-add" onClick={() => patch({ agents: [...c.agents, {
            id: 'a-' + Date.now().toString(36), role: 'CEO', name: 'เอเจนต์หลัก',
            avatar: '🤖', color: AGENT_PALETTE[0], mandate: 'กำหนดทิศทางและตัดสินใจสูงสุด',
            model: MODELS[0], status: 'idle', reportsTo: null,
          }] })}>＋ เพิ่ม CEO</button>
        </div>
        <div className="oc-tip">
          คลิกที่ชื่อตำแหน่ง / ชื่อเอเจนต์เพื่อแก้ไข · กด <b>＋</b> เพื่อเพิ่มผู้ใต้บังคับบัญชา · กด <b>×</b> เพื่อลบตำแหน่ง
        </div>
        {c.agents.length === 0 && (
          <div className="ai-feed-empty">ยังไม่มีเอเจนต์ — กด "＋ เพิ่ม CEO" เพื่อเริ่มสร้างโครงสร้าง</div>
        )}
        <div className="oc-tree">
          {/* root nodes = ไม่มีหัวหน้า (reportsTo null/empty) */}
          {c.agents.filter(a => !a.reportsTo).map(root => (
            <OcNode key={root.id} agent={root} agents={c.agents}
              onAdd={hireUnder} onFire={fireAgent}
              onSaveField={(id, field, val) => saveAgent(id, field, val)}
              onGenJD={generateJD} generatingJD={generatingJD} />
          ))}
        </div>

        {/* CEO Suggestions panel */}
        {(suggestMsg || ceoSuggestions.length > 0) && (
          <div className="ceo-suggest-panel">
            {suggestMsg && <div className="ceo-suggest-msg">{suggestMsg}</div>}
            {ceoSuggestions.length > 0 && (
              <div className="ceo-suggest-list">
                <div className="ceo-suggest-hd">
                  📋 CEO แนะนำตำแหน่งเหล่านี้ — กด <b>ขออนุมัติ</b> เพื่อส่งให้บอร์ด (คุณ) อนุมัติก่อนเพิ่มในผังองค์กร
                </div>
                {ceoSuggestions.map((sug, i) => (
                  <div key={i} className="ceo-suggest-card">
                    <div className="ceo-suggest-role">{sug.role}</div>
                    <div className="ceo-suggest-mandate">{sug.mandate}</div>
                    <div className="ceo-suggest-reason">🔍 {sug.reason}</div>
                    <div className="ceo-suggest-reports">รายงานต่อ: <b>{sug.reportsToRole}</b></div>
                    {'skills' in sug && Array.isArray((sug as { skills?: string[] }).skills) && (
                      <div className="ceo-suggest-skills">
                        {((sug as { skills?: string[] }).skills ?? []).map(sk => <span key={sk} className="skill-chip">{sk}</span>)}
                      </div>
                    )}
                    <button className="ceo-suggest-approve-btn" onClick={() => requestHireApproval(sug)}>
                      📨 ขออนุมัติ (CEO Request)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mandate Definition panel */}
        {(mandateMsg || mandateProposals.length > 0) && (
          <div className="mandate-panel">
            {mandateMsg && (
              <div className="mandate-msg">
                {mandateMsg}
                {mandateProposals.length > 0 && (
                  <button className="mandate-save-btn" onClick={applyMandateProposals}>✅ บันทึกทั้งหมด</button>
                )}
              </div>
            )}
            {mandateProposals.length > 0 && (
              <div className="mandate-list">
                {mandateProposals.map((p, i) => (
                  <div key={i} className="mandate-card">
                    <div className="mandate-role">🎯 {p.role}</div>
                    <div className="mandate-body">{p.mandate}</div>
                    {p.kpi && <div className="mandate-kpi">📊 KPI: {p.kpi}</div>}
                    {p.skills && p.skills.length > 0 && (
                      <div className="mandate-skills">
                        {p.skills.map(sk => <span key={sk} className="skill-chip">{sk}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== เครื่องมือ & C-level ผู้รับผิดชอบ ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">
          🧰 เครื่องมือ & ผู้รับผิดชอบ (C-level)
          <button className="ai-suggest-btn" onClick={ceoAssignToolOwners}
            title="CEO เลือกเอเจนต์ที่เหมาะสม หรือสร้างตำแหน่ง C-level ใหม่ให้ดูแลเครื่องมือแต่ละตัว">
            ✦ ให้ CEO จัดผู้รับผิดชอบ
          </button>
        </div>
        <div className="oc-tip">
          CEO เลือกเอเจนต์ C-level ที่เหมาะกับเครื่องมือแต่ละตัว — ถ้ายังไม่มีตำแหน่งที่ต้องการ CEO จะสร้างให้อัตโนมัติ (ปรับเองได้จาก dropdown)
        </div>
        <div className="tool-owner-grid">
          {TOOL_SPECS.map(t => {
            const owner = c.agents.find(a => a.id === (c.toolOwners ?? {})[t.id]);
            return (
              <div key={t.id} className="tool-owner-row">
                <div className="tool-owner-info">
                  <span className="tool-owner-tool">{t.icon} {t.label}</span>
                  <span className="tool-owner-desc">{t.desc}</span>
                </div>
                <div className="tool-owner-side">
                  {owner
                    ? <span className="tool-owner-agent" style={{ color: owner.color }}>{owner.avatar} {owner.role} · {owner.name}</span>
                    : <span className="tool-owner-agent none">ยังไม่มีผู้รับผิดชอบ</span>}
                  <select className="tool-owner-sel" value={owner?.id ?? ''} onChange={e => setToolOwner(t.id, e.target.value)}>
                    <option value="">— เลือกเอเจนต์ —</option>
                    {c.agents.map(a => <option key={a.id} value={a.id}>{a.role} · {a.name}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="ai-2col">
        {/* ===== ทีมเอเจนต์ ===== */}
        <section className="ai-panel">
          <div className="ai-panel-hd">
            👥 ทีมเอเจนต์ AI
            <button className="ai-suggest-btn" onClick={ceoProposeNames} disabled={c.agents.length === 0}
              title="CEO เสนอชื่อเรียกแต่ละตำแหน่ง — บอร์ด (คุณ) เลือกหรืออนุมัติก่อนบันทึก">
              ✦ CEO เสนอชื่อเอเจนต์
            </button>
          </div>
          {(nameMsg || nameProposals.length > 0) && (
            <div className="name-prop-panel">
              {nameMsg && <div className="name-prop-msg">{nameMsg}</div>}
              {nameProposals.map(p => (
                <div key={p.agentId} className="name-prop-row">
                  <span className="name-prop-role" style={{ color: p.color }}>{p.avatar} {p.role}</span>
                  <span className="name-prop-cur">ปัจจุบัน: {p.current}</span>
                  <span className="name-prop-opts">
                    {p.options.map(n => (
                      <button key={n} className="name-prop-opt" onClick={() => approveName(p.agentId, n)}
                        title={`อนุมัติชื่อ "${n}"`}>{n}</button>
                    ))}
                    <button className="name-prop-keep" onClick={() => keepName(p.agentId)}>คงชื่อเดิม</button>
                  </span>
                </div>
              ))}
              {nameProposals.length > 1 && (
                <button className="name-prop-all" onClick={approveAllFirstNames}>
                  ✅ อนุมัติตัวเลือกแรกทั้งหมด ({nameProposals.length} ตำแหน่ง)
                </button>
              )}
            </div>
          )}
          <div className="ai-agent-list">
            {c.agents.map(a => (
              <div key={a.id} className="ai-agent" style={{ borderLeftColor: a.color }}>
                <button className="ai-agent-del" onClick={() => fireAgent(a.id)} title="เลิกจ้าง">×</button>
                <div className="ai-agent-top">
                  <div className="ai-agent-av" style={{ background: a.color + '22' }}>{a.avatar}</div>
                  <div className="ai-agent-id">
                    <input className="ai-agent-role" defaultValue={a.role} key={'r' + a.id + a.role}
                      onBlur={e => saveAgent(a.id, 'role', e.target.value)} spellCheck={false} />
                    <input className="ai-agent-name" defaultValue={a.name} key={'nm' + a.id + a.name}
                      onBlur={e => saveAgent(a.id, 'name', e.target.value)} spellCheck={false} />
                  </div>
                  <span className={`ai-badge st-${a.status}${c.running && a.status === 'working' ? ' pulse' : ''}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <textarea className="ai-agent-mandate" rows={2} defaultValue={a.mandate} key={'m' + a.id + a.mandate}
                  onBlur={e => saveAgent(a.id, 'mandate', e.target.value)}
                  onChange={e => autoH(e.target)} ref={el => autoH(el)} spellCheck={false} />

                {/* C-level ขอเพิ่ม M-level (กำหนดบทบาทเอง → CEO เสนอบอร์ด → อนุมัติแล้วสร้าง agent ทันที) */}
                {isCLevel(a.role) && (
                  mReq?.agentId === a.id ? (
                    <div className="mreq-form">
                      <div className="mreq-hd">🧑‍💼 {a.role} ขอเพิ่มตำแหน่ง M-level</div>
                      <select className="mreq-sel"
                        value={mReq.custom ? M_CUSTOM : mReq.role}
                        onChange={e => {
                          if (e.target.value === M_CUSTOM) {
                            setMReq({ ...mReq, custom: true, role: '', mandate: `บทบาทหน้าที่ที่ ${a.role} กำหนด: ` });
                          } else {
                            const s = mSuggestionsFor(a.role).find(x => x.role === e.target.value);
                            if (s) setMReq({ ...mReq, custom: false, role: s.role, mandate: s.mandate });
                          }
                        }}>
                        {mSuggestionsFor(a.role).map(s => <option key={s.role} value={s.role}>{s.role}</option>)}
                        <option value={M_CUSTOM}>✏️ กำหนดตำแหน่งเอง…</option>
                      </select>
                      {mReq.custom && (
                        <input className="mreq-role-inp" placeholder="ชื่อตำแหน่ง เช่น Customer Success Manager"
                          value={mReq.role} onChange={e => setMReq({ ...mReq, role: e.target.value })} />
                      )}
                      <textarea className="mreq-mandate" rows={3} value={mReq.mandate}
                        onChange={e => setMReq({ ...mReq, mandate: e.target.value })}
                        placeholder="บทบาทหน้าที่ของตำแหน่งนี้ (ใช้เป็นข้อมูลสร้าง AI Agent)" spellCheck={false} />
                      <div className="mreq-actions">
                        <button className="mreq-submit" onClick={() => requestMLevel(a, mReq.role, mReq.mandate)}
                          disabled={!mReq.role.trim() || !mReq.mandate.trim()}>
                          📨 ส่งขออนุมัติ (CEO เสนอบอร์ด)
                        </button>
                        <button className="mreq-cancel" onClick={() => setMReq(null)}>ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    <button className="mreq-btn" onClick={() => {
                      const s = mSuggestionsFor(a.role)[0];
                      setMReq({ agentId: a.id, role: s.role, mandate: s.mandate, custom: false });
                    }} title={`${a.role} ขอเพิ่มตำแหน่งระดับ Manager ใต้บังคับบัญชา — ต้องผ่านบอร์ดอนุมัติ`}>
                      🧑‍💼 ขอเพิ่ม M-level
                    </button>
                  )
                )}
                {isSupabaseEnabled && (
                  <button
                    className={`agent-run-now-btn${runningAgentId === a.id ? ' running' : ''}`}
                    onClick={() => runAgentNow(a.id)}
                    disabled={runningAgentId !== null}
                    title={`ให้ ${a.role} ทำงานตามบทบาทหน้าที่ทันที`}
                  >
                    {runningAgentId === a.id
                      ? <><span className="ai-exec-dot pulse" style={{ background: a.color }} />{'กำลังทำงาน…'}</>
                      : <><span style={{ marginRight: 4 }}>{a.avatar}</span>{`▶ ให้ ${a.role} ทำงาน`}</>}
                  </button>
                )}
                <div className="ai-agent-foot">
                  <label>สมอง (LLM)
                    <select value={a.model} onChange={e => saveAgent(a.id, 'model', e.target.value)}>
                      {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label>รายงานต่อ
                    <select value={a.reportsTo ?? ''} onChange={e => saveAgent(a.id, 'reportsTo', e.target.value)}>
                      <option value="">บอร์ด (คุณ)</option>
                      {c.agents.filter(o => o.id !== a.id).map(o => <option key={o.id} value={o.id}>{o.role}</option>)}
                    </select>
                  </label>
                  <label>สถานะ
                    <select value={a.status} onChange={e => saveAgent(a.id, 'status', e.target.value)}>
                      <option value="working">กำลังทำงาน</option>
                      <option value="idle">ว่าง</option>
                      <option value="waiting">รออนุมัติ</option>
                    </select>
                  </label>
                </div>

                {/* Knowledge Base แผนก */}
                <details className="ai-kb-detail" open={kbEditId === a.id}>
                  <summary className="ai-kb-summary" onClick={() => setKbEditId(kbEditId === a.id ? null : a.id)}>
                    📚 Knowledge Base — {a.role}
                    {a.knowledgeBase && <span className="ai-kb-dot" />}
                  </summary>
                  <textarea
                    className="ai-kb-body"
                    placeholder="ป้อนความรู้ นโยบาย SOP และบริบทที่ AI Agent นี้ต้องรู้…"
                    defaultValue={a.knowledgeBase ?? ''}
                    key={'kb-' + a.id}
                    onBlur={e => saveAgent(a.id, 'knowledgeBase', e.target.value)}
                    rows={4}
                    spellCheck={false}
                  />
                </details>

                {/* SEO: ปุ่ม Auto Revenue Model */}
                {a.role.toLowerCase().includes('seo') && isSupabaseEnabled && (
                  <button
                    className="ai-seo-rev-btn"
                    onClick={() => runSeoRevenueModel(a.id)}
                    disabled={runningTaskIds.size > 0}
                    title="SEO Agent รัน Revenue Model อัตโนมัติ"
                  >
                    📊 Auto Revenue Model (SEO)
                  </button>
                )}
              </div>
            ))}
            <button className="ai-hire" onClick={hireAgent}>＋ จ้างเอเจนต์ใหม่</button>
          </div>
        </section>

        {/* ===== ฟีดงานสด ===== */}
        <section className="ai-panel">
          <div className="ai-panel-hd">📡 ฟีดงานสด · Heartbeat ทุก {fmtHeartbeat(c.heartbeatSec)}</div>
          <div className="ai-feed" ref={feedRef}>
            {!c.running && <div className="ai-feed-empty">กด “เริ่มให้ทีม AI ทำงาน” เพื่อดูทีมลงมือทำงานแบบเรียลไทม์</div>}
            {c.running && feed.length === 0 && <div className="ai-feed-empty">กำลังเริ่มต้น…</div>}
            {feed.map(f => (
              <div key={f.id} className="ai-feed-row">
                <span className="ai-feed-time">{f.time}</span>
                <span className="ai-feed-dot" style={{ background: f.color }} />
                <span className="ai-feed-text">{f.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== บอร์ดอนุมัติ ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🏛️ กล่องอนุมัติของบอร์ด (คุณ)</div>
        <div className="ai-approvals">
          {c.approvals.length === 0 && <div className="ai-feed-empty">ยังไม่มีเรื่องรออนุมัติ</div>}
          {c.approvals.map(ap => (
            <div key={ap.id} className={`ai-approval st-${ap.status}`}>
              <div className="ai-approval-main">
                <div className="ai-approval-title">{ap.title}</div>
                <div className="ai-approval-detail">{ap.detail}</div>
                <div className="ai-approval-meta">
                  <span className="ai-approval-from">เสนอโดย {agentName(ap.agentId)}</span>
                  <span className="ai-approval-impact">{fmtImpact(ap.impact)}</span>
                </div>
              </div>
              <div className="ai-approval-actions">
                {ap.status === 'pending' ? (
                  <>
                    <button className="ai-btn-approve" onClick={() => decideApproval(ap.id, 'approved')}>อนุมัติ</button>
                    <button className="ai-btn-reject" onClick={() => decideApproval(ap.id, 'rejected')}>ปฏิเสธ</button>
                  </>
                ) : (
                  <span className={`ai-decided ${ap.status}`}>{ap.status === 'approved' ? '✓ อนุมัติแล้ว' : '✕ ปฏิเสธแล้ว'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CEO รายงานบอร์ด — รวมผลงาน AI Agent (review) → ขออนุมัติขั้นต่อไป ===== */}
      {(() => {
        const rev = reviewTasks(c);
        const groups = reportByPosition(c);
        const next = nextStepTasks(c);
        const doneCount = c.tasks.filter(t => t.status === 'done').length;
        if (rev.length === 0 && !boardReportMsg) return null;
        return (
          <section className="ai-panel brd" style={{ marginTop: 16 }}>
            <div className="ai-panel-hd">🧑‍💼 CEO รายงานบอร์ด
              <span className="brd-count">{rev.length} งานรอพิจารณา</span>
            </div>
            <div className="brd-sub">
              AI Agent ดำเนินงานเสร็จ ระบบอัปเดตสถานะเป็น "ตรวจสอบ" อัตโนมัติ — CEO รวมผลเสนอบอร์ดเพื่ออนุมัติดำเนินการขั้นถัดไป
            </div>

            {groups.length > 0 && (
              <div className="brd-groups">
                {groups.map(g => (
                  <div key={g.agentId} className="brd-group">
                    <div className="brd-role" style={{ color: g.color }}>▸ {g.role} · {g.name} <span>({g.tasks.length})</span></div>
                    <ul className="brd-tasks">
                      {g.tasks.map(t => (
                        <li key={t.id}>
                          <span className="brd-t-title">{t.title}</span>
                          {t.output && <span className="brd-t-out">— {t.output.replace(/\s+/g, ' ').slice(0, 90)}{t.output.length > 90 ? '…' : ''}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="brd-summary">
              เสร็จสมบูรณ์ {doneCount} · รอบอร์ด {rev.length} · คิวถัดไป {next.length}
            </div>

            <div className="brd-actions">
              <button className="brd-btn" onClick={ceoReportToBoard} disabled={rev.length === 0}>
                📊 CEO รายงานบอร์ด & ขออนุมัติ
              </button>
              <button className="brd-btn approve" onClick={boardApproveAllReview} disabled={rev.length === 0}>
                ✅ บอร์ดอนุมัติทั้งหมด & ไปขั้นต่อไป
              </button>
              <button className="brd-btn ghost" onClick={async () => {
                try { await navigator.clipboard.writeText(boardReportText(c)); setBoardReportMsg('📋 คัดลอกรายงานแล้ว'); }
                catch { setBoardReportMsg('คัดลอกไม่สำเร็จ'); }
              }} disabled={rev.length === 0}>📋 คัดลอกรายงาน</button>
            </div>
            {boardReportMsg && <div className="brd-msg">{boardReportMsg}</div>}
          </section>
        );
      })()}

      {/* ===== กระดานงาน ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🗂️ กระดานงานของทีม
          <button className="ai-mini-add" onClick={addTask}>＋ เพิ่มงาน</button>
        </div>
        <div className="ai-board">
          {TASK_COLS.map(col => (
            <div key={col.key} className="ai-board-col">
              <div className="ai-board-col-hd" style={{ color: col.color }}>{col.hd}
                <span className="ai-board-count">{c.tasks.filter(t => t.status === col.key).length}</span>
              </div>
              {c.tasks.filter(t => t.status === col.key).map(t => {
                const ag = c.agents.find(a => a.id === t.agentId);
                const isRunning = runningTaskIds.has(t.id);
                const needsApproval = !!t.requiresApproval;
                return (
                  <div key={t.id} className={`ai-task${needsApproval ? ' ai-task-locked' : ''}`}>
                    <div className="ai-task-top-row">
                      <button className="ai-task-del" onClick={() => delTask(t.id)}>×</button>
                      <button
                        className={`ai-task-lock-btn${needsApproval ? ' locked' : ''}`}
                        title={needsApproval ? 'ต้องอนุมัติก่อนรัน — คลิกเพื่อปลดล็อก' : 'คลิกเพื่อตั้งให้ต้องอนุมัติก่อนรัน'}
                        onClick={() => patch({ tasks: c.tasks.map(tt => tt.id === t.id ? { ...tt, requiresApproval: !tt.requiresApproval } : tt) })}
                      >{needsApproval ? '🔒' : '🔓'}</button>
                      <button
                        className={`ai-task-lock-btn${t.useWebSearch ? ' locked' : ''}`}
                        title={
                          !canWebSearch
                            ? '🌐 Web Search — ต้องการแพ็กเกจ Growth หรือสูงกว่า'
                            : t.useWebSearch
                              ? 'Web Search เปิดอยู่ — คลิกเพื่อปิด (Google Search)'
                              : 'คลิกเพื่อเปิด Web Search real-time (Serper.dev / Google)'
                        }
                        onClick={() => {
                          if (!canWebSearch) return;
                          patch({ tasks: c.tasks.map(tt => tt.id === t.id ? { ...tt, useWebSearch: !tt.useWebSearch } : tt) });
                        }}
                        style={{ opacity: canWebSearch ? (t.useWebSearch ? 1 : 0.45) : 0.2, cursor: canWebSearch ? 'pointer' : 'not-allowed' }}
                      >🌐</button>
                    </div>
                    {needsApproval && (
                      <div className="ai-task-approval-badge">Human Approval Required</div>
                    )}
                    <div className="ai-task-title">{t.title}</div>
                    <div className="ai-task-detail">{t.detail}</div>
                    {/* ปุ่มให้ AI ดำเนินงานจริง */}
                    {isSupabaseEnabled && t.status !== 'done' && (
                      needsApproval ? (
                        <button
                          className="ai-task-approve-run"
                          onClick={() => {
                            patch({ tasks: c.tasks.map(tt => tt.id === t.id ? { ...tt, requiresApproval: false } : tt) });
                            executeTask(t.id);
                          }}
                          disabled={isRunning}
                        >
                          ✅ อนุมัติ & รัน
                        </button>
                      ) : (
                        <button
                          className={`ai-task-exec${isRunning ? ' running' : ''}`}
                          onClick={() => executeTask(t.id)}
                          disabled={isRunning}
                          style={{ borderLeftColor: ag?.color }}
                        >
                          {isRunning
                            ? <><span className="ai-exec-dot pulse" style={{ background: ag?.color }} />{'กำลังดำเนินงาน…'}</>
                            : <><span style={{ marginRight: 4 }}>{ag?.avatar ?? '🤖'}</span>{`${ag?.role ?? 'AI'} ดำเนินงาน`}</>
                          }
                        </button>
                      )
                    )}
                    {/* ผลลัพธ์จาก AI Agent */}
                    {t.output && (
                      <div className="ai-task-output">
                        {t.executedAt && <div className="ai-task-output-meta">{ag?.role} · {t.executedAt}</div>}
                        <div className="ai-task-output-body">{t.output}</div>
                      </div>
                    )}
                    <div className="ai-task-foot">
                      <span className="ai-task-owner" style={{ color: ag?.color }}>{agentName(t.agentId)}</span>
                      <select className="ai-task-move" value={t.status} onChange={e => moveTask(t.id, e.target.value as TaskStatus)}>
                        <option value="queued">ต้องทำ</option>
                        <option value="in_progress">กำลังทำ</option>
                        <option value="review">ตรวจสอบ</option>
                        <option value="done">เสร็จแล้ว</option>
                        <option value="blocked">ถูกบล็อก</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* System Error Log */}
        {errorLog.length > 0 && (
          <div className="ai-error-log">
            <div className="ai-error-log-hd">
              <span className="ai-error-dot" />
              System Alerts — {errorLog.length} รายการ
              <button className="ai-error-clear" onClick={() => setErrorLog([])}>ล้าง</button>
            </div>
            {errorLog.slice(0, 5).map((e, i) => (
              <div key={i} className="ai-error-row">
                <span className="ai-error-time">{e.time}</span>
                <span className="ai-error-task">{e.taskTitle}</span>
                <span className="ai-error-msg">{e.msg}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Integrations (แยก ระบบดูแลให้ vs เชื่อมบัญชีคุณเอง · เก็บ secret ปลอดภัย per-workspace) ===== */}
      <Integrations wsId={wsId ?? null} />

      {/* ===== HRD Skill Plan ===== */}
      {(() => {
        const hrdAgent = c.agents.find(a => /hrd|hr manager/i.test(a.role));
        return (
          <section className="ai-panel" style={{ marginTop: 16 }}>
            <div className="ai-panel-hd">
              🎓 HRD Skill Plan — วางแผนพัฒนาทักษะตาม Mission
              {hrdAgent && isSupabaseEnabled && (
                <button className="ai-suggest-btn mandate-btn"
                  onClick={hrdDefineSkillPlan} disabled={hrdPlanningSkills}
                  title="HRD กำหนด Skills และกระบวนการที่ทุกตำแหน่งต้องมี">
                  {hrdPlanningSkills ? '⏳ HRD กำลังวางแผน…' : '📋 HRD กำหนด Skill Plan'}
                </button>
              )}
              {!hrdAgent && (
                <span className="hrd-no-agent-tip">⚠️ ยังไม่มี HRD — กด "ขอเพิ่ม HRD" ในผังองค์กรก่อน</span>
              )}
            </div>
            {skillPlanMsg && <div className="ai-plan-msg">{skillPlanMsg}</div>}
            {c.skillPlan.length === 0 && !skillPlanMsg && (
              <div className="ai-feed-empty">ยังไม่มี Skill Plan — อนุมัติ Mission แล้วให้ HRD กำหนด Skill Plan</div>
            )}
            {c.skillPlan.length > 0 && (
              <div className="hrd-plan-grid">
                {c.skillPlan.map((plan, i) => (
                  <div key={i} className="hrd-plan-card">
                    <div className="hrd-plan-role">🎯 {plan.role}</div>
                    <div className="hrd-plan-process">{plan.process}</div>
                    <div className="hrd-plan-kpi">📊 KPI: {plan.kpi}</div>
                    <div className="hrd-plan-skills">
                      {(plan.skills ?? []).map(sk => (
                        <span key={sk} className={`skill-chip${(c.purchasedSkills ?? []).includes(sk) ? ' owned' : ''}`}>
                          {(c.purchasedSkills ?? []).includes(sk) ? '✓ ' : ''}{sk}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* ===== HRD Competency Assessment Dashboard ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">
          📊 Competency Assessment Dashboard — HRD ออกแบบการประเมิน
          {isSupabaseEnabled && (
            <button className="ai-suggest-btn"
              onClick={hrdDesignCompetencyAssessment} disabled={designingCompetency}
              title="HRD กำหนดระดับ Competency และวิธีประเมินสำหรับทุกตำแหน่ง">
              {designingCompetency ? '⏳ HRD กำลังออกแบบ…' : '🔬 HRD ออกแบบการประเมิน'}
            </button>
          )}
        </div>
        {competencyMsg && <div className="ai-plan-msg">{competencyMsg}</div>}
        {(c.competencyMap ?? []).length === 0 && !competencyMsg && (
          <div className="ai-feed-empty">ยังไม่มี Competency Framework — กำหนด Skill Plan แล้วให้ HRD ออกแบบการประเมิน</div>
        )}
        {(c.competencyMap ?? []).length > 0 && (
          <div className="competency-grid">
            {(c.competencyMap ?? []).map((rc, i) => (
              <div key={i} className="competency-card">
                <div className="competency-role">🎯 {rc.role}</div>
                <div className="competency-skills">
                  {(rc.competencies ?? []).map((cs, j) => {
                    const LEVEL_LABELS = ['ไม่มี', 'Novice', 'Developing', 'Proficient', 'Expert'];
                    const LEVEL_COLORS = ['#9ca3af', '#6b7280', '#a05c1a', '#1a4f8a', '#2d6a4f'];
                    return (
                      <div key={j} className="competency-item">
                        <div className="competency-skill-name">{cs.skillId}</div>
                        <div className="competency-level-wrap">
                          {[1,2,3,4].map(lv => (
                            <div key={lv} className={`competency-level-dot${cs.level >= lv ? ' filled' : ''}`}
                              style={cs.level >= lv ? { background: LEVEL_COLORS[cs.level] } : {}} />
                          ))}
                          <span className="competency-level-label" style={{ color: LEVEL_COLORS[cs.level] }}>
                            {LEVEL_LABELS[cs.level]}
                          </span>
                        </div>
                        <div className="competency-criteria">{cs.criteria}</div>
                        <div className="competency-method">📝 {cs.assessMethod}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 🧠 CEO เลือก Skill พัฒนาธุรกิจ (agentic) ===== */}
      <SkillAdvisor
        recs={recommendSkills(data, [...SKILL_CATALOG, ...adminSkillList])}
        onPick={sk => { setMktCategory(sk.category); setBuyConfirm(sk); }}
      />

      {/* ===== 🛒 Skill Marketplace ===== */}
      {(() => {
        const purchased = c.purchasedSkills ?? [];
        const allSkills = [...SKILL_CATALOG, ...adminSkillList];
        const xp = c.skillXP ?? 0;
        const level = getCompanyLevel(xp);
        const nextLevel = COMPANY_LEVELS.find(l => l.min > xp);
        const xpToNext = nextLevel ? nextLevel.min - xp : 0;
        const progressPct = nextLevel
          ? Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100)
          : 100;
        const totalValue = purchased.reduce((s, id) => {
          const sk = allSkills.find(sk => sk.id === id);
          return s + (sk?.price ?? 0);
        }, 0);
        const filtered = allSkills
          .filter(sk =>
            (mktCategory === 'all' || sk.category === mktCategory) &&
            (mktTier === 0 || sk.tier === mktTier))
          // Skill ที่เสนอโดยบริษัทขึ้นก่อนเสมอ
          .sort((a, b) => Number(!!(b as SkillEntry).official) - Number(!!(a as SkillEntry).official));
        return (
          <section className="ai-panel skill-market" style={{ marginTop: 16 }}>
            {/* Header + XP Bar */}
            <div className="ai-panel-hd">
              🛒 Skill Marketplace
              <span className="skm-hd-stats">
                <span className="skm-bought">{purchased.length}/{allSkills.length} Skills</span>
                <span className="skm-value">มูลค่า ฿{totalValue.toLocaleString()}</span>
              </span>
            </div>

            {/* Level & XP Gamification Bar */}
            <div className="skm-xp-bar-wrap">
              <div className="skm-level-badge" style={{ background: level.color }}>
                {level.badge} {level.rank}
              </div>
              <div className="skm-xp-track">
                <div className="skm-xp-fill" style={{ width: progressPct + '%', background: level.color }} />
              </div>
              <div className="skm-xp-text">
                {xp.toLocaleString()} XP
                {nextLevel && <span className="skm-xp-next"> · อีก {xpToNext.toLocaleString()} XP → {nextLevel.badge} {nextLevel.rank}</span>}
              </div>
            </div>
            <div className="skm-level-desc">{level.desc}</div>

            {/* Category Progress Pills */}
            <div className="skm-cat-progress">
              {(Object.entries(CATEGORY_META) as [SkillCategory, typeof CATEGORY_META[SkillCategory]][]).map(([cat, meta]) => {
                const total = allSkills.filter(s => s.category === cat).length;
                const done = allSkills.filter(s => s.category === cat && purchased.includes(s.id)).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <button key={cat}
                    className={`skm-cat-pill${mktCategory === cat ? ' active' : ''}`}
                    style={{ '--cat-color': meta.color } as React.CSSProperties}
                    onClick={() => setMktCategory(mktCategory === cat ? 'all' : cat)}>
                    <span>{meta.icon} {meta.label}</span>
                    <span className="skm-cat-pill-pct">{done}/{total}</span>
                    <div className="skm-cat-pill-bar">
                      <div className="skm-cat-pill-fill" style={{ width: pct + '%', background: meta.color }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tier filter */}
            <div className="skm-tier-filter">
              <span className="skm-filter-lbl">กรองระดับ:</span>
              {([0, 1, 2, 3] as const).map(t => (
                <button key={t}
                  className={`skm-tier-btn${mktTier === t ? ' active' : ''}`}
                  style={mktTier === t && t !== 0 ? { background: TIER_META[t as 1|2|3]?.color, color: '#fff', borderColor: 'transparent' } : {}}
                  onClick={() => setMktTier(t)}>
                  {t === 0 ? 'ทั้งหมด' : `${TIER_META[t as 1|2|3].label} ฿${t === 1 ? '1,000' : t === 2 ? '1,500' : '2,000'}`}
                </button>
              ))}
            </div>

            {mktMsg && (
              <div className="skm-msg">{mktMsg}</div>
            )}

            {/* 🔨 ประมูล Skill จากบริษัท (English Auction) */}
            <SkillAuction wsId={wsId ?? 'local'} companyName={c.name} owned={purchased}
              payMethods={PAY_METHODS} onClaim={claimAuctionSkill} />

            {/* User Custom Skill Upload */}
            <div className="skm-custom-section">
              <div className="skm-custom-hd">
                ➕ เพิ่ม Custom Skill จากบริษัท
                <button className="skm-custom-toggle" onClick={() => setAddCustomSkillOpen(!addCustomSkillOpen)}>
                  {addCustomSkillOpen ? '▲ ซ่อนฟอร์ม' : '▼ เพิ่ม Skill ใหม่'}
                </button>
              </div>
              {addCustomSkillOpen && (
                <div className="skm-custom-form">
                  <div className="skm-custom-row">
                    <label>ชื่อ Skill <span className="req">*</span></label>
                    <input className="skm-custom-inp" placeholder="เช่น Customer Success Playbook"
                      value={customSkillDraft.name}
                      onChange={e => setCustomSkillDraft(d => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="skm-custom-row">
                    <label>คำอธิบาย <span className="req">*</span></label>
                    <input className="skm-custom-inp" placeholder="อธิบาย Skill นี้ทำอะไร ใช้ตอนไหน"
                      value={customSkillDraft.desc}
                      onChange={e => setCustomSkillDraft(d => ({ ...d, desc: e.target.value }))} />
                  </div>
                  <div className="skm-custom-row two-col">
                    <div>
                      <label>หมวดหมู่</label>
                      <select className="skm-custom-sel"
                        value={customSkillDraft.category}
                        onChange={e => setCustomSkillDraft(d => ({ ...d, category: e.target.value }))}>
                        {Object.entries(CATEGORY_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>ระดับ</label>
                      <select className="skm-custom-sel"
                        value={customSkillDraft.tier}
                        onChange={e => setCustomSkillDraft(d => ({ ...d, tier: Number(e.target.value) as 1|2|3 }))}>
                        <option value={1}>Foundation (฿1,000)</option>
                        <option value={2}>Professional (฿1,500)</option>
                        <option value={3}>Enterprise (฿2,000)</option>
                      </select>
                    </div>
                  </div>
                  <div className="skm-custom-actions">
                    <button className="skm-btn buy" onClick={submitCustomSkill}
                      disabled={!customSkillDraft.name.trim() || !customSkillDraft.desc.trim()}>
                      📨 ส่งให้ HRD ตรวจสอบ
                    </button>
                    <button className="skm-btn cancel" onClick={() => setAddCustomSkillOpen(false)}>ยกเลิก</button>
                  </div>
                  <div className="skm-custom-note">
                    🎓 Custom Skill ต้องผ่านกระบวนการ HRD เพื่อสร้างมาตรฐานการประเมิน ก่อนจะ Active ในระบบ
                  </div>
                </div>
              )}
              {/* Custom Skills pending/active list */}
              {(c.customSkills ?? []).length > 0 && (
                <div className="skm-custom-list">
                  {(c.customSkills ?? []).map(cs => (
                    <div key={cs.id} className={`skm-custom-card st-${cs.status}`}>
                      <div className="skm-custom-card-top">
                        <span className="skm-custom-card-name">{cs.name}</span>
                        <span className={`skm-custom-status st-${cs.status}`}>
                          {cs.status === 'pending_hrd' ? '⏳ รอ HRD' : cs.status === 'active' ? '✓ Active' : '✕ ปฏิเสธ'}
                        </span>
                      </div>
                      <div className="skm-custom-card-desc">{cs.desc}</div>
                      <div className="skm-custom-card-meta">
                        <span>Tier {cs.tier} · ฿{cs.price.toLocaleString()}</span>
                        <span>เพิ่มเมื่อ {cs.addedAt}</span>
                      </div>
                      {cs.hrdProcess && (
                        <details className="skm-custom-process">
                          <summary>📋 กระบวนการมาตรฐาน (HRD)</summary>
                          <pre className="skm-custom-process-body">{cs.hrdProcess}</pre>
                        </details>
                      )}
                      {cs.status === 'pending_hrd' && isSupabaseEnabled && (
                        <button className="skm-btn buy" onClick={() => hrdProcessCustomSkill(cs.id)}
                          style={{ marginTop: 6 }}>
                          🎓 ให้ HRD ออกแบบกระบวนการ
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skill Grid */}
            <div className="skm-grid">
              {filtered.map(sk => {
                const owned = purchased.includes(sk.id);
                const isConfirm = buyConfirm?.id === sk.id;
                const catMeta = CATEGORY_META[sk.category];
                const tierMeta = TIER_META[sk.tier];
                const isAdminSkill = adminSkillList.some(a => a.id === sk.id);
                const official = !!(sk as SkillEntry).official;
                const valueNote = (sk as SkillEntry).valueNote;
                return (
                  <div key={sk.id} className={`skm-card${owned ? ' owned' : ''}${isConfirm ? ' confirm' : ''}${official ? ' official' : ''}`}
                    style={{ '--card-color': catMeta.color } as React.CSSProperties}>
                    <div className="skm-card-top">
                      <span className="skm-card-icon">{sk.icon}</span>
                      {official && <span className="skm-official-badge">🏢 เสนอโดยบริษัท</span>}
                      {isAdminSkill && <span className="skm-new-badge">🆕 ใหม่</span>}
                      <span className="skm-tier-badge" style={{ background: tierMeta.bg, color: tierMeta.color }}>
                        {tierMeta.label}
                      </span>
                      {owned && <span className="skm-owned-badge">✓ โหลดแล้ว</span>}
                    </div>
                    <div className="skm-card-name">{sk.name}</div>
                    <div className="skm-card-cat" style={{ color: catMeta.color }}>{catMeta.icon} {catMeta.label}</div>
                    <div className="skm-card-desc">{sk.desc}</div>
                    <div className="skm-card-tags">
                      {sk.tags.slice(0, 3).map(t => <span key={t} className="skm-tag">{t}</span>)}
                    </div>
                    {valueNote && <div className="skm-value-note">💎 {valueNote}</div>}
                    <div className="skm-card-foot">
                      <div className="skm-price">
                        <span className="skm-price-thb">฿</span>
                        <span className="skm-price-num">{sk.price.toLocaleString()}</span>
                        <span className="skm-price-xp">+{XP_PER_TIER[sk.tier]} XP</span>
                      </div>
                      {owned ? (
                        <button className="skm-btn owned" disabled>✓ ใช้งานได้แล้ว</button>
                      ) : isConfirm ? (
                        <div className="skm-pay-box">
                          <div className="skm-pay-title">เลือกวิธีชำระเงิน ฿{sk.price.toLocaleString()}</div>
                          {PAY_METHODS.map(m => (
                            <button key={m.id} className="skm-pay-btn" onClick={() => purchaseSkill(sk, m.id)}>
                              {m.icon} {m.label}
                            </button>
                          ))}
                          <button className="skm-btn cancel" onClick={() => setBuyConfirm(null)}>ยกเลิก</button>
                        </div>
                      ) : (
                        <button className="skm-btn" onClick={() => { setMktMsg(null); setBuyConfirm(sk); }}>
                          🛒 ซื้อ Skill
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
