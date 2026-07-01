import { useState } from 'react';
import type { AppData } from '../../types';

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
}

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

const TIS_ARTICLE_SEEDS = [
  {
    id: 'tis-steel',
    cluster: 'เหล็กและก่อสร้าง',
    clusterIcon: '🏗️',
    persona: 'สมชาย',
    month: 'ก.ค. 2026',
    title: 'SME เตรียมพร้อมขอรับรอง TIS 50-2565 ด้วย AI: Checklist ฉบับสมบูรณ์ปี 2569',
    keyword: 'ขอรับรอง TIS 50-2565 โรงงานเหล็ก AI',
    intent: 'Informational',
    target: '/market?cat=iso-consult',
    hook: '"สมชายเสียเวลา 3 เดือนรวบรวมเอกสาร — AI ช่วยทำได้ใน 3 วัน"',
    structure: [
      { sec: 'Hook',      text: 'สมชายเจ้าของโรงงานเหล็กเสียเวลา 3 เดือนรวบรวมเอกสาร TIS — AI ช่วยทำได้ใน 3 วัน' },
      { sec: 'Section 1', text: 'ทำความเข้าใจ TIS 50-2565 ต้องการอะไรบ้าง (Gap Analysis)' },
      { sec: 'Section 2', text: 'เอกสาร 12 รายการที่ต้องเตรียมและ Template ที่ AI ช่วยสร้าง' },
      { sec: 'Section 3', text: 'กระบวนการ Internal Audit ก่อนยื่นขอรับรอง' },
      { sec: 'Section 4', text: 'Case Study: โรงงานเหล็ก X ผ่าน TIS ใน 45 วัน (เทียบ: เดิม 4 เดือน)' },
      { sec: 'CTA',       text: 'ทำ CEO AI Business Audit ฟรี → เพื่อดู Gap ของธุรกิจคุณทันที' },
    ],
  },
  {
    id: 'tis-logistics',
    cluster: 'โลจิสติกส์และขนส่ง',
    clusterIcon: '🚛',
    persona: 'สมชาย',
    month: 'ก.ค. 2026',
    title: 'ISO 9001:2015 สำหรับธุรกิจขนส่งไทย — ลดต้นทุน 20% ด้วย AI Document Automation',
    keyword: 'ISO 9001 ธุรกิจขนส่ง ลดต้นทุน AI',
    intent: 'Commercial',
    target: '/market?cat=iso-consult',
    hook: '"ถ้าบริษัทขนส่งของคุณยังไม่มี ISO 9001 คุณกำลังเสียโอกาสประมูลงานใหญ่ทุกปี"',
    structure: [
      { sec: 'Hook',      text: 'ถ้าบริษัทขนส่งยังไม่มี ISO 9001 — กำลังเสียโอกาสประมูลงานใหญ่ทุกปี' },
      { sec: 'Section 1', text: 'ทำไม ISO 9001 ถึงเป็นข้อกำหนดในการประมูลงานภาครัฐ' },
      { sec: 'Section 2', text: 'ขั้นตอนขอ ISO 9001 สำหรับบริษัทขนส่งขนาดกลาง (Timeline 90 วัน)' },
      { sec: 'Section 3', text: 'เอกสารที่ต้องเตรียม + Template ฟรีจาก CEO AI Thailand' },
      { sec: 'Section 4', text: 'วิธีใช้ AI วิเคราะห์ Route Efficiency ควบคู่ ISO Quality Management' },
      { sec: 'CTA',       text: 'รับ ISO 9001 Readiness Report ฟรี — วิเคราะห์ความพร้อมธุรกิจของคุณใน 5 นาที' },
    ],
  },
  {
    id: 'tis-food',
    cluster: 'อาหารและส่งออก',
    clusterIcon: '🥗',
    persona: 'วนิดา',
    month: 'ส.ค. 2026',
    title: 'HACCP + GMP สำหรับผู้ผลิตอาหาร SME ที่อยากส่งออก: AI ช่วยผ่านการตรวจสอบใน 60 วัน',
    keyword: 'HACCP GMP ผู้ผลิตอาหาร SME ส่งออก AI',
    intent: 'Informational',
    target: '/market?cat=iso-consult',
    hook: '"วนิดาธุรกิจครอบครัวผลิตซอสพริก — ฝันอยากส่งออกแต่ไม่รู้ว่าต้องทำ HACCP ยังไง"',
    structure: [
      { sec: 'Hook',      text: 'วนิดาทายาทธุรกิจซอสพริกรุ่น 2 อยากส่งออกแต่ติด HACCP/GMP — AI ช่วยสร้างระบบใน 60 วัน' },
      { sec: 'Section 1', text: 'ความแตกต่างระหว่าง HACCP และ GMP และธุรกิจอาหารต้องมีอะไรบ้าง' },
      { sec: 'Section 2', text: 'Hazard Analysis 7 ขั้นตอนที่ AI ช่วยวิเคราะห์โดยอัตโนมัติ' },
      { sec: 'Section 3', text: 'เอกสาร Critical Control Points (CCP) + Monitoring Records Template' },
      { sec: 'Section 4', text: 'Case Study: SME ขนมไทยผ่าน GMP แล้วส่งออก Japan ได้ภายใน 4 เดือน' },
      { sec: 'CTA',       text: 'ทำ Food Business Compliance Audit ฟรี → เริ่มเส้นทางส่งออกของคุณวันนี้' },
    ],
  },
  {
    id: 'tis-service',
    cluster: 'บริการและที่ปรึกษา',
    clusterIcon: '💼',
    persona: 'ชาญกิจ',
    month: 'ส.ค. 2026',
    title: 'ISO 20000 IT Service Management ฉบับ SME ไทย — ที่ปรึกษาดูแลลูกค้าได้ 3 เท่าด้วย AI',
    keyword: 'ISO 20000 IT Service SME ที่ปรึกษา AI',
    intent: 'Commercial',
    target: '/market?cat=consult',
    hook: '"ชาญกิจที่ปรึกษา IT ดูแลลูกค้า 12 รายด้วยตัวคนเดียว — AI ช่วยให้รับลูกค้าได้ 36 ราย"',
    structure: [
      { sec: 'Hook',      text: 'ชาญกิจดูแลลูกค้า 12 รายด้วยตัวคนเดียว — AI ช่วยให้รับงานได้เพิ่ม 3 เท่าโดยไม่จ้างพนักงานเพิ่ม' },
      { sec: 'Section 1', text: 'ISO 20000 คืออะไรและทำไมบริษัท IT ที่ดูแลระบบ SME ต้องมี' },
      { sec: 'Section 2', text: 'วิธีใช้ AI สร้าง Service Management Documentation อัตโนมัติ' },
      { sec: 'Section 3', text: 'Partner Program: ที่ปรึกษาที่ใช้ CEO AI Thailand ดูแลลูกค้าได้อย่างไร' },
      { sec: 'Section 4', text: 'ROI Calculation: ลงทุน ฿5,000/เดือน ประหยัดเวลา 120 ชม./เดือน = คุ้มค่า 24 เท่า' },
      { sec: 'CTA',       text: 'สมัคร Partner Program ฟรี → รับ Commission 15% จากลูกค้าที่แนะนำ' },
    ],
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

export default function SEOTab({ data, onUpdate }: Props) {
  const [techChecks, setTechChecks]       = useState<boolean[]>(TECH_SEO_CHECKS_INIT.map(() => false));
  const [qualityChecks, setQualityChecks] = useState<boolean[]>(QUALITY_SEO_CHECKS_INIT.map(() => false));
  const [seoSchemaIdx, setSeoSchemaIdx]   = useState(0);
  const [seoArticleExpanded, setSeoArticleExpanded] = useState<string | null>(null);
  const [seoAssigning, setSeoAssigning]   = useState<string | null>(null);

  return (
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
          const pct = Math.min(100, Math.round((m.current / m.target) * 100));
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
                  style={{ width: `${pct}%`, background: pct >= 75 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : '#f59e0b' }}
                />
              </div>
              <div className="seo-metric-pct">{pct}% of target · {m.tool}</div>
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

      {/* TIS/ISO Article Seeds — AI Agent Generator */}
      <div className="seo-section">
        <div className="seo-section-title">🤖 TIS/ISO Content Seeds — Assign to AI Agent</div>
        <div className="seo-note">
          บทความเหล่านี้สร้างมาจาก GTM Cluster Strategy — กด <strong>🤖 Assign to AI Agent</strong> เพื่อให้ CMO Agent สร้าง Draft แรกใน AI Company Tab
        </div>
        <div className="tis-seed-list">
          {TIS_ARTICLE_SEEDS.map((seed) => {
            const existingTask = data.aiCompany?.tasks?.find(t =>
              t.title.includes(seed.id) || t.detail.includes(seed.id)
            );
            const taskStatus = existingTask?.status;
            const taskOutput = existingTask?.output;
            const isExpanded = seoArticleExpanded === seed.id;
            const cmkAgent = data.aiCompany?.agents?.find(a =>
              a.role.toLowerCase().includes('cmo') ||
              a.role.toLowerCase().includes('content') ||
              a.role.toLowerCase().includes('marketing')
            ) ?? data.aiCompany?.agents?.[0];

            return (
              <div key={seed.id} className="tis-seed-card">
                <div className="tis-seed-header">
                  <div className="tis-seed-meta">
                    <span className="tis-seed-cluster">{seed.clusterIcon} {seed.cluster}</span>
                    <span className="tis-seed-persona">👤 Persona: {seed.persona}</span>
                    <span className="tis-seed-month">📅 {seed.month}</span>
                    {taskStatus && (
                      <span className={`tis-seed-status tis-status-${taskStatus}`}>
                        {taskStatus === 'queued' ? '⏳ รอดำเนินการ'
                          : taskStatus === 'in_progress' ? '⚙️ กำลังสร้าง'
                          : taskStatus === 'review' ? '🔍 รอตรวจ'
                          : taskStatus === 'done' ? '✅ Draft พร้อม'
                          : '⛔ Blocked'}
                      </span>
                    )}
                  </div>
                  <div className="tis-seed-actions">
                    <button
                      className="tis-seed-toggle"
                      onClick={() => setSeoArticleExpanded(isExpanded ? null : seed.id)}
                    >
                      {isExpanded ? '▲ ซ่อน' : '▼ ดู Structure'}
                    </button>
                    {!taskStatus && (
                      <button
                        className={`tis-seed-assign${seoAssigning === seed.id ? ' loading' : ''}`}
                        disabled={seoAssigning === seed.id}
                        onClick={() => {
                          if (!cmkAgent) return;
                          setSeoAssigning(seed.id);
                          const taskId = `seo-tis-${seed.id}-${Date.now().toString(36)}`;
                          const detail = [
                            `[ARTICLE_SEED_ID:${seed.id}]`,
                            `Cluster: ${seed.cluster}`,
                            `Persona หลัก: ${seed.persona}`,
                            `Keyword เป้าหมาย: ${seed.keyword}`,
                            `Hook: ${seed.hook}`,
                            '',
                            'โครงสร้างบทความ:',
                            ...seed.structure.map(s => `[${s.sec}] ${s.text}`),
                            '',
                            'งาน: สร้าง Draft บทความ How-to ภาษาไทย ความยาว 1,200–1,500 คำ',
                            'โดยใช้ Persona ที่กำหนดเป็นตัวเอก ใส่ Internal Link ไปยัง CEO AI Business Audit',
                            'และ CTA ตามที่ระบุในโครงสร้าง',
                          ].join('\n');
                          const next = {
                            ...data,
                            aiCompany: {
                              ...data.aiCompany,
                              tasks: [
                                ...(data.aiCompany?.tasks ?? []),
                                { id: taskId, agentId: cmkAgent.id, title: `[SEO Draft] ${seed.title} [${seed.id}]`, detail, status: 'queued' as const },
                              ],
                            },
                          };
                          onUpdate(next);
                          setTimeout(() => setSeoAssigning(null), 800);
                        }}
                      >
                        {seoAssigning === seed.id ? '⏳ กำลัง Assign…' : `🤖 Assign to ${cmkAgent?.role ?? 'AI Agent'}`}
                      </button>
                    )}
                    {taskStatus === 'done' && taskOutput && (
                      <button className="tis-seed-toggle" onClick={() => setSeoArticleExpanded(isExpanded ? null : seed.id)}>
                        📄 ดู Draft
                      </button>
                    )}
                  </div>
                </div>

                <div className="tis-seed-title">{seed.title}</div>
                <div className="tis-seed-kw">🔑 {seed.keyword} &nbsp;·&nbsp; <span className="tis-seed-intent">{seed.intent}</span></div>

                {isExpanded && (
                  <div className="tis-seed-detail">
                    <div className="tis-seed-hook">&ldquo;{seed.hook}&rdquo;</div>
                    <div className="tis-seed-struct">
                      {seed.structure.map((s, si) => (
                        <div key={si} className="tis-struct-row">
                          <span className="tis-struct-sec">{s.sec}</span>
                          <span className="tis-struct-text">{s.text}</span>
                        </div>
                      ))}
                    </div>
                    {taskOutput && (
                      <div className="tis-seed-output">
                        <div className="tis-seed-output-title">📝 AI Draft</div>
                        <div className="tis-seed-output-text">{taskOutput}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
  );
}
