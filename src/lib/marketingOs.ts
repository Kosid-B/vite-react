/* ══════════════════════════════════════════════════════════════════════════
 * marketingOs.ts — สะพาน "ให้ Marketing OS มองเห็นสิ่งที่เกิดบนเว็บเรา" (ท่า A · 20 พ.ย. 2569)
 *
 * 🔴 ทำไมต้องมี (วัดสดจาก production 20 พ.ย. 2569):
 *    `marketing_measurement_health_live` = { score: 0 · reliability: "unreliable"
 *      · event_count: 0 · latest_event_at: null · utm_coverage: 0 }
 *    และ `marketing_measurement_config.block_strategic_recommendations_below_score = true`
 *    (caution ≥ 70 · reliable ≥ 90)
 *    ⇒ **OS ปฏิเสธการให้คำแนะนำกลยุทธ์เองที่ score 0** — กฎของระบบนั้น ไม่ใช่กฎเรา
 *    สาเหตุรากข้อเดียว: edge function `marketing-track` live มาตั้งแต่ 23 ส.ค. 2569
 *    แต่ **ไม่มีโค้ดฝั่งเราเรียกมันเลย** (grep ทั้ง src/ = 0 จุด) ⇒ ท่อเปิดค้างไว้ ~3 เดือน
 *
 * 🧱 เส้นแบ่งความเป็นเจ้าของ — **เจ้าของอนุมัติให้ข้าม 20 พ.ย. 2569** ("ลุย A ต่อ B")
 *    ที่อนุญาต: **ส่ง event ผ่าน edge function `marketing-track` เท่านั้น**
 *    ที่ยังห้ามเหมือนเดิม: `.from('marketing_…')` · `rpc('marketing_…')` · migration `marketing_*`
 *    ⇒ เราไม่แตะตาราง/สคีมาของเขา · เขาเป็นเจ้าของการตีความและเก็บข้อมูลเหมือนเดิม
 *    กลไก: `ownershipBoundary.test.ts` + `marketingOs.test.ts`
 *
 * 🔒 กฎความปลอดภัยของไฟล์นี้ (มีเทสต์บังคับ):
 *    ❌ ห้ามส่งข้อความอิสระที่ผู้ใช้พิมพ์ (ชื่อสินค้า/ชื่อร้าน) — มีโอกาสมีเบอร์/ชื่อคน
 *    ❌ ห้ามส่งคีย์ที่เข้าข่าย PII  ✅ ตัดความยาวเสมอ  ✅ เงียบเสมอ (ห้ามทำ UX พัง)
 *    ⚠️ ฝั่งเขาก็กัน PII อยู่ — แต่เรากันซ้ำ เพราะ **ด่านที่เราควบคุมไม่ได้ ไม่นับเป็นด่านของเรา**
 * ══════════════════════════════════════════════════════════════════════════ */

/** 10 event ที่ `marketing-track` ยอมรับ (ตรงกับ `SAFE_BROWSER_EVENTS` ในตัวฟังก์ชัน)
 *  ส่งชื่อนอกรายการนี้ = ฟังก์ชันคืน 400 `event_not_allowed` */
import { encodeOsEvent, wireIssues, type OsEvent, type OsEventPayload } from './osCodec';
import { ack, browserStore, enqueue, loadOutbox, saveOutbox } from './osOutbox';

/** ปลายทางเดียวที่รีโปนี้คุยกับ Marketing OS ได้ — edge function ของเขา (ไม่ใช่ตาราง ไม่ใช่ rpc)
 *  🔒 ชื่อนี้ต้องอยู่ที่นี่ที่เดียวทั้งรีโป (`ownershipBoundary.test.ts` บังคับ) */
const OS_FN = 'marketing-track';

