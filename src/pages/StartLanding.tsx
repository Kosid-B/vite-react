import '../index.css';
import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { readTheme, setTheme, nextTheme, themeIcon, themeLabel, type ThemeId } from '../lib/theme';
import { applySeo, siteOrigin } from '../lib/seo';
import { segmentFor } from '../lib/heroVariant';
import { startHeroFor } from '../lib/startHero';
import LegalLinks from '../components/LegalLinks';
import IsmsBadge from '../components/IsmsBadge';
import FaqAccordion, { type FaqItem } from '../components/FaqAccordion';
import { feeHeadlineTh } from '../lib/marketplaceFees';

/* ===== Landing page ไวรัล — /start (สาธารณะ ไม่ต้องล็อกอิน) =====
 * กลุ่มเป้าหมายค่าตั้งต้น (แก้ 16 ส.ค. 2569 ตามผู้ชมที่วัดได้จริง):
 *   เจ้าของธุรกิจที่ขายอยู่แล้วแต่กำไรไม่เหลือ — อายุ 35-65
 *   วัดจาก YouTube คลิป 942 วิว: อายุ 18-24 = 0.0% · 45 ปีขึ้นไป = 58.1%
 *   ของเดิมพูดกับ "คนจบใหม่ · คนหางาน" ซึ่งไม่มีอยู่ในผู้ชมของเราเลยแม้แต่คนเดียว
 * ⚠️ ไม่ได้ตัดคนเพิ่งเริ่มทิ้ง — เขายังเจอพาดหัว seg 'newbie' เมื่อมาจากคอนเทนต์เรื่องทุน
 * เป้าหมาย: ใช้ฟรี → เห็นตัวเลขจริงของตัวเอง → อัปเกรดเมื่อธุรกิจเดินขึ้น */

const PAGE_URL = 'https://ceoaithailand.org/start';
const SHARE_TEXT = 'ขายได้ทุกวันแต่สิ้นเดือนเงินไม่เหลือ? ให้ทีม AI แยกต้นทุนจริงและตั้งราคาให้มีกำไร เริ่มฟรี ไม่ต้องใช้บัตรเครดิต';

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
  { name: 'Starter', price: '฿790', per: '/เดือน', desc: 'รับงานผ่าน RFQ + ออเดอร์ — จ่ายเมื่อเริ่มมีรายได้', note: 'ถูกกว่าจ้างผู้ช่วย 1 คนหลายสิบเท่า', hot: true },
  { name: 'Growth', price: '฿1,490', per: '/เดือน', desc: 'ทีม AI เต็มรูปแบบ + วิจัยตลาด + Analytics', note: 'เมื่อธุรกิจเดินแล้ว' },
];

const FAQS: FaqItem[] = [
  { q: 'เริ่มใช้ฟรีจริงไหม ต้องใส่บัตรเครดิตไหม?', a: 'ฟรีจริง ไม่ต้องใช้บัตรเครดิต — สมัครแล้วเริ่มสร้างธุรกิจ เปิดหน้าร้าน และขึ้นสารบัญธุรกิจได้ทันที จ่ายเมื่อคุณเริ่มมีรายได้เท่านั้น' },
  { q: 'ไม่มีความรู้ธุรกิจ ไม่เคยเปิดร้าน ใช้ได้ไหม?', a: 'ได้ ระบบออกแบบมาเพื่อมือใหม่โดยเฉพาะ — CEO AI จะถามสิ่งที่คุณถนัด แล้วร่างแผนธุรกิจ (BMC) วางขั้นตอนการทำงาน และแนะนำทีละก้าวให้คุณอนุมัติ ไม่ต้องเริ่มจากศูนย์คนเดียว' },
  { q: 'AI ช่วยอะไรได้บ้างจริง ๆ?', a: 'มีทีมเอเจนต์ช่วยจริง: CEO วางแผนและมอบงาน, ฝ่ายการตลาดคิดคอนเทนต์/กลุ่มลูกค้า, นักวิจัยตลาดหาข้อมูลคู่แข่งและราคาตลาด, นักวิเคราะห์ดูตัวเลขและจุดรั่ว — ทำงานให้ตลอด 24 ชั่วโมง' },
  { q: 'มีรายได้จากตรงไหน แล้ว RFQ คืออะไร?', a: 'RFQ คือใบขอเสนอราคาจากธุรกิจอื่น — เมื่อคุณเปิดหน้าร้านในระบบ ธุรกิจที่ต้องการสินค้า/บริการจะส่งคำขอมาถึงคุณ คุณเสนอราคา ปิดดีล กลายเป็นออเดอร์และรายได้จริง' },
  { q: 'ต้องจ่ายเมื่อไหร่ ค่าใช้จ่ายเท่าไหร่?', a: `เริ่มฟรี ฿0 — ทดลองฟีเจอร์เต็ม 15 วัน ไม่ต้องผูกบัตรเครดิต · อัปเกรด Starter ฿790/เดือนเมื่อพร้อมรับงานผ่าน RFQ (ถูกกว่าจ้างผู้ช่วย 1 คนหลายสิบเท่า) · ส่วนการขายผ่านตลาด ${feeHeadlineTh('full')}` },
  { q: 'ข้อมูลธุรกิจของฉันปลอดภัยไหม?', a: 'ปลอดภัย ข้อมูลแต่ละธุรกิจแยกจากกันสมบูรณ์ คนอื่นเห็นเฉพาะหน้าร้านที่คุณเลือกเผยแพร่ ดูแลโดย B. Training Consultant ผู้ให้บริการที่ปรึกษามากกว่า 20 ปี' },
];

