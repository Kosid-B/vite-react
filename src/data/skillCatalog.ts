export type SkillCategory = 'strategy' | 'sales' | 'marketing' | 'analytics' | 'technology' | 'hr' | 'impact';
export type SkillTier = 1 | 2 | 3;

export interface SkillEntry {
  id: string;
  name: string;           // ชื่อแสดงผล
  category: SkillCategory;
  tier: SkillTier;        // 1=Foundation, 2=Professional, 3=Enterprise
  price: number;          // บาท
  desc: string;           // คำอธิบาย 1 ประโยค
  icon: string;
  tags: string[];         // role ที่เหมาะสม
}

export const CATEGORY_META: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  strategy:   { label: 'กลยุทธ์ธุรกิจ',        icon: '🏗️', color: '#c44b2b' },
  sales:      { label: 'การขายและรายได้',        icon: '📈', color: '#a05c1a' },
  marketing:  { label: 'การตลาด',               icon: '📣', color: '#2d6a4f' },
  analytics:  { label: 'การวิเคราะห์ข้อมูล',    icon: '📊', color: '#1a4f8a' },
  technology: { label: 'เทคโนโลยีและระบบ',      icon: '🔧', color: '#6b3fa0' },
  hr:         { label: 'ทรัพยากรบุคคล',         icon: '👥', color: '#0e7490' },
  impact:     { label: 'ผลกระทบและการรายงาน',   icon: '🌱', color: '#374151' },
};

export const TIER_META: Record<SkillTier, { label: string; color: string; bg: string }> = {
  1: { label: 'Foundation',   color: '#374151', bg: '#f3f4f6' },
  2: { label: 'Professional', color: '#1a4f8a', bg: '#eff4fb' },
  3: { label: 'Enterprise',   color: '#c44b2b', bg: '#fdf3f0' },
};