/** 7 event ขั้น `business` ที่ OS นิยามไว้ใน `marketing_event_definitions` แต่ **ส่งทางเบราว์เซอร์ไม่ได้**
 *  (ถูกต้องแล้ว — เบราว์เซอร์อ้าง "ซื้อสำเร็จ" เองไม่ได้) ⇒ ต้องมีสายฝั่งเซิร์ฟเวอร์ = **ท่า B** */
export const OS_BUSINESS_EVENTS = [
  'trial_started', 'signup_complete', 'subscription_started',
  'purchase_completed', 'lead_created', 'content_published', 'tracking_error',
] as const;

/** GA event ของเรา → OS event · **แมปเฉพาะที่ความหมายตรงกันจริง** ห้ามเดา
 *  (ชื่อ GA ฝั่งซ้ายต้องมีอยู่จริงในโค้ด — เทสต์บังคับ) */
export const EVENT_MAP: Readonly<Record<string, OsEvent>> = Object.freeze({
  landing_cta_click: 'cta_click',
  quickcheck_started: 'calculator_start',
  quickcheck_submitted: 'calculator_complete',
  quickcheck_signup_click: 'signup_start',
});

/** event ที่ส่ง **ตรง** ไม่ผ่าน EVENT_MAP (เพราะไม่มี GA event คู่กัน)
 *  ⇒ ต้องประกาศไว้ ไม่งั้นด่าน "safe event ทุกตัวต้องถูกส่งหรือมีเหตุผล" จะอ่านว่าเงียบหายไป */
export const SENT_DIRECT: Readonly<Record<string, string>> = Object.freeze({
  landing_view: 'ส่งจาก useLandingTrace ตอนเริ่ม session (once) — ไม่มี GA event คู่กัน',
});

/** event ของ OS ที่ **ยังไม่ได้ส่ง** พร้อมเหตุผล — ห้ามปล่อยว่างไว้เฉย ๆ ให้คนเดา */
export const NOT_SENT_YET: Readonly<Record<string, string>> = Object.freeze({
  page_view: 'หน้าอื่นนอก Landing ยังไม่ได้ต่อ — Landing ส่ง landing_view อยู่แล้ว',
  content_view: 'บทความเป็น HTML ที่ Worker เรนเดอร์ ไม่มี React ⇒ ต้องต่อฝั่ง Worker (คนละงาน)',
  cta_view: 'ต้องมี IntersectionObserver ที่ปุ่ม CTA โดยเฉพาะ — ของเดิมวัดเป็น "ส่วนของหน้า" ไม่ใช่ปุ่ม',
  assessment_start: 'เครื่องประเมินตลาดยังไม่มี event เริ่ม/จบแยกกัน',
  assessment_complete: 'เหตุผลเดียวกับ assessment_start',
});

/** GA event → OS event (null = ไม่ได้แมปไว้ ⇒ ไม่ส่ง) */
export function osEventFor(gaEvent: string): OsEvent | null {
  return EVENT_MAP[gaEvent] ?? null;
}

// ── ส่งจริง (impure) ────────────────────────────────────────────────────────

/** กันยิงซ้ำ event เดิมในหน้าเดียว (landing_view / calculator_start เกิดได้ครั้งเดียว) */
const onceSent = new Set<string>();

/**
 * ส่ง event ไป Marketing OS — **เงียบเสมอ · ไม่บล็อก UI · ไม่มีวันโยน error**
 * ข้าม (no-op) เมื่อ: ไม่มี VITE_SUPABASE_URL (local/preview) · ปิดด้วย flag · event ไม่ได้แมป
 * @param once true = ส่งครั้งเดียวต่อการโหลดหน้า
 */
export function sendOsEvent(
  event: OsEvent,
  props?: Readonly<Record<string, string | number>>,
  once = false,
): void {
  try {
    if (typeof window === 'undefined') return;
    if (once) { if (onceSent.has(event)) return; onceSent.add(event); }
    void deliver(event, props);
  } catch { /* ห้ามทำ UX พัง เพราะ analytics */ }
}

