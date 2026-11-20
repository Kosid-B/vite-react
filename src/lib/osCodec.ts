/* ══════════════════════════════════════════════════════════════════════════
 * osCodec.ts — **ชั้นแปลง** ของสายท่อข้อมูล (แปลง → ห่อ → เก็บ → ส่ง · 20 พ.ย. 2569)
 *
 * หน้าที่เดียว: แปลงเหตุการณ์ในแอปเรา ⇄ รูปแบบสายส่งของ Marketing OS
 *   encode: สิ่งที่เกิดขึ้นในแอป → payload ที่ `marketing-track` รับ
 *   decode: payload (เช่นที่ค้างอยู่ใน outbox) → กลับเป็นชนิดที่ตรวจแล้ว
 *
 * 🔴 ทำไมต้องมี decode ไม่ใช่แค่ encode:
 *    payload ที่ค้างในเครื่องผู้ใช้ **ถูกสร้างด้วยโค้ดเวอร์ชันก่อน** และถูกส่งด้วยโค้ดเวอร์ชันนี้
 *    ⇒ "สิ่งที่เราเขียนลงไป" กับ "สิ่งที่เราอ่านขึ้นมา" ไม่ใช่เรื่องเดียวกัน
 *    ⇒ ของที่อ่านขึ้นมาต้องผ่าน `wireIssues()` ก่อนส่งทุกครั้ง · ไม่ใช่เชื่อเพราะเราเขียนเอง
 *
 * 🔒 ไฟล์นี้ pure ทั้งไฟล์ (ไม่มี fetch · ไม่มี storage · ไม่มี import ของระบบอื่น)
 *    ⇒ ทดสอบได้ครบทุกทางโดยไม่ต้องมีเน็ต · และ `marketingOs.ts` เป็นฝ่ายเรียกใช้เสมอ (ทางเดียว ไม่วน)
 *
 * ⚠️ กฎ PII อยู่ที่นี่แล้ว (ย้ายมาจาก `marketingOs.ts`) — เทสต์ตามมาด้วย
 *    เหตุผล: การกัน PII คือ **การแปลง** ไม่ใช่ **การส่ง** · วางไว้ที่ชั้นส่ง = เลี่ยงได้ด้วยการส่งทางอื่น
 * ══════════════════════════════════════════════════════════════════════════ */

/** 10 event ที่ `marketing-track` ยอมรับ (ตรงกับ `SAFE_BROWSER_EVENTS` ในตัวฟังก์ชัน)
 *  ส่งชื่อนอกรายการนี้ = ฟังก์ชันคืน 400 `event_not_allowed` */
export const OS_SAFE_EVENTS = [
  'page_view', 'landing_view', 'content_view', 'cta_view', 'cta_click',
  'calculator_start', 'calculator_complete', 'assessment_start', 'assessment_complete',
  'signup_start',
] as const;
export type OsEvent = (typeof OS_SAFE_EVENTS)[number];

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

/** สร้าง payload ตามรูปแบบที่ `marketing-track` รับ
 *  ⚠️ ไม่ส่งฟิลด์ UUID (campaignId/contentItemId/experimentId/variantId/audienceSegmentId) เลย
 *     เพราะเรา **ไม่มีค่าจริง** และฟังก์ชันจะคืน `invalid_uuid` ถ้าส่งค่าที่ไม่ใช่ UUID */
export function encodeOsEvent(input: OsEventInput): OsEventPayload {
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

/* ── decode: จากสายส่งกลับเป็นชนิดที่ตรวจแล้ว ─────────────────────────────── */

/** ฟิลด์ UUID ที่ฝั่งเขารับ แต่ **เราไม่มีค่าจริง** ⇒ ส่งไปจะได้ `invalid_uuid`
 *  เก็บเป็นรายการเพื่อให้ `wireIssues()` จับได้ถ้าวันหน้ามีใครเผลอใส่ */
export const UUID_FIELDS = [
  'campaignId', 'contentItemId', 'experimentId', 'variantId', 'audienceSegmentId',
] as const;

/** เหตุผลที่ payload นี้จะถูกปลายทางปฏิเสธ — คืน [] = ส่งได้
 *  🔴 ตรวจ **ก่อน** ใช้เน็ต: payload ที่ค้างในเครื่องมาจากโค้ดเวอร์ชันก่อน เชื่อไม่ได้ */
export function wireIssues(v: unknown): string[] {
  const issues: string[] = [];
  if (typeof v !== 'object' || v === null) return ['ไม่ใช่อ็อบเจกต์'];
  const o = v as Record<string, unknown>;

  if (!OS_SAFE_EVENTS.includes(o.eventName as OsEvent)) {
    issues.push(`eventName ไม่อยู่ในรายการที่ปลายทางรับ: ${String(o.eventName)}`);
  }
  for (const k of ['anonymousId', 'sessionId'] as const) {
    if (typeof o[k] !== 'string' || !(o[k] as string).trim()) issues.push(`${k} ว่าง`);
  }
  for (const k of UUID_FIELDS) {
    if (o[k] !== undefined) issues.push(`${k} ต้องไม่ถูกส่ง (เราไม่มี UUID จริงของเขา)`);
  }
  const props = o.properties;
  if (props !== undefined) {
    if (typeof props !== 'object' || props === null) issues.push('properties ไม่ใช่อ็อบเจกต์');
    else {
      for (const [k, pv] of Object.entries(props as Record<string, unknown>)) {
        if (SENSITIVE_KEY.test(k)) issues.push(`properties.${k} เข้าข่าย PII`);
        if (typeof pv === 'string' && pv.length > MAX_VALUE_LEN) issues.push(`properties.${k} ยาวเกินเพดาน`);
      }
    }
  }
  return issues;
}

/** payload ที่ตรวจแล้ว · คืน null = ใช้ไม่ได้ (ทิ้ง ไม่ใช่ "ลองส่งดู")
 *  🔴 ต้องเป็นวงกลม: `decodeOsEvent(encodeOsEvent(x))` ต้องได้ของเดิมเป๊ะ (เทสต์บังคับ) */
export function decodeOsEvent(v: unknown): OsEventPayload | null {
  return wireIssues(v).length === 0 ? (v as OsEventPayload) : null;
}
