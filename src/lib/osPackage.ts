/* ══════════════════════════════════════════════════════════════════════════
 * osPackage.ts — **ชั้นห่อ (packaging)** ของสายท่อข้อมูล · 20 พ.ย. 2569
 *
 * 🔴 ข้อจำกัดจริงที่ต้องรู้ก่อนอ่านไฟล์นี้ (ตรวจจากซอร์สของ `marketing-track`):
 *    ปลายทางรับ **1 event ต่อ 1 POST** — ไม่มีโหมด batch
 *    ⇒ ซองในไฟล์นี้ **ไม่ใช่รูปแบบสายส่งของเขา** แต่เป็น **รูปแบบที่เก็บของเราเอง**
 *      (สิ่งที่เขียนลง outbox ในเครื่องผู้ใช้ แล้วอ่านกลับมาส่งทีละตัว)
 *    ถ้าวันหน้าเขาเปิด batch ค่อยเปลี่ยนชั้นส่ง — ชั้นนี้ไม่ต้องแก้
 *
 * หน้าที่: ① ล็อกเวอร์ชันรูปแบบ ② ลำดับ (seq) ③ checksum ④ แบ่งก้อนตามจำนวน+ไบต์
 *
 * ⚠️ **checksum ตรวจความครบถ้วน ไม่ใช่ความปลอดภัย**
 *    มันเป็น fnv1a ไม่ใช่ลายเซ็น — ใครแก้ข้อมูลในเครื่องตัวเองก็คำนวณใหม่ได้
 *    สิ่งที่มันจับได้จริง: ที่เก็บถูกตัดกลางทาง · เขียนไม่จบ · โค้ดเวอร์ชันก่อนเขียนคนละรูปแบบ
 *    สิ่งที่มันจับไม่ได้: การแก้ข้อมูลโดยเจตนา ⇒ **ห้ามอ่านข้อมูลจาก outbox ว่า "เชื่อถือได้"**
 *       ทุกตัวต้องผ่าน `wireIssues()` ก่อนส่งอยู่ดี (osCodec)
 * ══════════════════════════════════════════════════════════════════════════ */
import { wireIssues, type OsEventPayload } from './osCodec';

/** เวอร์ชันรูปแบบซอง — ขึ้นเลขเมื่อโครงเปลี่ยนจนอ่านของเก่าไม่ได้
 *  🔴 ของเวอร์ชันอื่นต้อง **ทิ้งอย่างเปิดเผย** ไม่ใช่พยายามเดาความหมาย */
export const ENVELOPE_VERSION = 1;

/** เพดานต่อซอง — กันซองเดียวใหญ่จนเขียน localStorage ไม่ลง (โควตา ~5MB ต่อ origin) */
export const MAX_EVENTS_PER_PACKAGE = 25;
export const MAX_PACKAGE_BYTES = 48_000;

export interface OsPackage {
  /** = ENVELOPE_VERSION ตอนห่อ */
  v: number;
  /** ลำดับซอง เริ่ม 1 — ใช้บอกว่า "ซองที่ควรมีขาดไปไหม" ไม่ใช่เพื่อเรียงเวลา */
  seq: number;
  packedAt: string;
  checksum: string;
  events: OsEventPayload[];
}

/** JSON ที่คีย์เรียงคงที่ — ไม่มีอันนี้ checksum จะเปลี่ยนตามลำดับคีย์ที่ engine คืนมา
 *  (บั๊กที่เงียบที่สุดของ checksum: คำนวณสองครั้งได้ไม่เท่ากันทั้งที่ข้อมูลเดิม) */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
}

/** fnv1a 32-bit → เลขฐาน 16 8 หลัก (เร็ว ไม่ต้องมี crypto ใช้ได้ทั้งเบราว์เซอร์/เทสต์) */
export function checksumOf(events: readonly OsEventPayload[]): string {
  const s = canonicalJson(events);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** ห่อ event เป็นซอง — แบ่งตาม **ทั้งจำนวนและไบต์** (อันไหนถึงก่อนใช้อันนั้น)
 *  🔴 ทิ้ง event ที่ `wireIssues()` ไม่ผ่านตั้งแต่ตอนห่อ — ของเสียไม่ควรถูกเก็บไว้รอส่ง
 *  @param startSeq ลำดับของซองแรก (ผู้เรียกเป็นคนจำลำดับล่าสุด) */
export function pack(
  events: readonly OsEventPayload[],
  startSeq = 1,
  now: () => string = () => new Date().toISOString(),
): { packages: OsPackage[]; rejected: number } {
  const good = events.filter((e) => wireIssues(e).length === 0);
  const rejected = events.length - good.length;
  const packages: OsPackage[] = [];
  let buf: OsEventPayload[] = [];
  let bytes = 0;

  const flush = () => {
    if (!buf.length) return;
    packages.push({
      v: ENVELOPE_VERSION,
      seq: startSeq + packages.length,
      packedAt: now(),
      checksum: checksumOf(buf),
      events: buf,
    });
    buf = [];
    bytes = 0;
  };

  for (const e of good) {
    const size = canonicalJson(e).length;
    if (buf.length >= MAX_EVENTS_PER_PACKAGE || (buf.length > 0 && bytes + size > MAX_PACKAGE_BYTES)) flush();
    buf.push(e);
    bytes += size;
  }
  flush();
  return { packages, rejected };
}

/** แกะซอง — คืนเหตุผลทุกข้อที่ทำให้ใช้ไม่ได้ · `pkg: null` = ทิ้งทั้งซอง
 *  ⚠️ ไม่มีโหมด "ซ่อมให้" โดยตั้งใจ: ซองที่ checksum ไม่ตรงคือซองที่เราไม่รู้ว่าขาดอะไรไป
 *     เดาต่อ = สร้างข้อมูลที่ไม่มีใครเคยทำ (แย่กว่าข้อมูลหาย เพราะมันดูเหมือนจริง) */
export function unpack(raw: unknown): { pkg: OsPackage | null; issues: string[] } {
  const issues: string[] = [];
  if (typeof raw !== 'object' || raw === null) return { pkg: null, issues: ['ไม่ใช่อ็อบเจกต์'] };
  const o = raw as Record<string, unknown>;

  if (o.v !== ENVELOPE_VERSION) issues.push(`เวอร์ชันซองไม่ตรง: ได้ ${String(o.v)} ต้องการ ${ENVELOPE_VERSION}`);
  if (!Array.isArray(o.events)) issues.push('events ไม่ใช่อาเรย์');
  if (typeof o.seq !== 'number' || !Number.isInteger(o.seq) || o.seq < 1) issues.push('seq ใช้ไม่ได้');

  if (Array.isArray(o.events)) {
    const sum = checksumOf(o.events as OsEventPayload[]);
    if (sum !== o.checksum) issues.push(`checksum ไม่ตรง: คำนวณได้ ${sum} ในซองเขียนว่า ${String(o.checksum)}`);
    (o.events as unknown[]).forEach((e, i) => {
      const bad = wireIssues(e);
      if (bad.length) issues.push(`events[${i}]: ${bad.join(' · ')}`);
    });
  }
  return { pkg: issues.length === 0 ? (raw as OsPackage) : null, issues };
}
