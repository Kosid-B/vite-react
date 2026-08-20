/* utmForward — พา utm ข้ามจาก "หน้าที่ server เรนเดอร์" ไปถึง /start (pure + สคริปต์ฝังหน้า)
 *
 * 🔴 ปัญหาจริงที่แก้ (ตรวจฐานข้อมูล production 20 ส.ค. 2569):
 *   landing_funnel มี 75 แถว — มี utm ติดมาแค่ **1 แถว**
 *   ทั้งที่ลิงก์สั้นทุกตัวติด utm ให้เรียบร้อยแล้วฝั่ง Worker (shortLinks.shortLinkTarget)
 *
 *   สาเหตุ: ลิงก์สั้นทุกตัวชี้ไป /blog/<slug> หรือ /calc ซึ่งเป็น **HTML ที่ server เรนเดอร์**
 *     — ไม่มี React ไม่มี useLandingTrace ⇒ ไม่มีแถวใน landing_funnel เลย
 *     แล้วปุ่ม CTA ในหน้าพวกนั้นเขียนว่า `origin + '/start'` **เปล่า ๆ**
 *     ⇒ พอกดเข้ามา utm หายหมด + referrer เป็นโดเมนตัวเอง ⇒ ถูกนับเป็น 'direct'
 *   ⇒ คนที่มาจากคอนเทนต์ของเราเอง ถูกบันทึกว่า "พิมพ์ URL เข้ามาเอง" มาตลอด
 *
 * ทำไมต้องทำฝั่ง browser ไม่ใช่ฝั่ง server:
 *   หน้าพวกนี้ถูก cache ที่ edge (`Cache-Control: public, max-age=3600`)
 *   ถ้าฝัง utm ของผู้เข้าชมคนหนึ่งลงใน HTML ⇒ คนถัดไปที่ได้ HTML จาก cache จะได้เครดิตของคนอื่น
 *   สคริปต์นี้จึงอ่าน utm จาก URL ของแต่ละคนตอนรันในเบราว์เซอร์ = cache ปลอดภัยเสมอ
 */

export interface Utm { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string }

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

/** เก็บ "ที่มาแรก" ไว้ข้ามหน้า — คนอ่านบทความ 2-3 หน้าก่อนกด CTA ต้องไม่เสียเครดิตต้นทาง */
export const UTM_FIRST_TOUCH_KEY = 'ceo_ai_utm_ft';
/** อายุของ first-touch (30 วัน) — เกินนี้ถือว่าเป็นการมาครั้งใหม่ ไม่ใช่ทริปเดิม */
export const UTM_FIRST_TOUCH_MS = 30 * 24 * 60 * 60 * 1000;

/** ยอมเฉพาะ a-z 0-9 - _ ยาวไม่เกิน 32 (กติกาเดียวกับ shortLinks.cleanTag / landingFunnel.utmFrom) */
export function cleanUtmValue(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase().slice(0, 32);
  return /^[a-z0-9_-]+$/.test(s) ? s : undefined;
}

/** อ่าน utm ที่ใช้ได้จาก query string (ทิ้งค่าที่ไม่ผ่านกติกา) */
export function pickUtm(search: string): Utm {
  const out: Utm = {};
  try {
    const q = new URLSearchParams(search);
    for (const k of UTM_KEYS) {
      const v = cleanUtmValue(q.get(k));
      if (v) out[k] = v;
    }
  } catch { /* query พัง = ไม่มี utm */ }
  return out;
}

/** utm → query string (ไม่มี '?' นำหน้า) · เรียงตาม UTM_KEYS เสมอเพื่อให้ผลลัพธ์คงที่ */
export function utmQuery(u: Utm): string {
  return UTM_KEYS.filter((k) => u[k]).map((k) => `${k}=${encodeURIComponent(u[k] as string)}`).join('&');
}

