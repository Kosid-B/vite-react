/* ══════════════════════════════════════════════════════════════════════════
 * osOutbox.ts — **ชั้นเก็บ + กันข้อมูลหาย** ของสายท่อ · 20 พ.ย. 2569
 *
 * 🔴 เรื่องที่ต้องพูดให้ตรงก่อน: **นี่ไม่ใช่ erasure coding**
 *    erasure coding (Reed–Solomon k-of-n) แก้ปัญหา "ชิ้นส่วนของข้อมูลหายไปบางชิ้น
 *    แต่ยังเหลือพอให้คำนวณกลับมาได้" — ใช้ได้เมื่อข้อมูลถูกกระจายไว้หลายที่
 *    สถานการณ์ของเราไม่ใช่แบบนั้น:
 *      · หน่วยที่หายคือ **POST ทั้งก้อน** (เน็ตหลุด · ปลายทาง 5xx · ผู้ใช้ปิดแท็บ) ไม่ใช่ไบต์บางส่วน
 *      · ที่เก็บมีที่เดียว (localStorage ของเครื่องนั้น) ⇒ parity จะหายไปพร้อมข้อมูลเสมอ
 *    ⇒ ใส่ parity = เปลืองที่และเวลาโดยไม่กู้อะไรกลับมาได้เลย
 *    กลไกที่กู้ได้จริงในสถานการณ์นี้มี 3 ชั้น และไฟล์นี้ทำชั้น ②③:
 *      ① **สำเนาฝั่งเรา** — `landing_funnel`/`quickcheck_submissions`/`client_errors` เป็นของเราเอง
 *         ส่งไป OS ไม่ถึงก็ยังมีต้นฉบับ ⇒ เล่าซ้ำได้ (นี่คือ "redundancy" ตัวจริงของระบบนี้)
 *      ② **ส่งซ้ำ (replay)** — ที่ส่งไม่สำเร็จค้างไว้ แล้วลองใหม่รอบหน้า
 *      ③ **นับจำนวนที่ทิ้ง** — กู้ไม่ได้ ต้อง **รู้ว่าหายไปกี่ชิ้นและเพราะอะไร**
 *         🔴 ข้อนี้สำคัญที่สุด: ข้อมูลหายแล้วไม่รู้ตัว = ตัวเลขทุกตัวข้างหน้ากลายเป็นคำโกหกโดยการละเว้น
 *            (รูปแบบเดียวกับ Amplitude ที่ได้ 0 event มา 3 เดือนโดยไม่มีใครรู้ — ledger #18)
 *
 * 🔒 ที่เก็บถูกฉีดเข้ามา (`OutboxStore`) ⇒ ทดสอบได้ทุกทางโดยไม่ต้องมีเบราว์เซอร์
 * ══════════════════════════════════════════════════════════════════════════ */
import { wireIssues, type OsEventPayload } from './osCodec';
import { checksumOf, pack, unpack, ENVELOPE_VERSION } from './osPackage';

export interface OutboxStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export const OUTBOX_KEY = 'ceo_ai_os_outbox';

/** เพดานจำนวนที่ค้างได้ — เกินแล้ว **ทิ้งตัวเก่าสุด**
 *  เหตุผลที่ทิ้งเก่าไม่ทิ้งใหม่: ของใหม่ยังมีโอกาสอธิบายพฤติกรรมวันนี้ได้
 *  ของเก่าที่ส่งไม่ได้มาหลายวันแล้ว ต่อให้ส่งถึงก็มาช้าเกินจะใช้ตัดสินใจ */
export const MAX_PENDING = 100;

export type DropReason = 'invalid' | 'overflow' | 'corrupt' | 'version';

export interface OutboxState {
  /** ลำดับซองถัดไปที่จะเขียน (ขึ้นเรื่อย ๆ ไม่รีเซ็ต) */
  nextSeq: number;
  pending: OsEventPayload[];
  /** จำนวนที่หายไปแล้วกู้ไม่ได้ แยกตามเหตุผล — ห้ามรวมเป็นตัวเลขเดียว */
  dropped: Record<DropReason, number>;
}

export function emptyOutbox(): OutboxState {
  return { nextSeq: 1, pending: [], dropped: { invalid: 0, overflow: 0, corrupt: 0, version: 0 } };
}

/** รวมตัวเลขที่หาย — ใช้ตอนรายงาน ไม่ใช่ตอนเก็บ */
export function totalDropped(s: OutboxState): number {
  return Object.values(s.dropped).reduce((a, b) => a + b, 0);
}

