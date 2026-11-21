/* ══════════════════════════════════════════════════════════════════════════
 * eventFormat.ts — **CEF: Common Event Format** · รูปแบบ event กลางของระบบ (20 พ.ย. 2569)
 *
 * ชั้นนี้อยู่ **เหนือ** `osCodec` หนึ่งชั้น:
 *   เหตุการณ์ในแอป → **CEF** (รูปแบบกลาง เป็นกลางต่อปลายทาง) → codec แปลงออกทีละปลายทาง
 *
 * 🔴 ปัญหาจริงที่ชั้นนี้แก้ — ไม่ใช่ความสวยงาม:
 *    วันนี้ตอบคำถามนี้ไม่ได้เลย: **"event ตัวนี้ไปถึงปลายทางไหนบ้าง"**
 *    วัดจริง 20 พ.ย. 2569: `track('…')` ที่ไม่ซ้ำกันใน `src/` (ไม่นับ `__tests__`) = **179 ตัว** · ปลายทาง 3 ทาง
 *    ⇒ ที่ผ่านมาต้องไปอ่านโค้ด 3 ที่แล้วประกอบในหัวเอง · ซึ่งเป็นรูปแบบเดียวกับที่ทำให้
 *      Amplitude ได้ 0 event มา ~3 เดือนโดยไม่มีใครรู้ (ledger #18)
 *
 * 🧮 **ไม่มีทะเบียน 182 แถวที่เขียนด้วยมือ โดยเจตนา**
 *    ทะเบียนที่คนต้องมาเติมเอง = ทะเบียนที่ล้าสมัยในสัปดาห์ที่สอง (บทเรียน ledger #85)
 *    ของจริงคือ `analytics.track()` ส่งเข้า GA + Amplitude **ทุกตัวเสมอ** และเข้า OS
 *    **เฉพาะที่แมปไว้** ⇒ `sinksFor()` จึง **คำนวณจากโค้ดจริง** ไม่ใช่ประกาศไว้
 *
 * ⚠️ `landing_funnel` **ไม่ใช่ sink ของ event** — มันเป็นตารางสถานะ 1 แถว/ผู้เข้าชม
 *    เขียนด้วย `track_landing` rpc คนละทาง ⇒ ห้ามนับรวมเป็นปลายทางของ `track()`
 * ══════════════════════════════════════════════════════════════════════════ */
import { encodeOsEvent, type OsEvent, type OsEventPayload } from './osCodec';

/** เวอร์ชันรูปแบบ CEF — ขึ้นเลขเมื่อโครงเปลี่ยนจนอ่านของเก่าไม่ได้ */
export const CEF_VERSION = 1;

/** ที่มาของเหตุการณ์ — 🔴 สำคัญ เพราะ **เบราว์เซอร์อ้างความจริงเรื่องเงินไม่ได้**
 *  (`purchase_completed` จากฝั่ง browser = ใครก็ปลอมได้ ⇒ ADR-0007) */
export type CefSource = 'browser' | 'server';

/** ปลายทางที่ `track()` ส่งถึงจริง — ไม่ใช่รายการที่อยากให้มี */
export const CEF_SINKS = ['ga4', 'amplitude', 'marketing_os'] as const;
export type CefSink = (typeof CEF_SINKS)[number];

export interface CefContext {
  pagePath?: string;
  referrer?: string;
  /** รหัสกลุ่มเป้าหมายของ **เรา** (`owner`/`sidebiz`/…) — ฝั่ง OS ใช้คนละคำ แปลงตอนออก */
  seg?: string;
  utm?: Readonly<Record<string, string | undefined>>;
}

export interface CefRecord {
  schema: string;
  /** ชื่อใน **คำศัพท์ของเราเอง** ไม่ใช่ของปลายทางไหน (นั่นคือเหตุผลที่ต้องมีชั้นนี้) */
  name: string;
  occurredAt: string;
  source: CefSource;
  /** id นิรนามเดียวกับ `landing_funnel.session` — 🔴 ห้ามเป็น user id */
  session: string;
  context: CefContext;
  props: Record<string, string | number>;
}

export const CEF_SCHEMA = `cef/${CEF_VERSION}`;

/* ── คำศัพท์ของเรา ↔ คำศัพท์ของ Marketing OS ──────────────────────────────
 * 🔀 สองฝั่งใช้คนละคำโดยธรรมชาติ (ของเรา `quickcheck_*` · ของเขา `calculator_*`)
 *    ⇒ ตารางแปลงต้องอยู่ **ที่เดียว** ไม่ใช่กระจายตามจุดที่ยิง */

