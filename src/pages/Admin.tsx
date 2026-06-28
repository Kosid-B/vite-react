import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import { adminListWorkspaces, type AdminWorkspace } from '../lib/workspaces';
import { isAdminEmail, ADMIN_EMAILS } from '../config';
import { PageHeader, Badge } from '../ds';
import type { AppData, WinStory, WinCategory, FeedbackEntry, FeedbackSource, FeedbackSentiment, FeedbackTheme } from '../types';

function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function baht(n: number): string {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}
function pct(n: number, d: number): string {
  return d === 0 ? '—' : (n / d * 100).toFixed(1) + '%';
}

// ---- Pricing & Cost Reference (mirrors Billing.tsx) ----
const PLAN_LIST = [
  { id: 'growth', name: 'Growth', price: 1490, cost: 1190, apiCalls: 1000 },
  { id: 'scale',  name: 'Scale',  price: 5900, cost: 4650, apiCalls: 5000 },
];

interface Competitor {
  name: string; priceTHB: number; model: string;
  focus: string; position: 'budget' | 'mid' | 'premium'; local: boolean;
}
const COMPETITORS: Competitor[] = [
  { name: 'Make (Core)',        priceTHB:  576, model: '฿576/เดือน',       focus: 'Automation workflows (no-code)',  position: 'budget',  local: false },
  { name: 'Zapier (Teams)',     priceTHB: 1764, model: '฿1,764/เดือน',     focus: 'Automation integrations',        position: 'mid',     local: false },
  { name: 'Monday.com AI',     priceTHB: 1296, model: '฿432/user × 3',    focus: 'Project management + AI',        position: 'mid',     local: false },
  { name: 'Notion AI (Teams)', priceTHB: 1728, model: '฿576/user × 3',    focus: 'Knowledge base + AI writing',    position: 'mid',     local: false },
  { name: 'Custom GPT Teams',  priceTHB: 2700, model: '฿900/user × 3',    focus: 'AI assistant (OpenAI)',          position: 'premium', local: false },
  { name: 'CEO AI Thailand',   priceTHB: 1490, model: '฿1,490/เดือน flat', focus: 'AI Company builder (Thai SME)', position: 'mid',     local: true  },
];

// Price sensitivity for Growth plan
const GROWTH_COST = 1190;
const SENSITIVITY = [999, 1290, 1490, 1790, 1990].map(p => ({
  price: p,
  profit: p - GROWTH_COST,
  marginPct: ((p - GROWTH_COST) / p) * 100,
  subsFor100k: Math.ceil(100000 / p),
  isCurrent: p === 1490,
}));

const RECS = [
  { icon: '✅', title: 'ราคา Growth ฿1,490 อยู่ในจุดหวาน', body: 'Mid-market positioning — ต่ำกว่า Notion AI Teams (฿1,728) และ Custom GPT Teams (฿2,700) แต่สูงกว่า Make (฿576) ที่ไม่มี AI Agent ฝังอยู่ Margin 20.1% ยั่งยืนในระยะเติบโต' },
  { icon: '📅', title: 'เพิ่ม Annual Plan ลด Churn', body: 'Growth Annual ฿14,900/ปี (= ฿1,242/เดือน, ส่วนลด 17%) และ Scale Annual ฿56,400/ปี — เพิ่ม cash flow ล่วงหน้าและลด monthly churn ได้ ~30%' },
  { icon: '➕', title: 'Top-up AI calls Add-on', body: 'Growth plan เพิ่ม Top-up ฿590 ต่อ 500 calls เพิ่มเติม (Margin ~37%) — usage-based revenue ที่ไม่บังคับ upgrade สร้าง NRR สูงขึ้นโดยอัตโนมัติ' },
  { icon: '💰', title: 'Scale ยังราคาต่ำเกินไป', body: 'ลูกค้า Scale (multi-company + 5,000 calls + API) มีมูลค่าสูงมาก Enterprise alternatives เริ่มที่ $200+/month ปรับ Scale เป็น ฿6,500-7,500 พร้อมเพิ่ม SLA 99.9% + dedicated support' },
  { icon: '⚠️', title: 'Van Westendorp Warning Zones', body: 'ราคาใต้ ฿800: ลูกค้า SME ตั้งคำถามเรื่องคุณภาพ / สูงกว่า ฿3,000 สำหรับ Growth: เจอ resistance ในตลาดไทย / จุดหวานที่ได้รับการทดสอบ: ฿1,290–฿1,790' },
];

// ---- Salesforce CRM Integration config ----
type SfSyncStatus = 'not_connected' | 'connected' | 'syncing' | 'error';
type SfSyncDirection = 'sf_to_app' | 'app_to_sf' | 'bidirectional';

interface SfObjectMap {
  sfObject: string;
  sfLabel: string;
  appEntity: string;
  appLabel: string;
  direction: SfSyncDirection;
  enabled: boolean;
  fields: { sfField: string; sfLabel: string; appField: string; appLabel: string }[];
}

const SF_OBJECT_MAPS: SfObjectMap[] = [
  {
    sfObject: 'Lead',     sfLabel: 'Lead',
    appEntity: 'personas', appLabel: 'Persona',
    direction: 'sf_to_app', enabled: true,
    fields: [
      { sfField: 'FirstName + LastName', sfLabel: 'ชื่อ-นามสกุล', appField: 'name',  appLabel: 'ชื่อ Persona' },
      { sfField: 'Title',               sfLabel: 'ตำแหน่ง',      appField: 'role',  appLabel: 'บทบาท' },
      { sfField: 'Description',         sfLabel: 'คำอธิบาย',     appField: 'quote', appLabel: 'Quote' },
    ],
  },
  {
    sfObject: 'Opportunity', sfLabel: 'Opportunity',
    appEntity: 'funnel',     appLabel: 'Funnel Stage',
    direction: 'sf_to_app', enabled: true,
    fields: [
      { sfField: 'StageName',    sfLabel: 'Stage',         appField: 'stageId', appLabel: 'Stage ID' },
      { sfField: 'Amount',       sfLabel: 'มูลค่าดีล',     appField: 'leads',   appLabel: 'จำนวน Leads' },
      { sfField: 'Description',  sfLabel: 'คำอธิบาย',     appField: 'note',    appLabel: 'Note' },
    ],
  },
  {
    sfObject: 'Account', sfLabel: 'Account',
    appEntity: 'marketplace', appLabel: 'Partner',
    direction: 'bidirectional', enabled: false,
    fields: [
      { sfField: 'Name',        sfLabel: 'บริษัท',   appField: 'name',     appLabel: 'ชื่อคู่ค้า' },
      { sfField: 'Industry',    sfLabel: 'อุตสาหกรรม', appField: 'category', appLabel: 'หมวดหมู่' },
      { sfField: 'Description', sfLabel: 'รายละเอียด', appField: 'desc',     appLabel: 'คำอธิบาย' },
    ],
  },
  {
    sfObject: 'Task', sfLabel: 'Task (Activity)',
    appEntity: 'actions', appLabel: 'Priority Action',
    direction: 'bidirectional', enabled: false,
    fields: [
      { sfField: 'Subject',     sfLabel: 'หัวข้อ',    appField: 'title', appLabel: 'Title' },
      { sfField: 'Description', sfLabel: 'รายละเอียด', appField: 'desc',  appLabel: 'Description' },
      { sfField: 'Status',      sfLabel: 'สถานะ',     appField: 'done',  appLabel: 'Done?' },
    ],
  },
];

const SF_SYNC_LOGS = [
  { at: '2026-06-27 09:12', object: 'Lead',        dir: 'SF → App', count: 12, status: 'ok'    as const, msg: 'Synced 12 Leads → Personas' },
  { at: '2026-06-26 18:00', object: 'Opportunity', dir: 'SF → App', count: 8,  status: 'ok'    as const, msg: 'Updated 8 Funnel stages from Opportunity pipeline' },
  { at: '2026-06-26 09:00', object: 'Lead',        dir: 'SF → App', count: 0,  status: 'warn'  as const, msg: 'No new Leads since last sync' },
  { at: '2026-06-25 14:30', object: 'Account',     dir: '—',        count: 0,  status: 'error' as const, msg: 'Object disabled — skipped' },
];

const SF_SOQL_EXAMPLES = [
  { label: 'Leads ใหม่ใน 30 วัน',   soql: "SELECT Id, FirstName, LastName, Title, Description FROM Lead WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200" },
  { label: 'Open Opportunities',     soql: "SELECT Id, Name, StageName, Amount, Description FROM Opportunity WHERE IsClosed = false AND OwnerId IN :teamIds ORDER BY CloseDate ASC LIMIT 200" },
  { label: 'Active Accounts',        soql: "SELECT Id, Name, Industry, Description, Rating FROM Account WHERE Type = 'Partner' AND Rating IN ('Hot','Warm') ORDER BY Name LIMIT 200" },
  { label: 'Open Tasks (Activities)', soql: "SELECT Id, Subject, Status, Description, OwnerId FROM Task WHERE IsClosed = false AND ActivityDate >= TODAY ORDER BY ActivityDate ASC LIMIT 200" },
];

// ---- Customer Persona (Admin-level rich data) ----
interface RichPersona {
  id: string;
  emoji: string;
  color: string;
  name: string;
  age: string;
  role: string;
  income: string;
  location: string;
  education: string;
  tech: 'ต่ำ' | 'กลาง' | 'สูง';
  plan: 'growth' | 'scale';
  portrait: string;
  values: string[];
  aspirations: string[];
  frustrations: string[];
  identity: string;
  budget: string;
  researchStyle: string;
  decisionSpeed: string;
  objections: string[];
  trigger: string;
  onlineHangouts: string[];
  offlineHangouts: string[];
  influencers: string[];
  messagingTone: string;
  attractWords: string[];
  repelWords: string[];
  keyMessage: string;
  dayInLife: string;
  voc: string[];
  validationChecks: { label: string; ok: boolean }[];
}

const CX_PERSONAS: RichPersona[] = [
  {
    id: 'somchai',
    emoji: '👔',
    color: 'var(--accent)',
    name: 'สมชาย ปัญญาดี',
    age: '38–52 ปี',
    role: 'เจ้าของ SME / กรรมการผู้จัดการ',
    income: '฿150,000–฿500,000/เดือน (บริษัทรายได้ ฿5–50M/ปี)',
    location: 'กรุงเทพ, เชียงใหม่, ขอนแก่น, ระยอง',
    education: 'ปริญญาตรี–โท (บริหาร / วิศวกรรม)',
    tech: 'กลาง',
    plan: 'growth',
    portrait: 'สมชายบริหารธุรกิจครอบครัวต่อจากรุ่นพ่อ หรือสร้างธุรกิจเองมา 10+ ปี มีพนักงาน 15–80 คน ทำงาน 10 ชั่วโมง/วัน รู้สึกว่าทุกอย่างขึ้นอยู่กับตัวเองคนเดียว และกำลังมองหาวิธี "ทำให้ระบบทำงานแทน" โดยไม่ต้องจ้างที่ปรึกษาแพงๆ',
    values: ['ความยั่งยืนของธุรกิจ', 'ความภูมิใจในผลงาน', 'อิสรภาพทางการเงิน', 'ความเป็นนายตัวเอง', 'ครอบครัวและมรดกทางธุรกิจ'],
    aspirations: ['ธุรกิจโตได้โดยไม่ต้องคุมเองทุกอย่าง', 'มีระบบ AI ทำงานแทนทีมส่วนหนึ่ง', 'ขยายไปต่างประเทศหรือ franchise ใน 3 ปี'],
    frustrations: ['ไม่มีเวลาวางแผนกลยุทธ์ — ติดอยู่กับงานประจำวัน', 'ที่ปรึกษาแพง ฿50,000+/ครั้ง แต่ได้แค่ Powerpoint', 'ไม่รู้จะใช้ AI ยังไงในบริบทธุรกิจไทย', 'ทีมขาดทักษะ ต้องสอนใหม่ตลอด', 'ข้อมูลลูกค้ากระจัดกระจาย ไม่มีภาพรวม'],
    identity: '"ฉันเป็นคนที่สร้างธุรกิจมากับมือ ไม่ใช่แค่นั่งอ่าน MBA textbook"',
    budget: '฿1,000–฿3,000/เดือน สำหรับ SaaS tools — ตัดสินใจง่ายถ้าเห็น ROI ชัดเจน',
    researchStyle: 'Google → YouTube review → ถามเพื่อนในกลุ่ม LINE ธุรกิจ → ทดลองฟรี → ซื้อ',
    decisionSpeed: 'Considered — ใช้เวลา 1–3 สัปดาห์ หลังทดลองใช้',
    objections: ['"ฉันไม่ค่อยถนัด AI เลย จะใช้ได้จริงไหม?"', '"ต้องสอนทีมงานด้วยไหม ยุ่งมาก"', '"มีระบบคล้ายๆ กันฟรีบน ChatGPT อยู่แล้ว"'],
    trigger: 'เพิ่งเสียดีลใหญ่เพราะไม่มีข้อมูลลูกค้า / เห็นคู่แข่งโตเร็วกว่า / ที่ปรึกษายื่นบิลแพงแล้วรู้สึกเสียเงินเปล่า',
    onlineHangouts: ['Facebook Group "เจ้าของธุรกิจไทย"', 'YouTube: บิสสิเนส+ / Aom Money', 'LINE OA ธุรกิจ', 'Clubhouse/Podcast ธุรกิจไทย'],
    offlineHangouts: ['งาน SMEX / DITP / หอการค้า', 'สัมมนา ThaiFranchise / SET', 'กลุ่ม BNI'],
    influencers: ['เสี่ยโป้ (เพจธุรกิจ)', 'Dr. Danai / Jiab ADGES', 'ไอดอลที่เห็นแล้วรวยจาก business systemization'],
    messagingTone: 'ตรงไปตรงมา + ผลลัพธ์เป็นตัวเลข — ไม่ต้องการ buzzword ภาษาอังกฤษมากเกินไป',
    attractWords: ['ระบบ', 'อัตโนมัติ', 'ไม่ต้องจ้างที่ปรึกษา', 'ภาษาไทย', 'ทดลองฟรี', 'ROI', 'เวลาที่ประหยัดได้'],
    repelWords: ['disruption', 'AI-powered ecosystem', 'synergy', 'pivot', 'ซับซ้อน', 'ต้องเขียนโค้ด'],
    keyMessage: '"วางแผนธุรกิจแบบมืออาชีพ ด้วย AI ที่เข้าใจ SME ไทย — ไม่ต้องจ้างที่ปรึกษา ฿50,000"',
    dayInLife: 'ตื่น 06:30 ตรวจ LINE ทีม → ประชุมลูกค้า 09:00 → ตรวจยอดขาย 12:00 → แก้ไฟ PM ชั่วโมง → ตกเย็นนึกว่า "น่าจะมีระบบดีกว่านี้" → กลับบ้าน scroll Facebook เจอ ad CEO AI → คลิกดู video → ลง trial',
    voc: [
      '"ที่ปรึกษาเอา Powerpoint มาให้ ฿80,000 แต่ฉันยังงงอยู่เลยว่าจะเอาไปทำอะไร"',
      '"อยากให้มีระบบที่บอกได้ว่าควรโฟกัสอะไรก่อน แทนที่จะต้องเดาเอง"',
      '"ChatGPT ตอบเก่ง แต่มันไม่รู้บริบทธุรกิจฉันเลย ต้องอธิบายใหม่ทุกครั้ง"',
      '"ถ้ามันช่วยประหยัดเวลาได้สัก 5 ชั่วโมง/สัปดาห์ ฿1,490 ถูกมาก"',
    ],
    validationChecks: [
      { label: 'ตรงกับลูกค้าจริง ไม่ใช่ aspirational', ok: true },
      { label: 'สามารถระบุลูกค้า 3 คนที่ตรงกับ persona นี้ได้', ok: true },
      { label: 'Pain points มาจาก feedback จริง (support tickets + survey)', ok: true },
      { label: 'Budget ฿1,490/เดือน ไม่เป็น barrier สำหรับ persona นี้', ok: true },
      { label: 'Messaging tone ตรงกับวิธีที่ลูกค้า Growth ส่วนใหญ่หาเรา', ok: true },
    ],
  },
  {
    id: 'wanna',
    emoji: '💼',
    color: 'var(--green)',
    name: 'วรรณา ชาญกิจ',
    age: '29–42 ปี',
    role: 'Business Consultant / Agency Owner / Fractional CMO',
    income: '฿80,000–฿250,000/เดือน (personal) + รายได้ค่า retainer ลูกค้า',
    location: 'กรุงเทพ, ออนไลน์ 100%',
    education: 'ปริญญาโท (MBA / Marketing / Strategy)',
    tech: 'สูง',
    plan: 'scale',
    portrait: 'วรรณาเป็น freelance consultant หรือเจ้าของ boutique agency ดูแลลูกค้า 4–12 บริษัทพร้อมกัน ทุกบริษัทต้องการ strategic roadmap แต่วรรณามีเวลาจำกัด เธอมองหาเครื่องมือที่ช่วยให้ deliver งาน high-value ได้เร็วขึ้น โดยไม่ลดคุณภาพ',
    values: ['ความเป็นมืออาชีพ', 'leverage — ทำน้อยได้มาก', 'reputation ในวงการ', 'อิสรภาพในการทำงาน', 'ผลลัพธ์ที่วัดได้'],
    aspirations: ['Scale agency ถึง ฿5M ARR โดยไม่จ้างทีมใหญ่', 'เป็น thought leader AI Strategy ในไทย', 'ลูกค้า 20+ บริษัท ด้วย productized service'],
    frustrations: ['ใช้เวลามากกับงาน repetitive (research, framework, deck)', 'ลูกค้าแต่ละเจ้าต้องการ customization — scale ยาก', 'เครื่องมือ AI ทั่วไปเป็น English-first ไม่ fit บริบท Thai client', 'ยากจะ justify ราคา retainer โดยไม่มีข้อมูลที่จับต้องได้'],
    identity: '"ฉันเป็นที่ปรึกษาที่ใช้ AI เป็น multiplier ไม่ใช่แค่คนที่ forward ChatGPT output"',
    budget: '฿5,000–฿15,000/เดือน สำหรับ tools ที่ช่วยให้ client งานได้ดีขึ้น — pass cost ไป client ได้',
    researchStyle: 'Product Hunt → LinkedIn reviews → ทดสอบ API → ดู tech stack ของ tool → ซื้อ',
    decisionSpeed: 'Fast — ตัดสินใจใน 1–7 วัน ถ้า use case ชัด',
    objections: ['"Scale plan ฿5,900 ถ้าใช้คนเดียวแพงไป — มี agency pricing ไหม?"', '"ข้อมูลลูกค้าของฉันปลอดภัยไหม ถ้าแชร์บน platform?"', '"API access ทำ custom integration ได้แค่ไหน?"'],
    trigger: 'รับ client ใหม่แต่ไม่มีเวลา onboard / ลูกค้าถาม AI strategy แต่ตอบไม่ได้ / เห็น competitor ใช้ AI deliver งานเร็วกว่า',
    onlineHangouts: ['LinkedIn', 'Twitter/X (FinTech / AI community)', 'Substack Newsletters', 'Slack communities (Thai Startup, APAC Founders)'],
    offlineHangouts: ['Techsauce Summit', 'RISE Conference', 'Bangkok Founders Meetup', 'Toastmasters'],
    influencers: ['Andrew Ng (AI)', 'Lenny Rachitsky (Product)', 'Thai Techpreneurs LinkedIn'],
    messagingTone: 'Data-driven + aspirational — ชอบเห็นตัวเลข ROI และ case study ที่ชัดเจน',
    attractWords: ['leverage', 'productized', 'API', 'white-label', 'client ROI', 'multi-workspace', 'scale without headcount'],
    repelWords: ['สำหรับมือใหม่', 'ง่ายๆ', 'ไม่ต้องรู้โค้ด', 'สำหรับ SME เล็กๆ'],
    keyMessage: '"จัดการลูกค้า 10 บริษัทในที่เดียว — deliver strategic AI roadmap ใน 1 ชั่วโมง แทน 1 สัปดาห์"',
    dayInLife: '08:00 ตรวจ dashboard ลูกค้าทุกคนใน CEO AI → 09:00 client call พร้อม live VRIO analysis → 11:00 สร้าง roadmap Q3 ให้ client ใหม่ใน 45 นาที → 14:00 ส่ง Win Story report → 16:00 pitch client ใหม่โดยใช้ competitive benchmark จากระบบ → เย็น update pricing strategy ให้ลูกค้า Scale',
    voc: [
      '"ฉันเสนอ retainer ฿35,000/เดือน แต่ใช้ CEO AI ทำงานบางส่วน — margin สูงมาก"',
      '"Multi-workspace คือ killer feature สำหรับ consultant เหมือนฉัน — ดูแลลูกค้าแยกกันชัดเจน"',
      '"ลูกค้าไม่รู้ว่าฉันใช้ AI ช่วย แต่เห็นผลงานที่ออกมาเร็วและ professional กว่าเดิมมาก"',
      '"ถ้า API documentation ดีกว่านี้อีกนิด จะ integrate กับ workflow ตัวเองได้เลย"',
    ],
    validationChecks: [
      { label: 'ตรงกับลูกค้า Scale จริง ไม่ใช่ aspirational', ok: true },
      { label: 'สามารถระบุลูกค้า 3 คนที่ตรงกับ persona นี้ได้', ok: true },
      { label: 'Pain points มาจาก support tickets + churn interviews', ok: true },
      { label: 'Scale ฿5,900/เดือน = cost of doing business สำหรับ consultant', ok: true },
      { label: 'Messaging "leverage + multi-workspace" ตรงกับ Scale conversion page', ok: false },
    ],
  },
];

