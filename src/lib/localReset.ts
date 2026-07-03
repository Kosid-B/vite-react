/** R9 — ล้างข้อมูลแอปทั้งหมดใน localStorage
 *  ใช้ตอนลบ workspace (production — กันข้อมูลเก่าค้างข้ามบริษัท)
 *  และ "ล้างข้อมูลเริ่มใหม่" ใน local mode */

const APP_KEYS = [
  'cjux2',                // AppData หลัก
  'ceo_ai_seen',          // ผ่าน landing แล้ว
  'ceo_ai_storefront',
  'ceo_ai_rfqs',
  'ceo_ai_orders',
  'ceo_ai_auctions',
  'ceo_ai_bids',
  'ceo_ai_journey_start',
  'ceo_ai_usage',
  'ceo_ai_shop_apps',
  'ceo_ai_leads',
];

export function clearLocalAppData() {
  for (const k of APP_KEYS) {
    try { localStorage.removeItem(k); } catch { /* quota/private mode */ }
  }
}
