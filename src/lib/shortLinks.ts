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
  '/pc':       { path: '/blog/ai-era-hardware-cost',      campaign: 'hardware_cost' },
  '/คอม':      { path: '/blog/ai-era-hardware-cost',      campaign: 'hardware_cost' },
  '/aifind':   { path: '/blog/why-ai-doesnt-recommend-you', campaign: 'ai_discovery' },
  '/ค้นเจอ':    { path: '/blog/why-ai-doesnt-recommend-you', campaign: 'ai_discovery' },
  '/palm':     { path: '/blog/palm-price-what-you-control', campaign: 'palm_price' },
  '/ปาล์ม':    { path: '/blog/palm-price-what-you-control', campaign: 'palm_price' },
  '/system':   { path: '/blog/ai-system-not-assistant',   campaign: 'ai_system' },
  '/ระบบ':     { path: '/blog/ai-system-not-assistant',   campaign: 'ai_system' },
  '/check':    { path: '/checkup',                        campaign: 'checkup' },
  '/ตรวจ':     { path: '/checkup',                        campaign: 'checkup' },
  '/ai':       { path: '/start',                          campaign: 'try_ai' },
};

/** แหล่งที่มาต่อแพลตฟอร์ม — ต่อท้ายลิงก์สั้นด้วย `?s=<คีย์>` เช่น `/price?s=yt`
 *
 *  ทำไมต้องมี: เดิม shortLinkTarget เขียน utm_source=social ทับเสมอ
 *    → ในรายงานแยกไม่ออกว่าคนมาจาก YouTube, TikTok หรือ Facebook (รวมเป็นก้อนเดียว)
 *  ตอนนี้ลิงก์สั้นตัวเดียวใช้ได้ทุกแพลตฟอร์ม แค่เปลี่ยนตัวย่อท้าย = แยกที่มาได้จริง */
export const SOURCE_PRESETS: Record<string, { source: string; medium: string }> = {
  yt:   { source: 'youtube',   medium: 'shorts' },
  ytv:  { source: 'youtube',   medium: 'video' },
  tt:   { source: 'tiktok',    medium: 'bio' },
  fb:   { source: 'facebook',  medium: 'social' },
  ig:   { source: 'instagram', medium: 'story' },
  line: { source: 'line',      medium: 'message' },
  li:   { source: 'linkedin',  medium: 'social' },
  qr:   { source: 'offline',   medium: 'qr' },
};

const DEFAULT_SOURCE = { source: 'social', medium: 'organic' };

/** ยอมเฉพาะ a-z 0-9 - _ ยาวไม่เกิน 32 — กันค่าขยะ/อักขระแปลกหลุดเข้ารายงาน */
function cleanTag(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase().slice(0, 32);
  return /^[a-z0-9_-]+$/.test(s) ? s : null;
}

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

/** ประกอบ URL ปลายทางพร้อม utm — ให้ Worker redirect ไปตรง ๆ
 *
 *  @param search query string ที่ติดมากับลิงก์สั้น (เช่น `?s=yt&c=1a`) — ใส่ url.search ได้เลย
 *
 *  ลำดับความสำคัญของ utm_source/medium:
 *    1. utm_source / utm_medium ที่ผู้ใช้ติดมาเอง (เขียนเต็ม ๆ ก็ยังใช้ได้)
 *    2. `s=<คีย์>` จาก SOURCE_PRESETS  ← ทางที่แนะนำ (สั้น จำง่าย)
 *    3. ค่าเริ่มต้น social / organic
 *  `c=<ตัวย่อ>` (หรือ utm_content) = แยกคลิป/ชิ้นงานย่อยในแคมเปญเดียวกัน เช่น `c=1a` */
export function shortLinkTarget(link: ShortLink, origin: string, search = ''): string {
  const to = new URL(link.path, origin);

  let q: URLSearchParams;
  try { q = new URLSearchParams(search); } catch { q = new URLSearchParams(); }

  const preset = SOURCE_PRESETS[cleanTag(q.get('s')) ?? ''] ?? DEFAULT_SOURCE;
  const source = cleanTag(q.get('utm_source')) ?? preset.source;
  const medium = cleanTag(q.get('utm_medium')) ?? preset.medium;
  const content = cleanTag(q.get('c')) ?? cleanTag(q.get('utm_content'));

  to.searchParams.set('utm_source', source);
  to.searchParams.set('utm_medium', medium);
  to.searchParams.set('utm_campaign', cleanTag(q.get('utm_campaign')) ?? link.campaign);
  if (content) to.searchParams.set('utm_content', content);
  return to.toString();
}
