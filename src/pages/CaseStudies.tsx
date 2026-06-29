import { useState } from 'react';

const CASES = [
  {
    id: 'tencent',
    tag: 'กลยุทธ์ M&A',
    company: 'Tencent Gaming',
    title: 'จากแอปแชทสู่เจ้าแห่งเกมโลก — ไม่ต้องสร้างเองจากศูนย์',
    industry: 'Gaming · Tech',
    origin: '🇨🇳 จีน',
    result: 'ครองหุ้น Riot, Epic, Supercell, Ubisoft, Activision Blizzard',
    color: '#06b6d4',
    lessons: [
      {
        icon: '🎯',
        title: 'M&A "นั่งรอผู้ชนะแล้วใช้เงินซื้อ"',
        body: 'แทนที่จะเสี่ยงสร้างเกมใหม่จากศูนย์ Tencent เฝ้าดูความสำเร็จของค่ายต่างๆ แล้วใช้เงินทุนมหาศาลเข้ากว้านซื้อหุ้น — Riot Games 100%, Epic Games 40%, Supercell 84% ผลลัพธ์: ไม่ว่าผู้เล่นเลือกเกมค่ายไหน เงินไหลเข้ากระเป๋า Tencent',
      },
      {
        icon: '🔗',
        title: 'Ecosystem Synergy — เชื่อมระบบนิเวศ',
        body: 'เริ่มจากแอปแชท QQ ที่หาโมเดลทำเงินไม่ได้ จุดเปลี่ยนคือการนำเกมออนไลน์จากเกาหลีใต้มาเปิดบริการในจีน แล้วเชื่อมระบบเติมเงินเข้ากับบัญชี QQ เด็กจีนทั้งประเทศแห่เติมเงินซื้อไอเทม เปลี่ยนแอปแชทเป็นเครื่องปั๊มเงินสดชั่วข้ามคืน',
      },
      {
        icon: '📱',
        title: 'Business Pivot — ขยายสเกลสู่ตลาดใหม่',
        body: 'ขอสิทธิ์ IP เกมคอมพิวเตอร์ PUBG มาดัดแปลงเป็น PUBG Mobile โดยมองเห็นจุดอ่อน: คนเอเชียจำนวนมากไม่มีเงินซื้อคอมสเปคสูง การเปิดฟรีบนมือถือทำให้ยอดดาวน์โหลดทะลุ 1,000 ล้านครั้งทั่วโลก',
      },
    ],
    keyLesson: 'ไม่จำเป็นต้องเป็นผู้คิดค้นโปรดักต์ที่เก่งที่สุด — รู้จักลดอีโก้ที่จะสร้างทุกอย่างเองจากศูนย์ แล้วใช้พาร์ทเนอร์ชิป เงินทุน หรือทรัพยากรที่มีอยู่ไปงัดมูลค่าของสิ่งนั้นให้สูงขึ้น',
    applyTo: [
      'หา "เพชรในตม" ที่มีอยู่แล้วในตลาด แทนการสร้างใหม่ทั้งหมด',
      'เชื่อมต่อผลิตภัณฑ์ที่มีฐานผู้ใช้อยู่แล้วเข้ากับระบบของคุณ',
      'นำ IP หรือ concept ที่ประสบความสำเร็จในตลาดหนึ่ง ไปขยายสู่อีกตลาด',
    ],
  },
  {
    id: 'paperclip',
    tag: 'AI Agent Strategy',
    company: 'Paperclip AI',
    title: 'เขียน Mission Prompt — สั่ง AI CEO สร้างบริษัท SaaS อัตโนมัติ',
    industry: 'AI · SaaS · Automation',
    origin: '🌐 Global',
    result: 'AI ทำงาน 24/7 โดยไม่ต้องเขียนโค้ดเองทุกอย่าง',
    color: '#f59e0b',
    lessons: [
      {
        icon: '📝',
        title: 'กฎทอง: ยิ่งชัดเจนยิ่งดี',
        body: 'กฎสำคัญของ Mission Prompt คือ "ยิ่งคำอธิบายเป้าหมายและภารกิจมีความชัดเจนและมุ่งเน้นมากเท่าไหร่ก็ยิ่งดีเท่านั้น" เพื่อให้เอเจนต์ CEO สามารถอ่านเป้าหมาย เริ่มทบทวนกระบวนการ และตัดสินใจจ้างงานทีมได้อย่างถูกต้อง',
      },
      {
        icon: '🤖',
        title: 'กระบวนการหลังป้อน Mission Prompt',
        body: 'เมื่อป้อนเป้าหมายลงในระบบ AI ตัวแรกจะถูกแต่งตั้งเป็น CEO จากนั้น CEO วางแผนและส่งคำขอจ้างงานตำแหน่งต่างๆ (เช่น CTO, CMO) มาที่กล่องจดหมายของคุณ เมื่อคุณอนุมัติ พนักงาน AI จะตื่นขึ้นทำงานตามรอบที่กำหนดตลอด 24 ชั่วโมง',
      },
      {
        icon: '🔌',
        title: 'ต่อยอดจากสิ่งที่มีอยู่ (ตามแนวทาง Tencent)',
        body: 'ไม่ต้องเขียน AI เอง — ใช้ OpenAI Codex ที่มีอยู่แล้ว, ใช้ Brave Search API สำหรับค้นหาข้อมูล, ใช้ Resend API สำหรับส่งอีเมล แล้วให้ AI Agents ประกอบร่างสิ่งเหล่านั้นเพื่อสร้าง SaaS ที่มีคุณค่า',
      },
    ],
    keyLesson: 'การทำธุรกิจในยุค AI ไม่ต้องเขียนโค้ดทุกอย่างเอง — ให้ AI Agent ทำหน้าที่เป็น CEO ที่สั่งการทีม AI ด้วยกันเอง คุณแค่ต้องเขียน "ภารกิจ" ให้ชัดเจน',
    applyTo: [],
    examples: [
      {
        label: 'SaaS B2B Newsletter ไทย',
        prompt: 'ค้นหาข่าวสารล่าสุดที่สำคัญที่สุดเกี่ยวกับวงการธุรกิจและเทคโนโลยี SaaS ในประเทศไทย รวบรวมข้อมูลเชิงลึก วิเคราะห์แนวโน้มตลาด และจัดทำอีเมลสรุปข่าวสารเป็นภาษาไทยส่งให้ลูกค้าทุกเช้า',
        api: 'Brave Search + Resend',
      },
      {
        label: 'SaaS วิเคราะห์เทรนด์ E-commerce',
        prompt: 'ค้นคว้าและติดตามสินค้าหรือบริการที่กำลังเป็นกระแส (Trending Products) ในตลาดออนไลน์ของประเทศไทย วิเคราะห์จุดเด่นของสินค้าเหล่านั้น และจัดทำรายงานสรุปโอกาสทางธุรกิจรายสัปดาห์ส่งผ่านอีเมล',
        api: 'Brave Search + Resend',
      },
      {
        label: 'SaaS Financial Insights — ตลาดหุ้น SET',
        prompt: 'ติดตามความเคลื่อนไหวของตลาดหลักทรัพย์แห่งประเทศไทย (SET) และเศรษฐกิจไทย ค้นหาข่าวสารทางการเงินที่สำคัญที่สุด และส่งรายงานสรุปแนวโน้มตลาดเป็นภาษาไทยผ่านทางอีเมลทุกวันหลังเวลาตลาดปิด',
        api: 'SET API + Resend',
      },
    ],
  },
];

