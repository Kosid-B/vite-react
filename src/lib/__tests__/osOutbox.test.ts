import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodeOsEvent, type OsEventPayload } from '../osCodec';
import { ENVELOPE_VERSION, checksumOf, pack } from '../osPackage';
import {
  MAX_PENDING, OUTBOX_KEY, ack, browserStore, emptyOutbox, enqueue,
  loadOutbox, memoryStore, saveOutbox, totalDropped,
} from '../osOutbox';

/* ══════════════════════════════════════════════════════════════════════
 * ชั้นเก็บ/กันหาย — ด่านนี้มีหน้าที่เดียวที่สำคัญกว่าทุกข้อ:
 *   🔴 **ข้อมูลหายได้ แต่ห้ามหายเงียบ**
 *   ทุกเส้นทางที่ทิ้งข้อมูลต้องเพิ่มตัวนับ และตัวนับต้องแยกเหตุผล
 *   (รวมเป็นเลขเดียว = รู้ว่าหาย แต่ไม่รู้ว่าต้องไปแก้อะไร)
 * ══════════════════════════════════════════════════════════════════════ */
const read = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let n = 0;
const ev = (): OsEventPayload => encodeOsEvent({
  event: 'cta_click',
  session: '11111111-2222-3333-4444-555555555555',
  props: { i: ++n },
});

describe('คิวของค้าง — เข้า/ออก/เต็ม', () => {
  it('คิวเปล่าต้องนับของหายเป็น 0 ทุกเหตุผล (ไม่ใช่ undefined)', () => {
    const s = emptyOutbox();
    expect(Object.values(s.dropped)).toEqual([0, 0, 0, 0]);
    expect(totalDropped(s)).toBe(0);
  });

  it('ของดีเข้าคิว · ของเสียไม่เข้าคิวแต่ **ถูกนับ**', () => {
    let s = enqueue(emptyOutbox(), ev());
    expect(s.pending).toHaveLength(1);
    s = enqueue(s, { ...ev(), anonymousId: '' });
    expect(s.pending).toHaveLength(1);
    expect(s.dropped.invalid).toBe(1);
  });

  it(`เกินเพดาน ${MAX_PENDING} = ทิ้ง**ตัวเก่าสุด** และนับ overflow ให้ครบ`, () => {
    const made = Array.from({ length: MAX_PENDING + 5 }, ev);
    let s = emptyOutbox();
    for (const e of made) s = enqueue(s, e);
    expect(s.pending).toHaveLength(MAX_PENDING);
    expect(s.dropped.overflow).toBe(5);
    // ตัวที่เหลือต้องเป็น "ของใหม่" — 5 ตัวแรกคือของที่ถูกทิ้ง
    expect(s.pending[0], 'ตัวแรกที่เหลือต้องเป็นตัวที่ 6 ของที่ใส่เข้าไป').toEqual(made[5]);
    expect(s.pending[s.pending.length - 1]).toEqual(made[made.length - 1]);
  });

  it('ack ตัดจากหัวคิว (ของที่ส่งถึงแล้ว)', () => {
    let s = enqueue(enqueue(emptyOutbox(), ev()), ev());
    const second = s.pending[1];
    s = ack(s, 1);
    expect(s.pending).toEqual([second]);
    expect(ack(s, 0).pending).toHaveLength(1);
    expect(ack(s, -5).pending).toHaveLength(1);
  });
});

describe('เขียน/อ่านที่เก็บ — วงกลมต้องปิด', () => {
  it('save → load ได้ของเดิม และลำดับซองเดินหน้า', () => {
    const store = memoryStore();
    const s = enqueue(enqueue(emptyOutbox(), ev()), ev());
    saveOutbox(store, s);
    const back = loadOutbox(store);
    expect(back.pending).toEqual(s.pending);
    expect(back.nextSeq, 'ลำดับต้องเดินหน้า ไม่ใช่ค้างที่เดิม').toBe(s.nextSeq + 1);
  });

  it('คิวว่าง = ลบคีย์ออกจากเครื่องผู้ใช้ (ไม่ทิ้งขยะไว้)', () => {
    const store = memoryStore();
    saveOutbox(store, enqueue(emptyOutbox(), ev()));
    expect(store.read(OUTBOX_KEY)).not.toBeNull();
    saveOutbox(store, emptyOutbox());
    expect(store.read(OUTBOX_KEY)).toBeNull();
  });

  it('ที่เก็บว่าง = คิวเปล่า ไม่ใช่ error', () => {
    expect(loadOutbox(memoryStore())).toEqual(emptyOutbox());
  });
});

