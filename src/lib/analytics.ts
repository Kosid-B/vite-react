/** GA4 funnel events — วัด conversion รายขั้นต่อ segment (แผนแก้ gap ข้อ 3)
 *  gtag โหลดจาก index.html (G-CHJ99RY1Q1) — wrapper นี้ no-op ถ้าไม่มี (local/บล็อก ads)
 *
 *  Funnel หลักที่วัด:
 *  ทุกกลุ่ม   : landing_cta_click → storefront_published → (รายได้)
 *  แม่ค้า     : shop_pkg_selected → shop_signup_submitted
 *  ผู้ซื้อจริง : lead_submitted (สั่งจอง/สนใจ = demand จริง)
 *  B2B       : open_rfq_posted / rfq_quote_sent (liquidity ตลาด)
 *  Cross-sell: booster_hired / agent_match_run (ตลาด → บริษัท AI)
 */

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export function track(event: string, params: Record<string, string | number> = {}) {
  try {
    window.gtag?.('event', event, params);
  } catch { /* ห้ามทำ UX พัง เพราะ analytics */ }
}