export default function CaseStudies() {
  const [active, setActive] = useState(CASES[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const cs = CASES.find(c => c.id === active)!;

  function copyPrompt(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div className="cs-wrap">
      <div className="page-header">
        <div className="page-title">📚 Case Studies · บทเรียนธุรกิจ</div>
        <div className="page-sub">กรณีศึกษาจริงที่แปลงกลยุทธ์ระดับโลกสู่แนวทางปฏิบัติสำหรับ SME ไทย</div>
      </div>

      {/* Tabs */}
      <div className="cs-tabs">
        {CASES.map(c => (
          <button
            key={c.id}
            className={`cs-tab ${active === c.id ? 'active' : ''}`}
            onClick={() => setActive(c.id)}
            style={{ '--tab-color': c.color } as React.CSSProperties}
          >
            <span className="cs-tab-tag">{c.tag}</span>
            <span className="cs-tab-company">{c.company}</span>
          </button>
        ))}
      </div>

      {/* Case Header */}
      <div className="cs-header" style={{ borderLeftColor: cs.color }}>
        <div className="cs-header-meta">
          <span className="cs-badge" style={{ background: cs.color + '22', color: cs.color }}>{cs.industry}</span>
          <span className="cs-badge cs-badge-neutral">{cs.origin}</span>
        </div>
        <div className="cs-title">{cs.title}</div>
        <div className="cs-result">
          <svg width="14" height="14" fill="none" stroke={cs.color} viewBox="0 0 24 24" strokeWidth="2.2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {cs.result}
        </div>
      </div>

      {/* Lessons */}
      <div className="cs-lessons">
        {cs.lessons.map((l, i) => (
          <div key={i} className="cs-lesson">
            <div className="cs-lesson-icon">{l.icon}</div>
            <div>
              <div className="cs-lesson-title">{l.title}</div>
              <div className="cs-lesson-body">{l.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Lesson */}
      <div className="cs-keylesson" style={{ borderColor: cs.color + '44', background: cs.color + '0d' }}>
        <div className="cs-keylesson-label" style={{ color: cs.color }}>💡 บทเรียนสำคัญ</div>
        <div className="cs-keylesson-text">{cs.keyLesson}</div>
      </div>

      {/* Apply To (Tencent) */}
      {cs.applyTo && cs.applyTo.length > 0 && (
        <div className="cs-apply">
          <div className="cs-apply-title">นำไปใช้ได้อย่างไร</div>
          <ul className="cs-apply-list">
            {cs.applyTo.map((item, i) => (
              <li key={i} className="cs-apply-item">
                <span className="cs-apply-dot" style={{ background: cs.color }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mission Prompt Examples (Paperclip) */}
      {cs.examples && (
        <div className="cs-examples">
          <div className="cs-examples-title">ตัวอย่าง Mission Prompts สำหรับ SaaS ไทย</div>
          <div className="cs-examples-grid">
            {cs.examples.map((ex, i) => {
              const key = `ex-${i}`;
              return (
                <div key={i} className="cs-example">
                  <div className="cs-example-hd">
                    <span className="cs-example-label">{ex.label}</span>
                    <span className="cs-example-api">{ex.api}</span>
                  </div>
                  <div className="cs-example-prompt">"{ex.prompt}"</div>
                  <button
                    className="cs-copy-btn"
                    onClick={() => copyPrompt(ex.prompt, key)}
                  >
                    {copied === key ? '✓ คัดลอกแล้ว' : 'คัดลอก Prompt'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
