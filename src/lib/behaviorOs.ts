/* ══════════════════════════════════════════════════════════════════════════
 * behaviorOs.ts — ปลายทางที่ **สอง**: Marketing OS ตัวจริง (ADR-0009 · 20 พ.ย. 2569)
 *
 * ปลายทางที่หนึ่ง (`marketingOs.ts`) เขียนลง `marketing_events` ใน `public` ของเรา
 * ซึ่งแอป OS ไม่อ่าน (ledger #94) · ไฟล์นี้ยิงเข้า **ท่อ behavior ตัวจริง**
 *
 * 🔁 **22 พ.ย. 2569 — ฐานถูกรวมมาอยู่ project เดียวกับ CEO แล้ว** (เจ้าของสั่ง · ADR-0011)
 *   ตารางอยู่ schema `marketing_os` (ไม่ใช่ `public` — 4 ชื่อซ้ำกับของเราแต่ข้อมูลไม่เท่ากัน)
 *   และฟังก์ชัน `marketing-behavior-ingest` ถูก deploy บน project ของเราแล้ว
 *   🔴 **ยังเรียกมันว่า "ถึง Marketing OS" ไม่ได้** จนกว่าแอป OS จะถูกชี้มาฐานนี้ด้วย
 *     (โค้ดแอปเขาอยู่บนเครื่องเจ้าของ · เซสชันคลาวด์เข้าไม่ถึง) ⇒ ตอนนี้ = ฐานเราเก็บครบ
 *
 * 🔒 กฎเส้นแบ่ง: ไฟล์นี้เป็น **ไฟล์เดียว** ที่รู้จัก endpoint นี้ (`ownershipBoundary.test.ts`)
 *
 * สัญญาของปลายทาง (ยกมาจากซอร์สจริงทั้งไฟล์ · เปลี่ยนแค่ schema ที่เขียนลง):
 *   · origin allowlist = ceoaithailand.org + www  ⇒ 🔴 **localhost ยิงไม่ได้**
 *     ⇒ ทดสอบได้แต่บน production ด้วย `mode:'test'` (โหมดนี้มีไว้เพื่อการนี้)
 *   · verify_jwt = true ⇒ ต้องมีคีย์ของ project เราใน Authorization + apikey
 *   · batch 1–20 event · เพดาน 16,000 ไบต์ · สคีมา strict (คีย์เกิน = ปฏิเสธทั้งก้อน)
 *   · `at` ต้องอยู่ในช่วง −24 ชม. ถึง +60 วินาที ⇒ ของค้างข้ามวันต้องทิ้ง ไม่ใช่ส่งไป
 *   · rate limit ต่อ IP ต่อนาที ⇒ ยิ่งต้องรวมเป็นก้อน ไม่ยิงทีละตัว
 *
 * 🔴 **consent** — สคีมาเขาบังคับ `consent: 'analytics_opt_in'` เป็นค่าคงที่
 *    ค่านั้นคือ **คำประกาศแทนผู้ใช้** ⇒ ส่งทั้งที่ผู้ใช้ไม่ได้ยินยอม = โกหก + ผิด PDPA
 *    เราผูกกับแถบคุกกี้ของเราเอง: ส่งเมื่อ `ceo_ai_cookie_consent === 'all'` เท่านั้น
 *    ('all' = ปุ่มที่เปิด Analytics จริงใน `CookieConsent.tsx` · 'necessary' = ปิด)
 *    ⇒ ยังไม่เลือก · กด necessary · อ่าน storage ไม่ได้ = **ไม่ส่ง** (fail-closed)
 * ══════════════════════════════════════════════════════════════════════════ */
import { cefToBehavior, toCef, type BehaviorEvent } from './eventFormat';
import { canonicalJson, checksumOf } from './osPackage';

/** ปลายทางเดียวที่ไฟล์นี้รู้จัก — 🔒 ชื่อนี้ต้องอยู่ที่นี่ที่เดียวทั้งรีโป */
const BEHAVIOR_FN = 'marketing-behavior-ingest';