interface AntiPersona {
  name: string; role: string; redFlags: string[]; whyBadFit: string[];
}
const ANTI_PERSONA: AntiPersona = {
  name: 'เกริก — Feature Chaser',
  role: 'นักศึกษา / ผู้สนใจทั่วไป ที่ยังไม่มีธุรกิจจริง',
  redFlags: [
    'ถามว่า "มี free plan ตลอดไหม?" ก่อนถามว่าระบบทำอะไรได้',
    'อยากได้ feature ทุกอย่างแต่บอกว่า "ยังไม่พร้อมจ่าย"',
    'เปรียบราคากับ ChatGPT Plus ($20) ตลอดเวลา',
    'ไม่มี business context จริง — ใช้ทดลองเฉยๆ',
    'ยกเลิก subscription ทันทีหลังเดือนแรก',
  ],
  whyBadFit: [
    'ไม่มี company / revenue จริง → ไม่ได้คุณค่าจากฟีเจอร์ business intelligence',
    'LTV ต่ำมาก — churn ทันที → COCA ไม่คุ้ม',
    'ต้องการ support มากกว่าค่าเฉลี่ย → cost center',
    'Word-of-mouth ลบ — บอกว่า "แพงสำหรับนักเรียน"',
  ],
};

const MESSAGING_FRAMEWORK = [
  {
    segment: 'สมชาย (Growth)',
    headline: 'วางแผนธุรกิจแบบมืออาชีพ ด้วย AI ที่เข้าใจ SME ไทย',
    subhead: 'แทนที่จะจ้างที่ปรึกษา ฿50,000 — ระบบช่วยวิเคราะห์ VRIO, Journey Map และ Roadmap ในภาษาไทย',
    cta: 'ทดลองฟรี 14 วัน — ไม่ต้องใส่บัตรเครดิต',
    channel: 'Facebook Ads, LINE OA, YouTube Pre-roll',
    tone: 'ตรงไปตรงมา + ผลลัพธ์เป็นตัวเลข',
  },
  {
    segment: 'วรรณา (Scale)',
    headline: 'จัดการลูกค้า 10 บริษัทในที่เดียว — deliver AI strategy ใน 1 ชั่วโมง',
    subhead: 'Multi-workspace, API access, white-label ready — สำหรับ consultant ที่ต้องการ scale โดยไม่จ้างทีม',
    cta: 'เริ่มต้น Scale Plan — ฿5,900/เดือน',
    channel: 'LinkedIn Ads, Techsauce, Referral Program',
    tone: 'Data-driven + ROI-first',
  },
];

// ---- Marketplace SEO ----
interface SeoKeyword {
  pageType: string; pattern: string; example: string; volume: string;
  competition: 'ต่ำ' | 'กลาง' | 'สูง'; intent: 'Informational' | 'Navigational' | 'Commercial' | 'Transactional';
}
const SEO_KEYWORD_MAP: SeoKeyword[] = [
  { pageType: 'Homepage',          pattern: 'Brand + primary value prop',    example: 'CEO AI Thailand — ระบบ AI สำหรับ SME',           volume: '1,200/เดือน',  competition: 'ต่ำ',  intent: 'Navigational' },
  { pageType: 'Marketplace Hub',   pattern: '[Marketplace] + [country/city]', example: 'Marketplace คู่ค้า AI ประเทศไทย',               volume: '880/เดือน',   competition: 'ต่ำ',  intent: 'Commercial' },
  { pageType: 'Category: Digital', pattern: '[บริการ] + [SME/ธุรกิจ] + ไทย', example: 'Digital Marketing agency ราคาถูก SME ไทย',      volume: '2,400/เดือน', competition: 'สูง',  intent: 'Transactional' },
  { pageType: 'Category: AI Dev',  pattern: '[AI] + [บริการ] + ไทย',         example: 'รับพัฒนา AI Chatbot ธุรกิจ ราคาเริ่มต้น',       volume: '1,900/เดือน', competition: 'กลาง', intent: 'Transactional' },
  { pageType: 'Category: Consult', pattern: '[ที่ปรึกษา] + [ด้าน] + SME',    example: 'ที่ปรึกษาธุรกิจ SME ราคาเหมาะสม',             volume: '3,100/เดือน', competition: 'สูง',  intent: 'Commercial' },
  { pageType: 'Category: Branding',pattern: '[Branding] + [ธุรกิจ/บริษัท]',  example: 'รับออกแบบ Branding บริษัท ราคา',               volume: '1,600/เดือน', competition: 'กลาง', intent: 'Transactional' },
  { pageType: 'Listing Page',      pattern: '[ชื่อคู่ค้า] + [บริการหลัก]',    example: 'Nexus Digital — Digital Marketing Agency ไทย', volume: '50–200/เดือน',competition: 'ต่ำ',  intent: 'Navigational' },
  { pageType: 'Blog: How-to',      pattern: 'วิธี + [เป้าหมาย] + SME',        example: 'วิธีเลือก Digital Marketing Agency สำหรับ SME', volume: '720/เดือน',   competition: 'ต่ำ',  intent: 'Informational' },
  { pageType: 'Blog: Cost',        pattern: 'ค่าใช้จ่าย + [บริการ] + ปี 2026', example: 'ค่าจ้าง AI Developer ปี 2026 คิดยังไง',        volume: '980/เดือน',   competition: 'ต่ำ',  intent: 'Informational' },
  { pageType: 'Blog: Compare',     pattern: '[บริการ A] vs [บริการ B]',         example: 'AI Chatbot vs Live Chat — อันไหนดีกว่าสำหรับ SME', volume: '540/เดือน', competition: 'ต่ำ', intent: 'Informational' },
];

interface SeoCategoryPriority {
  category: string; volume: number; competition: 'ต่ำ' | 'กลาง' | 'สูง';
  supply: number; priority: 'P1' | 'P2' | 'P3'; action: string;
}
const SEO_CAT_PRIORITIES: SeoCategoryPriority[] = [
  { category: 'Digital Marketing', volume: 2400, competition: 'สูง',  supply: 85, priority: 'P1', action: 'เพิ่ม intro 150 คำ + ItemList schema + internal links ไปยัง AI Dev' },
  { category: 'ที่ปรึกษาธุรกิจ',    volume: 3100, competition: 'สูง',  supply: 60, priority: 'P1', action: 'สร้าง sub-category: ERP / Strategy / Lean — หน้า category แยกต่างหาก' },
  { category: 'AI Development',     volume: 1900, competition: 'กลาง', supply: 45, priority: 'P1', action: 'Title tag: "รับพัฒนา AI ไทย | CEO AI Marketplace" + AggregateRating' },
  { category: 'Branding & Design',  volume: 1600, competition: 'กลาง', supply: 70, priority: 'P2', action: 'เพิ่ม buyer guide: "วิธีเลือก Branding Agency"' },
  { category: 'HR & Recruitment',   volume: 1200, competition: 'กลาง', supply: 30, priority: 'P2', action: 'ต้องเพิ่ม supply ก่อน (≥20 listings) ก่อน push SEO' },
  { category: 'Finance & Accounting',volume:900,  competition: 'ต่ำ',  supply: 25, priority: 'P3', action: 'Long-tail: "รับทำบัญชี SME กรุงเทพ ราคา"' },
];

const SEO_SCHEMA_TEMPLATES = [
  {
    type: 'ItemList (Category Page)',
    description: 'ใส่ใน <head> ของทุก Category page — ช่วยให้ Google แสดงรายชื่อ partners ใน search result',
    code: `{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Digital Marketing Partners — CEO AI Thailand",
  "description": "รวม Digital Marketing Agency ที่ผ่านการตรวจสอบ สำหรับ SME ไทย",
  "numberOfItems": 24,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Nexus Digital",
      "url": "https://ceoai.th/market/nexus-digital"
    }
  ]
}`,
  },
  {
    type: 'LocalBusiness (Listing Page)',
    description: 'ใส่ใน <head> ของทุก Partner listing page — แสดง stars, phone, location ใน Google',
    code: `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Nexus Digital",
  "description": "Digital Marketing Agency เชี่ยวชาญ SME ไทย",
  "url": "https://ceoai.th/market/nexus-digital",
  "address": { "@type": "PostalAddress", "addressLocality": "กรุงเทพ", "addressCountry": "TH" },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "37"
  },
  "priceRange": "฿฿"
}`,
  },
  {
    type: 'BreadcrumbList (All Pages)',
    description: 'ใส่ทุกหน้า listing — ทำให้ URL path แสดงใน search result เป็น breadcrumb',
    code: `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",             "item": "https://ceoai.th/" },
    { "@type": "ListItem", "position": 2, "name": "Marketplace",      "item": "https://ceoai.th/market" },
    { "@type": "ListItem", "position": 3, "name": "Digital Marketing","item": "https://ceoai.th/market?cat=digital" },
    { "@type": "ListItem", "position": 4, "name": "Nexus Digital",    "item": "https://ceoai.th/market/nexus-digital" }
  ]
}`,
  },
];

const SEO_CONTENT_CALENDAR = [
  { month: 'ก.ค. 2026', title: 'วิธีเลือก Digital Marketing Agency ที่เหมาะกับ SME ไทย',  keyword: 'Digital Marketing Agency SME ไทย',   target: '/market?cat=digital',   intent: 'Informational', status: 'planned'  as const },
  { month: 'ก.ค. 2026', title: 'ค่าจ้าง AI Developer ปี 2026 ในไทย — ราคาจริงจากตลาด',   keyword: 'ค่าจ้าง AI Developer ปี 2026',         target: '/market?cat=ai-dev',    intent: 'Informational', status: 'planned'  as const },
  { month: 'ส.ค. 2026', title: '10 ที่ปรึกษาธุรกิจ SME ที่คนไทยไว้ใจ (Review 2026)',       keyword: 'ที่ปรึกษาธุรกิจ SME ที่ไหนดี',         target: '/market?cat=consult',   intent: 'Commercial',    status: 'planned'  as const },
  { month: 'ส.ค. 2026', title: 'AI Chatbot vs Live Chat — SME ควรเลือกอะไร?',              keyword: 'AI Chatbot ธุรกิจ เปรียบเทียบ',        target: '/market?cat=ai-dev',    intent: 'Informational', status: 'planned'  as const },
  { month: 'ก.ย. 2026', title: 'วิธีสร้าง Branding บริษัทใหม่ด้วยงบน้อย (2026 Guide)',    keyword: 'ออกแบบ Branding บริษัท งบน้อย',       target: '/market?cat=branding',  intent: 'Informational', status: 'draft'    as const },
  { month: 'ก.ย. 2026', title: 'VRIO Analysis คืออะไร และ SME ไทยควรใช้ยังไง',            keyword: 'VRIO analysis ภาษาไทย',               target: '/vrio',                 intent: 'Informational', status: 'draft'    as const },
];