// ตารางเทียบ "ต่างจาก ChatGPT ยังไง" — Pain point #1 (แก้ความสับสน "ก็ ChatGPT อีกตัว")
// ข้อความเป็นข้อเท็จจริงของฟีเจอร์ที่มีจริง — ไม่โม้เกินจริง
type CmpRow = { label: string; chatgpt: string; ceo: string };
const COMPARE_BIZ: CmpRow[] = [
  { label: 'สิ่งที่ได้', chatgpt: 'ช่วยตอบคำถาม', ceo: 'ช่วยสร้างธุรกิจเป็นขั้นตอน' },
  { label: 'วิธีคิด', chatgpt: 'สร้างข้อความและไอเดีย', ceo: 'ตรวจสอบสมมติฐานทางธุรกิจ (PMF)' },
  { label: 'โฟกัส', chatgpt: 'เน้นเครื่องมือ AI', ceo: 'เน้นผลลัพธ์ทางธุรกิจ' },
  { label: 'กรอบการทำงาน', chatgpt: 'ไม่มีกรอบดำเนินงาน', ceo: 'ใช้แนวทาง MIT 24 Steps' },
  { label: 'ระบบบริหาร', chatgpt: 'ไม่เชื่อมกับระบบ', ceo: 'เชื่อม SOP · KPI · Risk · ISO' },
  { label: 'ระยะการใช้งาน', chatgpt: 'เหมาะกับงานรายครั้ง', ceo: 'ออกแบบเพื่อเติบโตระยะยาว' },
  { label: 'การพึ่งพา', chatgpt: 'ธุรกิจยังพึ่งเจ้าของ', ceo: 'เตรียมธุรกิจให้ทำซ้ำ + ขยายได้' },
];
const COMPARE_ISO: CmpRow[] = [
  { label: 'เอกสาร ISO ไทย', chatgpt: 'ต้อง prompt เขียนเองทุกครั้ง', ceo: 'มีโครงเทมเพลต ISO 9001/14001/45001/22301' },
  { label: 'ประเมินก่อน audit', chatgpt: 'ไม่มีโครงประเมิน', ceo: 'Gap assessment มีโครง บอกสิ่งที่ยังขาด' },
  { label: 'PDPA ไทย', chatgpt: 'ทั่วไป ไม่อิงกฎหมายไทย', ceo: 'อิงบริบท PDPA ไทย (ฟีเจอร์เสริม)' },
  { label: 'ความต่อเนื่อง', chatgpt: 'จำบริบทได้จำกัด', ceo: 'เก็บสถานะเอกสาร/งานเป็นระบบ' },
  { label: 'ใครออกแบบ', chatgpt: 'แพลตฟอร์มต่างชาติ', ceo: 'ที่ปรึกษา ISO/ธุรกิจจริง 20+ ปี (B. Training)' },
];

