import LandingPage from './LandingPage';

/* ===== Marketing Landing (หน้าแรก `/` สำหรับผู้ยังไม่ล็อกอิน) =====
 * เรนเดอร์ตรงจาก Root โดย "ไม่ผ่าน App" → ไม่โหลด @supabase/supabase-js (~44KB) และไม่โหลด index.css (~67KB)
 * เพราะ LandingPage ใช้ inline styles ล้วน + ลูก (IsmsBadge/CookieConsent) เป็น self-contained
 * ปุ่ม CTA พาเข้า App ผ่าน query param ?enter= (App อ่านตอน mount → showAuth / guest) */
export default function MarketingLanding() {
  return (
    <LandingPage
      onGetStarted={() => { window.location.href = '/?enter=auth'; }}
      onTryGuest={() => { window.location.href = '/?enter=guest'; }}
    />
  );
}
