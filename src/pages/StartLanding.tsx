import { useEffect, useState } from 'react';

/* ===== Landing page ไวรัล — /start (สาธารณะ ไม่ต้องล็อกอิน) =====
 * กลุ่มเป้าหมาย: Gen Z จบใหม่หางานไม่ได้ + กลุ่ม "เสมือนว่างงาน" (มีงานแต่รายได้ไม่พอ)
 * เป้าหมาย: สมัครฟรี → สร้างหน้าร้าน → มีรายได้จาก RFQ → อัปเกรด Starter ฿390 */

const PAGE_URL = 'https://ceoaithailand.org/start';
const SHARE_TEXT = 'ตกงาน/รายได้ไม่พอ ไม่ใช่ทางตัน — เปิดบริษัทของตัวเองพร้อมทีม AI ทั้งบริษัท เริ่มฟรี ไม่ต้องใช้บัตรเครดิต';

const STEPS = [
  { icon: '💡', title: 'เล่าไอเดียของคุณ', desc: 'บอกว่าอยากขายอะไร ถนัดอะไร — CEO AI จะร่างแผนธุรกิจ (BMC) ให้คุณอนุมัติ พร้อมทีมเอเจนต์ช่วยคิดการตลาด ราคา และกลุ่มลูกค้า' },
  { icon: '🏪', title: 'เปิดหน้าร้านฟรีใน 5 นาที', desc: 'ระบบสร้างหน้าร้านออนไลน์ให้ พร้อมขึ้นสารบัญธุรกิจตามหมวด DBD — ลูกค้าและคู่ค้าในระบบค้นเจอคุณได้ทันที' },
  { icon: '💰', title: 'รับงานจริงผ่าน RFQ', desc: 'ธุรกิจอื่นส่งคำขอใบเสนอราคาถึงหน้าร้านคุณ ตอบราคา ปิดดีล เป็นออเดอร์ — มีรายได้ก่อน แล้วค่อยโตไปด้วยกัน' },
];

const TEAM = [
  { icon: '🧠', role: 'CEO Agent', desc: 'วางแผนธุรกิจ มอบงาน ติดตามผล' },
  { icon: '📣', role: 'การตลาด', desc: 'คิดคอนเทนต์ แคมเปญ กลุ่มเป้าหมาย' },
  { icon: '🔎', role: 'วิจัยตลาด', desc: 'ค้นข้อมูลคู่แข่ง เทรนด์ ราคาตลาด' },
  { icon: '📊', role: 'วิเคราะห์', desc: 'ตัวเลขธุรกิจ จุดรั่ว โอกาสโต' },
];

const PLANS = [
  { name: 'ฟรี', price: '฿0', desc: 'เริ่มธุรกิจ + หน้าร้าน + สารบัญธุรกิจ', note: 'ไม่ต้องใช้บัตรเครดิต', cta: true },
  { name: 'Starter', price: '฿390', per: '/เดือน', desc: 'รับงานผ่าน RFQ + ออเดอร์ — จ่ายเมื่อเริ่มมีรายได้', note: 'เท่าค่ากาแฟ 3 แก้ว', hot: true },
  { name: 'Growth', price: '฿1,490', per: '/เดือน', desc: 'ทีม AI เต็มรูปแบบ + วิจัยตลาด + Analytics', note: 'เมื่อธุรกิจเดินแล้ว' },
];