async function deliver(
  event: OsEvent,
  props?: Readonly<Record<string, string | number>>,
): Promise<void> {
  try {
    const [{ MARKETING_OS }, { isSupabaseEnabled }, funnel, utm] = await Promise.all([
      import('../config'),
      import('./supabase'),
      import('./landingFunnel'),
      import('./utmForward'),
    ]);
    if (!MARKETING_OS.live || !isSupabaseEnabled) return;   // local/preview → ไม่ปล่อยข้อมูลทดสอบขึ้น production
    const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!base) return;

    const body = encodeOsEvent({
      event,
      session: funnel.currentFunnelSession(),
      seg: new URLSearchParams(window.location.search).get('seg') ?? undefined,
      pagePath: window.location.pathname,
      referrer: document.referrer,
      utm: utm.pickUtm(window.location.search) as Record<string, string | undefined>,
      props,
    });

    /* 🔴 ตรวจก่อนใช้เน็ตเสมอ — payload ที่ `wireIssues()` ไม่ผ่านคือของที่ปลายทางจะปฏิเสธอยู่ดี
     *    ยิงไปก็เสียทั้งเวลาเราและโควตาเขา · และทำให้ log ฝั่งเขาสกปรกโดยไม่มีประโยชน์ */
    if (wireIssues(body).length > 0) return;

    const endpoint = `${base.replace(/\/$/, '')}/functions/v1/${OS_FN}`;

    // ส่งของค้างจากครั้งก่อนให้หมดก่อน (ครั้งเดียวต่อการโหลดหน้า) — เรียงตามเวลาที่เกิดจริง
    await flushPending(endpoint);

    if (!(await postOne(endpoint, body))) queueFailed(body);
  } catch { /* เงียบ */ }
}

/** ยิง 1 event · คืน false เมื่อ "ยังไม่ถึงปลายทาง" (เน็ตหลุด · 5xx · ถูกปฏิเสธ)
 *  🔴 4xx ก็คืน false เหมือนกัน **แต่ผู้เรียกไม่ควรเก็บไว้ส่งซ้ำ** เพราะส่งอีกก็ถูกปฏิเสธเหมือนเดิม
 *     ⇒ `queueFailed` จึงกรองด้วย `wireIssues` อีกชั้น (ของที่เรารู้ว่าผิดเอง ไม่เข้าคิว) */
async function postOne(endpoint: string, body: OsEventPayload): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,   // ยังส่งต่อแม้ผู้ใช้กดออกจากหน้า
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** เก็บของที่ส่งไม่ถึงไว้ในเครื่องผู้ใช้ — กู้ได้รอบหน้า (ไม่ใช่ parity · ดู osOutbox.ts) */
function queueFailed(body: OsEventPayload): void {
  const store = browserStore();
  if (!store) return;            // โหมดส่วนตัว/ปิด storage ⇒ หายจริง และเรารู้ว่าหาย
  saveOutbox(store, enqueue(loadOutbox(store), body));
}

let flushedThisLoad = false;

/** ส่งของค้างทั้งหมด · ตัวที่ส่งถึงแล้วตัดออกจากคิว ตัวที่ยังไม่ถึงคงอยู่รอรอบหน้า
 *  🔴 หยุดทันทีที่ตัวแรกไม่ผ่าน — เน็ตหลุดแล้วยิงต่ออีก 99 ครั้งคือการเปลืองแบตของผู้ใช้ */
async function flushPending(endpoint: string): Promise<void> {
  if (flushedThisLoad) return;
  flushedThisLoad = true;
  const store = browserStore();
  if (!store) return;
  let state = loadOutbox(store);
  if (state.pending.length === 0) { saveOutbox(store, state); return; }

  let sent = 0;
  for (const ev of state.pending) {
    if (!(await postOne(endpoint, ev))) break;
    sent += 1;
  }
  state = ack(state, sent);
  saveOutbox(store, state);
}