/** GA event ของเรา → OS event · **แมปเฉพาะที่ความหมายตรงกันจริง** ห้ามเดา
 *  (ชื่อฝั่งซ้ายต้องมี `track('…')` จริงในโค้ด — เทสต์บังคับ) */
export const EVENT_MAP: Readonly<Record<string, OsEvent>> = Object.freeze({
  landing_cta_click: 'cta_click',
  quickcheck_started: 'calculator_start',
  quickcheck_submitted: 'calculator_complete',
  quickcheck_signup_click: 'signup_start',
});

/** event ที่ส่ง **ตรง** ไม่ผ่าน EVENT_MAP (เพราะไม่มี GA event คู่กัน) */
export const SENT_DIRECT: Readonly<Record<string, string>> = Object.freeze({
  landing_view: 'ส่งจาก useLandingTrace ตอนเริ่ม session (once) — ไม่มี GA event คู่กัน',
});

/** event ของ OS ที่ **ยังไม่ได้ส่ง** พร้อมเหตุผล — ห้ามปล่อยว่างไว้ให้คนเดา */
export const NOT_SENT_YET: Readonly<Record<string, string>> = Object.freeze({
  page_view: 'หน้าอื่นนอก Landing ยังไม่ได้ต่อ — Landing ส่ง landing_view อยู่แล้ว',
  content_view: 'บทความเป็น HTML ที่ Worker เรนเดอร์ ไม่มี React ⇒ ต้องต่อฝั่ง Worker (คนละงาน)',
  cta_view: 'ต้องมี IntersectionObserver ที่ปุ่ม CTA โดยเฉพาะ — ของเดิมวัดเป็น "ส่วนของหน้า" ไม่ใช่ปุ่ม',
  assessment_start: 'เครื่องประเมินตลาดยังไม่มี event เริ่ม/จบแยกกัน',
  assessment_complete: 'เหตุผลเดียวกับ assessment_start',
});

/** ชื่อของเรา → ชื่อของ OS · null = ไม่ได้แมปไว้ ⇒ ไม่ส่งไป OS */
export function osEventFor(name: string): OsEvent | null {
  return EVENT_MAP[name] ?? (name in SENT_DIRECT ? (name as OsEvent) : null);
}

/** **ตอบคำถามที่ตอบไม่ได้มาตลอด**: event ชื่อนี้ไปถึงปลายทางไหนบ้าง
 *  🔴 คำนวณจากพฤติกรรมจริงของ `analytics.track()` ไม่ใช่จากรายการที่ประกาศไว้
 *     (GA + Amplitude ได้ทุกตัวเสมอ · OS ได้เฉพาะที่แมป) */
export function sinksFor(name: string): CefSink[] {
  const sinks: CefSink[] = ['ga4', 'amplitude'];
  if (osEventFor(name)) sinks.push('marketing_os');
  return sinks;
}

/* ── สร้าง / ตรวจ ───────────────────────────────────────────────────────── */

export interface CefInput {
  name: string;
  session: string;
  source?: CefSource;
  context?: CefContext;
  props?: Readonly<Record<string, string | number>>;
  now?: () => string;
}

export function toCef(input: CefInput): CefRecord {
  return {
    schema: CEF_SCHEMA,
    name: input.name,
    occurredAt: (input.now ?? (() => new Date().toISOString()))(),
    source: input.source ?? 'browser',
    session: input.session,
    context: { ...(input.context ?? {}) },
    props: { ...(input.props ?? {}) },
  };
}

/** เหตุผลที่เรกคอร์ดนี้ใช้ไม่ได้ — คืน [] = ใช้ได้
 *  ⚠️ ชั้นนี้ตรวจ **โครง** · การคัด PII เป็นงานของ `osCodec.safeProps` ตอนแปลงออก
 *     (แยกกันโดยเจตนา: CEF เป็นรูปแบบภายใน · กฎ PII ผูกกับ "ส่งออกไปที่ไหน") */