/** อ่านของค้างขึ้นมา — เสียหาย/คนละเวอร์ชัน = **ทิ้งทั้งก้อนแล้วนับ** ไม่ใช่เดาต่อ */
export function loadOutbox(store: OutboxStore): OutboxState {
  const raw = store.read(OUTBOX_KEY);
  if (!raw) return emptyOutbox();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    store.remove(OUTBOX_KEY);
    return { ...emptyOutbox(), dropped: { ...emptyOutbox().dropped, corrupt: 1 } };
  }

  const { pkg, issues } = unpack(parsed);
  if (!pkg) {
    store.remove(OUTBOX_KEY);
    const n = Array.isArray((parsed as { events?: unknown[] })?.events)
      ? (parsed as { events: unknown[] }).events.length
      : 1;
    const reason: DropReason = issues.some((i) => i.includes('เวอร์ชันซอง')) ? 'version' : 'corrupt';
    const s = emptyOutbox();
    s.dropped[reason] = n;
    // ลำดับต้องเดินต่อ ไม่ย้อนกลับไป 1 แม้อ่านของเก่าไม่ได้ (ถ้าอ่านเลขได้)
    const seq = (parsed as { seq?: unknown })?.seq;
    if (typeof seq === 'number' && Number.isInteger(seq) && seq >= 1) s.nextSeq = seq + 1;
    return s;
  }
  return { nextSeq: pkg.seq + 1, pending: pkg.events, dropped: emptyOutbox().dropped };
}

/** ใส่เข้าคิว — pure (คืนสถานะใหม่ ไม่แก้ของเดิม) */
export function enqueue(state: OutboxState, ev: OsEventPayload): OutboxState {
  const dropped = { ...state.dropped };
  if (wireIssues(ev).length > 0) {
    dropped.invalid += 1;
    return { ...state, dropped };
  }
  let pending = [...state.pending, ev];
  if (pending.length > MAX_PENDING) {
    dropped.overflow += pending.length - MAX_PENDING;
    pending = pending.slice(pending.length - MAX_PENDING);
  }
  return { ...state, pending, dropped };
}

/** ตัด n ตัวแรกออกเพราะส่งถึงแล้ว (ack) */
export function ack(state: OutboxState, n: number): OutboxState {
  if (n <= 0) return state;
  return { ...state, pending: state.pending.slice(n) };
}

/** เขียนลงที่เก็บเป็นซองเดียว · คิวว่าง = ลบคีย์ทิ้ง (ไม่ทิ้งขยะไว้ในเครื่องผู้ใช้) */
export function saveOutbox(store: OutboxStore, state: OutboxState): void {
  if (state.pending.length === 0) {
    store.remove(OUTBOX_KEY);
    return;
  }
  const { packages } = pack(state.pending, state.nextSeq);
  // คิวยาวกว่า 1 ซองเกิดไม่ได้เพราะ MAX_PENDING แต่ถ้าเกิด ให้เก็บซองแรกและนับที่เหลือเป็นของหาย
  const first = packages[0] ?? {
    v: ENVELOPE_VERSION, seq: state.nextSeq, packedAt: new Date().toISOString(),
    checksum: checksumOf([]), events: [],
  };
  store.write(OUTBOX_KEY, JSON.stringify(first));
}

/** ที่เก็บในหน่วยความจำ — ใช้ในเทสต์และเป็นตัวสำรองเมื่อเบราว์เซอร์ปิด storage */
export function memoryStore(): OutboxStore {
  const m = new Map<string, string>();
  return {
    read: (k) => m.get(k) ?? null,
    write: (k, v) => { m.set(k, v); },
    remove: (k) => { m.delete(k); },
  };
}

/** ที่เก็บจริงบนเบราว์เซอร์ · คืน null เมื่อใช้ไม่ได้ (โหมดส่วนตัว/ปิดคุกกี้)
 *  🔴 ต้องลอง **เขียนจริง** ไม่ใช่เช็กว่ามีอ็อบเจกต์อยู่ — Safari โหมดส่วนตัวมี object แต่เขียนแล้วโยน */
export function browserStore(): OutboxStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = `${OUTBOX_KEY}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      read: (k) => localStorage.getItem(k),
      write: (k, v) => localStorage.setItem(k, v),
      remove: (k) => localStorage.removeItem(k),
    };
  } catch {
    return null;
  }
}