/** 🔁 **22 พ.ย. 2569 — ปลายทางย้ายมาอยู่ project เดียวกับ CEO แล้ว** (เจ้าของสั่งรวม DB · ADR-0011)
 *  เดิมอ่าน `VITE_MARKETING_OS_URL` + `VITE_MARKETING_OS_ANON_KEY` = ฐานของอีก project
 *  ⇒ รวมเป็น project เดียวแล้ว ⇒ ใช้ URL/คีย์ของเราเอง ⇒ **เลิกใช้ env สองตัวนั้นทั้งคู่**
 *  🔴 ที่ได้มาไม่ใช่แค่โค้ดสั้นลง: **กับดัก `vars` vs `secrets` หายไปทั้งคู่**
 *     (ตั้งผิดช่องแล้วได้ค่าว่างแบบเงียบสนิท และไม่มีเทสต์ไหนจับได้เพราะทั้งสองแบบถูกไวยากรณ์)
 *  🔴 และบทเรียน ledger #96 ยังอยู่: **ห้ามฝังคีย์ลงรีโป** — ผมเคยฝัง JWT ของเขาไว้ที่นี่
 *     แล้ว GitGuardian จับได้ · คีย์ต้องมาจาก env เท่านั้น ไม่ว่าจะเป็นคีย์ของใคร
 *  ⇒ ไม่มีค่าใน env = **เงียบสนิท** (ไม่ใช่ล้มเงียบ · รูปแบบเดียวกับ VITE_AMPLITUDE_KEY) */
const OS_BASE = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').replace(/\/$/, '');
const OS_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const CONSENT_KEY = 'ceo_ai_cookie_consent';
export const OUTBOX_KEY = 'ceo_ai_behavior_outbox';

export const MAX_BATCH = 20;
export const MAX_BATCH_BYTES = 16_000;
/** กรอบเวลารวมก้อน — นับจาก **event แรกที่เข้าคิว** (throttle) ไม่ใช่รีเซ็ตทุกตัว (debounce)
 *  🔴 ของเดิม 4 วินาที — สั้นกว่าจังหวะที่คนใช้งานจริงมาก ⇒ "รวมก้อน" แทบไม่เคยรวมอะไรเลย
 *     วัดจาก session จริงแรกที่เข้าฐานเขา (`405a828b` · 21 พ.ย. 2569):
 *     ช่วงห่างระหว่าง event = **26 วิ · 17 วิ · 2 วิ** ⇒ 4 event กลายเป็น **3 ก้อน** (1·1·2)
 *     ⇒ โค้ดรวมก้อน "มีอยู่" แต่พารามิเตอร์ทำให้มันไม่ทำงาน (ledger #100)
 *  60 วินาทีครอบ session นั้นได้ทั้งหมดในก้อนเดียว (09:33:42 → 09:34:27 = 45 วิ)
 *  ⚠️ แลกด้วย: ข้อมูลถึงปลายทางช้าลงได้ถึง ~1 นาที — ยอมรับได้ เพราะเป็นข้อมูลวิเคราะห์พฤติกรรม
 *     ไม่ใช่ของที่ต้องเห็นทันที · และ **ไม่เพิ่มความเสี่ยงของหาย** เพราะเขียนลง storage
 *     ตั้งแต่ตอนเข้าคิวแล้ว (ดู `enqueue`) ไม่ได้ค้างอยู่แต่ในหน่วยความจำ */
export const FLUSH_WINDOW_MS = 60_000;
/** ของที่เก่ากว่านี้ปลายทางปฏิเสธ (`expired_event`) ⇒ ทิ้งก่อนส่ง */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const ENVELOPE_VERSION = 1;

export interface BehaviorBatch {
  version: 1;
  batchId: string;
  consent: 'analytics_opt_in';
  mode: 'live' | 'test';
  events: BehaviorEvent[];
}

/* ── ด่านตรวจก่อนส่ง (สะท้อนสคีมา strict ของเขา) ───────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** เหตุผลที่ก้อนนี้จะถูกปฏิเสธ · [] = ส่งได้
 *  🔴 ตรวจที่บ้านเราก่อนเสมอ — ก้อนที่ผิดทำให้ **ทั้งก้อน** ตกไป ไม่ใช่แค่ตัวที่ผิด */
export function batchIssues(b: unknown, now = Date.now()): string[] {
  const issues: string[] = [];
  if (typeof b !== 'object' || b === null) return ['ไม่ใช่อ็อบเจกต์'];
  const o = b as Record<string, unknown>;

  if (o.version !== 1) issues.push(`version ต้องเป็น 1 ได้ ${String(o.version)}`);
  if (o.consent !== 'analytics_opt_in') issues.push('consent ต้องเป็น analytics_opt_in');
  if (o.mode !== 'live' && o.mode !== 'test') issues.push(`mode ใช้ไม่ได้: ${String(o.mode)}`);
  if (typeof o.batchId !== 'string' || !UUID_RE.test(o.batchId)) issues.push('batchId ไม่ใช่ uuid');

  const ev = o.events;
  if (!Array.isArray(ev) || ev.length < 1) issues.push('events ต้องมีอย่างน้อย 1 ตัว');
  else {
    if (ev.length > MAX_BATCH) issues.push(`events เกิน ${MAX_BATCH} ตัว`);
    const ids = new Set<string>();
    ev.forEach((raw, i) => {
      const e = raw as Record<string, unknown>;
      for (const k of ['id', 'session'] as const) {
        if (typeof e[k] !== 'string' || !UUID_RE.test(e[k] as string)) issues.push(`events[${i}].${k} ไม่ใช่ uuid`);
      }
      if (ids.has(String(e.id))) issues.push(`events[${i}].id ซ้ำในก้อนเดียว`);
      ids.add(String(e.id));
      const t = Date.parse(String(e.at));
      if (Number.isNaN(t)) issues.push(`events[${i}].at อ่านไม่ได้`);
      else if (t > now + 60_000 || t < now - MAX_AGE_MS) issues.push(`events[${i}].at อยู่นอกช่วงที่ปลายทางรับ`);
      // คีย์เกิน = ปฏิเสธทั้งก้อน (สคีมาเขา strict)
      const allowed = ['id', 'session', 'at', 'source', 'name', 'topic', 'format'];
      for (const k of Object.keys(e)) if (!allowed.includes(k)) issues.push(`events[${i}] มีคีย์เกิน: ${k}`);
    });
  }
  if (issues.length === 0 && canonicalJson(b).length > MAX_BATCH_BYTES) issues.push('ก้อนใหญ่เกินเพดานไบต์');
  return issues;
}