/** ต่อ utm เข้ากับ href — ไม่แตะ href ที่มี utm ของตัวเองอยู่แล้ว */
export function appendUtm(href: string, u: Utm): string {
  const qs = utmQuery(u);
  if (!qs) return href;
  if (href.includes('utm_')) return href;
  return href + (href.includes('?') ? '&' : '?') + qs;
}

/** แหล่งภายในของเราเอง — ห้ามเก็บเป็น first-touch ไม่งั้นหน้าของเราจะกลบที่มาจริง */
export const INTERNAL_SOURCE = 'site';

/**
 * รวม utm ให้ตอบสองคำถามที่ต่างกันคนละคำถาม
 *   • "ใครส่งเขามา"      → utm_source / utm_medium — **ที่มาแรก (first-touch) ชนะเสมอ**
 *   • "เขาอ่านอะไรอยู่ตอนกด" → utm_campaign / utm_content — **หน้าปัจจุบันชนะ**
 *
 * 🔴 ทำไมต้องแยก (เจอของจริง 20 ส.ค. 2569): ปุ่มในบทความเขียน utm ทับไว้ตายตัว
 *    `?utm_source=blog&utm_campaign=<slug>` ⇒ คนที่มาจาก Facebook พออ่านบทความแล้วกดปุ่ม
 *    จะกลายเป็น "มาจาก blog" ทันที · เครดิตของ Facebook หายไปที่ hop นั้นเอง
 *    ⇒ ถ้าให้หน้าปัจจุบันชนะทั้งหมด จะไม่มีวันรู้ว่าแพลตฟอร์มไหนได้ผล
 */
export function mergeUtm(cur: Utm, stored: Utm | null, fallbackCampaign?: string): Utm {
  const st = stored ?? {};
  const out: Utm = {};
  const source = st.utm_source ?? cur.utm_source ?? INTERNAL_SOURCE;
  const medium = st.utm_medium ?? cur.utm_medium ?? (source === INTERNAL_SOURCE ? 'internal' : undefined);
  const campaign = cur.utm_campaign ?? st.utm_campaign ?? cleanUtmValue(fallbackCampaign);
  const content = cur.utm_content ?? st.utm_content;
  if (source) out.utm_source = source;
  if (medium) out.utm_medium = medium;
  if (campaign) out.utm_campaign = campaign;
  if (content) out.utm_content = content;
  return out;
}

/** ควรจำที่มานี้ไว้เป็น first-touch ไหม — จำเฉพาะที่มา "จากนอกเว็บเรา" เท่านั้น */
export function shouldStoreFirstTouch(cur: Utm, stored: Utm | null): boolean {
  if (stored && Object.keys(stored).length) return false;
  return !!cur.utm_source && cur.utm_source !== INTERNAL_SOURCE;
}

/** first-touch ที่เก็บไว้ยังใช้ได้ไหม (null = หมดอายุ/ไม่มี/พัง) */
export function readFirstTouch(raw: string | null, now: number): Utm | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { t?: number; u?: Record<string, string> };
    if (!o || typeof o.t !== 'number' || now - o.t > UTM_FIRST_TOUCH_MS) return null;
    const out: Utm = {};
    for (const k of UTM_KEYS) {
      const v = cleanUtmValue(o.u?.[k]);
      if (v) out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  } catch { return null; }
}

/**
 * สคริปต์ที่ฝังในหน้า HTML ฝั่ง server (blog / calc / faq / …)
 *
 * หน้าที่: ① เก็บ first-touch ครั้งแรกที่เห็น utm  ② ต่อ utm เข้าไปในลิงก์ทุกอันที่ชี้ไป /start
 * ทำงานแบบเงียบสนิท (try/catch ครอบทั้งก้อน) — tracking ต้องไม่ทำหน้าเว็บพัง
 *
 * @param fallbackCampaign ชื่อหน้า/บทความนี้ ใช้เมื่อผู้เข้าชมไม่มี utm ติดมาเลย
 *        ⇒ ตอบได้ว่า "หน้าไหนของเราส่งคนไป /start" แทนที่จะเหมารวมเป็น direct
 */