// "ต้นน้ำที่แข็งแรง" 8 ขั้น — ทำ positioning ให้จับต้องได้ (เส้นทาง MIT 24 Steps → scale)
const FOUNDATION = [
  'เลือกกลุ่มลูกค้าที่ถูกต้อง',
  'เข้าใจปัญหาที่ลูกค้ายอมจ่ายเงินแก้',
  'สร้าง Value Proposition ที่ชัดเจน',
  'ทดสอบ Product–Market Fit',
  'สร้างฐานลูกค้าที่มีคุณภาพ',
  'ออกแบบ Customer Journey',
  'สร้างกระบวนการขาย/บริการที่ทำซ้ำได้',
  'จัดทำ SOP · KPI · ระบบบริหาร พร้อม Scalability',
];

// ROI — เทียบ "ค่าจ้างทีมจริงในตลาด" กับราคาแพ็ก (Pain point #2)
// ⚠️ เป็นราคาตลาดอ้างอิงของ "การจ้างเอง" ไม่ใช่ตัวเลขผลลัพธ์ที่การันตี
const ROI_ITEMS = [
  { ico: '📣', role: 'นักการตลาด (freelance/พาร์ตไทม์)', market: '~฿15,000–30,000/เดือน' },
  { ico: '🔎', role: 'ผู้ช่วยวิจัยตลาด/ธุรการ', market: '~฿15,000+/เดือน' },
  { ico: '⚙️', role: 'ที่ปรึกษาวางระบบธุรกิจ', market: '~฿20,000+/ครั้ง' },
];