export const SKILL_CATALOG: SkillEntry[] = [
  // ── Tier 3 · Enterprise · ฿2,000 ──────────────────────────────────────────
  {
    id: 'business-building-24-step',
    name: '24 Steps Business Builder (MIT)',
    category: 'strategy', tier: 3, price: 2000, icon: '🧭',
    desc: 'กรอบสร้างธุรกิจ 24 ขั้นตอนของ MIT ตั้งแต่ Beachhead Market จนถึง MVBP พร้อม Unit Economics',
    tags: ['CEO', 'Founder', 'COO'],
  },
  {
    id: 'value-proposition-canvas',
    name: 'Value Proposition Canvas',
    category: 'strategy', tier: 3, price: 2000, icon: '💎',
    desc: 'ออกแบบคุณค่าที่ตรงใจลูกค้า ลดช่องว่างระหว่าง Product/Market Fit อย่างเป็นระบบ',
    tags: ['CEO', 'Product Manager', 'Marketing Manager'],
  },
  {
    id: 'saas-metrics-dashboard',
    name: 'SaaS Metrics Dashboard',
    category: 'analytics', tier: 3, price: 2000, icon: '📡',
    desc: 'Dashboard MRR, LTV, CAC, NRR, Churn พร้อม Alert System สำหรับธุรกิจ Subscription',
    tags: ['CEO', 'CFO', 'CTO'],
  },
  {
    id: 'revenue-model',
    name: 'Revenue Model Designer',
    category: 'sales', tier: 3, price: 2000, icon: '💰',
    desc: 'ออกแบบและวิเคราะห์โมเดลรายได้ รายรับหลายช่องทาง การคาดการณ์ทางการเงิน 12 เดือน',
    tags: ['CEO', 'CFO', 'Sales Manager'],
  },
  {
    id: 'pricing-strategy',
    name: 'Pricing Strategy',
    category: 'sales', tier: 3, price: 2000, icon: '🎯',
    desc: 'กลยุทธ์ตั้งราคาเพิ่มกำไรสูงสุด ครอบคลุม Value-Based, Freemium, Tiered และ Dynamic Pricing',
    tags: ['CEO', 'Sales Manager', 'CFO'],
  },
  {
    id: 'customer-lifetime-value',
    name: 'Customer Lifetime Value (LTV)',
    category: 'analytics', tier: 3, price: 2000, icon: '♾️',
    desc: 'คำนวณ LTV เปรียบเทียบกับ CAC วัด Unit Economics และ Payback Period อย่างแม่นยำ',
    tags: ['CFO', 'Marketing Manager', 'CEO'],
  },
  {
    id: 'attribution-model',
    name: 'Attribution Model',
    category: 'analytics', tier: 3, price: 2000, icon: '🔗',
    desc: 'วิเคราะห์ว่าช่องทางการตลาดไหนสร้างรายได้จริง First-touch, Last-touch, Data-Driven',
    tags: ['CTO', 'Marketing Manager', 'Data Analyst'],
  },
  {
    id: 'cohort-analysis',
    name: 'Cohort Retention Analysis',
    category: 'analytics', tier: 3, price: 2000, icon: '🔬',
    desc: 'ติดตาม Retention ของลูกค้าแต่ละ Cohort เผยให้เห็นแนวโน้ม Churn ที่ตัวเลขรวมซ่อนไว้',
    tags: ['CTO', 'Data Analyst', 'CEO'],
  },
  {
    id: 'kpi-dashboard',
    name: 'KPI Dashboard Design',
    category: 'analytics', tier: 3, price: 2000, icon: '📊',
    desc: 'ออกแบบ KPI Dashboard สำหรับผู้บริหาร ครอบคลุม Leading/Lagging Indicators ที่ขับเคลื่อนการตัดสินใจ',
    tags: ['CEO', 'COO', 'CTO'],
  },

  // ── Tier 2 · Professional · ฿1,500 ───────────────────────────────────────
  {
    id: 'conversion-funnel-analysis',
    name: 'Conversion Funnel Analysis',
    category: 'sales', tier: 2, price: 1500, icon: '🔽',
    desc: 'วิเคราะห์คอขวดใน Sales Funnel เพิ่ม Conversion Rate ในแต่ละขั้นตอน',
    tags: ['Sales Manager', 'Marketing Manager', 'CTO'],
  },
  {
    id: 'customer-persona',
    name: 'Customer Persona Builder',
    category: 'marketing', tier: 2, price: 1500, icon: '👤',
    desc: 'สร้าง Persona ลูกค้าเป้าหมายที่ละเอียดและนำไปใช้ได้จริง พร้อม Buying Criteria',
    tags: ['Marketing Manager', 'Sales Manager', 'Product Manager'],
  },
  {
    id: 'customer-segmentation',
    name: 'Customer Segmentation',
    category: 'marketing', tier: 2, price: 1500, icon: '🗂️',
    desc: 'แบ่งกลุ่มลูกค้าตามพฤติกรรม มูลค่า และลักษณะ เพื่อกลยุทธ์ที่ตรงเป้ากว่า',
    tags: ['Marketing Manager', 'Sales Manager'],
  },
  {
    id: 'customer-journey-map',
    name: 'Customer Journey Map',
    category: 'marketing', tier: 2, price: 1500, icon: '🗺️',
    desc: 'แผนที่เส้นทางลูกค้าตั้งแต่รู้จักถึงซื้อซ้ำ พร้อมระบุ Pain Point และโอกาสปรับปรุง',
    tags: ['Marketing Manager', 'CX Manager', 'Product Manager'],
  },
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    category: 'marketing', tier: 2, price: 1500, icon: '💬',
    desc: 'วิเคราะห์ความรู้สึกลูกค้าจาก Review, Social Media และ Support Ticket แบบเชิงลึก',
    tags: ['Marketing Manager', 'CX Manager', 'CTO'],
  },
  {
    id: 'marketplace-metrics',
    name: 'Marketplace Metrics',
    category: 'analytics', tier: 2, price: 1500, icon: '🏪',
    desc: 'ตัวชี้วัดสำคัญสำหรับ Marketplace และ Platform Business: GMV, Take Rate, Liquidity',
    tags: ['CEO', 'CTO', 'Marketing Manager'],
  },
  {
    id: 'pricing-analysis',
    name: 'Pricing Analysis',
    category: 'sales', tier: 2, price: 1500, icon: '🔍',
    desc: 'วิเคราะห์ราคาตลาดและคู่แข่ง หาโอกาสปรับราคาเพื่อเพิ่ม Revenue และ Margin',
    tags: ['Sales Manager', 'CFO'],
  },
  {
    id: 'pricing-calculator',
    name: 'Pricing Calculator',
    category: 'sales', tier: 2, price: 1500, icon: '🧮',
    desc: 'คำนวณราคาที่เหมาะสม ครอบคลุม Margin, Markup, Break-even และ Target ROI',
    tags: ['Sales Manager', 'CFO', 'Finance'],
  },
  {
    id: 'ab-test-plan',
    name: 'A/B Test Plan',
    category: 'technology', tier: 2, price: 1500, icon: '⚖️',
    desc: 'วางแผน A/B Test อย่างเป็นระบบ ออกแบบ Experiment และวัดผลอย่างถูกต้องทางสถิติ',
    tags: ['CTO', 'Marketing Manager', 'Product Manager'],
  },
  {
    id: 'data-dashboard-design',
    name: 'Data Dashboard Design',
    category: 'analytics', tier: 2, price: 1500, icon: '🖥️',
    desc: 'ออกแบบ Dashboard ที่อ่านง่าย สร้างการตัดสินใจได้จริง ไม่ท่วมด้วยข้อมูลที่ไม่จำเป็น',
    tags: ['CTO', 'Data Analyst'],
  },
  {
    id: 'metric-definition-guide',
    name: 'Metric Definition Guide',
    category: 'analytics', tier: 2, price: 1500, icon: '📐',
    desc: 'กำหนดนิยาม KPI ชัดเจน ทั้งทีมคำนวณตรงกัน ขจัดความสับสนในการรายงาน',
    tags: ['CTO', 'COO', 'Data Analyst'],
  },
  {
    id: 'analytics-setup-guide',
    name: 'Analytics Setup Guide',
    category: 'technology', tier: 2, price: 1500, icon: '⚙️',
    desc: 'ติดตั้งระบบ Analytics ครบวงจร ตั้งแต่ Event Tracking จนถึง Reporting Pipeline',
    tags: ['CTO', 'Data Analyst'],
  },
  {
    id: 'benchmarking-report',
    name: 'Benchmarking Report',
    category: 'strategy', tier: 2, price: 1500, icon: '📋',
    desc: 'เปรียบเทียบ Performance กับ Benchmark อุตสาหกรรม ระบุจุดแข็ง/อ่อน และโอกาส',
    tags: ['CEO', 'COO', 'CTO'],
  },
  {
    id: 'salesforce-developer',
    name: 'Salesforce Developer',
    category: 'technology', tier: 2, price: 1500, icon: '☁️',
    desc: 'พัฒนา ปรับแต่ง และ Automate Salesforce CRM เพื่อ Sales Process ที่มีประสิทธิภาพ',
    tags: ['Salesforce Developer', 'CRM Manager', 'CTO'],
  },
  {
    id: 'automation-workflow',
    name: 'Automation Workflow',
    category: 'technology', tier: 2, price: 1500, icon: '🤖',
    desc: 'สร้าง Workflow อัตโนมัติ ลดงานซ้ำซ้อน เพิ่มประสิทธิภาพทีมด้วย No-code/Low-code',
    tags: ['CTO', 'Operations Manager', 'Salesforce Developer'],
  },
  {
    id: 'feedback-analysis',
    name: 'Feedback Analysis',
    category: 'marketing', tier: 2, price: 1500, icon: '💡',
    desc: 'วิเคราะห์ Feedback จากลูกค้าเชิงลึก ระบุ Theme หลัก และ Actionable Insight',
    tags: ['Product Manager', 'CX Manager', 'CTO'],
  },
  {
    id: 'marketplace-seo',
    name: 'Marketplace SEO',
    category: 'marketing', tier: 2, price: 1500, icon: '🔎',
    desc: 'เพิ่มการมองเห็นสินค้าบน Marketplace ด้วย SEO, Keyword Optimization และ Algorithm',
    tags: ['Marketing Manager', 'SEO Specialist'],
  },
  {
    id: 'product-roadmap',
    name: 'Product Roadmap',
    category: 'strategy', tier: 2, price: 1500, icon: '🗓️',
    desc: 'วางแผน Roadmap สินค้า จัดลำดับ Feature ตาม Business Impact vs Effort อย่างมีกลยุทธ์',
    tags: ['Product Manager', 'CTO', 'CEO'],
  },

  // ── HR & Team · Tier 3 · Enterprise · ฿2,000 ────────────────────────────
  {
    id: 'compensation-design',
    name: 'Compensation & Benefits Design',
    category: 'hr', tier: 3, price: 2000, icon: '💴',
    desc: 'ออกแบบโครงสร้างเงินเดือน Salary Band สวัสดิการ และ Incentive Plan ที่แข่งขันได้ในตลาด',
    tags: ['HRD Manager', 'CEO', 'CFO'],
  },

  // ── HR & Team · Tier 2 · Professional · ฿1,500 ───────────────────────────
  {
    id: 'performance-review',
    name: 'Performance Review System',
    category: 'hr', tier: 2, price: 1500, icon: '⭐',
    desc: 'ออกแบบระบบประเมินผลงาน 360 องศา Rating Scale KPI Scorecard และแผนพัฒนารายบุคคล',
    tags: ['HRD Manager', 'HR Manager', 'CEO'],
  },
  {
    id: 'training-plan',
    name: 'Training & Development Plan',
    category: 'hr', tier: 2, price: 1500, icon: '📖',
    desc: 'วางแผนพัฒนาทักษะและฝึกอบรม Blended Learning ครอบคลุม OJT, Workshop, E-learning',
    tags: ['HRD Manager', 'HR Manager', 'COO'],
  },
  {
    id: 'talent-acquisition',
    name: 'Talent Acquisition Strategy',
    category: 'hr', tier: 2, price: 1500, icon: '🎯',
    desc: 'กลยุทธ์สรรหาบุคลากรครบวงจร Sourcing, Interview Scorecard, Offer และ Time-to-Hire KPI',
    tags: ['HRD Manager', 'HR Manager', 'CEO'],
  },

  // ── HR & Team · Tier 1 · Foundation · ฿1,000 ─────────────────────────────
  {
    id: 'team-onboarding',
    name: 'Team Onboarding Plan',
    category: 'hr', tier: 1, price: 1000, icon: '🚪',
    desc: 'สร้างแผน Onboarding 30/60/90 วัน ลด Time-to-Productivity และเพิ่ม Retention พนักงานใหม่',
    tags: ['HRD Manager', 'HR Manager', 'Team Lead'],
  },

  // ── Tier 1 · Foundation · ฿1,000 ─────────────────────────────────────────
  {
    id: 'customer-win-story',
    name: 'Customer Win Story',
    category: 'sales', tier: 1, price: 1000, icon: '🏆',
    desc: 'เขียน Case Study ที่ชนะใจ เพิ่มความน่าเชื่อถือและเปลี่ยนผู้สนใจเป็นลูกค้าได้เร็วขึ้น',
    tags: ['Sales Manager', 'Marketing Manager'],
  },
  {
    id: 'keyword-research',
    name: 'Keyword Research',
    category: 'marketing', tier: 1, price: 1000, icon: '🔑',
    desc: 'วิจัย Keyword ที่ลูกค้าค้นหา เพื่อ SEO, Content Marketing และ Paid Advertising',
    tags: ['Marketing Manager', 'SEO Specialist', 'Content Creator'],
  },
  {
    id: 'knowledge-base-builder',
    name: 'Knowledge Base Builder',
    category: 'hr', tier: 1, price: 1000, icon: '📚',
    desc: 'สร้าง Knowledge Base สำหรับทีมและลูกค้า ลด Support Ticket และเพิ่ม Self-service',
    tags: ['HR Manager', 'HRD Manager', 'COO', 'CTO'],
  },
  {
    id: 'job-posting',
    name: 'Job Posting Creator',
    category: 'hr', tier: 1, price: 1000, icon: '📝',
    desc: 'เขียนประกาศงานที่ดึงดูดผู้สมัครคุณภาพ ตรงวัฒนธรรมองค์กร ลด Time-to-Hire',
    tags: ['HR Manager', 'HRD Manager', 'COO'],
  },
  {
    id: 'survey-analysis',
    name: 'Survey Analysis',
    category: 'analytics', tier: 1, price: 1000, icon: '📋',
    desc: 'วิเคราะห์ผลสำรวจความคิดเห็น สถิติ Cross-tabulation และ Actionable Insight',
    tags: ['Marketing Manager', 'HR Manager', 'HRD Manager', 'CX Manager'],
  },
  {
    id: 'data-collection-plan',
    name: 'Data Collection Plan',
    category: 'analytics', tier: 1, price: 1000, icon: '📥',
    desc: 'วางแผนเก็บข้อมูลอย่างเป็นระบบ แหล่งข้อมูล วิธีการ ความถี่ และ Data Governance',
    tags: ['CTO', 'Data Analyst'],
  },
  {
    id: 'saas-onboarding-flow',
    name: 'SaaS Onboarding Flow',
    category: 'technology', tier: 1, price: 1000, icon: '🚀',
    desc: 'ออกแบบ Onboarding สำหรับ SaaS ลด Time-to-Value เพิ่ม Activation Rate',
    tags: ['Product Manager', 'CTO', 'CX Manager'],
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    category: 'strategy', tier: 1, price: 1000, icon: '🛡️',
    desc: 'ประเมินและจัดการความเสี่ยงทางธุรกิจอย่างเป็นระบบ พร้อม Mitigation Plan',
    tags: ['CEO', 'COO', 'CFO'],
  },
  {
    id: 'grant-report',
    name: 'Grant Report Writer',
    category: 'impact', tier: 1, price: 1000, icon: '📄',
    desc: 'เขียนรายงานผลการดำเนินงานสำหรับผู้ให้ทุน ครบถ้วน โปร่งใส น่าเชื่อถือ',
    tags: ['COO', 'HR Manager'],
  },
  {
    id: 'impact-report',
    name: 'Impact Report',
    category: 'impact', tier: 1, price: 1000, icon: '🌟',
    desc: 'รายงานผลกระทบเชิงสังคมที่วัดได้จริง สำหรับ Stakeholder รายงานประจำปี',
    tags: ['COO', 'CEO', 'Marketing Manager'],
  },
  {
    id: 'social-impact-measurement',
    name: 'Social Impact Measurement',
    category: 'impact', tier: 1, price: 1000, icon: '🌱',
    desc: 'ออกแบบกรอบวัดผลกระทบทางสังคม Logic Model ตัวชี้วัด Output/Outcome/Impact เก็บข้อมูล วิเคราะห์ผล และรายงาน Social ROI สำหรับทีมขายและการตลาด',
    tags: ['COO', 'CEO', 'Sales Manager', 'CMO'],
  },
  // ── ISO Compliance ──────────────────────────────────────────────────────────
  {
    id: 'iso-9001-compliance-autopilot',
    name: 'ISO-9001-Compliance-Autopilot',
    category: 'strategy', tier: 3, price: 2000, icon: '🛡️',
    desc: 'Automated Auditor ประจำองค์กร: สแกน Gap Analysis, ร่างเอกสาร QMS, จำลอง Internal Audit และเสนอ Corrective Action ภาษาไทย 100% ตามมาตรฐาน TIS/ISO 9001:2015',
    tags: ['CEO', 'COO', 'Quality Manager', 'Consultant'],
  },
];

export const SKILL_TOTAL_VALUE = SKILL_CATALOG.reduce((s, sk) => s + sk.price, 0);
