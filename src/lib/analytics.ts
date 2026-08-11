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

import { sendAmplitude } from './amplitude';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

// GA4 ใช้พารามิเตอร์เหล่านี้เป็น "reserved attribution params" — ถ้าส่งเป็น event param ตรง ๆ
// GA จะเอาไป "ปน" แหล่งที่มา/สื่อ ของเซสชัน (เช่น js_error ที่มี source:'react.ErrorBoundary'
// → โผล่เป็น session source 'react.ErrorBoundary / (not set)' ทำให้รายงานแหล่งที่มาเพี้ยน)
// จึง remap เป็นชื่อ ev_* ก่อนส่ง — ค่ายังเก็บครบ แต่ไม่ชนกับระบบ attribution ของ GA
const GA_RESERVED = new Set([
  'source', 'medium', 'campaign', 'term', 'content',
  'source_platform', 'creative_format', 'marketing_tactic', 'campaign_id',
]);

export function track(event: string, params: Record<string, string | number> = {}) {
  try {
    let safe: Record<string, string | number> = params;
    for (const k in params) {
      if (GA_RESERVED.has(k)) {
        if (safe === params) safe = { ...params };
        safe['ev_' + k] = params[k];
        delete safe[k];
      }
    }
    window.gtag?.('event', event, safe);
    sendAmplitude(event, safe); // ส่งชุดเดียวกันเข้า Amplitude (no-op ถ้าไม่ตั้ง VITE_AMPLITUDE_KEY)
  } catch { /* ห้ามทำ UX พัง เพราะ analytics */ }
}