export function cefIssues(v: unknown): string[] {
  const issues: string[] = [];
  if (typeof v !== 'object' || v === null) return ['ไม่ใช่อ็อบเจกต์'];
  const o = v as Record<string, unknown>;
  if (o.schema !== CEF_SCHEMA) issues.push(`schema ไม่ตรง: ได้ ${String(o.schema)} ต้องการ ${CEF_SCHEMA}`);
  if (typeof o.name !== 'string' || !o.name.trim()) issues.push('name ว่าง');
  if (typeof o.session !== 'string' || !o.session.trim()) issues.push('session ว่าง');
  if (o.source !== 'browser' && o.source !== 'server') issues.push(`source ใช้ไม่ได้: ${String(o.source)}`);
  if (typeof o.occurredAt !== 'string' || Number.isNaN(Date.parse(o.occurredAt as string))) {
    issues.push('occurredAt ไม่ใช่เวลาที่อ่านได้');
  }
  if (o.props !== undefined && (typeof o.props !== 'object' || o.props === null)) issues.push('props ไม่ใช่อ็อบเจกต์');
  return issues;
}

/* ── แปลงออกทีละปลายทาง ────────────────────────────────────────────────── */

/** CEF → payload ของ Marketing OS · null = ไม่ต้องส่ง (ไม่ได้แมป / เรกคอร์ดใช้ไม่ได้)
 *  🔴 กฎ PII และการตัดความยาวเกิดที่ `encodeOsEvent` — ชั้นนี้ไม่ทำซ้ำ */
