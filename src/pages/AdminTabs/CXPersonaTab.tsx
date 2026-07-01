import { useState } from 'react';
import type { AppData, WinCategory } from '../../types';

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

interface Props {
  data: AppData;
}

export default function CXPersonaTab({ data }: Props) {
  const [cxPersonaId, setCxPersonaId] = useState<string>(CX_PERSONAS[0].id);

  const winStories = data.winStories ?? [];
  const fb = data.feedback ?? { period: '', themes: [], entries: [] };
  const fbE = fb.entries;

  const p = CX_PERSONAS.find(x => x.id === cxPersonaId) ?? CX_PERSONAS[0];

  const planWinCats = p.plan === 'growth'
    ? ['efficiency','revenue','growth'] as const
    : ['transformation','retention','growth'] as const;
  const planWins = winStories.filter(w => (planWinCats as readonly string[]).includes(w.category));
  const winScore = Math.min(40, planWins.length * 8);

  const planFb = fbE.filter(e =>
    p.plan === 'growth'
      ? ['UX/UI', 'ราคา', 'ภาษาไทย', 'Onboarding', 'AI Features'].some(k => e.theme.includes(k) || e.content.includes(k))
      : ['API', 'Multi-workspace', 'Performance', 'Customization'].some(k => e.theme.includes(k) || e.content.includes(k))
  );
  const planFbPos = planFb.filter(e => e.sentiment === 'positive').length;
  const fbScore   = planFb.length > 0 ? Math.round((planFbPos / planFb.length) * 30) : 15;

  const valOk    = p.validationChecks.filter(v => v.ok).length;
  const valScore = Math.round((valOk / p.validationChecks.length) * 30);

  const healthTotal = winScore + fbScore + valScore;
  const healthColor = healthTotal >= 75 ? 'var(--green)' : healthTotal >= 50 ? 'var(--accent)' : '#dc2626';

  const healthRecs: string[] = [];
  if (winScore < 24) healthRecs.push(`เพิ่ม Win Story จากลูกค้า ${p.plan.toUpperCase()} อย่างน้อย ${3 - planWins.length} เรื่อง`);
  if (fbScore  < 18) healthRecs.push('ปรับ messaging ให้ตรงกับ pain point ที่ได้รับ feedback เชิงลบ');
  if (valScore < 24) healthRecs.push('ตรวจสอบ Validation Checklist — ยังมีข้อที่ยังไม่ผ่าน');
  if (healthTotal >= 75) healthRecs.push('✅ Persona แข็งแกร่ง — เน้น amplify ใน marketing channels ที่ทำงานดีอยู่แล้ว');

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

      {/* Persona Health Score */}
      <div className="phs-card" style={{ borderLeft: `4px solid ${healthColor}` }}>
        <div className="phs-top">
          <div>
            <div className="phs-title">🎯 Persona Health Score — {p.name.split(' ')[0]}</div>
            <div className="phs-sub">วัดความแข็งแกร่งของ persona นี้ด้วยข้อมูลจริงจาก Win Stories + Feedback</div>
          </div>
          <div className="phs-score-wrap">
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="30" fill="none" stroke="var(--ink4)" strokeWidth="6" />
              <circle cx="35" cy="35" r="30" fill="none" stroke={healthColor} strokeWidth="6"
                strokeDasharray={`${(healthTotal / 100) * 188.5} 188.5`}
                strokeLinecap="round" transform="rotate(-90 35 35)" />
              <text x="35" y="40" textAnchor="middle" fontSize="16" fontWeight="800" fill={healthColor}>{healthTotal}</text>
            </svg>
            <div className="phs-score-label" style={{ color: healthColor }}>/100</div>
          </div>
        </div>
        <div className="phs-components">
          {[
            { label: '🏆 Win Stories', score: winScore, max: 40, detail: `${planWins.length} เรื่องที่ตรงกับ ${p.plan} plan` },
            { label: '💬 Feedback', score: fbScore, max: 30, detail: `${planFbPos}/${planFb.length} positive จาก relevant feedback` },
            { label: '✅ Validation', score: valScore, max: 30, detail: `${valOk}/${p.validationChecks.length} checks ผ่าน` },
          ].map(c => (
            <div key={c.label} className="phs-component">
              <div className="phs-comp-top">
                <span className="phs-comp-label">{c.label}</span>
                <span className="phs-comp-score">{c.score}/{c.max}</span>
              </div>
              <div className="phs-bar-bg">
                <div className="phs-bar-fill" style={{ width: `${(c.score / c.max) * 100}%`, background: healthColor }} />
              </div>
              <div className="phs-comp-detail">{c.detail}</div>
            </div>
          ))}
        </div>
        {healthRecs.length > 0 && (
          <div className="phs-recs">
            <div className="phs-recs-title">📌 AI แนะนำ</div>
            {healthRecs.map((r, i) => <div key={i} className="phs-rec-item">{r}</div>)}
          </div>
        )}
        {planWins.length > 0 && (
          <div className="phs-wins">
            <div className="phs-wins-title">Win Stories ที่เชื่อมกับ persona นี้</div>
            <div className="phs-wins-list">
              {planWins.slice(0, 3).map(w => (
                <div key={w.id} className="phs-win-item">
                  <span style={{ color: WIN_CAT_COLOR[w.category] }}>{WIN_CAT_LABEL[w.category]}</span>
                  <span className="phs-win-name">{w.customerName}</span>
                  <span className="phs-win-metric">{w.headlineMetric}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <div className="cx-msg-key">&quot; {p.keyMessage} &quot;</div>
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
              <div className="cx-voc-quote">&quot;{q}&quot;</div>
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
                  <td className="cx-msg-hl">&quot;{m.headline}&quot;</td>
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
}
