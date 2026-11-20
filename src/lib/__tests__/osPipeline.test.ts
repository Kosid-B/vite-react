import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UUID_FIELDS, decodeOsEvent, encodeOsEvent, wireIssues, type OsEventPayload,
} from '../osCodec';
import {
  ENVELOPE_VERSION, MAX_EVENTS_PER_PACKAGE, MAX_PACKAGE_BYTES,
  canonicalJson, checksumOf, pack, unpack,
} from '../osPackage';

/* ══════════════════════════════════════════════════════════════════════
 * สายท่อข้อมูล: **แปลง (codec) → ห่อ (packaging)**
 *
 * สิ่งที่ด่านนี้กัน — ทั้งสามข้อเคยเกิดจริงในโปรเจกต์นี้มาแล้วในรูปแบบอื่น:
 *  ① "เขียนลงไป" กับ "อ่านขึ้นมา" ไม่ตรงกัน ⇒ บังคับให้ decode(encode(x)) = encode(x)
 *  ② checksum ที่คำนวณสองครั้งได้ไม่เท่ากัน (ลำดับคีย์) ⇒ บังคับผ่าน canonicalJson
 *  ③ ชั้นที่ประกาศว่า pure แต่แอบมี side effect ⇒ อ่านซอร์สจริงว่าไม่มี fetch/storage
 * ══════════════════════════════════════════════════════════════════════ */
const read = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ok = (): OsEventPayload => encodeOsEvent({
  event: 'cta_click',
  session: '11111111-2222-3333-4444-555555555555',
  seg: 'owner',
  pagePath: '/',
  props: { biz: 'food', units: 30 },
});

describe('① แปลง — decode ต้องเป็นวงกลมกับ encode', () => {
  it('decode(encode(x)) ได้ของเดิมเป๊ะ (ไม่ใช่ "คล้าย")', () => {
    const e = ok();
    expect(decodeOsEvent(e)).toEqual(e);
  });

  it('payload ปกติไม่มีข้อติง', () => {
    expect(wireIssues(ok())).toEqual([]);
  });

  it('ของที่ไม่ใช่อ็อบเจกต์ถูกปฏิเสธ ไม่โยน error', () => {
    for (const v of [null, undefined, 1, 'x', true]) {
      expect(wireIssues(v).length).toBeGreaterThan(0);
      expect(decodeOsEvent(v)).toBeNull();
    }
  });

  it('🔴 eventName นอกรายการที่ปลายทางรับ = ปฏิเสธที่บ้านเรา ไม่ต้องให้เขาปฏิเสธ', () => {
    const bad = { ...ok(), eventName: 'purchase_completed' };
    expect(wireIssues(bad).join(' ')).toMatch(/eventName/);
    expect(decodeOsEvent(bad)).toBeNull();
  });

  it.each(['anonymousId', 'sessionId'])('%s ว่าง = ใช้ไม่ได้ (join ข้อมูลสองฝั่งไม่ได้)', (k) => {
    expect(wireIssues({ ...ok(), [k]: '  ' }).join(' ')).toContain(k);
  });

  it.each([...UUID_FIELDS])('🔴 ฟิลด์ %s ต้องไม่โผล่ — เราไม่มี UUID จริงของเขา', (f) => {
    expect(wireIssues({ ...ok(), [f]: 'not-a-uuid' }).join(' ')).toContain(f);
  });

  it('🔴 คีย์ PII ใน properties = ปฏิเสธ (กันซ้ำจากฝั่งเขา)', () => {
    const bad = { ...ok(), properties: { customer_email: 'a@b.c' } };
    expect(wireIssues(bad).join(' ')).toMatch(/PII/);
  });

  it('ค่ายาวเกินเพดาน = ข้อความอิสระ ⇒ ปฏิเสธ', () => {
    const bad = { ...ok(), properties: { note: 'ก'.repeat(500) } };
    expect(wireIssues(bad).join(' ')).toMatch(/ยาวเกิน/);
  });
});