export function cefToOs(r: CefRecord): OsEventPayload | null {
  if (cefIssues(r).length > 0) return null;
  const event = osEventFor(r.name);
  if (!event) return null;
  return encodeOsEvent({
    event,
    session: r.session,
    seg: r.context.seg,
    pagePath: r.context.pagePath,
    referrer: r.context.referrer,
    utm: r.context.utm,
    props: r.props,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * ปลายทางที่สอง — Marketing OS จริง (`marketing-behavior-ingest` · ADR-0009)
 *
 * 🔴 taxonomy ของเขาแคบมาก: name 3 × topic 4 × format 4
 *    event ของเรา 179 ชื่อ ⇒ แมปได้ไม่กี่ตัว · **ที่แมปไม่ได้ ห้ามเดาให้ลงช่อง**
 *    (ยัดลง business_validation เพราะไม่รู้จะใส่อะไร = สร้างข้อมูลที่ดูเหมือนจริง)
 * ══════════════════════════════════════════════════════════════════════════ */

export const BEHAVIOR_NAMES = ['view', 'engaged', 'action'] as const;
/** 🔑 ตรงกับ CHECK `marketing_behavior_events_topic_check` ของเขา และกับ
 *  `marketing_message_pillars.code` ทั้ง 7 เสา (hyphen → underscore)
 *  ⚠️ เดิมมี 4 ค่า ⇒ เสา start/side-income/money ของเขาเอง **วัดไม่ได้**
 *     ขยายเป็น 7 เมื่อ 20 พ.ย. 2569 (migration + function v4 ฝั่งเขา · ADR-0009) */
export const BEHAVIOR_TOPICS = [
  'business_validation', 'first_customer', 'content_marketing', 'business_systems',
  'start', 'side_income', 'money',
] as const;
export const BEHAVIOR_FORMATS = ['article', 'short_video', 'checklist', 'interactive'] as const;

export type BehaviorName = (typeof BEHAVIOR_NAMES)[number];
export type BehaviorTopic = (typeof BEHAVIOR_TOPICS)[number];
export type BehaviorFormat = (typeof BEHAVIOR_FORMATS)[number];

export interface BehaviorEvent {
  id: string;
  session: string;
  at: string;
  source: 'website' | 'saas';
  name: BehaviorName;
  topic: BehaviorTopic;
  format: BehaviorFormat;
}

interface BehaviorShape { name: BehaviorName; topic: BehaviorTopic; format: BehaviorFormat }

/** event ของเรา → ช่องของเขา · **เฉพาะที่ความหมายตรงกันจริง**
 *  🔑 แหล่งความจริงของ `topic` = `marketing_message_pillars.code` ของเขา (7 เสา)
 *     เทียบทีละคู่จาก `problem`/`promise` ที่เขาเขียนไว้เอง ไม่ใช่เดาจากชื่อ:
 *       pillar `money` — "ขายได้แต่ไม่เห็นกำไรจริง · เข้าใจราคา ต้นทุน กำไร และจุดคุ้มทุน"
 *         ⇒ ตรงกับเครื่องคำนวณของเราเป๊ะ (`quickcheck_*`)
 *       pillar `start` — "อยากมีธุรกิจแต่ไม่รู้เริ่มตรงไหน"
 *         ⇒ ตรงกับพาดหัว default ของหน้า Landing ("อยากมีธุรกิจ แต่ไม่รู้จะเริ่มจากอะไร")
 *  ⚠️ เดิมทุกตัวถูกบังคับลง `business_validation` เพราะ CHECK ของเขามีแค่ 4 ค่า
 *     ⇒ ขยายเป็น 7 แล้ว (migration + function v4 ฝั่งเขา 20 พ.ย. 2569 · ADR-0009) */
export const BEHAVIOR_MAP: Readonly<Record<string, BehaviorShape>> = Object.freeze({
  landing_view:            { name: 'view',    topic: 'start', format: 'interactive' },
  landing_cta_click:       { name: 'action',  topic: 'start', format: 'interactive' },
  quickcheck_started:      { name: 'engaged', topic: 'money', format: 'interactive' },
  quickcheck_submitted:    { name: 'action',  topic: 'money', format: 'interactive' },
  quickcheck_signup_click: { name: 'action',  topic: 'money', format: 'interactive' },
});

/** `nextproblem_click` พา `id` ของหัวข้อมาด้วย ⇒ แมป topic ตามหัวข้อที่เขากดจริง
 *  เทียบข้อความ `ask`/`gives` ของเรา กับ `problem`/`promise` ของเสาเขา: */
export const NEXTPROBLEM_TOPIC: Readonly<Record<string, BehaviorTopic>> = Object.freeze({
  // "จะหาลูกค้าเพิ่มจากไหน" ↔ pillar first-customer "ยังไม่มีลูกค้าจริง"
  customers: 'first_customer',
  // "คนค้นหาของแบบที่คุณขาย เจอร้านคุณไหม" ↔ pillar marketing
  found: 'content_marketing',
  // "ถ้าคุณหยุดสักอาทิตย์ ร้านยังเดินต่อได้ไหม" ↔ pillar systemize "พึ่งเจ้าของมากเกินไป"
  system: 'business_systems',
  // "ไม่อยากเสี่ยงลงเงินก้อนก่อนรู้ว่าจะขายได้ไหม · ทดสอบไอเดียกับคนจริงก่อนผลิต"
  //   ↔ pillar validate "ไม่รู้ว่าจะมีใครซื้อ · ตรวจลูกค้าและสมมติฐานก่อนขยาย" (ตรงเป๊ะ)
  capital: 'business_validation',
  // "งานหลังร้านกินเวลา" ↔ pillar systemize "เปลี่ยนงานซ้ำให้เป็น process, KPI และระบบ"
  team: 'business_systems',
});

/** หัวข้อที่ **ไม่แมปโดยเจตนา** พร้อมเหตุผล — ห้ามปล่อยว่างให้คนเดา */
export const NEXTPROBLEM_UNMAPPED: Readonly<Record<string, string>> = Object.freeze({
  plan: 'เสา start คือ "ยังไม่เริ่ม" แต่ `plan` ของเราคือคนที่โตแล้วอยากรู้ก้าวถัดไป ⇒ คนละคน',
  risk: 'ความเปราะของซัพพลายเชน/ของขึ้นราคา — ไม่มีเสาไหนใน 7 เสาของเขาพูดถึงเรื่องนี้',
});

/** topic ของเขาที่เรา **ยังไม่ส่ง** พร้อมเหตุผล (เขามีช่องแล้ว แต่เรายังไม่มีสัญญาณที่ตรง) */
export const BEHAVIOR_TOPIC_UNUSED: Readonly<Record<string, string>> = Object.freeze({
  side_income: 'เป็นคุณสมบัติของ **คน** (seg=sidebiz) ไม่ใช่ของ **เหตุการณ์** · สคีมา behavior ของเขาไม่มีช่อง seg ⇒ ส่งไม่ได้โดยไม่บิดความหมาย',
});

/** CEF → event ของเขา · null = ไม่แมป (ไม่ส่ง)
 *  @param newId ตัวสร้าง uuid (ฉีดเข้ามาเพื่อให้เทสต์กำหนดค่าได้) */
export function cefToBehavior(r: CefRecord, newId: () => string): BehaviorEvent | null {
  if (cefIssues(r).length > 0) return null;

  let shape: BehaviorShape | undefined = BEHAVIOR_MAP[r.name];
  if (!shape && r.name === 'nextproblem_click') {
    const topic = NEXTPROBLEM_TOPIC[String(r.props.id ?? '')];
    if (topic) shape = { name: 'action', topic, format: 'interactive' };
  }
  if (!shape) return null;

  return {
    id: newId(),
    session: r.session,
    at: r.occurredAt,
    source: r.source === 'server' ? 'saas' : 'website',
    ...shape,
  };
}
