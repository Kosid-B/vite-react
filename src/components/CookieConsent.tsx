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
      <div className="cc-text">
        🍪 เราใช้คุกกี้ที่จำเป็นเพื่อให้ระบบทำงาน และคุกกี้วิเคราะห์ (Google Analytics) เพื่อพัฒนาบริการ
        โดยเปิดใช้เมื่อคุณยินยอมเท่านั้น · อ่าน<a href="/legal#cookies">นโยบายคุกกี้</a>
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
  padding:14px 20px; background:#0b1220; border-top:1px solid #223; color:#e2e8f0;
  box-shadow:0 -6px 24px rgba(0,0,0,.4); font-family:"Noto Sans Thai",system-ui,sans-serif; }
.cc-text{ font-size:13.5px; line-height:1.6; max-width:720px; }
.cc-text a{ color:#38bdf8; text-decoration:none; }
.cc-text a:hover{ text-decoration:underline; }
.cc-actions{ display:flex; gap:10px; flex-wrap:wrap; }
.cc-btn{ cursor:pointer; border-radius:999px; padding:9px 18px; font-family:inherit;
  font-size:13.5px; font-weight:700; border:1px solid #334155; transition:filter .15s ease,transform .15s ease; }
.cc-btn:hover{ transform:translateY(-1px); filter:brightness(1.08); }
.cc-ghost{ background:transparent; color:#cbd5e1; }
.cc-primary{ background:#06b6d4; border-color:#06b6d4; color:#00212b; }
@media (max-width:560px){ .cc-banner{ flex-direction:column; align-items:stretch; text-align:center; }
  .cc-actions{ justify-content:center; } }
`;
