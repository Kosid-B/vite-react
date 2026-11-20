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
/** ปลายทางเดียวที่รีโปนี้คุยกับ Marketing OS ได้ — edge function ของเขา (ไม่ใช่ตาราง ไม่ใช่ rpc)
 *  🔒 ชื่อนี้ต้องอยู่ที่นี่ที่เดียวทั้งรีโป (`ownershipBoundary.test.ts` บังคับ) */
const OS_FN = 'marketing-track';

export const OS_SAFE_EVENTS = [
  'page_view', 'landing_view', 'content_view', 'cta_view', 'cta_click',
  'calculator_start', 'calculator_complete', 'assessment_start', 'assessment_complete',
  'signup_start',
] as const;
export type OsEvent = (typeof OS_SAFE_EVENTS)[number];

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

/** คีย์ที่ห้ามส่งออกเด็ดขาด (ชุดเดียวกับที่ฝั่งเขากัน — เรากันซ้ำที่ต้นทาง) */
const SENSITIVE_KEY =
  /(^|_)(email|phone|mobile|tel|password|passport|national_id|id_card|address|full_name|firstname|lastname|first_name|last_name|name)($|_)/i;

/** ความยาวสูงสุดของค่าที่ยอมส่ง — ยาวกว่านี้คือข้อความอิสระ ไม่ใช่ป้ายหมวด */
export const MAX_VALUE_LEN = 120;

export interface OsEventInput {
  event: OsEvent;
  /** id นิรนามตัวเดียวกับ `landing_funnel.session` ⇒ ข้อมูลสองฝั่ง join กันได้ */
  session: string;
  seg?: string;
  pagePath?: string;
  referrer?: string;
  utm?: Readonly<Record<string, string | undefined>>;
  props?: Readonly<Record<string, string | number>>;
}

export interface OsEventPayload {
  eventName: OsEvent;
  anonymousId: string;
  sessionId: string;
  segmentCode?: string;
  pagePath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  properties: Record<string, string | number | boolean>;
}

/** คัด property ให้ปลอดภัย: ตัดคีย์ PII · ตัดความยาว · ทิ้งค่าว่าง
 *  🔴 ไม่ "ปิดบัง" แต่ **ไม่ส่งเลย** — ค่าที่ถูกปิดบังยังบอกได้ว่ามีอยู่ */
export function safeProps(
  props: Readonly<Record<string, string | number>> = {},
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (typeof v === 'number') { if (Number.isFinite(v)) out[k.slice(0, 60)] = v; continue; }
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t || t.length > MAX_VALUE_LEN) continue;   // ยาวเกิน = ข้อความอิสระ ⇒ ไม่ส่ง
    out[k.slice(0, 60)] = t;
  }
  return out;
}

/** GA event → OS event (null = ไม่ได้แมปไว้ ⇒ ไม่ส่ง) */
export function osEventFor(gaEvent: string): OsEvent | null {
  return EVENT_MAP[gaEvent] ?? null;
}

/** สร้าง payload ตามรูปแบบที่ `marketing-track` รับ
 *  ⚠️ ไม่ส่งฟิลด์ UUID (campaignId/contentItemId/experimentId/variantId/audienceSegmentId) เลย
 *     เพราะเรา **ไม่มีค่าจริง** และฟังก์ชันจะคืน `invalid_uuid` ถ้าส่งค่าที่ไม่ใช่ UUID */
export function buildOsEvent(input: OsEventInput): OsEventPayload {
  const u = input.utm ?? {};
  const payload: OsEventPayload = {
    eventName: input.event,
    anonymousId: input.session,
    sessionId: input.session,
    properties: safeProps(input.props),
  };
  /** ใส่เฉพาะช่องที่มีค่า — ค่าว่างต้อง **ไม่มีคีย์** ไม่ใช่คีย์ที่มีค่าว่าง
   *  (เลี่ยง cast เป็น Record<string,unknown> โดยตั้งใจ: index signature จะทำให้พิมพ์คีย์ผิดก็ผ่าน
   *   ซึ่งขัดกับเหตุผลที่ล็อกชุดฟิลด์ไว้ตั้งแต่ต้น) */
  const opt = <K extends keyof OsEventPayload>(k: K, v: string | undefined): Partial<OsEventPayload> => {
    const t = (v ?? '').trim();
    return t ? ({ [k]: t.slice(0, 1024) } as Partial<OsEventPayload>) : {};
  };
  return {
    ...payload,
    ...opt('segmentCode', input.seg),
    ...opt('pagePath', input.pagePath),
    ...opt('referrer', input.referrer),
    ...opt('utmSource', u.utm_source),
    ...opt('utmMedium', u.utm_medium),
    ...opt('utmCampaign', u.utm_campaign),
    ...opt('utmContent', u.utm_content),
  };
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

    const body = buildOsEvent({
      event,
      session: funnel.currentFunnelSession(),
      seg: new URLSearchParams(window.location.search).get('seg') ?? undefined,
      pagePath: window.location.pathname,
      referrer: document.referrer,
      utm: utm.pickUtm(window.location.search) as Record<string, string | undefined>,
      props,
    });

    await fetch(`${base.replace(/\/$/, '')}/functions/v1/${OS_FN}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,   // ยังส่งต่อแม้ผู้ใช้กดออกจากหน้า
    });
  } catch { /* เงียบ */ }
}
