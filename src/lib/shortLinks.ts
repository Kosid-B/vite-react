/* shortLinks — ลิงก์สั้นสำหรับสื่อโซเชียล (pure/tested · ใช้ใน Worker)
 *
 * ทำไมต้องมี: ในภาพโฆษณา (Story/Reels/TikTok) "ปุ่มกดไม่ได้" — มันเป็นแค่ภาพ
 *   คนที่สนใจจึง "พิมพ์ตามที่เห็น" ไม่ใช่กด
 *   URL จึงต้องสั้นพอจะจำได้จากการเห็นครั้งเดียว และพิมพ์ผิดยาก
 *   (`ceoaithailand.org/sms` จำได้ · `ceoaithailand.org/blog/sim-update-scam-check` พิมพ์ไม่ไหว)
 *
 * ติด utm ให้เองฝั่ง server → วัดผลได้โดยที่ผู้ใช้ไม่ต้องพิมพ์ query string
 */

export interface ShortLink {
  /** ปลายทางจริงบนเว็บเรา (ขึ้นต้นด้วย /) */
  path: string;
  /** ใช้เป็น utm_campaign เพื่อแยกว่ามาจากคอนเทนต์ชิ้นไหน */
  campaign: string;
}

/** เพิ่มลิงก์ใหม่ = เพิ่มบรรทัดเดียวที่นี่ · คีย์ต้องขึ้นต้น '/' และเป็นตัวพิมพ์เล็ก
 *  ใส่ทั้งไทยและอังกฤษให้ตัวเดียวกัน เพราะคนพิมพ์ไม่เหมือนกัน (คีย์บอร์ดไทย/อังกฤษ) */
export const SHORT_LINKS: Record<string, ShortLink> = {
  '/sms':      { path: '/blog/sim-update-scam-check',    campaign: 'sim_scam' },
  '/ซิม':      { path: '/blog/sim-update-scam-check',    campaign: 'sim_scam' },
  '/tun':      { path: '/blog/start-business-no-capital', campaign: 'no_capital' },
  '/ทุน':      { path: '/blog/start-business-no-capital', campaign: 'no_capital' },
  '/price':    { path: '/blog/pricing-no-loss',           campaign: 'pricing' },
  '/ราคา':     { path: '/blog/pricing-no-loss',           campaign: 'pricing' },
  '/customer': { path: '/blog/first-customers-no-ads',    campaign: 'first_customers' },
  '/ลูกค้า':    { path: '/blog/first-customers-no-ads',    campaign: 'first_customers' },
  '/plan':     { path: '/blog/business-plan-fast',        campaign: 'business_plan' },
  '/แผน':      { path: '/blog/business-plan-fast',        campaign: 'business_plan' },
  '/ai':       { path: '/start',                          campaign: 'try_ai' },
};

/** หาลิงก์สั้นจาก pathname ที่มาจาก URL จริง
 *  รองรับ: percent-encoding (path ไทยถูก encode เสมอ), ตัวพิมพ์ใหญ่, slash ท้าย
 *  คืน null ถ้าไม่ใช่ลิงก์สั้น (ให้ router เดินต่อไปทางปกติ) */
export function resolveShortLink(pathname: string): ShortLink | null {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* encoding พัง → ใช้ค่าดิบ */ }
  p = p.replace(/\/+$/, '').toLowerCase();
  if (p === '') return null;
  return SHORT_LINKS[p] ?? null;
}

/** ประกอบ URL ปลายทางพร้อม utm — ให้ Worker redirect ไปตรง ๆ */
export function shortLinkTarget(link: ShortLink, origin: string): string {
  const to = new URL(link.path, origin);
  to.searchParams.set('utm_source', 'social');
  to.searchParams.set('utm_medium', 'organic');
  to.searchParams.set('utm_campaign', link.campaign);
  return to.toString();
}
