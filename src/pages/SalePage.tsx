import '../index.css';
import { useEffect, useState } from 'react';
import { track } from '../lib/analytics';
import { readTheme, setTheme, nextTheme, themeIcon, themeLabel, type ThemeId } from '../lib/theme';
import { applySeo, siteOrigin } from '../lib/seo';
import LegalLinks from '../components/LegalLinks';
import IsmsBadge from '../components/IsmsBadge';
import FaqAccordion, { type FaqItem } from '../components/FaqAccordion';

/* ===== Sale page (direct-response) — /sale (สาธารณะ ไม่ต้องล็อกอิน) =====
 * ต่างจาก /start (viral acquisition เน้นสมัครฟรี): หน้านี้ "ปิดการขาย" — พาไปเป็นลูกค้าจ่ายจริง
 * โครง: promise → pain → offer stack (คุ้มค่า) → เคสจริงที่ระบบใช้ → ราคา anchor รายปี → การันตี → FAQ → CTA
 *
 * ⚠️ ความซื่อสัตย์ (บังคับ):
 *  - ไม่มี testimonial ลูกค้าปลอม (ยังไม่มีลูกค้าจ่ายจริง) → ใช้ social proof จริง: playbook เคสระดับโลก + เครดิต B.Training 20 ปี
 *  - ไม่การันตีผลลัพธ์/ยอดขาย · ราคาตลาดที่อ้างอิงระบุชัดว่าเป็น "ราคาจ้างเอง"
 *  - ตัวเลขแพ็ก = mirror ของ src/lib/access.ts (source of truth) — ANNUAL_MONTHS_CHARGED=10 (จ่าย 10 ใช้ 12) */

// mirror src/lib/access.ts (จ่ายรายปี 10 เดือน ใช้ 12 = 2 เดือนฟรี ≈ ลด 17%)
const GROWTH_MO = 1490;
const GROWTH_YR = 14900;          // 1490 × 10
const GROWTH_YR_PERMO = 1242;     // 14900 / 12 ปัดเต็ม
const GROWTH_SAVE = 2980;         // 1490×12 − 14900
const GROWTH_SAVE_PCT = 17;

// Offer stack — "ถ้าจ้างเอง/ซื้อแยก" ต้นทุนตลาด (อ้างอิง ไม่ใช่การันตี) vs รวมในแพ็กเดียว
type StackRow = { item: string; worth: string };
const STACK: StackRow[] = [
  { item: '🧠 CEO AI วางแผนธุรกิจ (BMC) + มอบหมายงานทั้งทีม', worth: 'ที่ปรึกษาวางระบบ ~฿20,000+/ครั้ง' },
  { item: '📣 ทีมการตลาด: Persona · คอนเทนต์เพลน · Funnel · A/B', worth: 'นักการตลาด ~฿15,000–30,000/เดือน' },
  { item: '🔎 วิจัยตลาด + ประเมินขนาดตลาด (TAM/SAM/SOM) โดย CMO', worth: 'ผู้ช่วยวิจัย ~฿15,000+/เดือน' },
  { item: '📊 CFO วิเคราะห์การเงินธุรกิจคุณ + สัญญาณสุขภาพ', worth: 'นักบัญชี/ที่ปรึกษาการเงินรายเดือน' },
  { item: '🏪 หน้าร้านออนไลน์ + SEO + สารบัญธุรกิจ + รับงาน B2B (RFQ)', worth: 'ค่าทำเว็บ + SEO หลักหมื่น' },
  { item: '⚙️ โครงระบบ SOP · KPI · Risk · ISO 9001 (ฟีเจอร์เสริม)', worth: 'ที่ปรึกษา ISO หลักหมื่น–แสน' },
];