export default function StartLanding() {
  const [copied, setCopied] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  // ธีม เข้ม/มินิมอล — data-theme บน <html> ตั้งไว้แล้วจาก main.tsx · ปุ่มนี้ให้สลับเอง (บันทึกร่วมทั้งระบบ)
  const [theme, setThemeState] = useState<ThemeId>(() => readTheme());
  const toggleTheme = () => {
    const nx = nextTheme(theme);
    setTheme(nx);
    setThemeState(nx);
    track('theme_changed', { theme: nx, where: 'start' });
  };

  // Dynamic PLG: หน้านี้ต้องพูดกับ "คนคนนี้" ไม่ใช่พูดกับทุกคนเหมือนกันหมด
  // seg มาจากลิงก์ที่พาเขามา (CTA ท้ายบทความติด ?seg= ให้ตามหมวดของบทความนั้น)
  // ISO ยังชนะทุกอย่างเพราะเป็นสะพานจากเว็บบริษัท = คนละกลุ่มกันชัดเจน
  const seg = useMemo(() => segmentFor(window.location.search, document.referrer), []);
  /* เวอร์ชัน hero: ISO/โรงงาน — กลุ่มที่ "มีวันตรวจรออยู่"
   *
   * 🔴 รวมกลไกเป็นตัวเดียว 22 ส.ค. 2569: เดิมหน้านี้มี matcher ของตัวเอง
   *    (`utm_campaign` ที่มีคำว่า 'iso' เท่านั้น) แยกจาก `segmentFor()`
   *    ⇒ คนที่พิมพ์ **audit · มอก · pdpa · ตรวจประเมิน · ต่ออายุ · ไอเอสโอ** ไม่เข้าประตูนี้เลย
   *    ทั้งที่เป็นกลุ่มเดียวกันและเป็นกลุ่มที่ **จ่ายเงินอยู่แล้ว** (จ่ายที่ปรึกษาหลักหมื่น–แสน)
   *    ตอนนี้ให้ `segmentFor()` เป็นคนตัดสินที่เดียว — เพิ่มคำใหม่ที่ heroVariant.ts ที่เดียวจบ
   * ⚠️ `ref=btctraining` = สะพานจากเว็บบริษัท คงไว้ (ไม่ได้มาทาง utm) */
  const isIso = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('ref') === 'btctraining' || seg === 'audit';
  }, [seg]);

  const segHero = isIso ? null : startHeroFor(seg);

  useEffect(() => {
    track('start_variant', { variant: isIso ? 'iso' : (segHero ? seg : 'default'), seg });
  }, [isIso, seg, segHero]);

  const compareRows = isIso ? COMPARE_ISO : COMPARE_BIZ;

  useEffect(() => {
    const o = siteOrigin();
    applySeo({
      title: isIso
        ? 'ประเมินความพร้อม ISO ฟรีด้วย AI — CEO AI Thailand'
        : 'ขายได้ทุกวัน แต่เงินไม่เหลือ? รู้ตัวเลขจริงของธุรกิจ — ฟรี | CEO AI Thailand',
      description: isIso
        ? 'โรงงาน/SME ทำ ISO 9001/14001/45001/22301 — ให้ AI ประเมินความพร้อม บอกสิ่งที่ต้องทำก่อน audit ฟรี ออกแบบโดยที่ปรึกษา ISO จริง 20 ปี'
        : 'เจ้าของธุรกิจที่ขายดีแต่เงินไม่เหลือ — ให้ทีม AI แยกต้นทุนจริง ตั้งราคาให้มีกำไร หาลูกค้า และวางระบบให้ทำซ้ำได้ เริ่มฟรี ไม่ต้องใช้บัตร',
      canonicalUrl: `${o}/start`,
      imageUrl: `${o}/og-image.png`,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }],
    });
  }, [isIso]);

  // Sticky CTA — โผล่หลังเลื่อนพ้น hero (ลด bounce, CTA อยู่ในสายตาเสมอ)
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 640);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-reveal — sections ค่อย ๆ ปรากฏตอนเลื่อนถึง (เพิ่มความน่าสนใจ ชวนอ่านต่อ)
  // ใส่ class ผ่าน JS เท่านั้น → ถ้า JS ปิด/พัง เนื้อหายังแสดงครบ
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
        {isIso ? (
          <>
            <div className="start-badge">✦ &nbsp;สำหรับโรงงาน/SME ที่ต้องทำ ISO · เขต EEC&nbsp; ✦</div>
            <h1 className="start-h1">
              ทำ ISO เสียเวลาเป็นอาทิตย์?<br />
              <span className="start-h1-hl">ให้ทีม AI ประเมิน + บอกสิ่งที่ต้องทำก่อน audit</span>
            </h1>
            <p className="start-sub">
              รองรับ <b>ISO 9001 / 14001 / 45001 / 22301</b> — รู้ทันทีว่ายังขาดเอกสารบังคับตัวไหน ก่อนวันตรวจจริง
              ไม่ต้องรอนัดที่ปรึกษา<br />
              ออกแบบโดยที่ปรึกษา ISO/ธุรกิจจริง <b>มากกว่า 20 ปี</b> — B. Training Consultant
            </p>
            <div className="start-vchips">
              <span className="start-vchip">⚡ ประเมินเสร็จใน 5 นาที</span>
              <span className="start-vchip">🆓 เริ่มฟรี ไม่ต้องใช้บัตร</span>
              <span className="start-vchip">🏭 ตรงกลุ่มโรงงาน EEC</span>
            </div>
          </>
        ) : segHero ? (
          <>
            <div className="start-badge">{segHero.badge}</div>
            <h1 className="start-h1">
              {segHero.h1}<br />
              <span className="start-h1-hl">{segHero.h1hl}</span>
            </h1>
            <p className="start-sub">
              {segHero.sub.map((line, i) => (
                <span key={line}>{line}{i < segHero.sub.length - 1 && <br />}</span>
              ))}
            </p>
            <div className="start-vchips">
              {segHero.chips.map(c => <span className="start-vchip" key={c}>{c}</span>)}
            </div>
          </>
        ) : null}
        <div className="start-cta-row">
          <a className="start-cta-main" href="/" onClick={() => track('start_cta_click', { cta: 'hero' })}>
            {isIso ? 'ประเมิน ISO ฟรี — ไม่ต้องใช้บัตรเครดิต' : 'เริ่มใช้ฟรี — ไม่ต้องใช้บัตรเครดิต'}</a>
          <a className="start-cta-sub" href="/b">ดูธุรกิจที่เปิดแล้วในระบบ →</a>
        </div>
      </section>

      {/* Market timing — AI หลอมรวมชีวิตคนไทยแล้ว (ปลุก "จังหวะนี้แหละ") + ย้ำจุดแข็งภาษาไทย */}
      <section className="start-sec start-timing-sec">
        <div className="start-timing-card">
          <span className="start-timing-big">87%</span>
          <div className="start-timing-body">
            <b>คนไทยคุยกับ AI เป็นภาษาไทย</b> เพื่อจัดการชีวิตประจำวัน — และ AI กลายเป็นเครื่องมือของคน<b>ทุกวัย</b>แล้ว
            <div className="start-timing-sub">
              CEO AI Thailand สั่งงานเป็น<b>ภาษาไทยธรรมชาติ</b> ออกแบบเพื่อคนไทย เริ่มใช้ได้เลยไม่ต้องเก่งเทคโนโลยี —
              จังหวะนี้แหละที่ธุรกิจเล็กจะมีทีม AI ได้เท่าบริษัทใหญ่
            </div>
          </div>
        </div>
        <div className="start-src">ที่มา: The Gemini Report — Southeast Asia 2026</div>
      </section>

      {/* แก่น positioning — สร้างต้นน้ำให้แข็งแรง + 2 เสาหลัก (MIT 24 Steps × ระบบ ISO) */}
      <section className="start-sec start-core-sec">
        <h2 className="start-h2">ไม่รีบสร้างให้ใหญ่ — แต่สร้าง “ต้นน้ำ” ให้แข็งแรงก่อน</h2>
        <p className="start-price-note">
          ธุรกิจที่โตยั่งยืนเริ่มจากพื้นฐานที่ถูก: เลือกลูกค้าที่ใช่ · เข้าใจปัญหาที่เขายอมจ่าย · สร้างคุณค่าที่ชัด ·
          ทดสอบตลาด แล้วค่อยวางระบบให้ทำซ้ำและขยายได้
        </p>
        <div className="start-core-grid">
          <div className="start-core-card">
            <div className="start-core-tag">เสาที่ 1 · หาทิศให้ถูก</div>
            <div className="start-core-name">🎯 แนวทาง 24 Steps ของ MIT</div>
            <p>ค้นหากลุ่มลูกค้าเป้าหมาย กำหนดคุณค่า ทดสอบ Product–Market Fit และสร้างรายได้ — อย่างมีระเบียบวิธี ไม่เดาสุ่ม</p>
          </div>
          <div className="start-core-card">
            <div className="start-core-tag">เสาที่ 2 · วางระบบให้โต</div>
            <div className="start-core-name">⚙️ ระบบบริหาร/ISO 20+ ปี</div>
            <p>SOP · KPI · การจัดการความเสี่ยง · ระบบควบคุม จากประสบการณ์ B. Training — ให้ธุรกิจโตได้โดยไม่ต้องพึ่งเจ้าของคนเดียว</p>
          </div>
        </div>
        <div className="start-src">ทีมผู้บริหาร AI คือ “กลไก” ที่ช่วยลงมือทำทั้งสองเสานี้ให้คุณ — ไม่ใช่แค่แชตตอบคำถาม ·{' '}
          <a href="/mit24" className="start-inline-link">MIT 24 Steps คืออะไร →</a></div>
      </section>

      {/* "ต้นน้ำที่แข็งแรง" 8 ขั้น — เส้นทางที่ CEO AI พาเดิน (ทำ positioning ให้เห็นเป็นรูป) */}
      <section className="start-sec start-fdn-sec">
        <h2 className="start-h2">“ต้นน้ำที่แข็งแรง” ประกอบด้วยอะไรบ้าง</h2>
        <p className="start-price-note">CEO AI พาคุณทีละขั้น จากเลือกลูกค้าที่ใช่ → วางระบบพร้อมโต — ไม่ข้ามขั้น ไม่เดาสุ่ม</p>
        <ol className="start-fdn-list">
          {FOUNDATION.map((s, i) => (
            <li key={i} className="start-fdn-item">
              <span className="start-fdn-num">{i + 1}</span>
              <span className="start-fdn-txt">{s}</span>
            </li>
          ))}
        </ol>
        <div className="start-src">พื้นฐานแน่นตั้งแต่วันแรก = ธุรกิจที่ “ทำซ้ำ ควบคุม พัฒนา และขยายได้” ไม่ใช่แค่ขายได้วันนี้</div>
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

      {/* ต่างจาก ChatGPT ยังไง — Pain #1 (แก้ "ก็ ChatGPT อีกตัว") */}
      <section className="start-sec start-cmp-sec">
        <h2 className="start-h2">แล้วต่างจาก ChatGPT ยังไง?</h2>
        <p className="start-price-note">
          {isIso
            ? 'ChatGPT ตอบคำถามเก่ง แต่ไม่มีโครงเอกสาร ISO ไทยและไม่เก็บงานต่อเนื่องให้ — นี่คือส่วนต่าง'
            : 'ChatGPT คือ “ผู้ช่วยตอบคำถาม” · CEO AI Thailand คือ “ทีมที่ลงมือทำธุรกิจให้” — เทียบตรงๆ'}
        </p>
        <div className="start-cmp-tablewrap">
          <table className="start-cmp">
            <thead>
              <tr>
                <th></th>
                <th>ChatGPT / แชตบอตทั่วไป</th>
                <th className="start-cmp-us">CEO AI Thailand</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={i}>
                  <td className="start-cmp-label">{r.label}</td>
                  <td className="start-cmp-them">{r.chatgpt}</td>
                  <td className="start-cmp-us">✓ {r.ceo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="start-src">ไม่ได้แข่งกับ ChatGPT — เราใช้ AI ระดับเดียวกัน แต่ห่อด้วย “ระบบทำธุรกิจ” ให้คนไทยใช้ได้เลย</p>
      </section>

      {/* ROI — เทียบค่าจ้างทีมจริง (Pain #2) */}
      <section className="start-sec start-roi-sec">
        <h2 className="start-h2">คุ้มแค่ไหน? เทียบกับจ้างทีมจริง</h2>
        <p className="start-price-note">ถ้าจ้างคนมาทำงานเหล่านี้เอง ต้นทุนต่อเดือนในตลาดคือ:</p>
        <div className="start-roi-grid">
          {ROI_ITEMS.map((r, i) => (
            <div key={i} className="start-roi-card">
              <div className="start-roi-ico">{r.ico}</div>
              <div className="start-roi-role">{r.role}</div>
              <div className="start-roi-market">{r.market}</div>
            </div>
          ))}
        </div>
        <div className="start-roi-punch">
          ทีม AI ครบชุดของคุณ เริ่มที่ <b>฿0</b> — อัปเป็น Starter เพียง <b>฿790/เดือน</b> เมื่อพร้อมรับงาน
          <div className="start-roi-honest">
            💡 พูดตรงๆ: AI ช่วย “เริ่ม + วางระบบ + การตลาด” ให้เร็วขึ้นมาก แต่ยอดขายยังต้องคุณลงมือปิดเอง — ไม่ใช่ปุ่มวิเศษ
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
        <p className="start-price-note">เราโตเมื่อคุณมีรายได้: {feeHeadlineTh()}</p>
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

      {/* FAQ — เพิ่ม engagement + ตอบข้อสงสัยที่ทำให้ลังเล + FAQ schema ช่วย SEO/GEO */}
      <section className="start-sec start-faq-sec">
        <h2 className="start-h2">คำถามที่พบบ่อย</h2>
        <FaqAccordion items={FAQS} />
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
          <a className="start-cta-main" href="/" onClick={() => track('start_cta_click', { cta: 'final' })}>
            เริ่มวันนี้ ฟรี — อีก 5 นาทีคุณมีบริษัทแล้ว</a>
        </div>
      </section>

      <footer className="start-foot">
        CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย ·{' '}
        <a className="legal-link" href="/b">สารบัญธุรกิจ</a> ·{' '}
        <a className="legal-link" href="/mit24">MIT 24 Steps</a> ·{' '}
        <a className="legal-link" href="/faq">คำถามที่พบบ่อย</a> ·{' '}
        โดย <a className="legal-link" href="https://www.b-tctraining.com" target="_blank" rel="noreferrer">B. Training Consultant (M.E.A) Co., Ltd.</a>
        <br />
        เราให้บริการที่ปรึกษามามากกว่า 20 ปีในประเทศไทย · โทร <a className="legal-link" href="tel:08178177773">081-7817-7773</a>
        <br />
        <LegalLinks />
        <div style={{ marginTop: 14 }}><IsmsBadge /></div>
      </footer>

      {/* Sticky CTA — โผล่ตอนเลื่อน (มือถือเห็นชัด) */}
      <div className={`start-sticky${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <span className="start-sticky-txt">เริ่มฟรี ไม่ต้องใช้บัตร</span>
        <a className="start-sticky-btn" href="/" onClick={() => track('start_cta_click', { cta: 'sticky' })}>
          เปิดบริษัทของคุณ →
        </a>
      </div>
    </div>
  );
}