describe('🔴 ของเสียในที่เก็บ — ทิ้งได้ แต่ต้องรู้ว่าทิ้งเพราะอะไร', () => {
  it('JSON พัง = corrupt 1 + ลบคีย์ทิ้ง', () => {
    const store = memoryStore();
    store.write(OUTBOX_KEY, '{ไม่ใช่ json');
    const s = loadOutbox(store);
    expect(s.dropped.corrupt).toBe(1);
    expect(store.read(OUTBOX_KEY)).toBeNull();
  });

  it('checksum เพี้ยน = corrupt เท่าจำนวน event ที่หายไป', () => {
    const store = memoryStore();
    const { packages } = pack([ev(), ev(), ev()], 4);
    store.write(OUTBOX_KEY, JSON.stringify({ ...packages[0], checksum: 'deadbeef' }));
    const s = loadOutbox(store);
    expect(s.dropped.corrupt).toBe(3);
    expect(s.pending).toEqual([]);
    expect(s.nextSeq, 'ลำดับต้องไม่ย้อนกลับไป 1').toBe(5);
  });

  it('🔴 เวอร์ชันซองคนละเวอร์ชัน = แยกเป็น version ไม่ใช่ corrupt (ทางแก้คนละทาง)', () => {
    const store = memoryStore();
    const events = [ev(), ev()];
    store.write(OUTBOX_KEY, JSON.stringify({
      v: ENVELOPE_VERSION + 1, seq: 9, packedAt: 'x', checksum: checksumOf(events), events,
    }));
    const s = loadOutbox(store);
    expect(s.dropped.version).toBe(2);
    expect(s.dropped.corrupt).toBe(0);
    expect(s.nextSeq).toBe(10);
  });
});

describe('ที่เก็บจริงบนเบราว์เซอร์', () => {
  /* ⚠️ เทสต์ชุดนี้รันบน jsdom ⇒ **มี** localStorage จริง
   *    (เคยเขียนเทสต์ว่า "ต้องคืน null เพราะรันบน node" แล้วแดง — สมมติฐานผิด ไม่ใช่โค้ดผิด) */
  it('มี storage ใช้ได้ = คืนที่เก็บที่เขียน/อ่าน/ลบ ได้จริง', () => {
    const store = browserStore();
    expect(store).not.toBeNull();
    store!.write('t__probe2', 'v');
    expect(store!.read('t__probe2')).toBe('v');
    store!.remove('t__probe2');
    expect(store!.read('t__probe2')).toBeNull();
  });

  it('storage ที่โยน error = คืน null ไม่ใช่พา UI ล้ม', () => {
    const real = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError'); },
    });
    try {
      expect(browserStore()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
    }
  });

  it('🔴 ต้องลองเขียนจริง ไม่ใช่เช็กว่ามีอ็อบเจกต์ (Safari โหมดส่วนตัวมี object แต่เขียนแล้วโยน)', () => {
    const c = code(read('src/lib/osOutbox.ts'));
    expect(c).toMatch(/setItem\([^)]*probe/);
  });
});

describe('🔴 ความซื่อสัตย์ของชื่อกลไก (กฎสูงสุดของโปรเจกต์)', () => {
  const doc = read('src/lib/osOutbox.ts');

  it('ห้ามอ้างว่าไฟล์นี้เป็น erasure coding — มันไม่ใช่', () => {
    expect(doc, 'ต้องปฏิเสธชื่อนี้ตรง ๆ').toMatch(/ไม่ใช่ erasure coding/);
    expect(doc, 'ต้องบอกเหตุผลว่าทำไม parity ไม่ช่วย').toMatch(/parity/);
  });

  it('ต้องบอกชัดว่า redundancy ตัวจริงคือสำเนาฝั่งเรา', () => {
    expect(doc).toMatch(/landing_funnel/);
  });
});

describe('🚢 ถูกเรียกใช้จริงไหม (เขียนถูก ≠ ทำงาน)', () => {
  const c = code(read('src/lib/marketingOs.ts'));

  it('ส่งไม่ถึง = เข้าคิว (ไม่ใช่หายไปเฉย ๆ)', () => {
    expect(c).toMatch(/if \(!\(await postOne\([^)]*\)\)\) queueFailed\(/);
  });

  it('โหลดหน้าใหม่ = ส่งของค้างก่อน และทำครั้งเดียวต่อการโหลด', () => {
    expect(c).toMatch(/await flushPending\(/);
    expect(c).toMatch(/flushedThisLoad/);
  });

  it('🔴 เน็ตหลุดต้องหยุดยิง ไม่ใช่ไล่ยิงทั้งคิว (เปลืองแบตผู้ใช้)', () => {
    expect(c).toMatch(/if \(!\(await postOne\(endpoint, ev\)\)\) break;/);
  });
});