const FAQS: FaqItem[] = [
  { q: 'จ่ายยังไง มี PromptPay ไหม?', a: 'มี — จ่ายผ่าน PromptPay (โอน/สแกน) แล้วอัปสลิปในแอป ระบบตรวจสลิปกับธนาคารจริงและเปิดแพ็กให้อัตโนมัติ ไม่ต้องผูกบัตรเครดิต ไม่มีตัดเงินอัตโนมัติ' },
  { q: 'ทดลองก่อนได้ไหม ถ้าไม่ชอบยกเลิกยังไง?', a: 'ได้ — เริ่มทดลองฟรี 15 วัน ไม่ต้องใช้บัตร ใช้ฟีเจอร์เต็มก่อนตัดสินใจ ถ้าไม่ต่ออายุ ระบบไม่ตัดเงินคุณอยู่แล้ว (ไม่มี auto-charge) หยุดเมื่อไหร่ก็ได้' },
  { q: 'รายปีถูกกว่าจริงเท่าไหร่?', a: `รายปีจ่าย 10 เดือน ใช้ได้ 12 เดือน = ฟรี 2 เดือน ประหยัด ~${GROWTH_SAVE_PCT}% เช่น Growth รายเดือนปีละ ฿17,880 → รายปีเหลือ ฿${GROWTH_YR.toLocaleString()} (ประหยัด ฿${GROWTH_SAVE.toLocaleString()}/ปี)` },
  { q: 'AI ทำให้ยอดขายขึ้นเลยไหม?', a: 'พูดตรง ๆ: ไม่ใช่ปุ่มวิเศษ AI ช่วยให้ "เริ่ม + วางระบบ + การตลาด" เร็วและเป็นระบบขึ้นมาก ลดการเดาสุ่ม แต่การปิดการขายยังต้องคุณลงมือ — เราออกแบบให้คุณมีโอกาสสำเร็จสูงขึ้น ไม่ใช่รับประกันตัวเลข' },
  { q: 'ไม่เก่งเทคโนโลยี/ไม่เคยทำธุรกิจ ใช้ได้ไหม?', a: 'ได้ ออกแบบเพื่อมือใหม่ สั่งงานเป็นภาษาไทยธรรมชาติ CEO AI ถามสิ่งที่คุณถนัดแล้วพาทำทีละขั้นตามกรอบ MIT 24 Steps' },
  { q: 'ใครอยู่เบื้องหลังระบบนี้?', a: 'B. Training Consultant (M.E.A) — ที่ปรึกษาธุรกิจ/ระบบบริหาร/ISO ในไทยมากกว่า 20 ปี ระบบผสานประสบการณ์จริงเข้ากับ AI ไม่ใช่แค่ wrapper ของแชตบอตต่างชาติ' },
];

