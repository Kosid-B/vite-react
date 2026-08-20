import { useEffect, useState } from 'react';

/* ===== แถบความยินยอมคุกกี้ (Cookie Consent Banner) =====
 * แสดงครั้งแรกที่เข้าเว็บ (ทุกหน้า รวมหน้าสาธารณะ) — เก็บผลใน localStorage
 *   'all'       = ยอมรับทั้งหมด (เปิด Analytics)
 *   'necessary' = เฉพาะที่จำเป็น (ปิด Analytics)
 * Analytics ถูกปิดไว้ก่อนใน index.html จนกว่าจะเลือก 'all' — ที่นี่จัดการปุ่ม + สลับสถานะ
 * จริยธรรม: ไม่มี dark pattern (สองปุ่มเท่าเทียม ไม่ซ่อนตัวเลือกปฏิเสธ) */

const KEY = 'ceo_ai_cookie_consent';
const GA_DISABLE = 'ga-disable-G-CHJ99RY1Q1';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* noop */ }
    if (v !== 'all' && v !== 'necessary') setShow(true);
  }, []);

  function choose(choice: 'all' | 'necessary') {
    try { localStorage.setItem(KEY, choice); } catch { /* noop */ }
    setShow(false);
    if (choice === 'all') {
      // เปิด Analytics — ยกเลิก flag แล้วรีโหลดให้ GA เริ่มเก็บ pageview รอบใหม่
      try { (window as unknown as Record<string, unknown>)[GA_DISABLE] = false; } catch { /* noop */ }
      window.location.reload();
    } else {
      try { (window as unknown as Record<string, unknown>)[GA_DISABLE] = true; } catch { /* noop */ }
    }
  }

  if (!show) return null;

  return (
    <div className="cc-banner" role="dialog" aria-live="polite" aria-label="ความยินยอมการใช้คุกกี้">
      <style>{CC_CSS}</style>
      {/* ข้อความสั้นบนมือถือ · เต็มบนจอใหญ่ — รายละเอียดครบอยู่ที่ /legal#cookies เสมอ
          🔴 เหตุผล (วัดจริง 20 ส.ค. 2569 บน iPhone 390px): แถบเดิมสูง ~130px และ "ทับช่องกรอก"
             ของเครื่องคำนวณพอดี ⇒ คนกำลังจะใส่ตัวเลขแล้วโดนบัง
          PDPA ยังครบ: บอกว่าใช้คุกกี้อะไร · มีลิงก์นโยบาย · เลือกปฏิเสธได้เท่าเทียม · ไม่ยอมรับให้เอง */}
      <div className="cc-text">
        <span className="cc-full">
          🍪 เราใช้คุกกี้ที่จำเป็นเพื่อให้ระบบทำงาน และคุกกี้วิเคราะห์/การตลาด (Google Analytics, LINE)
          เพื่อพัฒนาบริการ โดยเปิดใช้เมื่อคุณยินยอมเท่านั้น ·{' '}
        </span>
        <span className="cc-short">🍪 ใช้คุกกี้วิเคราะห์เมื่อคุณยินยอม · </span>
        <a href="/legal#cookies">นโยบายคุกกี้</a>
      </div>
      <div className="cc-actions">
        <button className="cc-btn cc-ghost" onClick={() => choose('necessary')}>เฉพาะที่จำเป็น</button>
        <button className="cc-btn cc-primary" onClick={() => choose('all')}>ยอมรับทั้งหมด</button>
      </div>
    </div>
  );
}

const CC_CSS = `
.cc-banner{ position:fixed; left:0; right:0; bottom:0; z-index:9999;
  display:flex; align-items:center; gap:16px; flex-wrap:wrap; justify-content:center;
  padding:14px 20px; background:rgba(2,6,23,.95); backdrop-filter:blur(12px);
  border-top:1px solid #1e293b; color:#f8fafc; box-sizing:border-box; max-width:100vw;
  box-shadow:0 -6px 24px rgba(0,0,0,.45); font-family:'Kanit',system-ui,-apple-system,sans-serif; }
/* min-width:0 + overflow-wrap:anywhere = ให้ข้อความไทย (ไม่มีเว้นวรรค) ตัดบรรทัดและหดตามจอได้
   กันบั๊ก: ข้อความยาว → min-content กว้างเกินจอ → ดัน layout ทั้งหน้ากว้างเกิน (ช่องว่างขวาบนมือถือ) */
.cc-text{ font-size:13.5px; line-height:1.6; max-width:720px; min-width:0; overflow-wrap:anywhere; color:#cbd5e1; }
.cc-text a{ color:#22d3ee; text-decoration:none; font-weight:600; }
.cc-text a:hover{ text-decoration:underline; }
.cc-actions{ display:flex; gap:10px; flex-wrap:wrap; }
.cc-btn{ cursor:pointer; border-radius:999px; padding:9px 18px; font-family:inherit;
  font-size:13.5px; font-weight:700; border:1px solid #334155; transition:filter .15s ease,transform .15s ease; }
.cc-btn:hover{ transform:translateY(-1px); filter:brightness(1.08); }
.cc-ghost{ background:transparent; color:#cbd5e1; }
.cc-primary{ background:#06b6d4; border-color:#06b6d4; color:#04121a; }
.cc-short{ display:none; }
/* มือถือ: บีบให้เตี้ยที่สุดเท่าที่ยังอ่านออกและกดง่าย — เดิมสูง ~130px จนบังช่องกรอก
   ปุ่มสองปุ่มยังกว้างเท่ากัน (flex:1) = ปฏิเสธง่ายเท่ายอมรับ ไม่เป็น dark pattern */
@media (max-width:560px){
  .cc-banner{ gap:8px; padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px)); }
  .cc-full{ display:none; }
  .cc-short{ display:inline; }
  .cc-text{ font-size:12px; line-height:1.45; text-align:center; }
  .cc-actions{ width:100%; gap:8px; }
  .cc-btn{ flex:1; padding:9px 10px; font-size:12.5px; }
}
`;