export default function StartLanding() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = 'เริ่มธุรกิจของคุณเอง พร้อมทีม AI — ฟรี | CEO AI Thailand';
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', 'ตกงาน จบใหม่ หรือรายได้ไม่พอ? เปิดบริษัทของตัวเองพร้อมทีม AI ทั้งบริษัท — แผนธุรกิจ หน้าร้านออนไลน์ รับงาน B2B เริ่มฟรี');
  }, []);

  const copyLink = () => {
    navigator.clipboard?.writeText(PAGE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="start-wrap">
      <header className="start-head">
        <span className="start-brand">🏢 CEO AI Thailand</span>
        <a className="start-head-cta" href="/">เข้าใช้ระบบ →</a>
      </header>

      {/* Hero */}
      <section className="start-hero">
        <div className="start-badge">✦ &nbsp;สำหรับคนจบใหม่ · คนหางาน · คนที่งานประจำไม่พอกิน&nbsp; ✦</div>
        <h1 className="start-h1">
          ไม่มีใครจ้าง ไม่ได้แปลว่าไปต่อไม่ได้<br />
          <span className="start-h1-hl">เปิดบริษัทของคุณเอง — พร้อมทีม AI ทั้งบริษัท</span>
        </h1>
        <p className="start-sub">
          ปีนี้คนจบ ป.ตรี ว่างงานกว่า <b>116,000 คน</b> และอีก <b>4.4 ล้านคน</b> มีงานแต่รายได้ไม่พอ*<br />
          คุณไม่ได้ตัวคนเดียว — และคุณไม่ต้องรอใครจ้าง เมื่อมี CEO, ฝ่ายการตลาด และนักวิจัยตลาด เป็น AI ทำงานให้คุณ
        </p>
        <div className="start-cta-row">
          <a className="start-cta-main" href="/">เปิดบริษัทแรกของคุณ — ฟรี ไม่ต้องใช้บัตรเครดิต</a>
          <a className="start-cta-sub" href="/b">ดูธุรกิจที่เปิดแล้วในระบบ →</a>
        </div>
        <div className="start-src">* ที่มา: สำนักงานสถิติแห่งชาติ / สภาพัฒน์ ไตรมาส 1 ปี 2569</div>
      </section>

      {/* Personas */}
      <section className="start-sec">
        <h2 className="start-h2">ระบบนี้สร้างมาเพื่อคุณ</h2>
        <div className="start-persona-grid">
          <div className="start-persona">
            <div className="start-persona-ico">🎓</div>
            <div className="start-persona-name">จบใหม่ ยังหางานไม่ได้</div>
            <p>ส่งใบสมัครไปร้อยที่ เงียบทุกที่ — แทนที่จะรอ HR ตอบ ใช้เวลานั้นสร้างธุรกิจแรกของคุณ
            มีทีม AI ช่วยคิดตั้งแต่ไอเดียจนถึงลูกค้าคนแรก และทุกอย่างที่ทำกลายเป็นผลงานจริงใส่พอร์ตได้</p>
          </div>
          <div className="start-persona">
            <div className="start-persona-ico">💼</div>
            <div className="start-persona-name">มีงาน แต่รายได้ไม่พอ</div>
            <p>งานประจำชั่วโมงน้อยลง OT หาย รายได้ไม่พอรายจ่าย — เปิดธุรกิจเสริมที่มี AI ดูแลให้ตอนคุณไปทำงาน
            ตอบลูกค้า วางแผนคอนเทนต์ หาคู่ค้า แล้วคุณค่อยมาปิดดีลตอนว่าง</p>
          </div>
        </div>
      </section>

      {/* ทำไมธุรกิจส่วนใหญ่พัง — และเราแก้ยังไง */}
      <section className="start-sec start-why-sec">
        <h2 className="start-h2">ธุรกิจส่วนใหญ่ไม่ได้พังเพราะไอเดียไม่ดี</h2>
        <p className="start-price-note">แต่พังเพราะ 2 อย่าง: <b>ไม่มีระบบทำงาน</b> และ <b>การตลาดไม่ดีพอ</b> — เราสร้างระบบนี้มาแก้ทั้งสองข้อตั้งแต่วันแรก</p>
        <div className="start-why-grid">
          <div className="start-why-card">
            <div className="start-why-ico">⚙️</div>
            <div className="start-why-name">ไม่มีระบบทำงาน → เรามีให้เลย</div>
            <p>คนเก่งงานแต่ไม่เคยวางระบบ พอลูกค้าเยอะขึ้นทุกอย่างพัง — ระบบเราให้แผนธุรกิจ (BMC),
            กระบวนการทำงาน (SIPOC), งานแตกเป็นขั้นตอนพร้อมคนรับผิดชอบ ไปจนถึงมาตรฐาน ISO เมื่อธุรกิจโต
            เหมือนมี COO มาวางระบบให้ตั้งแต่ยังไม่มีพนักงาน</p>
          </div>
          <div className="start-why-card">
            <div className="start-why-ico">📣</div>
            <div className="start-why-name">การตลาดไม่ดีพอ → ทีม AI ทำให้</div>
            <p>ของดีแต่ขายไม่เป็น เพราะไม่รู้จะพูดกับใคร พูดยังไง — เอเจนต์การตลาดวิเคราะห์กลุ่มลูกค้า (Persona),
            วางแผนคอนเทนต์รายเดือน, ออกแบบ funnel และวัดผลให้ทุกสัปดาห์
            เหมือนมีทีมการตลาดทั้งทีมในราคาศูนย์บาท</p>
          </div>
        </div>
      </section>

      {/* 3 Steps */}
      <section className="start-sec">
        <h2 className="start-h2">จากศูนย์ → มีรายได้ ใน 3 ขั้น</h2>
        <div className="start-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="start-step">
              <div className="start-step-num">{i + 1}</div>
              <div className="start-step-ico">{s.icon}</div>
              <div className="start-step-title">{s.title}</div>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Team */}
      <section className="start-sec">
        <h2 className="start-h2">พนักงานของคุณ — ทำงานตลอด 24 ชั่วโมง ไม่มีเงินเดือน</h2>
        <div className="start-team-grid">
          {TEAM.map((t, i) => (
            <div key={i} className="start-team-card">
              <div className="start-team-ico">{t.icon}</div>
              <div className="start-team-role">{t.role}</div>
              <div className="start-team-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing ladder */}
      <section className="start-sec">
        <h2 className="start-h2">เริ่มฟรี — จ่ายเมื่อเริ่มมีรายได้</h2>
        <p className="start-price-note">เราโตเมื่อคุณมีรายได้: ระบบคิดค่าดำเนินการแค่ 3% เมื่อคุณปิดดีลได้จริง</p>
        <div className="start-plans">
          {PLANS.map((p, i) => (
            <div key={i} className={`start-plan${p.hot ? ' hot' : ''}`}>
              {p.hot && <div className="start-plan-tag">คุ้มสุดตอนเริ่ม</div>}
              <div className="start-plan-name">{p.name}</div>
              <div className="start-plan-price">{p.price}<span>{p.per ?? ''}</span></div>
              <p>{p.desc}</p>
              <div className="start-plan-note">{p.note}</div>
              {p.cta && <a className="start-plan-cta" href="/">เริ่มเลย →</a>}
            </div>
          ))}
        </div>
      </section>

      {/* Viral share */}
      <section className="start-sec start-share-sec">
        <h2 className="start-h2">รู้จักใครที่กำลังหาทางไปอยู่ไหม?</h2>
        <p className="start-price-note">ส่งหน้านี้ให้เพื่อนสักคน — บางทีนี่อาจเป็นจุดเริ่มต้นของเขา</p>
        <div className="start-share-row">
          <a className="start-share-btn line" target="_blank" rel="noreferrer"
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(PAGE_URL)}`}>
            💬 แชร์ผ่าน LINE
          </a>
          <a className="start-share-btn fb" target="_blank" rel="noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PAGE_URL)}`}>
            📘 แชร์ Facebook
          </a>
          <a className="start-share-btn x" target="_blank" rel="noreferrer"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(PAGE_URL)}`}>
            🐦 โพสต์ X
          </a>
          <button className="start-share-btn copy" onClick={copyLink}>
            {copied ? '✓ คัดลอกแล้ว' : '🔗 คัดลอกลิงก์'}
          </button>
        </div>
        <div className="start-final-cta">
          <a className="start-cta-main" href="/">เริ่มวันนี้ ฟรี — อีก 5 นาทีคุณมีบริษัทแล้ว</a>
        </div>
      </section>

      <footer className="start-foot">
        CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย ·{' '}
        <a href="/b">สารบัญธุรกิจ</a> ·{' '}
        โดย <a href="https://www.b-tctraining.com" target="_blank" rel="noreferrer">B. Training Consultant (M.E.A) Co., Ltd.</a>
      </footer>
    </div>
  );
}
