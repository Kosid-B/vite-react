import { useState } from 'react';
import type { AppData, CaseStudy } from '../types';

const CASES: CaseStudy[] = [
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
    company: 'Mission-Driven AI',
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
        body: 'ไม่ต้องเขียน AI เอง — ใช้ OpenAI Codex ที่มีอยู่แล้ว, ใช้ Serper.dev สำหรับค้นหาข้อมูลจาก Google, ใช้ Resend API สำหรับส่งอีเมล แล้วให้ AI Agents ประกอบร่างสิ่งเหล่านั้นเพื่อสร้าง SaaS ที่มีคุณค่า',
      },
    ],
    keyLesson: 'การทำธุรกิจในยุค AI ไม่ต้องเขียนโค้ดทุกอย่างเอง — ให้ AI Agent ทำหน้าที่เป็น CEO ที่สั่งการทีม AI ด้วยกันเอง คุณแค่ต้องเขียน "ภารกิจ" ให้ชัดเจน',
    applyTo: [],
    examples: [
      {
        label: 'SaaS B2B Newsletter ไทย',
        prompt: 'ค้นหาข่าวสารล่าสุดที่สำคัญที่สุดเกี่ยวกับวงการธุรกิจและเทคโนโลยี SaaS ในประเทศไทย รวบรวมข้อมูลเชิงลึก วิเคราะห์แนวโน้มตลาด และจัดทำอีเมลสรุปข่าวสารเป็นภาษาไทยส่งให้ลูกค้าทุกเช้า',
        api: 'Serper.dev + Resend',
      },
      {
        label: 'SaaS วิเคราะห์เทรนด์ E-commerce',
        prompt: 'ค้นคว้าและติดตามสินค้าหรือบริการที่กำลังเป็นกระแส (Trending Products) ในตลาดออนไลน์ของประเทศไทย วิเคราะห์จุดเด่นของสินค้าเหล่านั้น และจัดทำรายงานสรุปโอกาสทางธุรกิจรายสัปดาห์ส่งผ่านอีเมล',
        api: 'Serper.dev + Resend',
      },
      {
        label: 'SaaS Financial Insights — ตลาดหุ้น SET',
        prompt: 'ติดตามความเคลื่อนไหวของตลาดหลักทรัพย์แห่งประเทศไทย (SET) และเศรษฐกิจไทย ค้นหาข่าวสารทางการเงินที่สำคัญที่สุด และส่งรายงานสรุปแนวโน้มตลาดเป็นภาษาไทยผ่านทางอีเมลทุกวันหลังเวลาตลาดปิด',
        api: 'SET API + Resend',
      },
    ],
  },
];