export function buildBatch(events: readonly BehaviorEvent[], batchId: string, mode: 'live' | 'test'): BehaviorBatch {
  return { version: 1, batchId, consent: 'analytics_opt_in', mode, events: [...events] };
}

/* ── consent ────────────────────────────────────────────────────────────── */

/** ผู้ใช้ยินยอมให้วิเคราะห์พฤติกรรมจริงหรือยัง — fail-closed ทุกกรณีที่ไม่ชัด */
export function analyticsOptIn(read: (k: string) => string | null): boolean {
  try {
    return read(CONSENT_KEY) === 'all';
  } catch {
    return false;
  }
}

/* ── ที่เก็บของค้าง (เล็กและแยกจาก osOutbox โดยเจตนา) ────────────────────
 * เหตุผลที่ไม่ใช้ `osOutbox` ร่วม: สองปลายทางมีสคีมา เพดาน และกฎอายุต่างกัน
 * ⇒ ใช้ร่วมกันต้องทำให้ตัวตรวจเป็นของทั่วไป ซึ่งจะทำให้ด่านของทั้งคู่อ่อนลงพร้อมกัน */

export interface BehaviorOutbox { v: number; checksum: string; events: BehaviorEvent[]; dropped: number }

export function emptyOutbox(): BehaviorOutbox {
  return { v: ENVELOPE_VERSION, checksum: checksumOf([]), events: [], dropped: 0 };
}

export function loadOutbox(raw: string | null, now = Date.now()): BehaviorOutbox {
  if (!raw) return emptyOutbox();
  try {
    const o = JSON.parse(raw) as BehaviorOutbox;
    if (o.v !== ENVELOPE_VERSION || !Array.isArray(o.events)) return { ...emptyOutbox(), dropped: 1 };
    if (checksumOf(o.events as never) !== o.checksum) return { ...emptyOutbox(), dropped: o.events.length || 1 };
    // ทิ้งของที่เกินอายุที่ปลายทางรับ — ส่งไปก็ถูกปฏิเสธทั้งก้อน
    const fresh = o.events.filter((e) => Date.parse(e.at) >= now - MAX_AGE_MS);
    return { ...emptyOutbox(), events: fresh, dropped: (o.dropped ?? 0) + (o.events.length - fresh.length) };
  } catch {
    return { ...emptyOutbox(), dropped: 1 };
  }
}

export function saveOutbox(box: BehaviorOutbox): string {
  return JSON.stringify({ ...box, checksum: checksumOf(box.events as never) });
}

/* ── ส่งจริง (impure · เงียบเสมอ) ───────────────────────────────────────── */

const buffer: BehaviorEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let hooked = false;