const TECH_SEO_CHECKS_INIT = [
  'Category pages มี unique title tag และ meta description',
  'Listing pages generate unique meta description จาก description ของ partner',
  'Breadcrumb navigation ใช้งานได้และมองเห็น',
  'Schema markup valid (ผ่าน Google Rich Results Test)',
  'Pagination ใช้ rel="next"/rel="prev" หรือ crawlable links',
  'Filter URL combinations ที่สร้าง thin pages ถูก noindex แล้ว',
  'XML sitemap รวม category + listing pages ทั้งหมด',
  'Page load ≤ 3 วินาที (โดยเฉพาะ category pages)',
  'Mobile responsive ทุกหน้า',
  'Canonical URL ป้องกัน duplicate listings',
];
const QUALITY_SEO_CHECKS_INIT = [
  'Keyword targets map ครบทุก page type',
  'Top 10 category pages มี H1, intro 150 คำ, และ schema',
  'Title tag formula ใช้ทั่วทุก page type',
  'Internal links เชื่อม listings → categories → homepage',
  'Content calendar มี 3–5 informational articles ต่อ Quarter',
  'Schema markup ทำครบสำหรับ listings และ reviews',
  'Technical SEO issues แก้แล้ว (duplicates, thin content, speed)',
  'XML sitemap submit และ auto-update',
  'SEO metrics track weekly/monthly',
  'Competitor rankings monitor สำหรับ priority keywords',
];

const SEO_METRICS = [
  { metric: 'Organic Traffic/เดือน',       current: 320,   target: 2000,  unit: 'visits',  tool: 'GA4' },
  { metric: 'Category Page Rankings (Top10)',current: 2,    target: 8,     unit: 'หน้า',   tool: 'GSC' },
  { metric: 'Indexed Pages',               current: 45,    target: 200,   unit: 'pages',   tool: 'GSC' },
  { metric: 'Avg. CTR (Organic)',          current: 1.8,   target: 4.5,   unit: '%',       tool: 'GSC' },
  { metric: 'Backlinks',                   current: 12,    target: 80,    unit: 'links',   tool: 'Ahrefs' },
  { metric: 'Domain Rating',              current: 8,     target: 30,    unit: 'DR',      tool: 'Ahrefs' },
];

// ---- Win Story ----
const WIN_CAT_LABEL: Record<WinCategory, string> = {
  revenue: '💰 Revenue',
  retention: '🔁 Retention',
  growth: '📈 Growth',
  transformation: '🔄 Transformation',
  efficiency: '⚡ Efficiency',
};
const WIN_CAT_COLOR: Record<WinCategory, string> = {
  revenue: 'var(--green)',
  retention: 'var(--accent)',
  growth: '#7c6aff',
  transformation: '#f59e0b',
  efficiency: '#06b6d4',
};

const BLANK_STORY: Omit<WinStory, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  customerName: '',
  category: 'efficiency',
  headlineMetric: '',
  situation: '',
  challenge: '',
  actions: ['', '', ''],
  turningPoint: '',
  metrics: [{ label: '', before: '', after: '', change: '' }],
  timeline: '',
  quote: '',
  lessons: ['', ''],
  whyItMatters: '',
  documentedBy: 'Admin',
};

const FB_SOURCES: { id: FeedbackSource; label: string }[] = [
  { id: 'survey',  label: '📋 Survey'  },
  { id: 'review',  label: '⭐ Review'  },
  { id: 'support', label: '🎫 Support' },
  { id: 'social',  label: '📱 Social'  },
  { id: 'email',   label: '📧 Email'   },
];

type FBAction = 'fix_now' | 'plan' | 'monitor' | 'celebrate';
const FB_ACTION: Record<FBAction, { emoji: string; label: string; cls: string; desc: (name: string, n: number) => string }> = {
  fix_now:   { emoji: '🔥', label: 'Fix Now',   cls: 'fb-act-fix',       desc: (name, n) => `แก้ไข "${name}" โดยด่วน — มี ${n} รายการ feedback เชิงลบ` },
  plan:      { emoji: '📅', label: 'Plan Q3',   cls: 'fb-act-plan',      desc: (name, _) => `วางแผนปรับปรุง "${name}" ใน Quarter ถัดไป` },
  monitor:   { emoji: '👁', label: 'Monitor',   cls: 'fb-act-monitor',   desc: (name, _) => `ติดตาม "${name}" ต่อไป — ยังไม่ถึง threshold เร่งด่วน` },
  celebrate: { emoji: '🎉', label: 'Celebrate', cls: 'fb-act-celebrate', desc: (name, _) => `"${name}" คือจุดแข็ง — นำไปใช้ใน marketing และ testimonials` },
};

const BLANK_FB = {
  date: '',
  source: 'survey' as FeedbackSource,
  sentiment: 'positive' as FeedbackSentiment,
  theme: '',
  content: '',
  rating: '',
};
type FbFormState = typeof BLANK_FB;

interface Props {
  currentUserEmail: string | null;
  data: AppData;
  onUpdate: (data: AppData) => void;
}
type Tab = 'dashboard' | 'finance' | 'workspaces' | 'winstories' | 'feedback' | 'pricing' | 'salesforce' | 'cxpersona' | 'seo';