export default function CaseStudies({ data }: { data?: AppData }) {
  const ALL: CaseStudy[] = [...CASES, ...(data?.caseStudies ?? [])];
  const [active, setActive] = useState(ALL[0].id);
  const [copied, setCopied] = useState<string | null>(null);
  const cs = ALL.find(c => c.id === active) ?? ALL[0];

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
        {ALL.map(c => (
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

      {/* Serper.dev (Google Search) Setup Guide (Paperclip) */}
      {cs.id === 'paperclip' && (
        <>
        <div className="cs-brave-guide">
          <div className="cs-brave-guide-title">
            <span className="cs-brave-icon">🔍</span>
            วิธีต่อ Serper.dev — ให้ AI ค้นหาข้อมูลจริงจาก Google แบบเรียลไทม์
          </div>

          <div className="cs-brave-steps">
            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: cs.color }}>1</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">สมัครและรับ API Key จาก Serper.dev</div>
                <div className="cs-brave-step-desc">
                  Serper.dev ให้ฟรี <strong>2,500 searches</strong> แรก (ไม่หมดอายุ) — เพียงพอสำหรับ SaaS ขนาดเล็ก
                  ไปที่ <strong>serper.dev</strong> → Sign Up → Copy API Key จากหน้า Dashboard
                </div>
              </div>
            </div>

            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: cs.color }}>2</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">ตั้งค่า API Key ใน Supabase Edge Function Secrets</div>
                <div className="cs-brave-step-desc">
                  ไปที่ <strong>Supabase Dashboard → Project Settings → Edge Functions → Secrets</strong>{' '}
                  แล้วเพิ่ม secret ชื่อ <code>SERPER_API_KEY</code> — ระบบจะใช้ key นี้ทุกครั้งที่ Agent เปิด Web Search
                </div>
                <div className="cs-brave-env-box">
                  <span className="cs-brave-env-key">SERPER_API_KEY</span>
                  <span className="cs-brave-env-eq">=</span>
                  <span className="cs-brave-env-val">xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
                  <span className="cs-brave-env-seal">🔒 Seal</span>
                </div>
              </div>
            </div>

            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: cs.color }}>3</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">มอบหมายงานให้ CTO Agent — เปิด Web Search ใน Task</div>
                <div className="cs-brave-step-desc">
                  สร้าง Task ใน Kanban แล้วมอบหมายให้ <strong>CTO Agent</strong> — เปิด toggle Web Search ใน Task{' '}
                  เพื่อให้ Agent ดึงข้อมูลจาก Google ก่อนตอบ ตัวอย่าง Task:
                </div>
                <div className="cs-brave-task-box">
                  <div className="cs-brave-task-label">ตัวอย่าง Task สำหรับ CTO Agent</div>
                  <div className="cs-brave-task-text">
                    "ค้นคว้าเทรนด์ธุรกิจ SaaS ในประเทศไทย รวบรวมข้อมูลเชิงลึก และส่งมอบผลลัพธ์พร้อมแหล่งอ้างอิง"
                  </div>
                  <button
                    className="cs-copy-btn"
                    style={{ marginTop: 8 }}
                    onClick={() => copyPrompt(
                      'ค้นคว้าเทรนด์ธุรกิจ SaaS ในประเทศไทย รวบรวมข้อมูลเชิงลึก และส่งมอบผลลัพธ์พร้อมแหล่งอ้างอิง',
                      'brave-task'
                    )}
                  >
                    {copied === 'brave-task' ? '✓ คัดลอกแล้ว' : 'คัดลอก Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="cs-brave-summary">
            <div className="cs-brave-summary-row">
              <span className="cs-brave-summary-item"><strong>ราคา:</strong> ฟรี 2,500 searches · $50/เดือน สำหรับ 50,000 searches</span>
              <span className="cs-brave-summary-item"><strong>Secret:</strong> <code style={{ fontSize: 11 }}>SERPER_API_KEY</code> ใน Supabase</span>
              <span className="cs-brave-summary-item"><strong>ผู้รับงาน:</strong> CTO Agent via Kanban + Web Search toggle</span>
            </div>
          </div>
        </div>

        {/* Resend API Setup Guide */}
        <div className="cs-brave-guide" style={{ marginTop: 16, borderLeftColor: '#6366f1', borderLeftWidth: 3, borderLeftStyle: 'solid' }}>
          <div className="cs-brave-guide-title">
            <span className="cs-brave-icon">✉️</span>
            วิธีต่อ Resend API — ให้ AI ส่งอีเมลอัตโนมัติ 24 ชั่วโมง
          </div>

          <div className="cs-brave-steps">
            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: '#6366f1' }}>1</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">สมัครและสร้าง API Key จาก Resend</div>
                <div className="cs-brave-step-desc">
                  เปิดแท็บใหม่ไปที่ <strong>resend.com</strong> แล้วคลิก "Get Started"
                  สมัครบัญชีด้วย Google, GitHub หรืออีเมล ยืนยันผ่านลิงก์ในกล่องจดหมาย
                  จากนั้นคลิก <strong>"Add API Key"</strong> แล้วคัดลอกคีย์ไว้
                </div>
              </div>
            </div>

            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: '#6366f1' }}>2</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">ตั้งค่า Environment Variable ให้ Agent — Seal เพื่อความปลอดภัย</div>
                <div className="cs-brave-step-desc">
                  กลับมาที่ Paperclip → เลือก Agent (เช่น CTO) → แท็บ <strong>Configuration</strong>{' '}
                  → ส่วน <strong>Environment Variables</strong> พิมพ์ชื่อ <code>RESEND_API</code>{' '}
                  วางคีย์ลงในช่อง Value แล้วคลิก <strong>"Seal"</strong> เพื่อเข้ารหัสเป็น Secret
                  จากนั้น Save เพื่อล็อกการตั้งค่า
                </div>
                <div className="cs-brave-env-box">
                  <span className="cs-brave-env-key">RESEND_API</span>
                  <span className="cs-brave-env-eq">=</span>
                  <span className="cs-brave-env-val">re_xxxxxxxxxxxxxxxx</span>
                  <span className="cs-brave-env-seal">🔒 Seal</span>
                </div>
              </div>
            </div>

            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: '#6366f1' }}>3</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">ขยายสิทธิ์ให้ Agent อื่น (Scaling Permissions)</div>
                <div className="cs-brave-step-desc">
                  หาก Agent ตัวอื่นต้องการส่งอีเมลด้วย ให้ตั้งค่า <code>RESEND_API</code>{' '}
                  แล้วสลับจาก "Plain text" เป็นการเลือก Secret ที่ Seal ไว้แล้วจาก Dropdown
                  ระบบนี้ออกแบบเหมือนการจำกัดสิทธิ์พนักงานจริง — ระบุได้เลยว่า Agent ไหนควรเข้าถึงเครื่องมือใดบ้าง
                </div>
              </div>
            </div>

            <div className="cs-brave-step">
              <div className="cs-brave-step-num" style={{ background: '#6366f1' }}>4</div>
              <div className="cs-brave-step-body">
                <div className="cs-brave-step-title">ทดสอบระบบด้วย Kanban Issue</div>
                <div className="cs-brave-step-desc">
                  คลิก <strong>"Create New Issue"</strong> มุมบนซ้าย ตั้งชื่อว่า "เครื่องมือทดสอบ"
                  มอบหมายให้ Agent ที่ได้รับสิทธิ์แล้ว พร้อมคำสั่งด้านล่าง
                  เมื่องานย้ายสู่สถานะ "Done" และอีเมลสรุปถึงกล่องจดหมายของคุณ — ระบบพร้อมขยายสเกลแล้ว
                </div>
                <div className="cs-brave-task-box">
                  <div className="cs-brave-task-label">ตัวอย่าง Task ทดสอบ Resend API</div>
                  <div className="cs-brave-task-text">
                    "คุณมีสิทธิ์เข้าถึง Resend API แล้ว ให้ทำการทดสอบโดยการค้นคว้าข้อมูล รวบรวมตัวอย่างสรุป และส่งอีเมลพร้อมผลลัพธ์มาให้ฉัน"
                  </div>
                  <button
                    className="cs-copy-btn"
                    style={{ marginTop: 8 }}
                    onClick={() => copyPrompt(
                      'คุณมีสิทธิ์เข้าถึง Resend API แล้ว ให้ทำการทดสอบโดยการค้นคว้าข้อมูล รวบรวมตัวอย่างสรุป และส่งอีเมลพร้อมผลลัพธ์มาให้ฉัน',
                      'resend-task'
                    )}
                  >
                    {copied === 'resend-task' ? '✓ คัดลอกแล้ว' : 'คัดลอก Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="cs-brave-summary">
            <div className="cs-brave-summary-row">
              <span className="cs-brave-summary-item"><strong>ราคา:</strong> ฟรีสำหรับ 3,000 emails/เดือน</span>
              <span className="cs-brave-summary-item"><strong>Variable:</strong> <code style={{ fontSize: 11 }}>RESEND_API</code> + Seal</span>
              <span className="cs-brave-summary-item"><strong>ทดสอบ:</strong> สร้าง Kanban Issue → รอรับอีเมล</span>
            </div>
          </div>
        </div>

        {/* ISO Compliance Mission Prompt */}
        <div className="cs-mission-block">
          <div className="cs-mission-header">
            <div className="cs-mission-badge">🏭 ตัวอย่าง Mission Prompt จริง</div>
            <div className="cs-mission-title">ISO/TIS Standard Intelligence Update</div>
            <div className="cs-mission-sub">สำหรับ Compliance Agent — ดึงข้อมูลมาตรฐานอุตสาหกรรมใหม่โดยอัตโนมัติ</div>
          </div>

          <div className="cs-mission-prompt-wrap">
            <div className="cs-mission-prompt-label">Mission Prompt (คัดลอกแล้วใส่ใน Paperclip)</div>
            <div className="cs-mission-prompt-text">
              <div className="cs-mp-section">
                <span className="cs-mp-key">Role:</span> คุณคือ Senior ISO Consultant และผู้เชี่ยวชาญด้านมาตรฐานอุตสาหกรรมไทย (TIS) หน้าที่ของคุณคือเฝ้าระวังและอัปเดตข้อมูลมาตรฐานเพื่อให้องค์กรมีความสอดคล้องกับกฎระเบียบอยู่เสมอ
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key">Objective:</span> ค้นหาการเปลี่ยนแปลงหรือประกาศมาตรฐานใหม่ล่าสุดจากหน่วยงานที่เกี่ยวข้อง (เช่น สมอ. หรือ ISO.org) ที่ส่งผลกระทบต่อธุรกิจเหล็กหรืออุตสาหกรรมการผลิต และนำมาสรุปเพื่อปรับปรุงระบบบริหารคุณภาพ (QMS) ของเรา
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key">Steps:</span>
                <ol className="cs-mp-steps">
                  <li><strong>Search &amp; Research:</strong> ใช้ Web Search (Serper.dev) ค้นหาประกาศจาก สมอ. หรือการอัปเดต ISO 9001:2015 ในช่วง 30 วันที่ผ่านมา</li>
                  <li><strong>Filter &amp; Validate:</strong> ตรวจสอบว่าเป็น "ประกาศอย่างเป็นทางการ" และ "มีผลบังคับใช้กับธุรกิจอุตสาหกรรมในไทย"</li>
                  <li><strong>Drafting:</strong> สรุปสาระสำคัญของมาตรฐานที่เปลี่ยนไป และร่างเป็น "บันทึกการเปลี่ยนแปลง" (Change Record)</li>
                  <li><strong>Integration:</strong> หากพบการเปลี่ยนแปลงสำคัญ ให้ร่าง Action Plan บูรณาการเข้าสู่ระบบ QMS ตามข้อกำหนด 4.4 และ 6.3</li>
                </ol>
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key">Constraints:</span> อ้างอิงจากแหล่งที่เชื่อถือได้เท่านั้น · เฉพาะอุตสาหกรรมการผลิตในไทย · ภาษาไทยทางการตามศัพท์เทคนิค ISO
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key">Output:</span> หัวข้อประกาศ · สาระสำคัญ · ผลกระทบต่อองค์กร · แนวทางแก้ไขตามข้อกำหนด 10.1 และ 10.3
              </div>
            </div>
            <button
              className="cs-copy-btn cs-copy-btn--full"
              onClick={() => copyPrompt(
                `Role: คุณคือ Senior ISO Consultant และผู้เชี่ยวชาญด้านมาตรฐานอุตสาหกรรมไทย (TIS) หน้าที่ของคุณคือเฝ้าระวังและอัปเดตข้อมูลมาตรฐานเพื่อให้องค์กรมีความสอดคล้องกับกฎระเบียบอยู่เสมอ\n\nObjective: ค้นหาการเปลี่ยนแปลงหรือประกาศมาตรฐานใหม่ล่าสุดจากหน่วยงานที่เกี่ยวข้อง (เช่น สมอ. หรือ ISO.org) ที่ส่งผลกระทบต่อธุรกิจเหล็กหรืออุตสาหกรรมการผลิต และนำมาสรุปเพื่อปรับปรุงระบบบริหารคุณภาพ (QMS) ของเรา\n\nSteps:\n1. Search & Research: ใช้ Web Search (Serper.dev) ค้นหาประกาศจาก สมอ. หรือการอัปเดต ISO 9001:2015 ในช่วง 30 วันที่ผ่านมา\n2. Filter & Validate: ตรวจสอบว่าเป็น "ประกาศอย่างเป็นทางการ" และ "มีผลบังคับใช้กับธุรกิจอุตสาหกรรมในไทย"\n3. Drafting: สรุปสาระสำคัญของมาตรฐานที่เปลี่ยนไป และร่างเป็น "บันทึกการเปลี่ยนแปลง" (Change Record)\n4. Integration: หากพบการเปลี่ยนแปลงสำคัญ ให้ร่าง Action Plan บูรณาการเข้าสู่ระบบ QMS ตามข้อกำหนด 4.4 และ 6.3\n\nConstraints: อ้างอิงจากแหล่งที่เชื่อถือได้เท่านั้น · เฉพาะอุตสาหกรรมการผลิตในไทย · ภาษาไทยทางการตามศัพท์เทคนิค ISO\n\nOutput: หัวข้อประกาศ · สาระสำคัญ · ผลกระทบต่อองค์กร · แนวทางแก้ไขตามข้อกำหนด 10.1 และ 10.3`,
                'iso-prompt'
              )}
            >
              {copied === 'iso-prompt' ? '✓ คัดลอก Mission Prompt แล้ว' : '📋 คัดลอก Mission Prompt ทั้งหมด'}
            </button>
          </div>

          <div className="cs-mission-tips">
            <div className="cs-mission-tips-title">วิธีรัน Mission นี้ให้ได้ผลสูงสุด</div>
            <div className="cs-mission-tips-grid">
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">🔄</div>
                <div>
                  <div className="cs-mission-tip-title">Recurring Task</div>
                  <div className="cs-mission-tip-body">สร้าง Kanban Issue ตั้งเป็น Recurring Task รันทุกวันจันทร์แรกของเดือน — ไม่ต้องจำ ระบบทำให้เอง</div>
                </div>
              </div>
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">⭐</div>
                <div>
                  <div className="cs-mission-tip-title">Feedback Loop</div>
                  <div className="cs-mission-tip-body">หลังรันเสร็จให้ Rating ผลลัพธ์ใน Admin — Agent จะเรียนรู้ว่าข้อมูลแบบไหนที่คุณต้องการมากที่สุด</div>
                </div>
              </div>
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">✉️</div>
                <div>
                  <div className="cs-mission-tip-title">Automated Email</div>
                  <div className="cs-mission-tip-body">สั่งให้ Agent ส่งผลสรุปทางอีเมล (ผ่าน Resend API) ทันทีหลังงานเสร็จ — ไม่ต้องเปิด Dashboard เอง</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gap Analysis Mission Prompt */}
        <div className="cs-mission-block cs-mission-block--purple">
          <div className="cs-mission-header">
            <div className="cs-mission-badge cs-mission-badge--purple">🔍 Agent ที่ 2 — Internal Auditor</div>
            <div className="cs-mission-title">ISO Compliance Gap Analysis Agent</div>
            <div className="cs-mission-sub">ตรวจหาช่องว่าง (Gap) ระหว่างการปฏิบัติงานจริงกับข้อกำหนด ISO 9001:2015 โดยอัตโนมัติ</div>
          </div>

          <div className="cs-mission-prompt-wrap">
            <div className="cs-mission-prompt-label">Mission Prompt (คัดลอกแล้วใส่ใน Agent ที่ 2)</div>
            <div className="cs-mission-prompt-text">
              <div className="cs-mp-section">
                <span className="cs-mp-key cs-mp-key--purple">Role:</span> คุณคือ Internal Auditor อัจฉริยะที่มีหน้าที่ตรวจสอบ "ช่องว่าง" (Gap) ระหว่างการปฏิบัติงานจริงภายในองค์กร กับข้อกำหนดของมาตรฐาน ISO 9001:2015 โดยเฉพาะ
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key cs-mp-key--purple">Objective:</span> ตรวจสอบเอกสารสารสนเทศ (Documented Information) และบันทึกการปฏิบัติงานภายในระบบ ให้สอดคล้องกับข้อกำหนดมาตรฐาน เพื่อระบุสิ่งที่ยังขาด (Gap) หรือสิ่งที่ต้องปรับปรุง
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key cs-mp-key--purple">Steps:</span>
                <ol className="cs-mp-steps">
                  <li><strong>Data Retrieval:</strong> เข้าถึงเอกสารที่เกี่ยวข้องกับกระบวนการ (Processes) และผลลัพธ์จากการดำเนินการ (Outputs) ภายในระบบ</li>
                  <li><strong>Gap Assessment:</strong> วิเคราะห์บันทึกการปฏิบัติงานเทียบกับข้อกำหนด ISO 9001:2015 (เน้น 4.4, 7.5 และ 8.1) เพื่อหาความไม่สอดคล้อง (Nonconformity)</li>
                  <li><strong>Risk Identification:</strong> ประเมินว่าความไม่สอดคล้องส่งผลต่อความสามารถในการบรรลุผลลัพธ์หรือไม่ (อ้างอิงข้อกำหนด 6.1)</li>
                  <li><strong>Reporting:</strong> สรุปรายการ Gap พร้อมเสนอแนวทางการปรับปรุงอย่างต่อเนื่องตามข้อกำหนด 10.3</li>
                </ol>
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key cs-mp-key--purple">Constraints:</span> Evidence-based จากเอกสารองค์กรเท่านั้น · เป็นกลางและเที่ยงธรรม (Objectivity &amp; Impartiality) · ระบุข้อกำหนด ISO ที่เกี่ยวข้องให้ชัดเจน
              </div>
              <div className="cs-mp-section">
                <span className="cs-mp-key cs-mp-key--purple">Output:</span> กระบวนการที่ตรวจสอบ · สิ่งที่พบ (Finding) · ช่องว่างที่พบ (Gap) · ข้อกำหนด ISO ที่เกี่ยวข้อง · ข้อเสนอแนะปรับปรุงตาม 10.2
              </div>
            </div>
            <button
              className="cs-copy-btn cs-copy-btn--full"
              onClick={() => copyPrompt(
                `Role: คุณคือ Internal Auditor อัจฉริยะที่มีหน้าที่ตรวจสอบ "ช่องว่าง" (Gap) ระหว่างการปฏิบัติงานจริงภายในองค์กร กับข้อกำหนดของมาตรฐาน ISO 9001:2015 โดยเฉพาะ\n\nObjective: ตรวจสอบเอกสารสารสนเทศ (Documented Information) และบันทึกการปฏิบัติงานภายในระบบ ให้สอดคล้องกับข้อกำหนดมาตรฐาน เพื่อระบุสิ่งที่ยังขาด (Gap) หรือสิ่งที่ต้องปรับปรุง\n\nSteps:\n1. Data Retrieval: เข้าถึงเอกสารที่เกี่ยวข้องกับกระบวนการ (Processes) และผลลัพธ์จากการดำเนินการ (Outputs) ภายในระบบ\n2. Gap Assessment: วิเคราะห์บันทึกการปฏิบัติงานเทียบกับข้อกำหนด ISO 9001:2015 (เน้น 4.4, 7.5 และ 8.1) เพื่อหาความไม่สอดคล้อง (Nonconformity)\n3. Risk Identification: ประเมินว่าความไม่สอดคล้องส่งผลต่อความสามารถในการบรรลุผลลัพธ์หรือไม่ (อ้างอิงข้อกำหนด 6.1)\n4. Reporting: สรุปรายการ Gap พร้อมเสนอแนวทางการปรับปรุงอย่างต่อเนื่องตามข้อกำหนด 10.3\n\nConstraints: Evidence-based จากเอกสารองค์กรเท่านั้น · เป็นกลางและเที่ยงธรรม · ระบุข้อกำหนด ISO ที่เกี่ยวข้องให้ชัดเจน\n\nOutput: กระบวนการที่ตรวจสอบ · สิ่งที่พบ (Finding) · ช่องว่างที่พบ (Gap) · ข้อกำหนด ISO ที่เกี่ยวข้อง · ข้อเสนอแนะปรับปรุงตาม 10.2`,
                'gap-prompt'
              )}
            >
              {copied === 'gap-prompt' ? '✓ คัดลอก Mission Prompt แล้ว' : '📋 คัดลอก Mission Prompt ทั้งหมด'}
            </button>
          </div>

          <div className="cs-mission-tips">
            <div className="cs-mission-tips-title">Integration Strategy — รัน 2 Agent คู่กัน</div>
            <div className="cs-mission-tips-grid">
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">⚡</div>
                <div>
                  <div className="cs-mission-tip-title">Workflow Integration</div>
                  <div className="cs-mission-tip-body">ตั้งให้ Agent ตรวจสอบอัตโนมัติทุกครั้งที่มีการอัปเดตเอกสาร Documented Information ในระบบ</div>
                </div>
              </div>
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">📋</div>
                <div>
                  <div className="cs-mission-tip-title">Proactive Action</div>
                  <div className="cs-mission-tip-body">เมื่อ Agent รายงาน Gap ให้ระบบสร้าง Kanban Task ใหม่โดยอัตโนมัติตามข้อกำหนด 10.2.1e</div>
                </div>
              </div>
              <div className="cs-mission-tip">
                <div className="cs-mission-tip-ico">✅</div>
                <div>
                  <div className="cs-mission-tip-title">Performance Tracking</div>
                  <div className="cs-mission-tip-body">เมื่อแก้ Gap แล้ว Agent ตรวจประเมินซ้ำ (Verify) และจัดเก็บเป็นหลักฐาน Correction สำหรับ Internal Audit ประจำปี</div>
                </div>
              </div>
            </div>

            <div className="cs-mission-self-govern">
              <div className="cs-mission-self-govern-ico">🏆</div>
              <div>
                <div className="cs-mission-self-govern-title">Self-Governing Quality System</div>
                <div className="cs-mission-self-govern-body">
                  Agent 1 (หาเทรนด์มาตรฐานใหม่จากภายนอก) + Agent 2 (เช็คช่องว่างภายใน) = ระบบบริหารคุณภาพที่อัปเดตและตรวจสอบตัวเองได้ตลอด 24 ชั่วโมง
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