export default function SalePage() {
  const [showSticky, setShowSticky] = useState(false);
  const [annual, setAnnual] = useState(true);
  const [theme, setThemeState] = useState<ThemeId>(() => readTheme());
  const toggleTheme = () => {
    const nx = nextTheme(theme);
    setTheme(nx);
    setThemeState(nx);
    track('theme_changed', { theme: nx, where: 'sale' });
  };

  useEffect(() => {
    const o = siteOrigin();
    applySeo({
      title: 'Growth — ทีม AI ทั้งบริษัทในราคาเดียว | CEO AI Thailand',
      description: `เปิดบริษัทพร้อมทีม AI (CEO/การตลาด/วิจัยตลาด/CFO) + หน้าร้าน + รับงาน B2B + โครงระบบ ISO เริ่มทดลองฟรี 15 วัน ไม่ต้องใช้บัตร · รายปีประหยัด ~${GROWTH_SAVE_PCT}% (ฟรี 2 เดือน) จ่าย PromptPay`,
      canonicalUrl: `${o}/sale`,
      imageUrl: `${o}/og-image.png`,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }],
    });
    track('sale_view', {});
  }, []);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 640);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.start-sec'));
    if (!('IntersectionObserver' in window) || !els.length) return;
    els.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('reveal-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const price = annual ? GROWTH_YR_PERMO : GROWTH_MO;

  return (
    <div className="start-wrap">
      <header className="start-head">
        <span className="start-brand">🏢 CEO AI Thailand</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="start-theme-btn" onClick={toggleTheme}
            title={`สลับเป็นธีม “${themeLabel(nextTheme(theme))}”`}
            aria-label={`สลับธีม ปัจจุบัน ${themeLabel(theme)}`}>
            <span aria-hidden="true">{themeIcon(nextTheme(theme))}</span> {themeLabel(nextTheme(theme))}
          </button>
          <a className="start-head-cta" href="/">เข้าใช้ระบบ →</a>
        </div>
      </header>

      {/* Hero */}
      <section className="start-hero">
        <div className="start-badge">✦ &nbsp;แพ็ก Growth · คุ้มที่สุดสำหรับธุรกิจที่พร้อมโต&nbsp; ✦</div>
        <h1 className="start-h1">
          หยุดจ้างทีมทีละคน<br />
          <span className="start-h1-hl">ได้ทีม AI ทั้งบริษัทในราคาเดียว เริ่มที่ ฿{GROWTH_YR_PERMO.toLocaleString()}/เดือน</span>
        </h1>
        <p className="start-sub">
          CEO · การตลาด · วิจัยตลาด · CFO ทำงานให้ตลอด 24 ชม. — วางแผนธุรกิจ เปิดหน้าร้าน หาลูกค้า B2B
          และวางระบบให้พร้อมขยาย บนกรอบ <b>MIT 24 Steps</b> + ระบบบริหาร <b>20 ปี</b> ของ B. Training
        </p>
        <div className="start-vchips">
          <span className="start-vchip">🆓 ทดลองฟรี 15 วัน ไม่ต้องใช้บัตร</span>
          <span className="start-vchip">💸 จ่าย PromptPay · ไม่มีตัดเงินอัตโนมัติ</span>
          <span className="start-vchip">🇹🇭 สั่งงานภาษาไทยธรรมชาติ</span>
        </div>
        <div className="start-cta-row">
          <a className="start-cta-main" href="/" onClick={() => track('sale_cta_click', { cta: 'hero' })}>
            เริ่มทดลองฟรี 15 วัน →</a>
          <a className="start-cta-sub" href="/pricing">ดูทุกแพ็กและราคา →</a>
        </div>
      </section>

      {/* Pain */}
      <section className="start-sec start-why-sec">
        <h2 className="start-h2">ถ้าคุณกำลังเจอแบบนี้ — หน้านี้เขียนเพื่อคุณ</h2>
        <div className="start-why-grid">
          <div className="start-why-card">
            <div className="start-why-ico">😵</div>
            <div className="start-why-name">ทำเองทุกอย่างจนไม่มีเวลาโต</div>
            <p>เป็นทั้งเจ้าของ การตลาด บัญชี แอดมิน — วันหมดไปกับงานจุกจิก ไม่มีเวลาคิดภาพใหญ่ ธุรกิจเลยโตไม่ได้สักที</p>
          </div>
          <div className="start-why-card">
            <div className="start-why-ico">💸</div>
            <div className="start-why-name">จ้างทีมก็แพง จ้างคนเดียวก็ไม่ครบ</div>
            <p>นักการตลาดคนเดียวเดือนละหลายหมื่น ยังไม่รวมวิจัยตลาด การเงิน ระบบ — ทุนไม่พอจ้างครบทั้งทีม</p>
          </div>
          <div className="start-why-card">
            <div className="start-why-ico">🎲</div>
            <div className="start-why-name">ทำการตลาดแบบเดาสุ่ม</div>
            <p>ยิงแอดตามความรู้สึก ไม่รู้กลุ่มลูกค้าจริง ไม่มีระบบวัดผล — เงินหมดก่อนเจอสูตรที่ใช่</p>
          </div>
        </div>
      </section>

      {/* Offer stack */}
      <section className="start-sec sale-stack-sec">
        <h2 className="start-h2">แพ็ก Growth ได้อะไรบ้าง — เทียบกับจ้างเอง</h2>
        <p className="start-price-note">
          ราคา “จ้างเอง” ด้านขวาเป็นราคาตลาดอ้างอิงของการจ้างคน/ที่ปรึกษา ไม่ใช่ตัวเลขการันตี —
          แต่ทั้งหมดนี้รวมอยู่ในแพ็กเดียว
        </p>
        <div className="sale-stack">
          {STACK.map((s, i) => (
            <div key={i} className="sale-stack-row">
              <span className="sale-stack-item">{s.item}</span>
              <span className="sale-stack-worth">{s.worth}</span>
            </div>
          ))}
        </div>
        <div className="sale-stack-total">
          รวมทุกอย่าง — <b>฿{GROWTH_YR_PERMO.toLocaleString()}/เดือน</b> (จ่ายรายปี) แทนที่จะจ้างทีมจริงหลายหมื่น/เดือน
        </div>
      </section>

      {/* Social proof — playbook จริง (ไม่ใช่ testimonial ปลอม) */}
      <section className="start-sec start-core-sec">
        <h2 className="start-h2">ระบบนี้ไม่ได้คิดเอาเอง — สร้างจากกลยุทธ์ที่พิสูจน์แล้วระดับโลก</h2>
        <p className="start-price-note">
          บทเรียนจริงจากบริษัทที่สำเร็จ ถูกแปลงเป็นแนวทางให้ทีม AI พาคุณทำ (ดูได้ในหน้า Case Studies ของระบบ)
        </p>
        <div className="start-core-grid">
          <div className="start-core-card">
            <div className="start-core-tag">Trust & โปร่งใส</div>
            <div className="start-core-name">🔬 Fitwhey (ไทย)</div>
            <p>ชนะตลาดที่คนไม่เชื่อใจด้วยหลักฐานพิสูจน์ได้ — ระบบพาคุณสร้าง trust แบบเดียวกัน</p>
          </div>
          <div className="start-core-card">
            <div className="start-core-tag">Customer-Centric</div>
            <div className="start-core-name">🏎️ Honda NSX</div>
            <p>ชนะด้วยการแก้ pain ที่คู่แข่งมองข้าม — ทีม AI ช่วยหาช่องว่างนั้นในตลาดคุณ</p>
          </div>
          <div className="start-core-card">
            <div className="start-core-tag">Cash Flow</div>
            <div className="start-core-name">💸 เนื้อแท้ (ไทย)</div>
            <p>บทเรียน “กำไรทิพย์” — CFO AI เตือนสภาพคล่องก่อนเงินสดตึง ให้โตแบบไม่สะดุด</p>
          </div>
        </div>
        <div className="start-src">เบื้องหลังโดย B. Training Consultant — ที่ปรึกษาธุรกิจ/ISO ในไทยมากกว่า 20 ปี</div>
      </section>

      {/* Price anchor — รายเดือน vs รายปี */}
      <section className="start-sec">
        <h2 className="start-h2">เลือกแบบที่คุ้มกับคุณ</h2>
        <div className="sale-toggle">
          <button className={`sale-toggle-btn${!annual ? ' active' : ''}`} onClick={() => setAnnual(false)}>
            รายเดือน
          </button>
          <button className={`sale-toggle-btn${annual ? ' active' : ''}`} onClick={() => setAnnual(true)}>
            รายปี · ฟรี 2 เดือน
          </button>
        </div>
        <div className="sale-pricecard">
          <div className="sale-pricecard-name">Growth</div>
          <div className="sale-pricecard-price">
            ฿{price.toLocaleString()}<span>/เดือน</span>
          </div>
          {annual ? (
            <div className="sale-pricecard-sub">
              เรียกเก็บปีละ ฿{GROWTH_YR.toLocaleString()} · ประหยัด ฿{GROWTH_SAVE.toLocaleString()}/ปี (~{GROWTH_SAVE_PCT}%)
            </div>
          ) : (
            <div className="sale-pricecard-sub">ยืดหยุ่น จ่ายเป็นเดือน · เปลี่ยนเป็นรายปีเมื่อไหร่ก็ได้</div>
          )}
          <a className="start-cta-main sale-pricecard-cta" href="/" onClick={() => track('sale_cta_click', { cta: 'price', billing: annual ? 'yearly' : 'monthly' })}>
            เริ่มทดลองฟรี 15 วัน →
          </a>
          <div className="sale-pricecard-foot">ไม่ต้องใช้บัตรเครดิต · จ่าย PromptPay เมื่อพร้อม · ไม่มีตัดเงินอัตโนมัติ</div>
        </div>
      </section>

      {/* Guarantee / risk reversal */}
      <section className="start-sec">
        <div className="sale-guarantee">
          <div className="sale-guarantee-ico">🛡️</div>
          <div>
            <div className="sale-guarantee-title">ทดลองก่อน ไม่กดดัน</div>
            <div className="sale-guarantee-body">
              เริ่มฟรี 15 วันเต็มไม่ต้องใช้บัตร ลองใช้ทีม AI ทำงานจริงก่อนจ่ายสักบาท —
              เพราะไม่มีการตัดเงินอัตโนมัติ คุณควบคุมทุกการจ่ายเอง ไม่ชอบก็แค่ไม่ต่อ ไม่มีข้อผูกมัด
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="start-sec start-faq-sec">
        <h2 className="start-h2">คำถามก่อนตัดสินใจ</h2>
        <FaqAccordion items={FAQS} />
      </section>

      {/* Final CTA */}
      <section className="start-sec start-share-sec">
        <h2 className="start-h2">พร้อมให้ทีม AI เริ่มทำงานให้คุณหรือยัง?</h2>
        <p className="start-price-note">อีก 5 นาทีคุณมีบริษัทพร้อมทีม — เริ่มฟรี จ่ายเมื่อมั่นใจ</p>
        <div className="start-final-cta">
          <a className="start-cta-main" href="/" onClick={() => track('sale_cta_click', { cta: 'final' })}>
            เริ่มทดลองฟรี 15 วัน →</a>
        </div>
      </section>

      <footer className="start-foot">
        CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย ·{' '}
        <a href="/start">ทำไมต้องเรา</a> ·{' '}
        <a href="/pricing">ทุกแพ็ก</a> ·{' '}
        <a href="/b">สารบัญธุรกิจ</a> ·{' '}
        โดย <a href="https://www.b-tctraining.com" target="_blank" rel="noreferrer">B. Training Consultant (M.E.A) Co., Ltd.</a>
        <br />
        เราให้บริการที่ปรึกษามามากกว่า 20 ปีในประเทศไทย · โทร <a href="tel:08178177773">081-7817-7773</a>
        <br />
        <LegalLinks />
        <div style={{ marginTop: 14 }}><IsmsBadge /></div>
      </footer>

      {/* Sticky CTA */}
      <div className={`start-sticky${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <span className="start-sticky-txt">฿{GROWTH_YR_PERMO.toLocaleString()}/เดือน · ทดลองฟรี 15 วัน</span>
        <a className="start-sticky-btn" href="/" onClick={() => track('sale_cta_click', { cta: 'sticky' })}>
          เริ่มเลย →
        </a>
      </div>
    </div>
  );
}