export default function Admin({ currentUserEmail, data, onUpdate }: Props) {
  const admin = isAdminEmail(currentUserEmail);
  const [rows, setRows] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');

  // Simulator state
  const [nGrowth, setNGrowth] = useState(15);
  const [nScale, setNScale]   = useState(4);
  const [overhead, setOverhead] = useState(8000);

  // CLV state
  const [churnPct, setChurnPct]   = useState(5);
  const [cacGrowth, setCacGrowth] = useState(2000);
  const [cacScale, setCacScale]   = useState(8000);

  // Win Story state
  const [wsFilter, setWsFilter] = useState<WinCategory | 'all'>('all');
  const [wsView, setWsView]     = useState<WinStory | null>(null);
  const [wsEdit, setWsEdit]     = useState<(Partial<WinStory> & { id?: string }) | null>(null);

  // Pricing Strategy state
  const [valTeamSize, setValTeamSize]     = useState(5);
  const [valHourlyRate, setValHourlyRate] = useState(800);
  const [valMonthlyRev, setValMonthlyRev] = useState(500000);
  const [simNewPrice, setSimNewPrice]     = useState(1690);
  const [simRetention, setSimRetention]   = useState(85);

  // Customer Persona state
  const [cxPersonaId, setCxPersonaId] = useState<string>(CX_PERSONAS[0].id);

  // SEO Strategy state
  const [techChecks, setTechChecks]     = useState<boolean[]>(TECH_SEO_CHECKS_INIT.map(() => false));
  const [qualityChecks, setQualityChecks] = useState<boolean[]>(QUALITY_SEO_CHECKS_INIT.map(() => false));
  const [seoSchemaIdx, setSeoSchemaIdx] = useState(0);

  // Salesforce integration state
  const [sfStatus, setSfStatus]           = useState<SfSyncStatus>('not_connected');
  const [sfObjectMaps, setSfObjectMaps]   = useState<SfObjectMap[]>(SF_OBJECT_MAPS);
  const [sfExpandedObj, setSfExpandedObj] = useState<string | null>(null);
  const [sfCronMin, setSfCronMin]         = useState(60);
  const [sfSyncing, setSfSyncing]         = useState(false);

  // Feedback Analysis state
  const [fbSrc, setFbSrc]       = useState<FeedbackSource | 'all'>('all');
  const [fbThm, setFbThm]       = useState<string>('all');
  const [fbSnt, setFbSnt]       = useState<FeedbackSentiment | 'all'>('all');
  const [fbAddOpen, setFbAddOpen] = useState(false);
  const [fbNew, setFbNew]       = useState<FbFormState>(
    { ...BLANK_FB, date: new Date().toISOString().slice(0, 10) }
  );

  const winStories = data.winStories ?? [];

  function saveStory(story: Omit<WinStory, 'id'> & { id?: string }) {
    const list = [...winStories];
    if (story.id) {
      const idx = list.findIndex(s => s.id === story.id);
      if (idx >= 0) list[idx] = story as WinStory;
    } else {
      list.unshift({ ...story, id: `ws${Date.now()}` } as WinStory);
    }
    onUpdate({ ...data, winStories: list });
    setWsEdit(null);
  }

  function deleteStory(id: string) {
    if (!confirm('ลบ Win Story นี้?')) return;
    onUpdate({ ...data, winStories: winStories.filter(s => s.id !== id) });
    if (wsView?.id === id) setWsView(null);
  }

  // ---- Feedback helpers ----
  const fb      = data.feedback ?? { period: 'Q2 2026', themes: [], entries: [] };
  const fbT     = fb.themes;
  const fbE     = fb.entries;

  function addFeedback() {
    if (!fbNew.content.trim() || !fbNew.theme) return;
    const entry: FeedbackEntry = {
      id: `fb${Date.now()}`,
      date: fbNew.date || new Date().toISOString().slice(0, 10),
      source: fbNew.source,
      sentiment: fbNew.sentiment,
      theme: fbNew.theme,
      content: fbNew.content,
      ...(fbNew.rating ? { rating: Number(fbNew.rating) } : {}),
    };
    onUpdate({ ...data, feedback: { ...fb, entries: [entry, ...fbE] } });
    setFbAddOpen(false);
    setFbNew({ ...BLANK_FB, date: new Date().toISOString().slice(0, 10) });
  }

  function deleteFb(id: string) {
    if (!confirm('ลบ feedback นี้?')) return;
    onUpdate({ ...data, feedback: { ...fb, entries: fbE.filter(e => e.id !== id) } });
  }

  function updateFbTheme(id: string, key: 'impact' | 'effort', val: number) {
    const v = Math.max(1, Math.min(5, val));
    onUpdate({ ...data, feedback: { ...fb, themes: fbT.map(t => t.id === id ? { ...t, [key]: v } : t) } });
  }

  function fbPriority(t: FeedbackTheme, freq: number): FBAction {
    const te  = fbE.filter(e => e.theme === t.id);
    const tPos = te.filter(e => e.sentiment === 'positive').length;
    const tNeg = te.filter(e => e.sentiment === 'negative').length;
    const tNet = te.length > 0 ? ((tPos - tNeg) / te.length) * 100 : 0;
    const score = t.effort > 0 ? (t.impact * freq) / t.effort : 0;
    if (tNet > 30 && freq >= 3) return 'celebrate';
    if (score >= 7) return 'fix_now';
    if (score >= 4) return 'plan';
    return 'monitor';
  }

  const prioritized = [...fbT]
    .map(t => {
      const freq  = fbE.filter(e => e.theme === t.id).length;
      const score = t.effort > 0 ? (t.impact * freq) / t.effort : 0;
      const action = fbPriority(t, freq);
      return { t, freq, score, action };
    })
    .sort((a, b) => b.score - a.score);

  const fbFiltered = [...fbE]
    .filter(e => fbSrc === 'all' || e.source === fbSrc)
    .filter(e => fbThm === 'all' || e.theme === fbThm)
    .filter(e => fbSnt === 'all' || e.sentiment === fbSnt)
    .sort((a, b) => b.date.localeCompare(a.date));

  const fbPosN = fbE.filter(e => e.sentiment === 'positive').length;
  const fbNeuN = fbE.filter(e => e.sentiment === 'neutral').length;
  const fbNegN = fbE.filter(e => e.sentiment === 'negative').length;
  const fbNet  = fbE.length > 0 ? Math.round(((fbPosN - fbNegN) / fbE.length) * 100) : 0;

  function srcLabel(s: FeedbackSource) { return FB_SOURCES.find(x => x.id === s)?.label ?? s; }
  function sentIcon(s: FeedbackSentiment) { return s === 'positive' ? '😊' : s === 'neutral' ? '😐' : '😞'; }

  function triggerSfSync() {
    if (sfStatus !== 'connected') return;
    setSfSyncing(true);
    setTimeout(() => { setSfSyncing(false); }, 2200);
  }

  useEffect(() => {
    if (!admin || !isSupabaseEnabled) return;
    setLoading(true);
    adminListWorkspaces().then(r => { setRows(r); setLoading(false); });
  }, [admin]);

  if (!admin) {
    return (
      <div>
        <div className="page-header"><div className="page-title">ผู้ดูแลระบบ</div></div>
        <div className="admin-deny">
          🔒 หน้านี้สำหรับผู้ดูแลระบบเท่านั้น<br/>
          บัญชีที่เป็นแอดมิน: <b>{ADMIN_EMAILS.join(', ')}</b><br/>
          {currentUserEmail ? <>คุณกำลังใช้ <b>{currentUserEmail}</b></> : 'กรุณาเข้าสู่ระบบ'}
        </div>
      </div>
    );
  }

  // ---- Finance computations ----
  const gp = PLAN_LIST[0], sp = PLAN_LIST[1];
  const mrrG = nGrowth * gp.price;
  const mrrS = nScale * sp.price;
  const mrr = mrrG + mrrS;
  const arr = mrr * 12;
  const apiCostG = nGrowth * gp.cost;
  const apiCostS = nScale * sp.cost;
  const totalOpCost = apiCostG + apiCostS + overhead;
  const grossProfit = mrr - totalOpCost;
  const grossMargin = mrr > 0 ? (grossProfit / mrr) * 100 : 0;
  const totalSubs = nGrowth + nScale;
  const wMarginPerSub = totalSubs > 0
    ? ((nGrowth * (gp.price - gp.cost)) + (nScale * (sp.price - sp.cost))) / totalSubs
    : (gp.price - gp.cost);
  const breakEven = overhead > 0 && wMarginPerSub > 0 ? Math.ceil(overhead / wMarginPerSub) : 0;

  // ---- CLV computations ----
  const monthlyChurn = churnPct / 100;
  const lifespanMonths = monthlyChurn > 0 ? Math.round(1 / monthlyChurn) : 0;
  const gpProfit = gp.price - gp.cost;
  const spProfit = sp.price - sp.cost;
  const clvGrowth = monthlyChurn > 0 ? Math.round(gpProfit / monthlyChurn) : 0;
  const clvScale  = monthlyChurn > 0 ? Math.round(spProfit / monthlyChurn) : 0;
  const ltvcacGrowth = cacGrowth > 0 ? clvGrowth / cacGrowth : 0;
  const ltvcacScale  = cacScale  > 0 ? clvScale  / cacScale  : 0;
  const paybackGrowth = gpProfit > 0 ? Math.ceil(cacGrowth / gpProfit) : 0;
  const paybackScale  = spProfit > 0 ? Math.ceil(cacScale  / spProfit) : 0;
  const maxCacGrowth = Math.round(clvGrowth / 3);
  const maxCacScale  = Math.round(clvScale  / 3);
  const CHURN_SCENARIOS = [1, 2, 3, 5, 7, 10].map(c => ({
    c,
    lifespan: Math.round(1 / (c / 100)),
    clvG: Math.round(gpProfit / (c / 100)),
    clvS: Math.round(spProfit / (c / 100)),
    isCurrent: c === churnPct,
  }));

  const totalMembers = rows.reduce((s, r) => s + Number(r.member_count), 0);

  // ---- Dashboard computations ----
  const mktHealth = (() => {
    const goals = data.marketing?.goals ?? [];
    if (!goals.length) return 0;
    const scores = goals.map(g => {
      const isLower = g.metric.toLowerCase().includes('cac') || g.metric.toLowerCase().includes('cost');
      return isLower
        ? (g.current <= g.target ? 100 : Math.round((g.target / g.current) * 100))
        : Math.min(100, Math.round((g.current / g.target) * 100));
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  })();
  const revHealth    = Math.min(100, Math.max(0, (grossMargin / 25) * 100));
  const custHealth   = Math.min(100, (ltvcacGrowth / 3) * 100);
  const prodHealth   = Math.min(100, Math.max(0, (fbNet + 100) / 2));
  const overallScore = Math.round((revHealth + custHealth + prodHealth + mktHealth) / 4);

  // ---- Pricing Strategy computations ----
  const valTimeSaved   = valTeamSize * 8 * valHourlyRate;          // 8 hrs/person/month
  const valAiCostSaved = 5000;                                     // API + tools cost avoided
  const valRevenueUp   = Math.round(valMonthlyRev * 0.01);         // 1% revenue uplift
  const valRiskReduced = 3000;                                     // risk & compliance
  const totalValue     = valTimeSaved + valAiCostSaved + valRevenueUp + valRiskReduced;
  const recRangeLow    = Math.round(totalValue * 0.10);
  const recRangeHigh   = Math.round(totalValue * 0.20);
  const growthPct      = totalValue > 0 ? (gp.price / totalValue * 100).toFixed(1) : '—';
  const scalePct       = totalValue > 0 ? (sp.price / totalValue * 100).toFixed(1) : '—';

  const simCurrentSubs = totalSubs || 20;
  const simNewSubs     = Math.round(simCurrentSubs * (simRetention / 100));
  const simLostSubs    = simCurrentSubs - simNewSubs;
  const simNewMrr      = simNewSubs * simNewPrice + nScale * sp.price;
  const simOldMrr      = mrr > 0 ? mrr : simCurrentSubs * gp.price;
  const simMrrDelta    = simNewMrr - simOldMrr;
  const simAnnualImp   = simMrrDelta * 12;
  const simBreakEven   = simNewPrice > gp.price && (simNewPrice - gp.price) > 0
    ? Math.ceil((simLostSubs * gp.price) / (simNewPrice - gp.price))
    : 0;

  return (
    <div>
      <PageHeader
        title="ผู้ดูแลระบบ"
        meta={<>
          <Badge tone="green">แอดมิน · {currentUserEmail}</Badge>
          {isSupabaseEnabled && <Badge tone="neutral">{rows.length} เวิร์กสเปซ</Badge>}
          {isSupabaseEnabled && <Badge tone="neutral">{totalMembers} สมาชิกรวม</Badge>}
        </>}
      />

      {/* Tab bar */}
      <div className="pfa-tabs">
        <button className={`pfa-tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>
          📊 Dashboard
        </button>
        <button className={`pfa-tab${tab === 'finance' ? ' active' : ''}`} onClick={() => setTab('finance')}>
          📊 วิเคราะห์การเงิน & ราคา
        </button>
        <button className={`pfa-tab${tab === 'winstories' ? ' active' : ''}`} onClick={() => setTab('winstories')}>
          🏆 Win Stories
        </button>
        <button className={`pfa-tab${tab === 'workspaces' ? ' active' : ''}`} onClick={() => setTab('workspaces')}>
          🏢 เวิร์กสเปซ
        </button>
        <button className={`pfa-tab${tab === 'feedback' ? ' active' : ''}`} onClick={() => setTab('feedback')}>
          📝 Feedback Analysis
        </button>
        <button className={`pfa-tab${tab === 'pricing' ? ' active' : ''}`} onClick={() => setTab('pricing')}>
          💸 Pricing Strategy
        </button>
        <button className={`pfa-tab${tab === 'salesforce' ? ' active' : ''}`} onClick={() => setTab('salesforce')}>
          ☁️ Salesforce CRM
        </button>
        <button className={`pfa-tab${tab === 'cxpersona' ? ' active' : ''}`} onClick={() => setTab('cxpersona')}>
          🎯 Customer Persona
        </button>
        <button className={`pfa-tab${tab === 'seo' ? ' active' : ''}`} onClick={() => setTab('seo')}>
          🔍 SEO Strategy
        </button>
      </div>

      {/* ===== DASHBOARD TAB ===== */}
      {tab === 'dashboard' && (
        <div className="adm-dash">

          {/* Overall score banner */}
          <div className={`adm-score-banner ${overallScore >= 75 ? 'green' : overallScore >= 50 ? 'yellow' : 'red'}`}>
            <div className="adm-score-num">{overallScore}</div>
            <div className="adm-score-label">Business Health Score <span>/100</span></div>
            <div className="adm-score-hint">
              {overallScore >= 75 ? '✅ ระบบสุขภาพดี — เร่งเติบโต' : overallScore >= 50 ? '⚠️ มีจุดที่ต้องปรับปรุง' : '🔴 ต้องดำเนินการด่วน'}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="adm-kpi-grid">
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">MRR (เดือนนี้)</div>
              <div className="adm-kpi-val">{baht(mrr)}</div>
              <div className="adm-kpi-sub">ARR · {baht(arr)}</div>
              <div className={`adm-kpi-badge ${grossMargin >= 20 ? 'adm-badge-green' : grossMargin >= 10 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                Margin {grossMargin.toFixed(1)}%
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Active Subscribers</div>
              <div className="adm-kpi-val">{totalSubs} ราย</div>
              <div className="adm-kpi-sub">Growth {nGrowth} · Scale {nScale}</div>
              <div className={`adm-kpi-badge ${totalSubs >= breakEven ? 'adm-badge-green' : 'adm-badge-yellow'}`}>
                {totalSubs >= breakEven ? '✅ กำไร' : `Break-even: ${breakEven} ราย`}
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">LTV:CAC (Growth)</div>
              <div className="adm-kpi-val">{ltvcacGrowth.toFixed(1)}x</div>
              <div className="adm-kpi-sub">Payback {paybackGrowth} เดือน · Churn {churnPct}%</div>
              <div className={`adm-kpi-badge ${ltvcacGrowth >= 3 ? 'adm-badge-green' : ltvcacGrowth >= 1.5 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                {ltvcacGrowth >= 3 ? '✅ ดี (≥3x)' : ltvcacGrowth >= 1.5 ? '⚠️ ระวัง' : '🔴 ต่ำกว่าเกณฑ์'}
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Net Sentiment</div>
              <div className={`adm-kpi-val ${fbNet < 0 ? 'adm-val-red' : ''}`}>{fbNet >= 0 ? '+' : ''}{fbNet}%</div>
              <div className="adm-kpi-sub">{fbE.length} feedback · 😊 {fbPosN} 😞 {fbNegN}</div>
              <div className={`adm-kpi-badge ${fbNet >= 20 ? 'adm-badge-green' : fbNet >= 0 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                {fbNet >= 20 ? '😊 ดี' : fbNet >= 0 ? '😐 ปกติ' : '😞 ต้องปรับปรุง'}
              </div>
            </div>
          </div>

          {/* Revenue + Action Items */}
          <div className="adm-dash-2col">

            {/* Revenue Snapshot */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">💰 Revenue Snapshot</div>
              <div className="adm-rev-table">
                {[
                  { label: 'MRR',          val: baht(mrr),         ok: mrr > 0 },
                  { label: 'ARR',          val: baht(arr),         ok: arr > 0 },
                  { label: 'Gross Profit', val: baht(grossProfit), ok: grossProfit >= 0 },
                  { label: 'Op Cost/เดือน', val: baht(totalOpCost), ok: true },
                  { label: 'Break-even',   val: `${breakEven} ราย`, ok: totalSubs >= breakEven },
                ].map(r => (
                  <div key={r.label} className="adm-rev-row">
                    <span className="adm-rev-label">{r.label}</span>
                    <b className={r.ok ? '' : 'adm-val-red'}>{r.val}</b>
                  </div>
                ))}
              </div>
              <div className="adm-mix-title">แผน</div>
              {[
                { label: 'Growth', count: nGrowth, max: Math.max(nGrowth, nScale, 1), color: 'var(--accent)' },
                { label: 'Scale',  count: nScale,  max: Math.max(nGrowth, nScale, 1), color: 'var(--green)' },
              ].map(p => (
                <div key={p.label} className="adm-bar-row">
                  <span className="adm-bar-label">{p.label}</span>
                  <div className="adm-bar-bg">
                    <div className="adm-bar-fill" style={{ width: `${(p.count / p.max) * 100}%`, background: p.color }} />
                  </div>
                  <span className="adm-bar-count">{p.count} ราย</span>
                </div>
              ))}
            </div>

            {/* Action Items */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">⚡ Action Items (จาก Feedback)</div>
              <div className="adm-action-list">
                {prioritized.filter(p => p.action === 'fix_now').map(({ t, score }) => (
                  <div key={t.id} className="adm-action-item adm-ai-fix">
                    <span className="adm-ai-icon">🔥</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Fix Now · Score {score.toFixed(1)} · Impact {t.impact}/5</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'plan').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-plan">
                    <span className="adm-ai-icon">📅</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Plan Q3</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'celebrate').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-celebrate">
                    <span className="adm-ai-icon">🎉</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Celebrate — ใช้ใน marketing</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'monitor').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-monitor">
                    <span className="adm-ai-icon">👁</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Monitor</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="adm-mix-title" style={{ marginTop: 16 }}>Feedback Sentiment</div>
              {[
                { label: '😊 Positive', n: fbPosN, total: fbE.length, color: '#22c55e' },
                { label: '😐 Neutral',  n: fbNeuN, total: fbE.length, color: '#f59e0b' },
                { label: '😞 Negative', n: fbNegN, total: fbE.length, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="adm-bar-row">
                  <span className="adm-bar-label" style={{ width: 100 }}>{s.label}</span>
                  <div className="adm-bar-bg">
                    <div className="adm-bar-fill" style={{ width: `${s.total > 0 ? (s.n / s.total) * 100 : 0}%`, background: s.color }} />
                  </div>
                  <span className="adm-bar-count">{s.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Business Health Scores */}
          <div className="adm-dash-card">
            <div className="adm-dash-card-title">🏥 Business Health Breakdown</div>
            <div className="adm-health-grid">
              {[
                { label: 'Revenue Health',     score: revHealth,  hint: `Gross Margin ${grossMargin.toFixed(1)}% / Target 25%` },
                { label: 'Customer Health',    score: custHealth, hint: `LTV:CAC ${ltvcacGrowth.toFixed(1)}x / Target ≥3x` },
                { label: 'Product Sentiment',  score: prodHealth, hint: `Net Sentiment ${fbNet >= 0 ? '+' : ''}${fbNet}%` },
                { label: 'Marketing Goals',    score: mktHealth,  hint: `Goal achievement avg ${mktHealth.toFixed(0)}%` },
              ].map(h => (
                <div key={h.label} className="adm-health-item">
                  <div className="adm-health-label">{h.label}</div>
                  <div className="adm-health-track">
                    <div className="adm-health-fill" style={{
                      width: `${h.score}%`,
                      background: h.score >= 75 ? '#22c55e' : h.score >= 50 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                  <div className="adm-health-right">
                    <span className={`adm-health-pct ${h.score >= 75 ? 'green' : h.score >= 50 ? 'yellow' : 'red'}`}>{h.score.toFixed(0)}%</span>
                    <span className="adm-health-hint">{h.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Win Stories + Marketing Goals */}
          <div className="adm-dash-2col">

            {/* Win Stories */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">🏆 Win Stories by Category</div>
              {(['revenue', 'growth', 'efficiency', 'retention', 'transformation'] as const).map(cat => {
                const n = winStories.filter(s => s.category === cat).length;
                return (
                  <div key={cat} className="adm-bar-row">
                    <span className="adm-bar-label">{WIN_CAT_LABEL[cat]}</span>
                    <div className="adm-bar-bg">
                      <div className="adm-bar-fill" style={{ width: `${Math.min(100, n * 25)}%`, background: WIN_CAT_COLOR[cat] }} />
                    </div>
                    <span className="adm-bar-count">{n}</span>
                  </div>
                );
              })}
              <div className="adm-ws-total">{winStories.length} stories รวม · {rows.length} workspaces</div>
            </div>

            {/* Marketing Goals */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">🎯 Marketing Goals Progress</div>
              {(data.marketing?.goals ?? []).map(g => {
                const isLower = g.metric.toLowerCase().includes('cac') || g.metric.toLowerCase().includes('cost');
                const pv = isLower
                  ? (g.current <= g.target ? 100 : Math.round((g.target / g.current) * 100))
                  : Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <div key={g.id} className="adm-mkt-row">
                    <div className="adm-mkt-label">{g.metric}</div>
                    <div className="adm-bar-bg">
                      <div className="adm-bar-fill" style={{
                        width: `${pv}%`,
                        background: pv >= 80 ? '#22c55e' : pv >= 50 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span className="adm-mkt-pct">{pv}%</span>
                    <span className="adm-mkt-vals">{g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ===== FINANCE TAB ===== */}
      {tab === 'finance' && (
        <div className="pfa-wrap">

          {/* 1. Revenue Simulator */}
          <div className="pfa-section">
            <div className="pfa-section-title">จำลองรายได้ (Revenue Simulator)</div>
            <div className="pfa-sim-layout">
              <div className="pfa-sim-inputs">
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Growth subscribers</label>
                  <input type="number" className="pfa-sim-inp" min={0} max={999} value={nGrowth}
                    onChange={e => setNGrowth(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">ราย × ฿1,490/เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Scale subscribers</label>
                  <input type="number" className="pfa-sim-inp" min={0} max={999} value={nScale}
                    onChange={e => setNScale(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">ราย × ฿5,900/เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Fixed overhead/เดือน</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={1000} value={overhead}
                    onChange={e => setOverhead(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท (เงินเดือน, office, etc.)</span>
                </div>
              </div>
              <div className="pfa-kpi-grid">
                <div className="pfa-kpi"><div className="pfa-kpi-label">MRR</div><div className="pfa-kpi-val">{baht(mrr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">ARR</div><div className="pfa-kpi-val">{baht(arr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">กำไรขั้นต้น</div><div className="pfa-kpi-val" style={{ color: grossProfit >= 0 ? 'var(--green)' : '#ef4444' }}>{baht(grossProfit)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">Gross Margin</div><div className="pfa-kpi-val">{grossMargin.toFixed(1)}%</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">ต้นทุนรวม/เดือน</div><div className="pfa-kpi-val">{baht(totalOpCost)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">Break-even (subs)</div><div className="pfa-kpi-val">{breakEven} ราย</div></div>
              </div>
            </div>

            {/* MRR Mix Bar */}
            <div className="pfa-mix-wrap">
              <div className="pfa-mix-label">สัดส่วน MRR: Growth vs Scale</div>
              <div className="pfa-mix-bar">
                {mrr > 0 && <div className="pfa-mix-g" style={{ width: `${(mrrG / mrr) * 100}%` }} />}
                {mrr > 0 && <div className="pfa-mix-s" style={{ width: `${(mrrS / mrr) * 100}%` }} />}
              </div>
              <div className="pfa-mix-legend">
                <span><span className="pfa-dot-g" /> Growth {baht(mrrG)} ({pct(mrrG, mrr)})</span>
                <span><span className="pfa-dot-s" /> Scale {baht(mrrS)} ({pct(mrrS, mrr)})</span>
              </div>
            </div>
          </div>

          {/* 2. Margin by Plan */}
          <div className="pfa-section">
            <div className="pfa-section-title">Margin ต่อ Plan</div>
            <div className="pfa-margin-grid">
              {PLAN_LIST.map(p => {
                const m = ((p.price - p.cost) / p.price) * 100;
                return (
                  <div key={p.id} className="pfa-margin-card">
                    <div className="pfa-margin-name">{p.name}</div>
                    <div className="pfa-margin-row"><span>ราคา</span><b>{baht(p.price)}/เดือน</b></div>
                    <div className="pfa-margin-row"><span>ต้นทุน</span><b>{baht(p.cost)}</b></div>
                    <div className="pfa-margin-row"><span>กำไร/ราย</span><b style={{ color: 'var(--green)' }}>{baht(p.price - p.cost)}</b></div>
                    <div className="pfa-margin-bar-bg">
                      <div className="pfa-margin-bar-fill" style={{ width: `${m}%` }} />
                    </div>
                    <div className="pfa-margin-pct">{m.toFixed(1)}% Margin</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Competitive Benchmark */}
          <div className="pfa-section">
            <div className="pfa-section-title">เปรียบเทียบกับคู่แข่ง (Competitive Benchmark)</div>
            <table className="pfa-comp-table">
              <thead>
                <tr>
                  <th>ผลิตภัณฑ์</th>
                  <th className="pfa-num">ราคา/เดือน</th>
                  <th>โมเดล</th>
                  <th>จุดเน้น</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={i} className={c.local ? 'pfa-comp-us' : ''}>
                    <td>{c.name}{c.local && <span className="pfa-us-badge">เรา</span>}</td>
                    <td className="pfa-num">{baht(c.priceTHB)}</td>
                    <td>{c.model}</td>
                    <td className="pfa-comp-focus">{c.focus}</td>
                    <td><span className={`pfa-pos-badge pfa-pos-${c.position}`}>{c.position}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Price Sensitivity */}
          <div className="pfa-section">
            <div className="pfa-section-title">Price Sensitivity What-If — Growth Plan</div>
            <table className="pfa-sens-table">
              <thead>
                <tr>
                  <th>ราคา/เดือน</th>
                  <th className="pfa-num">กำไร/ราย</th>
                  <th className="pfa-num">Margin %</th>
                  <th className="pfa-num">subs ต้องการถึง ฿100K MRR</th>
                </tr>
              </thead>
              <tbody>
                {SENSITIVITY.map(s => (
                  <tr key={s.price} className={s.isCurrent ? 'pfa-sens-cur' : ''}>
                    <td>{baht(s.price)}/เดือน {s.isCurrent && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="pfa-num">{baht(s.profit)}</td>
                    <td className="pfa-num">{s.marginPct.toFixed(1)}%</td>
                    <td className="pfa-num">{s.subsFor100k} ราย</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. CLV Analysis */}
          <div className="pfa-section">
            <div className="pfa-section-title">Customer Lifetime Value (CLV) Analysis</div>
            <div className="pfa-sim-layout">
              <div className="pfa-sim-inputs">
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Monthly Churn Rate</label>
                  <input type="number" className="pfa-sim-inp" min={0.1} max={50} step={0.5} value={churnPct}
                    onChange={e => setChurnPct(Math.max(0.1, +e.target.value))} />
                  <span className="pfa-sim-unit">% ต่อเดือน → อายุ {lifespanMonths} เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">CAC Growth plan</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={100} value={cacGrowth}
                    onChange={e => setCacGrowth(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท ต้นทุนหาลูกค้า 1 ราย</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">CAC Scale plan</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={100} value={cacScale}
                    onChange={e => setCacScale(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท ต้นทุนหาลูกค้า 1 ราย</span>
                </div>
              </div>

              <div className="clv-plan-grid">
                {[
                  { plan: 'Growth', clv: clvGrowth, cac: cacGrowth, ratio: ltvcacGrowth, payback: paybackGrowth, maxCac: maxCacGrowth },
                  { plan: 'Scale',  clv: clvScale,  cac: cacScale,  ratio: ltvcacScale,  payback: paybackScale,  maxCac: maxCacScale },
                ].map(p => {
                  const zone = p.ratio >= 3 ? 'ok' : p.ratio >= 1 ? 'warn' : 'bad';
                  const needlePct = Math.min(95, (p.ratio / 6) * 100);
                  return (
                    <div key={p.plan} className="clv-card">
                      <div className="clv-plan-name">{p.plan}</div>
                      <div className="clv-row"><span>CLV</span><b>{baht(p.clv)}</b></div>
                      <div className="clv-row"><span>CAC</span><b>{baht(p.cac)}</b></div>
                      <div className="clv-row"><span>LTV:CAC</span><b>{p.ratio.toFixed(2)}x</b></div>
                      <div className="clv-gauge-wrap">
                        <div className="clv-gauge-bar">
                          <div className="clv-gauge-danger" />
                          <div className="clv-gauge-warn" />
                          <div className="clv-gauge-ok" />
                          <div className="clv-gauge-needle" style={{ left: `${needlePct}%` }} />
                        </div>
                        <div className={`clv-gauge-label clv-gauge-${zone}`}>
                          {zone === 'ok' ? '✅ ดีมาก (≥3x)' : zone === 'warn' ? '⚠️ ระวัง (1–3x)' : '🔴 อันตราย (<1x)'}
                        </div>
                      </div>
                      <div className="clv-row"><span>Payback</span><b>{p.payback} เดือน</b></div>
                      <div className="clv-row"><span>Max CAC (3:1)</span><b style={{ color: 'var(--accent)' }}>{baht(p.maxCac)}</b></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Churn Sensitivity */}
            <div className="clv-sens-title" style={{ marginTop: 16 }}>Churn Sensitivity — ผลกระทบต่อ CLV</div>
            <table className="pfa-sens-table">
              <thead>
                <tr>
                  <th>Churn/เดือน</th>
                  <th className="pfa-num">อายุลูกค้า</th>
                  <th className="pfa-num">CLV Growth</th>
                  <th className="pfa-num">CLV Scale</th>
                </tr>
              </thead>
              <tbody>
                {CHURN_SCENARIOS.map(s => (
                  <tr key={s.c} className={s.isCurrent ? 'pfa-sens-cur' : ''}>
                    <td>{s.c}% {s.isCurrent && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="pfa-num">{s.lifespan} เดือน</td>
                    <td className="pfa-num">{baht(s.clvG)}</td>
                    <td className="pfa-num">{baht(s.clvS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="clv-insight">
              💡 <b>Key Insight:</b> ลด Churn จาก 5% → 3% เพิ่ม CLV Growth จาก{' '}
              {baht(Math.round(gpProfit / 0.05))} → {baht(Math.round(gpProfit / 0.03))}{' '}
              (+{Math.round(((gpProfit / 0.03 - gpProfit / 0.05) / (gpProfit / 0.05)) * 100)}%) —
              Churn คือ lever ที่มีผลต่อ CLV มากที่สุดใน SaaS subscription model
            </div>
          </div>

          {/* 6. Recommendations */}
          <div className="pfa-section">
            <div className="pfa-section-title">คำแนะนำเชิงกลยุทธ์ด้านราคา</div>
            <div className="pfa-recs">
              {RECS.map((r, i) => (
                <div key={i} className="pfa-rec">
                  <div className="pfa-rec-icon">{r.icon}</div>
                  <div>
                    <div className="pfa-rec-title">{r.title}</div>
                    <div className="pfa-rec-body">{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== WIN STORIES TAB ===== */}
      {tab === 'winstories' && (
        <div className="ws-wrap">
          {/* Header */}
          <div className="ws-header">
            <div className="ws-filter-bar">
              {(['all', 'revenue', 'retention', 'growth', 'transformation', 'efficiency'] as const).map(cat => (
                <button key={cat} className={`ws-filter-btn${wsFilter === cat ? ' active' : ''}`}
                  onClick={() => setWsFilter(cat)}>
                  {cat === 'all' ? '🗂 ทั้งหมด' : WIN_CAT_LABEL[cat]}
                </button>
              ))}
            </div>
            <button className="ws-add-btn" onClick={() => { setWsView(null); setWsEdit({ ...BLANK_STORY }); }}>
              + เพิ่ม Win Story
            </button>
          </div>

          {/* Story cards */}
          {!wsEdit && !wsView && (
            <div className="ws-cards">
              {winStories.filter(s => wsFilter === 'all' || s.category === wsFilter).length === 0 && (
                <div className="ws-empty">ยังไม่มี Win Story ในหมวดนี้</div>
              )}
              {winStories.filter(s => wsFilter === 'all' || s.category === wsFilter).map(story => (
                <div key={story.id} className="ws-card">
                  <div className="ws-card-top">
                    <span className="ws-cat-badge" style={{ background: WIN_CAT_COLOR[story.category] }}>
                      {WIN_CAT_LABEL[story.category]}
                    </span>
                    <span className="ws-card-date">{story.date}</span>
                  </div>
                  <div className="ws-card-name">{story.customerName}</div>
                  <div className="ws-card-metric">{story.headlineMetric}</div>
                  <div className="ws-card-quote">"{story.quote.slice(0, 100)}{story.quote.length > 100 ? '…' : ''}"</div>
                  <div className="ws-card-actions">
                    <button className="ws-btn-view" onClick={() => { setWsEdit(null); setWsView(story); }}>ดูรายละเอียด</button>
                    <button className="ws-btn-edit" onClick={() => { setWsView(null); setWsEdit({ ...story }); }}>แก้ไข</button>
                    <button className="ws-btn-del" onClick={() => deleteStory(story.id)}>ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Story detail view */}
          {wsView && !wsEdit && (
            <div className="ws-detail">
              <div className="ws-detail-header">
                <div>
                  <span className="ws-cat-badge" style={{ background: WIN_CAT_COLOR[wsView.category] }}>{WIN_CAT_LABEL[wsView.category]}</span>
                  <span className="ws-detail-date">{wsView.date} · บันทึกโดย {wsView.documentedBy}</span>
                </div>
                <div className="ws-detail-btns">
                  <button className="ws-btn-edit" onClick={() => setWsEdit({ ...wsView })}>แก้ไข</button>
                  <button className="ws-btn-del" onClick={() => deleteStory(wsView.id)}>ลบ</button>
                  <button className="ws-btn-view" onClick={() => setWsView(null)}>← กลับ</button>
                </div>
              </div>

              <h2 className="ws-detail-name">🏆 {wsView.customerName}</h2>
              <div className="ws-detail-headline">{wsView.headlineMetric}</div>

              <div className="ws-story-grid">
                <div className="ws-story-section"><div className="ws-story-label">สถานการณ์</div><p>{wsView.situation}</p></div>
                <div className="ws-story-section"><div className="ws-story-label">ความท้าทาย</div><p>{wsView.challenge}</p></div>
                <div className="ws-story-section">
                  <div className="ws-story-label">สิ่งที่เราทำ</div>
                  <ul>{wsView.actions.filter(Boolean).map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div className="ws-story-section"><div className="ws-story-label">จุดเปลี่ยน</div><p>{wsView.turningPoint}</p></div>
              </div>

              <div className="ws-story-label" style={{ marginTop: 16 }}>ผลลัพธ์</div>
              <table className="ws-metrics-table">
                <thead><tr><th>ตัวชี้วัด</th><th>ก่อน</th><th>หลัง</th><th>เปลี่ยนแปลง</th></tr></thead>
                <tbody>
                  {wsView.metrics.filter(m => m.label).map((m, i) => (
                    <tr key={i}><td>{m.label}</td><td>{m.before}</td><td>{m.after}</td><td className="ws-change">{m.change}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="ws-story-section" style={{ marginTop: 16 }}>
                <div className="ws-story-label">Timeline</div>
                <p>{wsView.timeline}</p>
              </div>

              <div className="ws-quote-block">"{wsView.quote}"</div>

              <div className="ws-story-section">
                <div className="ws-story-label">บทเรียน</div>
                <ul>{wsView.lessons.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
              </div>
              <div className="ws-story-section">
                <div className="ws-story-label">ทำไมถึงสำคัญ</div>
                <p>{wsView.whyItMatters}</p>
              </div>
            </div>
          )}

          {/* Add/Edit form */}
          {wsEdit && (
            <div className="ws-form">
              <div className="ws-form-title">{wsEdit.id ? 'แก้ไข Win Story' : 'เพิ่ม Win Story ใหม่'}</div>
              <div className="ws-form-grid">
                <div className="ws-form-row">
                  <label>ชื่อลูกค้า</label>
                  <input className="ws-inp" value={wsEdit.customerName ?? ''} onChange={e => setWsEdit(p => ({ ...p!, customerName: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>วันที่</label>
                  <input type="date" className="ws-inp" value={wsEdit.date ?? ''} onChange={e => setWsEdit(p => ({ ...p!, date: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>หมวดหมู่</label>
                  <select className="ws-inp" value={wsEdit.category ?? 'efficiency'} onChange={e => setWsEdit(p => ({ ...p!, category: e.target.value as WinCategory }))}>
                    {(Object.keys(WIN_CAT_LABEL) as WinCategory[]).map(cat => (
                      <option key={cat} value={cat}>{WIN_CAT_LABEL[cat]}</option>
                    ))}
                  </select>
                </div>
                <div className="ws-form-row">
                  <label>Headline Metric</label>
                  <input className="ws-inp" placeholder="เช่น ประหยัดเวลา 28 ชม./สัปดาห์" value={wsEdit.headlineMetric ?? ''} onChange={e => setWsEdit(p => ({ ...p!, headlineMetric: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>สถานการณ์ก่อน</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.situation ?? ''} onChange={e => setWsEdit(p => ({ ...p!, situation: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>ความท้าทาย</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.challenge ?? ''} onChange={e => setWsEdit(p => ({ ...p!, challenge: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>สิ่งที่เราทำ (แต่ละบรรทัดคือ 1 bullet)</label>
                  <textarea className="ws-ta" rows={3} value={(wsEdit.actions ?? []).join('\n')} onChange={e => setWsEdit(p => ({ ...p!, actions: e.target.value.split('\n') }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>จุดเปลี่ยน</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.turningPoint ?? ''} onChange={e => setWsEdit(p => ({ ...p!, turningPoint: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>Timeline</label>
                  <input className="ws-inp" placeholder="เช่น ม.ค. 2025 → ทดลอง → ก.พ. ผลลัพธ์" value={wsEdit.timeline ?? ''} onChange={e => setWsEdit(p => ({ ...p!, timeline: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>คำพูดลูกค้า (Quote)</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.quote ?? ''} onChange={e => setWsEdit(p => ({ ...p!, quote: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>บทเรียน (แต่ละบรรทัดคือ 1 bullet)</label>
                  <textarea className="ws-ta" rows={3} value={(wsEdit.lessons ?? []).join('\n')} onChange={e => setWsEdit(p => ({ ...p!, lessons: e.target.value.split('\n') }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>ทำไมถึงสำคัญ (internal note)</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.whyItMatters ?? ''} onChange={e => setWsEdit(p => ({ ...p!, whyItMatters: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>บันทึกโดย</label>
                  <input className="ws-inp" value={wsEdit.documentedBy ?? ''} onChange={e => setWsEdit(p => ({ ...p!, documentedBy: e.target.value }))} />
                </div>
              </div>

              <div className="ws-form-metrics-title">ผลลัพธ์ก่อน/หลัง</div>
              {(wsEdit.metrics ?? []).map((m, i) => (
                <div key={i} className="ws-metric-row">
                  <input className="ws-inp ws-inp-sm" placeholder="ตัวชี้วัด" value={m.label} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], label: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="ก่อน" value={m.before} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], before: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="หลัง" value={m.after} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], after: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="เปลี่ยน" value={m.change} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], change: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <button className="ws-btn-del" onClick={() => setWsEdit(p => ({ ...p!, metrics: (p!.metrics ?? []).filter((_, j) => j !== i) }))}>×</button>
                </div>
              ))}
              <button className="ws-btn-add-row" onClick={() => setWsEdit(p => ({ ...p!, metrics: [...(p!.metrics ?? []), { label: '', before: '', after: '', change: '' }] }))}>+ เพิ่มตัวชี้วัด</button>

              <div className="ws-form-footer">
                <button className="ws-btn-save" onClick={() => saveStory(wsEdit as Omit<WinStory, 'id'> & { id?: string })}>บันทึก</button>
                <button className="ws-btn-cancel" onClick={() => setWsEdit(null)}>ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== FEEDBACK TAB ===== */}
      {tab === 'feedback' && (
        <div className="fb-wrap">

          {/* Summary strip */}
          <div className="fb-summary">
            <div className="fb-summary-period">📅 {fb.period}</div>
            <div className="fb-summary-stats">
              <span className="fb-stat-total">{fbE.length} รายการ</span>
              <span className="fb-stat fb-stat-pos">😊 {fbPosN} <em>({pct(fbPosN, fbE.length)})</em></span>
              <span className="fb-stat fb-stat-neu">😐 {fbNeuN} <em>({pct(fbNeuN, fbE.length)})</em></span>
              <span className="fb-stat fb-stat-neg">😞 {fbNegN} <em>({pct(fbNegN, fbE.length)})</em></span>
              <span className={`fb-net ${fbNet >= 0 ? 'pos' : 'neg'}`}>Net {fbNet >= 0 ? '+' : ''}{fbNet}%</span>
            </div>
          </div>

          {/* Theme Analysis */}
          <div className="fb-section">
            <div className="fb-section-title">Theme Analysis</div>
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>ความถี่</th>
                    <th>%</th>
                    <th>😊</th>
                    <th>😐</th>
                    <th>😞</th>
                    <th>Net</th>
                    <th>Quote ตัวอย่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {fbT.map(t => {
                    const te  = fbE.filter(e => e.theme === t.id);
                    const tp  = te.filter(e => e.sentiment === 'positive').length;
                    const tn  = te.filter(e => e.sentiment === 'neutral').length;
                    const tng = te.filter(e => e.sentiment === 'negative').length;
                    const tnet = te.length > 0 ? Math.round(((tp - tng) / te.length) * 100) : 0;
                    const sample = te.find(e => e.sentiment === 'negative') ?? te.find(e => e.sentiment === 'neutral') ?? te[0];
                    return (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="fb-tc">{te.length}</td>
                        <td className="fb-tc">{pct(te.length, fbE.length)}</td>
                        <td className="fb-tc fb-pos">{tp}</td>
                        <td className="fb-tc fb-neu">{tn}</td>
                        <td className="fb-tc fb-neg">{tng}</td>
                        <td className={`fb-tc ${tnet >= 0 ? 'fb-pos' : 'fb-neg'}`}>{tnet >= 0 ? '+' : ''}{tnet}%</td>
                        <td className="fb-quote-cell">"{sample?.content.slice(0, 65)}{(sample?.content.length ?? 0) > 65 ? '…' : ''}"</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Priority Matrix */}
          <div className="fb-section">
            <div className="fb-section-title">Impact × Effort Priority Matrix <span className="fb-section-sub">คลิก Impact/Effort เพื่อปรับ</span></div>
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>ความถี่</th>
                    <th>Impact (1-5)</th>
                    <th>Effort (1-5)</th>
                    <th>Score</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritized.map(({ t, freq, score, action }) => {
                    const meta = FB_ACTION[action];
                    return (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="fb-tc">{freq}</td>
                        <td className="fb-tc">
                          <input type="number" min={1} max={5} value={t.impact} className="fb-score-inp"
                            onChange={e => updateFbTheme(t.id, 'impact', +e.target.value)} />
                        </td>
                        <td className="fb-tc">
                          <input type="number" min={1} max={5} value={t.effort} className="fb-score-inp"
                            onChange={e => updateFbTheme(t.id, 'effort', +e.target.value)} />
                        </td>
                        <td className="fb-tc"><b>{score.toFixed(1)}</b></td>
                        <td><span className={`fb-act-badge ${meta.cls}`}>{meta.emoji} {meta.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Plan */}
          <div className="fb-section">
            <div className="fb-section-title">Action Plan</div>
            {(['fix_now', 'plan', 'monitor', 'celebrate'] as FBAction[]).map(actKey => {
              const items = prioritized.filter(p => p.action === actKey);
              if (items.length === 0) return null;
              const meta = FB_ACTION[actKey];
              return (
                <div key={actKey} className="fb-action-group">
                  <div className={`fb-action-group-title ${meta.cls}`}>{meta.emoji} {meta.label}</div>
                  <div className="fb-action-cards">
                    {items.map(({ t }) => {
                      const negN = fbE.filter(e => e.theme === t.id && e.sentiment === 'negative').length;
                      return (
                        <div key={t.id} className="fb-action-card">
                          <div className="fb-action-card-name">{t.name}</div>
                          <div className="fb-action-card-desc">{meta.desc(t.name, negN)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback Feed */}
          <div className="fb-section">
            <div className="fb-feed-head">
              <div className="fb-section-title" style={{ marginBottom: 0 }}>Feedback Feed</div>
              <div className="fb-feed-filters">
                <select className="fb-filter-sel" value={fbSrc} onChange={e => setFbSrc(e.target.value as FeedbackSource | 'all')}>
                  <option value="all">ทุกแหล่ง</option>
                  {FB_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select className="fb-filter-sel" value={fbThm} onChange={e => setFbThm(e.target.value)}>
                  <option value="all">ทุก Theme</option>
                  {fbT.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select className="fb-filter-sel" value={fbSnt} onChange={e => setFbSnt(e.target.value as FeedbackSentiment | 'all')}>
                  <option value="all">ทุก Sentiment</option>
                  <option value="positive">😊 Positive</option>
                  <option value="neutral">😐 Neutral</option>
                  <option value="negative">😞 Negative</option>
                </select>
                <button className="fb-add-btn" onClick={() => setFbAddOpen(o => !o)}>+ เพิ่ม Feedback</button>
              </div>
            </div>

            {fbAddOpen && (
              <div className="fb-add-form">
                <div className="fb-add-grid">
                  <div className="fb-add-field">
                    <label>วันที่</label>
                    <input type="date" className="fb-inp" value={fbNew.date}
                      onChange={e => setFbNew(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="fb-add-field">
                    <label>แหล่ง</label>
                    <select className="fb-inp" value={fbNew.source}
                      onChange={e => setFbNew(p => ({ ...p, source: e.target.value as FeedbackSource }))}>
                      {FB_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Theme</label>
                    <select className="fb-inp" value={fbNew.theme}
                      onChange={e => setFbNew(p => ({ ...p, theme: e.target.value }))}>
                      <option value="">-- เลือก Theme --</option>
                      {fbT.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Sentiment</label>
                    <select className="fb-inp" value={fbNew.sentiment}
                      onChange={e => setFbNew(p => ({ ...p, sentiment: e.target.value as FeedbackSentiment }))}>
                      <option value="positive">😊 Positive</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="negative">😞 Negative</option>
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Rating (1-5)</label>
                    <input type="number" min={1} max={5} className="fb-inp" value={fbNew.rating}
                      onChange={e => setFbNew(p => ({ ...p, rating: e.target.value }))}
                      placeholder="ไม่บังคับ" />
                  </div>
                </div>
                <div className="fb-add-field fb-add-full">
                  <label>เนื้อหา Feedback</label>
                  <textarea className="fb-ta" rows={3} value={fbNew.content} placeholder="คัดลอก feedback จากลูกค้า..."
                    onChange={e => setFbNew(p => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="fb-add-footer">
                  <button className="fb-save-btn" onClick={addFeedback}
                    disabled={!fbNew.content.trim() || !fbNew.theme}>บันทึก</button>
                  <button className="fb-cancel-btn" onClick={() => setFbAddOpen(false)}>ยกเลิก</button>
                </div>
              </div>
            )}

            <div className="fb-entries">
              {fbFiltered.length === 0 && <div className="fb-empty">ไม่พบ feedback ที่ตรงกับเงื่อนไข</div>}
              {fbFiltered.map(e => {
                const themeName = fbT.find(t => t.id === e.theme)?.name ?? e.theme;
                return (
                  <div key={e.id} className={`fb-entry fb-entry-${e.sentiment}`}>
                    <div className="fb-entry-meta">
                      <span className="fb-entry-date">{thaiDate(e.date)}</span>
                      <span className={`fb-src-badge fb-src-${e.source}`}>{srcLabel(e.source)}</span>
                      <span className="fb-theme-badge">{themeName}</span>
                      {e.rating && <span className="fb-rating">{'⭐'.repeat(e.rating)}</span>}
                      <span className="fb-sent-icon">{sentIcon(e.sentiment)}</span>
                    </div>
                    <div className="fb-entry-content">{e.content}</div>
                    <button className="fb-entry-del" onClick={() => deleteFb(e.id)} title="ลบ">×</button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ===== PRICING STRATEGY TAB ===== */}
      {tab === 'pricing' && (
        <div className="ps-wrap">

          {/* 1. Value-Based Pricing Calculator */}
          <div className="ps-section">
            <div className="ps-section-title">💎 Value-Based Pricing Calculator</div>
            <div className="ps-hint">กำหนดราคาจากคุณค่าที่ลูกค้าได้รับ ไม่ใช่จากต้นทุนการผลิต</div>
            <div className="ps-val-layout">
              <div className="ps-val-inputs">
                <div className="ps-val-row">
                  <label className="ps-val-label">ขนาดทีมลูกค้า</label>
                  <input type="number" className="ps-val-inp" min={1} max={100} value={valTeamSize}
                    onChange={e => setValTeamSize(Math.max(1, +e.target.value))} />
                  <span className="ps-val-unit">คน</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">มูลค่าชั่วโมงทำงาน</label>
                  <input type="number" className="ps-val-inp" min={100} step={100} value={valHourlyRate}
                    onChange={e => setValHourlyRate(Math.max(100, +e.target.value))} />
                  <span className="ps-val-unit">฿/ชั่วโมง</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">รายได้เดือนของลูกค้า</label>
                  <input type="number" className="ps-val-inp" min={0} step={50000} value={valMonthlyRev}
                    onChange={e => setValMonthlyRev(Math.max(0, +e.target.value))} />
                  <span className="ps-val-unit">฿</span>
                </div>
              </div>

              <div className="ps-val-table-wrap">
                <table className="ps-val-table">
                  <thead>
                    <tr>
                      <th>มูลค่าที่ลูกค้าได้รับ</th>
                      <th>วิธีคำนวณ</th>
                      <th className="ps-num">฿/เดือน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '⏱ เวลาที่ประหยัด', formula: `${valTeamSize} คน × 8 ชม. × ฿${valHourlyRate.toLocaleString()}`, val: valTimeSaved },
                      { label: '🤖 ลดต้นทุน AI tools', formula: 'API cost + tools ที่ไม่ต้องซื้อแยก', val: valAiCostSaved },
                      { label: '📈 รายได้ที่เพิ่มขึ้น', formula: '1% ของรายได้เดือน', val: valRevenueUp },
                      { label: '🛡 ลดความเสี่ยง', formula: 'Compliance + error prevention', val: valRiskReduced },
                    ].map(r => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="ps-val-formula">{r.formula}</td>
                        <td className="ps-num ps-val-num">{baht(r.val)}</td>
                      </tr>
                    ))}
                    <tr className="ps-total-row">
                      <td colSpan={2}><b>รวมมูลค่าทั้งหมด / เดือน</b></td>
                      <td className="ps-num"><b>{baht(totalValue)}</b></td>
                    </tr>
                  </tbody>
                </table>
                <div className="ps-val-result">
                  <div className="ps-val-range">
                    <span>ช่วงราคาที่แนะนำ (10–20% ของมูลค่า):</span>
                    <strong>{baht(recRangeLow)} – {baht(recRangeHigh)}</strong>
                  </div>
                  <div className="ps-val-verdict">
                    {[
                      { plan: 'Growth ฿1,490', pct: growthPct, ok: Number(growthPct) <= 15 },
                      { plan: 'Scale ฿5,900',  pct: scalePct,  ok: Number(scalePct)  <= 15 },
                    ].map(v => (
                      <span key={v.plan} className={`ps-verdict-badge ${v.ok ? 'ps-ok' : 'ps-high'}`}>
                        {v.plan} = {v.pct}% {v.ok ? '✅ เหมาะสม' : '⚠️ สูงเกินไป'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tier Structure & Price Anchoring */}
          <div className="ps-section">
            <div className="ps-section-title">🏗 Tier Structure & Price Anchoring</div>
            <div className="ps-hint">นำเสนอ tier สูงสุดก่อนเพื่อ anchor ราคา — ลูกค้ามักเลือก tier กลาง</div>
            <div className="ps-tier-grid">
              {[
                {
                  name: 'Free Trial',
                  price: 0,
                  annual: null,
                  color: 'var(--ink3)',
                  badge: null,
                  features: ['5 AI agents (ทดสอบ)', '24 Steps Guide', 'Export PDF', 'จำกัด 100 calls/เดือน'],
                  target: 'Prospect & Evaluation',
                },
                {
                  name: 'Growth',
                  price: 1490,
                  annual: 14900,
                  color: 'var(--accent)',
                  badge: '⭐ ยอดนิยม',
                  features: ['AI Company Builder', '1,000 calls/เดือน', 'VRIO + 24 Steps', 'PromptPay Billing', 'Workspace team'],
                  target: 'Thai SME / Solopreneurs',
                },
                {
                  name: 'Scale',
                  price: 5900,
                  annual: 56400,
                  color: 'var(--green)',
                  badge: '🚀 Multi-company',
                  features: ['ทุกอย่างใน Growth', '5,000 calls/เดือน', 'หลายบริษัทในบัญชีเดียว', 'API Access', 'Priority support'],
                  target: 'Holding / Agency / Enterprise',
                },
              ].map(tier => (
                <div key={tier.name} className={`ps-tier-card ${tier.badge ? 'ps-tier-featured' : ''}`}
                  style={{ borderColor: tier.badge ? tier.color : undefined }}>
                  {tier.badge && <div className="ps-tier-badge" style={{ background: tier.color }}>{tier.badge}</div>}
                  <div className="ps-tier-name">{tier.name}</div>
                  <div className="ps-tier-price">
                    {tier.price === 0 ? 'ฟรี' : baht(tier.price)}
                    {tier.price > 0 && <span className="ps-tier-per">/เดือน</span>}
                  </div>
                  {tier.annual && (
                    <div className="ps-tier-annual">
                      หรือ {baht(tier.annual)}/ปี
                      <span className="ps-tier-save"> ประหยัด {Math.round((1 - tier.annual / (tier.price * 12)) * 100)}%</span>
                    </div>
                  )}
                  <ul className="ps-tier-features">
                    {tier.features.map(f => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <div className="ps-tier-target">🎯 {tier.target}</div>
                </div>
              ))}
            </div>
            <div className="ps-anchor-note">
              💡 <b>Anchoring:</b> Scale (฿5,900) ทำให้ Growth (฿1,490) ดูคุ้มค่ามาก — ลูกค้า 80%+ เลือก Growth
              หลังเห็น Scale ก่อน เพิ่ม Annual Plan ลด Churn ได้ ~30%
            </div>
          </div>

          {/* 3. Price Change Simulator */}
          <div className="ps-section">
            <div className="ps-section-title">🔄 Price Change Simulator</div>
            <div className="ps-hint">จำลองผลกระทบก่อนปรับราคา — ดูว่าสูญเสียลูกค้าเท่าไหร่ถึงจะยังได้กำไรมากขึ้น</div>
            <div className="ps-sim-layout">
              <div className="ps-sim-inputs">
                <div className="ps-val-row">
                  <label className="ps-val-label">ราคาใหม่ Growth plan</label>
                  <input type="number" className="ps-val-inp" min={500} step={100} value={simNewPrice}
                    onChange={e => setSimNewPrice(Math.max(500, +e.target.value))} />
                  <span className="ps-val-unit">฿/เดือน</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">อัตราลูกค้าที่รักษาไว้ได้</label>
                  <input type="number" className="ps-val-inp" min={0} max={100} step={5} value={simRetention}
                    onChange={e => setSimRetention(Math.min(100, Math.max(0, +e.target.value)))} />
                  <span className="ps-val-unit">%</span>
                </div>
                <div className="ps-sim-baseline">
                  ฐาน: Growth subs ปัจจุบัน {simCurrentSubs} ราย × ฿{gp.price.toLocaleString()} = {baht(simCurrentSubs * gp.price)}/เดือน
                </div>
              </div>

              <div className="ps-sim-result-grid">
                {[
                  { label: 'Growth subs ที่รักษา', val: `${simNewSubs} ราย`, ok: true },
                  { label: 'Growth subs ที่สูญเสีย', val: `${simLostSubs} ราย`, ok: simLostSubs === 0 },
                  { label: 'MRR ใหม่ (ประมาณ)', val: baht(simNewMrr), ok: simMrrDelta >= 0 },
                  { label: 'MRR Delta', val: `${simMrrDelta >= 0 ? '+' : ''}${baht(simMrrDelta)}`, ok: simMrrDelta >= 0 },
                  { label: 'ผลกระทบต่อปี', val: `${simAnnualImp >= 0 ? '+' : ''}${baht(simAnnualImp)}`, ok: simAnnualImp >= 0 },
                  { label: 'Break-even (ลูกค้าสูญเสียได้ไม่เกิน)', val: simBreakEven > 0 ? `${simBreakEven} ราย` : '—', ok: simLostSubs <= simBreakEven || simBreakEven === 0 },
                ].map(r => (
                  <div key={r.label} className="ps-sim-kpi">
                    <div className="ps-sim-kpi-label">{r.label}</div>
                    <div className={`ps-sim-kpi-val ${r.ok ? 'ps-ok-val' : 'ps-bad-val'}`}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`ps-sim-verdict ${simMrrDelta >= 0 ? 'ps-sim-ok' : 'ps-sim-warn'}`}>
              {simMrrDelta >= 0
                ? `✅ ที่ retention ${simRetention}% → ราคา ฿${simNewPrice.toLocaleString()} ยังคุ้มค่า — MRR เพิ่มขึ้น ${baht(simMrrDelta)}/เดือน`
                : `⚠️ ที่ retention ${simRetention}% → ราคา ฿${simNewPrice.toLocaleString()} ทำให้ MRR ลดลง ${baht(Math.abs(simMrrDelta))} — ต้องรักษาลูกค้าได้ ${simBreakEven > 0 ? `มากกว่า ${simBreakEven} ราย` : 'มากกว่านี้'}`}
            </div>
          </div>

          {/* 4. A/B Price Testing Plan */}
          <div className="ps-section">
            <div className="ps-section-title">🧪 A/B Price Testing Plan</div>
            <div className="ps-hint">ทดสอบ 2–3 ราคาพร้อมกัน (minimum 100 visitors/variant) ก่อน commit ราคาถาวร</div>
            <table className="ps-ab-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th className="ps-num">ราคา Growth</th>
                  <th>สมมติฐาน</th>
                  <th>เป้า Conversion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { variant: 'A (ต่ำ / Control)', price: 1290, hypothesis: 'Conversion สูงขึ้น +30%, revenue/visitor ต่ำกว่า', target: '≥5%', cls: '' },
                  { variant: 'B (ปัจจุบัน)',      price: 1490, hypothesis: 'Balanced — baseline สำหรับเปรียบเทียบ', target: '≥4%', cls: 'ps-ab-cur' },
                  { variant: 'C (สูง)',            price: 1790, hypothesis: 'Conversion ลด ~20% แต่ revenue/visitor สูงกว่า', target: '≥3%', cls: '' },
                ].map(r => (
                  <tr key={r.variant} className={r.cls}>
                    <td>{r.variant} {r.cls && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="ps-num">{baht(r.price)}/เดือน</td>
                    <td className="ps-ab-hypo">{r.hypothesis}</td>
                    <td className="ps-num">{r.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ps-ab-signals">
              <div className="ps-ab-signal-title">สัญญาณที่ต้องจับตา</div>
              <div className="ps-ab-signal-grid">
                {[
                  { icon: '📉', label: 'Conversion ลด >30%', action: 'ราคาสูงเกินไป → ลดกลับ' },
                  { icon: '📊', label: 'Conversion ไม่เปลี่ยน', action: 'มีพื้นที่ขึ้นราคาอีก' },
                  { icon: '🔄', label: 'Refund rate สูง', action: 'ปัญหา value delivery ไม่ใช่ราคา' },
                  { icon: '✅', label: '20–30% บอกว่าแพงเกิน', action: 'ราคาพอดีแล้ว (ปกติ)' },
                ].map(s => (
                  <div key={s.label} className="ps-ab-signal-item">
                    <span className="ps-ab-signal-icon">{s.icon}</span>
                    <div>
                      <div className="ps-ab-signal-label">{s.label}</div>
                      <div className="ps-ab-signal-action">{s.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===== SALESFORCE CRM TAB ===== */}
      {tab === 'salesforce' && (
        <div className="sf-wrap">

          {/* 1. Connection Status */}
          <div className="sf-section">
            <div className="sf-section-title">☁️ Salesforce Connection</div>
            <div className="sf-conn-layout">
              <div className={`sf-conn-status sf-conn-${sfStatus}`}>
                <div className="sf-conn-dot" />
                <div className="sf-conn-text">
                  <div className="sf-conn-label">
                    {sfStatus === 'not_connected' && 'ยังไม่ได้เชื่อมต่อ'}
                    {sfStatus === 'connected'     && '✅ เชื่อมต่อแล้ว'}
                    {sfStatus === 'syncing'       && '🔄 กำลัง Sync...'}
                    {sfStatus === 'error'         && '❌ เกิดข้อผิดพลาด'}
                  </div>
                  <div className="sf-conn-sub">
                    {sfStatus === 'not_connected' && 'ตั้งค่า OAuth credentials ใน Supabase Edge Function Secrets ก่อน'}
                    {sfStatus === 'connected'     && 'Connected · Last sync: 27 มิ.ย. 2026 09:12 น.'}
                    {sfStatus === 'syncing'       && 'กำลังดึงข้อมูลจาก Salesforce...'}
                    {sfStatus === 'error'         && 'Refresh token expired — กรุณา re-authorize'}
                  </div>
                </div>
                {/* Demo toggle for preview */}
                <div className="sf-conn-actions">
                  {sfStatus === 'not_connected' || sfStatus === 'error' ? (
                    <button className="sf-btn sf-btn-primary" onClick={() => setSfStatus('connected')}>
                      🔗 Connect (OAuth 2.0)
                    </button>
                  ) : (
                    <>
                      <button className="sf-btn sf-btn-sync" onClick={triggerSfSync} disabled={sfSyncing}>
                        {sfSyncing ? '⏳ Syncing…' : '🔄 Sync Now'}
                      </button>
                      <button className="sf-btn sf-btn-danger" onClick={() => setSfStatus('not_connected')}>
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Security note */}
              <div className="sf-security-note">
                <div className="sf-security-title">🔒 ข้อกำหนดความปลอดภัย</div>
                <ul className="sf-security-list">
                  <li><b>SALESFORCE_CLIENT_ID</b> และ <b>SALESFORCE_CLIENT_SECRET</b> ต้องเก็บเป็น Supabase Secret เท่านั้น — ไม่เก็บใน .env หรือ frontend code</li>
                  <li>Refresh token จัดการผ่าน <code>supabase/functions/sf-sync/index.ts</code> — browser ไม่เคยเห็น token โดยตรง</li>
                  <li>ใช้ Connected App scope: <code>api refresh_token</code> เท่านั้น — ไม่ต้องการ <code>full</code></li>
                  <li>Enable "Require Proof Key for Code Exchange (PKCE)" ใน Connected App settings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2. Object & Field Mapping */}
          <div className="sf-section">
            <div className="sf-section-title">🗂 Object & Field Mapping</div>
            <div className="sf-hint">กำหนดว่า Salesforce Object ใดจะ map กับข้อมูลใดใน CEO AI Thailand</div>
            <div className="sf-obj-list">
              {sfObjectMaps.map(obj => (
                <div key={obj.sfObject} className={`sf-obj-card ${obj.enabled ? 'sf-obj-enabled' : 'sf-obj-disabled'}`}>
                  <div className="sf-obj-head">
                    <div className="sf-obj-title">
                      <span className="sf-obj-name">{obj.sfLabel}</span>
                      <span className="sf-obj-arrow">→</span>
                      <span className="sf-obj-app">{obj.appLabel}</span>
                      <span className={`sf-dir-badge sf-dir-${obj.direction}`}>
                        {obj.direction === 'sf_to_app' ? 'SF → App' : obj.direction === 'app_to_sf' ? 'App → SF' : '↔ Bidirectional'}
                      </span>
                    </div>
                    <div className="sf-obj-controls">
                      <label className="sf-toggle">
                        <input type="checkbox" checked={obj.enabled}
                          onChange={e => setSfObjectMaps(maps => maps.map(m =>
                            m.sfObject === obj.sfObject ? { ...m, enabled: e.target.checked } : m
                          ))} />
                        <span className="sf-toggle-track" />
                      </label>
                      <button className="sf-expand-btn" onClick={() =>
                        setSfExpandedObj(prev => prev === obj.sfObject ? null : obj.sfObject)}>
                        {sfExpandedObj === obj.sfObject ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {sfExpandedObj === obj.sfObject && (
                    <div className="sf-field-table-wrap">
                      <table className="sf-field-table">
                        <thead>
                          <tr>
                            <th>SF Field</th>
                            <th>SF Label</th>
                            <th className="sf-arrow-col">→</th>
                            <th>App Field</th>
                            <th>App Label</th>
                          </tr>
                        </thead>
                        <tbody>
                          {obj.fields.map(f => (
                            <tr key={f.sfField}>
                              <td><code className="sf-code">{f.sfField}</code></td>
                              <td className="sf-td-label">{f.sfLabel}</td>
                              <td className="sf-arrow-col sf-map-arrow">→</td>
                              <td><code className="sf-code">{f.appField}</code></td>
                              <td className="sf-td-label">{f.appLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. SOQL Query Reference */}
          <div className="sf-section">
            <div className="sf-section-title">🔍 SOQL Query Reference</div>
            <div className="sf-hint">Edge Function ใช้ SOQL เหล่านี้ดึงข้อมูล — Selective queries ใช้ indexed fields เพื่อหลีกเลี่ยง governor limit</div>
            <div className="sf-soql-list">
              {SF_SOQL_EXAMPLES.map(q => (
                <div key={q.label} className="sf-soql-item">
                  <div className="sf-soql-label">{q.label}</div>
                  <pre className="sf-soql-pre"><code>{q.soql}</code></pre>
                </div>
              ))}
            </div>
            <div className="sf-gov-note">
              ⚡ <b>Governor Limits:</b> SOQL ทุก query ใช้ indexed fields (<code>CreatedDate</code>, <code>Id</code>, <code>OwnerId</code>, <code>IsClosed</code>) + <code>LIMIT 200</code>
              เพื่อรองรับ batch ขนาด 200 records ต่อ transaction ตาม Salesforce best practice
            </div>
          </div>

          {/* 4. Sync Schedule */}
          <div className="sf-section">
            <div className="sf-section-title">⏱ Sync Schedule (Supabase Cron)</div>
            <div className="sf-hint">กำหนดความถี่ผ่าน Supabase pg_cron — Edge Function <code>sf-sync</code> จะถูกเรียกตามตาราง</div>
            <div className="sf-cron-layout">
              <div className="sf-cron-inputs">
                <div className="sf-cron-row">
                  <label className="sf-cron-label">ทุก</label>
                  <input type="number" className="sf-cron-inp" min={5} max={1440} step={5} value={sfCronMin}
                    onChange={e => setSfCronMin(Math.max(5, Math.min(1440, +e.target.value)))} />
                  <span className="sf-cron-unit">นาที</span>
                </div>
                <div className="sf-cron-expr">
                  Cron expression: <code>{sfCronMin < 60 ? `*/${sfCronMin} * * * *` : sfCronMin === 60 ? '0 * * * *' : `0 */${Math.round(sfCronMin/60)} * * *`}</code>
                </div>
              </div>
              <div className="sf-cron-code-wrap">
                <div className="sf-cron-code-label">supabase/functions/sf-sync/index.ts (โครงสร้าง)</div>
                <pre className="sf-code-block"><code>{`import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

// Credentials อยู่ใน Supabase Secrets — ไม่เคยส่งมา frontend
const SF_CLIENT_ID     = Deno.env.get('SALESFORCE_CLIENT_ID')!
const SF_CLIENT_SECRET = Deno.env.get('SALESFORCE_CLIENT_SECRET')!
const SF_REFRESH_TOKEN = Deno.env.get('SALESFORCE_REFRESH_TOKEN')!
const SF_INSTANCE_URL  = Deno.env.get('SALESFORCE_INSTANCE_URL')!

serve(async (_req) => {
  // 1. Refresh access token
  const tokenRes = await fetch(\`\${SF_INSTANCE_URL}/services/oauth2/token\`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
      refresh_token: SF_REFRESH_TOKEN,
    }),
  })
  const { access_token } = await tokenRes.json()

  // 2. SOQL query — indexed fields, LIMIT 200 (bulkified)
  const query = encodeURIComponent(
    'SELECT Id,FirstName,LastName,Title,Description FROM Lead ' +
    'WHERE CreatedDate = LAST_N_DAYS:1 ORDER BY CreatedDate DESC LIMIT 200'
  )
  const sfRes = await fetch(
    \`\${SF_INSTANCE_URL}/services/data/v59.0/query?q=\${query}\`,
    { headers: { Authorization: \`Bearer \${access_token}\` } }
  )
  const { records } = await sfRes.json()

  // 3. Upsert to Supabase (no DML inside loops — batch insert)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Edge Function only
  )
  const rows = records.map((r: Record<string, string>) => ({
    sf_id: r.Id,
    name: \`\${r.FirstName} \${r.LastName}\`,
    role: r.Title ?? '',
    quote: r.Description ?? '',
    synced_at: new Date().toISOString(),
  }))
  await supabase.from('sf_leads_cache').upsert(rows, { onConflict: 'sf_id' })

  return new Response(JSON.stringify({ synced: rows.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})`}</code></pre>
              </div>
            </div>
          </div>

          {/* 5. Sync Log */}
          <div className="sf-section">
            <div className="sf-section-title">📋 Sync Log</div>
            <table className="sf-log-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>Object</th>
                  <th>ทิศทาง</th>
                  <th className="sf-num">Records</th>
                  <th>สถานะ</th>
                  <th>ข้อความ</th>
                </tr>
              </thead>
              <tbody>
                {SF_SYNC_LOGS.map((log, i) => (
                  <tr key={i}>
                    <td className="sf-log-at">{log.at}</td>
                    <td><code className="sf-code">{log.object}</code></td>
                    <td className="sf-log-dir">{log.dir}</td>
                    <td className="sf-num">{log.count}</td>
                    <td>
                      <span className={`sf-log-badge sf-log-${log.status}`}>
                        {log.status === 'ok' ? '✅' : log.status === 'warn' ? '⚠️' : '❌'}
                        {' '}{log.status}
                      </span>
                    </td>
                    <td className="sf-log-msg">{log.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===== CUSTOMER PERSONA TAB ===== */}
      {tab === 'cxpersona' && (() => {
        const p = CX_PERSONAS.find(x => x.id === cxPersonaId) ?? CX_PERSONAS[0];
        return (
          <div className="cx-wrap">

            {/* Persona switcher */}
            <div className="cx-switcher">
              {CX_PERSONAS.map(px => (
                <button key={px.id}
                  className={`cx-switch-btn ${cxPersonaId === px.id ? 'active' : ''}`}
                  style={cxPersonaId === px.id ? { borderColor: px.color, color: px.color } : {}}
                  onClick={() => setCxPersonaId(px.id)}>
                  {px.emoji} {px.name.split(' ')[0]}
                  <span className={`cx-plan-pill cx-plan-${px.plan}`}>{px.plan}</span>
                </button>
              ))}
              <span className="cx-switch-label">Anti-persona →</span>
            </div>

            {/* 1. Identity card */}
            <div className="cx-section cx-identity-section" style={{ borderLeft: `4px solid ${p.color}` }}>
              <div className="cx-identity-head">
                <div className="cx-avatar" style={{ background: p.color }}>{p.emoji}</div>
                <div>
                  <div className="cx-persona-name">{p.name}</div>
                  <div className="cx-persona-role">{p.role}</div>
                  <div className={`cx-plan-badge cx-plan-${p.plan}`}>
                    {p.plan === 'growth' ? '📦 Growth Plan ฿1,490' : '🚀 Scale Plan ฿5,900'}
                  </div>
                </div>
              </div>
              <div className="cx-demo-grid">
                {[
                  { label: 'อายุ',           val: p.age },
                  { label: 'รายได้',          val: p.income },
                  { label: 'ที่อยู่',          val: p.location },
                  { label: 'การศึกษา',        val: p.education },
                  { label: 'ความถนัด Tech',   val: p.tech },
                  { label: 'Budget ต่อ SaaS', val: p.budget },
                ].map(d => (
                  <div key={d.label} className="cx-demo-item">
                    <div className="cx-demo-label">{d.label}</div>
                    <div className="cx-demo-val">{d.val}</div>
                  </div>
                ))}
              </div>
              <p className="cx-portrait">{p.portrait}</p>
              <div className="cx-identity-quote">💬 {p.identity}</div>
            </div>

            {/* 2. Psychographics */}
            <div className="cx-2col">
              <div className="cx-section">
                <div className="cx-section-title">🧠 Psychographics</div>
                <div className="cx-tag-group">
                  <div className="cx-tag-label">ค่านิยม</div>
                  <div className="cx-tags">{p.values.map(v => <span key={v} className="cx-tag cx-tag-value">{v}</span>)}</div>
                </div>
                <div className="cx-tag-group">
                  <div className="cx-tag-label">เป้าหมาย 1–3 ปี</div>
                  {p.aspirations.map(a => <div key={a} className="cx-bullet cx-bullet-aspire">🎯 {a}</div>)}
                </div>
                <div className="cx-tag-group">
                  <div className="cx-tag-label">Pain Points</div>
                  {p.frustrations.map(f => <div key={f} className="cx-bullet cx-bullet-pain">😤 {f}</div>)}
                </div>
              </div>

              {/* 3. Buying Behavior */}
              <div className="cx-section">
                <div className="cx-section-title">🛒 Buying Behavior</div>
                <div className="cx-beh-row"><span className="cx-beh-label">วิธีค้นหา</span><span className="cx-beh-val">{p.researchStyle}</span></div>
                <div className="cx-beh-row"><span className="cx-beh-label">ความเร็วตัดสินใจ</span><span className="cx-beh-val">{p.decisionSpeed}</span></div>
                <div className="cx-beh-row"><span className="cx-beh-label">Trigger</span><span className="cx-beh-val cx-trigger">{p.trigger}</span></div>
                <div className="cx-tag-group" style={{ marginTop: 12 }}>
                  <div className="cx-tag-label">Objections ที่พบบ่อย</div>
                  {p.objections.map(o => <div key={o} className="cx-bullet cx-bullet-obj">🚧 {o}</div>)}
                </div>
              </div>
            </div>

            {/* 4. Where They Spend Time */}
            <div className="cx-section">
              <div className="cx-section-title">📍 Where They Spend Time</div>
              <div className="cx-2col">
                <div>
                  <div className="cx-tag-label">Online</div>
                  <div className="cx-tags" style={{ marginTop: 6 }}>
                    {p.onlineHangouts.map(h => <span key={h} className="cx-tag cx-tag-channel">{h}</span>)}
                  </div>
                  <div className="cx-tag-label" style={{ marginTop: 12 }}>Offline</div>
                  <div className="cx-tags" style={{ marginTop: 6 }}>
                    {p.offlineHangouts.map(h => <span key={h} className="cx-tag cx-tag-channel">{h}</span>)}
                  </div>
                </div>
                <div>
                  <div className="cx-tag-label">Influencers ที่เชื่อถือ</div>
                  <div className="cx-tags" style={{ marginTop: 6 }}>
                    {p.influencers.map(h => <span key={h} className="cx-tag cx-tag-inf">{h}</span>)}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Messaging */}
            <div className="cx-section">
              <div className="cx-section-title">📣 Messaging Framework</div>
              <div className="cx-msg-key">" {p.keyMessage} "</div>
              <div className="cx-2col" style={{ marginTop: 14 }}>
                <div>
                  <div className="cx-tag-label">Tone ที่ตอบสนอง</div>
                  <p className="cx-msg-tone">{p.messagingTone}</p>
                  <div className="cx-tag-label" style={{ marginTop: 10 }}>คำที่ดึงดูด ✅</div>
                  <div className="cx-tags" style={{ marginTop: 6 }}>
                    {p.attractWords.map(w => <span key={w} className="cx-tag cx-tag-attract">{w}</span>)}
                  </div>
                </div>
                <div>
                  <div className="cx-tag-label">คำที่ผลักไส ❌</div>
                  <div className="cx-tags" style={{ marginTop: 6 }}>
                    {p.repelWords.map(w => <span key={w} className="cx-tag cx-tag-repel">{w}</span>)}
                  </div>
                  <div className="cx-tag-label" style={{ marginTop: 12 }}>วันในชีวิต</div>
                  <p className="cx-dayinlife">{p.dayInLife}</p>
                </div>
              </div>
            </div>

            {/* 6. VoC Quotes */}
            <div className="cx-section">
              <div className="cx-section-title">💬 Voice of Customer</div>
              <div className="cx-voc-grid">
                {p.voc.map((q, i) => (
                  <div key={i} className="cx-voc-card">
                    <div className="cx-voc-quote">"{q}"</div>
                    <div className="cx-voc-attr">— {p.name.split(' ')[0]}, {p.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Validation Checklist */}
            <div className="cx-section">
              <div className="cx-section-title">✅ Persona Validation Checklist</div>
              {p.validationChecks.map(c => (
                <div key={c.label} className={`cx-check-row ${c.ok ? 'cx-check-ok' : 'cx-check-fail'}`}>
                  <span className="cx-check-icon">{c.ok ? '✅' : '⚠️'}</span>
                  <span className="cx-check-label">{c.label}</span>
                  {!c.ok && <span className="cx-check-action">ต้องอัปเดต</span>}
                </div>
              ))}
            </div>

            {/* 8. Anti-Persona */}
            <div className="cx-section cx-anti-section">
              <div className="cx-section-title">🚫 Anti-Persona: {ANTI_PERSONA.name}</div>
              <div className="cx-anti-role">{ANTI_PERSONA.role}</div>
              <div className="cx-2col" style={{ marginTop: 14 }}>
                <div>
                  <div className="cx-tag-label">Red Flags ในกระบวนการขาย</div>
                  {ANTI_PERSONA.redFlags.map(f => <div key={f} className="cx-bullet cx-bullet-pain">🚩 {f}</div>)}
                </div>
                <div>
                  <div className="cx-tag-label">ทำไมถึงไม่ใช่ลูกค้าที่ดี</div>
                  {ANTI_PERSONA.whyBadFit.map(f => <div key={f} className="cx-bullet cx-bullet-pain">❌ {f}</div>)}
                </div>
              </div>
            </div>

            {/* 9. Messaging Campaign Summary */}
            <div className="cx-section">
              <div className="cx-section-title">🚀 Campaign Messaging Summary</div>
              <div className="cx-msg-table-wrap">
                <table className="cx-msg-table">
                  <thead>
                    <tr>
                      <th>Segment</th>
                      <th>Headline</th>
                      <th>Subhead</th>
                      <th>CTA</th>
                      <th>Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESSAGING_FRAMEWORK.map(m => (
                      <tr key={m.segment}>
                        <td className="cx-msg-seg">{m.segment}</td>
                        <td className="cx-msg-hl">"{m.headline}"</td>
                        <td className="cx-msg-sub">{m.subhead}</td>
                        <td className="cx-msg-cta">{m.cta}</td>
                        <td className="cx-msg-ch">{m.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ===== SEO STRATEGY TAB ===== */}
      {tab === 'seo' && (
        <div className="seo-wrap">

          {/* Header */}
          <div className="seo-header">
            <div className="seo-header-title">🔍 Marketplace SEO Strategy</div>
            <div className="seo-header-sub">
              ยุทธศาสตร์ SEO สำหรับ CEO AI Thailand Marketplace — มุ่งเน้น Category Pages เป็น asset หลัก
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="seo-metrics-grid">
            {SEO_METRICS.map(m => {
              const pct2 = Math.min(100, Math.round((m.current / m.target) * 100));
              return (
                <div key={m.metric} className="seo-metric-card">
                  <div className="seo-metric-label">{m.metric}</div>
                  <div className="seo-metric-vals">
                    <span className="seo-metric-cur">{m.current}{m.unit === '%' ? '%' : ''}</span>
                    <span className="seo-metric-arrow">→</span>
                    <span className="seo-metric-tgt">{m.target} {m.unit !== '%' ? m.unit : '%'}</span>
                  </div>
                  <div className="seo-metric-bar-bg">
                    <div
                      className="seo-metric-bar-fill"
                      style={{ width: `${pct2}%`, background: pct2 >= 75 ? 'var(--green)' : pct2 >= 40 ? 'var(--accent)' : '#f59e0b' }}
                    />
                  </div>
                  <div className="seo-metric-pct">{pct2}% of target · {m.tool}</div>
                </div>
              );
            })}
          </div>

          {/* Keyword Map */}
          <div className="seo-section">
            <div className="seo-section-title">🗺️ Keyword Map — จับคู่ Page Type กับ Keyword</div>
            <div className="seo-table-wrap">
              <table className="seo-table">
                <thead>
                  <tr>
                    <th>Page Type</th>
                    <th>Pattern</th>
                    <th>ตัวอย่าง Keyword</th>
                    <th>Volume</th>
                    <th>Competition</th>
                    <th>Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {SEO_KEYWORD_MAP.map((k, i) => (
                    <tr key={i}>
                      <td><span className="seo-page-badge">{k.pageType}</span></td>
                      <td className="seo-pattern">{k.pattern}</td>
                      <td className="seo-example">{k.example}</td>
                      <td className="seo-vol">{k.volume}</td>
                      <td>
                        <span className={`seo-comp-badge seo-comp-${k.competition === 'สูง' ? 'high' : k.competition === 'กลาง' ? 'mid' : 'low'}`}>
                          {k.competition}
                        </span>
                      </td>
                      <td>
                        <span className={`seo-intent-badge seo-intent-${k.intent.toLowerCase().replace(/\s/g, '')}`}>
                          {k.intent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Priorities */}
          <div className="seo-section">
            <div className="seo-section-title">📊 Category Page Priority (ลำดับเน้น SEO)</div>
            <div className="seo-note">
              Category pages คือ asset ที่มีค่าที่สุดใน SEO — ทุก category ต้องมี H1, intro 150 คำ, ItemList schema และ internal links
            </div>
            <div className="seo-cat-list">
              {SEO_CAT_PRIORITIES.map((c, i) => (
                <div key={i} className={`seo-cat-row seo-cat-${c.priority.toLowerCase()}`}>
                  <div className="seo-cat-pri-badge">{c.priority}</div>
                  <div className="seo-cat-info">
                    <div className="seo-cat-name">{c.category}</div>
                    <div className="seo-cat-action">{c.action}</div>
                  </div>
                  <div className="seo-cat-stats">
                    <div className="seo-cat-stat">
                      <span className="seo-cat-stat-label">Volume</span>
                      <span className="seo-cat-stat-val">{c.volume.toLocaleString()}/mo</span>
                    </div>
                    <div className="seo-cat-stat">
                      <span className="seo-cat-stat-label">Supply</span>
                      <span className="seo-cat-stat-val">{c.supply} listings</span>
                    </div>
                    <div className="seo-cat-stat">
                      <span className="seo-cat-stat-label">Competition</span>
                      <span className={`seo-comp-badge seo-comp-${c.competition === 'สูง' ? 'high' : c.competition === 'กลาง' ? 'mid' : 'low'}`}>
                        {c.competition}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schema Markup */}
          <div className="seo-section">
            <div className="seo-section-title">🏷️ Schema Markup Templates (JSON-LD)</div>
            <div className="seo-schema-tabs">
              {SEO_SCHEMA_TEMPLATES.map((s, i) => (
                <button
                  key={i}
                  className={`seo-schema-tab${seoSchemaIdx === i ? ' active' : ''}`}
                  onClick={() => setSeoSchemaIdx(i)}
                >
                  {s.type}
                </button>
              ))}
            </div>
            {(() => {
              const s = SEO_SCHEMA_TEMPLATES[seoSchemaIdx];
              return (
                <div className="seo-schema-panel">
                  <div className="seo-schema-desc">{s.description}</div>
                  <pre className="seo-code-block">{s.code}</pre>
                </div>
              );
            })()}
          </div>

          {/* Checklists */}
          <div className="seo-2col">

            {/* Technical SEO */}
            <div className="seo-section seo-check-section">
              <div className="seo-section-title">⚙️ Technical SEO Checklist</div>
              <div className="seo-check-progress">
                <div className="seo-check-prog-bar">
                  <div
                    className="seo-check-prog-fill"
                    style={{ width: `${(techChecks.filter(Boolean).length / techChecks.length) * 100}%` }}
                  />
                </div>
                <span className="seo-check-prog-label">
                  {techChecks.filter(Boolean).length}/{techChecks.length} เสร็จแล้ว
                </span>
              </div>
              {TECH_SEO_CHECKS_INIT.map((item, i) => (
                <label key={i} className="seo-check-row">
                  <input
                    type="checkbox"
                    checked={techChecks[i]}
                    onChange={e => {
                      const next = [...techChecks];
                      next[i] = e.target.checked;
                      setTechChecks(next);
                    }}
                  />
                  <span className={`seo-check-text${techChecks[i] ? ' done' : ''}`}>{item}</span>
                </label>
              ))}
            </div>

            {/* Quality SEO */}
            <div className="seo-section seo-check-section">
              <div className="seo-section-title">✅ Quality SEO Checklist</div>
              <div className="seo-check-progress">
                <div className="seo-check-prog-bar">
                  <div
                    className="seo-check-prog-fill"
                    style={{ width: `${(qualityChecks.filter(Boolean).length / qualityChecks.length) * 100}%`, background: 'var(--green)' }}
                  />
                </div>
                <span className="seo-check-prog-label">
                  {qualityChecks.filter(Boolean).length}/{qualityChecks.length} เสร็จแล้ว
                </span>
              </div>
              {QUALITY_SEO_CHECKS_INIT.map((item, i) => (
                <label key={i} className="seo-check-row">
                  <input
                    type="checkbox"
                    checked={qualityChecks[i]}
                    onChange={e => {
                      const next = [...qualityChecks];
                      next[i] = e.target.checked;
                      setQualityChecks(next);
                    }}
                  />
                  <span className={`seo-check-text${qualityChecks[i] ? ' done' : ''}`}>{item}</span>
                </label>
              ))}
            </div>

          </div>

          {/* Content Calendar */}
          <div className="seo-section">
            <div className="seo-section-title">📅 Content Calendar — Q3 2026</div>
            <div className="seo-note">
              Content supporting pages ช่วยดึง informational traffic → link กลับ category pages → เพิ่ม authority
            </div>
            <div className="seo-cal-grid">
              {SEO_CONTENT_CALENDAR.map((c, i) => (
                <div key={i} className={`seo-cal-card seo-cal-${c.status}`}>
                  <div className="seo-cal-top">
                    <span className="seo-cal-month">{c.month}</span>
                    <span className={`seo-cal-status seo-cal-status-${c.status}`}>
                      {c.status === 'planned' ? '📋 วางแผน' : c.status === 'draft' ? '✏️ Draft' : '✅ Published'}
                    </span>
                  </div>
                  <div className="seo-cal-title">{c.title}</div>
                  <div className="seo-cal-kw">🔑 {c.keyword}</div>
                  <div className="seo-cal-meta">
                    <span className="seo-cal-intent">{c.intent}</span>
                    <span className="seo-cal-target">→ {c.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anti-patterns */}
          <div className="seo-section seo-antipatterns">
            <div className="seo-section-title">⚠️ Anti-Patterns ที่ต้องหลีกเลี่ยง</div>
            <div className="seo-ap-grid">
              {[
                { icon: '🚫', title: 'ละเลย Category Pages', desc: 'Category pages rank สำหรับ high-volume keywords — อย่าให้มีแค่ grid ไม่มี content' },
                { icon: '🚫', title: 'Duplicate Title Tags', desc: 'ทุก listing ต้องมี unique title — อย่าใช้ "Partner | CEO AI" ซ้ำกันทุกหน้า' },
                { icon: '🚫', title: 'Thin Category Pages', desc: 'Category page ต้องมี intro text, filters, internal links — ไม่ใช่แค่ grid รูปภาพ' },
                { icon: '🚫', title: 'ไม่ทำ Schema Markup', desc: 'Rich results (stars, rating, price) เพิ่ม CTR ได้ 20–30% — ทำทันที' },
                { icon: '🚫', title: 'Index Filter Combinations', desc: 'URL filter เช่น ?cat=digital&city=bkk&sort=price สร้าง thin pages นับพัน — noindex ไว้' },
              ].map((ap, i) => (
                <div key={i} className="seo-ap-card">
                  <div className="seo-ap-icon">{ap.icon}</div>
                  <div className="seo-ap-title">{ap.title}</div>
                  <div className="seo-ap-desc">{ap.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ===== WORKSPACES TAB ===== */}
      {tab === 'workspaces' && (
        <div>
          {!isSupabaseEnabled ? (
            <div className="team-notice">
              ต้องเปิดใช้ Supabase ก่อน (ตั้งค่า env + รัน migration <code>0005_admin.sql</code>)
            </div>
          ) : (
            <>
              <div className="admin-note">
                ในฐานะผู้ดูแลระบบ คุณเห็นทุกเวิร์กสเปซในระบบ (ผ่าน Row Level Security ที่ให้สิทธิ์แอดมิน) —
                ใช้ดูภาพรวมลูกค้าทั้งหมดของ CEO AI Thailand
              </div>
              <div className="team-list">
                <div className="admin-row admin-head">
                  <div>บริษัท / เวิร์กสเปซ</div>
                  <div>เจ้าของ</div>
                  <div className="admin-c-num">สมาชิก</div>
                  <div className="admin-c-date">สร้างเมื่อ</div>
                </div>
                {loading && <div className="team-empty">กำลังโหลด…</div>}
                {!loading && rows.length === 0 && <div className="team-empty">ยังไม่มีเวิร์กสเปซในระบบ</div>}
                {rows.map(r => (
                  <div key={r.id} className="admin-row">
                    <div className="admin-ws-name">{r.name}</div>
                    <div className="admin-ws-owner">{r.owner_email}</div>
                    <div className="admin-c-num">{Number(r.member_count)}</div>
                    <div className="admin-c-date">{thaiDate(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