function store(): Storage | null {
  try {
    const probe = `${OUTBOX_KEY}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return '';
  }
}

/**
 * รับ event ของเรา → แปลงเป็นช่องของเขา → เข้าคิวรวมก้อน
 * ไม่แมป / ไม่ยินยอม / ปิด flag = no-op เงียบ ๆ
 */
export function sendBehavior(
  event: string,
  props?: Readonly<Record<string, string | number>>,
  session?: string,
): void {
  try {
    if (typeof window === 'undefined') return;
    const s = session ?? '';
    if (!UUID_RE.test(s)) return;                       // ต้องเป็น uuid จริง ไม่งั้นปลายทางปฏิเสธ
    const mapped = cefToBehavior(toCef({ name: event, session: s, props }), uuid);
    if (!mapped || !UUID_RE.test(mapped.id)) return;
    hookPagehide();                                     // ต้องฮุกเสมอ ไม่ใช่เฉพาะตอนตั้งเวลา
    if (enqueue(mapped) >= MAX_BATCH) void flush();
    else schedule();
  } catch { /* ห้ามทำ UX พัง เพราะ analytics */ }
}

/** ทางเข้าที่ผู้เรียกใช้จริง — หา session เองจาก `landingFunnel` (ตัวเดียวกับที่ `landing_funnel.session` ใช้)
 *  ⇒ ข้อมูลสองฝั่ง join กันได้ และผู้เรียกไม่ต้องรู้เรื่อง session */
export function sendBehaviorAuto(
  event: string,
  props?: Readonly<Record<string, string | number>>,
): void {
  try {
    if (typeof window === 'undefined') return;
    void import('./landingFunnel')
      .then((m) => { sendBehavior(event, props, m.currentFunnelSession()); })
      .catch(() => { /* เงียบ */ });
  } catch { /* เงียบ */ }
}

/** เข้าคิว — **เขียนลง storage ทันที ไม่รอ flush** · คืนจำนวนที่ค้างทั้งหมด
 *  🔴 เหตุผลที่ต้องเขียนทันทีเมื่อกรอบเวลายาวขึ้น: ถ้ายังค้างอยู่แต่ในหน่วยความจำ
 *     แท็บที่ถูกปิดโดยไม่ยิง `pagehide` (เบราว์เซอร์ฆ่าทิ้ง · เครื่องดับ) จะทำของหาย
 *     **มากขึ้นตามกรอบที่ยาวขึ้น** ⇒ ยืดเวลารวมก้อนได้ ก็ต่อเมื่อของรอดการปิดแท็บแล้วเท่านั้น
 *  ⚠️ อ่าน storage ไม่ได้ (โหมดส่วนตัว) = ตกไปใช้หน่วยความจำเหมือนเดิม — ของหายได้ และยอมรับแล้ว */
function enqueue(ev: BehaviorEvent): number {
  const st = store();
  if (!st) { buffer.push(ev); return buffer.length; }
  try {
    const box = loadOutbox(st.getItem(OUTBOX_KEY));
    const events = [...box.events, ev].slice(-MAX_BATCH * 5);
    st.setItem(OUTBOX_KEY, saveOutbox({ ...box, events }));
    return events.length + buffer.length;
  } catch {
    buffer.push(ev);
    return buffer.length;
  }
}

function hookPagehide(): void {
  if (hooked) return;
  hooked = true;
  // ผู้ใช้ปิดแท็บ = โอกาสสุดท้าย (pagehide ไว้ใจได้กว่า beforeunload บน iOS)
  window.addEventListener('pagehide', () => { void flush(); });
}

function schedule(): void {
  if (flushTimer) return;   // throttle: นับจากตัวแรก — ไม่รีเซ็ต ไม่งั้นคนที่ขยับเรื่อย ๆ จะไม่ถูกส่งเลย
  flushTimer = setTimeout(() => { flushTimer = undefined; void flush(); }, FLUSH_WINDOW_MS);
}

async function flush(): Promise<void> {
  try {
    const { MARKETING_OS } = await import('../config');
    if (!MARKETING_OS.behaviorLive) return;
    if (!OS_BASE || !OS_ANON_KEY) return;   // ไม่ได้ตั้ง env = เงียบสนิท (ไม่ใช่ล้มเงียบ — ไม่มีอะไรให้ส่งถึง)
    const st = store();
    if (!analyticsOptIn((k) => (st ? st.getItem(k) : null))) { buffer.length = 0; return; }

    const box = loadOutbox(st ? st.getItem(OUTBOX_KEY) : null);
    const queue = [...box.events, ...buffer.splice(0, buffer.length)].slice(-MAX_BATCH * 5);
    if (queue.length === 0) return;

    const send = queue.slice(0, MAX_BATCH);
    const batch = buildBatch(send, uuid(), MARKETING_OS.behaviorMode);
    if (batchIssues(batch).length > 0) {
      // ของที่เรารู้เองว่าผิด ไม่ส่ง และไม่เก็บไว้วนอีก
      if (st) st.setItem(OUTBOX_KEY, saveOutbox({ ...emptyOutbox(), dropped: box.dropped + send.length }));
      return;
    }

    let ok = false;
    try {
      const res = await fetch(`${OS_BASE}/functions/v1/${BEHAVIOR_FN}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${OS_ANON_KEY}`,
          apikey: OS_ANON_KEY,
        },
        body: JSON.stringify(batch),
        keepalive: true,
      });
      ok = res.ok;
    } catch { ok = false; }

    const rest = ok ? queue.slice(MAX_BATCH) : queue;
    if (st) st.setItem(OUTBOX_KEY, saveOutbox({ ...emptyOutbox(), events: rest, dropped: box.dropped }));
  } catch { /* เงียบ */ }
}