/* ⚠️ ห้ามใช้คำว่า null/NaN เป็นข้อความในสคริปต์นี้ — calcPage.test.ts ตรวจว่า HTML ที่ส่งออก
 * ต้องไม่มีสองคำนี้ (กันค่าที่คำนวณพลาดโผล่ให้ผู้ใช้เห็น) ⇒ ใช้ 0 แทน null ในตัวแปรภายใน */
export function utmForwardScript(fallbackCampaign: string, siteOrigin = ''): string {
  const camp = cleanUtmValue(fallbackCampaign) ?? 'page';
  return `(function(){try{
var K=${JSON.stringify(UTM_FIRST_TOUCH_KEY)},MAXAGE=${UTM_FIRST_TOUCH_MS},SITE=${JSON.stringify(INTERNAL_SOURCE)},KEYS=${JSON.stringify(UTM_KEYS)};
var TARGETS=['/start','/calc','/checkup'],CAMP=${JSON.stringify(camp)},SITE_ORIGIN=${JSON.stringify(siteOrigin)};
var ok=/^[a-z0-9_-]{1,32}$/;
function clean(v){if(!v)return'';v=String(v).trim().toLowerCase().slice(0,32);return ok.test(v)?v:'';}
var q=new URLSearchParams(location.search),cur={},n=0;
// ⚠️ ชื่อคีย์ที่เก็บต้องตรงกับ readFirstTouch() ฝั่ง TypeScript เป๊ะ ๆ
// (เคยพลาด: สคริปต์เก็บ {s,m,c,t} แต่ฝั่งแอปอ่าน {utm_source,…} ⇒ first-touch สูญทั้งหมดแบบเงียบ)
for(var i=0;i<KEYS.length;i++){var v=clean(q.get(KEYS[i]));if(v){cur[KEYS[i]]=v;n++;}}
var st=0;try{var raw=localStorage.getItem(K);if(raw){var o=JSON.parse(raw);if(o&&typeof o.t==='number'&&Date.now()-o.t<=MAXAGE&&o.u)st=o.u;}}catch(e){}
if(!st&&cur.utm_source&&cur.utm_source!==SITE){st=cur;
  try{localStorage.setItem(K,JSON.stringify({t:Date.now(),u:cur}));}catch(e){}}
st=st||{};
var src=st.utm_source||cur.utm_source||SITE;
var med=st.utm_medium||cur.utm_medium||(src===SITE?'internal':'');
var camp=cur.utm_campaign||st.utm_campaign||CAMP;
var cont=cur.utm_content||st.utm_content||'';
var a=document.querySelectorAll('a[href]');
for(var k=0;k<a.length;k++){
  var h=a[k].getAttribute('href')||'';var U;
  try{U=new URL(h,location.href);}catch(e){continue;}
  // ยอมทั้ง origin ที่กำลังเปิดอยู่ และ origin จริงของเว็บ (ปุ่มในหน้าเขียนเป็น URL เต็มเสมอ
  // ⇒ ตอนทดสอบบน localhost/preview origin จะไม่ตรงกัน แต่ยังต้องพิสูจน์ได้ว่าโค้ดทำงาน)
  if(U.origin!==location.origin&&U.origin!==SITE_ORIGIN)continue;
  var hit=0;for(var j=0;j<TARGETS.length;j++){if(U.pathname===TARGETS[j]||U.pathname.indexOf(TARGETS[j]+'/')===0)hit=1;}
  if(!hit)continue;
  // "ใครส่งมา" ทับได้เสมอ · "อ่านอะไรอยู่" เคารพค่าที่ปุ่มเขียนไว้ก่อน
  if(src)U.searchParams.set('utm_source',src);
  if(med)U.searchParams.set('utm_medium',med);
  if(camp&&!U.searchParams.get('utm_campaign'))U.searchParams.set('utm_campaign',camp);
  if(cont&&!U.searchParams.get('utm_content'))U.searchParams.set('utm_content',cont);
  a[k].setAttribute('href',U.toString());
}
}catch(e){}})();`;
}