describe('② ห่อ — ซองต้องตรวจตัวเองได้', () => {
  it('canonicalJson ไม่ขึ้นกับลำดับคีย์ (ไม่มีอันนี้ checksum เชื่อไม่ได้)', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it('checksum เท่าเดิมเมื่อข้อมูลเดิม และเปลี่ยนเมื่อข้อมูลเปลี่ยน', () => {
    const a = ok();
    expect(checksumOf([a])).toBe(checksumOf([a]));
    expect(checksumOf([a])).not.toBe(checksumOf([a, a]));
  });

  it('ห่อแล้วแกะได้ · seq ต่อเนื่องจากที่สั่ง', () => {
    const { packages, rejected } = pack([ok(), ok()], 7);
    expect(rejected).toBe(0);
    expect(packages).toHaveLength(1);
    expect(packages[0].seq).toBe(7);
    expect(packages[0].v).toBe(ENVELOPE_VERSION);
    expect(unpack(packages[0]).issues).toEqual([]);
    expect(unpack(packages[0]).pkg).not.toBeNull();
  });

  it(`แบ่งซองเมื่อเกิน ${MAX_EVENTS_PER_PACKAGE} ตัว · ทุกซองไม่เกินเพดาน`, () => {
    const many = Array.from({ length: MAX_EVENTS_PER_PACKAGE * 2 + 3 }, ok);
    const { packages } = pack(many, 1);
    expect(packages.length).toBeGreaterThan(2);
    for (const p of packages) expect(p.events.length).toBeLessThanOrEqual(MAX_EVENTS_PER_PACKAGE);
    expect(packages.flatMap((p) => p.events)).toHaveLength(many.length);
    expect(packages.map((p) => p.seq)).toEqual(packages.map((_, i) => i + 1));
  });

  it('แบ่งตามไบต์ด้วย ไม่ใช่แค่จำนวน', () => {
    const heavy = { ...ok(), properties: { pad: 'x'.repeat(100) } } as OsEventPayload;
    const { packages } = pack(Array.from({ length: 10 }, () => heavy), 1);
    for (const p of packages) {
      // ซองที่มีมากกว่า 1 ตัวต้องไม่ล้นเพดานไบต์
      if (p.events.length > 1) expect(canonicalJson(p.events).length).toBeLessThanOrEqual(MAX_PACKAGE_BYTES + 200);
    }
  });

  it('🔴 ของเสียถูกทิ้งตอนห่อ และ **นับจำนวนที่ทิ้ง** (ห้ามหายเงียบ)', () => {
    const { packages, rejected } = pack([ok(), { ...ok(), eventName: 'nope' } as unknown as OsEventPayload], 1);
    expect(rejected).toBe(1);
    expect(packages[0].events).toHaveLength(1);
  });

  it('🔴 checksum ไม่ตรง = ทิ้งทั้งซอง ไม่มีโหมดซ่อม', () => {
    const { packages } = pack([ok()], 1);
    const tampered = { ...packages[0], checksum: '00000000' };
    const r = unpack(tampered);
    expect(r.pkg).toBeNull();
    expect(r.issues.join(' ')).toMatch(/checksum/);
  });

  it('เวอร์ชันซองคนละเวอร์ชัน = ทิ้ง (ห้ามเดาความหมายของรูปแบบที่ไม่รู้จัก)', () => {
    const { packages } = pack([ok()], 1);
    expect(unpack({ ...packages[0], v: ENVELOPE_VERSION + 1 }).pkg).toBeNull();
  });

  it('ซองที่ event ข้างในเสีย = ทิ้งทั้งซอง ไม่คืนบางส่วน', () => {
    const events = [ok(), { ...ok(), anonymousId: '' }];
    const forged = { v: ENVELOPE_VERSION, seq: 1, packedAt: 'x', checksum: checksumOf(events), events };
    expect(unpack(forged).pkg).toBeNull();
  });
});

describe('③ ชั้นที่ประกาศว่า pure ต้อง pure จริง (อ่านซอร์ส ไม่ใช่เชื่อคอมเมนต์)', () => {
  it.each(['src/lib/osCodec.ts', 'src/lib/osPackage.ts'])('%s ห้ามมี fetch / storage / import ระบบอื่น', (f) => {
    const c = code(read(f));
    expect(c, 'ห้ามยิงเน็ต').not.toMatch(/\bfetch\s*\(/);
    expect(c, 'ห้ามแตะ storage').not.toMatch(/localStorage|sessionStorage/);
    expect(c, 'ห้ามอ่าน env').not.toMatch(/import\.meta\.env/);
    expect(c, 'ห้ามดึง config/supabase เข้ามา').not.toMatch(/from '\.\/(config|supabase)'/);
  });

  it('🔴 สายส่งต้องเรียก wireIssues **ก่อน** fetch — ไม่ใช่มีไว้แล้วไม่ใช้', () => {
    const c = code(read('src/lib/marketingOs.ts'));
    const iv = c.indexOf('wireIssues(');
    const fx = c.indexOf('fetch(');
    expect(iv, 'ต้องเรียก wireIssues').toBeGreaterThan(-1);
    expect(fx, 'ต้องมี fetch').toBeGreaterThan(-1);
    expect(iv, 'ตรวจต้องมาก่อนยิง').toBeLessThan(fx);
  });

  it('osPackage ต้องใช้ wireIssues ของ codec ไม่เขียนกฎซ้ำเอง', () => {
    const c = code(read('src/lib/osPackage.ts'));
    expect(c).toMatch(/from '\.\/osCodec'/);
    expect(c, 'ห้ามคัดลอก regex PII มาไว้ซ้ำ').not.toMatch(/national_id/);
  });
});
